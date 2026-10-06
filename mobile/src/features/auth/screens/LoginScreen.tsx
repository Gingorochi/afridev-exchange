import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useSession } from '@/shared/session';
import { fonts, noFocusRing, radius, space, useTheme } from '@/shared/theme';
import {
  Button,
  IconButton,
  Icon,
  Screen,
  Segmented,
  Sheet,
  Text,
  TextField,
  Wordmark,
} from '@/shared/ui';

import { authApi, COUNTRIES, githubAvailable, loginWithGitHub, markOnboarded } from '../api';

type Method = 'phone' | 'email';
type Tokens = { access: string; refresh: string };

/** Connexion : même parcours que le web (GitHub, puis téléphone ou e-mail). */
export function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useSession();
  const [method, setMethod] = useState<Method>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const done = (tokens: Tokens, created: boolean) => {
    signIn(tokens);
    markOnboarded();
    router.replace(created ? '/profile' : '/feed');
  };

  async function github() {
    setError(null);
    setLoading(true);
    try {
      const response = await loginWithGitHub();
      if (response) done(response.tokens, response.created);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <View style={[styles.top, { backgroundColor: colors.canvas }]}>
      <IconButton icon="arrow-left" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
      <Wordmark />
    </View>
  );

  return (
    <Screen header={header} contentContainerStyle={styles.content}>
      <View style={{ gap: 6 }}>
        <Text variant="headlineXl">Bienvenue sur AfriDev</Text>
        <Text variant="bodyLg" tone="muted">
          Connectez-vous ou créez votre compte en quelques secondes.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Pressable
          onPress={github}
          disabled={!githubAvailable() || loading}
          accessibilityRole="button"
          accessibilityLabel="Continuer avec GitHub"
          style={({ pressed }) => [styles.github, { backgroundColor: colors.ink, opacity: !githubAvailable() ? 0.45 : pressed ? 0.85 : 1 }]}
        >
          <Icon name="github" size={20} color={colors.card} />
          <Text variant="bodyMedium" style={{ color: colors.card }}>
            Continuer avec GitHub
          </Text>
        </Pressable>
        {!githubAvailable() ? (
          <Text variant="small" tone="faint" center>
            La connexion GitHub n’est pas configurée sur ce serveur.
          </Text>
        ) : null}
        {error ? (
          <Text variant="small" tone="danger" center accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text variant="label" tone="faint">
          ou
        </Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <Segmented<Method>
        value={method}
        onChange={setMethod}
        options={[
          { value: 'phone', label: 'Téléphone', icon: 'smartphone' },
          { value: 'email', label: 'E-mail', icon: 'mail' },
        ]}
      />
      {method === 'phone' ? <PhoneForm /> : <EmailForm onSuccess={done} />}

      <View style={styles.legal}>
        <Icon name="lock" size={13} tone="faint" />
        <Text variant="small" tone="faint" style={{ flexShrink: 1 }}>
          En continuant, vous acceptez les règles de la communauté AfriDev.
        </Text>
      </View>
    </Screen>
  );
}

function PhoneForm() {
  const { colors } = useTheme();
  const [country, setCountry] = useState(COUNTRIES[0]!);
  const [pickCountry, setPickCountry] = useState(false);
  const [number, setNumber] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendSms() {
    setError(null);
    setLoading(true);
    try {
      const { phone_number } = await authApi.requestOtp(`${country.code}${number.replace(/\D/g, '')}`);
      router.push({ pathname: '/verify-otp', params: { phone: phone_number } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 6 }}>
        <Text variant="label">Numéro de mobile</Text>
        {/* Indicatif et numéro dans un seul champ visuel, comme sur le web. */}
        <View style={[styles.phone, { borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.card }]}>
          <Pressable
            onPress={() => setPickCountry(true)}
            accessibilityRole="button"
            accessibilityLabel={`Indicatif ${country.code}, changer`}
            style={[styles.country, { backgroundColor: colors.container, borderRightColor: colors.border }]}
          >
            <Text variant="bodyMedium">
              {country.flag} {country.code}
            </Text>
            <Icon name="chevron-down" size={16} tone="muted" />
          </Pressable>
          <TextInput
            value={number}
            onChangeText={setNumber}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="90 12 34 56"
            placeholderTextColor={colors.inkFaint}
            keyboardType="phone-pad"
            autoComplete="tel"
            accessibilityLabel="Numéro de mobile"
            style={[styles.number, noFocusRing, { color: colors.ink, fontFamily: fonts.regular }]}
          />
        </View>
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Recevoir mon code par SMS" iconRight="arrow-right" size="lg" loading={loading} disabled={number.replace(/\D/g, '').length < 6} onPress={sendSms} />
      <View style={styles.legal}>
        <Icon name="shield" size={14} tone="secondary" />
        <Text variant="small" tone="muted" style={{ flexShrink: 1 }}>
          Gratuit : le SMS ne consomme pas votre forfait data
        </Text>
      </View>

      <Sheet open={pickCountry} onClose={() => setPickCountry(false)} title="Indicatif du pays">
        {COUNTRIES.map((item) => (
          <Pressable
            key={item.code}
            onPress={() => {
              setCountry(item);
              setPickCountry(false);
            }}
            style={[styles.countryRow, { borderColor: colors.border, backgroundColor: item.code === country.code ? colors.primarySoft : colors.card }]}
          >
            <Text variant="bodyMedium">
              {item.flag} {item.name}
            </Text>
            <Text tone="muted">{item.code}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

function EmailForm({ onSuccess }: { onSuccess: (tokens: Tokens, created: boolean) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ identifier: '', username: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const response =
        mode === 'login'
          ? await authApi.login(form.identifier.trim(), form.password)
          : await authApi.register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      onSuccess(response.tokens, response.created);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {mode === 'login' ? (
        <TextField
          label="E-mail ou nom d'utilisateur"
          value={form.identifier}
          onChangeText={(identifier) => setForm({ ...form, identifier })}
          autoCapitalize="none"
          autoComplete="username"
        />
      ) : (
        <>
          <TextField
            label="Nom d'utilisateur"
            hint="3 à 30 caractères : lettres, chiffres, _"
            value={form.username}
            onChangeText={(username) => setForm({ ...form, username })}
            autoCapitalize="none"
          />
          <TextField
            label="E-mail"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </>
      )}
      <TextField
        label="Mot de passe"
        hint={mode === 'register' ? '8 caractères minimum' : undefined}
        value={form.password}
        onChangeText={(password) => setForm({ ...form, password })}
        secureTextEntry
        autoComplete={mode === 'login' ? 'password' : 'new-password'}
      />
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'} size="lg" loading={loading} onPress={submit} />
      <Pressable
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        accessibilityRole="button"
        style={styles.switch}
      >
        <Text tone="muted">{mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà membre ? '}</Text>
        <Text variant="bodyMedium" tone="primary">
          {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.xs, paddingRight: space.md, paddingVertical: 4 },
  content: { padding: space.margin, gap: space.lg, paddingBottom: 64 },
  github: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: radius.full },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  phone: { flexDirection: 'row', height: 52, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  country: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRightWidth: StyleSheet.hairlineWidth },
  number: { flex: 1, minWidth: 0, paddingHorizontal: 14, fontSize: 18 },
  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  switch: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
