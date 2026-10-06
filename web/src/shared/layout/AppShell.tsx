'use client';

import { EyeOff, LogIn, LogOut, Menu as MenuIcon, Moon, Search, Settings, ShieldCheck, Sun, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useDataSaver } from '@/shared/data-saver';
import { cn, formatBytes } from '@/shared/lib';
import { ConnectivityStrip, useStorageEstimate } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { useTheme } from '@/shared/theme';
import { Avatar, buttonClasses, Eyebrow, IconButton, Logo, Menu, MenuItem, MenuSeparator, Switch } from '@/shared/ui';

import { isActive, NAV_ITEMS } from './nav';
import { PublishMenu } from './PublishMenu';

/** Budget indicatif de la copie locale (cache, brouillons, coffre) affiché dans la jauge. */
export const LOCAL_BUDGET = 50 * 1024 * 1024;

/**
 * Cadre de l'application, inspiré de Reddit et LinkedIn :
 * - en-tête fixe : logo, recherche centrale, « Créer », notifications, menu du compte ;
 * - colonne de gauche : navigation et communautés (tags actifs) ;
 * - contenu au centre, colonne de droite fournie par chaque page (TwoColumns) ;
 * - téléphone : menu latéral en tiroir et barre d'onglets en bas, à portée du pouce.
 */
export function AppShell({
  children,
  notifications,
  communities,
}: {
  children: React.ReactNode;
  /** Cloche de notifications, fournie par features/notifications. */
  notifications?: React.ReactNode;
  /** Liste des communautés du menu latéral, fournie par features/feed. */
  communities?: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState<string | null>(null);
  const pathname = usePathname();
  // Le tiroir se referme de lui-même quand on change de page (il mémorise la page d'ouverture).
  const drawerOpen = drawer === pathname;

  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
        <TopBar notifications={notifications} onMenu={() => setDrawer(pathname)} />
        <ConnectivityStrip />
      </header>
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line px-3 py-4 lg:block">
          <SideNav communities={communities} />
        </aside>
        <main id="contenu" className="min-w-0 flex-1 px-3 pt-4 pb-28 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
      {drawerOpen ? <Drawer communities={communities} onClose={() => setDrawer(null)} /> : null}
      <BottomNav />
    </div>
  );
}

function Drawer({ communities, onClose }: { communities?: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal aria-label="Menu">
      <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] flex-col bg-card shadow-raised">
        <div className="flex h-14 items-center justify-between border-b border-line px-3">
          <Logo />
          <IconButton label="Fermer le menu" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SideNav communities={communities} />
        </div>
      </div>
    </div>
  );
}

function TopBar({ notifications, onMenu }: { notifications?: React.ReactNode; onMenu: () => void }) {
  const { isAuthenticated } = useSession();
  return (
    <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-2 sm:px-4">
      <IconButton label="Ouvrir le menu" onClick={onMenu} className="lg:hidden">
        <MenuIcon className="size-5" aria-hidden />
      </IconButton>
      <Link href="/feed" aria-label="AfriDev Exchange — accueil" className="shrink-0 lg:w-56">
        <Logo />
      </Link>
      <div className="flex min-w-0 flex-1 justify-center">
        <Suspense fallback={<div className="h-10 w-full max-w-xl" />}>
          <SearchBox />
        </Suspense>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/search"
          aria-label="Rechercher"
          className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-container md:hidden"
        >
          <Search className="size-5" aria-hidden />
        </Link>
        {isAuthenticated ? (
          <>
            <PublishMenu className="hidden sm:inline-flex" />
            {notifications}
            <AccountMenu />
          </>
        ) : (
          <Link href="/login" className={buttonClasses({ size: 'sm', className: 'h-9' })}>
            <LogIn className="size-4" aria-hidden /> Se connecter
          </Link>
        )}
      </div>
    </div>
  );
}

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  return (
    <form
      role="search"
      className="relative hidden w-full max-w-xl md:block"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher sur AfriDev"
        aria-label="Rechercher"
        className="h-10 w-full rounded-full border border-transparent bg-container pr-4 pl-11 text-body-md text-ink transition-colors placeholder:text-ink-faint hover:bg-container-high focus:border-primary focus:bg-card focus:outline-none"
      />
    </form>
  );
}

