import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { RequireAuth } from '@/shared/layout';
import { type MediaAsset, pickMedia, uploadMedia } from '@/shared/media';
import { useNetwork } from '@/shared/offline';
import { useSecretScan } from '@/shared/security-guard';
import { radius, space, useTheme } from '@/shared/theme';
import { Button, Icon, Pill, Screen, ScreenHeader, SecretAlert, TagInput, Text, TextField, useToast } from '@/shared/ui';

import { useCreatePost } from '../api';

type Step = 'idle' | 'compressing' | 'ready';

export function ComposeShortScreen() {
  return (
    <RequireAuth title="Vidéo courte">
      <ShortComposer />
    </RequireAuth>
  );
}

/**
 * Vidéo courte (≤ 30 s) : compressée sur le téléphone (react-native-compressor) avant l'envoi,
 * puis découpée côté serveur en HLS 240p → 720p.
 */
function ShortComposer() {
  const { colors } = useTheme();
  const network = useNetwork();
  const toast = useToast();
  const create = useCreatePost();
  const [step, setStep] = useState<Step>('idle');
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const findings = useSecretScan(caption);

  async function choose() {
    const file = await pickMedia('video');
    if (!file) return;
    setError(null);
    setStep('compressing');
    try {
      setMedia(await uploadMedia(file, 'video'));
      setStep('ready');
    } catch (e) {
      setError(errorMessage(e));
      setStep('idle');
    }
  }

  async function publish() {
    if (!media) return;
    setError(null);
    try {
      await create.mutateAsync({ kind: 'short', body: caption.trim(), media_id: media.id, tags });
      toast('Vidéo publiée : elle sera disponible une fois traitée.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title="Vidéo courte" subtitle="30 secondes maximum" back />}
        footer={
          <Button
            label="Publier la vidéo"
            iconRight="send"
            size="lg"
            disabled={step !== 'ready' || findings.length > 0 || !network.isOnline}
            loading={create.isPending}
            onPress={publish}
          />
        }
      >
        {!network.isOnline ? (
          <Pill tone="warning" icon="wifi-off" label="Réseau requis pour envoyer une vidéo" />
        ) : null}
        <Pressable
          onPress={choose}
          disabled={step === 'compressing' || !network.isOnline}
          accessibilityRole="button"
          accessibilityLabel="Choisir une vidéo"
          style={[styles.picker, { borderColor: step === 'ready' ? colors.secondary : colors.borderStrong, backgroundColor: colors.container }]}
        >
          <View style={[styles.pickerIcon, { backgroundColor: step === 'ready' ? colors.secondaryMint : colors.primarySoft }]}>
            <Icon name={step === 'ready' ? 'check' : 'film'} size={32} tone={step === 'ready' ? 'secondary' : 'primary'} />
          </View>
          <Text variant="headlineMd" center>
            {step === 'compressing' ? 'Compression et envoi…' : step === 'ready' ? 'Vidéo prête' : 'Choisir une vidéo'}
          </Text>
          <Text variant="small" tone="muted" center>
            {step === 'compressing'
              ? 'La vidéo est allégée sur votre téléphone pour économiser votre forfait.'
              : step === 'ready'
                ? 'Touchez pour en choisir une autre.'
                : 'Format vertical conseillé. Compressée avant l’envoi, puis diffusée en 240p à 720p selon le réseau.'}
          </Text>
        </Pressable>

        <TextField
          label="Légende"
          value={caption}
          onChangeText={setCaption}
          placeholder="De quoi parle votre vidéo ?"
          multiline
          maxLength={500}
          counter={`${caption.length} / 500`}
          style={{ minHeight: 80 }}
        />
        <View style={{ gap: space.sm }}>
          <Text variant="label">Tags</Text>
          <TagInput value={tags} onChange={setTags} max={8} />
        </View>
        <SecretAlert findings={findings} />
        {error ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  picker: { alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
  pickerIcon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
