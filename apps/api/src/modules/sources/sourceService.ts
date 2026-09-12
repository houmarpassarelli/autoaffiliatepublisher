// apps/api/src/modules/sources/sourceService.ts
import type { SourceCreateInput, SourceDto, SourceUpdateInput } from '@aap/shared';
import { applyCredentialsPatch } from '../../database/credentials.js';
import { OfferModel, SourceModel } from '../../database/models/index.js';
import { ConflictError, NotFoundError } from '../../server/errors.js';
import { withUniqueConstraint } from '../../server/mongoErrors.js';
import { toSourceDto, type MappableSource } from './sourceMapper.js';

/**
 * Cadastro das fontes de coleta.
 *
 * A fonte concentra tudo que é específico da loja: credenciais, tag de afiliado,
 * ritmo de varredura e o prompt da IA. Ela é a única entrada de configuração do
 * pipeline de ingestão — nada aqui é lido pelo dashboard remoto.
 */

/** Rótulos, já com artigo, usados na mensagem de chave duplicada. */
const SOURCE_FIELD_LABELS = { name: 'este nome' } as const;

/** Localiza a fonte ou recusa a operação — usado por toda rota que endereça uma fonte. */
async function requireSource(sourceId: string): Promise<InstanceType<typeof SourceModel>> {
  const source = await SourceModel.findById(sourceId);

  if (!source) {
    throw new NotFoundError('Fonte de coleta não encontrada.');
  }

  return source;
}

/**
 * Listagem do painel administrativo.
 *
 * Diferente das leituras do dashboard remoto, esta devolve também os registros
 * **desativados**: o painel é justamente onde se reativa uma fonte parada.
 */
export async function listSources(): Promise<SourceDto[]> {
  const sources = await SourceModel.find().sort({ name: 1 }).lean<MappableSource[]>();

  return sources.map(toSourceDto);
}

/** Cadastro de uma fonte nova. */
export async function createSource(input: SourceCreateInput): Promise<SourceDto> {
  const source = new SourceModel({
    name: input.name,
    type: input.type,
    url: input.url,
    credentials: applyCredentialsPatch(undefined, input.credentials),
    affiliateTag: input.affiliateTag,
    cronExpression: input.cronExpression,
    aiPromptTemplate: input.aiPromptTemplate,
    active: input.active,
    complianceVerified: input.complianceVerified,
    lastRunAt: null,
  });

  await withUniqueConstraint(() => source.save(), SOURCE_FIELD_LABELS);

  return toSourceDto(source);
}

/**
 * Edição de uma fonte existente.
 *
 * Os campos comuns são substituídos pelo que veio no corpo; `credentials` é a
 * exceção e recebe merge patch, porque o cliente nunca teve os valores para
 * poder reenviá-los.
 */
export async function updateSource(sourceId: string, input: SourceUpdateInput): Promise<SourceDto> {
  const source = await requireSource(sourceId);

  source.name = input.name;
  source.type = input.type;
  source.url = input.url;
  source.affiliateTag = input.affiliateTag;
  source.cronExpression = input.cronExpression;
  source.aiPromptTemplate = input.aiPromptTemplate;
  source.active = input.active;
  source.complianceVerified = input.complianceVerified;
  source.credentials = applyCredentialsPatch(source.credentials, input.credentials);

  await withUniqueConstraint(() => source.save(), SOURCE_FIELD_LABELS);

  return toSourceDto(source);
}

/**
 * Exclusão de uma fonte.
 *
 * Recusada enquanto existir oferta apontando para ela: `offers.sourceId` é o
 * que resolve a loja de origem exibida no card do dashboard remoto, e apagar a
 * fonte deixaria ofertas sem procedência — inclusive as já concluídas, que são
 * consultadas como comprovação de disparo. Desativar é a operação do dia a dia;
 * excluir só faz sentido para um cadastro que nunca produziu nada.
 */
export async function deleteSource(sourceId: string): Promise<void> {
  await requireSource(sourceId);

  const linkedOffers = await OfferModel.countDocuments({ sourceId });

  if (linkedOffers > 0) {
    throw new ConflictError(
      `Esta fonte já originou ${String(linkedOffers)} oferta(s) e não pode ser excluída. Desative-a para interromper a varredura sem perder o histórico.`,
    );
  }

  await SourceModel.deleteOne({ _id: sourceId });
}
