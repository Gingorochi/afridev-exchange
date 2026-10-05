'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  Database,
  Gauge,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Send,
  Sun,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api, unwrap } from '@/shared/api';
import { type TextOnlyMode, useDataSaver, type VideoQuality } from '@/shared/data-saver';
import { PageHeader } from '@/shared/layout';
import { cn, formatBytes } from '@/shared/lib';
import { flushOutbox, removeFromOutbox, useOutbox, useStorageEstimate } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { type ThemePreference, useTheme } from '@/shared/theme';
import { Button, Card, CardHeader, Segmented, StatusBadge, TimeAgo, useToast } from '@/shared/ui';

export function SettingsScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres & préférences"
        description="Réglez la consommation de données, la synchronisation hors ligne et l'apparence pour une utilisation fluide, même en 2G."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <DataCard />
          <OutboxCard />
          <LanguageCard />
        </div>
        <aside className="space-y-6">
          <AppearanceCard />
          <StorageCard />
          <AccountCard />
        </aside>
      </div>
    </>
  );
}

function DataCard() {
  const { mode, setMode, videoQuality, setVideoQuality, network, textOnly } = useDataSaver();
  return (
    <Card className="space-y-5 p-4 sm:p-6">
      <CardHeader icon={<Gauge className="size-5" aria-hidden />} title="Bande passante & données" subtitle="Priorité au texte et à l'économie de forfait" />
      <div className="space-y-2 rounded-lg border border-line bg-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-semibold text-ink">
            Mode « Texte seul » {textOnly ? <StatusBadge tone="success">Actif</StatusBadge> : null}
          </p>
          <Segmented<TextOnlyMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'on', label: 'Activé' },
              { value: 'off', label: 'Désactivé' },
            ]}
          />
        </div>
        <p className="text-body-sm text-ink-muted">
          Masque images, vidéos et polices décoratives. En « Auto », il s&apos;active dès que le réseau est
          lent ou que l&apos;économiseur de données du téléphone est allumé
          {network === 'slow' ? ' (réseau lent détecté)' : ''}.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-ink">Qualité vidéo maximale</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['auto', 'Auto', 'Selon le réseau'],
              ['240', '240p', '~2 Mo / min'],
              ['480', '480p', '~6 Mo / min'],
              ['720', '720p', 'Wi-Fi, ~14 Mo / min'],
            ] as Array<[VideoQuality, string, string]>
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={videoQuality === value}
              onClick={() => setVideoQuality(value)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                videoQuality === value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-container-low hover:border-primary',
              )}
            >
              <span className="block font-mono font-semibold">{label}</span>
              <span className={cn('block text-label-md', videoQuality === value ? 'text-white/85' : 'text-ink-muted')}>{hint}</span>
            </button>
          ))}
        </div>
        <p className="text-body-sm text-ink-muted">Les vidéos ne démarrent jamais seules.</p>
      </div>
    </Card>
  );
}

