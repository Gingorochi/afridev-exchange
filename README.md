# afridev-exchange

Plateforme d'entraide pour développeurs africains : identité tech, fil social, questions-réponses,
coffre-fort de snippets, open source — pensée **hors ligne d'abord** et **faible consommation de données**.

## Principe : l'appli lit d'abord sa copie locale

Le web et le mobile ne lisent pas directement le serveur : ils lisent une **copie SQLite locale**
(PowerSync) synchronisée en arrière-plan avec PostgreSQL. Les écrans s'affichent tout de suite,
et les écritures faites hors ligne partent toutes seules au retour du réseau.

## Organisation (monorepo pnpm + Turborepo)

```
afridev-exchange/
├── backend/        # Django + DRF, Celery, Channels, PostgreSQL + pgvector
├── web/            # Next.js (App Router) + Tailwind, PWA (Serwist)
├── mobile/         # Expo + React Native, Expo Router
├── packages/
│   ├── api-client/   # client + types générés depuis l'OpenAPI de Django
│   ├── sync-schema/  # schéma de la base locale hors ligne (PowerSync)
│   └── validation/   # schémas Zod communs + règles anti-secrets (Security Guard)
├── infra/          # docker-compose, PowerSync, nginx
└── .github/workflows/ci.yml
```

Les trois couches suivent la même règle **feature-first** : un dossier par fonctionnalité métier
(calqué sur les 5 modules) et un dossier partagé qui n'importe jamais de code métier.

| Module | Django (`features/`) | Web et mobile (`features/`) |
|---|---|---|
| 1. Identité tech | accounts, profiles | auth, profile |
| 2. Fil et studio social | feed, discussions, translation | feed, discussions |
| 3. Entraide et snippets | qa, snippets, knowledge | qa, snippets |
| 4. Open source | projects, matchmaking, onboarding_agent | projects, matchmaking, onboarding-agent |
| 5. Low-data et hors ligne | sync, media | shared/offline, shared/data-saver, shared/drafts, shared/media |

Frontières vérifiées en CI : **import-linter** (backend), **eslint-plugin-boundaries** (web, mobile).

## Démarrage

```bash
# 1. Infrastructure (Postgres + pgvector, Redis, Meilisearch, PowerSync)
docker compose -f infra/docker-compose.yml up -d

# 2. Backend
cd backend
uv sync --extra dev
uv run python manage.py migrate
uv run python manage.py runserver

# 3. Front (depuis la racine)
corepack enable
pnpm install
cd mobile && npx expo install --fix && cd ..   # aligne les versions sur le SDK Expo courant
pnpm generate:api      # régénère les types après chaque changement d'API
pnpm --filter web dev
pnpm --filter mobile start
```

Variables d'environnement : copier `.env.example` en `.env`.
