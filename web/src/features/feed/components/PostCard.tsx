'use client';

import { ArrowBigUp, BarChart3, CheckCircle2, Circle, Clapperboard, Ellipsis, Link2, MessageSquare, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ReportButton } from '@/features/moderation';
import { TranslateButton } from '@/features/translation';
import { cn, formatCount } from '@/shared/lib';
import { type MediaAsset, MediaView } from '@/shared/media';
import { useSession } from '@/shared/session';
import { Avatar, CommunityIcon, Markdown, Menu, MenuItem, pillAction, Tag, TimeAgo, useToast } from '@/shared/ui';

import { type Post, useDeletePost, useLike, useVote } from '../api';

/**
 * Publication façon Reddit : communauté · auteur · date, contenu, puis barre d'actions en
 * capsules. « Soutenir » est le j'aime du backend (pas de vote négatif sur les posts).
 */
export function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const { user, isAuthenticated } = useSession();
  const router = useRouter();
  const like = useLike(post);
  const remove = useDeletePost();
  const toast = useToast();
  const name = post.author?.display_name || post.author?.username || 'Membre';
  const mine = Boolean(user && post.author?.id === user.id);
  const liked = Boolean(post.viewer?.liked);
  const [community, ...otherTags] = post.tags;
  const href = `/feed/${post.id}`;

  async function share() {
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) await navigator.share({ url, title: 'AfriDev Exchange' });
      else {
        await navigator.clipboard.writeText(url);
        toast('Lien copié.');
      }
    } catch {
      // partage annulé
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      onClick={detail ? undefined : (event) => openOnCardClick(event, () => router.push(href))}
      className={cn(
        'rounded-xl border border-line bg-card shadow-card transition-colors',
        !detail && 'cursor-pointer hover:border-line-strong',
      )}
    >
      <div className="space-y-3 px-4 pt-3 pb-2 sm:px-5">
        <header className="flex items-center gap-2 text-body-sm">
          {community ? (
            <Link href={`/feed?tag=${encodeURIComponent(community)}`} className="flex shrink-0 items-center gap-1.5 font-bold text-ink hover:underline">
              <CommunityIcon tag={community} size={22} />
              d/{community}
            </Link>
          ) : null}
          {community ? <span className="text-ink-faint" aria-hidden>•</span> : null}
          {post.author ? (
            <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-1.5 text-ink-muted hover:text-ink">
              <Avatar name={name} src={post.author.avatar_url} size={community ? 18 : 22} />
              <span className={cn('truncate', community ? 'font-medium' : 'font-bold text-ink')}>{name}</span>
            </Link>
          ) : (
            <span className="text-ink-muted">{name}</span>
          )}
          <span className="text-ink-faint" aria-hidden>•</span>
          <TimeAgo date={post.created_at} className="shrink-0 text-ink-faint" />
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {post.kind === 'poll' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-md font-semibold text-on-tertiary-soft">
                <BarChart3 className="size-3.5" aria-hidden /> Sondage
              </span>
            ) : null}
            {post.kind === 'short' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-label-md font-semibold text-primary-ink">
                <Clapperboard className="size-3.5" aria-hidden /> Vidéo
              </span>
            ) : null}
            {mine ? (
              <Menu
                className="w-52"
                trigger={(props) => (
                  <button type="button" aria-label="Plus d'actions" {...props} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-container">
                    <Ellipsis className="size-5" aria-hidden />
                  </button>
                )}
              >
                <MenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}${href}`).then(() => toast('Lien copié.'))}>
                  <Link2 aria-hidden /> Copier le lien
                </MenuItem>
                <MenuItem
                  danger
                  onSelect={() => {
                    if (!window.confirm('Supprimer ce post ?')) return;
                    remove.mutate(post.id, { onSuccess: () => detail && router.push('/feed') });
                  }}
                >
                  <Trash2 aria-hidden /> Supprimer
                </MenuItem>
              </Menu>
            ) : null}
          </span>
        </header>

        {post.body ? (
          post.kind === 'poll' ? (
            <h3 className="text-headline-md text-ink">{post.body}</h3>
          ) : detail ? (
            <Markdown source={post.body} />
          ) : (
            <div className="relative max-h-[22rem] overflow-hidden">
              <Markdown source={post.body} />
              {post.body.length > 700 ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
              ) : null}
            </div>
          )
        ) : null}

        {post.kind === 'poll' ? <Poll post={post} canVote={isAuthenticated} /> : null}
        {/* Le schéma décrit `media` comme JSON libre : c'est la forme de /api/media/<id>/. */}
        {post.media ? (
          <div className="overflow-hidden rounded-xl">
            <MediaView media={post.media as MediaAsset} />
          </div>
        ) : null}

        {otherTags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {otherTags.map((tag) => (
              <Tag key={tag} href={`/feed?tag=${encodeURIComponent(tag)}`}>
                {tag}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 sm:px-3.5">
        <button
          type="button"
          aria-pressed={liked}
          aria-label={liked ? 'Retirer mon soutien' : 'Soutenir'}
          title={isAuthenticated ? undefined : 'Connectez-vous pour soutenir'}
          disabled={!isAuthenticated || like.isPending}
          onClick={() => like.mutate(!liked)}
          className={cn(
            pillAction,
            'bg-container',
            liked ? 'bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary' : 'hover:bg-primary-soft hover:text-primary-ink',
          )}
        >
          <ArrowBigUp className={cn('size-5', liked && 'fill-current')} aria-hidden />
          <span className="tabular-nums">{formatCount(post.like_count)}</span>
        </button>
        {detail ? (
          <span className={cn(pillAction, 'hover:bg-transparent')}>
            <MessageSquare className="size-4" aria-hidden /> {formatCount(post.comment_count)}
          </span>
        ) : (
          <Link href={href} className={pillAction}>
            <MessageSquare className="size-4" aria-hidden /> {formatCount(post.comment_count)}
            <span className="sr-only">commentaires</span>
          </Link>
        )}
        <button type="button" onClick={share} className={pillAction}>
          <Share2 className="size-4" aria-hidden /> <span className="hidden sm:inline">Partager</span>
        </button>
        {post.body && post.kind !== 'poll' ? <TranslateButton text={post.body} /> : null}
        {!mine ? (
          <span className="ml-auto">
            <ReportButton targetType="post" targetId={post.id} compact />
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/** Un clic dans la carte ouvre la discussion, sauf sur un élément interactif, du code ou une sélection. */
function openOnCardClick(event: React.MouseEvent, open: () => void) {
  const target = event.target as HTMLElement;
  if (target.closest('a, button, input, textarea, video, pre, [role="menu"], dialog')) return;
  if (window.getSelection()?.toString()) return;
  open();
}

function Poll({ post, canVote }: { post: Post; canVote: boolean }) {
  const vote = useVote(post);
  const results = post.poll_results ?? post.poll_options.map(() => 0);
  const total = results.reduce((sum, value) => sum + value, 0);
  const chosen = post.viewer?.vote ?? null;
  const leader = Math.max(...results);
  const showResults = chosen !== null || !canVote;

  return (
    <div className="space-y-2">
      {post.poll_options.map((option, index) => {
        const count = results[index] ?? 0;
        const percent = total ? Math.round((count / total) * 100) : 0;
        const selected = chosen === index;
        return (
          <button
            key={index}
            type="button"
            disabled={!canVote || vote.isPending}
            onClick={() => vote.mutate(index)}
            aria-pressed={selected}
            className={cn(
              'relative w-full overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-default',
              selected ? 'border-primary' : 'border-line hover:border-line-strong',
            )}
          >
            {showResults ? (
              <span
                aria-hidden
                className={cn('absolute inset-y-0 left-0', count === leader && count > 0 ? 'bg-primary-soft' : 'bg-container')}
                style={{ width: `${percent}%` }}
              />
            ) : null}
            <span className="relative flex items-center justify-between gap-3 px-3.5 py-2.5 text-body-md">
              <span className="flex items-center gap-2 font-medium text-ink">
                {selected ? <CheckCircle2 className="size-[18px] text-primary" aria-hidden /> : <Circle className="size-[18px] text-ink-faint" aria-hidden />}
                {option}
              </span>
              {showResults ? <span className="text-body-sm font-semibold text-ink-muted tabular-nums">{percent} %</span> : null}
            </span>
          </button>
        );
      })}
      <p className="text-body-sm text-ink-faint">
        {total} vote{total > 1 ? 's' : ''}
        {!canVote ? ' · connectez-vous pour voter' : chosen === null ? ' · votez pour voir les résultats' : ''}
      </p>
    </div>
  );
}
