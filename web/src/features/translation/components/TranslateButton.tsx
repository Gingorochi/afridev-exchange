'use client';

import type { Schemas } from '@afridev/api-client';
import { useMutation } from '@tanstack/react-query';
import { Languages, Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { api, ApiError, errorMessage, unwrap } from '@/shared/api';
import { cn } from '@/shared/lib';
import { useSession } from '@/shared/session';
import { Markdown, pillAction, Spinner } from '@/shared/ui';

type Translation = Schemas['TranslationOutput'];
type Mode = 'translate' | 'simplify';

async function waitForTranslation(first: Translation): Promise<Translation> {
  let current = first;
  for (let attempt = 0; current.status === 'pending' && attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    current = await unwrap(
      api.GET('/api/translation/{translation_id}/', { params: { path: { translation_id: current.id } } }),
    );
  }
  if (current.status !== 'ready') throw new ApiError('Traduction indisponible pour le moment.', 'translation_failed', 0);
  return current;
}

/** « Traduire » / « Vulgariser » un contenu ; le résultat est mis en cache côté serveur. */
export function TranslateButton({ text, className, tinted = false }: { text: string; className?: string; tinted?: boolean }) {
  const { isAuthenticated } = useSession();
  const [result, setResult] = useState<{ mode: Mode; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: async (mode: Mode) => {
      // Vers la langue du navigateur (français par défaut).
      const target = navigator.language?.startsWith('en') ? 'en' : 'fr';
      const first = await unwrap(
        api.POST('/api/translation/', { body: { text, target_language: target, mode } }),
      );
      return { mode, translation: await waitForTranslation(first) };
    },
    onSuccess: ({ mode, translation }) => setResult({ mode, text: translation.result ?? '' }),
  });

  if (!isAuthenticated) return null;
  // tinted : capsules grises de la barre d'actions d'un post (façon Reddit).
  const action = cn(pillAction, tinted && 'bg-container text-ink hover:bg-container-high');
  return (
    // display: contents : les boutons s'insèrent dans la barre d'actions du parent, la traduction
    // occupe ensuite toute la largeur (basis-full).
    <div className={cn('contents', className)}>
      <div className={cn('flex items-center', tinted && 'gap-2')}>
        <button
          type="button"
          onClick={() => (result?.mode === 'translate' ? setResult(null) : mutation.mutate('translate'))}
          aria-label="Traduire"
          title="Traduire"
          className={action}
        >
          <Languages className="size-4" aria-hidden />
          <span className="hidden sm:inline">{result?.mode === 'translate' ? 'Original' : 'Traduire'}</span>
        </button>
        <button
          type="button"
          onClick={() => (result?.mode === 'simplify' ? setResult(null) : mutation.mutate('simplify'))}
          aria-label="Vulgariser"
          title="Vulgariser"
          className={action}
        >
          <Lightbulb className="size-4" aria-hidden />
          <span className="hidden sm:inline">{result?.mode === 'simplify' ? 'Original' : 'Vulgariser'}</span>
        </button>
        {mutation.isPending ? <Spinner className="size-3.5 text-ink-faint" /> : null}
      </div>
      {mutation.isError ? <p className="basis-full text-body-sm text-danger">{errorMessage(mutation.error)}</p> : null}
      {result ? (
        <div className="mt-1 basis-full rounded-xl bg-tertiary-soft/50 p-3.5">
          <p className="mb-1 text-label-md font-bold text-on-tertiary-soft">
            {result.mode === 'translate' ? 'Traduction IA' : 'Version vulgarisée par l’IA'}
          </p>
          <Markdown source={result.text} />
        </div>
      ) : null}
    </div>
  );
}
