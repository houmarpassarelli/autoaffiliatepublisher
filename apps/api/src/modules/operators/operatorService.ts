// apps/api/src/modules/operators/operatorService.ts
import type { OperatorCreateInput, OperatorDto, OperatorUpdateInput } from '@aap/shared';
import { DispatchLogModel, OfferModel, OperatorModel } from '../../database/models/index.js';
import { ConflictError, NotFoundError } from '../../server/errors.js';
import { withUniqueConstraint } from '../../server/mongoErrors.js';
import { isOperatorClaimed, revokeOperatorPresence } from '../websocket/index.js';
import { toOperatorDto, type MappableOperator } from './operatorMapper.js';

/**
 * Cadastro dos operadores de curadoria.
 *
 * O cadastro é o mais simples dos três do painel: nome, e-mail opcional e
 * status. Não há senha nem token — a identificação existe para atribuição de
 * autoria no comissionamento, não para controle de acesso
 * (`FLUXO_OPERACIONAL.md`, Seção 7.1).
 *
 * O que ele tem de particular é o acoplamento com a presença ativa: diferente de
 * uma fonte ou de um canal, um operador pode estar **conectado** no instante em
 * que o administrador o altera.
 */

/** Rótulos, já com artigo, usados na mensagem de chave duplicada. */
const OPERATOR_FIELD_LABELS = { name: 'este nome' } as const;

/** Localiza o operador ou recusa a operação. */
async function requireOperator(operatorId: string): Promise<InstanceType<typeof OperatorModel>> {
  const operator = await OperatorModel.findById(operatorId);

  if (!operator) {
    throw new NotFoundError('Operador não encontrado.');
  }

  return operator;
}

/**
 * Listagem do painel administrativo.
 *
 * Devolve também os operadores desativados, que a tela-portão do dashboard
 * remoto não enxerga — o painel é onde se reativa um cadastro suspenso.
 *
 * `isOnline` é corrigido pelo registro de conexões vivas, e não lido cru do
 * banco, pela mesma razão que vale na tela-portão: o campo persistido é projeção
 * do socket, e uma projeção defasada mostraria como conectado quem já saiu.
 */
export async function listOperators(): Promise<OperatorDto[]> {
  const operators = await OperatorModel.find().sort({ name: 1 }).lean<MappableOperator[]>();

  return operators.map((operator) => ({
    ...toOperatorDto(operator),
    isOnline: isOperatorClaimed(operator._id.toString()),
  }));
}

/** Cadastro de um operador novo. */
export async function createOperator(input: OperatorCreateInput): Promise<OperatorDto> {
  const operator = new OperatorModel({
    name: input.name,
    email: input.email,
    active: input.active,
    isOnline: false,
    lastSeenAt: null,
  });

  await withUniqueConstraint(() => operator.save(), OPERATOR_FIELD_LABELS);

  return toOperatorDto(operator);
}

/**
 * Edição de um operador existente.
 *
 * Desativar um operador conectado encerra a sessão dele. A alternativa seria
 * deixá-lo diante de um quadro que não aceita mais nenhuma das suas decisões,
 * já que `requireActiveOperator` recusa quem não está ativo.
 */
export async function updateOperator(
  operatorId: string,
  input: OperatorUpdateInput,
): Promise<OperatorDto> {
  const operator = await requireOperator(operatorId);

  operator.name = input.name;
  operator.email = input.email;
  operator.active = input.active;

  await withUniqueConstraint(() => operator.save(), OPERATOR_FIELD_LABELS);

  if (!operator.active) {
    await revokeOperatorPresence(operatorId);
  }

  return toOperatorDto(operator);
}

/**
 * Exclusão de um operador.
 *
 * Recusada enquanto existir oferta resolvida ou log de disparo assinado por ele.
 * O `DispatchLog` guarda o nome desnormalizado justamente para preservar a
 * autoria, mas `offers.operatorId` não guarda: a aba Concluídas perderia o autor
 * das ofertas dele. E a base de auditoria é insumo do rateio de comissão —
 * apagar quem assinou é apagar a quem pagar.
 */
export async function deleteOperator(operatorId: string): Promise<void> {
  await requireOperator(operatorId);

  const [resolvedOffers, dispatchLogs] = await Promise.all([
    OfferModel.countDocuments({ operatorId }),
    DispatchLogModel.countDocuments({ operatorId }),
  ]);

  if (resolvedOffers > 0 || dispatchLogs > 0) {
    throw new ConflictError(
      `Este operador assina ${String(resolvedOffers)} oferta(s) e ${String(dispatchLogs)} disparo(s) e não pode ser excluído. Desative-o para retirá-lo da tela-portão sem perder a autoria registrada.`,
    );
  }

  // A conexão é encerrada antes da remoção: um socket vivo apontando para um
  // cadastro que não existe mais travaria o nome no registro de presença.
  await revokeOperatorPresence(operatorId);
  await OperatorModel.deleteOne({ _id: operatorId });
}
