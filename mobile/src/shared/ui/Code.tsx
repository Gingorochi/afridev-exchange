import * as Clipboard from 'expo-clipboard';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { tokenize } from 'sugar-high';
import { python } from 'sugar-high/presets';

import { fonts, noFocusRing, radius, space, useTheme } from '@/shared/theme';

import { Icon, Text } from './Text';

const TOKEN_TYPES = [
  'identifier',
  'keyword',
  'string',
  'class',
  'property',
  'entity',
  'jsxliterals',
  'sign',
  'comment',
  'break',
  'space',
] as const;

const TOKEN_COLORS: Record<string, string> = {
  keyword: '#FF8A5C',
  string: '#9FD88C',
  class: '#F6BE65',
  property: '#8FC1FF',
  entity: '#7FD4A8',
  jsxliterals: '#C4A6FF',
  sign: '#A8A29E',
  comment: '#8E8984',
};

type Line = { text: string; color?: string }[];

/** Découpe colorée en lignes (sugar-high, ~1 Ko, sans HTML). */
function highlightLines(code: string, language?: string): Line[] {
  const tokens = tokenize(code.replace(/\n+$/, ''), ['python', 'py'].includes(language ?? '') ? python : undefined);
  const lines: Line[] = [[]];
  for (const [typeIndex, value] of tokens) {
    const type = TOKEN_TYPES[typeIndex];
    const parts = value.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1]!.push({ text: part, color: type ? TOKEN_COLORS[type] : undefined });
    });
  }
  return lines;
}

export async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
}

/** Bloc de code sombre façon terminal : défilement horizontal, numéros de ligne, copie. */
export function CodeBlock({
  code,
  language,
  filename,
  maxLines,
  flaggedLines = [],
}: {
  code: string;
  language?: string;
  filename?: string;
  maxLines?: number;
  flaggedLines?: number[];
}) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => highlightLines(code, language), [code, language]);
  const shown = maxLines ? lines.slice(0, maxLines) : lines;

  return (
    <View style={[styles.block, { backgroundColor: colors.codeBg }]}>
      <View style={[styles.header, { borderBottomColor: colors.codeLine }]}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[styles.dot, { backgroundColor: '#FEBC2E' }]} />
          <View style={[styles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        <Text variant="monoSm" style={{ color: colors.codeInk, flex: 1 }} numberOfLines={1}>
          {filename ?? language ?? 'code'}
        </Text>
        <Pressable
          onPress={async () => {
            await copyText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          accessibilityRole="button"
          accessibilityLabel="Copier le code"
          hitSlop={10}
          style={[styles.copy, { backgroundColor: colors.codeLine }]}
        >
          <Icon name={copied ? 'check' : 'copy'} size={14} color={colors.codeInk} />
          <Text variant="monoSm" style={{ color: colors.codeInk }}>
            {copied ? 'Copié' : 'Copier'}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View>
          {shown.map((line, index) => (
            <View
              key={index}
              style={[styles.line, flaggedLines.includes(index + 1) && { backgroundColor: 'rgba(186,26,26,0.45)' }]}
            >
              <Text style={[styles.number, { color: colors.codeFaint }]}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.code, { color: colors.codeInk }]}>
                {line.map((part, i) => (
                  <Text key={i} style={[styles.code, { color: part.color ?? colors.codeInk }]}>
                    {part.text}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
          {maxLines && lines.length > maxLines ? (
            <Text style={[styles.code, { color: colors.codeFaint }]}>… {lines.length - maxLines} lignes de plus</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const KEYS = ['Tab', '{', '}', '(', ')', '[', ']', '"', "'", ':', ';', '=', '<', '>', '/', '_'];

/**
 * Éditeur de code : monospace, sans correction automatique, et barre de symboles
 * au-dessus du clavier (Tab, accolades…) introuvables vite sur un clavier de téléphone.
 */
export function CodeEditor({
  value,
  onChange,
  placeholder,
  flaggedLines = [],
  label = 'Code',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  flaggedLines?: number[];
  label?: string;
}) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const lineCount = Math.max(value.split('\n').length, 8);

  const insert = (key: string) => {
    const text = key === 'Tab' ? '  ' : key;
    const next = value.slice(0, selection.start) + text + value.slice(selection.end);
    const cursor = selection.start + text.length;
    onChange(next);
    setSelection({ start: cursor, end: cursor });
    input.current?.focus();
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.editor, { backgroundColor: colors.codeBg }]}>
        <View style={[styles.gutter, { borderRightColor: colors.codeLine }]}>
          {Array.from({ length: lineCount }, (_, i) => (
            <Text
              key={i}
              style={[
                styles.number,
                styles.editorLine,
                { color: flaggedLines.includes(i + 1) ? '#FFFFFF' : colors.codeFaint },
                flaggedLines.includes(i + 1) && { backgroundColor: colors.danger },
              ]}
            >
              {String(i + 1).padStart(2, '0')}
            </Text>
          ))}
        </View>
        <TextInput
          ref={input}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          multiline
          scrollEnabled={false}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={placeholder}
          placeholderTextColor={colors.codeFaint}
          textAlignVertical="top"
          style={[styles.editorInput, { color: colors.codeInk }]}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => insert(key)}
            accessibilityLabel={key === 'Tab' ? 'Tabulation' : `Insérer ${key}`}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: pressed ? colors.containerHigh : colors.card, borderColor: colors.border },
            ]}
          >
            <Text variant="mono">{key}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: radius.md, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  body: { padding: 12 },
  line: { flexDirection: 'row' },
  number: { fontFamily: fonts.monoRegular, fontSize: 12, lineHeight: 20, width: 28, marginRight: 10, textAlign: 'right' },
  code: { fontFamily: fonts.monoRegular, fontSize: 13, lineHeight: 20 },
  editor: { flexDirection: 'row', borderRadius: radius.md, minHeight: 200, overflow: 'hidden' },
  gutter: { paddingVertical: 12, paddingLeft: 6, borderRightWidth: StyleSheet.hairlineWidth },
  editorLine: { lineHeight: 21 },
  editorInput: { flex: 1, padding: 12, fontFamily: fonts.monoRegular, fontSize: 14, lineHeight: 21, minHeight: 200, ...noFocusRing },
  key: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1 },
});
