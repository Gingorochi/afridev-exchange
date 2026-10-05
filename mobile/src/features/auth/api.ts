import type { Schemas } from '@afridev/api-client';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { api, ApiError, GITHUB_CLIENT_ID, unwrap } from '@/shared/api';
import { uuid } from '@/shared/offline';
import { settingsStore } from '@/shared/storage';

export type AuthResponse = Schemas['AuthResponse'];

export const authApi = {
  login: (identifier: string, password: string) =>
    unwrap(api.POST('/api/accounts/login/', { body: { identifier, password } })),
  register: (body: Schemas['RegisterInputRequest']) => unwrap(api.POST('/api/accounts/register/', { body })),
  requestOtp: (phone_number: string) => unwrap(api.POST('/api/accounts/otp/request/', { body: { phone_number } })),
  verifyOtp: (phone_number: string, code: string) =>
    unwrap(api.POST('/api/accounts/otp/verify/', { body: { phone_number, code } })),
};

export const COUNTRIES = [
  { code: '+228', flag: '🇹🇬', name: 'Togo' },
  { code: '+229', flag: '🇧🇯', name: 'Bénin' },
  { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: '+227', flag: '🇳🇪', name: 'Niger' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+243', flag: '🇨🇩', name: 'RD Congo' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
];

export function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 6)} •• •• ${phone.slice(-2)}` : phone;
}

export const markOnboarded = () => settingsStore.set('onboarded', true);

export const githubAvailable = () => Boolean(GITHUB_CLIENT_ID);

/**
 * Connexion GitHub : navigateur sécurisé du système, retour dans l'appli par le lien
 * afridev://oauth. Le paramètre state protège contre la falsification de la réponse.
 */
export async function loginWithGitHub(): Promise<AuthResponse | null> {
  const redirectUri = Linking.createURL('oauth');
  const state = `github:${uuid()}`;
  const url =
    `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=${encodeURIComponent(state)}`;
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== 'success') return null;
  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.state !== state || typeof queryParams.code !== 'string') {
    throw new ApiError('Connexion GitHub interrompue ou invalide.', 'oauth_failed', 0);
  }
  return unwrap(
    api.POST('/api/accounts/oauth/{provider}/', {
      params: { path: { provider: 'github' } },
      body: { code: queryParams.code, redirect_uri: redirectUri },
    }),
  );
}
