// apps/dashboard-admin/src/components/ResourceScreen.tsx
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  DataTable,
  Modal,
  type DataTableColumn,
  type UseAdminResourceResult,
} from '@aap/ui';

export interface ResourceScreenProps<TItem, TCreate, TUpdate, TDraft> {
  title: string;
  description: string;
  /** Estado e operações do cadastro, vindos de `useAdminResource`. */
  resource: UseAdminResourceResult<TItem, TCreate, TUpdate>;
  columns: DataTableColumn<TItem>[];
  rowKey: (item: TItem) => string;
  /** Rótulo do botão de cadastro, no singular (ex.: "Nova fonte"). */
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Rascunho do formulário: em branco na criação, preenchido a partir do item na edição. */
  toDraft: (item: TItem | null) => TDraft;
  /** Como o item é identificado na confirmação de exclusão. */
  describeItem: (item: TItem) => string;
  /**
   * Campos do formulário.
   *
   * `item` é `null` na criação e o registro gravado na edição — é dele que os
   * campos derivam o que não cabe no rascunho, como os nomes das credenciais já
   * cadastradas, e é ele que distingue os campos imutáveis após a criação.
   */
  renderFields: (context: {
    draft: TDraft;
    patchDraft: (changes: Partial<TDraft>) => void;
    item: TItem | null;
    disabled: boolean;
  }) => ReactNode;
  /** Envia o rascunho. Devolve `true` quando o diálogo pode fechar. */
  submit: (draft: TDraft, item: TItem | null) => Promise<boolean>;
}

/** O que está aberto sobre a tabela — nada, o formulário ou a confirmação de exclusão. */
type ScreenDialog<TItem, TDraft> =
  | { kind: 'none' }
  | { kind: 'form'; item: TItem | null; draft: TDraft }
  | { kind: 'delete'; item: TItem };

/**
 * Moldura comum das três telas de cadastro do painel administrativo.
 *
 * Fontes, canais e operadores são o mesmo fluxo com campos diferentes: uma
 * tabela, um formulário em diálogo e uma confirmação de exclusão. O que varia
 * são as colunas e os campos — e é só isso que cada tela informa aqui.
 *
 * Duas decisões de comportamento valem para os três cadastros:
 *
 * - **A recusa de escrita fica dentro do diálogo.** Nome duplicado ou exclusão
 *   bloqueada por referência não podem derrubar o formulário levando junto o
 *   que o operador já digitou. Só a falha de **carga** substitui a tabela.
 * - **A exclusão pede confirmação.** Diferente do descarte de oferta no
 *   dashboard remoto, que segue o requisito de agilidade de 5 a 10 segundos,
 *   aqui não há pressa e o alvo é um cadastro do qual todo o resto depende.
 */
export function ResourceScreen<TItem, TCreate, TUpdate, TDraft>({
  title,
  description,
  resource,
  columns,
  rowKey,
  createLabel,
  emptyTitle,
  emptyDescription,
  toDraft,
  describeItem,
  renderFields,
  submit,
}: ResourceScreenProps<TItem, TCreate, TUpdate, TDraft>): React.JSX.Element {
  const [dialog, setDialog] = useState<ScreenDialog<TItem, TDraft>>({ kind: 'none' });

  function openForm(item: TItem | null): void {
    resource.clearWriteError();
    setDialog({ kind: 'form', item, draft: toDraft(item) });
  }

  function closeDialog(): void {
    resource.clearWriteError();
    setDialog({ kind: 'none' });
  }

  function patchDraft(changes: Partial<TDraft>): void {
    setDialog((current) =>
      current.kind === 'form' ? { ...current, draft: { ...current.draft, ...changes } } : current,
    );
  }

  async function confirmForm(): Promise<void> {
    if (dialog.kind !== 'form') {
      return;
    }

    if (await submit(dialog.draft, dialog.item)) {
      setDialog({ kind: 'none' });
    }
  }

  async function confirmDelete(): Promise<void> {
    if (dialog.kind !== 'delete') {
      return;
    }

    if (await resource.remove(rowKey(dialog.item))) {
      setDialog({ kind: 'none' });
    }
  }

  // A coluna de ações é montada aqui para que as três telas não a repitam.
  const columnsWithActions: DataTableColumn<TItem>[] = [
    ...columns,
    {
      key: 'actions',
      header: 'Ações',
      align: 'end',
      width: '12rem',
      render: (item) => (
        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              openForm(item);
            }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resource.clearWriteError();
              setDialog({ kind: 'delete', item });
            }}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        title={title}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              openForm(null);
            }}
          >
            {createLabel}
          </Button>
        }
        flush
      >
        <p className="text-secondary px-3 pt-3 pb-2 mb-0">{description}</p>

        <DataTable
          columns={columnsWithActions}
          rows={resource.items}
          rowKey={rowKey}
          loading={resource.loading}
          error={resource.loadError}
          onRetry={resource.reload}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          caption={title}
          emptyAction={
            <Button
              variant="primary"
              onClick={() => {
                openForm(null);
              }}
            >
              {createLabel}
            </Button>
          }
        />
      </Card>

      <Modal
        open={dialog.kind === 'form'}
        title={dialog.kind === 'form' && dialog.item ? `Editar — ${title}` : createLabel}
        onClose={closeDialog}
        size="lg"
        scrollable
        dismissible={!resource.saving}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={resource.saving}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void confirmForm();
              }}
              loading={resource.saving}
              loadingLabel="Salvando…"
            >
              Salvar
            </Button>
          </>
        }
      >
        {resource.writeError ? (
          <Alert tone="danger" title="Não foi possível salvar">
            {resource.writeError}
          </Alert>
        ) : null}

        {dialog.kind === 'form'
          ? renderFields({
              draft: dialog.draft,
              patchDraft,
              item: dialog.item,
              disabled: resource.saving,
            })
          : null}
      </Modal>

      <Modal
        open={dialog.kind === 'delete'}
        title="Confirmar exclusão"
        onClose={closeDialog}
        dismissible={!resource.saving}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={resource.saving}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void confirmDelete();
              }}
              loading={resource.saving}
              loadingLabel="Excluindo…"
            >
              Excluir
            </Button>
          </>
        }
      >
        {resource.writeError ? (
          <Alert tone="danger" title="Não foi possível excluir">
            {resource.writeError}
          </Alert>
        ) : null}

        {dialog.kind === 'delete' ? (
          <p className="mb-0">
            Excluir <strong>{describeItem(dialog.item)}</strong> permanentemente? Registros já
            usados pelo sistema não podem ser excluídos — nesse caso, desative-os.
          </p>
        ) : null}
      </Modal>
    </>
  );
}
