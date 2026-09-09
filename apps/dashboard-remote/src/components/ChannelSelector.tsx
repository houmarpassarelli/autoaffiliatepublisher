// apps/dashboard-remote/src/components/ChannelSelector.tsx
import { CheckboxField } from '@aap/ui';
import type { ChannelDto } from '@aap/shared';

export interface ChannelSelectorProps {
  channels: ChannelDto[];
  /** Chaves atualmente marcadas. */
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Trava o seletor enquanto uma ação resolutiva está em andamento. */
  disabled?: boolean;
}

/**
 * Seletor multicanal do card.
 *
 * Todas as caixas nascem marcadas — decisão de domínio, não de estilo: o caminho
 * comum é publicar em todos os destinos, e o operador só precisa desmarcar
 * aquele em que a oferta não faz sentido (FLUXO_OPERACIONAL.md, Seção 6).
 *
 * A opção mestre é uma caixa comum, sem estado intermediário: marcada quando tudo
 * está marcado, e clicá-la marca ou desmarca o conjunto inteiro. Um terceiro
 * estado visual comunicaria "parcial" sem oferecer ação nova, e o requisito aqui
 * é agilidade.
 */
export function ChannelSelector({
  channels,
  selected,
  onChange,
  disabled = false,
}: ChannelSelectorProps): React.JSX.Element {
  const allSelected = channels.length > 0 && selected.length === channels.length;

  function toggleChannel(key: string, checked: boolean): void {
    onChange(checked ? [...selected, key] : selected.filter((current) => current !== key));
  }

  function toggleAll(checked: boolean): void {
    onChange(checked ? channels.map((channel) => channel.key) : []);
  }

  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="form-label">Canais de destino</legend>

      <CheckboxField
        label="Marcar/Desmarcar Todos"
        checked={allSelected}
        disabled={disabled || channels.length === 0}
        onChange={(changeEvent) => {
          toggleAll(changeEvent.target.checked);
        }}
      />

      <div className="row g-0">
        {channels.map((channel) => (
          <div className="col-12 col-sm-6 col-lg-4" key={channel.id}>
            <CheckboxField
              label={channel.label}
              checked={selected.includes(channel.key)}
              disabled={disabled}
              onChange={(changeEvent) => {
                toggleChannel(channel.key, changeEvent.target.checked);
              }}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
