import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { useTheme } from '@/shared/theme';
import { Button, Icon, Screen, ScreenHeader, Text, TextField } from '@/shared/ui';

import { authApi, markOnboarded, mfaChallenge } from '../api';

/** Deuxième étape de connexion : code à 6 chiffres de l'application d'authentification. */
export function VerifyTwoFactorScreen() {
  const { colors } = useTheme();
  const { signIn } = useSession();
  const challenge = mfaChallenge.get();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challenge) router.replace('/login');
  }, [challenge]);

  async function verify(value: string) {
    if (!challenge || value.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.loginMfa(challenge.token, value);
      if (!response.tokens) throw new Error('Connexion incomplète, recommencez.');
      mfaChallenge.clear();
      signIn(response.tokens);
      markOnboarded();
      router.replace(challenge.created ? '/profile' : '/feed');
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      header={<ScreenHeader title="Double authentification" back />}
      footer={<Button label="Valider" iconRight="arrow-right" size="lg" loading={loading} disabled={code.length !== 6} onPress={() => verify(code)} />}
    >
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon name="key" size={24} tone="primary" />
      </View>
      <Text variant="headlineXl">Code de sécurité</Text>
      <Text variant="bodyLg" tone="muted">
        Ouvrez votre application d&apos;authentification (Google Authenticator, Aegis, 2FAS…) et saisissez le code affiché pour
        AfriDev Exchange.
      </Text>
      <TextField
        value={code}
        onChangeText={(raw) => {
          const next = raw.replace(/\D/g, '').slice(0, 6);
          setCode(next);
          if (next.length === 6) void verify(next);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        mono
        placeholder="123456"
        accessibilityLabel="Code à 6 chiffres"
        error={error}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
