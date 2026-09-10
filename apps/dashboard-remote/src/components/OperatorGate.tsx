// apps/dashboard-remote/src/components/OperatorGate.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  OPERATOR_IN_USE,
  ServerEventType,
  ServerReplyType,
  type AvailableOperatorDto,
} from '@aap/shared';
import {
  Alert,
  Button,
  Card,
  describeError,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '@aap/ui';
import { fetchAvailableOperators } from '../api/operatorsApi.js';
import { useServerEvent } from '../realtime/useRealtime.js';
import type { RealtimeClient } from '../realtime/realtimeClient.js';

export interface SelectedOperator {
  id: string;
  name: string;
}

export interface OperatorGateProps {
  client: RealtimeClient;
  onEnter: (operator: SelectedOperator) => void;
}

/** Motivos de recusa traduzidos para o que o operador precisa fazer a respeito. */
const REJECTION_MESSAGE: Record<string, string> = {
  [OPERATOR_IN_USE]: 'Este nome já está em uso em outro dispositivo. Escolha outro.',
  OPERATOR_UNAVAILABLE: 'Este operador não está mais disponível. Atualize a lista.',
};

/**
 * Tela-portão de seleção de operador.
 *
 * Não é autenticação: não há senha nem token, e a identificação existe para
 * atribuição de autoria no comissionamento futuro (FLUXO_OPERACIONAL.md, Seção
 * 7). O que ela impede é outra coisa — duas pessoas operando sob a mesma
 * identidade ao mesmo tempo, o que corromperia a assinatura da auditoria.
 *
 * A marcação "Em uso" chega na carga inicial e passa a ser mantida em tempo real
 * pelos eventos de presença: um nome liberado em outro dispositivo volta a ficar
 * clicável aqui sem recarregar a página.
 */
export function OperatorGate({ client, onEnter }: OperatorGateProps): React.JSX.Element {
  const [operators, setOperators] = useState<AvailableOperatorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOperators(): Promise<void> {
      try {
        const loaded = await fetchAvailableOperators();

        if (active) {
          setOperators(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(describeError(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOperators();

    return () => {
      active = false;
    };
  }, [attempt]);

  // Presença de outros dispositivos: habilita e desabilita nomes em tempo real.
  useServerEvent(client, (event) => {
    if (event.event === ServerEventType.OPERATOR_CONNECTED) {
      setOperators((current) =>
        current.map((operator) =>
          operator.id === event.operatorId ? { ...operator, inUse: true } : operator,
        ),
      );
    }

    if (event.event === ServerEventType.OPERATOR_DISCONNECTED) {
      setOperators((current) =>
        current.map((operator) =>
          operator.id === event.operatorId ? { ...operator, inUse: false } : operator,
        ),
      );
    }
  });

  /**
   * Reivindica a identidade pelo WebSocket.
   *
   * A entrada só é liberada com o aceite do servidor: a disputa pelo nome é
   * resolvida lá, no mesmo tick em que a presença é registrada. Confiar na
   * marcação local abriria a janela entre o render da lista e o clique.
   */
  function handleClaim(operator: AvailableOperatorDto): void {
    setClaimingId(operator.id);
    setRejection(null);

    void client
      .claim(operator.id)
      .then((reply) => {
        if (reply.reply === ServerReplyType.OPERATOR_CLAIM_ACCEPTED) {
          onEnter({ id: reply.operatorId, name: reply.name });

          return;
        }

        setRejection(REJECTION_MESSAGE[reply.reason] ?? 'Entrada recusada pelo servidor.');
        setOperators((current) =>
          current.map((item) => (item.id === operator.id ? { ...item, inUse: true } : item)),
        );
      })
      .catch((claimError: unknown) => {
        setRejection(describeError(claimError));
      })
      .finally(() => {
        setClaimingId(null);
      });
  }

  return (
    <>
      <PageHeader
        title="Quem está operando?"
        subtitle="Selecione o seu nome. Ele assina cada oferta publicada ou descartada nesta sessão."
      />

      {rejection ? (
        <div className="mb-3">
          <Alert
            tone="warning"
            title="Não foi possível entrar com este nome"
            onDismiss={() => {
              setRejection(null);
            }}
          >
            {rejection}
          </Alert>
        </div>
      ) : null}

      <Card title="Operadores cadastrados">
        {loading ? <LoadingState subject="os operadores cadastrados" /> : null}

        {!loading && error ? <ErrorState message={error} onRetry={reload} /> : null}

        {!loading && !error && operators.length === 0 ? (
          <EmptyState
            title="Nenhum operador cadastrado"
            description="Cadastre os operadores no painel administrativo para liberar a curadoria."
            action={<Button onClick={reload}>Atualizar lista</Button>}
          />
        ) : null}

        {!loading && !error && operators.length > 0 ? (
          <div className="d-flex flex-column gap-2">
            {operators.map((operator) => (
              <div
                key={operator.id}
                className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-2"
              >
                <span className="fw-medium">{operator.name}</span>

                {operator.inUse ? (
                  <span className="badge bg-secondary-lt">Em uso</span>
                ) : (
                  <Button
                    variant="primary"
                    loading={claimingId === operator.id}
                    loadingLabel="Entrando…"
                    disabled={claimingId !== null}
                    onClick={() => {
                      handleClaim(operator);
                    }}
                  >
                    Entrar
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
}
