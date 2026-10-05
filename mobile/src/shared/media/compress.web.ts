/** Cible web d'Expo : pas de compresseur natif, le fichier est envoyé tel quel. */
export const compressVideo = (uri: string) => Promise.resolve(uri);
export const compressImage = (uri: string) => Promise.resolve(uri);
