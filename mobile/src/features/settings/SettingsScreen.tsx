import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { api, unwrap } from '@/shared/api';
import { type TextOnlyMode, useDataSaver, type VideoQuality } from '@/shared/data-saver';
import { flushOutbox, removeFromOutbox, useNetwork, useOutbox } from '@/shared/offline';
import { useSession } from '@/shared/session';
import { cacheStore, draftsStore } from '@/shared/storage';
import { radius, space, type ThemePreference, useTheme } from '@/shared/theme';
import {
  Button,
  Card,
  formatBytes,
  Icon,
  type IconName,
  NetworkPill,
  Pill,
  Screen,
  ScreenHeader,
  SectionTitle,
  Segmented,
  SwitchRow,
  Text,
  timeAgo,
  useToast,
} from '@/shared/ui';

export function SettingsScreen() {
  const { colors } = useTheme();
  const network = useNetwork();
  return (
    <Screen header={<ScreenHeader title="Réglages" back right={<NetworkPill />} />}>
      <View style={[styles.banner, { backgroundColor: colors.secondaryMint }]}>
        <Icon name="activity" size={20} tone="secondary" />
        <View style={{ flex: 1 }}>
          <Text variant="monoSm" tone="secondary">
            RÉSEAU ACTUEL
          </Text>
          <Text variant="bodyMedium" tone="secondary">
            {network.isOnline ? `${network.label}${network.isCellular ? ' · données mobiles' : ''}` : 'Hors ligne · copie locale active'}
          </Text>
        </View>
      </View>
      <DataSection />
      <OfflineSection />
      <AppearanceSection />
      <AccountSection />
      <Text variant="monoSm" tone="faint" center>
        AfriDev Exchange {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}

function DataSection() {
  const { colors } = useTheme();
  const { mode, setMode, textOnly, videoQuality, setVideoQuality, wifiOnly, setWifiOnly, network } = useDataSaver();
  const qualities: [VideoQuality, string, string][] = [
    ['auto', 'Auto', 'Selon le réseau'],
    ['240', '240p', '~2 Mo / min'],
    ['480', '480p', '~6 Mo / min'],
    ['720', '720p', 'Wi-Fi, ~14 Mo / min'],
  ];
  return (
    <>
      <SectionTitle title="Économie de données" hint="Priorité au texte et au forfait" />
      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              Mode « Texte seul »
            </Text>
            {textOnly ? <Pill tone="success" dot label="Actif" /> : null}
          </View>
          <Segmented<TextOnlyMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'on', label: 'Activé' },
              { value: 'off', label: 'Désactivé' },
            ]}
          />
          <Text variant="small" tone="muted">
            Remplace images et vidéos par un aperçu léger à toucher pour charger. En « Auto », il s’active en 2G / 3G
            {network.quality === 'slow' ? ' (réseau lent détecté)' : ''}.
          </Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Text variant="bodyMedium">Qualité vidéo maximale</Text>
          <View style={styles.grid}>
            {qualities.map(([value, label, hint]) => {
              const active = videoQuality === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setVideoQuality(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.quality,
                    { backgroundColor: active ? colors.primary : colors.container, borderColor: active ? colors.primary : colors.border },
                  ]}
                >
                  <Text variant="label" style={{ color: active ? '#FFFFFF' : colors.ink }}>
                    {label}
                  </Text>
                  <Text variant="monoSm" style={{ color: active ? 'rgba(255,255,255,0.85)' : colors.inkMuted }}>
                    {hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="small" tone="muted">
            Les vidéos ne démarrent jamais seules sur réseau lent ou en données mobiles.
          </Text>
        </View>
        <SwitchRow
          title="Rien de lourd en données mobiles"
          description="Images et vidéos attendent le Wi-Fi ; le texte reste disponible."
          value={wifiOnly}
          onChange={setWifiOnly}
        />
      </Card>
    </>
  );
}

const TABLE_LABELS: Record<string, string> = {
  posts: 'Post',
  comments: 'Commentaire',
  questions: 'Question',
  answers: 'Réponse',
  snippets: 'Snippet',
  projects: 'Projet',
  profiles: 'Profil',
};

function OfflineSection() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated } = useSession();
  const network = useNetwork();
  const pending = useOutbox();
  const [flushing, setFlushing] = useState(false);
  const [cacheSize, setCacheSize] = useState(() => cacheStore.size + draftsStore.size);
  const rejections = useQuery({
    queryKey: ['sync', 'rejections'],
    queryFn: () => unwrap(api.GET('/api/sync/rejections/')),
    enabled: isAuthenticated,
  });
  const acknowledge = useMutation({
    mutationFn: (ids: string[]) => unwrap(api.POST('/api/sync/rejections/ack/', { body: { ids } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sync', 'rejections'] }),
  });
  const failed = rejections.data ?? [];

  return (
    <>
      <SectionTitle title="Hors ligne & stockage" hint="Copie locale et envois en attente" />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="hard-drive" size={20} tone="secondary" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Espace utilisé sur le téléphone</Text>
            <Text variant="monoSm" tone="muted">
              {formatBytes(cacheSize)} de données en cache
            </Text>
          </View>
        </View>
        <Button
          label="Vider le cache des données"
          icon="refresh-cw"
          variant="subtle"
          size="sm"
          onPress={() => {
            queryClient.clear();
            cacheStore.clearAll();
            cacheStore.trim();
            setCacheSize(cacheStore.size + draftsStore.size);
            toast('Cache vidé : les données seront rechargées au besoin.');
          }}
        />
        <Text variant="monoSm" tone="muted">
          Vos brouillons et envois en attente sont conservés.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="upload-cloud" size={20} tone="primary" />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            Envois en attente & en échec
          </Text>
          {pending.length ? <Pill tone="warning" label={`${pending.length} en attente`} /> : null}
        </View>
        {!pending.length && !failed.length ? (
          <Text variant="small" tone="muted">
            Tout est synchronisé : aucun envoi en attente.
          </Text>
        ) : null}
        {pending.map((entry) => (
          <View key={entry.id} style={[styles.entry, { backgroundColor: colors.container }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="clock" size={16} tone="tertiary" />
              <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
                {entry.label}
              </Text>
            </View>
            <Text variant="monoSm" tone="faint">
              Écrit {timeAgo(entry.createdAt)}
            </Text>
            <Button
              label="Abandonner"
              icon="trash-2"
              variant="ghost"
              size="sm"
              onPress={() =>
                Alert.alert('Abandonner cet envoi ?', entry.label, [
                  { text: 'Garder', style: 'cancel' },
                  { text: 'Abandonner', style: 'destructive', onPress: () => removeFromOutbox(entry.id) },
                ])
              }
            />
          </View>
        ))}
        {pending.length ? (
          <Button
            label="Tout renvoyer"
            icon="send"
            size="sm"
            loading={flushing}
            onPress={async () => {
              setFlushing(true);
              await flushOutbox();
              setFlushing(false);
              toast(network.isOnline ? 'Envoi relancé.' : 'Toujours hors ligne : nouvel essai au retour du réseau.', 'queued');
            }}
          />
        ) : null}
        {failed.map((rejection) => (
          <View key={rejection.id} style={[styles.entry, { backgroundColor: colors.dangerSoft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="alert-triangle" size={16} tone="danger" />
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {TABLE_LABELS[rejection.table] ?? rejection.table}
                {typeof rejection.data === 'object' && rejection.data && 'title' in rejection.data
                  ? ` : ${String((rejection.data as { title: unknown }).title)}`
                  : ''}
              </Text>
            </View>
            <Text variant="small">Raison : {rejection.message}</Text>
            <Button label="J’ai compris" variant="ghost" size="sm" onPress={() => acknowledge.mutate([rejection.id])} />
          </View>
        ))}
      </Card>
    </>
  );
}

function AppearanceSection() {
  const { colors, preference, setPreference } = useTheme();
  const options: { value: ThemePreference; label: string; icon: IconName }[] = [
    { value: 'light', label: 'Clair', icon: 'sun' },
    { value: 'dark', label: 'Sombre', icon: 'moon' },
    { value: 'system', label: 'Système', icon: 'smartphone' },
  ];
  return (
    <>
      <SectionTitle title="Apparence & langue" />
      <Card style={{ gap: space.md }}>
        <View style={styles.grid}>
          {options.map((option) => {
            const active = preference === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[
                  styles.theme,
                  { backgroundColor: active ? colors.primarySoft : colors.container, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Icon name={option.icon} size={20} tone={active ? 'primary' : 'muted'} />
                <Text variant="label" tone={active ? 'primary' : 'muted'}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="globe" size={20} tone="muted" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">Langue de l’interface</Text>
            <Text variant="small" tone="muted">
              Français. Les contenus se traduisent à la demande avec « FR/EN ».
            </Text>
          </View>
        </View>
      </Card>
    </>
  );
}

function AccountSection() {
  const { isAuthenticated, signOut } = useSession();
  if (!isAuthenticated) return null;
  return (
    <Button
      label="Se déconnecter"
      icon="log-out"
      variant="danger"
      size="lg"
      onPress={() =>
        Alert.alert('Se déconnecter ?', 'Vos brouillons restent sur ce téléphone.', [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se déconnecter',
            style: 'destructive',
            onPress: () => {
              signOut();
              router.replace('/feed');
            },
          },
        ])
      }
    />
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  quality: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: 12, borderRadius: radius.md, borderWidth: 1.5 },
  theme: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 64, borderRadius: radius.md, borderWidth: 1.5 },
  entry: { gap: 6, padding: 12, borderRadius: radius.md },
});
