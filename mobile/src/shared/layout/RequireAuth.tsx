import { router } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/shared/session';
import { space } from '@/shared/theme';
import { Button, EmptyState, Screen, ScreenHeader } from '@/shared/ui';

/**
 * Écran réservé aux membres : invite à se connecter au lieu de rediriger brutalement.
 * `bare` : l'écran parent affiche déjà son en-tête (onglets).
 */
export function RequireAuth({ title, bare, children }: { title: string; bare?: boolean; children: React.ReactNode }) {
  const { isAuthenticated } = useSession();
  if (isAuthenticated) return <>{children}</>;
  const invite = (
    <View style={{ padding: bare ? space.md : 0, paddingTop: space.lg }}>
      <EmptyState
        icon="lock"
        title="Connectez-vous pour continuer"
        message="Votre coffre, vos notifications et vos publications sont liés à votre compte."
        action={<Button label="Se connecter" icon="log-in" onPress={() => router.push('/login')} />}
      />
    </View>
  );
  if (bare) return invite;
  return <Screen header={<ScreenHeader title={title} back />}>{invite}</Screen>;
}
