import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/shared/session';
import { HIT, radius, space, useTheme } from '@/shared/theme';
import { Icon, type IconName, Sheet, Text } from '@/shared/ui';

// Les 4 onglets du web, 2 de chaque côté du « + » ; Projets passe par le menu ☰ (AppBar).
const TABS: Record<string, { label: string; icon: IconName }> = {
  feed: { label: 'Accueil', icon: 'home' },
  questions: { label: 'Entraide', icon: 'messages-square' },
  snippets: { label: 'Snippets', icon: 'code-xml' },
  profile: { label: 'Profil', icon: 'user-round' },
};

const PUBLISH: { label: string; hint: string; icon: IconName; href: string }[] = [
  { label: 'Un post', hint: 'Astuce, code, sondage, image', icon: 'edit-3', href: '/compose/post' },
  { label: 'Une question', hint: "Réponse de l'IA en quelques secondes", icon: 'help-circle', href: '/compose/question' },
  { label: 'Une vidéo courte', hint: '30 s maximum, compressée avant l’envoi', icon: 'video', href: '/compose/short' },
  { label: 'Un snippet', hint: 'Dans votre coffre, dispo hors ligne', icon: 'lock', href: '/snippet/edit' },
];

/**
 * Barre d'onglets en bas, à portée du pouce : 4 onglets symétriques et un bouton central « + »
 * qui ouvre le choix de publication dans un panneau du bas.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useSession();
  const [publishing, setPublishing] = useState(false);
  const routes = state.routes.filter((route) => TABS[route.name]);
  const middle = 2;

  const renderTab = (route: (typeof routes)[number]) => {
    const tab = TABS[route.name]!;
    const focused = state.routes[state.index]?.key === route.key;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <Icon name={tab.icon} size={22} tone={focused ? 'primary' : 'muted'} />
        <Text variant="monoSm" tone={focused ? 'primary' : 'muted'} style={focused ? { fontWeight: '700' } : undefined}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, space.sm) },
        ]}
      >
        {routes.slice(0, middle).map(renderTab)}
        <View style={styles.tab}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Publier"
            onPress={() => (isAuthenticated ? setPublishing(true) : router.push('/login'))}
            style={({ pressed }) => [styles.fab, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
          >
            <Icon name="plus" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
        {routes.slice(middle).map(renderTab)}
      </View>

      <Sheet open={publishing} onClose={() => setPublishing(false)} title="Publier" subtitle="Tout part même hors ligne, au retour du réseau">
        {PUBLISH.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => {
              setPublishing(false);
              router.push(item.href as never);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.option, { backgroundColor: pressed ? colors.container : colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name={item.icon} size={22} tone="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{item.label}</Text>
              <Text variant="small" tone="muted">
                {item.hint}
              </Text>
            </View>
            <Icon name="chevron-right" tone="faint" />
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: HIT + 8, gap: 2 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9F3C16',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, minHeight: 72 },
  optionIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
