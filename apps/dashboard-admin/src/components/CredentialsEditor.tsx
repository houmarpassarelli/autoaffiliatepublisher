// apps/dashboard-admin/src/components/CredentialsEditor.tsx
import { useState } from 'react';
import type { CredentialsPatch } from '@aap/shared';
import { Badge, Button, TextField } from '@aap/ui';

export interface CredentialsEditorProps {
  /** Nomes das chaves já cadastradas. O servidor nunca devolve os valores. */
  existingKeys: string[];
  /** Alterações acumuladas até aqui. `null` num valor significa remover a chave. */
  patch: CredentialsPatch;
  onChange: (patch: CredentialsPatch) => void;
  /** Desabilita o editor enquanto uma escrita está em andamento. */
  disabled?: boolean;
  /** Explica de onde vêm as credenciais daquele cadastro. */
  hint: string;
}

/**
 * Editor do mapa de credenciais das fontes e dos canais.
 *
 * Ele existe porque a credencial é o único campo do painel que **entra e nunca
 * volta**: o servidor devolve apenas os nomes das chaves cadastradas. Um
 * formulário comum não serve — não há valor para preencher no campo ao abrir a
 * edição, e um campo vazio significaria "apagar", não "manter".
 *
 * Daí as três operações distintas desta tela, que espelham exatamente o merge
 * patch aceito pelo servidor:
 *
 * - **manter**: a chave existe e nada é enviado sobre ela;
 * - **substituir**: um valor novo é digitado e viaja no patch;
 * - **remover**: a chave viaja no patch com `null`, o único comando explícito
 *   de exclusão de uma credencial.
 */
export function CredentialsEditor({
  existingKeys,
  patch,
  onChange,
  disabled = false,
  hint,
}: CredentialsEditorProps): React.JSX.Element {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Chaves criadas nesta edição: estão no patch com valor, mas ainda não no cadastro.
  const addedKeys = Object.keys(patch).filter(
    (key) => patch[key] !== null && !existingKeys.includes(key),
  );

  function applyChange(key: string, value: string | null): void {
    onChange({ ...patch, [key]: value });
  }

  /** Desfaz uma alteração pendente, devolvendo a chave ao estado gravado. */
  function revertChange(key: string): void {
    const next = { ...patch };
    delete next[key];

    onChange(next);
  }

  function addCredential(): void {
    const key = newKey.trim();

    if (key.length === 0) {
      return;
    }

    applyChange(key, newValue);
    setNewKey('');
    setNewValue('');
  }

  return (
    <fieldset className="mb-3" disabled={disabled}>
      <legend className="form-label">Credenciais</legend>
      <p className="form-hint mb-2">{hint}</p>

      {existingKeys.length === 0 && addedKeys.length === 0 ? (
        <p className="text-secondary mb-2">Nenhuma credencial cadastrada.</p>
      ) : null}

      {existingKeys.map((key) => {
        const pendingValue = patch[key];
        const markedForRemoval = pendingValue === null;

        return (
          <div className="d-flex align-items-end gap-2 mb-2" key={key}>
            <div className="flex-fill">
              <TextField
                label={key}
                type="password"
                autoComplete="off"
                value={typeof pendingValue === 'string' ? pendingValue : ''}
                disabled={markedForRemoval}
                placeholder={markedForRemoval ? 'Será removida ao salvar' : 'Valor mantido'}
                hint={
                  markedForRemoval ? undefined : 'Deixe em branco para manter o valor já gravado.'
                }
                onChange={(event) => {
                  applyChange(key, event.target.value);
                }}
              />
            </div>

            <div className="mb-3">
              {markedForRemoval ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    revertChange(key);
                  }}
                >
                  Desfazer
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => {
                    applyChange(key, null);
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {addedKeys.map((key) => (
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2" key={key}>
          <span>
            <Badge tone="info">Nova</Badge> <span className="ms-1">{key}</span>
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              revertChange(key);
            }}
          >
            Descartar
          </Button>
        </div>
      ))}

      <div className="d-flex align-items-end gap-2">
        <div className="flex-fill">
          <TextField
            label="Nova chave"
            value={newKey}
            autoComplete="off"
            placeholder="ex.: apiKey"
            onChange={(event) => {
              setNewKey(event.target.value);
            }}
          />
        </div>
        <div className="flex-fill">
          <TextField
            label="Valor"
            type="password"
            value={newValue}
            autoComplete="off"
            onChange={(event) => {
              setNewValue(event.target.value);
            }}
          />
        </div>
        <div className="mb-3">
          <Button variant="secondary" onClick={addCredential} disabled={newKey.trim().length === 0}>
            Adicionar
          </Button>
        </div>
      </div>
    </fieldset>
  );
}
