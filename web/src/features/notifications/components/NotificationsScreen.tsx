'use client';

import {
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  EyeOff,
  Handshake,
  Heart,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Reply,
  ShieldAlert,
  Sparkles,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PageHeader, TwoColumns } from '@/shared/layout';
import { cn } from '@/shared/lib';
import {
  Button,
  buttonClasses,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  Segmented,
  StatusBadge,
  TimeAgo,
} from '@/shared/ui';

import {
  type Notification,
  notificationHref,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '../api';

const KIND_STYLE: Record<string, { icon: LucideIcon; tone: string }> = {
  new_comment: { icon: MessageSquare, tone: 'bg-container text-ink-muted' },
  comment_reply: { icon: Reply, tone: 'bg-container text-ink-muted' },
  post_liked: { icon: Heart, tone: 'bg-primary-soft text-primary-ink' },
  new_answer: { icon: MessagesSquare, tone: 'bg-primary-soft text-primary-ink' },
  answer_accepted: { icon: CheckCircle2, tone: 'bg-secondary-soft text-on-secondary-soft' },
  ai_answer_ready: { icon: Sparkles, tone: 'bg-primary text-on-primary' },
  snippet_flagged: { icon: ShieldAlert, tone: 'bg-danger-soft text-danger' },
  content_hidden: { icon: EyeOff, tone: 'bg-danger-soft text-danger' },
  guide_ready: { icon: BookOpen, tone: 'bg-secondary-soft text-on-secondary-soft' },
  application_received: { icon: UserPlus, tone: 'bg-secondary-soft text-on-secondary-soft' },
  application_answered: { icon: Handshake, tone: 'bg-container text-ink-muted' },
};

function groupOf(date: string): string {
  const age = Date.now() - new Date(date).getTime();
  if (age < 24 * 3600 * 1000) return "Aujourd'hui";
  if (age < 7 * 24 * 3600 * 1000) return 'Cette semaine';
  return 'Plus ancien';
}

export function NotificationsScreen() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { data: unread = 0 } = useUnreadCount();
  const list = useNotifications(tab === 'unread');
  const markAll = useMarkAllRead();

  const groups = new Map<string, Notification[]>();
  for (const notification of list.items) {
    const group = groupOf(notification.created_at);
    groups.set(group, [...(groups.get(group) ?? []), notification]);
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Notifications
            {unread ? <StatusBadge tone="primary">{unread} non lues</StatusBadge> : null}
          </span>
        }
        actions={
          <Button variant="subtle" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={!unread}>
            <CheckCheck className="size-4" aria-hidden /> Tout marquer comme lu
          </Button>
        }
      />
      <TwoColumns aside={<OfflineCard />}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'unread', label: 'Non lues', count: unread },
          ]}
        />
        {list.isPending ? (
          <>
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </>
        ) : list.isError && !list.items.length ? (
          <ErrorNotice message="Vérifiez votre connexion : les notifications déjà reçues restent consultables hors ligne." />
        ) : !list.items.length ? (
          <EmptyState title={tab === 'unread' ? 'Tout est lu' : 'Aucune notification'}>
            Réponses, mentions et alertes de sécurité apparaîtront ici.
          </EmptyState>
        ) : (
          [...groups.entries()].map(([group, notifications]) => (
            <section key={group} className="space-y-3">
              <h2 className="flex items-center gap-3 text-label-md font-bold tracking-wide uppercase text-ink-muted">
                {group}
                <span className="h-px flex-1 bg-line" aria-hidden />
              </h2>
              {notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </section>
          ))
        )}
        {list.hasNextPage ? (
          <Button variant="ghost" className="w-full" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
            Charger plus
          </Button>
        ) : null}
      </TwoColumns>
    </>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const markRead = useMarkRead();
  const unread = !notification.read_at;
  const style = KIND_STYLE[notification.kind] ?? KIND_STYLE.new_comment!;
  const Icon = style.icon;
  const href = notificationHref(notification);

  return (
    <Card className={cn('flex gap-3 p-4', unread && 'border-l-[3px] border-l-primary')}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded', style.tone)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-body-md text-ink', unread && 'font-semibold')}>{notification.title}</p>
          {unread ? (
            <button
              type="button"
              onClick={() => markRead.mutate(notification.id)}
              aria-label="Marquer comme lue"
              className="flex size-9 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-container"
            >
              <Check className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {notification.body ? <p className="text-body-sm text-ink-muted">{notification.body}</p> : null}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <TimeAgo date={notification.created_at} className="text-label-md text-ink-faint" />
          {href ? (
            <Link
              href={href}
              onClick={() => unread && markRead.mutate(notification.id)}
              className={buttonClasses({ variant: unread ? 'primary' : 'ghost', size: 'sm' })}
            >
              Voir
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function OfflineCard() {
  return (
    <Card className="space-y-2 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <WifiOff className="size-4 text-secondary-ink" aria-hidden /> Consultables hors ligne
      </h2>
      <p className="text-body-sm text-ink-muted">
        Les notifications déjà reçues sont gardées sur cet appareil. Les nouvelles arrivent en direct
        quand vous êtes connecté, et par push sur l&apos;application mobile.
      </p>
    </Card>
  );
}
