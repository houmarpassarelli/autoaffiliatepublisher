// apps/dashboard-admin/src/screens/AuditScreen.tsx
import { useEffect, useState } from 'react';
import {
  DispatchActionType,
  type AdminChannelDto,
  type DispatchLogDto,
  type OperatorDto,
} from '@aap/shared';
import {
  Badge,
  Button,
  Card,
  DataTable,
  formatCurrency,
  formatDateTime,
  SelectField,
  TextField,
  type DataTableColumn,
  type SelectFieldOption,
} from '@aap/ui';
import { buildExportUrl, EMPTY_AUDIT_FILTERS, type AuditFilters } from '../api/auditApi.js';
import { channelsApi } from '../api/channelsApi.js';
import { operatorsApi } from '../api/operatorsApi.js';
import { useDispatchLogs } from '../state/useDispatchLogs.js';

/**
 * Estado de entrega de uma linha.
 *
 * `deliveryStatus` é preenchido pelo worker de disparo, canal a canal. Enquanto
 * ele não existir (Categoria 6), o mapa chega vazio em toda linha — e a coluna
 * diz isso, em vez de sugerir uma entrega que nenhum driver realizou.
 */
function describeDelivery(log: DispatchLogDto): {
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  label: string;
} {
  const results = Object.values(log.deliveryStatus);

  if (results.length === 0) {
    return { tone: 'neutral', label: 'Aguardando disparo' };
  }

  const failures = results.filter((result) => result.toUpperCase() !== 'SUCCESS').length;

  if (failures === 0) {
    return { tone: 'success', label: 'Entregue' };
  }

  return failures === results.length
    ? { tone: 'danger', label: 'Falhou' }
    : { tone: 'warning', label: 'Parcial' };
}

/**
 * O que o **operador** fez, que é informação distinta do que a máquina entregou.
 *
 * A cópia assistida tem o mesmo peso da publicação automatizada na fila, mas o
 * sistema não tem como verificar se a colagem ocorreu (`MONETIZACAO.md`, 3.3).
 * A auditoria precisa distinguir as duas, porque é insumo do rateio.
 */
function describeAction(actionType: DispatchActionType): string {
  return actionType === DispatchActionType.PUBLISHED_API ? 'Publicado por API' : 'Copiado';
}

/**
 * Painel de Auditoria de Disparos (`FLUXO_OPERACIONAL.md`, Seção 8).
 *
 * Somente leitura: `dispatch_logs` é gravado uma vez pela ação resolutiva do
 * operador e nunca reescrito. A tela não oferece edição nem exclusão de linha
 * alguma, e é assim de propósito — corrigir aqui seria corrigir o histórico.
 */
