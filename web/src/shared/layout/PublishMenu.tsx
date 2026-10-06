'use client';

import { Code2, FolderGit2, MessageCircleQuestion, PenSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { cn } from '@/shared/lib';
import { Kbd, Menu, MenuItem } from '@/shared/ui';

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
              ? 'size-11 rounded-xl bg-primary text-on-primary shadow-raised hover:bg-primary-hover active:scale-95'
              : 'h-9 rounded-lg bg-primary pr-2 pl-3 text-body-sm text-on-primary shadow-[0_1px_2px_rgba(10,10,11,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-primary-hover',
            className,
          )}
        >
          <Plus className={compact ? 'size-6' : 'size-4'} aria-hidden />
          {compact ? (
            <span className="sr-only">Créer</span>
          ) : (
            <>
              <span className="hidden sm:inline">Créer</span>
              <Kbd className="ml-1 hidden border-white/25 bg-white/15 text-on-primary lg:inline-flex">N</Kbd>
            </>
          )}
        </button>
      )}
    >
      {PUBLISH_ITEMS.map((item, index) => {
        const Icon = ICONS[index] ?? PenSquare;
        return (
          <MenuItem key={item.href} href={item.href}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-container-low">
              <Icon className="!text-ink-muted" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{item.label}</span>
              <span className="block text-body-sm text-ink-muted">{item.hint}</span>
            </span>
          </MenuItem>
        );
      })}
    </Menu>
  );
}
