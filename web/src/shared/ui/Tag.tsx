import Link from 'next/link';

import { cn } from '@/shared/lib';

/** Tag technique (#python), en capsule. */
export function Tag({
  children,
  href,
  hash = true,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  hash?: boolean;
  className?: string;
}) {
  const classes = cn(
    'inline-flex items-center rounded-full bg-container px-2.5 py-0.5 text-label-md font-medium text-ink-muted',
    href && 'transition-colors hover:bg-primary-soft hover:text-primary-ink',
    className,
  );
  const content = (
    <>
      {hash ? '#' : null}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}

const COMMUNITY_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-[#7c3aed]', 'bg-[#0e7490]', 'bg-[#be185d]'];

export function communityColor(tag: string) {
  let hash = 0;
  for (const char of tag) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length]!;
}

/** Icône ronde d'une communauté (initiale sur couleur stable). */
export function CommunityIcon({ tag, size = 24, className }: { tag: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white uppercase',
        communityColor(tag),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.45) }}
    >
      {tag.slice(0, 1)}
    </span>
  );
}

/** Communauté « d/python » : un tag vu comme un espace de discussion. */
export function CommunityLink({ tag, className }: { tag: string; className?: string }) {
  return (
    <Link
      href={`/feed?tag=${encodeURIComponent(tag)}`}
      className={cn('inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink hover:underline', className)}
    >
      <CommunityIcon tag={tag} size={20} />d/{tag}
    </Link>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'offline';

const TONES: Record<Tone, string> = {
  neutral: 'bg-container text-ink-muted',
  primary: 'bg-primary-soft text-primary-ink',
  success: 'bg-secondary-soft text-on-secondary-soft',
  warning: 'bg-tertiary-soft text-on-tertiary-soft',
  danger: 'bg-danger-soft text-on-danger-soft',
  offline: 'bg-container-high text-offline',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-ink-faint',
  primary: 'bg-primary',
  success: 'bg-secondary',
  warning: 'bg-tertiary',
  danger: 'bg-danger',
  offline: 'bg-offline',
};

/** Badge d'état en capsule (« Résolue », « En attente de réseau »). */
export function StatusBadge({
  tone = 'neutral',
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-md font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cn('size-1.5 rounded-full', DOTS[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Pastille numérique (notifications non lues). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold text-on-primary',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
