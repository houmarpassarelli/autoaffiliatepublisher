// apps/api/src/server/errors.ts

/**
 * Erros de aplicação com código HTTP declarado.
 *
 * O tratador central do Fastify (`server/app.ts`) já respeita `statusCode` e
 * devolve a mensagem ao cliente quando ela é abaixo de 500. Esta hierarquia
 * existe para que os serviços de domínio possam recusar uma operação sem
 * conhecer o Fastify nem montar resposta HTTP à mão.
 */
export abstract class HttpError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — o comando é sintaticamente válido, mas viola uma regra de domínio. */
export class BadRequestError extends HttpError {
  readonly statusCode = 400;
}

/** 404 — o recurso alvo não existe ou está fora do conjunto elegível. */
export class NotFoundError extends HttpError {
  readonly statusCode = 404;
}

/**
 * 409 — a corrida foi perdida.
 *
 * É a recusa que sustenta o anti-concorrência do projeto: outro operador
 * resolveu a mesma oferta entre o render do card e este clique
 * (ESPECS_TECNICAS.md, Seção 6).
 */
export class ConflictError extends HttpError {
  readonly statusCode = 409;
}
