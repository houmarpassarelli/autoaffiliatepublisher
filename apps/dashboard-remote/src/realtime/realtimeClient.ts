// apps/dashboard-remote/src/realtime/realtimeClient.ts
import {
  ClientMessageType,
  ServerReplyType,
  type ClientMessage,
  type ServerEvent,
  type ServerReply,
} from '@aap/shared';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

/**
 * Ritmo do sinal de vida enviado ao servidor.
 *
 * Precisa ser confortavelmente menor que a janela de tolerância do backend
 * (`WEBSOCKET_HEARTBEAT_TIMEOUT_MS`, 90s por padrão), para que uma rede lenta não
 * derrube a presença de um operador que está apenas com a aba aberta e parada.
 */
const HEARTBEAT_INTERVAL_MS = 25_000;

/** Espera antes de tentar reconectar após uma queda. */
const RECONNECT_DELAY_MS = 3_000;

/** Limite de espera pela resposta a uma reivindicação de identidade. */
const CLAIM_TIMEOUT_MS = 10_000;

type EventListener = (event: ServerEvent) => void;
type ReplyListener = (reply: ServerReply) => void;
type StatusListener = (status: ConnectionStatus) => void;

/** Endereço do socket, derivado da origem da página — o proxy do Vite cuida do resto. */
function buildSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Conexão de tempo real com a máquina administrativa.
 *
 * Três responsabilidades, todas derivadas do contrato do servidor:
 *
 * 1. **Heartbeat desde a abertura**, e não apenas após a reivindicação: o
 *    varredor do backend também recolhe conexões anônimas silenciosas.
 * 2. **Reconexão com nova reivindicação.** A presença vive no socket. Caiu a
 *    conexão, o servidor liberou o nome; ao voltar, é preciso reivindicá-lo de
 *    novo — e aceitar que ele possa ter sido tomado nesse intervalo.
 * 3. **Distribuição dos eventos de broadcast** para quem estiver ouvindo.
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private claimedOperatorId: string | null = null;
  private disposed = false;

  private readonly eventListeners = new Set<EventListener>();
  private readonly replyListeners = new Set<ReplyListener>();
  private readonly statusListeners = new Set<StatusListener>();

  /**
   * Abre a conexão. Chamadas repetidas com um socket vivo são ignoradas.
   *
   * Reabre também um cliente já descartado: em desenvolvimento o React monta,
   * desmonta e remonta a tela em sequência, e um cliente que só soubesse morrer
   * deixaria o painel sem tempo real justamente no modo de desenvolvimento.
   */
  connect(): void {
    if (this.socket) {
      return;
    }

    this.disposed = false;
    this.publishStatus('connecting');

    const socket = new WebSocket(buildSocketUrl());

    this.socket = socket;

    socket.addEventListener('open', () => {
      // Socket já substituído por um mais novo: este evento não representa mais
      // a conexão corrente e precisa ser ignorado.
      if (this.socket !== socket) {
        return;
      }

      this.publishStatus('open');
      this.startHeartbeat();

      // Reconexão: o servidor liberou o nome quando o socket anterior morreu.
      if (this.claimedOperatorId) {
        this.send({
          type: ClientMessageType.OPERATOR_CLAIM,
          operatorId: this.claimedOperatorId,
        });
      }
    });

    socket.addEventListener('message', (message: MessageEvent<string>) => {
      if (this.socket !== socket) {
        return;
      }

      this.handleMessage(message.data);
    });

    socket.addEventListener('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.stopHeartbeat();
      this.socket = null;
      this.publishStatus('closed');
      this.scheduleReconnect();
    });
  }

  /** Encerra a conexão e impede reconexões. Uso exclusivo do desmonte da tela. */
  dispose(): void {
    this.disposed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  /**
   * Reivindica a identidade do operador e espera a resposta do servidor.
   *
   * O identificador fica guardado para ser reivindicado outra vez a cada
   * reconexão — sem isso, uma oscilação de rede deixaria o operador anônimo, com
   * o nome livre para outro dispositivo, sem que a tela percebesse.
   */
  claim(operatorId: string): Promise<ServerReply> {
    this.claimedOperatorId = operatorId;

    return new Promise<ServerReply>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.replyListeners.delete(listener);
        reject(new Error('A máquina administrativa não respondeu à entrada do operador.'));
      }, CLAIM_TIMEOUT_MS);

      const listener: ReplyListener = (reply) => {
        if (reply.operatorId !== operatorId) {
          return;
        }

        clearTimeout(timeout);
        this.replyListeners.delete(listener);
        resolve(reply);
      };

      this.replyListeners.add(listener);
      this.send({ type: ClientMessageType.OPERATOR_CLAIM, operatorId });
    });
  }

  /** Abandona a identidade reivindicada, para que a reconexão não a retome. */
  releaseClaim(): void {
    this.claimedOperatorId = null;
  }

  /** Inscreve um ouvinte dos eventos de broadcast. Devolve a função de remoção. */
  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);

    return () => this.eventListeners.delete(listener);
  }

  /** Inscreve um ouvinte das respostas diretas — usado para detectar perda de identidade. */
  onReply(listener: ReplyListener): () => void {
    this.replyListeners.add(listener);

    return () => this.replyListeners.delete(listener);
  }

  /** Inscreve um ouvinte do estado da conexão. */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);

    return () => this.statusListeners.delete(listener);
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Interpreta o que chega do servidor.
   *
   * Broadcast e resposta direta trafegam pelo mesmo socket e se distinguem pela
   * chave presente no objeto: `event` para estado global, `reply` para resposta
   * a este cliente (`ServerOutboundMessage` em `@aap/shared`).
   */
  private handleMessage(raw: string): void {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }

    if ('event' in parsed) {
      for (const listener of this.eventListeners) {
        listener(parsed as ServerEvent);
      }

      return;
    }

    if ('reply' in parsed) {
      const reply = parsed as ServerReply;

      if (reply.reply === ServerReplyType.OPERATOR_CLAIM_REJECTED) {
        // Identidade negada: não insistir nela nas próximas reconexões.
        this.claimedOperatorId = null;
      }

      for (const listener of [...this.replyListeners]) {
        listener(reply);
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.send({ type: ClientMessageType.HEARTBEAT });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private publishStatus(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
