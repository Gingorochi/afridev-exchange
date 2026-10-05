import {
  type RecordingOptions,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { radius, space, useTheme } from '@/shared/theme';
import { Icon, Pill, Text } from '@/shared/ui';

import { transcribeVoice } from '../api';

const MAX_MS = 120_000;

/** Voix mono à faible débit (AAC 32 kb/s, ~4 Ko/s) ; le serveur la convertit en Opus. */
const VOICE: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 32_000,
};

/** « Poser à la voix » : enregistrement, transcription Whisper, texte ajouté à la question. */
export function VoiceButton({ onTranscript }: { onTranscript: (text: string, mediaId: string) => void }) {
  const { colors } = useTheme();
  const recorder = useAudioRecorder(VOICE);
  const state = useAudioRecorderState(recorder, 500);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Accès au micro refusé. Autorisez-le dans les réglages du téléphone.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) return;
    setTranscribing(true);
    try {
      const { text, mediaId } = await transcribeVoice({ uri, name: 'question.m4a', type: 'audio/mp4' });
      onTranscript(text, mediaId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setTranscribing(false);
    }
  }

  // Arrêt automatique au bout de 2 minutes.
  const tooLong = state.isRecording && state.durationMillis >= MAX_MS;
  useEffect(() => {
    if (tooLong) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooLong]);

  const seconds = Math.floor(state.durationMillis / 1000);
  const recording = state.isRecording;

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => (recording ? void stop() : void start())}
        disabled={transcribing}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Arrêter l’enregistrement' : 'Poser la question à la voix'}
        style={[
          styles.button,
          {
            backgroundColor: recording ? colors.dangerSoft : colors.card,
            borderColor: recording ? colors.danger : colors.border,
          },
        ]}
      >
        <View style={[styles.mic, { backgroundColor: recording ? colors.danger : colors.primarySoft }]}>
          {transcribing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Icon name={recording ? 'square' : 'mic'} size={22} color={recording ? '#FFFFFF' : colors.primaryInk} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">
            {recording
              ? `Enregistrement · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
              : transcribing
                ? 'Transcription en cours…'
                : 'Poser à la voix'}
          </Text>
          <Text variant="monoSm" tone="muted">
            {recording ? 'Touchez pour terminer (2 min max)' : 'Whisper transcrit votre message en texte'}
          </Text>
        </View>
        {!recording && !transcribing ? <Pill tone="mint" label="~4 Ko/s" /> : null}
      </Pressable>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 12, borderRadius: radius.lg, borderWidth: 1.5 },
  mic: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
