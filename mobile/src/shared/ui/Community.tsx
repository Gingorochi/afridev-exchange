import { View } from 'react-native';

import { fonts, useTheme } from '@/shared/theme';

import { communityColor } from './Surfaces';
import { Icon, Text } from './Text';
import { formatCount } from './Status';

/** Icône d'un hub : émoji (aucun téléchargement) ou initiale sur une couleur stable. */
export function HubIcon({ icon, name, size = 24 }: { icon?: string | null; name: string; size?: number }) {
  const { colors } = useTheme();
  const emoji = icon && !/^https?:\/\//.test(icon) ? icon : null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: emoji ? colors.container : communityColor(name),
        borderWidth: emoji ? 1 : 0,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: emoji ? size * 0.55 : Math.max(10, size * 0.45), lineHeight: size, color: emoji ? undefined : '#FFFFFF' }}>
        {emoji ?? name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

/** Karma (« ✦ 1,2 k ») et premier badge de l'auteur, sous son nom sur les cartes. */
export function Reputation({ karma, badge }: { karma?: number | null; badge?: string | null }) {
  const { colors } = useTheme();
  if (!karma && !badge) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {karma ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessibilityLabel={`${karma} points de karma`}>
          <Icon name="sparkles" size={12} color={colors.tertiary} />
          <Text variant="small" style={{ color: colors.tertiary, fontFamily: fonts.medium }}>
            {formatCount(karma)}
          </Text>
        </View>
      ) : null}
      {badge ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 6,
            height: 20,
            borderRadius: 6,
            backgroundColor: colors.tertiarySoft,
          }}
        >
          <Icon name="award" size={11} color={colors.onTertiarySoft} />
          <Text variant="small" numberOfLines={1} style={{ color: colors.onTertiarySoft, fontSize: 11 }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
