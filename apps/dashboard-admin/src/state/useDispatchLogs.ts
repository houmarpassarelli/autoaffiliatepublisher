// apps/dashboard-admin/src/state/useDispatchLogs.ts
import { useCallback, useEffect, useState } from 'react';
import type { DispatchLogDto, DispatchLogTotals } from '@aap/shared';
import { describeError } from '@aap/ui';
import {
  EMPTY_AUDIT_FILTERS,
  fetchAuditFilterOptions,
  fetchDispatchLogs,
  type AuditFilters,
} from '../api/auditApi.js';

/** Quantas linhas cabem numa página da auditoria. */
const PAGE_SIZE = 50;

export interface UseDispatchLogsResult {
  logs: DispatchLogDto[];
  totals: DispatchLogTotals;
  /** Nomes de loja efetivamente presentes nos logs, para o filtro. */
  sourceNames: string[];
  /** Filtros **aplicados** — os que produziram a listagem atual. */
  appliedFilters: AuditFilters;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  apply: (filters: AuditFilters) => void;
  clear: () => void;
  goToPage: (page: number) => void;
  reload: () => void;
}

const EMPTY_TOTALS: DispatchLogTotals = { totalDispatches: 0, totalValue: 0 };

/**
 * Consulta paginada do Painel de Auditoria.
 *
 * Fica no app, e não no `@aap/ui`, porque só esta tela usa: `useAdminResource`
 * resolve cadastros com escrita, e a auditoria é somente leitura com filtros e
 * paginação no servidor. Forçar uma no formato da outra pioraria as duas.
 *
 * **Os filtros são aplicados por comando, não a cada tecla.** A base cresce
 * indefinidamente e a consulta é paginada no servidor: disparar a cada
 * digitação encheria a rede de consultas descartadas. O que está no formulário é
 * rascunho; o que está aqui é o recorte vigente.
 */
export function useDispatchLogs(): UseDispatchLogsResult {
  const [logs, setLogs] = useState<DispatchLogDto[]>([]);
  const [totals, setTotals] = useState<DispatchLogTotals>(EMPTY_TOTALS);
  const [sourceNames, setSourceNames] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Alterar este contador reexecuta o efeito, que é como a recarga acontece.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadPage(): Promise<void> {
      setLoading(true);

      try {
        const response = await fetchDispatchLogs(appliedFilters, { page, limit: PAGE_SIZE });

        if (active) {
          setLogs(response.logs);
          setTotals(response.totals);
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

    void loadPage();

    return () => {
      active = false;
    };
  }, [appliedFilters, page, attempt]);

  /**
   * As opções de loja são carregadas uma vez, na abertura da tela.
   *
   * Não acompanham os filtros de propósito: uma lista de opções que encolhesse
   * conforme o recorte impediria o administrador de trocar de loja sem antes
   * limpar o que já escolheu.
   */
  useEffect(() => {
    let active = true;

    async function loadOptions(): Promise<void> {
      try {
        const options = await fetchAuditFilterOptions();

        if (active) {
          setSourceNames(options.sourceNames);
        }
      } catch {
        // A ausência das opções não impede consultar a auditoria: o filtro de
        // loja simplesmente fica vazio, e a falha real aparece na listagem.
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [attempt]);

  const apply = useCallback((filters: AuditFilters) => {
    // Trocar o recorte volta à primeira página: a página 3 do recorte anterior
    // não tem relação alguma com o novo.
    setPage(1);
    setAppliedFilters(filters);
  }, []);

  const clear = useCallback(() => {
    setPage(1);
    setAppliedFilters(EMPTY_AUDIT_FILTERS);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.max(1, nextPage));
  }, []);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return {
    logs,
    totals,
    sourceNames,
    appliedFilters,
    page,
    pageSize: PAGE_SIZE,
    loading,
    error,
    hasNextPage: page * PAGE_SIZE < totals.totalDispatches,
    apply,
    clear,
    goToPage,
    reload,
  };
}
