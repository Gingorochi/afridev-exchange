import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/shared/theme';
import { Button, Icon, type IconName, Text, Wordmark } from '@/shared/ui';

import { markOnboarded } from '../api';

const SLIDES: { title: string; text: string; icon: IconName; chips: string[] }[] = [
  {
    title: "L'entraide tech africaine, pensée pour vos réalités.",
    text: 'Échangez avec vos pairs, obtenez des réponses assistées par IA et partagez vos snippets, même avec un réseau capricieux.',
    icon: 'users',
    chips: ['⚡ 100 % hors ligne', '🤝 Communauté & diaspora', '🔒 Coffre de snippets'],
  },
  {
    title: 'Une réponse IA en quelques secondes.',
    text: 'Posez votre blocage à l’écrit ou à la voix : l’IA propose une première piste en citant les solutions déjà validées par la communauté.',
    icon: 'zap',
    chips: ['🎙️ Questions vocales', '📚 Sources citées', '✅ Validé par les pairs'],
  },
  {
    title: 'Économe en data, solide hors ligne.',
    text: 'Mode « Texte seul » en 2G, vidéos jamais lancées toutes seules, et tout ce que vous écrivez part au retour du réseau.',
    icon: 'wifi-off',
    chips: ['📶 Mode 2G / 3G', '🛡️ Security Guard', '⏱️ Brouillons toutes les 2 s'],
  },
];

export function OnboardingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const last = index === SLIDES.length - 1;

  const finish = (target: '/feed' | '/login') => {
    markOnboarded();
    router.replace(target);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.canvas }]}>
      <View style={styles.top}>
        <Wordmark />
        <Pressable onPress={() => finish('/feed')} hitSlop={12} accessibilityRole="button">
          <Text variant="bodyMedium" tone="muted">
            Passer
          </Text>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.title}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Panneau terre cuite, comme le volet gauche de la connexion web. */}
            <View style={[styles.art, { backgroundColor: colors.primary }]}>
              <View style={[styles.band, { backgroundColor: colors.tertiary }]} />
              <View style={[styles.band, { left: '78%', backgroundColor: colors.secondary }]} />
              <View style={styles.artIcon}>
                <Icon name={item.icon} size={52} color="#FFFFFF" />
              </View>
              <View style={styles.chips}>
                {item.chips.map((chip) => (
                  <View key={chip} style={styles.chip}>
                    <Text variant="label" style={{ color: '#FFFFFF' }}>
                      {chip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <Text variant="headlineXl" center>
              {item.title}
            </Text>
            <Text variant="bodyLg" tone="muted" center>
              {item.text}
            </Text>
          </View>
        )}
      />
      <View style={styles.dots} accessibilityLabel={`Étape ${index + 1} sur ${SLIDES.length}`}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.title}
            style={[styles.dot, { backgroundColor: i === index ? colors.primaryInk : colors.borderStrong, width: i === index ? 40 : 10 }]}
          />
        ))}
      </View>
      <View style={styles.bottom}>
        <Button
          label={last ? 'Commencer' : 'Suivant'}
          iconRight="arrow-right"
          size="lg"
          full
          onPress={() => {
            if (last) finish('/login');
            else list.current?.scrollToIndex({ index: index + 1 });
          }}
        />
        <Pressable onPress={() => finish('/login')} style={styles.link} accessibilityRole="button">
          <Text tone="muted">Déjà un compte ? </Text>
          <Text variant="bodyMedium" tone="primary" style={{ textDecorationLine: 'underline' }}>
            Se connecter
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.margin, paddingVertical: space.sm },
  slide: { paddingHorizontal: space.margin, gap: space.md, alignItems: 'center' },
  art: {
    width: '100%',
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    marginTop: space.sm,
  },
  band: { position: 'absolute', top: 0, bottom: 0, left: '62%', right: 0, opacity: 0.55, transform: [{ skewX: '-12deg' }] },
  artIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.md },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.22)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: space.md },
  dot: { height: 10, borderRadius: 5 },
  bottom: { paddingHorizontal: space.margin, paddingBottom: space.md, gap: space.sm },
  link: { flexDirection: 'row', justifyContent: 'center', minHeight: 48, alignItems: 'center' },
});
