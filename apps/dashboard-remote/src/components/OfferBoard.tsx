// apps/dashboard-remote/src/components/OfferBoard.tsx
import { useState } from 'react';
import { OfferStatus } from '@aap/shared';
import {
  Alert,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tabs,
  type TabItem,
} from '@aap/ui';
import type { ConnectionStatus, RealtimeClient } from '../realtime/realtimeClient.js';
import { useChannels } from '../state/useChannels.js';
import { OFFER_TAB_IDS, useOfferBoard, type OfferTabId } from '../state/useOfferBoard.js';
import type { SelectedOperator } from './OperatorGate.js';
import { OfferCard } from './OfferCard.js';

export interface OfferBoardProps {
  client: RealtimeClient;
  operator: SelectedOperator;
  /** Estado da conexão: uma queda obriga a ressincronizar a fila ao voltar. */
  status: ConnectionStatus;
}

/** Rótulos das abas — a tradução oficial dos estados está no ESPECS_TECNICAS.md, Seção 1. */
const TAB_LABEL: Record<OfferTabId, string> = {
  [OfferStatus.OPEN]: 'Abertas',
  [OfferStatus.SCHEDULED]: 'Agendadas',
  [OfferStatus.COMPLETED]: 'Concluídas',
};

/** O motivo de uma aba estar vazia muda conforme o momento do ciclo de vida. */
const EMPTY_BY_TAB: Record<OfferTabId, { title: string; description: string }> = {
  [OfferStatus.OPEN]: {
    title: 'Nenhuma oferta aguardando decisão',
    description:
      'Ofertas capturadas pelas fontes de coleta aparecem aqui no topo, em tempo real, sem recarregar a página.',
  },
  [OfferStatus.SCHEDULED]: {
    title: 'Nenhuma oferta na fila de disparo',
    description:
      'Ofertas aprovadas com a fila ocupada aguardam aqui o intervalo anti-spam, com o horário previsto de envio.',
  },
  [OfferStatus.COMPLETED]: {
    title: 'Nenhuma oferta publicada ainda',
    description: 'O histórico de disparos confirmados aparece nesta aba.',
  },
};

/**
 * Quadro de curadoria: as três abas do ciclo de vida da oferta.
 *
 * A lista é global e única — todos os operadores conectados veem o mesmo estado.
 * A sessão não segmenta conteúdo; a única diferença que ela introduz é quem
 * assina a ação (FLUXO_OPERACIONAL.md, Seção 7.4).
 */
export function OfferBoard({ client, operator, status }: OfferBoardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<OfferTabId>(OfferStatus.OPEN);
  const board = useOfferBoard(client, status);
  const channels = useChannels(client, status);

  const tabs: TabItem<OfferTabId>[] = OFFER_TAB_IDS.map((tabId) => ({
    id: tabId,
    label: TAB_LABEL[tabId],
    count: board.offers[tabId].length,
  }));

  const visibleOffers = board.offers[activeTab];
  const empty = EMPTY_BY_TAB[activeTab];

  return (
    <>
      <PageHeader
        title="Fila de ofertas"
        subtitle="Revise a oferta, escolha os canais e publique. Cada decisão remove o item da fila de todos os operadores."
      />

      {/* Sem canal cadastrado não há destino possível: o botão "Publicar" ficaria
          desabilitado sem explicação, e o operador precisa saber onde resolver. */}
      {!channels.loading && channels.error === null && channels.channels.length === 0 ? (
        <div className="mb-3">
          <Alert tone="warning" title="Nenhum canal de destino ativo">
            Cadastre e ative os canais no painel administrativo para liberar a publicação. O
            descarte continua disponível.
          </Alert>
        </div>
      ) : null}

      {channels.error ? (
        <div className="mb-3">
          <Alert tone="danger" title="Falha ao carregar os canais de destino">
            {channels.error}
          </Alert>
        </div>
      ) : null}

      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        label="Ciclo de vida da oferta"
      >
        <div className="card-body">
          {board.phase === 'loading' ? <LoadingState subject="a fila de ofertas" /> : null}

          {board.phase === 'error' ? (
            <ErrorState message={board.error ?? 'Falha desconhecida.'} onRetry={board.reload} />
          ) : null}

          {board.phase === 'ready' && visibleOffers.length === 0 ? (
            <EmptyState title={empty.title} description={empty.description} />
          ) : null}

          {board.phase === 'ready'
            ? visibleOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  channels={channels.channels}
                  operator={operator}
                  onResolved={board.applyLocalTransition}
                  onVanish={board.dismissOffer}
                />
              ))
            : null}
        </div>
      </Tabs>
    </>
  );
}
