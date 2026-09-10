// apps/dashboard-admin/src/App.tsx
import { useState } from 'react';
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  Tabs,
  useBackendHealth,
  type TabItem,
} from '@aap/ui';
import { AuditScreen } from './screens/AuditScreen.js';
import { ChannelsScreen } from './screens/ChannelsScreen.js';
import { OperatorsScreen } from './screens/OperatorsScreen.js';
import { SourcesScreen } from './screens/SourcesScreen.js';

/** Seções do painel administrativo. */
type AdminSectionId = 'overview' | 'sources' | 'channels' | 'operators' | 'audit';

const ADMIN_SECTIONS: TabItem<AdminSectionId>[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'sources', label: 'Fontes de Coleta' },
  { id: 'channels', label: 'Canais de Destino' },
  { id: 'operators', label: 'Operadores' },
  { id: 'audit', label: 'Auditoria de Disparos' },
];

/**
 * Estado do backend na máquina administrativa.
 * É a primeira informação do painel porque, sem MongoDB e Redis de pé, nenhuma
 * das demais telas tem o que fazer.
 */
function BackendHealthCard(): React.JSX.Element {
  const { state, refresh } = useBackendHealth();

  return (
    <Card
      title="Máquina administrativa"
      actions={
        <Button variant="secondary" onClick={refresh} loading={state.phase === 'loading'}>
          Verificar
        </Button>
      }
    >
      {state.phase === 'loading' ? <LoadingState subject="o estado do backend" /> : null}

      {state.phase === 'offline' ? (
        <ErrorState title="Backend indisponível" message={state.reason} onRetry={refresh} />
      ) : null}

      {state.phase === 'online' ? (
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-secondary">Servidor</span>
            <Badge tone={state.health.status === 'ok' ? 'success' : 'warning'}>
              {state.health.status === 'ok' ? 'Operacional' : 'Degradado'}
            </Badge>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-secondary">MongoDB</span>
            <Badge tone={state.health.dependencies.mongodb ? 'success' : 'danger'}>
              {state.health.dependencies.mongodb ? 'Conectado' : 'Indisponível'}
            </Badge>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="text-secondary">Redis</span>
            <Badge tone={state.health.dependencies.redis ? 'success' : 'danger'}>
              {state.health.dependencies.redis ? 'Conectado' : 'Indisponível'}
            </Badge>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Visão geral: saúde da máquina e o mapa honesto do que ainda não existe.
 *
 * Os módulos entregues não são listados aqui — cada um tem aba própria. O que
 * resta é o aviso de que nenhuma publicação real acontece ainda, porque é a
 * informação que muda como o painel deve ser lido.
 */
function OverviewSection(): React.JSX.Element {
  return (
    <div className="row row-cards">
      <div className="col-12 col-lg-5">
        <BackendHealthCard />
      </div>

      <div className="col-12 col-lg-7">
        <Card title="O que ainda não está no ar" actions={<Badge tone="warning">Pendente</Badge>}>
          <p className="text-secondary mb-0">
            A ingestão, o refinamento por IA, a fila de disparo e os drivers de canal ainda não
            existem. Uma oferta concluída significa <strong>ação resolutiva registrada</strong>, e
            não mensagem entregue no canal — por isso o Status da auditoria permanece em
            &quot;Aguardando disparo&quot;.
          </p>
        </Card>
      </div>
    </div>
  );
}

/** Dashboard Administrativo: configuração, credenciais e auditoria. */
export function App(): React.JSX.Element {
  const [section, setSection] = useState<AdminSectionId>('overview');

  return (
    <AppShell label="Administrativo" tone="admin">
      <PageHeader
        title="Painel administrativo"
        subtitle="Configuração de fontes, canais, operadores e consulta da auditoria de disparos."
      />

      <Alert tone="info" title="Ambiente local">
        Este painel concentra as credenciais de API e os tokens de canal, que por decisão
        arquitetural nunca saem desta máquina.
      </Alert>

      <Tabs
        items={ADMIN_SECTIONS}
        activeId={section}
        onChange={setSection}
        label="Seções do painel administrativo"
      >
        <div className="p-3">
          {section === 'overview' ? <OverviewSection /> : null}
          {section === 'sources' ? <SourcesScreen /> : null}
          {section === 'channels' ? <ChannelsScreen /> : null}
          {section === 'operators' ? <OperatorsScreen /> : null}
          {section === 'audit' ? <AuditScreen /> : null}
        </div>
      </Tabs>
    </AppShell>
  );
}
