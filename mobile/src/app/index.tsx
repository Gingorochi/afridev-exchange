import { Redirect } from 'expo-router';

import { useSession } from '@/shared/session';
import { settingsStore } from '@/shared/storage';

/** Premier lancement : présentation ; ensuite, directement le fil (lisible même sans compte). */
export default function Index() {
  const { isAuthenticated } = useSession();
  const onboarded = settingsStore.getBoolean('onboarded') ?? false;
  if (!onboarded && !isAuthenticated) return <Redirect href="/onboarding" />;
  return <Redirect href="/feed" />;
}
