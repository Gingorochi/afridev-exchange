'use client';

import { ArrowRight, ChevronLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { errorMessage } from '@/shared/api';
import { useIsClient } from '@/shared/hooks';
import { useSession } from '@/shared/session';
import { Button, Input } from '@/shared/ui';

import { afterLogin, authApi, pendingMfa } from '../api';

/** Deuxième étape de connexion : le code à 6 chiffres de l'application d'authentification. */
export function VerifyTwoFactorScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const isClient = useIsClient();
  const challenge = isClient ? pendingMfa.get() : null;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isClient && !challenge) router.replace('/login');
  }, [isClient, challenge, router]);

  async function verify(value: string) {
    if (!challenge || value.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.loginMfa(challenge.token, value);
      if (!response.tokens) throw new Error('Connexion incomplète, recommencez.');
      pendingMfa.clear();
      signIn(response.tokens);
      router.replace(challenge.created ? '/profile?welcome=1' : afterLogin.take());
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/login" className="inline-flex items-center gap-1 text-body-sm font-medium text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden /> Retour
      </Link>
      <div className="space-y-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-line bg-container-low text-ink-muted">
          <KeyRound className="size-6" aria-hidden />
        </span>
        <h1 className="text-headline-xl text-ink">Double authentification</h1>
        <p className="text-body-md text-ink-muted">
          Ouvrez votre application d&apos;authentification (Google Authenticator, Aegis, 2FAS…) et saisissez le code
          affiché pour AfriDev Exchange.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
      >
        <label htmlFor="totp" className="sr-only">
          Code à 6 chiffres
        </label>
        <Input
          id="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          disabled={loading}
          placeholder="123 456"
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(next);
            if (next.length === 6) void verify(next);
          }}
          className="h-14 text-center font-mono text-headline-lg tracking-[0.4em]"
        />
        {error ? (
          <p role="alert" className="text-body-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== 6}>
          Valider <ArrowRight className="size-5" aria-hidden />
        </Button>
      </form>
      <p className="text-body-sm text-ink-faint">Le code change toutes les 30 secondes. Ce lien de connexion expire après 5 minutes.</p>
    </div>
  );
}
