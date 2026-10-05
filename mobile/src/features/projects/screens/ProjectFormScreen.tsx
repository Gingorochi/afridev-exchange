import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { RequireAuth } from '@/shared/layout';
import { space } from '@/shared/theme';
import { Button, CardSkeleton, Screen, ScreenHeader, SwitchRow, TagInput, Text, TextField, useToast } from '@/shared/ui';

import { type ProjectInput, useProject, useSaveProject } from '../api';

const EMPTY: ProjectInput = { name: '', description: '', repo_url: '', tags: [], is_recruiting: true };

/** Création (sans `id`) ou modification d'un projet open source. */
export function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <RequireAuth title="Projet">
      <FormLoader id={id || undefined} />
    </RequireAuth>
  );
}

function FormLoader({ id }: { id?: string }) {
  const existing = useProject(id);
  if (id && !existing.data) {
    return (
      <Screen header={<ScreenHeader title="Modifier le projet" back />}>
        <CardSkeleton lines={5} />
      </Screen>
    );
  }
  const initial = existing.data
    ? {
        name: existing.data.name,
        description: existing.data.description,
        repo_url: existing.data.repo_url,
        tags: existing.data.tags,
        is_recruiting: existing.data.is_recruiting,
      }
    : EMPTY;
  return <ProjectForm id={id} initial={initial} />;
}

function ProjectForm({ id, initial }: { id?: string; initial: ProjectInput }) {
  const toast = useToast();
  const save = useSaveProject();
  const [form, setForm] = useState<ProjectInput>(initial);
  const update = (patch: Partial<ProjectInput>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    try {
      const outcome = await save.mutateAsync({ id, input: { ...form, name: form.name.trim(), repo_url: form.repo_url.trim() } });
      if (outcome.queued) {
        toast('Hors ligne : le projet sera publié au retour du réseau.', 'queued');
        router.back();
      } else {
        router.replace(`/project/${outcome.result.id}`);
      }
    } catch {
      // erreur affichée sous le formulaire
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<ScreenHeader title={id ? 'Modifier le projet' : 'Proposer un projet'} back />}
        footer={<Button label={id ? 'Enregistrer' : 'Publier le projet'} icon="save" size="lg" loading={save.isPending} disabled={!form.name.trim()} onPress={submit} />}
      >
        <Text tone="muted">Les good first issues de votre dépôt GitHub sont importées automatiquement.</Text>
        <TextField label="Nom du projet" value={form.name} onChangeText={(name) => update({ name })} maxLength={100} />
        <TextField
          label="Dépôt GitHub"
          value={form.repo_url}
          onChangeText={(repo_url) => update({ repo_url })}
          placeholder="https://github.com/organisation/depot"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          mono
        />
        <TextField
          label="Description"
          value={form.description}
          onChangeText={(description) => update({ description })}
          multiline
          maxLength={3000}
          style={{ minHeight: 120 }}
        />
        <View style={{ gap: space.sm }}>
          <Text variant="label">Technologies</Text>
          <TagInput value={form.tags} max={12} onChange={(tags) => update({ tags })} suggestions={['python', 'django', 'react', 'flutter', 'go']} />
          <Text variant="monoSm" tone="muted">
            Utilisées pour recommander le projet aux bons développeurs.
          </Text>
        </View>
        <SwitchRow
          title="Je cherche des contributeurs"
          description="Le projet apparaît dans les recommandations des développeurs."
          value={form.is_recruiting}
          onChange={(is_recruiting) => update({ is_recruiting })}
        />
        {save.isError ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {errorMessage(save.error)}
          </Text>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
