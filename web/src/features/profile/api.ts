'use client';

import type { Schemas } from '@afridev/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, API_URL, unwrap } from '@/shared/api';
import { MY_PROFILE_KEY } from '@/shared/session';

export type PublicProfile = Schemas['PublicProfile'];
export type MyProfile = Schemas['MyProfile'];
export type ProfileUpdate = Schemas['PatchedProfileUpdateRequest'];

export const profileKeys = {
  public: (username: string) => ['profiles', username.toLowerCase()] as const,
};

export function usePublicProfile(username: string, initialData?: PublicProfile) {
  return useQuery({
    queryKey: profileKeys.public(username),
    queryFn: () => unwrap(api.GET('/api/profiles/{username}/', { params: { path: { username } } })),
    initialData,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileUpdate) => unwrap(api.PATCH('/api/profiles/me/', { body: changes })),
    onSuccess: (profile) => {
      queryClient.setQueryData(MY_PROFILE_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: profileKeys.public(profile.username) });
    },
  });
}

/** Demande une bio à l'IA puis suit la suggestion jusqu'à ce qu'elle soit prête. */
export function useAiBio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      let profile = await unwrap(api.POST('/api/profiles/me/ai-bio/'));
      for (let attempt = 0; profile.ai_bio_status === 'pending' && attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        profile = await unwrap(api.GET('/api/profiles/me/'));
      }
      return profile;
    },
    onSuccess: (profile) => queryClient.setQueryData(MY_PROFILE_KEY, profile),
  });
}

export const qrCodeUrl = (username: string) => `${API_URL}/api/profiles/${encodeURIComponent(username)}/qr.svg`;
