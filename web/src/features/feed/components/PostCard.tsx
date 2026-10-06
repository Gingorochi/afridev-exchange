'use client';

import {
  ArrowBigDown,
  ArrowBigUp,
  BarChart3,
  CheckCircle2,
  Circle,
  Clapperboard,
  Ellipsis,
  Link2,
  MessageSquare,
  Share2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ReportButton } from '@/features/moderation';
import { TranslateButton } from '@/features/translation';
import { cn, formatCount } from '@/shared/lib';
import { type MediaAsset, MediaView } from '@/shared/media';
import { useSession } from '@/shared/session';
import { Avatar, CommunityIcon, Markdown, Menu, MenuItem, Tag, TimeAgo, useToast } from '@/shared/ui';

import { type Post, useDeletePost, useScoreVote, useVote } from '../api';

/** Capsule d'action grise (commentaires, partage…), comme sous un post Reddit. */
const pill =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-container px-3 text-body-sm font-semibold text-ink transition-colors hover:bg-container-high';

/**
 * Post façon Reddit. Dans le fil : bloc sans cadre (le fil le sépare par un filet), cliquable,
 * « d/communauté • date », titre en gras, aperçu du texte, puis votes ↑ score ↓ et actions.
 * En page détail (`detail`) : texte complet et auteur mis en avant.
 * `community={false}` sur la page d'une communauté (inutile de la répéter, on montre l'auteur).
 */
