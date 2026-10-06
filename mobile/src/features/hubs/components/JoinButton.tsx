import { router } from 'expo-router';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { Button, useToast } from '@/shared/ui';

import { type Hub, useJoinHub } from '../api';

/** « Rejoindre » / « Membre » ; non connecté : vers la connexion. */
export function JoinButton({ hub, size = 'sm' }: { hub: Hub; size?: 'sm' | 'md' }) {
  const { isAuthenticated, user } = useSession();
  const join = useJoinHub(hub.slug);
  const toast = useToast();
  const member = Boolean(hub.viewer?.is_member);
  const isCreator = Boolean(user && hub.creator?.id === user.id);

  async function toggle() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    try {
      await join.mutateAsync(!member);
      toast(member ? `Vous avez quitté h/${hub.slug}.` : `Bienvenue dans h/${hub.slug} !`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <Button
      label={member ? 'Membre' : 'Rejoindre'}
      icon={member ? 'check' : 'plus'}
      variant={member ? 'ghost' : 'primary'}
      size={size}
      loading={join.isPending}
      disabled={member && isCreator}
      onPress={toggle}
    />
  );
}
