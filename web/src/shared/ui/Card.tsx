import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib';

/** Carte encadrée (formulaires, blocs de contenu) : bordure fine, coins de 16 px. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-line bg-card', className)} {...props} />;
}

/** Carte de la colonne de droite, façon Reddit : fond gris léger, sans bordure, titre discret. */
export function SideCard({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl bg-container-low', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="text-label-md font-bold tracking-wide text-ink-muted uppercase">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-headline-md text-ink">{title}</h2>
          {subtitle ? <p className="text-body-sm text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Titre de section discret (« COMMUNAUTÉS », « STACK TECHNIQUE »). */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('text-label-md font-semibold tracking-wide text-ink-faint uppercase', className)} {...props} />
  );
}
