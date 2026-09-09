// apps/dashboard-remote/src/App.tsx
import { OfferStatus } from '@aap/shared';
import { useBackendHealth } from './useBackendHealth.js';

// As três abas espelham a máquina de estados da oferta (FLUXO_OPERACIONAL.md, Seção 3).
// DISCARDED não tem aba: a oferta descartada some da fila e alimenta o histórico
// anti-recaptura.
const OFFER_TABS = [
  { status: OfferStatus.OPEN, label: 'Abertas' },
  { status: OfferStatus.SCHEDULED, label: 'Agendadas' },
  { status: OfferStatus.COMPLETED, label: 'Concluídas' },
] as const;

/**
 * Casca do Dashboard Remoto.
 * Nesta etapa a tela apenas confirma que o monorepo está integrado: consome o
 * contrato de @aap/shared e verifica a saúde do backend. A curadoria em si —
 * tela-portão, cards e sincronização por WebSocket — é escopo do Sprint 3.
 */
export function App(): React.JSX.Element {
  const health = useBackendHealth();

  return (
    <div className="page">
      <header className="navbar navbar-expand-md d-print-none">
        <div className="container-xl">
          <h1 className="navbar-brand mb-0 fs-3">Auto Affiliate Publisher</h1>
          <span className="badge bg-purple-lt ms-2">Curadoria</span>
        </div>
      </header>

      <div className="page-body">
        <div className="container-xl">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title">Estado do backend</h2>
              {health.phase === 'loading' && <p className="text-secondary">Verificando…</p>}
              {health.phase === 'offline' && (
                <p className="text-danger">Backend indisponível: {health.reason}</p>
              )}
              {health.phase === 'online' && (
                <p className="mb-0">
                  Status: <strong>{health.health.status}</strong>
                </p>
              )}
            </div>
          </div>

          <ul className="nav nav-tabs" role="tablist">
            {OFFER_TABS.map((tab, index) => (
              <li className="nav-item" key={tab.status}>
                <span className={`nav-link${index === 0 ? ' active' : ''}`}>{tab.label}</span>
              </li>
            ))}
          </ul>

          <div className="card border-top-0 rounded-top-0">
            <div className="card-body text-secondary">
              A fila de ofertas será renderizada aqui, em ordem decrescente de data de resgate, com
              inserção no topo em tempo real.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
