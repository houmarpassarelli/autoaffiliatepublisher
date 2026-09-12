// packages/ui/src/hooks/useCountdown.ts
import { useEffect, useState } from 'react';

/**
 * Contagem regressiva até um instante futuro.
 *
 * Existe no kit, e não no dashboard remoto, porque a mecânica é de apresentação
 * pura: dado um alvo, quanto falta. O significado do que falta — "disparo
 * iminente", "aguardando a janela anti-spam" — é decisão de quem consome.
 */

/** Passo do relógio. Um segundo é a menor unidade que a interface exibe. */
const TICK_MS = 1_000;

/**
 * Relógio único do processo, compartilhado por todos os countdowns vivos.
 *
 * A aba "Agendadas" pode conter dezenas de cards simultâneos. Um `setInterval`
 * por card criaria dezenas de timers independentes que derivam entre si — os
 * cards passariam a virar o segundo em momentos diferentes, e a tela pareceria
 * instável sem que nada estivesse errado. Aqui todos os assinantes recebem o
 * mesmo tique.
 */
const subscribers = new Set<() => void>();
let tickHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Inscreve um ouvinte no relógio compartilhado e devolve o cancelamento.
 *
 * O timer nasce com o primeiro assinante e é destruído quando o último sai:
 * sem nenhum card agendado na tela, nenhum tique é agendado.
 */
function subscribeToTick(listener: () => void): () => void {
  subscribers.add(listener);

  tickHandle ??= setInterval(() => {
    for (const subscriber of subscribers) {
      subscriber();
    }
  }, TICK_MS);

  return () => {
    subscribers.delete(listener);

    if (subscribers.size === 0 && tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  };
}

export interface CountdownState {
  /** Milissegundos restantes até o alvo. Nunca negativo. */
  remainingMs: number;
  /** O alvo já passou — ou não há alvo algum para contar. */
  hasElapsed: boolean;
}

/** Distância entre agora e o alvo, clampada em zero. */
function measure(targetIso: string | null): CountdownState {
  if (targetIso === null) {
    return { remainingMs: 0, hasElapsed: true };
  }

  const targetMs = new Date(targetIso).getTime();

  // Data irregular vinda do contrato: trata como vencida em vez de propagar NaN.
  if (Number.isNaN(targetMs)) {
    return { remainingMs: 0, hasElapsed: true };
  }

  const remainingMs = targetMs - Date.now();

  return remainingMs > 0
    ? { remainingMs, hasElapsed: false }
    : { remainingMs: 0, hasElapsed: true };
}

/**
 * Tempo restante até `targetIso`, atualizado a cada segundo.
 *
 * O restante é **recalculado** a partir de `Date.now()` a cada tique, e nunca
 * decrementado: o navegador estrangula timers de aba em segundo plano, e um
 * contador decrementado acumularia o atraso de cada tique suprimido. O
 * recálculo devolve o valor certo na primeira renderização após a volta.
 *
 * Ao vencer, o hook se desinscreve do relógio — um card que já passou da hora
 * não consome mais tique nenhum enquanto aguarda a confirmação do servidor.
 */
export function useCountdown(targetIso: string | null): CountdownState {
  const [state, setState] = useState<CountdownState>(() => measure(targetIso));

  useEffect(() => {
    // O alvo pode ter mudado entre renderizações: remede antes de assinar, para
    // que a tela não exiba por até um segundo o restante do alvo anterior.
    const initial = measure(targetIso);
    setState(initial);

    if (initial.hasElapsed) {
      return;
    }

    // O cancelamento é guardado porque o próprio ouvinte o aciona ao vencer.
    let unsubscribe: (() => void) | null = null;

    unsubscribe = subscribeToTick(() => {
      const next = measure(targetIso);
      setState(next);

      if (next.hasElapsed) {
        unsubscribe?.();
        unsubscribe = null;
      }
    });

    return () => {
      unsubscribe?.();
      unsubscribe = null;
    };
  }, [targetIso]);

  return state;
}
