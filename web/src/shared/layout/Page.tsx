import { cn } from '@/shared/lib';

/** En-tête de page : sur-titre (fil d'Ariane), titre, description et actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <p className="text-body-sm font-semibold text-primary-ink">{eyebrow}</p> : null}
        <h1 className="text-headline-xl text-ink">{title}</h1>
        {description ? <p className="max-w-2xl text-body-md text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/**
 * Colonne centrale + colonne de droite (communautés, projets, aide) :
 * côte à côte sur grand écran, la colonne de droite passe dessous sur téléphone.
 */
export function TwoColumns({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  if (!aside) return <div className={cn('mx-auto max-w-3xl', className)}>{children}</div>;
  return (
    <div className={cn('mx-auto grid max-w-[1120px] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]', className)}>
      <div className="min-w-0 space-y-4">{children}</div>
      <aside className="hidden space-y-4 lg:block xl:sticky xl:top-[4.5rem] xl:max-h-[calc(100dvh-5.5rem)] xl:self-start xl:overflow-y-auto xl:pb-4">
        {aside}
      </aside>
    </div>
  );
}
