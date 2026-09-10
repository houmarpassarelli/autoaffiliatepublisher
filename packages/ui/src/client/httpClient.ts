// packages/ui/src/client/httpClient.ts
import { errorResponseSchema } from '@aap/shared';

/**
 * Cliente HTTP compartilhado pelos dois dashboards.
 *
 * Vive no `@aap/ui`, e não no `@aap/shared`, porque é código de navegador: o
 * pacote de contrato compila sem `lib: DOM` e é consumido também pelo backend —
 * levar `fetch` para lá vazaria globais de navegador no contrato. O `@aap/ui`
 * já é o lugar do código de cliente comum às duas telas.
 */

/**
 * Falha devolvida pela máquina administrativa, com o código HTTP preservado.
 *
 * O código importa para a tela: o 409 não é um erro de sistema, é o desfecho
 * normal de dois operadores decidindo sobre a mesma oferta ao mesmo tempo, e
 * precisa ser comunicado de forma diferente de uma queda de rede.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /** A corrida foi perdida: outro operador resolveu esta oferta primeiro. */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

/**
 * Validador da resposta. Recebe o schema compartilhado sem que este módulo
 * precise depender do Zod diretamente — o contrato é de `@aap/shared`.
 */
interface ResponseParser<T> {
  parse: (input: unknown) => T;
}

/** Extrai a mensagem do corpo de erro do backend, com recuo para o status cru. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const parsed = errorResponseSchema.safeParse(await response.json());

    if (parsed.success) {
      return parsed.data.message;
    }
  } catch {
    // Corpo vazio ou não-JSON: cai no texto genérico abaixo.
  }

  return `A máquina administrativa respondeu ${String(response.status)}.`;
}

/**
 * Requisição ao backend com a resposta validada pelo mesmo schema que o servidor
 * usa para serializá-la. Uma divergência de contrato aparece aqui, e não como
 * campo indefinido no meio da tela do operador.
 */
export async function apiRequest<T>(
  path: string,
  parser: ResponseParser<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return parser.parse(await response.json());
}

/** Corpo de requisição serializado. `undefined` produz requisição sem corpo. */
type RequestBody = unknown;

/** Escrita com resposta validada — usada nos POST e PUT dos CRUDs do painel. */
export async function apiWrite<T>(
  path: string,
  method: 'POST' | 'PUT',
  body: RequestBody,
  parser: ResponseParser<T>,
): Promise<T> {
  return apiRequest(path, parser, { method, body: JSON.stringify(body) });
}

/**
 * Exclusão. Não usa `apiRequest` porque a resposta de sucesso é 204 sem corpo:
 * tentar interpretar um corpo vazio como JSON falharia justamente no caminho
 * feliz. A recusa, quando vem, continua trazendo a mensagem do servidor.
 */
export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(path, { method: 'DELETE' });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
}

/** Mensagem legível de qualquer falha, para exibição direta na interface. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha desconhecida ao falar com a máquina administrativa.';
}
