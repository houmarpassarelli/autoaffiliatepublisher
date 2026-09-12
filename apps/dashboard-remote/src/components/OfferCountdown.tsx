// apps/dashboard-remote/src/components/OfferCountdown.tsx
import { Badge, formatCountdown, useCountdown, type BadgeTone } from '@aap/ui';

export interface OfferCountdownProps {
  /** Horário previsto de disparo, em ISO, vindo do servidor. */
  scheduledFor: string;
}

/**
 * Abaixo deste restante o disparo é questão de segundos, e o card muda de tom
 * para que o operador perceba a saída iminente sem precisar ler o número.
 */
const URGENT_THRESHOLD_MS = 60_000;

/**
 * Contagem regressiva de uma oferta na fila de disparo.
 *
 * Qualifica o horário previsto de envio que aparece ao lado: o horário informa
 * *quando*, a contagem informa *quanto falta* — que é a leitura de relance que o
 * operador faz ao acompanhar a aba "Agendadas" (FLUXO_OPERACIONAL.md, Seção 3.2).
 *
 * Ao vencer, o rótulo é **"Disparo iminente"**, e nunca "Disparado": o card só
 * deixa esta aba quando o servidor confirma a publicação pelo broadcast
 * `OFFER_PUBLISHED`. A tela não decide o destino de oferta alguma — afirmar aqui
 * um disparo que o backend ainda não confirmou romperia a fronteira do Thin
 * Client e poderia mentir sobre uma entrega que falhou ou foi abortada pela
 * reverificação de preço.
 */
export function OfferCountdown({ scheduledFor }: OfferCountdownProps): React.JSX.Element {
  const { remainingMs, hasElapsed } = useCountdown(scheduledFor);

  const tone: BadgeTone = hasElapsed || remainingMs <= URGENT_THRESHOLD_MS ? 'warning' : 'info';

  return (
    /* `role="timer"` mantém a região viva em `off`: o leitor de tela consulta o
       valor sob demanda em vez de ser interrompido a cada segundo — e o horário
       absoluto ao lado permanece como a informação autoritativa. */
    <span role="timer" aria-label="Tempo restante para o disparo">
      <Badge tone={tone}>{hasElapsed ? 'Disparo iminente' : formatCountdown(remainingMs)}</Badge>
    </span>
  );
}