export function AuditScreen(): React.JSX.Element {
  const audit = useDispatchLogs();

  // Rascunho do formulário. Só vira recorte quando o administrador aplica: a
  // base cresce indefinidamente e a consulta é paginada no servidor.
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);

  const [operators, setOperators] = useState<OperatorDto[]>([]);
  const [channels, setChannels] = useState<AdminChannelDto[]>([]);

  /**
   * Cadastros que alimentam dois dos quatro filtros.
   *
   * Operador e canal filtram por identidade e têm cadastro vivo — a regra de
   * exclusão do painel impede remover qualquer um dos dois enquanto houver log
   * apontando para ele, de modo que a lista sempre cobre a base inteira. A loja,
   * que é texto congelado no disparo, vem dos próprios logs.
   */
  useEffect(() => {
    let active = true;

    async function loadRegistries(): Promise<void> {
      const [loadedOperators, loadedChannels] = await Promise.all([
        operatorsApi.list().catch(() => [] as OperatorDto[]),
        channelsApi.list().catch(() => [] as AdminChannelDto[]),
      ]);

      if (active) {
        setOperators(loadedOperators);
        setChannels(loadedChannels);
      }
    }

    void loadRegistries();

    return () => {
      active = false;
    };
  }, []);

  const operatorOptions: SelectFieldOption[] = operators.map((operator) => ({
    value: operator.id,
    label: operator.name,
  }));

  // O filtro exibe o **rótulo** do canal, nunca a chave: a chave é identificador
  // de payload e de auditoria, não o nome pelo qual o destino é conhecido.
  const channelOptions: SelectFieldOption[] = channels.map((channel) => ({
    value: channel.key,
    label: channel.label,
  }));

  const sourceOptions: SelectFieldOption[] = audit.sourceNames.map((sourceName) => ({
    value: sourceName,
    label: sourceName,
  }));

  /** Rótulo do canal a partir da chave gravada, com recuo para a própria chave. */
  function resolveChannelLabel(key: string): string {
    return channels.find((channel) => channel.key === key)?.label ?? key;
  }

  const columns: DataTableColumn<DispatchLogDto>[] = [
    {
      key: 'dispatchedAt',
      header: 'Data/Hora',
      width: '11rem',
      render: (log) => formatDateTime(log.dispatchedAt),
    },
    { key: 'operator', header: 'Operador', render: (log) => log.operatorName },
    {
      key: 'product',
      header: 'Produto',
      render: (log) => (
        <>
          <div>{log.offerTitle}</div>
          <small className="text-secondary">SKU {log.productSku}</small>
        </>
      ),
    },
    { key: 'source', header: 'Loja', render: (log) => log.sourceName },
    {
      key: 'price',
      header: 'Preço',
      align: 'end',
      width: '8rem',
      render: (log) => formatCurrency(log.priceAtDispatch),
    },
    {
      key: 'link',
      header: 'Link',
      width: '7rem',
      render: (log) => (
        // `noopener`/`noreferrer` porque o destino é a loja de origem, externa.
        <a href={log.affiliateUrl} target="_blank" rel="noopener noreferrer">
          Abrir
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '13rem',
      render: (log) => {
        const delivery = describeDelivery(log);

        return (
          <>
            <Badge tone={delivery.tone}>{delivery.label}</Badge>
            <div>
              <small className="text-secondary">
                {describeAction(log.actionType)} ·{' '}
                {log.channels.map(resolveChannelLabel).join(', ')}
              </small>
            </div>
          </>
        );
      },
    },
  ];

  const firstRow = audit.totals.totalDispatches === 0 ? 0 : (audit.page - 1) * audit.pageSize + 1;
  const lastRow = (audit.page - 1) * audit.pageSize + audit.logs.length;
  const hasMultiplePages = audit.totals.totalDispatches > audit.pageSize;

  return (
    <Card
      title="Auditoria de Disparos"
      actions={
        // Âncora, e não o `Button` do kit: a exportação é servida com
        // `Content-Disposition: attachment`, e é a navegação do navegador até
        // ela que dispara o download com o nome de arquivo definido no servidor.
        <a className="btn btn-outline-secondary" href={buildExportUrl(audit.appliedFilters)}>
          Exportar CSV
        </a>
      }
      flush
    >
      <div className="px-3 pt-3">
        <p className="text-secondary">
          Toda ação resolutiva do dashboard remoto fica registrada aqui. O histórico é imutável:
          nenhuma linha pode ser editada ou removida.
        </p>

        <div className="row g-2">
          <div className="col-12 col-md-6 col-lg-2">
            <TextField
              label="De"
              type="date"
              value={draft.from}
              onChange={(event) => {
                setDraft({ ...draft, from: event.target.value });
              }}
            />
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <TextField
              label="Até"
              type="date"
              value={draft.to}
              onChange={(event) => {
                setDraft({ ...draft, to: event.target.value });
              }}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-3">
            <SelectField
              label="Operador"
              options={operatorOptions}
              placeholder="Todos"
              value={draft.operatorId}
              onChange={(event) => {
                setDraft({ ...draft, operatorId: event.target.value });
              }}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-3">
            <SelectField
              label="Loja de origem"
              options={sourceOptions}
              placeholder="Todas"
              value={draft.sourceName}
              hint="Nomes como estavam gravados no instante de cada disparo."
              onChange={(event) => {
                setDraft({ ...draft, sourceName: event.target.value });
              }}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-2">
            <SelectField
              label="Canal"
              options={channelOptions}
              placeholder="Todos"
              value={draft.channel}
              onChange={(event) => {
                setDraft({ ...draft, channel: event.target.value });
              }}
            />
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                audit.apply(draft);
              }}
            >
              Aplicar filtros
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(EMPTY_AUDIT_FILTERS);
                audit.clear();
              }}
            >
              Limpar
            </Button>
          </div>

          <div className="text-end">
            <div>
              <strong>{audit.totals.totalDispatches}</strong> disparo(s) no recorte ·{' '}
              <strong>{formatCurrency(audit.totals.totalValue)}</strong> em produtos
            </div>
            {/* A soma é de preço de produto, não de comissão. O cálculo de
                comissão depende do cruzamento com os relatórios das plataformas
                e é projeto futuro — a tela não pode deixar isso ambíguo. */}
            <small className="text-secondary">
              Soma dos preços congelados no disparo. Não é comissão.
            </small>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={audit.logs}
        rowKey={(log) => log.id}
        loading={audit.loading}
        error={audit.error}
        onRetry={audit.reload}
        caption="Auditoria de disparos"
        emptyTitle="Nenhum disparo registrado"
        emptyDescription="Nenhuma ação resolutiva corresponde ao recorte atual. Publicações e cópias feitas no dashboard remoto aparecem aqui."
      />

      {audit.logs.length > 0 ? (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top">
          <span className="text-secondary">
            Exibindo {firstRow}–{lastRow} de {audit.totals.totalDispatches}
          </span>

          {/* Os controles de página só aparecem quando há mais de uma página.
              Um recorte que cabe inteiro na tela não precisa de dois botões
              permanentemente desabilitados — a contagem acima já diz tudo. */}
          {hasMultiplePages ? (
            <div className="d-flex gap-2">
              <Button
                variant="secondary"
                disabled={audit.page === 1}
                onClick={() => {
                  audit.goToPage(audit.page - 1);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={!audit.hasNextPage}
                onClick={() => {
                  audit.goToPage(audit.page + 1);
                }}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
