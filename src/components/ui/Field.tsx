import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { get, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** i18n key + interpolation params for an error (params come from the caller, e.g. team size range). */
function useFieldError(name: string, params?: Record<string, string>) {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext();
  const key = (get(errors, name) as { message?: string } | undefined)?.message;
  return key ? t(key, params) : undefined;
}

const fieldId =(name: string) => `f-${name.replace(/\./g, '-')}`;

interface Wrap {
  name: string;
  label: string;
  hint?: string;
  errorParams?: Record<string, string>;
  className?: string;
}

function Shell({ name, label, hint, error, className, children }: Wrap & { error?: string; children: ReactNode }) {
  const id = fieldId(name);
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(name: string, error?: string, hint?: string) {
  const id = fieldId(name);
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField<T extends FieldValues>({
  name,
  label,
  hint,
  errorParams,
  className,
  ...input
}: Wrap & { name: Path<T> } & InputHTMLAttributes<HTMLInputElement>) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name, errorParams);
  return (
    <Shell name={name} label={label} hint={hint} error={error} className={className}>
      <input
        id={fieldId(name)}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        {...input}
        {...register(name)}
      />
    </Shell>
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  hint,
  errorParams,
  className,
  children,
  ...select
}: Wrap & { name: Path<T>; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name, errorParams);
  return (
    <Shell name={name} label={label} hint={hint} error={error} className={className}>
      <select
        id={fieldId(name)}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        {...select}
        {...register(name)}
      >
        {children}
      </select>
    </Shell>
  );
}

export function CheckboxField<T extends FieldValues>({ name, label }: { name: Path<T>; label: string }) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  const id = fieldId(name);
  return (
    <div>
      <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="check"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...register(name)}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
