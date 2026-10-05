import type { Schemas } from '@afridev/api-client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { api, errorMessage, unwrap } from '@/shared/api';
import { useSession } from '@/shared/session';
import { radius, space, useTheme } from '@/shared/theme';
import { Button, Icon, PillAction, Sheet, Text, TextField, useToast } from '@/shared/ui';

type Reason = Schemas['ReasonEnum'];

const REASONS: { value: Reason; label: string }[] = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'scam', label: 'Arnaque (faux recrutement, paiement suspect…)' },
  { value: 'abuse', label: 'Harcèlement ou propos haineux' },
  { value: 'secret', label: 'Donnée sensible exposée' },
  { value: 'off_topic', label: 'Hors sujet' },
  { value: 'other', label: 'Autre' },
];

/** Signaler un contenu : panneau du bas avec les motifs, pas de nouvelle page. */
export function ReportButton({ targetType, targetId }: { targetType: Schemas['TargetTypeEnum']; targetId: string }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [details, setDetails] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/moderation/reports/', { body: { target_type: targetType, target_id: targetId, reason, details } })),
    onSuccess: () => {
      setOpen(false);
      toast('Merci, la modération va examiner ce contenu.');
    },
  });
  if (!isAuthenticated) return null;
  return (
    <>
      <PillAction icon="flag" a11y="Signaler" onPress={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Signaler ce contenu"
        footer={<Button label="Envoyer le signalement" loading={mutation.isPending} onPress={() => mutation.mutate()} />}
      >
        {REASONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setReason(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: reason === option.value }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: 52,
              paddingHorizontal: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: reason === option.value ? colors.primary : colors.border,
              backgroundColor: reason === option.value ? colors.primarySoft : colors.card,
            }}
          >
            <Icon name={reason === option.value ? 'check-circle' : 'circle'} tone={reason === option.value ? 'primary' : 'faint'} />
            <Text style={{ flex: 1 }}>{option.label}</Text>
          </Pressable>
        ))}
        <TextField label="Précisions (facultatif)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
        {mutation.isError ? (
          <View>
            <Text variant="small" tone="danger">
              {errorMessage(mutation.error)}
            </Text>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}
