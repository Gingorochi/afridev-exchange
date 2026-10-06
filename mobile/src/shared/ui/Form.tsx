import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch as RNSwitch,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { fonts, HIT, noFocusRing, radius, space, useTheme } from '@/shared/theme';

import { Icon, type IconName, Text } from './Text';

/** Champ de 52 px (pouces, plein soleil) ; erreur et aide en monospace dessous. */
export function TextField({
  label,
  hint,
  error,
  counter,
  icon,
  mono,
  multiline,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  icon?: IconName;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label || counter ? (
        <View style={styles.labelRow}>
          {label ? <Text variant="label">{label}</Text> : <View />}
          {counter ? (
            <Text variant="monoSm" tone="faint">
              {counter}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
      >
        {icon ? <Icon name={icon} size={18} tone="faint" /> : null}
        <TextInput
          placeholderTextColor={colors.inkFaint}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.input,
            { color: colors.ink, fontFamily: mono ? fonts.monoRegular : fonts.regular },
            multiline && styles.inputMultiline,
            style,
          ]}
          {...props}
        />
      </View>
      {error ? (
        <Text variant="monoSm" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="monoSm" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Ligne de réglage avec interrupteur large. */
export function SwitchRow({
  title,
  description,
  value,
  onChange,
  badge,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  badge?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={styles.switchRow}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="bodyMedium">{title}</Text>
          {badge}
        </View>
        {description ? (
          <Text variant="small" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <RNSwitch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.borderStrong}
      />
    </Pressable>
  );
}

/** Onglets segmentés (« Écrire · Aperçu », « Toutes · Non lues »). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  style,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number; icon?: IconName }[];
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.container }, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {option.icon ? <Icon name={option.icon} size={16} tone={active ? 'ink' : 'muted'} /> : null}
            <Text variant="label" tone={active ? 'ink' : 'muted'} numberOfLines={1}>
              {option.label}
              {option.count !== undefined ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Onglets soulignés (les `Tabs` du web : « Toutes · Sans solution · Résolues »). */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.tab, { borderBottomColor: active ? colors.ink : 'transparent' }]}
          >
            <Text variant="label" tone={active ? 'ink' : 'muted'}>
              {option.label}
              {option.count !== undefined ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Puces filtrantes défilant horizontalement (capsules, pouce). */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  inset = 0,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number; icon?: IconName }[];
  /** Marge intérieure quand la bande défile jusqu'aux bords de l'écran. */
  inset?: number;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: inset }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.ink : colors.card, borderColor: active ? colors.ink : colors.border },
            ]}
          >
            {option.icon ? <Icon name={option.icon} size={14} color={active ? colors.card : colors.inkMuted} /> : null}
            <Text variant="label" style={{ color: active ? colors.card : colors.inkMuted }}>
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <View style={[styles.chipCount, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : colors.containerHigh }]}>
                <Text variant="monoSm" style={{ color: active ? '#FFFFFF' : colors.inkMuted }}>
                  {option.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Saisie de tags : bouton « Ajouter » ou retour clavier, suggestions en un toucher. */
export function TagInput({
  value,
  onChange,
  max = 5,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  suggestions?: string[];
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').slice(0, 30);
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag]);
    setDraft('');
  };
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.tagWrap}>
        {value.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onChange(value.filter((t) => t !== tag))}
            accessibilityLabel={`Retirer ${tag}`}
            style={[styles.tagChip, { backgroundColor: colors.primarySoft }]}
          >
            <Text variant="mono" tone="primary">
              #{tag}
            </Text>
            <Icon name="x" size={14} tone="primary" />
          </Pressable>
        ))}
      </View>
      {value.length < max ? (
        <TextField
          value={draft}
          onChangeText={(text) => (text.endsWith(',') || text.endsWith(' ') ? add(text) : setDraft(text))}
          onSubmitEditing={() => add(draft)}
          placeholder="+ Ajouter un tag"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          mono
        />
      ) : null}
      {suggestions.filter((tag) => !value.includes(tag)).length && value.length < max ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {suggestions
            .filter((tag) => !value.includes(tag))
            .map((tag) => (
              <Pressable key={tag} onPress={() => add(tag)} style={[styles.suggestion, { borderColor: colors.border }]}>
                <Text variant="monoSm" tone="muted">
                  #{tag}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  field: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 10 },
  input: { flex: 1, fontSize: 16, minHeight: 48, ...noFocusRing },
  inputMultiline: { minHeight: 120 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: HIT, paddingVertical: space.sm },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.full, gap: 4 },
  tabs: { gap: 4 },
  tab: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 2 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 8,
  },
  chips: { gap: space.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.full },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: radius.full },
  suggestion: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
});
