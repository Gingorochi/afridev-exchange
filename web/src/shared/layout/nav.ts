import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  Compass,
  FolderGit2,
  Home,
  type LucideIcon,
  MessagesSquare,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { cn } from '@/shared/lib';

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Raccourci clavier « G puis touche » (façon GitHub / Linear). */
  key?: string;
  /** Rubrique annoncée mais pas encore livrée : affichée grisée avec « Bientôt ». */
  soon?: boolean;
}

/** Raccourcis de la colonne de gauche, dans l'ordre d'affichage. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/feed', label: 'Accueil', short: 'Accueil', icon: Home, key: 'h' },
  { href: '/search', label: 'Explorer', short: 'Explorer', icon: Compass, key: 'e' },
  { href: '/hubs', label: 'Hubs', short: 'Hubs', icon: UsersRound, key: 'u' },
  { href: '/questions', label: 'Q&A', short: 'Q&A', icon: MessagesSquare, key: 'q' },
  { href: '/snippets', label: 'Snippets', short: 'Snippets', icon: Code2, key: 's' },
  { href: '/projects', label: 'Projets', short: 'Projets', icon: FolderGit2, key: 'p' },
  { href: '/jobs', label: 'Job Board', short: 'Jobs', icon: BriefcaseBusiness, key: 'j' },
  { href: '/events', label: 'Événements', short: 'Événements', icon: CalendarDays, key: 'v' },
  { href: '/bookmarks', label: 'Marque-pages', short: 'Favoris', icon: Bookmark, key: 'b' },
  { href: '/profile', label: 'Profil', short: 'Profil', icon: UserRound, key: 'm' },
];

/** Regroupement de la colonne de gauche : communauté, savoir partagé, carrière, espace perso. */
export const NAV_SECTIONS: Array<{ title: string | null; hrefs: string[] }> = [
  { title: null, hrefs: ['/feed', '/search', '/hubs'] },
  { title: 'Savoir', hrefs: ['/questions', '/snippets', '/projects'] },
  { title: 'Carrière', hrefs: ['/jobs', '/events'] },
  { title: 'Mon espace', hrefs: ['/bookmarks', '/profile'] },
];

const byHref = (href: string) => NAV_ITEMS.find((item) => item.href === href)!;

/** Barre d'onglets du téléphone : 4 rubriques + « Créer » au centre, à portée du pouce. */
export const MOBILE_TABS: Array<NavItem | null> = [
  byHref('/feed'),
  byHref('/questions'),
  null,
  byHref('/snippets'),
  byHref('/profile'),
];

export const PUBLISH_ITEMS = [
  { href: '/submit', label: 'Un post', hint: 'Astuce, code, sondage, image, vidéo' },
  { href: '/questions/new', label: 'Une question', hint: "Première réponse de l'IA en quelques secondes" },
  { href: '/snippets/new', label: 'Un snippet', hint: 'Dans votre coffre, disponible hors ligne' },
  { href: '/projects/new', label: 'Un projet open source', hint: 'Trouvez des contributeurs' },
];

/** Lien de la colonne de gauche (rubriques, hubs) : pilule teintée pour la page en cours. */
export function navItemClasses(active: boolean) {
  return cn(
    'group relative flex h-9 items-center gap-3 rounded-full text-[0.875rem] transition-colors',
    active
      ? 'bg-primary-soft font-semibold text-primary-ink'
      : 'font-medium text-ink-muted hover:bg-shell-hover hover:text-ink',
  );
}

/** Ma page publique (/u/<moi>) compte comme la rubrique « Profil » de la navigation. */
export function navPath(pathname: string, username?: string) {
  return username && pathname.toLowerCase() === `/u/${username.toLowerCase()}` ? '/profile' : pathname;
}

export function isActive(pathname: string, href: string) {
  const base = href.split('?')[0] ?? href;
  return pathname === base || pathname.startsWith(`${base}/`);
}
