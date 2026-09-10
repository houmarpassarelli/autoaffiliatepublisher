// apps/dashboard-admin/src/screens/OperatorsScreen.tsx
import type { OperatorCreateInput, OperatorDto, OperatorUpdateInput } from '@aap/shared';
import { Badge, CheckboxField, TextField, useAdminResource, type DataTableColumn } from '@aap/ui';
import { operatorsApi } from '../api/operatorsApi.js';
import { ResourceScreen } from '../components/ResourceScreen.js';

/** Rascunho do formulário. O e-mail é opcional e trafega em branco quando ausente. */
interface OperatorDraft {
  name: string;
  email: string;
  active: boolean;
}

const EMPTY_DRAFT: OperatorDraft = {
  name: '',
  email: '',
  active: true,
};

const COLUMNS: DataTableColumn<OperatorDto>[] = [
  { key: 'name', header: 'Operador', render: (operator) => operator.name },
  {
    key: 'email',
    header: 'E-mail',
    render: (operator) => operator.email ?? <span className="text-secondary">Não informado</span>,
  },
  {
    key: 'presence',
    header: 'Presença',
    render: (operator) => (
      <Badge tone={operator.isOnline ? 'success' : 'neutral'}>
        {operator.isOnline ? 'Conectado' : 'Ausente'}
      </Badge>
    ),
  },
  {
    key: 'active',
    header: 'Status',
    render: (operator) => (
      <Badge tone={operator.active ? 'success' : 'neutral'}>
        {operator.active ? 'Ativo' : 'Inativo'}
      </Badge>
    ),
  },
];

/**
 * CRUD de operadores (`FLUXO_OPERACIONAL.md`, Seção 7.1).
 *
 * O cadastro é deliberadamente mínimo — nome, e-mail opcional e status. Não há
 * senha nem token: a identificação existe para atribuição de autoria no
 * comissionamento, não para controle de acesso.
 *
 * Diferente das fontes e dos canais, o operador pode estar **conectado** no
 * instante da alteração. Desativá-lo ou excluí-lo encerra a sessão dele e o
 * devolve à tela-portão — deixá-lo diante de um quadro que recusa cada clique
 * seria pior do que tirá-lo de lá.
 */
export function OperatorsScreen(): React.JSX.Element {
  const resource = useAdminResource(operatorsApi);

  return (
    <ResourceScreen<OperatorDto, OperatorCreateInput, OperatorUpdateInput, OperatorDraft>
      title="Operadores"
      description="Os nomes cadastrados aqui são exatamente os que aparecem na tela-portão do dashboard remoto."
      resource={resource}
      columns={COLUMNS}
      rowKey={(operator) => operator.id}
      createLabel="Novo operador"
      emptyTitle="Nenhum operador cadastrado"
      emptyDescription="Sem operador cadastrado, ninguém consegue entrar no dashboard remoto."
      describeItem={(operator) => operator.name}
      toDraft={(operator) =>
        operator
          ? { name: operator.name, email: operator.email ?? '', active: operator.active }
          : { ...EMPTY_DRAFT }
      }
      submit={async (draft, operator) => {
        const payload = { name: draft.name, email: draft.email, active: draft.active };

        return operator ? resource.update(operator.id, payload) : resource.create(payload);
      }}
      renderFields={({ draft, patchDraft, item, disabled }) => (
        <>
          <TextField
            label="Nome"
            required
            value={draft.name}
            disabled={disabled}
            hint="É o nome exibido na tela-portão e a assinatura registrada em cada disparo. Precisa ser único."
            onChange={(event) => {
              patchDraft({ name: event.target.value });
            }}
          />

          <TextField
            label="E-mail"
            type="email"
            value={draft.email}
            disabled={disabled}
            hint="Opcional — apenas referência de contato. Não há senha nem login."
            onChange={(event) => {
              patchDraft({ email: event.target.value });
            }}
          />

          <CheckboxField
            label="Operador ativo"
            checked={draft.active}
            disabled={disabled}
            hint={
              item?.isOnline
                ? 'Este operador está conectado agora: desativá-lo encerra a sessão dele imediatamente.'
                : 'Desativar retira o nome da tela-portão sem apagar a autoria já registrada.'
            }
            onChange={(event) => {
              patchDraft({ active: event.target.checked });
            }}
          />
        </>
      )}
    />
  );
}
