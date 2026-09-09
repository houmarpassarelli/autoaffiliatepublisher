// apps/dashboard-remote/src/App.tsx
import { useState } from 'react';
import { OfferStatus } from '@aap/shared';
import {
  AppShell,
  Badge,
  EmptyState,
  PageHeader,
  Tabs,
  useBackendHealth,
  type TabItem,
} from '@aap/ui';

/**
 * As três abas espelham a máquina de estados da oferta
 * (FLUXO_OPERACIONAL.md, Seção 3). O estado DISCARDED não tem aba: a oferta
 * descartada some da fila e passa a alimentar o histórico anti-recaptura.
 */
type OfferTabId = OfferStatus.OPEN | OfferStatus.SCHEDULED | OfferStatus.COMPLETED;

const OFFER_TABS: TabItem<OfferTabId>[] = [
  { id: OfferStatus.OPEN, label: 'Abertas', count: 0 },
  { id: OfferStatus.SCHEDULED, label: 'Agendadas', count: 0 },
  { id: OfferStatus.COMPLETED, label: 'Concluídas', count: 0 },
];

/** Texto de ausência de cada aba: o motivo de estar vazia muda conforme o estado. */
const EMPTY_BY_TAB: Record<OfferTabId, { title: string; description: string }> = {
  [OfferStatus.OPEN]: {
    title: 'Nenhuma oferta aguardando decisão',
    description:
      'Ofertas capturadas pelas fontes de coleta aparecem aqui no topo, em tempo real, sem recarregar a página.',
  },
  [OfferStatus.SCHEDULED]: {
    title: 'Nenhuma oferta na fila de disparo',
    description:
      'Ofertas aprovadas com a fila ocupada aguardam aqui o intervalo anti-spam, exibindo a contagem regressiva.',
  },
  [OfferStatus.COMPLETED]: {
    title: 'Nenhuma oferta publicada ainda',
    description: 'O histórico de disparos confirmados aparece nesta aba.',
  },
};

/** Indicador de conexão com a máquina administrativa, exibido na barra superior. */
function ConnectionBadge(): React.JSX.Element {
  const { state } = useBackendHealth();

  if (state.phase === 'loading') {
    return <Badge tone="neutral">Conectando…</Badge>;
  }

  if (state.phase === 'offline') {
    return <Badge tone="danger">Sem conexão</Badge>;
  }

  return (
    <Badge tone={state.health.status === 'ok' ? 'success' : 'warning'}>
      {state.health.status === 'ok' ? 'Conectado' : 'Conexão degradada'}
    </Badge>
  );
}

/** Dashboard Remoto: curadoria e disparo das ofertas coletadas. */
export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<OfferTabId>(OfferStatus.OPEN);
  const empty = EMPTY_BY_TAB[activeTab];

  return (
    <AppShell label="Curadoria" tone="remote" toolbar={<ConnectionBadge />}>
      <PageHeader
        title="Fila de ofertas"
        subtitle="Revise a oferta, escolha os canais e publique. Cada decisão remove o item da fila de todos os operadores."
      />

      <Tabs
        items={OFFER_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        label="Ciclo de vida da oferta"
      >
        <div className="card-body">
          <EmptyState title={empty.title} description={empty.description} />
        </div>
      </Tabs>
    </AppShell>
  );
}
