// packages/ui/src/components/FormField.tsx
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface FieldFrameProps {
  label: string;
  /** Marca o campo como obrigatório para leitores de tela e visualmente. */
  required?: boolean;
  /** Explicação auxiliar exibida abaixo do controle. */
  hint?: string;
  /** Mensagem de validação. Sua presença marca o controle como inválido. */
  error?: string;
  children: (fieldProps: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
    className: string;
  }) => ReactNode;
}

/**
 * Moldura de campo: rótulo, dica e erro.
 *
 * A ligação entre rótulo, dica, erro e controle é feita por identificadores
 * gerados aqui — deixar isso a cargo de cada formulário é a origem mais comum de
 * campos que leitores de tela não conseguem anunciar corretamente.
 */
function FieldFrame({ label, required, hint, error, children }: FieldFrameProps): React.JSX.Element {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? <span className="text-danger ms-1">*</span> : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy.length > 0 ? describedBy : undefined,
        'aria-invalid': error ? true : undefined,
        className: error ? 'form-control is-invalid' : 'form-control',
      })}

      {hint ? (
        <small className="form-hint" id={hintId}>
          {hint}
        </small>
      ) : null}

      {error ? (
        <div className="invalid-feedback d-block" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>;

export interface TextFieldProps extends NativeInputProps {
  label: string;
  hint?: string;
  error?: string;
}

/** Campo de texto de linha única. */
export function TextField({ label, hint, error, ...rest }: TextFieldProps): React.JSX.Element {
  return (
    <FieldFrame
      label={label}
      {...(rest.required ? { required: true } : {})}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldProps) => <input {...rest} {...fieldProps} />}
    </FieldFrame>
  );
}

type NativeTextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>;

export interface TextAreaFieldProps extends NativeTextAreaProps {
  label: string;
  hint?: string;
  error?: string;
}

/** Campo de texto longo. Usado no prompt de IA da fonte de coleta. */
export function TextAreaField({
  label,
  hint,
  error,
  rows = 4,
  ...rest
}: TextAreaFieldProps): React.JSX.Element {
  return (
    <FieldFrame
      label={label}
      {...(rest.required ? { required: true } : {})}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldProps) => <textarea {...rest} {...fieldProps} rows={rows} />}
    </FieldFrame>
  );
}

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'>;

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends NativeSelectProps {
  label: string;
  options: SelectFieldOption[];
  hint?: string;
  error?: string;
  /** Texto da opção vazia. Omitido quando o campo já tem valor padrão. */
  placeholder?: string;
}

/** Campo de seleção única. */
export function SelectField({
  label,
  options,
  hint,
  error,
  placeholder,
  ...rest
}: SelectFieldProps): React.JSX.Element {
  return (
    <FieldFrame
      label={label}
      {...(rest.required ? { required: true } : {})}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {({ className, ...fieldProps }) => (
        <select
          {...rest}
          {...fieldProps}
          className={className.replace('form-control', 'form-select')}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}

export interface CheckboxFieldProps extends NativeInputProps {
  label: string;
  hint?: string;
}

/**
 * Caixa de seleção. Não usa a moldura acima porque o rótulo vem depois do
 * controle e a marcação do Tabler é diferente para este caso.
 */
export function CheckboxField({ label, hint, ...rest }: CheckboxFieldProps): React.JSX.Element {
  const id = useId();

  return (
    <div className="mb-3">
      <label className="form-check" htmlFor={id}>
        <input {...rest} id={id} type="checkbox" className="form-check-input" />
        <span className="form-check-label">{label}</span>
      </label>
      {hint ? <small className="form-hint">{hint}</small> : null}
    </div>
  );
}
