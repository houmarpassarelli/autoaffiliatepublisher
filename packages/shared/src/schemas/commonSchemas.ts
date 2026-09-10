// packages/shared/src/schemas/commonSchemas.ts
import { z } from 'zod';

/**
 * Identificador de documento do MongoDB já serializado como texto.
 * Os DTOs trafegam sempre com o ObjectId convertido em string — o tipo nativo
 * do driver não existe no navegador.
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido: esperado um ObjectId de 24 caracteres.');

/**
 * Data serializada em ISO 8601.
 *
 * O DTO trafega **texto**, nunca `Date`: converter é responsabilidade do
 * mapeador de cada coleção, na fronteira entre a persistência e o contrato.
 *
 * A primeira versão aceitava também o `Date` do backend e normalizava com um
 * `transform`. Não funciona: o Fastify serializa a resposta pelo mesmo schema,
 * no sentido inverso, e um `transform` é unidirecional — toda rota que
 * devolvesse data falhava com 500 no momento de serializar. A conversão passou
 * para os mapeadores, onde o compilador cobra que ela aconteça.
 *
 * O deslocamento de fuso é aceito além do 'Z' porque as datas do domínio nascem
 * de captura e de ação humana, e o material fundacional do projeto registra
 * horários com deslocamento local.
 */
export const isoDateSchema = z.iso.datetime({ offset: true });

/**
 * Mapa de credenciais de acesso (chaves de API, tokens de bot, segredos de envio).
 * Nunca é exposto aos dashboards: o backend responde com a lista de chaves presentes,
 * jamais com os valores (ARQUITETURA.md, Seção 6 — Thin Client).
 */
export const credentialsSchema = z.record(z.string(), z.string());

/**
 * Corpo de erro devolvido pelo tratador central do Fastify.
 * Declarado no contrato para que o cliente saiba ler a recusa — em especial o
 * 409 de oferta já resolvida por outro operador — em vez de exibir uma
 * mensagem genérica de falha de rede.
 */
export const errorResponseSchema = z.object({
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Identificação do recurso alvo na URL das rotas de escrita dos CRUDs.
 * Declarado uma única vez porque fontes, canais e operadores compartilham
 * exatamente a mesma forma de endereçamento.
 */
export const resourceIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type ResourceIdParams = z.infer<typeof resourceIdParamsSchema>;

/**
 * Alteração parcial do mapa de credenciais.
 *
 * A escrita é **merge patch**, e não substituição: o cliente nunca recebe os
 * valores de volta (apenas os nomes das chaves), logo não tem como reenviar o
 * mapa inteiro numa edição. Só as chaves presentes no patch são tocadas, e o
 * valor `null` é o comando explícito de remoção daquela chave.
 */
export const credentialsPatchSchema = z.record(z.string().min(1), z.string().nullable());

export type CredentialsPatch = z.infer<typeof credentialsPatchSchema>;

/**
 * Faixa de valores aceita por um campo da expressão cron, na ordem em que os
 * cinco campos aparecem: minuto, hora, dia do mês, mês e dia da semana.
 */
const CRON_FIELD_RANGES: readonly {
  readonly label: string;
  readonly min: number;
  readonly max: number;
}[] = [
  { label: 'minuto', min: 0, max: 59 },
  { label: 'hora', min: 0, max: 23 },
  { label: 'dia do mês', min: 1, max: 31 },
  { label: 'mês', min: 1, max: 12 },
  { label: 'dia da semana', min: 0, max: 7 }, // 0 e 7 representam domingo
];

/** Confere um termo isolado do campo — `*`, um número, um intervalo `a-b`, com passo opcional `/n`. */
function isValidCronTerm(term: string, min: number, max: number): boolean {
  const [range, step, ...excess] = term.split('/');

  if (range === undefined || excess.length > 0) {
    return false;
  }

  // O passo, quando presente, precisa ser inteiro positivo: `*/0` não avança nunca.
  if (step !== undefined && !/^[1-9]\d*$/.test(step)) {
    return false;
  }

  if (range === '*') {
    return true;
  }

  const bounds = range.split('-');

  if (bounds.length > 2) {
    return false;
  }

  const numbers = bounds.map((bound) => (/^\d+$/.test(bound) ? Number(bound) : Number.NaN));

  if (numbers.some((value) => Number.isNaN(value) || value < min || value > max)) {
    return false;
  }

  // Num intervalo, o limite inferior não pode ultrapassar o superior.
  return numbers.length === 1 || (numbers[0] as number) <= (numbers[1] as number);
}

/**
 * Expressão cron de cinco campos, no dialeto do `node-cron` — o agendador
 * escolhido para a varredura por fonte (`ARQUITETURA.md`, Seção 1).
 *
 * A validação é de **formato**, feita campo a campo contra a faixa de cada um.
 * Ela existe para que uma expressão inválida seja recusada no cadastro, e não
 * meses depois, em silêncio, dentro do worker de ingestão. A validação
 * semântica final continua sendo do próprio `node-cron`, quando a Demanda 1.3
 * trouxer o scheduler — este schema não pretende substituí-lo.
 */
export const cronExpressionSchema = z
  .string()
  .trim()
  .refine((expression) => {
    const fields = expression.split(/\s+/);

    if (fields.length !== CRON_FIELD_RANGES.length) {
      return false;
    }

    return CRON_FIELD_RANGES.every((range, index) => {
      const field = fields[index] as string;

      // Listas separadas por vírgula: cada termo é validado isoladamente.
      return field.split(',').every((term) => isValidCronTerm(term, range.min, range.max));
    });
  }, 'Expressão cron inválida: esperados 5 campos (minuto hora dia mês dia-da-semana), como "0 * * * *".');
