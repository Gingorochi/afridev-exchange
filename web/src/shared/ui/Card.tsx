import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib';

/** Carte blanche sur fond gris chaud : bordure fine, coins de 12 px, ombre très légère. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border border-line bg-card shadow-card', className)} {...props} />;
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
