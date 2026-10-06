import Link from 'next/link';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib';

/**
 * - primary : action principale (terracotta) ;
 * - secondary : action positive (vert) ;
 * - ghost : action secondaire, contour fin ;
 * - plain : action discrète sans contour (barres d'actions des posts) ;
 * - subtle : fond gris doux ;
 * - danger, link.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'plain' | 'subtle' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-secondary text-white hover:bg-secondary-hover',
  ghost: 'border border-line-strong bg-card text-ink hover:border-ink-faint hover:bg-container-low',
  plain: 'bg-transparent text-ink-muted hover:bg-container hover:text-ink',
  subtle: 'bg-container text-ink hover:bg-container-high',
  danger: 'bg-danger text-white hover:opacity-90',
  link: 'px-0 text-primary-ink underline-offset-4 hover:underline',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-body-sm',
  md: 'h-10 gap-2 px-4 text-body-md',
  lg: 'h-12 gap-2 px-6 text-body-lg',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    variant !== 'link' && SIZES[size],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Bouton rond à icône seule (en-tête, menus) : libellé obligatoire pour les lecteurs d'écran. */
export function IconButton({
  label,
  className,
  children,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-container hover:text-ink disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}

/** Action en capsule des barres de posts (voter, commenter, partager, traduire). */
export const pillAction =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-body-sm font-semibold text-ink-muted transition-colors hover:bg-container hover:text-ink disabled:pointer-events-none';