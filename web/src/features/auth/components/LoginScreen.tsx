'use client';

import { ArrowRight, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { errorMessage } from '@/shared/api';
import { cn } from '@/shared/lib';
import { useSession } from '@/shared/session';
import { Button, Field, Input, Segmented } from '@/shared/ui';

import {
  afterLogin,
  authApi,
  type AuthResponse,
  completeAuth,
  COUNTRIES,
  type OAuthProvider,
  oauthAvailable,
  pendingPhone,
  startOAuth,
} from '../api';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#E24329" d="m12 22 4-12.3H8z" />
      <path fill="#FC6D26" d="M12 22 8 9.7H2.4z" />
      <path fill="#FCA326" d="M2.4 9.7 1.2 13.4c-.1.3 0 .7.3.9L12 22z" />
      <path fill="#E24329" d="M2.4 9.7h5.6L5.6 2.3c-.1-.4-.7-.4-.8 0z" />
      <path fill="#FC6D26" d="m12 22 4-12.3h5.6z" />
      <path fill="#FCA326" d="m21.6 9.7 1.2 3.7c.1.3 0 .7-.3.9L12 22z" />
      <path fill="#E24329" d="M21.6 9.7H16l2.4-7.4c.1-.4.7-.4.8 0z" />
    </svg>
  );
}

function ProviderButton({ provider }: { provider: OAuthProvider }) {
  const available = oauthAvailable(provider);
  const label = provider === 'github' ? 'GitHub' : 'GitLab';
  return (
    <button
      type="button"
      disabled={!available}
      title={available ? undefined : `Connexion ${label} non configurée sur ce serveur`}
      onClick={() => startOAuth(provider)}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-body-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        provider === 'github'
          ? 'bg-ink text-card hover:bg-ink/90'
          : 'border border-line-strong bg-card text-ink hover:bg-container-low',
      )}
    >
      {provider === 'github' ? <GitHubIcon /> : <GitLabIcon />}
      Continuer avec {label}
    </button>
  );
}

type Method = 'phone' | 'email';

export function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useSession();
  const [method, setMethod] = useState<Method>('phone');
  const anyProvider = oauthAvailable('github') || oauthAvailable('gitlab');

  // Lu dans un effet (pas useSearchParams) : la page reste entièrement pré-rendue et s'hydrate d'un bloc.
  useEffect(() => {
    afterLogin.set(new URLSearchParams(window.location.search).get('next'));
  }, []);

  // Connecté (ou déjà connecté) : retour à la page demandée avant la connexion.
  useEffect(() => {
    if (isAuthenticated) router.replace(afterLogin.take());
  }, [isAuthenticated, router]);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-headline-xl text-ink">Bienvenue sur AfriDev</h1>
        <p className="text-body-md text-ink-muted">Connectez-vous ou créez votre compte en quelques secondes.</p>
      </div>

      <div className="space-y-2.5">
        <ProviderButton provider="github" />
        <ProviderButton provider="gitlab" />
        {!anyProvider ? (
          <p className="text-center text-body-sm text-ink-faint">La connexion GitHub / GitLab n&apos;est pas configurée sur ce serveur.</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 text-body-sm font-medium text-ink-faint">
        <span className="h-px flex-1 bg-line" aria-hidden />
        ou
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <div className="space-y-4">
        <Segmented<Method>
          className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
          value={method}
          onChange={setMethod}
          options={[
            {
              value: 'phone',
              label: (
                <>
                  <Smartphone className="size-4" aria-hidden /> Téléphone
                </>
              ),
            },
            {
              value: 'email',
              label: (
                <>
                  <Mail className="size-4" aria-hidden /> E-mail
                </>
              ),
            },
          ]}
        />
        {method === 'phone' ? (
          <PhoneForm />
        ) : (
          <EmailForm onSuccess={(response) => completeAuth(response, signIn) || router.push('/verify-2fa')} />
        )}
      </div>

      <p className="text-center text-body-sm text-ink-faint">
        <Lock className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
        En continuant, vous acceptez les règles de la communauté AfriDev.
      </p>
    </div>
  );
}

function PhoneForm() {
  const router = useRouter();
  const [country, setCountry] = useState('+228');
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { phone_number } = await authApi.requestOtp(`${country}${number.replace(/\D/g, '')}`);
      pendingPhone.set(phone_number);
      router.push('/verify-otp');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-body-sm font-semibold text-ink">
          Numéro de mobile
        </label>
        {/* Indicatif et numéro dans un seul champ visuel. */}
        <div className="flex h-12 overflow-hidden rounded-lg border border-line bg-card transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 hover:border-line-strong">
          <select
            aria-label="Indicatif du pays"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-28 shrink-0 border-r border-line bg-container-low pl-3 text-body-md text-ink focus:outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} {c.code}
              </option>
            ))}
          </select>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="90 12 34 56"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3.5 text-body-lg text-ink tabular-nums placeholder:text-ink-faint focus:outline-none"
            required
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Recevoir mon code par SMS <ArrowRight className="size-5" aria-hidden />
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-body-sm text-ink-muted">
        <ShieldCheck className="size-4 text-secondary" aria-hidden />
        Gratuit : le SMS ne consomme pas votre forfait data
      </p>
    </form>
  );
}

function EmailForm({ onSuccess }: { onSuccess: (response: AuthResponse) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ identifier: '', username: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response =
        mode === 'login'
          ? await authApi.login(form.identifier, form.password)
          : await authApi.register({ username: form.username, email: form.email, password: form.password });
      onSuccess(response);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'login' ? (
        <Field label="E-mail ou nom d'utilisateur" htmlFor="identifier">
          <Input id="identifier" autoComplete="username" value={form.identifier} onChange={set('identifier')} className="h-12" required />
        </Field>
      ) : (
        <>
          <Field label="Nom d'utilisateur" hint="3 à 30 caractères : lettres, chiffres, _" htmlFor="username">
            <Input
              id="username"
              autoComplete="username"
              value={form.username}
              onChange={set('username')}
              className="h-12"
              required
              pattern="[A-Za-z0-9_]{3,30}"
            />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className="h-12" required />
          </Field>
        </>
      )}
      <Field label="Mot de passe" htmlFor="password" hint={mode === 'register' ? '8 caractères minimum' : undefined}>
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? 8 : undefined}
          value={form.password}
          onChange={set('password')}
          className="h-12"
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="text-body-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </Button>
      <p className="text-center text-body-sm text-ink-muted">
        {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà membre ?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="font-semibold text-primary-ink hover:underline"
        >
          {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
        </button>
      </p>
    </form>
  );
}
