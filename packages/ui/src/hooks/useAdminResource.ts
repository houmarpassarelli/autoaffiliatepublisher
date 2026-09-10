// packages/ui/src/hooks/useAdminResource.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '../client/httpClient.js';

/**
 * Operações de um cadastro do Dashboard Administrativo.
 *
 * As três telas do painel — fontes, canais e operadores — são o mesmo fluxo com
 * campos diferentes: listar, criar, editar e excluir sobre um recurso com chave
 * natural única. O que muda entre elas é o formulário e as colunas da tabela,
 * não a mecânica de carga, recarga e tratamento de recusa.
 */
export interface AdminResourceApi<TItem, TCreate, TUpdate> {
  list: () => Promise<TItem[]>;
  create: (input: TCreate) => Promise<TItem>;
  update: (id: string, input: TUpdate) => Promise<TItem>;
  remove: (id: string) => Promise<void>;
}

export interface UseAdminResourceResult<TItem, TCreate, TUpdate> {
  items: TItem[];
  loading: boolean;
  /** Falha da **listagem**. Substitui a tabela pelo estado de erro. */
  loadError: string | null;
  /** Falha da última **escrita**. Fica no formulário, sem derrubar a tabela. */
  writeError: string | null;
  /** Escrita em andamento — desabilita os controles do formulário. */
  saving: boolean;
  reload: () => void;
  clearWriteError: () => void;
  create: (input: TCreate) => Promise<boolean>;
  update: (id: string, input: TUpdate) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Carga e escrita de um cadastro administrativo.
 *
 * A separação entre `loadError` e `writeError` é deliberada. "Não consegui
 * carregar a lista" e "este nome já existe" exigem lugares diferentes na tela:
 * o primeiro substitui a tabela, o segundo pertence ao formulário aberto, que
 * não pode desaparecer levando junto o que o operador já digitou.
 *
 * As três operações de escrita devolvem `boolean` em vez de propagar a exceção:
 * quem chama precisa apenas saber se pode fechar o diálogo. A mensagem de recusa
 * já está em `writeError`.
 */
export function useAdminResource<TItem, TCreate, TUpdate>(
  api: AdminResourceApi<TItem, TCreate, TUpdate>,
): UseAdminResourceResult<TItem, TCreate, TUpdate> {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Alterar este contador reexecuta o efeito, que é como a recarga acontece.
  const [attempt, setAttempt] = useState(0);

  // As telas montam o objeto de API a cada render. Guardá-lo numa referência
  // mantém as funções devolvidas por este hook com identidade estável — sem
  // isso, cada render recriaria os callbacks e a carga entraria em laço.
  const apiRef = useRef(api);
  apiRef.current = api;

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setAttempt((current) => current + 1);
  }, []);

  const clearWriteError = useCallback(() => {
    setWriteError(null);
  }, []);

  useEffect(() => {
    // Cancela a atualização de estado se a tela for desmontada antes da resposta.
    let active = true;

    async function loadItems(): Promise<void> {
      try {
        const loaded = await apiRef.current.list();

        if (active) {
          setItems(loaded);
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(describeError(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      active = false;
    };
  }, [attempt]);

  /**
   * Núcleo comum das três escritas.
   *
   * A lista é recarregada do servidor após cada sucesso, em vez de remendada em
   * memória: a resposta de uma escrita traz o registro alterado, mas não a
   * ordenação nem os efeitos colaterais — desativar um canal, por exemplo, muda
   * o que o dashboard remoto enxerga. Recarregar mantém a tela fiel ao servidor.
   */
  const runWrite = useCallback(async (operation: () => Promise<unknown>): Promise<boolean> => {
    setSaving(true);
    setWriteError(null);

    try {
      await operation();
      setAttempt((current) => current + 1);

      return true;
    } catch (error) {
      setWriteError(describeError(error));

      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const create = useCallback(
    async (input: TCreate) => runWrite(() => apiRef.current.create(input)),
    [runWrite],
  );

  const update = useCallback(
    async (id: string, input: TUpdate) => runWrite(() => apiRef.current.update(id, input)),
    [runWrite],
  );

  const remove = useCallback(
    async (id: string) => runWrite(() => apiRef.current.remove(id)),
    [runWrite],
  );

  return {
    items,
    loading,
    loadError,
    writeError,
    saving,
    reload,
    clearWriteError,
    create,
    update,
    remove,
  };
}
