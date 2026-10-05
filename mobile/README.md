# mobile/ — Expo React Native feature-first

Même découpage que le web, pour passer de l'un à l'autre sans se perdre.

```
src/app/        Expo Router : routes minces (`export { FeedScreen as default } from '@/features/feed'`)
src/features/   une feature par dossier : api.ts, components/, screens/, index.ts (seule entrée publique)
src/shared/     ui, theme, api, query (cache MMKV), offline (file d'envoi, NetInfo, PowerSync),
                data-saver, drafts (MMKV toutes les 2 s), media, security-guard, notifications,
                realtime, layout (barre d'onglets), navigation, storage
```

## Écrans

| Onglet / route | Feature | Contenu |
| --- | --- | --- |
| `(tabs)/feed`, `post/[id]`, `compose/post`, `compose/short`, `shorts` | feed, discussions | Fil (FlashList), sondages, commentaires avec résumé IA, vidéos courtes |
| `(tabs)/questions`, `question/[id]`, `compose/question` | qa | Entraide : réponse IA avec sources, dictée vocale (Whisper), reformulation |
| `(tabs)/snippets`, `snippet/[id]`, `snippet/edit` | snippets | Coffre hors ligne, actions au glissement, Security Guard en direct |
| `(tabs)/projects`, `project/[id]`, `project/new`, `guide/[id]` | projects, matchmaking, onboarding-agent | Projets, recommandations, candidatures, guide IA |
| `(tabs)/profile`, `u/[username]` | profile | Bio IA, stack, activité, QR code |
| `notifications`, `settings`, `search` | notifications, settings, search | Alertes en direct, économie de données, recherche sémantique |

## Lancer

1. Variables `EXPO_PUBLIC_*` : voir `.env.example` à la racine (API, PowerSync, GitHub, URL web).
2. PowerSync, MMKV et le compresseur sont des modules natifs : utiliser un **development build**
   (`pnpm --filter mobile android`, puis `pnpm --filter mobile start`), pas Expo Go.
3. API locale sans Docker : `DJANGO_LITE=1` (voir `backend/`), puis `python scripts/seed_demo.py`
   pour les comptes de démo.

## Hors ligne et économie de données

- Les écrans lisent d'abord le cache local (TanStack Query persisté dans MMKV) ; posts, commentaires,
  questions, réponses, snippets et projets écrits sans réseau partent par `/api/sync/upload/`
  au retour de la connexion (UUID générés sur le téléphone, envoi rejouable sans doublon).
- Brouillons enregistrés toutes les 2 s ; détection de secrets avec les règles de
  `packages/validation` (mêmes que le web et le backend) : l'envoi est bloqué même hors ligne.
- Mode « Texte seul » automatique en 2G / 3G, vidéos jamais lancées seules hors Wi-Fi, images
  et vidéos compressées sur le téléphone avant l'envoi, voix en AAC mono 32 kb/s (Opus côté serveur).

## Vérifications

- `pnpm --filter mobile typecheck` et `pnpm --filter mobile lint` (frontières entre features).
- `npx expo export --platform android` : le bundle doit se construire sans erreur.
- Tests e2e (Maestro, mode avion) : `pnpm --filter mobile test:e2e`.
- Correctifs : EAS Update (`eas update --channel production`).
