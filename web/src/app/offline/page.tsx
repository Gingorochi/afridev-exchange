import { CloudOff } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClasses, LogoMark } from '@/shared/ui';

export const metadata: Metadata = { title: 'Hors ligne' };

/** Page de secours du service worker : affichée quand une page jamais visitée est demandée hors ligne. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark size={48} />
      <CloudOff className="size-10 text-offline" aria-hidden />
      <h1 className="text-headline-lg">Vous êtes hors ligne</h1>
      <p className="text-body-md text-ink-muted">
        Cette page n&apos;a pas encore été enregistrée sur votre appareil. Les pages déjà visitées,
        votre coffre de snippets et vos brouillons restent disponibles.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/snippets" className={buttonClasses()}>Mon coffre</Link>
        <Link href="/feed" className={buttonClasses({ variant: 'ghost' })}>Le fil</Link>
      </div>
    </main>
  );
}
