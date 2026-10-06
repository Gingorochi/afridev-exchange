import { useCallback, useEffect, useRef, useState } from 'react';

import { draftsStore, readJson, writeJson } from '@/shared/storage';

const AUTOSAVE_INTERVAL_MS = 2_000;

/**
 * Anti-coupure (module 5) : brouillon enregistré dans MMKV toutes les 2 s s'il a changé,
 * restauré à la réouverture de l'écran — même après une batterie à plat.
 */
export function useAutosaveDraft<T>(draftId: string, value: T, onRestore?: (draft: T) => void) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const latest = useRef(value);
  const pristine = useRef(JSON.stringify(value));
  const lastSaved = useRef('');
  const restore = useRef(onRestore);

  useEffect(() => {
    latest.current = value;
    restore.current = onRestore;
  });

  useEffect(() => {
    const draft = readJson<T>(draftsStore, draftId);
    if (draft !== null) {
      lastSaved.current = JSON.stringify(draft);
      restore.current?.(draft);
    }
    const timer = setInterval(() => {
      const serialized = JSON.stringify(latest.current);
      if (serialized === lastSaved.current) return;
      lastSaved.current = serialized;
      if (serialized === pristine.current) draftsStore.delete(draftId);
      else {
        writeJson(draftsStore, draftId, latest.current);
        setSavedAt(new Date());
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [draftId]);

  const clear = useCallback(() => {
    lastSaved.current = '';
    setSavedAt(null);
    draftsStore.delete(draftId);
  }, [draftId]);

  return { savedAt, clear };
}