function AccountMenu() {
  const { profile, user, signOut } = useSession();
  const { textOnly, setMode } = useDataSaver();
  const [theme, setTheme] = useTheme();
  const router = useRouter();
  const name = profile?.display_name || profile?.username || '?';
  const dark = theme === 'dark';

  return (
    <Menu
      className="w-72"
      trigger={(props) => (
        <button
          type="button"
          aria-label="Mon compte"
          {...props}
          className="ml-1 rounded-full ring-offset-2 ring-offset-card hover:ring-2 hover:ring-line-strong"
        >
          <Avatar name={name} src={profile?.avatar_url} size={34} />
        </button>
      )}
    >
      <Link href="/profile" className="flex items-center gap-3 rounded-lg p-3 hover:bg-container">
        <Avatar name={name} src={profile?.avatar_url} size={44} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{name}</span>
          <span className="block truncate text-body-sm text-ink-muted">Voir mon profil</span>
        </span>
      </Link>
      <MenuSeparator />
      <MenuItem href="/profile">
        <UserRound aria-hidden /> Mon profil
      </MenuItem>
      <MenuItem href="/settings">
        <Settings aria-hidden /> Réglages
      </MenuItem>
      {user?.is_staff ? (
        <MenuItem href="/admin">
          <ShieldCheck aria-hidden /> Back-office
        </MenuItem>
      ) : null}
      <MenuSeparator />
      <div className="flex items-center justify-between gap-3 rounded-lg pl-3 text-body-md text-ink">
        <span className="flex items-center gap-3">
          <EyeOff className="size-[18px] text-ink-muted" aria-hidden /> Mode texte seul
        </span>
        <Switch checked={textOnly} onChange={(on) => setMode(on ? 'on' : 'off')} label="Mode texte seul" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg pl-3 text-body-md text-ink">
        <span className="flex items-center gap-3">
          {dark ? (
            <Moon className="size-[18px] text-ink-muted" aria-hidden />
          ) : (
            <Sun className="size-[18px] text-ink-muted" aria-hidden />
          )}
          Mode sombre
        </span>
        <Switch checked={dark} onChange={(on) => setTheme(on ? 'dark' : 'light')} label="Mode sombre" />
      </div>
      <MenuSeparator />
      <MenuItem
        onSelect={() => {
          signOut();
          router.replace('/');
        }}
      >
        <LogOut aria-hidden /> Se déconnecter
      </MenuItem>
    </Menu>
  );
}

const NAV_LINK = 'flex h-10 items-center gap-3 rounded-lg px-3 text-body-md transition-colors';

function SideNav({ communities }: { communities?: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const storage = useStorageEstimate(pathname.length);
  return (
    <nav aria-label="Navigation principale" className="flex min-h-full flex-col gap-4">
      <ul className="space-y-0.5">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  NAV_LINK,
                  active ? 'bg-container-high font-semibold text-ink' : 'text-ink-muted hover:bg-container hover:text-ink',
                )}
              >
                <item.icon className={cn('size-5', active && 'text-primary')} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {communities ? (
        <div className="border-t border-line pt-4">
          <Eyebrow className="mb-1 px-3">Communautés</Eyebrow>
          {communities}
        </div>
      ) : null}
      <div className="border-t border-line pt-4">
        <Eyebrow className="mb-1 px-3">Ressources</Eyebrow>
        <ul className="space-y-0.5">
          <li>
            <Link href="/settings" className={cn(NAV_LINK, 'text-ink-muted hover:bg-container hover:text-ink')}>
              <Settings className="size-5" aria-hidden /> Réglages
            </Link>
          </li>
          {user?.is_staff ? (
            <li>
              <Link href="/admin" className={cn(NAV_LINK, 'text-ink-muted hover:bg-container hover:text-ink')}>
                <ShieldCheck className="size-5" aria-hidden /> Back-office
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
      <div className="mt-auto space-y-3 px-3 pt-4">
        {storage ? (
          <div className="space-y-1.5" title="Copie locale : fil, brouillons et coffre disponibles hors ligne">
            <div className="flex justify-between text-label-md text-ink-faint">
              <span>Copie hors ligne</span>
              <span className="tabular-nums">{formatBytes(storage.usage)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-container-high">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${Math.min(100, Math.max(2, (storage.usage / LOCAL_BUDGET) * 100))}%` }}
              />
            </div>
          </div>
        ) : null}
        <p className="text-label-md text-ink-faint">AfriDev Exchange · open source · pensé pour les réseaux d&apos;Afrique</p>
      </div>
    </nav>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useSession();
  const [home, help, snippets, , profile] = NAV_ITEMS;
  const items = [home, help, null, snippets, profile];
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-center justify-around px-1">
        {items.map((item, index) =>
          item ? (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-label-sm font-medium',
                  isActive(pathname, item.href) ? 'text-primary' : 'text-ink-muted',
                )}
              >
                <item.icon className="size-[22px]" aria-hidden />
                {item.short}
              </Link>
            </li>
          ) : (
            <li key={`create-${index}`} className="flex flex-1 justify-center">
              {isAuthenticated ? (
                <PublishMenu compact />
              ) : (
                <Link
                  href="/login"
                  className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-raised"
                  aria-label="Se connecter"
                >
                  <LogIn className="size-5" aria-hidden />
                </Link>
              )}
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
