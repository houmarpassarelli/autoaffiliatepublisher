// apps/dashboard-remote/src/api/httpClient.ts
import { errorResponseSchema } from '@aap/shared';

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

/** Mensagem legível de qualquer falha, para exibição direta na interface. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha desconhecida ao falar com a máquina administrativa.';
}
