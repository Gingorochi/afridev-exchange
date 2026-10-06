import { isExpoGo } from '@/shared/runtime';

/**
 * Compression SUR LE TÉLÉPHONE avant l'envoi (le serveur produit ensuite le HLS 240p-720p
 * et les variantes WebP) : une vidéo de 30 s passe souvent de 40 Mo à 3-5 Mo.
 * Expo Go n'embarque pas le compresseur natif : le fichier y part tel quel.
 */
function compressor() {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargement conditionnel (absent d'Expo Go)
  return require('react-native-compressor') as typeof import('react-native-compressor');
}

export function compressVideo(uri: string): Promise<string> {
  const native = compressor();
  return native ? native.Video.compress(uri, { compressionMethod: 'auto', maxSize: 1280 }) : Promise.resolve(uri);
}

export function compressImage(uri: string): Promise<string> {
  const native = compressor();
  return native
    ? native.Image.compress(uri, { compressionMethod: 'auto', maxWidth: 1600, quality: 0.8 })
    : Promise.resolve(uri);
}
