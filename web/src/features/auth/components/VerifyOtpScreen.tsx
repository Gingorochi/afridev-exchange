'use client';

import { ArrowRight, ChevronLeft, MessageSquareText, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/shared/api';
import { useIsClient } from '@/shared/hooks';
import { cn } from '@/shared/lib';
import { useSession } from '@/shared/session';
import { Button } from '@/shared/ui';

import { afterLogin, authApi, maskPhone, pendingPhone } from '../api';

const RESEND_AFTER = 45;
const LENGTH = 6;

interface OTPCredential extends Credential {
  code: string;
}

export function VerifyOtpScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const isClient = useIsClient();
  // Numéro saisi à l'étape précédente (sessionStorage, lu seulement dans le navigateur).
  const phone = isClient ? pendingPhone.get() : null;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(RESEND_AFTER);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isClient && !phone) router.replace('/login');
  }, [isClient, phone, router]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  /** Saisie (clavier, collage ou WebOTP) : vérification automatique au sixième chiffre. */
  function onCode(raw: string) {
    const next = raw.replace(/\D/g, '').slice(0, LENGTH);
    setCode(next);
    if (next.length === LENGTH) void verify(next);
  }

  async function verify(value: string) {
    if (!phone || value.length !== LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(phone, value);
      signIn(response.tokens);
      router.replace(response.created ? '/profile?welcome=1' : afterLogin.take());
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
      input.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  // WebOTP (Chrome Android) : le code reçu par SMS est rempli et vérifié automatiquement.
  useEffect(() => {
    if (!phone || !('OTPCredential' in window)) return;
    const controller = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: controller.signal } as CredentialRequestOptions)
      .then((credential) => {
        const otp = credential as OTPCredential | null;
        if (otp?.code) onCode(otp.code);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une écoute par numéro, pas à chaque rendu
  }, [phone]);

  async function resend() {
    if (!phone) return;
    setError(null);
    try {
      await authApi.requestOtp(phone);
      setRemaining(RESEND_AFTER);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/login" className="inline-flex h-9 items-center gap-1 rounded-full pr-3 text-body-sm font-semibold text-ink-muted hover:text-ink">
        <ChevronLeft className="size-5" aria-hidden /> Modifier le numéro
      </Link>

      <div className="space-y-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary-soft text-on-secondary-soft">
          <Smartphone className="size-7" aria-hidden />
        </span>
        <h1 className="text-headline-xl text-ink">Vérifiez votre téléphone</h1>
        <p className="text-body-md text-ink-muted">
          Saisissez le code à 6 chiffres envoyé par SMS au{' '}
          <span className="font-semibold text-ink tabular-nums">{phone ? maskPhone(phone) : '…'}</span>.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="otp" className="sr-only">
          Code reçu par SMS
        </label>
        {/* Un seul champ réel (collage, saisie auto du SMS) affiché comme 6 cases. */}
        <div className="relative" onClick={() => input.current?.focus()}>
          <input
            ref={input}
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={LENGTH}
            value={code}
            disabled={loading}
            autoFocus
            onChange={(event) => onCode(event.target.value)}
            className="absolute inset-0 opacity-0"
            aria-describedby="otp-help"
          />
          <div className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: LENGTH }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'flex h-14 items-center justify-center rounded-xl border-2 bg-card text-headline-lg text-ink tabular-nums transition-colors sm:h-16',
                  i === code.length ? 'border-primary ring-4 ring-primary/15' : code[i] ? 'border-line-strong' : 'border-line',
                )}
              >
                {code[i] ?? ''}
              </span>
            ))}
          </div>
        </div>
        <p id="otp-help" className="text-body-sm text-ink-faint">
          Le code est vérifié automatiquement au sixième chiffre.
        </p>
        {error ? (
          <p role="alert" className="text-body-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <Button size="lg" className="w-full" loading={loading} disabled={code.length !== LENGTH} onClick={() => verify(code)}>
        Valider <ArrowRight className="size-5" aria-hidden />
      </Button>

      <p className="text-center text-body-sm text-ink-muted">
        {remaining > 0 ? (
          <>
            Renvoyer un code dans <span className="font-semibold text-ink tabular-nums">0:{String(remaining).padStart(2, '0')}</span>
          </>
        ) : (
          <>
            Rien reçu ?{' '}
            <button type="button" onClick={resend} className="inline-flex items-center gap-1 font-semibold text-primary-ink hover:underline">
              <MessageSquareText className="size-4" aria-hidden /> Renvoyer le code
            </button>
          </>
        )}
      </p>
    </div>
  );
}