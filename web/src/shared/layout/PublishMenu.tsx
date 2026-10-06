'use client';

import { Code2, FolderGit2, MessageCircleQuestion, PenSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { cn } from '@/shared/lib';
import { Menu, MenuItem } from '@/shared/ui';

import { PUBLISH_ITEMS } from './nav';

const ICONS = [PenSquare, MessageCircleQuestion, Code2, FolderGit2];

/** Bouton « Créer » : choix du type de contenu (raccourci clavier N vers une publication). */
export function PublishMenu({ compact = false, className }: { compact?: boolean; className?: string }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        router.push('/submit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <Menu
      className={cn('w-80', compact && 'top-auto bottom-full mb-3')}
      align={compact ? 'start' : 'end'}
      trigger={(props) => (
        <button
          type="button"
          aria-haspopup="menu"
          {...props}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 font-semibold transition-colors',
            compact
              ? 'size-12 rounded-full bg-primary text-on-primary shadow-raised hover:bg-primary-hover'
              : 'h-10 rounded-full px-3.5 text-ink hover:bg-container',
            className,
          )}
        >
          <Plus className={compact ? 'size-6' : 'size-5'} aria-hidden />
          {compact ? <span className="sr-only">Créer</span> : <span className="hidden sm:inline">Créer</span>}
        </button>
      )}
    >
      {PUBLISH_ITEMS.map((item, index) => {
        const Icon = ICONS[index] ?? PenSquare;
        return (
          <MenuItem key={item.href} href={item.href}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
              <Icon className="!text-primary-ink" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-body-sm text-ink-muted">{item.hint}</span>
            </span>
          </MenuItem>
        );
      })}
    </Menu>
  );
}
