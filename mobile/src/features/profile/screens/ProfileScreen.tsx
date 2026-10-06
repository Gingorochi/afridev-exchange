import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderActions } from '@/features/notifications';
import { errorMessage, PUBLIC_WEB_URL } from '@/shared/api';
import { RequireAuth } from '@/shared/layout';
import { useSession } from '@/shared/session';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  CardSkeleton,
  ErrorNotice,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  Text,
  timeAgo,
} from '@/shared/ui';

import { type MyProfile, type PublicProfile, qrCodeUrl, useAiBio, usePublicProfile, useUpdateProfile } from '../api';
import { EditProfileSheet } from '../components/EditProfileSheet';
import { ProfileActivity } from '../components/ProfileActivity';

/** Onglet « Profil » : mon profil, modifiable. */
export function MyProfileScreen() {
  const { colors } = useTheme();
  const { profile } = useSession();
  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title="Mon profil" right={<><IconButton icon="bell" label="Notifications" onPress={() => router.push('/notifications')} /><IconButton icon="settings" label="Réglages" onPress={() => router.push('/settings')} /></>} />
      <RequireAuth title="Mon profil" bare>
        {profile ? (
          <Screen embedded>
            <ProfileView profile={profile} me={profile} />
          </Screen>
        ) : (
          <View style={{ padding: space.md }}>
            <CardSkeleton lines={5} />
          </View>
        )}
      </RequireAuth>
    </SafeAreaView>
  );
}

/** Profil public d'un membre (/u/<pseudo>). */
export function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: me } = useSession();
  const isMe = Boolean(me && username && me.username.toLowerCase() === username.toLowerCase());
  const publicProfile = usePublicProfile(username, !isMe);
  const profile: PublicProfile | undefined = isMe ? me ?? undefined : publicProfile.data;

  return (
    <Screen
      header={<ScreenHeader title={profile ? profile.display_name || profile.username : `@${username}`} back right={<HeaderActions search={false} />} />}
      refreshing={publicProfile.isRefetching}
      onRefresh={() => void publicProfile.refetch()}
    >
      {profile ? (
        <ProfileView profile={profile} me={isMe ? (me ?? undefined) : undefined} />
      ) : publicProfile.isPending ? (
        <CardSkeleton lines={5} />
      ) : (
        <ErrorNotice title="Profil introuvable." message={`Aucun membre ne s'appelle @${username}.`} />
      )}
    </Screen>
  );
}

