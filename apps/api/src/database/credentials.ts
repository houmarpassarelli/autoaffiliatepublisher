// apps/api/src/database/credentials.ts
import type { CredentialsPatch } from '@aap/shared';

/**
 * Manipulação do mapa de credenciais das fontes de coleta e dos canais de destino.
 *
 * As duas coleções têm o mesmo campo e o mesmo problema: o valor entra pelo
 * painel administrativo e nunca volta ao cliente. Concentrar as duas operações
 * aqui evita que cada CRUD invente a sua própria regra de escrita — divergir
 * nisso significaria vazar credencial em um dos dois caminhos.
 *
 * Nota de segurança: os valores são gravados como recebidos. A criptografia em
 * repouso é decisão em aberto (`CHECKLIST.md`, Categoria 8) e entrará
 * exatamente neste arquivo, sem alterar o contrato de nenhum dos dois models.
 */

/**
 * O Mongoose entrega o campo como `Map` no documento hidratado e como objeto
 * simples no `lean()`. As duas formas precisam ser aceitas para que o mapeador
 * de DTO funcione nos dois caminhos de leitura.
 */
export type StoredCredentials = Map<string, string> | Record<string, string> | undefined;

/**
 * Nomes das credenciais cadastradas, em ordem estável.
 *
 * É o único recorte de credencial que sai do servidor: o painel precisa mostrar
 * **quais** chaves existem para que o operador saiba o que já está configurado,
 * e nunca os valores.
 */
export function toCredentialKeys(credentials: StoredCredentials): string[] {
  if (!credentials) {
    return [];
  }

  const keys = credentials instanceof Map ? [...credentials.keys()] : Object.keys(credentials);

  return keys.sort((left, right) => left.localeCompare(right));
}

/**
 * Aplica o merge patch sobre o mapa persistido e devolve o mapa resultante.
 *
 * A escrita é parcial de propósito: como o cliente não recebe os valores, ele
 * não tem como reenviar o mapa completo numa edição. Só as chaves presentes no
 * patch são tocadas, e o valor `null` é o comando explícito de remoção — a
 * única forma de apagar uma credencial sem recriar o cadastro.
 */
export function applyCredentialsPatch(
  current: StoredCredentials,
  patch: CredentialsPatch | undefined,
): Map<string, string> {
  const merged = current instanceof Map ? new Map(current) : new Map(Object.entries(current ?? {}));

  if (!patch) {
    return merged;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      merged.delete(key);
      continue;
    }

    merged.set(key, value);
  }

  return merged;
}
