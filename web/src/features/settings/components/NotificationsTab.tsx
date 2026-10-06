'use client';

import { BellRing, Mail, Smartphone } from 'lucide-react';

import { errorMessage, type Schemas } from '@/shared/api';
import { Card, CardHeader, Skeleton, Switch, useToast } from '@/shared/ui';

import { useNotificationPreferences, useUpdateNotificationPreferences } from '../api';

/** Types de notification reçus, et canaux push / e-mail. */
export function NotificationsTab() {
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const toast = useToast();

  const save = (changes: Parameters<typeof update.mutate>[0]) =>
    update.mutate(changes, { onError: (error) => toast(errorMessage(error), 'error') });

  if (prefs.isPending) return <Skeleton className="h-64" />;
  if (!prefs.data) return <p className="text-body-sm text-ink-muted">Les préférences nécessitent une connexion.</p>;
  const muted = new Set(prefs.data.muted_kinds);

  return (
    <div className="space-y-6">
      <Card className="space-y-2 p-4 sm:p-6">
        <CardHeader icon={<BellRing className="size-5" aria-hidden />} title="Canaux" subtitle="Les notifications restent toujours visibles dans l'application." />
        <ChannelRow
          icon={<Smartphone className="size-4" aria-hidden />}
          title="Notifications push"
          text="Sur l'application mobile."
          checked={prefs.data.push_enabled}
          onChange={(push_enabled) => save({ push_enabled })}
        />
        <ChannelRow
          icon={<Mail className="size-4" aria-hidden />}
          title="E-mails"
          text="Seulement pour les événements importants (réponse acceptée, contenu masqué…)."
          checked={prefs.data.email_enabled}
          onChange={(email_enabled) => save({ email_enabled })}
        />
      </Card>
      <Card className="p-4 sm:p-6">
        <CardHeader title="Ce qui me notifie" subtitle="Décochez ce que vous ne voulez plus recevoir du tout." />
        <ul className="mt-3 divide-y divide-line">
          {prefs.data.kinds.map((kind) => (
            <li key={kind.value} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-body-sm text-ink">{kind.label}</span>
              <Switch
                checked={!muted.has(kind.value)}
                label={kind.label}
                onChange={(on) => {
                  const next = new Set(muted);
                  if (on) next.delete(kind.value);
                  else next.add(kind.value);
                  save({ muted_kinds: [...next] as Schemas['NotificationKindEnum'][] });
                }}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ChannelRow({
  icon,
  title,
  text,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-1.5">
      <span className="flex items-center gap-3">
        <span className="text-ink-muted">{icon}</span>
        <span>
          <span className="block text-body-sm font-medium text-ink">{title}</span>
          <span className="block text-label-md text-ink-faint">{text}</span>
        </span>
      </span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
