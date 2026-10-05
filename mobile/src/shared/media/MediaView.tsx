import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDataSaver } from '@/shared/data-saver';
import { radius, space, useTheme } from '@/shared/theme';
import { Icon, Pill, Text } from '@/shared/ui';

import type { MediaAsset } from './upload';

/**
 * Média économe :
 * - aperçu flou ThumbHash (quelques octets) affiché tout de suite ;
 * - en mode « Texte seul », rien n'est téléchargé avant un toucher ;
 * - la vidéo ne démarre jamais seule sur réseau lent ; HLS adaptatif 240p → 720p.
 */
export function MediaView({ media, alt = '' }: { media: MediaAsset; alt?: string }) {
  const { colors } = useTheme();
  const { textOnly } = useDataSaver();
  const [revealed, setRevealed] = useState(false);
  const ratio = media.width && media.height ? media.width / media.height : media.kind === 'video' ? 9 / 16 : 16 / 9;

  if (media.status !== 'ready') {
    return (
      <View style={[styles.frame, styles.center, { backgroundColor: colors.container, aspectRatio: 16 / 9 }]}>
        <Text variant="small" tone="muted">
          {media.status === 'failed' ? "Ce média n'a pas pu être traité." : 'Média en cours de traitement…'}
        </Text>
      </View>
    );
  }

  if (media.kind === 'video') return <ShortVideo media={media} />;

  if (textOnly && !revealed) {
    return (
      <Pressable
        onPress={() => setRevealed(true)}
        accessibilityRole="button"
        accessibilityLabel="Charger l'image"
        style={[styles.frame, { aspectRatio: Math.max(ratio, 1.2) }]}
      >
        <Image source={null} placeholder={media.thumbhash ? { thumbhash: media.thumbhash } : undefined} style={StyleSheet.absoluteFill} />
        <View style={[styles.overlay, styles.center]}>
          <Pill tone="neutral" icon="image" label="Mode texte : toucher pour charger" />
        </View>
      </Pressable>
    );
  }

  return (
    <Image
      source={media.urls.large ?? media.original_url}
      placeholder={media.thumbhash ? { thumbhash: media.thumbhash } : undefined}
      accessibilityLabel={alt}
      contentFit="cover"
      transition={200}
      cachePolicy="disk"
      style={[styles.frame, { aspectRatio: Math.max(ratio, 0.8), backgroundColor: colors.container }]}
    />
  );
}

/** Vidéo courte : aperçu + bouton lecture ; le lecteur n'est créé qu'au toucher. */
export function ShortVideo({ media }: { media: MediaAsset }) {
  const { autoplay, network } = useDataSaver();
  const [playing, setPlaying] = useState(false);
  const poster = media.urls.poster;

  if (playing || autoplay) return <Player uri={media.urls.hls ?? media.original_url} autoPlay={playing} />;
  return (
    <Pressable
      onPress={() => setPlaying(true)}
      accessibilityRole="button"
      accessibilityLabel="Lire la vidéo"
      style={[styles.frame, { aspectRatio: 16 / 10, backgroundColor: '#000' }]}
    >
      <Image
        source={poster ?? null}
        placeholder={media.thumbhash ? { thumbhash: media.thumbhash } : undefined}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.overlay, styles.center, { gap: space.sm }]}>
        <View style={styles.play}>
          <Icon name="play" size={28} color="#FFFFFF" />
        </View>
        <Text variant="label" style={{ color: '#FFFFFF' }}>
          Toucher pour lire
        </Text>
        <Text variant="monoSm" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {network.quality === 'slow' ? 'Qualité adaptée au réseau lent (240p)' : 'Qualité adaptative'}
          {media.duration_seconds ? ` · ${Math.round(media.duration_seconds)} s` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function Player({ uri, autoPlay }: { uri: string; autoPlay: boolean }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    if (autoPlay) instance.play();
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={[styles.frame, { aspectRatio: 16 / 10, backgroundColor: '#000' }]}
    />
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  play: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: '#C84B20', alignItems: 'center', justifyContent: 'center' },
});
