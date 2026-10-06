import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/shared/api';
import { useNetwork } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import { Button, Icon, Pill, Sheet, Text, TextField, useToast } from '@/shared/ui';

import { useApply, useMyApplications } from '../api';

const STATUS = {
  pending: { label: 'Candidature envoyée', tone: 'warning' },
  accepted: { label: 'Candidature acceptée', tone: 'success' },
  declined: { label: 'Candidature déclinée', tone: 'neutral' },
} as const;

/** « Proposer ma contribution » : panneau du bas avec un message au porteur du projet. */
export function ApplyButton({ projectId, ownerUsername }: { projectId: string; ownerUsername?: string }) {
  const { colors } = useTheme();
  const { isAuthenticated, profile } = useSession();
  const network = useNetwork();
  const applications = useMyApplications();
  const apply = useApply(projectId);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  if (!isAuthenticated) {
    return <Button label="Proposer ma contribution" icon="git-pull-request" size="lg" onPress={() => router.push('/login')} />;
  }
  const existing = applications.data?.find((application) => application.project_id === projectId);
  if (existing) {
    const status = STATUS[existing.status];
    return <Pill tone={status.tone} icon="send" label={status.label} style={{ alignSelf: 'center', paddingVertical: 10 }} />;
  }

  async function send() {
    try {
      await apply.mutateAsync(message.trim());
      setOpen(false);
      toast('Candidature envoyée : le porteur du projet est prévenu.');
    } catch {
      // erreur affichée dans le panneau
    }
  }

  return (
    <>
      <Button label="Proposer ma contribution" icon="git-pull-request" size="lg" onPress={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Proposer ma contribution"
        subtitle="Votre profil AfriDev sera joint automatiquement."
        footer={
          <Button
            label="Envoyer ma candidature"
            icon="send"
            size="lg"
            loading={apply.isPending}
            disabled={!network.isOnline}
            onPress={send}
          />
        }
      >
        <TextField
          label="Message au mainteneur"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          counter={`${message.length} / 1000`}
          placeholder={`Bonjour${ownerUsername ? ` @${ownerUsername}` : ''}, je souhaite contribuer…`}
          style={{ minHeight: 120 }}
        />
        {profile ? (
          <View style={[styles.profile, { backgroundColor: colors.container }]}>
            <Icon name="paperclip" size={16} tone="muted" />
            <Text variant="monoSm" tone="muted" style={{ flex: 1 }}>
              AfriDev ID : @{profile.username}
              {profile.stack.length ? ` · ${profile.stack.slice(0, 3).join(', ')}` : ''}
            </Text>
            <Icon name="check-circle" size={16} tone="secondary" />
          </View>
        ) : null}
        {!network.isOnline ? (
          <View style={[styles.offline, { backgroundColor: colors.tertiarySoft }]}>
            <Icon name="wifi-off" size={16} tone="tertiary" />
            <Text variant="monoSm" tone="tertiary" style={{ flex: 1 }}>
              Hors ligne : votre message reste ici, envoyez-le au retour du réseau.
            </Text>
          </View>
        ) : null}
        {apply.isError ? (
          <Text variant="small" tone="danger" accessibilityRole="alert">
            {errorMessage(apply.error)}
          </Text>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 12, borderRadius: radius.md },
  offline: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: 12, borderRadius: radius.md },
});
