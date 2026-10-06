import type { Schemas } from '@afridev/api-client';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { apiFetch } from '@/shared/api';

import { compressImage, compressVideo } from './compress';

export type MediaAsset = Schemas['MediaOutput'];
export type MediaKind = 'image' | 'video' | 'audio';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

/** Galerie du téléphone : une image ou une vidéo de 30 s maximum. */
export async function pickMedia(kind: 'image' | 'video'): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'image' ? ['images'] : ['videos'],
    quality: 0.85,
    videoMaxDuration: 30,
    allowsEditing: kind === 'image',
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? (kind === 'image' ? 'photo.jpg' : 'video.mp4'),
    type: asset.mimeType ?? (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
  };
}

/** Compresse puis envoie le fichier (multipart) ; le backend produit les variantes légères. */
export async function uploadMedia(file: PickedFile, kind: MediaKind): Promise<MediaAsset> {
  let uri = file.uri;
  if (kind === 'image') uri = await compressImage(uri);
  if (kind === 'video') uri = await compressVideo(uri);

  const form = new FormData();
  form.append('kind', kind);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, file.name);
  } else {
    // React Native envoie le fichier directement depuis son URI locale.
    form.append('file', { uri, name: file.name, type: file.type.split(';')[0] } as unknown as Blob);
  }
  const response = await apiFetch('/api/media/', { method: 'POST', body: form });
  return (await response.json()) as MediaAsset;
}
