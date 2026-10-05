import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib';

const FIELD =
  'w-full rounded-lg border border-line bg-card px-3.5 text-body-md text-ink transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none disabled:opacity-60';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(FIELD, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(FIELD, 'min-h-28 py-2.5 leading-6', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(FIELD, 'h-11 pr-8', className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  required,
  counter,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  counter?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={htmlFor} className="text-body-sm font-semibold text-ink">
          {label}
          {required ? <span className="ml-1 text-primary-ink">*</span> : null}
        </label>
        {counter ? <span className="text-label-md text-ink-faint tabular-nums">{counter}</span> : null}
      </div>
      {children}
      {hint && !error ? <p className="text-body-sm text-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-body-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Interrupteur accessible (rôle switch). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex h-10 w-12 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-secondary' : 'bg-container-highest')}>
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

/** Choix exclusif en capsules (« 7 jours · 30 jours », « Écrire · Aperçu »). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; count?: number }>;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('inline-flex flex-wrap gap-1 rounded-full bg-container p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-body-sm font-semibold transition-colors',
              active ? 'bg-card text-ink shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className="text-label-md text-ink-faint tabular-nums">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Onglets soulignés (tri du fil, sections d'un profil). */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              '-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-body-sm font-semibold transition-colors',
              active ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined ? (
              <span className="rounded-full bg-container px-1.5 text-label-md text-ink-muted tabular-nums">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Puces filtrantes en capsules, défilant horizontalement. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode; icon?: React.ReactNode }>;
}) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-body-sm font-semibold transition-colors',
              active ? 'bg-ink text-card' : 'bg-card text-ink-muted ring-1 ring-line hover:text-ink hover:ring-line-strong',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
