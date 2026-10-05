import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useAutosaveDraft } from '@/shared/drafts';
import { useSecretScan } from '@/shared/security-guard';
import { useSession } from '@/shared/session';
import { fonts, noFocusRing, radius, space, useTheme } from '@/shared/theme';
import { Avatar, Button, Icon, SecretAlert, Text, useToast } from '@/shared/ui';

import { type Comment, discussionKeys, sendComment } from '../api';

/** Barre de réponse collée au bas de l'écran (zone du pouce). */
export function CommentComposer({
  postId,
  replyTo,
  onCancelReply,
}: {
  postId: string;
  replyTo: Comment | null;
  onCancelReply: () => void;
}) {
  const { colors } = useTheme();
  const { isAuthenticated, profile } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const draft = useAutosaveDraft(`comment:${postId}`, body, setBody);
  const findings = useSecretScan(body);

  if (!isAuthenticated) {
    return <Button label="Se connecter pour répondre" icon="log-in" onPress={() => router.push('/login')} full />;
  }

  async function submit() {
    if (!body.trim() || findings.length) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendComment(postId, body.trim(), replyTo?.id);
      setBody('');
      draft.clear();
      onCancelReply();
      if (result.queued) toast('Hors ligne : commentaire envoyé au retour du réseau.', 'queued');
      else void queryClient.invalidateQueries({ queryKey: discussionKeys.comments(postId) });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const insertCode = () => setBody((text) => `${text}${text && !text.endsWith(' ') ? ' ' : ''}\`code\``);

  return (
    <View style={{ gap: space.sm }}>
      {replyTo ? (
        <View style={[styles.replying, { backgroundColor: colors.container }]}>
          <Text variant="small" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
            En réponse à {replyTo.author?.display_name || replyTo.author?.username || 'ce commentaire'}
          </Text>
          <Pressable onPress={onCancelReply} hitSlop={8} accessibilityRole="button">
            <Text variant="label" tone="primary">
              Annuler
            </Text>
          </Pressable>
        </View>
      ) : null}
      <SecretAlert findings={findings} />
      <View style={styles.row}>
        <Avatar name={profile?.display_name || profile?.username || '?'} uri={profile?.avatar_url} size={36} />
        <View style={[styles.input, { backgroundColor: colors.container }]}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Ajouter une réponse technique…"
            placeholderTextColor={colors.inkFaint}
            multiline
            maxLength={2000}
            accessibilityLabel="Votre commentaire"
            style={[styles.textInput, { color: colors.ink, fontFamily: fonts.regular }]}
          />
          <Pressable onPress={insertCode} hitSlop={6} accessibilityRole="button" accessibilityLabel="Insérer du code">
            <Icon name="code" size={20} tone="muted" />
          </Pressable>
        </View>
        <Pressable
          onPress={submit}
          disabled={sending || !body.trim() || findings.length > 0}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          style={[styles.send, { backgroundColor: colors.primary, opacity: !body.trim() || findings.length ? 0.5 : 1 }]}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="arrow-up" size={22} color="#FFFFFF" />}
        </Pressable>
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    maxHeight: 140,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
  },
  textInput: { flex: 1, fontSize: 16, paddingVertical: 10, ...noFocusRing },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  replying: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.md },
});
