'use client';

import type { Schemas } from '@afridev/api-client';

import { api, GITHUB_CLIENT_ID, GITLAB_CLIENT_ID, GITLAB_URL, unwrap } from '@/shared/api';

export type AuthResponse = Schemas['AuthResponse'];
export type OAuthProvider = 'github' | 'gitlab';

const PHONE_KEY = 'afridev.otp-phone';
const STATE_KEY = 'afridev.oauth-state';
const NEXT_KEY = 'afridev.after-login';
const MFA_KEY = 'afridev.mfa';

export const authApi = {
  login: (identifier: string, password: string) =>
    unwrap(api.POST('/api/accounts/login/', { body: { identifier, password } })),
  register: (body: Schemas['RegisterInputRequest']) =>
    unwrap(api.POST('/api/accounts/register/', { body })),
  requestOtp: (phone_number: string) =>
    unwrap(api.POST('/api/accounts/otp/request/', { body: { phone_number } })),
  verifyOtp: (phone_number: string, code: string) =>
    unwrap(api.POST('/api/accounts/otp/verify/', { body: { phone_number, code } })),
  loginMfa: (mfa_token: string, code: string) =>
    unwrap(api.POST('/api/accounts/login/2fa/', { body: { mfa_token, code } })),
  oauth: (provider: OAuthProvider, code: string, redirect_uri: string) =>
    unwrap(
      api.POST('/api/accounts/oauth/{provider}/', {
        params: { path: { provider } },
        body: { code, redirect_uri },
      }),
    ),
};

/** Connexion en deux temps (double authentification) : jeton signé valable 5 minutes. */
export const pendingMfa = {
  get: (): { token: string; created: boolean } | null => {
    try {
      return JSON.parse(sessionStorage.getItem(MFA_KEY) ?? 'null');
    } catch {
      return null;
    }
  },
  set: (token: string, created: boolean) => sessionStorage.setItem(MFA_KEY, JSON.stringify({ token, created })),
  clear: () => sessionStorage.removeItem(MFA_KEY),
};

/**
 * Suite commune à toutes les méthodes de connexion : ouvre la session, ou, si la double
 * authentification est active, mémorise le défi et renvoie false (l'appelant redirige vers /verify-2fa).
 */
export function completeAuth(response: AuthResponse, signIn: (tokens: Schemas['Tokens']) => void): boolean {
  if (response.mfa_required && response.mfa_token) {
    pendingMfa.set(response.mfa_token, response.created);
    return false;
  }
  if (response.tokens) signIn(response.tokens);
  return Boolean(response.tokens);
}

export const pendingPhone = {
  get: () => sessionStorage.getItem(PHONE_KEY),
  set: (phone: string) => sessionStorage.setItem(PHONE_KEY, phone),
  clear: () => sessionStorage.removeItem(PHONE_KEY),
};

/** Page où revenir après la connexion (paramètre ?next=, limité au site). */
export const afterLogin = {
  set: (next: string | null) => {
    if (next?.startsWith('/') && !next.startsWith('//')) sessionStorage.setItem(NEXT_KEY, next);
  },
  take: (): string => {
    const next = sessionStorage.getItem(NEXT_KEY) ?? '/feed';
    sessionStorage.removeItem(NEXT_KEY);
    return next;
  },
};

export function oauthAvailable(provider: OAuthProvider): boolean {
  return Boolean(provider === 'github' ? GITHUB_CLIENT_ID : GITLAB_CLIENT_ID);
}

export const oauthRedirectUri = () => `${window.location.origin}/oauth/callback`;

/** Redirige vers GitHub / GitLab ; le paramètre state protège contre la falsification (CSRF). */
export function startOAuth(provider: OAuthProvider) {
  const state = `${provider}:${crypto.randomUUID()}`;
  sessionStorage.setItem(STATE_KEY, state);
  const redirect = encodeURIComponent(oauthRedirectUri());
  const url =
    provider === 'github'
      ? `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirect}&scope=read:user%20user:email&state=${encodeURIComponent(state)}`
      : `${GITLAB_URL}/oauth/authorize?client_id=${GITLAB_CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=read_user&state=${encodeURIComponent(state)}`;
  window.location.assign(url);
}

/** Vérifie le state renvoyé par le fournisseur et en déduit lequel il est. */
export function consumeOAuthState(state: string | null): OAuthProvider | null {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!state || state !== expected) return null;
  const provider = state.split(':')[0];
  return provider === 'github' || provider === 'gitlab' ? provider : null;
}

export const COUNTRIES = [
  { code: '+228', label: 'TG', name: 'Togo' },
  { code: '+229', label: 'BJ', name: 'Bénin' },
  { code: '+225', label: 'CI', name: "Côte d'Ivoire" },
  { code: '+221', label: 'SN', name: 'Sénégal' },
  { code: '+226', label: 'BF', name: 'Burkina Faso' },
  { code: '+223', label: 'ML', name: 'Mali' },
  { code: '+227', label: 'NE', name: 'Niger' },
  { code: '+237', label: 'CM', name: 'Cameroun' },
  { code: '+233', label: 'GH', name: 'Ghana' },
  { code: '+234', label: 'NG', name: 'Nigeria' },
  { code: '+243', label: 'CD', name: 'RD Congo' },
  { code: '+250', label: 'RW', name: 'Rwanda' },
  { code: '+254', label: 'KE', name: 'Kenya' },
  { code: '+212', label: 'MA', name: 'Maroc' },
  { code: '+33', label: 'FR', name: 'France' },
];

export function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 6)} •• •• ${phone.slice(-2)}` : phone;
}
