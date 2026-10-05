import en from './en.json';
import fr from './fr.json';

export type Locale = 'fr' | 'en';
export type MessageKey = keyof typeof fr;

const messages: Record<Locale, Record<MessageKey, string>> = { fr, en };

export function t(key: MessageKey, locale: Locale = 'fr'): string {
  return messages[locale][key] ?? key;
}
