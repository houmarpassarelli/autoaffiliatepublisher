// apps/dashboard-admin/src/screens/SourcesScreen.tsx
import {
  SourceType,
  type CredentialsPatch,
  type SourceCreateInput,
  type SourceDto,
  type SourceUpdateInput,
} from '@aap/shared';
import {
  Badge,
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
  useAdminResource,
  type DataTableColumn,
} from '@aap/ui';
import { sourcesApi } from '../api/sourcesApi.js';
import { CredentialsEditor } from '../components/CredentialsEditor.js';
import { ResourceScreen } from '../components/ResourceScreen.js';

/** Rascunho do formulário. `credentials` acumula o merge patch, não o mapa completo. */
interface SourceDraft {
  name: string;
  type: SourceType;
  url: string;
  affiliateTag: string;
  cronExpression: string;
  aiPromptTemplate: string;
  active: boolean;
  complianceVerified: boolean;
  credentials: CredentialsPatch;
}

const SOURCE_TYPE_OPTIONS = [
  { value: SourceType.API, label: 'API — cliente oficial de afiliados' },
  { value: SourceType.RSS, label: 'RSS — feed da rede de afiliados' },
  { value: SourceType.SCRAPER, label: 'SCRAPER — raspagem dirigida' },
];

/** Fonte nova nasce ativa e com varredura de hora em hora, o intervalo mais comum. */
const EMPTY_DRAFT: SourceDraft = {
  name: '',
  type: SourceType.API,
  url: '',
  affiliateTag: '',
  cronExpression: '0 * * * *',
  aiPromptTemplate: '',
  active: true,
  complianceVerified: false,
  credentials: {},
};

const COLUMNS: DataTableColumn<SourceDto>[] = [
  { key: 'name', header: 'Fonte', render: (source) => source.name },
  { key: 'type', header: 'Tipo', render: (source) => <Badge tone="info">{source.type}</Badge> },
  {
    key: 'cron',
    header: 'Varredura',
    render: (source) => <code>{source.cronExpression}</code>,
  },
  {
    key: 'credentials',
    header: 'Credenciais',
    render: (source) =>
      source.credentialKeys.length > 0 ? (
        source.credentialKeys.join(', ')
      ) : (
        <span className="text-secondary">Nenhuma</span>
      ),
  },
  {
    key: 'active',
    header: 'Status',
    render: (source) => (
      <Badge tone={source.active ? 'success' : 'neutral'}>
        {source.active ? 'Ativa' : 'Inativa'}
      </Badge>
    ),
  },
];

/**
 * CRUD de fontes de coleta (`ARQUITETURA.md`, Seção 4.3).
 *
 * A fonte é o cadastro que concentra tudo que é específico da loja: credenciais,
 * tag de afiliado, ritmo de varredura e o prompt da IA. Os módulos de ingestão e
 * de IA leem daqui — nenhum deles guarda configuração própria.
 */
export function SourcesScreen(): React.JSX.Element {
  const resource = useAdminResource(sourcesApi);

  return (
    <ResourceScreen<SourceDto, SourceCreateInput, SourceUpdateInput, SourceDraft>
      title="Fontes de Coleta"
      description="Cada fonte define de onde as ofertas vêm, com que frequência são varridas e como a IA deve reescrevê-las."
      resource={resource}
      columns={COLUMNS}
      rowKey={(source) => source.id}
      createLabel="Nova fonte"
      emptyTitle="Nenhuma fonte cadastrada"
      emptyDescription="Sem fonte cadastrada, o motor de ingestão não tem o que varrer."
      describeItem={(source) => source.name}
      toDraft={(source) =>
        source
          ? {
              name: source.name,
              type: source.type,
              url: source.url,
              affiliateTag: source.affiliateTag,
              cronExpression: source.cronExpression,
              aiPromptTemplate: source.aiPromptTemplate,
              active: source.active,
              complianceVerified: source.complianceVerified,
              credentials: {},
            }
          : { ...EMPTY_DRAFT }
      }
      submit={async (draft, source) => {
        const payload = {
          name: draft.name,
          type: draft.type,
          url: draft.url,
          affiliateTag: draft.affiliateTag,
          cronExpression: draft.cronExpression,
          aiPromptTemplate: draft.aiPromptTemplate,
          active: draft.active,
          complianceVerified: draft.complianceVerified,
          credentials: draft.credentials,
        };

        return source ? resource.update(source.id, payload) : resource.create(payload);
      }}
      renderFields={({ draft, patchDraft, item, disabled }) => (
        <>
          <TextField
            label="Nome da loja ou plataforma"
            required
            value={draft.name}
            disabled={disabled}
            hint="Identifica a fonte no painel e nos filtros de auditoria. Precisa ser único."
            onChange={(event) => {
              patchDraft({ name: event.target.value });
            }}
          />

          <SelectField
            label="Mecanismo de coleta"
            required
            options={SOURCE_TYPE_OPTIONS}
            value={draft.type}
            disabled={disabled}
            hint="A API oficial é o caminho preferencial; a raspagem é o último recurso."
            onChange={(event) => {
              patchDraft({ type: event.target.value as SourceType });
            }}
          />

          <TextField
            label="URL"
            required
            type="url"
            value={draft.url}
            disabled={disabled}
            hint="Endpoint da API, endereço do feed ou página de ofertas, conforme o mecanismo."
            onChange={(event) => {
              patchDraft({ url: event.target.value });
            }}
          />

          <TextField
            label="Tag de afiliado"
            required
            value={draft.affiliateTag}
            disabled={disabled}
            hint="Usada na conversão do link do produto no link rastreado."
            onChange={(event) => {
              patchDraft({ affiliateTag: event.target.value });
            }}
          />

          <TextField
            label="Intervalo de varredura (cron)"
            required
            value={draft.cronExpression}
            disabled={disabled}
            hint='Cinco campos: minuto hora dia mês dia-da-semana. Ex.: "0 * * * *" varre de hora em hora.'
            onChange={(event) => {
              patchDraft({ cronExpression: event.target.value });
            }}
          />

          <TextAreaField
            label="Prompt da IA"
            required
            rows={5}
            value={draft.aiPromptTemplate}
            disabled={disabled}
            hint="Como a IA deve reescrever as ofertas desta fonte. Ela recebe apenas dados já extraídos — nunca HTML bruto."
            onChange={(event) => {
              patchDraft({ aiPromptTemplate: event.target.value });
            }}
          />

          <CredentialsEditor
            existingKeys={item?.credentialKeys ?? []}
            patch={draft.credentials}
            disabled={disabled}
            hint="Chaves e tokens da API de afiliados. Ficam apenas nesta máquina e nunca são exibidas depois de salvas."
            onChange={(credentials) => {
              patchDraft({ credentials });
            }}
          />

          <CheckboxField
            label="Fonte ativa"
            checked={draft.active}
            disabled={disabled}
            hint="Desativar interrompe a varredura sem apagar o cadastro nem o histórico de ofertas."
            onChange={(event) => {
              patchDraft({ active: event.target.checked });
            }}
          />

          <CheckboxField
            label="Regras de Compliance Verificadas"
            checked={draft.complianceVerified}
            disabled={disabled}
            hint="Confirmo que verifiquei as regras deste programa (ex: a Amazon proíbe links em mensagens privadas fechadas; canais abertos exigem cadastro no perfil de associado)."
            onChange={(event) => {
              patchDraft({ complianceVerified: event.target.checked });
            }}
          />
        </>
      )}
    />
  );
}
