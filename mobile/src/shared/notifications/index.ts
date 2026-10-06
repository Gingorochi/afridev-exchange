import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api, unwrap } from '@/shared/api';
import { isExpoGo } from '@/shared/runtime';
import { useSession } from '@/shared/session';

/**
 * Les notifications push n'existent ni sur le web ni dans Expo Go (retirées d'Expo Go
 * Android depuis le SDK 53) : le module n'est chargé que dans un vrai build.
 */
const pushSupported = Platform.OS !== 'web' && !isExpoGo;

function notifications() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargement conditionnel (absent d'Expo Go)
  return pushSupported ? (require('expo-notifications') as typeof import('expo-notifications')) : null;
}

notifications()?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/** Écran à ouvrir pour une notification (data = {type, id}). */
export function notificationRoute(data: Record<string, unknown> | undefined): string | null {
  const id = typeof data?.id === 'string' ? data.id : null;
  if (!id) return null;
  switch (data?.type) {
    case 'post':
      return `/post/${id}`;
    case 'question':
      return `/question/${id}`;
    case 'snippet':
      return `/snippet/${id}`;
    case 'project':
      return `/project/${id}`;
    case 'guide':
      return `/guide/${id}`;
    default:
      return null;
  }
}

async function registerDevice(): Promise<void> {
  const Notifications = notifications();
  if (!Notifications) return;
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return; // jeton Expo impossible sans projet EAS configuré
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await unwrap(
    api.POST('/api/notifications/devices/', {
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    }),
  );
}

/**
 * Notifications push (Expo → FCM / APNs) : enregistrement de l'appareil après connexion,
 * et ouverture du bon écran quand on touche une notification.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useSession();

  useEffect(() => {
    if (!isAuthenticated) return;
    void registerDevice().catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const Notifications = notifications();
    if (!Notifications) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = notificationRoute(response.notification.request.content.data);
      if (route) router.push(route as never);
    });
    return () => subscription.remove();
  }, []);
}
