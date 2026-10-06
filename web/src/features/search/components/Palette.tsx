'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Code2, CornerDownLeft, FolderGit2, type LucideIcon, MessagesSquare, Moon, Plus, Search, Sun, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { api, unwrap } from '@/shared/api';
import { useDebounced } from '@/shared/hooks';
import { NAV_ITEMS, PUBLISH_ITEMS } from '@/shared/layout';
import { cn } from '@/shared/lib';
import { useSession } from '@/shared/session';
import { useTheme } from '@/shared/theme';
import { Kbd, Spinner } from '@/shared/ui';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

const HIT_ICONS = { snippet: Code2, question: MessagesSquare, project: FolderGit2 };
const HIT_LABELS = { snippet: 'Snippet', question: 'Question', project: 'Projet' };

/** Contenu de la palette, chargé à la première ouverture (hors du JavaScript initial des pages). */
export default function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const [theme, setTheme] = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = useDebounced(query.trim(), 250);

  const results = useQuery({
    queryKey: ['search', 'palette', q],
    queryFn: () => unwrap(api.GET('/api/knowledge/search/', { params: { query: { q, mode: 'text' } } })),
    enabled: q.length > 1,
    meta: { persist: false },
    staleTime: 60_000,
  });

  // Fond figé et focus dans le champ tant que la palette est ouverte ; focus rendu à la fermeture.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const needle = query.trim().toLowerCase();
    const matches = (text: string) => !needle || text.toLowerCase().includes(needle);
    const items: Command[] = [];

    if (needle.length > 1) {
      items.push({
        id: 'search-all',
        group: 'Recherche',
        label: `Rechercher « ${query.trim()} » partout`,
        icon: Search,
        run: go(`/search?q=${encodeURIComponent(query.trim())}`),
      });
      for (const hit of (results.data ?? []).slice(0, 6)) {
        items.push({
          id: `${hit.source_type}-${hit.source_id}`,
          group: 'Résultats',
          label: hit.title,
          hint: HIT_LABELS[hit.source_type],
          icon: HIT_ICONS[hit.source_type],
          run: go(hit.url),
        });
      }
    }
    for (const item of NAV_ITEMS) {
      if (!item.soon && matches(item.label)) {
        items.push({ id: `nav-${item.href}`, group: 'Aller à', label: item.label, icon: item.icon, run: go(item.href) });
      }
    }
    if (isAuthenticated) {
      for (const item of PUBLISH_ITEMS) {
        if (matches(`${item.label} créer publier`)) {
          items.push({ id: `new-${item.href}`, group: 'Créer', label: `Créer ${item.label.toLowerCase()}`, hint: item.hint, icon: Plus, run: go(item.href) });
        }
      }
    }
    const dark = theme === 'dark';
    if (matches('thème sombre clair mode')) {
      items.push({
        id: 'theme',
        group: 'Préférences',
        label: dark ? 'Passer en thème clair' : 'Passer en thème sombre',
        icon: dark ? Sun : Moon,
        run: () => {
          setTheme(dark ? 'light' : 'dark');
          onClose();
        },
      });
    }
    return items;
  }, [query, results.data, isAuthenticated, theme, setTheme, router, onClose]);

  const current = Math.min(active, Math.max(commands.length - 1, 0));

  // Garde l'élément actif visible pendant la navigation au clavier.
  useEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current + 1) % Math.max(commands.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current - 1 + commands.length) % Math.max(commands.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commands[current]?.run();
    }
  }

  const searching = q.length > 1 && results.isFetching;
  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]" role="presentation" onKeyDown={onKeyDown}>
      <button type="button" aria-label="Fermer la recherche" tabIndex={-1} className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />
      <div role="dialog" aria-modal aria-label="Recherche" className="animate-pop relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card shadow-raised">
        <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
          {searching ? <Spinner className="size-4 text-ink-faint" /> : <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />}
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Rechercher ou aller à…"
            aria-label="Rechercher"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={commands[current] ? `${listId}-${commands[current].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent text-body-md text-ink outline-none placeholder:text-ink-faint"
          />
          <Kbd>Échap</Kbd>
        </div>
        <div ref={list} id={listId} role="listbox" aria-label="Suggestions" className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5">
          {commands.map((command, index) => {
            const header = command.group !== lastGroup ? command.group : null;
            lastGroup = command.group;
            const selected = index === current;
            return (
              <div key={command.id}>
                {header ? <p className="px-2.5 pt-2 pb-1 text-label-md font-medium text-ink-faint">{header}</p> : null}
                <div
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={selected}
                  data-active={selected}
                  onMouseMove={() => index !== current && setActive(index)}
                  onClick={command.run}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-body-sm',
                    selected ? 'bg-container text-ink' : 'text-ink-muted',
                  )}
                >
                  <command.icon className={cn('size-4 shrink-0', selected ? 'text-ink' : 'text-ink-faint')} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.hint ? <span className="hidden shrink-0 truncate text-label-md text-ink-faint sm:inline">{command.hint}</span> : null}
                  {selected ? <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden /> : null}
                </div>
              </div>
            );
          })}
          {q.length > 1 && results.isError ? (
            <p className="flex items-center gap-2 px-2.5 py-3 text-body-sm text-ink-muted">
              <WifiOff className="size-4" aria-hidden /> La recherche dans les contenus nécessite une connexion.
            </p>
          ) : null}
          {!commands.length ? <p className="px-2.5 py-6 text-center text-body-sm text-ink-muted">Aucun résultat.</p> : null}
        </div>
        <div className="hidden items-center gap-4 border-t border-line bg-container-low px-4 py-2 text-label-md text-ink-faint sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft className="size-3" aria-hidden />
            </Kbd>
            ouvrir
          </span>
          <span className="ml-auto">Recherche tolérante aux fautes</span>
        </div>
      </div>
    </div>
  );
}
