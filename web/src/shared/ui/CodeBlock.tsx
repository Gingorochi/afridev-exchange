'use client';

import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { highlight } from 'sugar-high';
import { python } from 'sugar-high/presets';

import { cn, formatBytes, utf8Size } from '@/shared/lib';

const PYTHON_LIKE = new Set(['python', 'py']);

/** HTML coloré par sugar-high (~1 Ko) ; le code est échappé par la bibliothèque. */
export function highlightCode(code: string, language?: string) {
  return highlight(code, PYTHON_LIKE.has((language ?? '').toLowerCase()) ? python : undefined);
}

export function CopyButton({ text, className, label = 'Copier' }: { text: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ? undefined : copied ? 'Copié' : 'Copier le code'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // presse-papiers refusé (contexte non sécurisé) : rien à faire
        }
      }}
      className={cn('inline-flex items-center gap-1 font-mono text-label-md hover:opacity-80', className)}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {label ? (copied ? 'Copié' : label) : null}
    </button>
  );
}

/**
 * Bloc de code sombre façon terminal : nom de fichier, langage, copie,
 * numéros de ligne et lignes signalées (Security Guard).
 */
export function CodeBlock({
  code,
  language,
  filename,
  lineNumbers = true,
  flaggedLines = [],
  maxHeight,
  footer,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  lineNumbers?: boolean;
  flaggedLines?: number[];
  maxHeight?: number;
  footer?: React.ReactNode;
  className?: string;
}) {
  const html = useMemo(() => {
    // Sans le saut de ligne final, pas de ligne vide numérotée en bas du bloc.
    const highlighted = highlightCode(code.replace(/\n+$/, ''), language);
    if (!flaggedLines.length) return highlighted;
    // Marque les lignes signalées : chaque ligne est un <span class="sh__line">.
    let index = 0;
    return highlighted.replace(/<span class="sh__line"/g, (match) => {
      index += 1;
      return flaggedLines.includes(index) ? `${match} data-flagged` : match;
    });
  }, [code, language, flaggedLines]);

  return (
    <figure className={cn('overflow-hidden rounded-xl bg-code-bg text-code-ink', className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-code-line px-4 py-2.5 font-mono text-label-md">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="truncate text-code-ink">{filename ?? language ?? 'code'}</span>
          {filename && language ? (
            <span className="rounded-full bg-code-line px-2 py-0.5 text-code-faint">{language}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-code-faint">
          <span className="hidden sm:inline">{formatBytes(utf8Size(code))}</span>
          <CopyButton text={code} className="text-code-ink" />
        </span>
      </figcaption>
      <pre
        className="code-block overflow-auto px-4 py-3 font-mono text-code"
        data-line-numbers={lineNumbers || undefined}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      {footer ? (
        <div className="border-t border-code-line px-3 py-2 font-mono text-label-sm text-code-faint">{footer}</div>
      ) : null}
    </figure>
  );
}
