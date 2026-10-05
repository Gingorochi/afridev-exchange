import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { fonts, radius, space, useTheme } from '@/shared/theme';
import { Button, Icon, Screen, ScreenHeader, Text } from '@/shared/ui';

import { authApi, markOnboarded, maskPhone } from '../api';

const LENGTH = 6;
const RESEND_AFTER = 45;

export function VerifyOtpScreen() {
  const { colors } = useTheme();
  const { signIn } = useSession();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_AFTER);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  async function verify(value: string) {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(phone, value);
      signIn(response.tokens);
      markOnboarded();
      router.replace(response.created ? '/profile' : '/feed');
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
      input.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  /** Saisie (clavier ou code SMS proposé par le système) : vérification au 6e chiffre. */
  function onCode(raw: string) {
    const next = raw.replace(/\D/g, '').slice(0, LENGTH);
    setCode(next);
    if (next.length === LENGTH) void verify(next);
  }

  async function resend() {
    setError(null);
    try {
      await authApi.requestOtp(phone);
      setRemaining(RESEND_AFTER);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen
      header={<ScreenHeader title="Vérification" back />}
      footer={
        <Button
          label="Valider et entrer"
          iconRight="arrow-right"
          size="lg"
          loading={loading}
          disabled={code.length !== LENGTH}
          onPress={() => verify(code)}
        />
      }
    >
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon name="message-square" size={24} tone="primary" />
      </View>
      <Text variant="headlineXl">Entrez votre code</Text>
      <Text variant="bodyLg" tone="muted">
        Nous avons envoyé un code à 6 chiffres par SMS au <Text variant="bodyMedium">{maskPhone(phone)}</Text>.{' '}
        <Text variant="bodyMedium" tone="primary" onPress={() => router.back()}>
          Modifier
        </Text>
      </Text>
      <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Champ du code SMS">
        <TextInput
          ref={input}
          value={code}
          onChangeText={onCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LENGTH}
          autoFocus
          editable={!loading}
          style={styles.hidden}
          accessibilityLabel="Code de confirmation"
        />
        <View style={styles.boxes} pointerEvents="none">
          {Array.from({ length: LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                { backgroundColor: colors.card, borderColor: i === code.length ? colors.primary : colors.border },
              ]}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 24 }}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={styles.resend}>
        <Text tone="muted">{remaining > 0 ? `Renvoyer le code dans 0:${String(remaining).padStart(2, '0')}` : "Vous n'avez rien reçu ?"}</Text>
        {remaining > 0 ? null : (
          <Pressable onPress={resend} hitSlop={10} accessibilityRole="button">
            <Text variant="bodyMedium" tone="primary">
              Renvoyer
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  boxes: { flexDirection: 'row', gap: space.sm },
  box: { flex: 1, aspectRatio: 0.85, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  resend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 44 },
});
