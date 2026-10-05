import { useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { space } from '@/shared/theme';
import { Button, Sheet, SwitchRow, TagInput, Text, TextField } from '@/shared/ui';

import { type MyProfile, useUpdateProfile } from '../api';

export function EditProfileSheet({ profile, open, onClose }: { profile: MyProfile; open: boolean; onClose: () => void }) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    display_name: profile.display_name,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    github_username: profile.github_username,
    stack: profile.stack,
    open_to_work: profile.open_to_work,
  });
  const patch = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }));

  async function submit() {
    try {
      await update.mutateAsync(form);
      onClose();
    } catch {
      // erreur affichée dans le panneau
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Modifier mon profil"
      tall
      footer={<Button label="Enregistrer" icon="save" size="lg" loading={update.isPending} onPress={submit} />}
    >
      <TextField label="Nom affiché" value={form.display_name} maxLength={80} onChangeText={(display_name) => patch({ display_name })} />
      <TextField
        label="Bio"
        value={form.bio}
        maxLength={600}
        counter={`${form.bio.length} / 600`}
        multiline
        onChangeText={(bio) => patch({ bio })}
        style={{ minHeight: 100 }}
      />
      <TextField label="Ville, pays" value={form.location} maxLength={80} placeholder="Lomé, Togo" icon="map-pin" onChangeText={(location) => patch({ location })} />
      <TextField
        label="Pseudo GitHub"
        value={form.github_username}
        maxLength={39}
        autoCapitalize="none"
        autoCorrect={false}
        icon="github"
        onChangeText={(github_username) => patch({ github_username })}
      />
      <TextField
        label="Site web"
        value={form.website}
        placeholder="https://"
        keyboardType="url"
        autoCapitalize="none"
        icon="globe"
        onChangeText={(website) => patch({ website })}
      />
      <View style={{ gap: space.sm }}>
        <Text variant="label">Stack technique (20 max)</Text>
        <TagInput value={form.stack} max={20} onChange={(stack) => patch({ stack })} suggestions={['python', 'django', 'react', 'flutter', 'node', 'go']} />
        <Text variant="monoSm" tone="muted">
          Sert aux recommandations de projets.
        </Text>
      </View>
      <SwitchRow
        title="Ouvert aux opportunités"
        description="Missions freelance, emploi, contributions rémunérées."
        value={form.open_to_work}
        onChange={(open_to_work) => patch({ open_to_work })}
      />
      {update.isError ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {errorMessage(update.error)}
        </Text>
      ) : null}
    </Sheet>
  );
}
