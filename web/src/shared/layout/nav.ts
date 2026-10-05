import { Code2, FolderGit2, Home, type LucideIcon, MessagesSquare, UserRound } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/feed', label: 'Accueil', short: 'Accueil', icon: Home },
  { href: '/questions', label: 'Entraide & IA', short: 'Entraide', icon: MessagesSquare },
  { href: '/snippets', label: 'Mon coffre de snippets', short: 'Snippets', icon: Code2 },
  { href: '/projects', label: 'Projets open source', short: 'Projets', icon: FolderGit2 },
  { href: '/profile', label: 'Mon profil', short: 'Profil', icon: UserRound },
];

export const PUBLISH_ITEMS = [
  { href: '/feed?compose=1', label: 'Une publication', hint: 'Astuce, code, sondage, image, vidéo' },
  { href: '/questions/new', label: 'Une question', hint: "Première réponse de l'IA en quelques secondes" },
  { href: '/snippets/new', label: 'Un snippet', hint: 'Dans votre coffre, disponible hors ligne' },
  { href: '/projects/new', label: 'Un projet open source', hint: 'Trouvez des contributeurs' },
];

export function isActive(pathname: string, href: string) {
  const base = href.split('?')[0] ?? href;
  return pathname === base || pathname.startsWith(`${base}/`);
}