function OutboxCard() {
  const pending = useOutbox();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated } = useSession();
  const [flushing, setFlushing] = useState(false);
  const rejections = useQuery({
    queryKey: ['sync', 'rejections'],
    queryFn: () => unwrap(api.GET('/api/sync/rejections/')),
    enabled: isAuthenticated,
  });
  const acknowledge = useMutation({
    mutationFn: (ids: string[]) => unwrap(api.POST('/api/sync/rejections/ack/', { body: { ids } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sync', 'rejections'] }),
  });
  const failed = rejections.data ?? [];

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader
        icon={<Send className="size-5" aria-hidden />}
        title="Envois en attente & en échec"
        subtitle="Ce que vous avez écrit hors ligne"
        action={
          pending.length ? (
            <Button
              size="sm"
              loading={flushing}
              onClick={async () => {
                setFlushing(true);
                await flushOutbox();
                setFlushing(false);
                toast(navigator.onLine ? 'Envoi relancé.' : 'Toujours hors ligne : nouvel essai au retour du réseau.', 'queued');
              }}
            >
              <RefreshCw className="size-4" aria-hidden /> Tout renvoyer
            </Button>
          ) : null
        }
      />
      {!pending.length && !failed.length ? (
        <p className="rounded-lg border border-line bg-container-low p-3 text-body-sm text-ink-muted">
          Tout est synchronisé : aucun envoi en attente.
        </p>
      ) : null}
      {pending.map((entry) => (
        <div key={entry.id} className="space-y-2 rounded-lg border border-line bg-container-low p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge tone="offline"><Clock className="size-3" aria-hidden /> En attente de réseau</StatusBadge>
            <TimeAgo date={entry.createdAt} className="text-label-md text-ink-faint" />
          </div>
          <p className="font-semibold text-ink">{entry.label}</p>
          <Button size="sm" variant="ghost" onClick={() => window.confirm('Abandonner cet envoi ?') && removeFromOutbox(entry.id)}>
            <Trash2 className="size-4" aria-hidden /> Abandonner
          </Button>
        </div>
      ))}
      {failed.map((rejection) => (
        <div key={rejection.id} className="space-y-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge tone="danger"><AlertTriangle className="size-3" aria-hidden /> Refusé</StatusBadge>
            <TimeAgo date={rejection.created_at} className="text-label-md text-ink-faint" />
          </div>
          <p className="font-semibold text-ink">
            {{ posts: 'Post', comments: 'Commentaire', questions: 'Question', answers: 'Réponse', snippets: 'Snippet', projects: 'Projet', profiles: 'Profil' }[rejection.table] ?? rejection.table}
            {typeof rejection.data === 'object' && rejection.data && 'title' in rejection.data ? ` : ${String((rejection.data as { title: unknown }).title)}` : ''}
          </p>
          <p className="text-body-sm text-on-danger-soft">Raison : {rejection.message}</p>
          <Button size="sm" variant="ghost" onClick={() => acknowledge.mutate([rejection.id])}>J&apos;ai compris</Button>
        </div>
      ))}
    </Card>
  );
}

function LanguageCard() {
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <CardHeader icon={<Languages className="size-5" aria-hidden />} title="Langue" subtitle="Interface et traductions IA" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-primary bg-primary-soft/30 p-3">
          <p className="font-semibold text-ink">Français</p>
          <p className="text-label-md text-ink-muted">Langue actuelle de l&apos;interface</p>
        </div>
        <div className="rounded-lg border border-line bg-container-low p-3 opacity-70">
          <p className="font-semibold text-ink">English</p>
          <p className="text-label-md text-ink-muted">Bientôt disponible</p>
        </div>
      </div>
      <p className="text-body-sm text-ink-muted">
        Les contenus peuvent déjà être traduits ou vulgarisés à la demande avec le bouton « Traduire ».
      </p>
    </Card>
  );
}

function AppearanceCard() {
  const [theme, setTheme] = useTheme();
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Monitor },
  ];
  return (
    <Card className="space-y-4 p-4">
      <CardHeader icon={<Palette className="size-5" aria-hidden />} title="Apparence" />
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-body-sm',
              theme === option.value ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line bg-container-low text-ink-muted hover:border-primary',
            )}
          >
            <option.icon className="size-5" aria-hidden /> {option.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function StorageCard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const storage = useStorageEstimate(version);
  return (
    <Card className="space-y-4 p-4">
      <CardHeader icon={<Database className="size-5" aria-hidden />} title="Espace de stockage" subtitle="Copie locale hors ligne" />
      {storage ? (
        <div className="space-y-2 rounded-lg border border-line bg-container-low p-3">
          <div className="flex justify-between text-body-sm">
            <span>Utilisé</span>
            <span className="text-primary-ink">{formatBytes(storage.usage)}</span>
          </div>
          <p className="text-label-md text-ink-muted">{formatBytes(Math.max(0, storage.quota - storage.usage))} disponibles sur cet appareil.</p>
        </div>
      ) : null}
      <Button
        variant="subtle"
        className="w-full"
        onClick={async () => {
          queryClient.clear();
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.filter((name) => !name.includes('precache')).map((name) => caches.delete(name)));
          }
          setVersion((value) => value + 1);
          toast('Cache vidé : les données seront rechargées au besoin.');
        }}
      >
        <RefreshCw className="size-4" aria-hidden /> Vider le cache des données
      </Button>
      <p className="text-body-sm text-ink-muted">Vos brouillons et envois en attente sont conservés.</p>
    </Card>
  );
}

function AccountCard() {
  const { isAuthenticated, signOut } = useSession();
  const router = useRouter();
  if (!isAuthenticated) return null;
  return (
    <Card className="p-4">
      <Button
        variant="ghost"
        className="w-full text-danger"
        onClick={() => {
          signOut();
          router.replace('/');
        }}
      >
        <LogOut className="size-4" aria-hidden /> Se déconnecter
      </Button>
    </Card>
  );
}
