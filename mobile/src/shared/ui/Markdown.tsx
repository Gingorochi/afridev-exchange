import * as Linking from 'expo-linking';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { fonts, space, useTheme } from '@/shared/theme';

import { CodeBlock } from './Code';
import { Text } from './Text';

/**
 * Markdown minimal (réponses IA, posts, guides) : titres, listes, blocs de code,
 * code en ligne, gras, italique, liens http(s) et citations [1].
 */

type Block =
  | { type: 'code'; language: string; code: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'paragraph'; text: string };

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const fence = line.match(/^```\s*([\w+#.-]*)/);
    if (fence) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) code.push(lines[i++] ?? '');
      blocks.push({ type: 'code', language: fence[1] ?? '', code: code.join('\n') });
      i += 1;
    } else if (/^#{1,4}\s/.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,4}\s+/, '') });
      i += 1;
    } else if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_ITEM.test(lines[i] ?? '')) items.push((lines[i++] ?? '').replace(LIST_ITEM, ''));
      blocks.push({ type: 'list', ordered, items });
    } else if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) quote.push((lines[i++] ?? '').replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: quote.join(' ') });
    } else if (!line.trim()) {
      i += 1;
    } else {
      const paragraph: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim() && !/^(```|#{1,4}\s|>)/.test(lines[i] ?? '') && !LIST_ITEM.test(lines[i] ?? '')) {
        paragraph.push(lines[i++] ?? '');
      }
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    }
  }
  return blocks;
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))|(\[\d+\])/g;

function Inline({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const { colors } = useTheme();
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [token] = match;
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${start}`;
    if (match[1]) {
      nodes.push(
        <Text key={key} style={[styles.inlineCode, { backgroundColor: colors.container, color: colors.primaryInk }]}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (match[2]) {
      nodes.push(
        <Text key={key} style={{ fontFamily: fonts.bold }}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (match[3]) {
      nodes.push(
        <Text key={key} style={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (match[4]) {
      const [, label = '', href = ''] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) ?? [];
      const safe = /^https?:\/\//.test(href);
      nodes.push(
        <Text
          key={key}
          tone="primary"
          style={safe ? { textDecorationLine: 'underline' } : undefined}
          onPress={safe ? () => void Linking.openURL(href) : undefined}
        >
          {label}
        </Text>,
      );
    } else if (match[5]) {
      const n = Number(token.slice(1, -1));
      nodes.push(
        <Text key={key} variant="mono" tone="primary" onPress={onCite ? () => onCite(n) : undefined}>
          {token}
        </Text>,
      );
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>{node}</Fragment>
      ))}
    </>
  );
}

export function Markdown({ source, onCite }: { source: string; onCite?: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {parse(source).map((block, index) => {
        switch (block.type) {
          case 'code':
            return <CodeBlock key={index} code={block.code} language={block.language || undefined} />;
          case 'heading':
            return (
              <Text key={index} variant="headlineMd" style={{ marginTop: 4 }}>
                <Inline text={block.text} onCite={onCite} />
              </Text>
            );
          case 'list':
            return (
              <View key={index} style={{ gap: 4 }}>
                {block.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text tone="primary" variant="mono">
                      {block.ordered ? `${j + 1}.` : '•'}
                    </Text>
                    <Text style={{ flex: 1 }}>
                      <Inline text={item} onCite={onCite} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={index} style={[styles.quote, { borderLeftColor: colors.borderStrong }]}>
                <Text tone="muted">
                  <Inline text={block.text} onCite={onCite} />
                </Text>
              </View>
            );
          default:
            return (
              <Text key={index}>
                <Inline text={block.text} onCite={onCite} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineCode: { fontFamily: fonts.monoRegular, fontSize: 14 },
  quote: { borderLeftWidth: 3, paddingLeft: space.sm },
});
