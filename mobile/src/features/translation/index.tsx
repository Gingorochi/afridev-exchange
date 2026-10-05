import type { Schemas } from '@afridev/api-client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { api, ApiError, errorMessage, unwrap } from '@/shared/api';
import { useSession } from '@/shared/session';
import { radius, useTheme } from '@/shared/theme';
import { Markdown, PillAction, Text } from '@/shared/ui';

type Translation = Schemas['TranslationOutput'];

async function waitFor(first: Translation): Promise<Translation> {
  let current = first;
  for (let attempt = 0; current.status === 'pending' && attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    current = await unwrap(api.GET('/api/translation/{translation_id}/', { params: { path: { translation_id: current.id } } }));
  }
  if (current.status !== 'ready') throw new ApiError('Traduction indisponible pour le moment.', 'translation_failed', 0);
  return current;
}

type Mode = 'translate' | 'simplify';

/**
 * « Traduire » / « Vulgariser » (icônes seules, comme le web) ; le résultat occupe ensuite
 * toute la largeur sous la barre d'actions (le parent est en flexWrap).
 */
export function TranslateButton({ text }: { text: string }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const [result, setResult] = useState<{ mode: Mode; text: string } | null>(null);
  const mutation = useMutation({
    mutationFn: async (mode: Mode) => {
      const first = await unwrap(api.POST('/api/translation/', { body: { text, target_language: 'fr', mode } }));
      return { mode, translation: await waitFor(first) };
    },
    onSuccess: ({ mode, translation }) => setResult({ mode, text: translation.result ?? '' }),
  });
  if (!isAuthenticated) return null;
  const toggle = (mode: Mode) => (result?.mode === mode ? setResult(null) : mutation.mutate(mode));
  const pending = mutation.isPending ? mutation.variables : null;
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
        <PillAction icon="languages" a11y="Traduire" loading={pending === 'translate'} onPress={() => toggle('translate')} />
        <PillAction icon="lightbulb" a11y="Vulgariser" loading={pending === 'simplify'} onPress={() => toggle('simplify')} />
      </View>
      {mutation.isError ? (
        <Text variant="small" tone="danger" style={{ width: '100%' }}>
          {errorMessage(mutation.error)}
        </Text>
      ) : null}
      {result ? (
        <View style={{ width: '100%', marginTop: 4, padding: 14, borderRadius: radius.xl, backgroundColor: colors.tertiarySoft, gap: 4 }}>
          <Text variant="label" tone="tertiary">
            {result.mode === 'translate' ? 'Traduction IA' : 'Version vulgarisée par l’IA'}
          </Text>
          <Markdown source={result.text} />
        </View>
      ) : null}
    </>
  );
}
