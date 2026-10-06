'use client';

import {
  EyeOff,
  Flame,
  Keyboard,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

import { useDataSaver } from '@/shared/data-saver';
import { useIsClient } from '@/shared/hooks';
import { cn } from '@/shared/lib';
import { ConnectivityStrip } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { useTheme } from '@/shared/theme';
import {
  Avatar,
  buttonClasses,
  Dialog,
  IconButton,
  Kbd,
  Logo,
  Menu,
  MenuItem,
  MenuSeparator,
  profileColorHex,
  Switch,
} from '@/shared/ui';

import { modifierKeyLabel, openCommandPalette } from './command';
import { isActive, MOBILE_TABS, NAV_ITEMS, type NavItem, navPath } from './nav';
import { PublishMenu } from './PublishMenu';
import { useShellShortcuts, useSidebarCollapsed } from './shortcuts';
import { SideNav } from './SideNav';

export { LOCAL_BUDGET } from './SideNav';

/**
 * Cadre de l'application :
 * - en-tête fixe : logo, recherche instantanée (⌘K / Ctrl+K), « Créer », notifications, thème, compte ;
 * - colonne de gauche : membre, rubriques, hubs et état de la copie locale (repliable avec « [ ») ;
 * - colonne centrale (le fil) et colonne de droite (widgets) fournies par chaque page (TwoColumns) ;
 * - téléphone : menu latéral en tiroir et barre d'onglets en bas, à portée du pouce.
 */
export function AppShell({
  children,
  notifications,
  communities,
  search,
}: {
  children: React.ReactNode;
  /** Cloche et centre de notifications, fournis par features/notifications. */
  notifications?: React.ReactNode;
  /** Hubs du menu latéral (mes hubs, ou les populaires), fournis par features/hubs. */
  communities?: React.ReactNode;
  /** Palette de recherche (⌘K), fournie par features/search. */
  search?: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const pathname = usePathname();
  // Le tiroir se referme de lui-même quand on change de page (il mémorise la page d'ouverture).
  const drawerOpen = drawer === pathname;
  const openHelp = useCallback(() => setHelp(true), []);
  useShellShortcuts({ onToggleSidebar: toggleCollapsed, onHelp: openHelp });

  return (
    <div className="min-h-dvh bg-shell">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Aller au contenu
      </a>
      {/* En-tête et colonne de gauche partagent le même fond : un seul cadre, sans filet entre eux. */}
      <header className="sticky top-0 z-30 bg-shell">
        <TopBar notifications={notifications} onMenu={() => setDrawer(pathname)} onHelp={openHelp} />
        <ConnectivityStrip />
      </header>
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside
          className={cn(
            'scrollbar-none sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-y-auto overscroll-contain pt-2 pb-4 transition-[width] duration-200 lg:block',
            collapsed ? 'w-[4.5rem] px-2' : 'w-64 px-3',
          )}
        >
          <SideNav communities={communities} collapsed={collapsed} onToggle={toggleCollapsed} />
        </aside>
        <div className="relative min-w-0 flex-1 lg:mr-3">
          {/* Coins arrondis de la feuille, gardés visibles sous l'en-tête pendant le défilement. */}
          <div className="pointer-events-none sticky top-16 z-20 h-0" aria-hidden>
            <span className="absolute top-0 left-0 size-6 bg-[radial-gradient(circle_at_100%_100%,transparent_23.5px,var(--shell)_24px)]" />
            <span className="absolute top-0 right-0 size-6 bg-[radial-gradient(circle_at_0%_100%,transparent_23.5px,var(--shell)_24px)]" />
          </div>
          <main
            id="contenu"
            className="min-h-[calc(100dvh-4rem)] rounded-t-3xl bg-surface px-4 pt-6 pb-28 sm:px-6 lg:px-7 lg:pb-12"
          >
            {children}
          </main>
        </div>
      </div>
      {drawerOpen ? <Drawer communities={communities} onClose={() => setDrawer(null)} /> : null}
      <BottomNav />
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      {search}
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
      <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-drawer absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] flex-col rounded-r-3xl bg-shell shadow-raised">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <IconButton label="Fermer le menu" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SideNav communities={communities} showShortcuts={false} />
        </div>
      </div>
    </div>
  );
}

function TopBar({
  notifications,
  onMenu,
  onHelp,
}: {
  notifications?: React.ReactNode;
  onMenu: () => void;
  onHelp: () => void;
}) {
  const { isAuthenticated } = useSession();
  return (
    <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-3 sm:px-4">
      <IconButton label="Ouvrir le menu" onClick={onMenu} className="-ml-1 lg:hidden">
        <MenuIcon className="size-5" aria-hidden />
      </IconButton>
      <Link href="/feed" aria-label="AfriDev Exchange, accueil" className="shrink-0 rounded-lg lg:w-[15rem] lg:pl-1">
        <Logo />
      </Link>
      <div className="flex min-w-0 flex-1 px-2 lg:px-0">
        <SearchTrigger />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Rechercher" onClick={openCommandPalette} className="md:hidden">
          <Search className="size-5" aria-hidden />
        </IconButton>
        {isAuthenticated ? <PublishMenu className="mr-1 hidden sm:inline-flex" /> : null}
        {isAuthenticated ? notifications : null}
        <ThemeToggle className="hidden sm:inline-flex" />
        <span className="mx-1.5 hidden h-6 w-px bg-line sm:block" aria-hidden />
        {isAuthenticated ? (
          <AccountMenu onHelp={onHelp} />
        ) : (
          <Link href="/login" className={buttonClasses({ size: 'sm' })}>
            <LogIn className="size-4" aria-hidden /> Se connecter
          </Link>
        )}
      </div>
    </div>
  );
}

/** Faux champ de recherche : ouvre la palette (recherche instantanée et navigation au clavier). */
function SearchTrigger() {
  const isClient = useIsClient();
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-label="Rechercher (raccourci : Ctrl+K)"
      className="group hidden h-11 w-full max-w-2xl items-center gap-3 rounded-full bg-card pr-3 pl-4.5 text-body-sm text-ink-faint ring-1 ring-line/70 transition-[background-color,box-shadow] hover:shadow-raised hover:ring-line md:flex dark:bg-container"
    >
      <Search className="size-[18px] shrink-0 transition-colors group-hover:text-ink-muted" aria-hidden />
      <span className="flex-1 truncate text-left">Rechercher questions, snippets, projets, membres…</span>
      <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
        <Kbd>{isClient ? modifierKeyLabel() : 'Ctrl'}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemTheme(callback: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

/**
 * Bascule clair / sombre en un clic : le soleil devient lune (et inversement), et le nouveau
 * thème se déploie en cercle depuis le bouton (View Transitions, si le navigateur la connaît).
 */
function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const isClient = useIsClient();
  const systemDark = useSyncExternalStore(subscribeSystemTheme, () => window.matchMedia(DARK_QUERY).matches, () => false);
  const dark = isClient && (theme === 'dark' || (theme === 'system' && systemDark));
  const label = dark ? 'Passer en mode clair' : 'Passer en mode sombre';

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = dark ? 'light' : 'dark';
    const apply = () => {
      // Appliqué tout de suite (sans attendre ThemeSync) pour que la transition capture le bon état.
      document.documentElement.dataset.theme = next;
      flushSync(() => setTheme(next));
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced) {
      apply();
      return;
    }
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    root.dataset.themeTransition = '';
    const transition = document.startViewTransition(apply);
    void transition.ready.then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    );
    void transition.finished.finally(() => delete root.dataset.themeTransition);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'relative size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-ink-muted transition-colors hover:bg-shell-hover hover:text-ink',
        className,
      )}
    >
      <Sun
        className={cn(
          'absolute size-[18px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          dark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          'absolute size-[18px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          dark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0',
        )}
        aria-hidden
      />
    </button>
  );
}

