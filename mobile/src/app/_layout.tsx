// Une graisse = un import : seules les 7 polices utilisées sont embarquées dans l'appli.
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { tokenStore } from '@/shared/api';
import { AppProviders } from '@/shared/providers/AppProviders';
import { useTheme } from '@/shared/theme';

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compose/post" options={{ presentation: 'modal' }} />
        <Stack.Screen name="compose/question" options={{ presentation: 'modal' }} />
        <Stack.Screen name="compose/short" options={{ presentation: 'modal' }} />
        <Stack.Screen name="snippet/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="project/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shorts" options={{ animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
      </Stack>
    </>
  );
}

/** Polices embarquées (aucun téléchargement) et jetons chargés avant le premier écran. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  const [tokensLoaded, setTokensLoaded] = useState(false);

  useEffect(() => {
    void tokenStore.hydrate().finally(() => setTokensLoaded(true));
  }, []);

  const ready = fontsLoaded && tokensLoaded;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <AppProviders>
      <Navigator />
    </AppProviders>
  );
}
