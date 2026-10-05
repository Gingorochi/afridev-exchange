import { postSchema } from '@afridev/validation';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useAutosaveDraft } from '@/shared/drafts';
import { RequireAuth } from '@/shared/layout';
import { type MediaAsset, MediaView, pickMedia, uploadMedia } from '@/shared/media';
import { redactSecrets, useSecretScan } from '@/shared/security-guard';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import {
  Avatar,
  Button,
  DraftBadge,
  Icon,
  type IconName,
  Screen,
  ScreenHeader,
  SecretAlert,
  TagInput,
  Text,
  TextField,
  useToast,
} from '@/shared/ui';

import { type PostKind, useCreatePost } from '../api';

interface Draft {
  kind: Exclude<PostKind, 'short'>;
  body: string;
  options: string[];
  tags: string[];
}

const EMPTY: Draft = { kind: 'text', body: '', options: ['', ''], tags: [] };

export function ComposePostScreen() {
  return (
    <RequireAuth title="Nouveau post">
      <Composer />
    </RequireAuth>
  );
}

function Composer() {
  const { colors } = useTheme();
  const { profile } = useSession();
  const toast = useToast();
  const create = useCreatePost();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autosave = useAutosaveDraft<Draft>('post:new', draft, setDraft);
  const findings = useSecretScan(draft.body, ...draft.options);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function addImage() {
    const file = await pickMedia('image');
    if (!file) return;
    update({ kind: 'image' });
    setUploading(true);
    setError(null);
    try {
      setMedia(await uploadMedia(file, 'image'));
    } catch (e) {
      setError(errorMessage(e));
      update({ kind: 'text' });
    } finally {
      setUploading(false);
    }
  }

  const insertCode = () => update({ body: `${draft.body}${draft.body ? '\n' : ''}\`\`\`python\n\n\`\`\`\n` });

  async function publish() {
    setError(null);
    const parsed = postSchema.safeParse({
      kind: draft.kind,
      body: draft.body,
      pollOptions: draft.kind === 'poll' ? draft.options.filter((option) => option.trim()) : [],
      mediaId: media?.id ?? null,
      tags: draft.tags,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Post invalide.');
      return;
    }
    try {
      const outcome = await create.mutateAsync({
        kind: parsed.data.kind,
        body: parsed.data.body,
        poll_options: parsed.data.pollOptions,
        media_id: parsed.data.mediaId ?? null,
        tags: parsed.data.tags,
      });
      autosave.clear();
      setDraft(EMPTY);
      toast(outcome.queued ? 'Hors ligne : votre post partira au retour du réseau.' : 'Post publié.', outcome.queued ? 'queued' : 'success');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const tools: { key: 'image' | 'poll' | 'code'; label: string; icon: IconName; onPress: () => void }[] = [
    { key: 'image', label: 'Image', icon: 'image', onPress: () => void addImage() },
    { key: 'poll', label: 'Sondage', icon: 'bar-chart-2', onPress: () => update({ kind: draft.kind === 'poll' ? 'text' : 'poll' }) },
    { key: 'code', label: 'Code', icon: 'code', onPress: insertCode },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title="Nouveau post" back right={<DraftBadge savedAt={autosave.savedAt} />} />}
        footer={
          <>
            <View style={styles.tools}>
              {tools.map((tool) => {
                const active = tool.key === draft.kind;
                return (
                  <Pressable
                    key={tool.key}
                    onPress={tool.onPress}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.tool, { backgroundColor: active ? colors.primarySoft : colors.container }]}
                  >
                    <Icon name={tool.icon} size={18} tone={active ? 'primary' : 'muted'} />
                    <Text variant="label" tone={active ? 'primary' : 'muted'}>
                      {tool.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label="Publier"
              iconRight="send"
              size="lg"
              loading={create.isPending}
              disabled={uploading || findings.length > 0 || (!draft.body.trim() && !media)}
              onPress={publish}
            />
          </>
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Avatar name={profile?.display_name || profile?.username || '?'} uri={profile?.avatar_url} />
          <View>
            <Text variant="bodyMedium">{profile?.display_name || profile?.username}</Text>
            <Text variant="monoSm" tone="muted">
              Visible par toute la communauté
            </Text>
          </View>
        </View>

        <TextField
          value={draft.body}
          onChangeText={(body) => update({ body })}
          placeholder={draft.kind === 'poll' ? 'Posez la question du sondage…' : 'Partager une astuce, un bug ou du code…'}
          multiline
          autoFocus
          maxLength={3000}
          counter={`${draft.body.length} / 3000`}
          accessibilityLabel="Votre post"
          style={{ minHeight: 160 }}
        />

        {draft.kind === 'poll' ? (
          <View style={{ gap: space.sm }}>
            {draft.options.map((option, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={option}
                    maxLength={80}
                    placeholder={`Choix ${index + 1}`}
                    accessibilityLabel={`Choix ${index + 1}`}
                    onChangeText={(text) => update({ options: draft.options.map((value, i) => (i === index ? text : value)) })}
                  />
                </View>
                {draft.options.length > 2 ? (
                  <Pressable
                    onPress={() => update({ options: draft.options.filter((_, i) => i !== index) })}
                    accessibilityLabel="Retirer ce choix"
                    hitSlop={8}
                  >
                    <Icon name="x" tone="muted" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {draft.options.length < 4 ? (
              <Button label="Ajouter un choix" icon="plus" variant="ghost" size="sm" onPress={() => update({ options: [...draft.options, ''] })} />
            ) : null}
          </View>
        ) : null}

        {draft.kind === 'image' ? (
          <View style={{ gap: space.sm }}>
            {uploading ? (
              <View style={[styles.uploading, { backgroundColor: colors.container }]}>
                <Text variant="small" tone="muted">
                  Compression et envoi de l’image…
                </Text>
              </View>
            ) : media ? (
              <MediaView media={media} />
            ) : null}
            <Button
              label="Retirer l’image"
              icon="trash-2"
              variant="ghost"
              size="sm"
              onPress={() => {
                setMedia(null);
                update({ kind: 'text' });
              }}
            />
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text variant="label">Tags</Text>
          <TagInput value={draft.tags} onChange={(tags) => update({ tags })} max={8} suggestions={['python', 'javascript', 'mobilemoney', 'django', 'react']} />
        </View>

        <SecretAlert findings={findings} onRedact={() => update({ body: redactSecrets(draft.body), options: draft.options.map(redactSecrets) })} />
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
  tools: { flexDirection: 'row', gap: space.sm },
  tool: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md },
  uploading: { padding: space.md, borderRadius: radius.lg, alignItems: 'center' },
});
