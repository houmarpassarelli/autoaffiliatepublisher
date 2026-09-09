// apps/dashboard-admin/src/App.tsx
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  useBackendHealth,
} from '@aap/ui';

/**
 * Módulos do Dashboard Administrativo previstos no CHECKLIST.md, Categoria 4.
 * Cada item vira uma tela própria à medida que o respectivo CRUD é implementado.
 */
const ADMIN_MODULES = [
  {
    title: 'Fontes de Coleta',
    description: 'Tipo, URL, credenciais, intervalo de varredura e prompt da IA por fonte.',
  },
  {
    title: 'Canais de Destino',
    description: 'Cadastro dinâmico, modo de execução e credenciais de envio.',
  },
  {
    title: 'Operadores',
    description: 'Nome obrigatório, e-mail opcional, sem senha ou token.',
  },
  {
    title: 'Auditoria de Disparos',
    description: 'Filtros por data, operador, loja de origem e canal de destino.',
  },
] as const;

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
        <ErrorState
          title="Backend indisponível"
          message={state.reason}
          onRetry={refresh}
        />
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

/** Dashboard Administrativo: configuração, credenciais e auditoria. */
export function App(): React.JSX.Element {
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

      <div className="row row-cards">
        <div className="col-12 col-lg-5">
          <BackendHealthCard />
        </div>

        <div className="col-12 col-lg-7">
          <div className="row row-cards">
            {ADMIN_MODULES.map((adminModule) => (
              <div className="col-12 col-md-6" key={adminModule.title}>
                <Card
                  title={adminModule.title}
                  actions={<Badge tone="warning">Pendente</Badge>}
                >
                  <p className="text-secondary mb-0">{adminModule.description}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
