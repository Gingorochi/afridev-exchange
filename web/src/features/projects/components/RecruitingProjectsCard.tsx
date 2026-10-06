'use client';

import Link from 'next/link';

import { SideCard, Skeleton } from '@/shared/ui';

import { useProjects } from '../api';

/** « Projets qui recrutent » (colonne de droite). */
export function RecruitingProjectsCard() {
  const projects = useProjects({ recruiting: true });
  const items = projects.items.slice(0, 3);
  return (
    <SideCard title="Projets qui recrutent">
      {projects.isPending ? (
        <div className="px-4 pb-4">
          <Skeleton className="h-20" />
        </div>
      ) : items.length ? (
        <ul>
          {items.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-container">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary-soft text-body-md font-bold text-on-secondary-soft">
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{project.name}</span>
                  <span className="block truncate text-body-sm text-ink-muted">
                    {project.open_issue_count
                      ? `${project.open_issue_count} issue${project.open_issue_count > 1 ? 's' : ''} pour débuter`
                      : project.tags.slice(0, 3).join(' · ')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-3 text-body-sm text-ink-muted">Aucun projet ne recrute pour l&apos;instant.</p>
      )}
      <Link href="/projects" className="block border-t border-line px-4 py-3 text-body-sm font-semibold text-primary-ink hover:bg-container">
        Voir tous les projets
      </Link>
    </SideCard>
  );
}
