import { Tabs } from 'expo-router';

import { TabBar } from '@/shared/layout';

/** Onglets : Accueil, Entraide, [+], Snippets, Profil ; Projets reste un écran à onglet, ouvert depuis le menu ☰. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="questions" />
      <Tabs.Screen name="snippets" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
