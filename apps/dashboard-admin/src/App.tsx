// apps/dashboard-admin/src/App.tsx
import { useBackendHealth } from './useBackendHealth.js';

// Módulos do Dashboard Administrativo previstos no CHECKLIST.md, Categoria 4.
// Cada item vira uma rota própria à medida que o respectivo CRUD é implementado.
const ADMIN_MODULES = [
  { title: 'Fontes de Coleta', description: 'Tipo, URL, credenciais, varredura e prompt da IA.' },
  { title: 'Canais de Destino', description: 'Cadastro dinâmico, modo de execução e credenciais.' },
  { title: 'Operadores', description: 'Nome obrigatório, e-mail opcional, sem senha ou token.' },
  { title: 'Auditoria de Disparos', description: 'Filtros por data, operador, loja e canal.' },
] as const;

/**
 * Casca do Dashboard Administrativo.
 * Nesta etapa a tela apenas confirma que o monorepo está integrado: consome o
 * contrato de @aap/shared e verifica a saúde do backend na máquina administrativa.
 */
export function App(): React.JSX.Element {
  const health = useBackendHealth();

  return (
    <div className="page">
      <header className="navbar navbar-expand-md d-print-none">
        <div className="container-xl">
          <h1 className="navbar-brand mb-0 fs-3">Auto Affiliate Publisher</h1>
          <span className="badge bg-blue-lt ms-2">Administrativo</span>
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
                <ul className="list-unstyled mb-0">
                  <li>
                    Status: <strong>{health.health.status}</strong>
                  </li>
                  <li>
                    MongoDB: {health.health.dependencies.mongodb ? 'conectado' : 'indisponível'}
                  </li>
                  <li>Redis: {health.health.dependencies.redis ? 'conectado' : 'indisponível'}</li>
                </ul>
              )}
            </div>
          </div>

          <div className="row row-cards">
            {ADMIN_MODULES.map((module) => (
              <div className="col-md-6" key={module.title}>
                <div className="card mb-3">
                  <div className="card-body">
                    <h3 className="card-title">{module.title}</h3>
                    <p className="text-secondary mb-0">{module.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