function AccountMenu({ onHelp }: { onHelp: () => void }) {
  const { profile, user, signOut } = useSession();
  const { textOnly, setMode } = useDataSaver();
  const [theme, setTheme] = useTheme();
  const router = useRouter();
  const name = profile?.display_name || profile?.username || '?';
  const accent = profile ? profileColorHex(profile.username, profile.accent_color) : undefined;
  const dark = theme === 'dark';

  return (
    <Menu
      className="w-72"
      trigger={(props) => (
        <button
          type="button"
          aria-label="Mon compte"
          {...props}
          className="rounded-full ring-offset-2 ring-offset-card transition-shadow hover:ring-2 hover:ring-line-strong aria-expanded:ring-2 aria-expanded:ring-primary"
        >
          <Avatar name={name} src={profile?.avatar_url} color={accent} size={34} />
        </button>
      )}
    >
      <Link href="/profile" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-container">
        <Avatar name={name} src={profile?.avatar_url} color={accent} size={42} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{name}</span>
          <span className="block truncate text-body-sm text-ink-muted">@{profile?.username ?? 'moi'}</span>
        </span>
        {profile ? (
          <span className="flex items-center gap-1 text-label-md font-semibold text-primary-ink tabular-nums" title="Karma">
            <Flame className="size-3.5" aria-hidden />
            {new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(profile.karma_score)}
          </span>
        ) : null}
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
      <MenuItem onSelect={onHelp}>
        <Keyboard aria-hidden />
        <span className="flex-1">Raccourcis clavier</span>
        <Kbd>?</Kbd>
      </MenuItem>
      <MenuSeparator />
      <div className="flex items-center justify-between gap-3 rounded-md py-0.5 pl-2.5 text-body-sm text-ink">
        <span className="flex items-center gap-2.5">
          <EyeOff className="size-4 text-ink-muted" aria-hidden /> Mode texte seul
        </span>
        <Switch checked={textOnly} onChange={(on) => setMode(on ? 'on' : 'off')} label="Mode texte seul" />
      </div>
      {/* Sur téléphone, le sélecteur de thème de l'en-tête est masqué : il reste ici. */}
      <div className="flex items-center justify-between gap-3 rounded-md py-0.5 pl-2.5 text-body-sm text-ink sm:hidden">
        <span className="flex items-center gap-2.5">
          {dark ? <Moon className="size-4 text-ink-muted" aria-hidden /> : <Sun className="size-4 text-ink-muted" aria-hidden />}
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

/** Aide « ? » : tous les raccourcis du cadre. */
function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isClient = useIsClient();
  const general: Array<[string[], string]> = [
    [[isClient ? modifierKeyLabel() : 'Ctrl', 'K'], 'Rechercher'],
    [['N'], 'Nouveau post'],
    [['['], 'Replier la colonne de gauche'],
    [['?'], 'Afficher cette aide'],
    [['Échap'], 'Fermer un menu ou un panneau'],
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Raccourcis clavier">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-label-md font-semibold text-ink-faint">Aller à</h3>
          <ul className="space-y-1.5">
            {NAV_ITEMS.filter((item) => item.key).map((item) => (
              <ShortcutRow key={item.href} keys={['G', item.key!.toUpperCase()]} label={item.label} />
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-label-md font-semibold text-ink-faint">Partout</h3>
          <ul className="space-y-1.5">
            {general.map(([keys, label]) => (
              <ShortcutRow key={label} keys={keys} label={label} />
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 text-body-sm text-ink-muted">
      {label}
      <span className="flex items-center gap-0.5">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
    </li>
  );
}

function BottomNav() {
  const { isAuthenticated, profile } = useSession();
  const pathname = navPath(usePathname(), profile?.username);
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-shell/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {MOBILE_TABS.map((item, index) =>
          item ? (
            <li key={item.href} className="flex flex-1">
              <BottomTab item={item} active={isActive(pathname, item.href)} />
            </li>
          ) : (
            <li key={`create-${index}`} className="flex flex-1 items-center justify-center">
              {isAuthenticated ? (
                <PublishMenu compact />
              ) : (
                <Link
                  href="/login"
                  className="flex size-11 items-center justify-center rounded-xl bg-primary text-on-primary shadow-raised"
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

/** Onglet du bas : pastille derrière l'icône active (zone tactile pleine hauteur). */
function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-1 text-label-sm font-medium transition-colors active:scale-95',
        active ? 'text-ink' : 'text-ink-faint',
      )}
    >
      {active ? <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" aria-hidden /> : null}
      <span
        className={cn(
          'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
          active ? 'bg-primary-soft text-primary-ink' : 'bg-transparent',
        )}
      >
        <item.icon className="size-5" aria-hidden />
      </span>
      {item.short}
    </Link>
  );
}
