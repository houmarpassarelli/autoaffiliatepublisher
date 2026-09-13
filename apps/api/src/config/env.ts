// apps/api/src/config/env.ts
import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente da máquina administrativa.
 * A validação acontece uma única vez, na inicialização: faltando ou estando
 * inválida qualquer variável, o processo falha imediatamente em vez de quebrar
 * mais tarde, no meio de uma varredura ou de um disparo.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Persistência de fontes, ofertas, operadores, canais e logs de disparo.
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória.'),

  // Backend da fila BullMQ de disparos.
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória.'),

  // Origens dos dois dashboards autorizadas no CORS, separadas por vírgula.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5180,http://localhost:5181')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  // Intervalo Δ do delay progressivo anti-spam, em milissegundos.
  // Parâmetro de balanceamento (45 minutos como padrão operacional adotado), não constante fixa,
  // para preservar a audiência e minimizar risco de filtros de spam (CHECKLIST.md, Categoria 8 - Fechada).
  DISPATCH_INTERVAL_MS: z.coerce.number().int().nonnegative().default(2_700_000),

  // Janela de tolerância do heartbeat do WebSocket, em milissegundos.
  // Conexões silenciosas por mais tempo que isto são encerradas e têm a presença
  // do operador liberada, evitando nomes travados como "Em uso".
  WEBSOCKET_HEARTBEAT_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),

  // Chaves de API de LLM
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY é obrigatória para gerar copy.'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Criptografia das credenciais no banco (sources e channels)
  CREDENTIALS_SECRET: z.string().min(16, 'CREDENTIALS_SECRET deve ter pelo menos 16 caracteres.'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lê e valida o ambiente do processo.
 * Em caso de erro, imprime exatamente quais variáveis estão irregulares e encerra.
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

/** Atalho de leitura usado por plugins que se comportam de forma diferente em produção. */
export const isProduction = env.NODE_ENV === 'production';