function ProfileView({ profile, me }: { profile: PublicProfile; me?: MyProfile }) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const name = profile.display_name || profile.username;
  const share = () =>
    void Share.share({ message: `${name} sur AfriDev Exchange\n${PUBLIC_WEB_URL}/u/${profile.username}` }).catch(() => undefined);

  return (
    <>
      {/* En-tête façon LinkedIn : bannière bord à bord, avatar qui la chevauche. */}
      <View style={[styles.hero, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Couverture du web : dégradé primary → tertiary → secondary. */}
        <LinearGradient
          colors={[colors.primary, colors.tertiary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.6 }}
          style={styles.cover}
        />
        <View style={styles.heroBody}>
          <View style={[styles.avatarRing, { borderColor: colors.card }]}>
            <Avatar name={name} uri={profile.avatar_url} size={112} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {me ? <Button label="Modifier le profil" icon="edit-2" variant="ghost" size="sm" onPress={() => setEditing(true)} /> : null}
            <Button label="Partager" icon="share-2" size="sm" onPress={share} />
          </View>
          <Text variant="headlineXl">{name}</Text>
          <Text variant="small" tone="muted">
            @{profile.username}
          </Text>
          {profile.stack.length ? <Text variant="bodyLg">Développeur·se {profile.stack.slice(0, 3).join(' · ')}</Text> : null}
          <View style={styles.facts}>
            {profile.location ? (
              <View style={styles.fact}>
                <Icon name="map-pin" size={14} tone="muted" />
                <Text variant="small" tone="muted">
                  {profile.location}
                </Text>
              </View>
            ) : null}
            <View style={styles.fact}>
              <Icon name="calendar" size={14} tone="muted" />
              <Text variant="small" tone="muted">
                Membre depuis {timeAgo(profile.created_at).replace(/^il y a /, '')}
              </Text>
            </View>
          </View>
          {profile.github_username || profile.website ? (
            <View>
              {profile.github_username ? (
                <LinkRow icon="github" label={`github.com/${profile.github_username}`} url={`https://github.com/${profile.github_username}`} />
              ) : null}
              {profile.website ? <LinkRow icon="globe" label={profile.website.replace(/^https?:\/\//, '')} url={profile.website} /> : null}
            </View>
          ) : null}
          {profile.open_to_work ? (
            <View style={[styles.openToWork, { backgroundColor: colors.secondarySoft }]}>
              <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
              <Text variant="label" tone="secondary">
                Ouvert aux opportunités
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
          <Text variant="headlineMd">À propos</Text>
          {me ? <AiBioButton /> : null}
        </View>
        <Text variant="bodyLg" tone={profile.bio ? 'ink' : 'muted'}>
          {profile.bio || (me ? 'Ajoutez une bio ou laissez l’IA vous en proposer une.' : 'Pas encore de bio.')}
        </Text>
        {me ? <AiBio profile={me} /> : null}
        {profile.stack.length ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text variant="label" style={{ marginTop: 2 }}>
              Stack technique
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.stack.map((skill) => (
                <View key={skill} style={[styles.skill, { borderColor: colors.borderStrong }]}>
                  <Text variant="label">{skill}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <ProfileActivity userId={profile.id} />

      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <Text variant="headlineMd">Carte développeur</Text>
        <Text variant="small" tone="muted" center>
          Scannez ce QR code pour ouvrir le profil, en meetup ou en hackathon.
        </Text>
        <View style={[styles.qr, { borderColor: colors.border }]}>
          <Image source={qrCodeUrl(profile.username)} style={{ width: 180, height: 180 }} contentFit="contain" cachePolicy="disk" accessibilityLabel={`QR code du profil de ${name}`} />
        </View>
      </Card>

      {me ? <EditProfileSheet profile={me} open={editing} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function LinkRow({ icon, label, url }: { icon: 'github' | 'globe'; label: string; url: string }) {
  return (
    <Pressable onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link" style={styles.link}>
      <Icon name={icon} size={16} tone="muted" />
      <Text variant="mono" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** « Rédiger avec l'IA » dans l'en-tête de « À propos », comme sur le web. */
function AiBioButton() {
  const aiBio = useAiBio();
  return (
    <View>
      <Button label="Rédiger avec l’IA" icon="sparkles" variant="subtle" size="sm" loading={aiBio.isPending} onPress={() => aiBio.mutate()} />
      {aiBio.isError ? (
        <Text variant="small" tone="danger">
          {errorMessage(aiBio.error)}
        </Text>
      ) : null}
    </View>
  );
}

/** Suggestion de bio de l'IA (à garder ou ignorer) et état d'échec. */
function AiBio({ profile }: { profile: MyProfile }) {
  const { colors } = useTheme();
  const update = useUpdateProfile();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const suggestion = profile.ai_bio_suggestion;
  const hasSuggestion = profile.ai_bio_status === 'ready' && suggestion && suggestion !== profile.bio && dismissed !== suggestion;

  return (
    <View style={{ gap: space.sm }}>
      {hasSuggestion ? (
        <>
          <View style={[styles.quote, { backgroundColor: colors.container }]}>
            <Text style={{ fontStyle: 'italic' }}>« {suggestion} »</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Ignorer" icon="x" variant="ghost" size="sm" onPress={() => setDismissed(suggestion)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Garder cette bio" icon="check" size="sm" loading={update.isPending} onPress={() => update.mutate({ bio: suggestion })} />
            </View>
          </View>
        </>
      ) : null}
      {profile.ai_bio_status === 'failed' ? (
        <Text variant="small" tone="danger">
          La bio IA n’a pas pu être générée. Réessayez plus tard.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Carte du web : couverture en dégradé, avatar qui la chevauche, actions dessous.
  hero: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  cover: { height: 112 },
  heroBody: { paddingHorizontal: space.md, paddingBottom: 20, gap: 4 },
  avatarRing: { alignSelf: 'flex-start', marginTop: -60, marginBottom: 12, borderWidth: 4, borderRadius: 64 },
  divider: { height: 1, marginVertical: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openToWork: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  skill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  quote: { padding: space.md, borderRadius: radius.md },
  qr: { padding: space.sm, borderRadius: radius.md, borderWidth: 1, backgroundColor: '#FFFFFF' },
});
