'use client';

import { CloudOff, RefreshCw, Wifi, WifiLow } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useIsClient } from '@/shared/hooks';
import { cn } from '@/shared/lib';

import { flushOutbox } from './outbox';
import { useNetworkQuality } from './useNetworkStatus';
import { useOutbox } from './useOutbox';

/**
 * Micro-bandeau de connectivité (DESIGN.md) : gris hors ligne, ambre en réseau lent,
 * vert quelques secondes au retour du réseau. Invisible quand tout va bien.
 */
export function ConnectivityStrip() {
  const isClient = useIsClient();
  const network = useNetworkQuality();
  const pending = useOutbox().length;
  const [backOnline, setBackOnline] = useState(false);
  const previous = useRef(network);

  useEffect(() => {
    if (previous.current === 'offline' && network !== 'offline') {
      setBackOnline(true);
      const timer = window.setTimeout(() => setBackOnline(false), 4000);
      previous.current = network;
      return () => window.clearTimeout(timer);
    }
    previous.current = network;
  }, [network]);

  if (!isClient) return null;

  let tone: 'offline' | 'slow' | 'online' | null = null;
  let message = '';
  if (network === 'offline') {
    tone = 'offline';
    message = pending
      ? `Hors ligne — ${pending} élément${pending > 1 ? 's' : ''} en file, envoi au retour du réseau`
      : 'Hors ligne — vos modifications sont gardées sur cet appareil';
  } else if (backOnline || pending) {
    tone = 'online';
    message = pending ? `De retour en ligne — envoi de ${pending} élément${pending > 1 ? 's' : ''}…` : 'De retour en ligne';
  } else if (network === 'slow') {
    tone = 'slow';
    message = 'Réseau lent — aperçus médias désactivés, texte prioritaire';
  }
  if (!tone) return null;

  const Icon = tone === 'offline' ? CloudOff : tone === 'slow' ? WifiLow : Wifi;
  return (
    <div
      role="status"
      className={cn(
        'flex h-8 items-center justify-between gap-2 px-4 font-mono text-label-sm',
        tone === 'offline' && 'bg-offline text-white',
        tone === 'slow' && 'bg-tertiary-soft text-on-tertiary-soft',
        tone === 'online' && 'bg-secondary-soft text-on-secondary-soft',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{message}</span>
      </span>
      {pending > 0 && network !== 'offline' ? (
        <button
          type="button"
          onClick={() => void flushOutbox()}
          className="flex shrink-0 items-center gap-1 underline-offset-2 hover:underline"
        >
          <RefreshCw className="size-3" aria-hidden /> Réessayer
        </button>
      ) : null}
    </div>
  );
}
