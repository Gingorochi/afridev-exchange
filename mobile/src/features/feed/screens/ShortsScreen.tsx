import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentsSheet } from '@/features/discussions';
import { PUBLIC_WEB_URL } from '@/shared/api';
import { useDataSaver } from '@/shared/data-saver';
import type { MediaAsset } from '@/shared/media';
import { useSession } from '@/shared/session';
import { radius, space } from '@/shared/theme';
import { Avatar, formatCount, Icon, type IconName, Pill, Text } from '@/shared/ui';

import { type Post, useFeed, useLike } from '../api';

const WHITE = '#FFFFFF';

/** Lecteur vertical plein écran : seule la vidéo visible a un lecteur (mémoire et data). */
export function ShortsScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { network } = useDataSaver();
  const feed = useFeed({ kind: 'short' });
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  const shorts = feed.items.filter((post) => post.media);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={shorts}
        keyExtractor={(post) => post.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        onMomentumScrollEnd={(event) => setActive(Math.round(event.nativeEvent.contentOffset.y / height))}
        onEndReached={() => feed.hasNextPage && void feed.fetchNextPage()}
        windowSize={3}
        renderItem={({ item, index }) => <ShortItem post={item} height={height} active={index === active} muted={muted} />}
        ListEmptyComponent={
          <View style={[styles.empty, { height }]}>
            <Icon name="film" size={40} color={WHITE} />
            <Text variant="headlineMd" style={{ color: WHITE }} center>
              {feed.isPending ? 'Chargement des vidéos…' : 'Aucune vidéo courte pour l’instant'}
            </Text>
            {!feed.isPending ? (
              <Pressable onPress={() => router.replace('/compose/short')} style={styles.cta} accessibilityRole="button">
                <Text variant="label" style={{ color: WHITE }}>
                  Publier la première
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
      <View style={[styles.top, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <RoundButton icon="arrow-left" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
        <View style={styles.network}>
          <View style={[styles.dot, { backgroundColor: network.quality === 'good' ? '#9CF0CF' : '#FDB76D' }]} />
          <Text variant="monoSm" style={{ color: WHITE }}>
            {network.label} · {network.quality === 'good' ? 'Qualité adaptative' : 'Données préservées'}
          </Text>
        </View>
        <RoundButton icon={muted ? 'volume-x' : 'volume-2'} label={muted ? 'Activer le son' : 'Couper le son'} onPress={() => setMuted(!muted)} />
      </View>
    </View>
  );
}

function ShortItem({ post, height, active, muted }: { post: Post; height: number; active: boolean; muted: boolean }) {
  const insets = useSafeAreaInsets();
  const { autoplay } = useDataSaver();
  const { isAuthenticated } = useSession();
  const like = useLike(post);
  const [started, setStarted] = useState(false);
  const [comments, setComments] = useState(false);
  const media = post.media as MediaAsset;
  const liked = Boolean(post.viewer?.liked);
  const playing = active && (autoplay || started) && media.status === 'ready';

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      {playing ? (
        <Player uri={media.urls.hls ?? media.original_url} muted={muted} />
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setStarted(true)} accessibilityRole="button" accessibilityLabel="Lire la vidéo">
          <Image
            source={media.urls.poster ?? null}
            placeholder={media.thumbhash ? { thumbhash: media.thumbhash } : undefined}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <View style={styles.play}>
              <Icon name="play" size={32} color={WHITE} />
            </View>
            <Text variant="label" style={{ color: WHITE, marginTop: space.sm }}>
              {media.status === 'ready' ? 'Toucher pour lire' : 'Vidéo en cours de traitement…'}
            </Text>
          </View>
        </Pressable>
      )}

      <View style={[styles.rail, { bottom: insets.bottom + 90 }]}>
        <Pressable onPress={() => post.author && router.push(`/u/${post.author.username}`)} accessibilityRole="link" accessibilityLabel="Profil de l’auteur">
          <View style={styles.avatarRing}>
            <Avatar name={post.author?.display_name || post.author?.username || '?'} uri={post.author?.avatar_url} size={52} />
          </View>
        </Pressable>
        <RailButton icon="heart" label={formatCount(post.like_count)} active={liked} onPress={() => isAuthenticated && like.mutate(!liked)} a11y="J’aime" />
        <RailButton icon="message-square" label={formatCount(post.comment_count)} onPress={() => setComments(true)} a11y="Commentaires" />
        <RailButton
          icon="share-2"
          label="Partager"
          a11y="Partager"
          onPress={() => void Share.share({ message: `${PUBLIC_WEB_URL}/feed/${post.id}` }).catch(() => undefined)}
        />
      </View>

      <View style={[styles.caption, { bottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        <Text variant="headlineMd" style={{ color: WHITE }}>
          @{post.author?.username ?? 'membre'}
        </Text>
        {post.body ? (
          <Text variant="bodyLg" style={{ color: WHITE }} numberOfLines={3}>
            {post.body}
          </Text>
        ) : null}
        {post.tags.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {post.tags.slice(0, 3).map((tag) => (
              <Pill key={tag} label={`#${tag}`} style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'transparent' }} />
            ))}
          </View>
        ) : null}
      </View>

      <CommentsSheet postId={post.id} commentCount={post.comment_count} authorId={post.author?.id} open={comments} onClose={() => setComments(false)} />
    </View>
  );
}

function Player({ uri, muted }: { uri: string; muted: boolean }) {
  const [progress, setProgress] = useState(0);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.timeUpdateEventInterval = 0.5;
    instance.play();
  });
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setProgress(player.duration ? currentTime / player.duration : 0);
  });
  return (
    <>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => (player.playing ? player.pause() : player.play())}
        accessibilityRole="button"
        accessibilityLabel="Lecture / pause"
      >
        <VideoView player={player} contentFit="cover" nativeControls={false} style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={styles.round}>
      <Icon name={icon} size={24} color={WHITE} />
    </Pressable>
  );
}

function RailButton({ icon, label, a11y, active, onPress }: { icon: IconName; label: string; a11y: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: active }} style={{ alignItems: 'center', gap: 4 }}>
      <View style={[styles.round, active && { backgroundColor: '#C84B20' }]}>
        <Icon name={icon} size={26} color={WHITE} />
      </View>
      <Text variant="label" style={{ color: WHITE }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg },
  cta: { paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#C84B20' },
  top: { position: 'absolute', left: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  network: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  round: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  play: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: '#C84B20', alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: space.md, alignItems: 'center', gap: space.md },
  avatarRing: { borderWidth: 2, borderColor: WHITE, borderRadius: 30, padding: 2 },
  caption: { position: 'absolute', left: space.md, right: 96, gap: space.sm },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  progressFill: { height: '100%', backgroundColor: '#C84B20' },
});