export function PostCard({ post, detail = false, community: showCommunity = true }: { post: Post; detail?: boolean; community?: boolean }) {
  const router = useRouter();
  const { user } = useSession();
  const remove = useDeletePost();
  const toast = useToast();
  const name = post.author?.display_name || post.author?.username || 'Membre';
  const mine = Boolean(user && post.author?.id === user.id);
  const [community, ...otherTags] = post.tags;
  const href = `/feed/${post.id}`;
  // Posts antérieurs aux titres : la première ligne du texte en tient lieu.
  const title = post.title || (post.kind === 'poll' ? post.body : '');
  const body = post.kind === 'poll' && !post.title ? '' : post.body;

  async function share() {
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) await navigator.share({ url, title: title || 'AfriDev Exchange' });
      else {
        await navigator.clipboard.writeText(url);
        toast('Lien copié.');
      }
    } catch {
      // partage annulé
    }
  }

  const TitleTag = detail ? 'h1' : 'h2';

  return (
    <article
      id={`post-${post.id}`}
      onClick={detail ? undefined : (event) => openOnCardClick(event, () => router.push(href))}
      className={cn(!detail && 'group -mx-2 cursor-pointer rounded-2xl px-2 py-2.5 transition-colors hover:bg-container-low sm:-mx-4 sm:px-4')}
    >
      <header className="flex min-w-0 items-center gap-1.5 text-body-sm">
        {community && showCommunity ? (
          <Link
            href={`/feed?tag=${encodeURIComponent(community)}`}
            className="flex shrink-0 items-center gap-2 font-semibold text-ink hover:underline"
          >
            <CommunityIcon tag={community} size={detail ? 32 : 24} />
            d/{community}
          </Link>
        ) : post.author ? (
          <Link href={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-2 font-semibold text-ink hover:underline">
            <Avatar name={name} src={post.author.avatar_url} size={detail ? 32 : 24} />
            <span className="truncate">{name}</span>
          </Link>
        ) : (
          <span className="font-semibold text-ink">{name}</span>
        )}
        <span className="text-ink-faint" aria-hidden>
          •
        </span>
        <TimeAgo date={post.created_at} className="shrink-0 text-ink-faint" />
        {/* L'auteur reste visible : sur un réseau de devs, qui parle compte. */}
        {community && showCommunity && post.author ? (
          <>
            <span className="hidden text-ink-faint sm:inline" aria-hidden>
              •
            </span>
            <Link href={`/u/${post.author.username}`} className="hidden min-w-0 truncate text-ink-muted hover:underline sm:inline">
              {name}
            </Link>
          </>
        ) : null}
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
                <button type="button" aria-label="Plus d'actions" {...props} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-container-high">
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

      {title ? (
        <TitleTag className={cn('mt-1.5 font-semibold text-ink', detail ? 'text-headline-lg' : 'text-[1.125rem] leading-snug')}>
          {title}
        </TitleTag>
      ) : null}

      {body ? (
        detail ? (
          <div className="mt-3 text-body-lg">
            <Markdown source={body} />
          </div>
        ) : (
          // Aperçu : quelques lignes, fondu en bas ; le texte complet est sur la page du post.
          <div className={cn('relative mt-1.5 overflow-hidden text-ink-muted', title ? 'max-h-[7.5rem]' : 'max-h-[16rem] text-ink')}>
            <Markdown source={body} />
            {body.length > (title ? 180 : 600) ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent group-hover:from-container-low" />
            ) : null}
          </div>
        )
      ) : null}

      {post.kind === 'poll' ? (
        <div className="mt-3">
          <Poll post={post} />
        </div>
      ) : null}
      {/* Le schéma décrit `media` comme JSON libre : c'est la forme de /api/media/<id>/. */}
      {post.media ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-line">
          <MediaView media={post.media as MediaAsset} />
        </div>
      ) : null}

      {otherTags.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {otherTags.map((tag) => (
            <Tag key={tag} href={`/feed?tag=${encodeURIComponent(tag)}`}>
              {tag}
            </Tag>
          ))}
        </div>
      ) : null}

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        <VotePill post={post} />
        {detail ? (
          <span className={cn(pill, 'hover:bg-container')}>
            <MessageSquare className="size-4" aria-hidden /> {formatCount(post.comment_count)}
          </span>
        ) : (
          <Link href={href} className={pill}>
            <MessageSquare className="size-4" aria-hidden /> {formatCount(post.comment_count)}
            <span className="sr-only">commentaires</span>
          </Link>
        )}
        <button type="button" onClick={share} className={pill}>
          <Share2 className="size-4" aria-hidden /> <span className="hidden sm:inline">Partager</span>
        </button>
        {post.body || post.title ? <TranslateButton tinted text={[post.title, post.body].filter(Boolean).join('\n\n')} /> : null}
        {!mine ? (
          <span className="ml-auto">
            <ReportButton targetType="post" targetId={post.id} compact />
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/** ↑ score ↓ dans une capsule ; la capsule prend la couleur du vote donné. */
function VotePill({ post }: { post: Post }) {
  const { isAuthenticated } = useSession();
  const router = useRouter();
  const vote = useScoreVote(post);
  const mine = post.viewer?.post_vote ?? 0;
  // Un post mis en cache avant les votes ↑/↓ (cache hors ligne, ISR) n'a pas encore de score.
  const score = post.score ?? post.like_count ?? 0;
  const cast = (value: 1 | -1) => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/feed/${post.id}`)}`);
      return;
    }
    vote.mutate(mine === value ? 0 : value);
  };
  return (
    <div
      className={cn(
        'inline-flex h-8 items-center rounded-full transition-colors',
        mine === 1 ? 'bg-primary text-on-primary' : mine === -1 ? 'bg-downvote text-white' : 'bg-container text-ink',
      )}
    >
      <button
        type="button"
        aria-label="Vote positif"
        aria-pressed={mine === 1}
        onClick={() => cast(1)}
        className={cn(
          'flex size-8 items-center justify-center rounded-full transition-colors',
          mine ? 'hover:bg-black/15' : 'hover:bg-container-high hover:text-primary',
        )}
      >
        <ArrowBigUp className={cn('size-5', mine === 1 && 'fill-current')} aria-hidden />
      </button>
      <span className="min-w-[1.25rem] text-center text-body-sm font-bold tabular-nums" aria-label={`Score : ${score}`}>
        {formatCount(score)}
      </span>
      <button
        type="button"
        aria-label="Vote négatif"
        aria-pressed={mine === -1}
        onClick={() => cast(-1)}
        className={cn(
          'flex size-8 items-center justify-center rounded-full transition-colors',
          mine ? 'hover:bg-black/15' : 'hover:bg-container-high hover:text-downvote',
        )}
      >
        <ArrowBigDown className={cn('size-5', mine === -1 && 'fill-current')} aria-hidden />
      </button>
    </div>
  );
}

/** Un clic dans le bloc ouvre la discussion, sauf sur un élément interactif, du code ou une sélection. */
function openOnCardClick(event: React.MouseEvent, open: () => void) {
  const target = event.target as HTMLElement;
  if (target.closest('a, button, input, textarea, video, pre, [role="menu"], dialog')) return;
  if (window.getSelection()?.toString()) return;
  open();
}

function Poll({ post }: { post: Post }) {
  const { isAuthenticated: canVote } = useSession();
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
              'relative w-full overflow-hidden rounded-xl border bg-surface text-left transition-colors disabled:cursor-default',
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
