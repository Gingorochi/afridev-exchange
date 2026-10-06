import type { SecretFinding } from '@afridev/validation';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDataSaver } from '@/shared/data-saver';
import { flushOutbox, useNetwork, useOutbox } from '@/shared/offline';
import { radius, space, useTheme } from '@/shared/theme';

import { Button } from './Button';
import { Pill } from './Surfaces';
import { Icon, Text } from './Text';

// Formatage écrit à la main : Hermes (Expo Go, Android) n'a pas Intl.RelativeTimeFormat
// et son toLocaleString ignore la locale ; l'appeler au chargement du module plantait l'app.
const UNITS: [singular: string, plural: string, seconds: number][] = [
  ['an', 'ans', 31536000],
  ['mois', 'mois', 2592000],
  ['semaine', 'semaines', 604800],
  ['jour', 'jours', 86400],
  ['heure', 'heures', 3600],
  ['minute', 'minutes', 60],
];

/** « il y a 2 heures », « hier »… */
export function timeAgo(date: string): string {
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  for (const [singular, plural, size] of UNITS) {
    if (Math.abs(seconds) < size) continue;
    const count = Math.round(Math.abs(seconds) / size);
    if (size === 86400 && count === 1) return seconds < 0 ? 'hier' : 'demain';
    const label = `${count} ${count > 1 ? plural : singular}`;
    return seconds < 0 ? `il y a ${label}` : `dans ${label}`;
  }
  return "à l'instant";
}

/** 1.5 → « 1,5 » (une décimale au plus, virgule française). */
function decimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

export function formatCount(value: number): string {
  return value >= 1000 ? `${decimal(value / 1000)}k` : String(value);
}

/** Taille en octets d'un texte encodé en UTF-8 (ce qui transite réellement sur le réseau). */
export function utf8Size(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${decimal(bytes / 1024)} Ko`;
  return `${decimal(bytes / 1024 / 1024)} Mo`;
}

/** Pastille de connectivité de l'en-tête (« ● 3G », « Hors ligne »). */
export function NetworkPill() {
  const { network, textOnly } = useDataSaver();
  if (network.quality === 'offline') return <Pill tone="warning" icon="wifi-off" label="Hors ligne" />;
  return <Pill tone={network.quality === 'slow' ? 'warning' : 'mint'} dot label={textOnly ? `${network.label} · Texte` : network.label} />;
}

/**
 * Bandeau hors ligne / file d'envoi (DESIGN.md : ocre, horloge, « Synchronisation en attente »).
 * Invisible quand tout est en ligne et synchronisé.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const network = useNetwork();
  const pending = useOutbox().length;
  if (network.isOnline && !pending) return null;
  const offline = !network.isOnline;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.tertiarySoft, borderColor: colors.tertiary }]}
    >
      <Icon name={offline ? 'wifi-off' : 'clock'} size={18} tone="tertiary" />
      <View style={{ flex: 1 }}>
        <Text variant="label" tone="tertiary" numberOfLines={1}>
          {offline ? 'Hors ligne · copie locale active' : 'Synchronisation en attente'}
        </Text>
        <Text variant="monoSm" tone="tertiary" numberOfLines={2}>
          {offline ? 'Vos publications partiront au retour du réseau.' : 'Envoi en cours au serveur…'}
        </Text>
      </View>
      {pending ? (
        <Pressable onPress={() => void flushOutbox()} accessibilityRole="button" accessibilityLabel="Renvoyer maintenant">
          <Pill tone="warning" icon="upload-cloud" label={`${pending} en file`} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Alerte Security Guard : secret détecté, publication verrouillée, nettoyage en un toucher. */
export function SecretAlert({ findings, onRedact }: { findings: SecretFinding[]; onRedact?: () => void }) {
  const { colors } = useTheme();
  if (!findings.length) return null;
  const [first] = findings;
  return (
    <View accessibilityRole="alert" style={[styles.secret, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Icon name="shield-off" size={22} tone="danger" />
        <Text variant="headlineMd" tone="danger" style={{ flex: 1 }}>
          Fuite de secret détectée
        </Text>
      </View>
      <Text variant="small">
        {first?.description} ligne {first?.line} ({first?.preview}). Retirez-la avant de publier : la
        publication est verrouillée.
      </Text>
      {onRedact ? <Button label="Remplacer par <VOTRE_CLE>" icon="refresh-ccw" variant="danger" size="sm" onPress={onRedact} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  secret: { gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
});
