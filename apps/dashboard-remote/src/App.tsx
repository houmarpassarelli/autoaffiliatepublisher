// apps/dashboard-remote/src/App.tsx
import { useEffect, useState } from 'react';
import { ServerReplyType } from '@aap/shared';
import { AppShell, Badge, Button } from '@aap/ui';
import { OfferBoard } from './components/OfferBoard.js';
import { OperatorGate, type SelectedOperator } from './components/OperatorGate.js';
import { useRealtime } from './realtime/useRealtime.js';
import type { ConnectionStatus } from './realtime/realtimeClient.js';

/** Estado da conexão de tempo real, exibido na barra superior. */
function ConnectionBadge({ status }: { status: ConnectionStatus }): React.JSX.Element {
  if (status === 'open') {
    return <Badge tone="success">Conectado</Badge>;
  }

  if (status === 'connecting') {
    return <Badge tone="neutral">Conectando…</Badge>;
  }

  return <Badge tone="danger">Sem conexão</Badge>;
}

/**
 * Dashboard Remoto: curadoria e disparo das ofertas coletadas.
 *
 * A tela é Thin Client de ponta a ponta — ela comanda e exibe, e nunca publica.
 * O socket é aberto uma única vez, antes mesmo da tela-portão, porque a própria
 * seleção de operador precisa reagir a quem entra e sai.
 */
export function App(): React.JSX.Element {
  const { client, status } = useRealtime();
  const [operator, setOperator] = useState<SelectedOperator | null>(null);

  /**
   * Perda de identidade na reconexão.
   *
   * A presença vive no socket: se a conexão cair e, ao voltar, o nome já tiver
   * sido tomado por outro dispositivo, o operador precisa voltar à tela-portão.
   * Continuar operando assinaria ações com uma identidade que o servidor não
   * reconhece mais.
   */
  useEffect(
    () =>
      client.onReply((reply) => {
        if (reply.reply === ServerReplyType.OPERATOR_CLAIM_REJECTED) {
          setOperator(null);
        }
      }),
    [client],
  );

  /** Sai da identidade e libera o nome para outro dispositivo. */
  function handleLeave(): void {
    client.releaseClaim();
    setOperator(null);
  }

  const toolbar = (
    <div className="d-flex align-items-center gap-2">
      <ConnectionBadge status={status} />
      {operator ? (
        <>
          <Badge tone="info">{operator.name}</Badge>
          <Button variant="ghost" onClick={handleLeave}>
            Sair
          </Button>
        </>
      ) : null}
    </div>
  );

  return (
    <AppShell label="Curadoria" tone="remote" toolbar={toolbar}>
      {operator ? (
        <OfferBoard client={client} operator={operator} status={status} />
      ) : (
        <OperatorGate client={client} onEnter={setOperator} />
      )}
    </AppShell>
  );
}
