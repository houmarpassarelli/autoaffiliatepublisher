// apps/dashboard-admin/src/screens/ChannelsScreen.tsx
import {
  ChannelMode,
  CopyFormat,
  type AdminChannelDto,
  type ChannelCreateInput,
  type ChannelUpdateInput,
  type CredentialsPatch,
} from '@aap/shared';
import {
  Badge,
  CheckboxField,
  SelectField,
  TextField,
  useAdminResource,
  type DataTableColumn,
} from '@aap/ui';
import { channelsApi } from '../api/channelsApi.js';
import { CredentialsEditor } from '../components/CredentialsEditor.js';
import { ResourceScreen } from '../components/ResourceScreen.js';

/** Rascunho do formulário. `credentials` acumula o merge patch, não o mapa completo. */
interface ChannelDraft {
  key: string;
  label: string;
  mode: ChannelMode;
  copyFormatKey: CopyFormat;
  active: boolean;
  credentials: CredentialsPatch;
}

const MODE_OPTIONS = [
  { value: ChannelMode.AUTOMATED, label: 'AUTOMATED — o driver publica sozinho' },
  { value: ChannelMode.ASSISTED, label: 'ASSISTED — o operador cola manualmente' },
];

const COPY_FORMAT_OPTIONS = [
  { value: CopyFormat.MESSAGING, label: 'messaging — WhatsApp e Telegram' },
  { value: CopyFormat.SOCIAL, label: 'social — Instagram e TikTok' },
  { value: CopyFormat.ARTICLE, label: 'article — site próprio' },
];

const EMPTY_DRAFT: ChannelDraft = {
  key: '',
  label: '',
  mode: ChannelMode.AUTOMATED,
  copyFormatKey: CopyFormat.MESSAGING,
  active: true,
  credentials: {},
};

const COLUMNS: DataTableColumn<AdminChannelDto>[] = [
  { key: 'label', header: 'Canal', render: (channel) => channel.label },
  { key: 'key', header: 'Chave', render: (channel) => <code>{channel.key}</code> },
  {
    key: 'mode',
    header: 'Modo',
    render: (channel) => (
      <Badge tone={channel.mode === ChannelMode.AUTOMATED ? 'info' : 'warning'}>
        {channel.mode}
      </Badge>
    ),
  },
  { key: 'copy', header: 'Copy', render: (channel) => <code>{channel.copyFormatKey}</code> },
  {
    key: 'credentials',
    header: 'Credenciais',
    render: (channel) =>
      channel.credentialKeys.length > 0 ? (
        channel.credentialKeys.join(', ')
      ) : (
        <span className="text-secondary">Nenhuma</span>
      ),
  },
  {
    key: 'active',
    header: 'Status',
    render: (channel) => (
      <Badge tone={channel.active ? 'success' : 'neutral'}>
        {channel.active ? 'Ativo' : 'Inativo'}
      </Badge>
    ),
  },
];

/**
 * CRUD de canais de destino (`FLUXO_OPERACIONAL.md`, Seção 6).
 *
 * É o único cadastro do painel com efeito imediato no Dashboard Remoto: os
 * checkboxes do seletor multicanal de cada card **são** esta lista. Toda escrita
 * aqui chega às telas conectadas por `CHANNELS_UPDATED`, sem recarregamento.
 */
export function ChannelsScreen(): React.JSX.Element {
  const resource = useAdminResource(channelsApi);

  return (
    <ResourceScreen<AdminChannelDto, ChannelCreateInput, ChannelUpdateInput, ChannelDraft>
      title="Canais de Destino"
      description="Os canais cadastrados aqui aparecem como checkboxes nos cards do dashboard remoto, em tempo real."
      resource={resource}
      columns={COLUMNS}
      rowKey={(channel) => channel.id}
      createLabel="Novo canal"
      emptyTitle="Nenhum canal cadastrado"
      emptyDescription="Sem canal ativo, o operador não consegue publicar nenhuma oferta."
      describeItem={(channel) => channel.label}
      toDraft={(channel) =>
        channel
          ? {
              key: channel.key,
              label: channel.label,
              mode: channel.mode,
              copyFormatKey: channel.copyFormatKey,
              active: channel.active,
              credentials: {},
            }
          : { ...EMPTY_DRAFT }
      }
      submit={async (draft, channel) => {
        // A chave só viaja na criação: depois de gravada em ofertas e logs de
        // auditoria, renomeá-la romperia o vínculo do comissionamento.
        if (channel) {
          return resource.update(channel.id, {
            label: draft.label,
            mode: draft.mode,
            copyFormatKey: draft.copyFormatKey,
            active: draft.active,
            credentials: draft.credentials,
          });
        }

        return resource.create({
          key: draft.key,
          label: draft.label,
          mode: draft.mode,
          copyFormatKey: draft.copyFormatKey,
          active: draft.active,
          credentials: draft.credentials,
        });
      }}
      renderFields={({ draft, patchDraft, item, disabled }) => (
        <>
          <TextField
            label="Nome exibido"
            required
            value={draft.label}
            disabled={disabled}
            hint="É o texto que o operador vê no checkbox do card."
            onChange={(event) => {
              patchDraft({ label: event.target.value });
            }}
          />

          <TextField
            label="Chave"
            required
            value={draft.key}
            disabled={disabled || item !== null}
            hint={
              item
                ? 'A chave não pode ser alterada: ela já está gravada nos logs de disparo e nas ofertas agendadas.'
                : 'Identificador estável usado nos payloads e na auditoria. Apenas minúsculas, números e hífen.'
            }
            onChange={(event) => {
              patchDraft({ key: event.target.value });
            }}
          />

          <SelectField
            label="Modo de execução"
            required
            options={MODE_OPTIONS}
            value={draft.mode}
            disabled={disabled}
            hint="ASSISTED é para canais sem API viável de postagem, como WhatsApp Canais e Stories."
            onChange={(event) => {
              patchDraft({ mode: event.target.value as ChannelMode });
            }}
          />

          <SelectField
            label="Variante de copy"
            required
            options={COPY_FORMAT_OPTIONS}
            value={draft.copyFormatKey}
            disabled={disabled}
            hint="Qual dos três textos gerados pela IA este canal consome no disparo."
            onChange={(event) => {
              patchDraft({ copyFormatKey: event.target.value as CopyFormat });
            }}
          />

          <CredentialsEditor
            existingKeys={item?.credentialKeys ?? []}
            patch={draft.credentials}
            disabled={disabled}
            hint="Tokens de envio do canal. Nunca trafegam ao dashboard remoto, que é Thin Client."
            onChange={(credentials) => {
              patchDraft({ credentials });
            }}
          />

          <CheckboxField
            label="Canal ativo"
            checked={draft.active}
            disabled={disabled}
            hint="Desativar oculta o canal do dashboard remoto imediatamente, sem apagar a auditoria."
            onChange={(event) => {
              patchDraft({ active: event.target.checked });
            }}
          />
        </>
      )}
    />
  );
}
