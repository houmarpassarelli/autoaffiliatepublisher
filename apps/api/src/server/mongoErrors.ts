// apps/api/src/server/mongoErrors.ts
import { ConflictError } from './errors.js';

/**
 * Tradução de violação de índice único do MongoDB para recusa de domínio.
 *
 * As três coleções cadastrais têm chave natural única — `sources.name`,
 * `channels.key` e `operators.name` — porque duas fontes homônimas quebram os
 * filtros de auditoria, duas chaves de canal iguais corrompem o payload de
 * disparo e dois operadores de mesmo nome tornam a tela-portão ambígua.
 *
 * Sem esta tradução, a colisão chega ao tratador central do Fastify como erro
 * desconhecido e vira 500. Nome repetido é erro de quem preencheu o formulário,
 * não falha do servidor: precisa voltar como 409 dizendo qual campo colidiu.
 */

/** Código que o MongoDB usa para violação de índice único. */
const DUPLICATE_KEY_CODE = 11000;

/** Forma mínima do erro do driver que interessa a esta tradução. */
interface DuplicateKeyError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === DUPLICATE_KEY_CODE
  );
}

/**
 * Executa a escrita convertendo a colisão de chave única em `ConflictError`.
 *
 * `fieldLabels` traduz o nome técnico do campo indexado para o rótulo que o
 * operador vê no formulário — a mensagem precisa apontar o campo da tela, não
 * a coluna do banco. O rótulo inclui o artigo ("este nome", "esta chave"),
 * porque o gênero varia entre os campos e a mensagem é montada em pt-BR.
 */
export async function withUniqueConstraint<T>(
  operation: () => Promise<T>,
  fieldLabels: Record<string, string>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const violatedField = Object.keys(error.keyPattern ?? {})[0];
    const label = violatedField ? (fieldLabels[violatedField] ?? violatedField) : 'este valor';

    throw new ConflictError(`Já existe um registro com ${label}.`);
  }
}
