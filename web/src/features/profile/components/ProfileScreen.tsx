'use client';

import { CalendarDays, Check, Download, Github, Globe, MapPin, PartyPopper, Pencil, QrCode, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { AuthorPosts } from '@/features/feed';
import { OwnerProjects } from '@/features/projects';
import { AuthorQuestions } from '@/features/qa';
import { AuthorSnippets } from '@/features/snippets';
import { errorMessage } from '@/shared/api';
import { TwoColumns } from '@/shared/layout';
import { useSession } from '@/shared/session';
import { Avatar, Button, Card, CardSkeleton, ErrorNotice, Tabs, useToast } from '@/shared/ui';

import { type MyProfile, type PublicProfile, qrCodeUrl, useAiBio, usePublicProfile, useUpdateProfile } from '../api';
import { EditProfileDialog } from './EditProfileDialog';

type Tab = 'snippets' | 'posts' | 'questions' | 'projects';

const SINCE = new Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function ProfileScreen({ username, initial, welcome = false }: { username: string; initial?: PublicProfile; welcome?: boolean }) {
  const publicProfile = usePublicProfile(username, initial);
  const { profile: me } = useSession();
  const isMe = Boolean(me && me.username.toLowerCase() === username.toLowerCase());
  // Pour son propre profil, la version complète (suggestion IA) et toujours à jour.
  const profile: PublicProfile | MyProfile | undefined = isMe ? me : publicProfile.data;

  if (!profile) {
    return (
      <div className="mx-auto max-w-[1120px]">
        {publicProfile.isError ? (
          <ErrorNotice title="Profil introuvable" message={`Aucun membre ne s'appelle @${username}.`} />
        ) : (
          <CardSkeleton lines={5} />
        )}
      </div>
    );
  }
  return <ProfileView profile={profile} me={isMe ? me : undefined} welcome={welcome && isMe} />;
}

function ProfileView({ profile, me, welcome }: { profile: PublicProfile; me?: MyProfile; welcome: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const name = profile.display_name || profile.username;

  async function share() {
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      if (navigator.share) await navigator.share({ url, title: `${name} sur AfriDev Exchange` });
      else {
        await navigator.clipboard.writeText(url);
        toast('Lien du profil copié.');
      }
    } catch {
      // partage annulé
    }
  }

  return (
    <TwoColumns aside={<QrCard profile={profile} name={name} />}>
      {welcome ? (
        <Card className="flex flex-wrap items-center gap-3 border-secondary/30 bg-secondary-soft/50 p-4">
          <PartyPopper className="size-5 text-secondary-ink" aria-hidden />
          <p className="flex-1 text-body-md text-ink">Bienvenue sur AfriDev ! Complétez votre stack pour recevoir des projets adaptés.</p>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Compléter mon profil
          </Button>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="h-28 bg-[linear-gradient(120deg,var(--primary)_0%,var(--tertiary)_50%,var(--secondary)_100%)] sm:h-36" aria-hidden />
        <div className="px-4 pb-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Avatar name={name} src={profile.avatar_url} size={120} className="-mt-14 border-4 border-card text-[2.5rem] sm:-mt-16" />
            <div className="flex gap-2 pt-3">
              {me ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden /> Modifier le profil
                </Button>
              ) : null}
              <Button size="sm" onClick={share}>
                <Share2 className="size-4" aria-hidden /> Partager
              </Button>
            </div>
          </div>
          <h1 className="mt-3 text-headline-xl text-ink">{name}</h1>
          <p className="text-body-md text-ink-muted">@{profile.username}</p>
          {profile.stack.length ? (
            <p className="mt-1 text-body-lg text-ink">Développeur·se {profile.stack.slice(0, 3).join(' · ')}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-muted">
            {profile.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {profile.location}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden /> Membre depuis {SINCE.format(new Date(profile.created_at))}
            </span>
            {profile.github_username ? (
              <a
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold text-primary-ink hover:underline"
              >
                <Github className="size-4" aria-hidden /> {profile.github_username}
              </a>
            ) : null}
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1 font-semibold text-primary-ink hover:underline"
              >
                <Globe className="size-4" aria-hidden /> {profile.website.replace(/^https?:\/\//, '')}
              </a>
            ) : null}
          </div>
          {profile.open_to_work ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary-soft px-3 py-2 text-body-sm">
              <span className="size-2 rounded-full bg-secondary" aria-hidden />
              <span className="font-semibold text-on-secondary-soft">Ouvert aux opportunités</span>
              <span className="text-on-secondary-soft/80">missions, emploi, contributions</span>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-headline-md text-ink">À propos</h2>
          {me ? <AiBioButton /> : null}
        </div>
        {profile.bio ? (
          <p className="text-body-lg whitespace-pre-line text-ink">{profile.bio}</p>
        ) : (
          <p className="text-body-md text-ink-muted">{me ? 'Ajoutez une bio ou laissez l’IA vous en proposer une.' : 'Pas encore de bio.'}</p>
        )}
        {me ? <AiBioSuggestion profile={me} /> : null}
        {profile.stack.length ? (
          <div className="space-y-2 border-t border-line pt-4">
            <h3 className="text-body-md font-bold text-ink">Stack technique</h3>
            <div className="flex flex-wrap gap-2">
              {profile.stack.map((skill) => (
                <span key={skill} className="rounded-full border border-line-strong px-3 py-1 text-body-sm font-semibold text-ink">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="px-2 sm:px-4">
        <Tabs<Tab>
          className="border-0"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'posts', label: 'Publications' },
            { value: 'questions', label: 'Questions' },
            { value: 'snippets', label: 'Snippets' },
            { value: 'projects', label: 'Projets' },
          ]}
        />
      </Card>
      {tab === 'snippets' ? <AuthorSnippets authorId={profile.id} /> : null}
      {tab === 'posts' ? <AuthorPosts authorId={profile.id} /> : null}
      {tab === 'questions' ? <AuthorQuestions authorId={profile.id} /> : null}
      {tab === 'projects' ? <OwnerProjects ownerId={profile.id} /> : null}

      {me ? <EditProfileDialog profile={me} open={editing} onClose={() => setEditing(false)} /> : null}
    </TwoColumns>
  );
}

function QrCard({ profile, name }: { profile: PublicProfile; name: string }) {
  return (
    <Card className="space-y-3 p-4 text-center">
      <h2 className="flex items-center gap-2 text-left text-label-md font-bold tracking-wide text-ink-muted uppercase">
        <QrCode className="size-4 text-primary" aria-hidden /> Carte développeur
      </h2>
      <p className="text-left text-body-sm text-ink-muted">Scannez ce QR code pour ouvrir le profil, en meetup ou en hackathon.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG de quelques Ko servi par l'API */}
      <img
        src={qrCodeUrl(profile.username)}
        alt={`QR code du profil de ${name}`}
        width={168}
        height={168}
        className="mx-auto rounded-xl bg-white p-2 ring-1 ring-line"
      />
      <a
        href={qrCodeUrl(profile.username)}
        download={`afridev-${profile.username}.svg`}
        className="flex h-10 items-center justify-center gap-2 rounded-full bg-container text-body-sm font-semibold text-ink hover:bg-container-high"
      >
        <Download className="size-4" aria-hidden /> Télécharger
      </a>
    </Card>
  );
}

function AiBioButton() {
  const aiBio = useAiBio();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="subtle" size="sm" onClick={() => aiBio.mutate()} loading={aiBio.isPending}>
        <Sparkles className="size-4 text-primary" aria-hidden /> Rédiger avec l&apos;IA
      </Button>
      {aiBio.isError ? <p className="text-body-sm text-danger">{errorMessage(aiBio.error)}</p> : null}
    </div>
  );
}

function AiBioSuggestion({ profile }: { profile: MyProfile }) {
  const update = useUpdateProfile();
  const aiBio = useAiBio();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const suggestion = profile.ai_bio_suggestion;
  if (profile.ai_bio_status === 'failed') {
    return <p className="text-body-sm text-danger">La bio IA n&apos;a pas pu être générée. Réessayez plus tard.</p>;
  }
  if (profile.ai_bio_status !== 'ready' || !suggestion || suggestion === profile.bio || dismissed === suggestion) return null;
  return (
    <div className="space-y-3 rounded-xl bg-primary-soft/40 p-4">
      <p className="flex items-center gap-2 text-body-md font-bold text-primary-ink">
        <Sparkles className="size-4" aria-hidden /> Suggestion de l&apos;IA
      </p>
      <p className="text-body-lg text-ink italic">« {suggestion} »</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => update.mutate({ bio: suggestion })} loading={update.isPending}>
          <Check className="size-4" aria-hidden /> Utiliser cette bio
        </Button>
        <Button size="sm" variant="ghost" onClick={() => aiBio.mutate()} loading={aiBio.isPending}>
          <RefreshCw className="size-4" aria-hidden /> Une autre
        </Button>
        <Button size="sm" variant="plain" onClick={() => setDismissed(suggestion)}>
          Ignorer
        </Button>
      </div>
    </div>
  );
}
