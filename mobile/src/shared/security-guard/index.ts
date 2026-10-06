import { scanForSecrets, type SecretFinding } from '@afridev/validation';
import rulesFile from '@afridev/validation/security-guard/rules.json';
import { useMemo } from 'react';

export type { SecretFinding };

/**
 * Étage 1 du Security Guard, exécuté sur le téléphone (même hors ligne) avec les mêmes
 * règles que le web et le backend : la publication reste verrouillée tant qu'un secret est là.
 */
export function useSecretScan(...texts: string[]): SecretFinding[] {
  const joined = texts.join('\n\u0000\n');
  return useMemo(() => joined.split('\n\u0000\n').flatMap((text) => scanForSecrets(text)), [joined]);
}

const PLACEHOLDER = 'VOTRE_CLE';

/** Remplace les secrets détectés par un marqueur, en gardant le nom de la variable. */
export function redactSecrets(text: string): string {
  let result = text;
  for (const rule of rulesFile.rules as { pattern: string; flags?: string }[]) {
    const regex = new RegExp(rule.pattern, `g${rule.flags ?? ''}`);
    result = result.replace(regex, (match) =>
      /(['"]).+\1/.test(match) ? match.replace(/(['"])[^'"]*\1/, `$1<${PLACEHOLDER}>$1`) : `<${PLACEHOLDER}>`,
    );
  }
  return result;
}
