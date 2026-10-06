# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An Instagram-clone monorepo ("fotosnap"): a NestJS backend (`apps/backend`) and a Next.js 16 frontend (`apps/web`), connected by an end-to-end typesafe tRPC API, sharing types via a workspace package (`packages/trpc`). Features: email/password auth, posts (image + caption), likes, saved posts, comments, follow/unfollow, user profiles, 24-hour stories. Package manager is pnpm (workspaces, pinned in `packageManager`), orchestrated by Turborepo.

The root `README.md` is the unmodified Turborepo starter README (it mentions `docs` and `@repo/ui`, which don't exist here) and `apps/backend/README.md` is the stock Nest README — neither describes this project.

## Commands

Run from the repo root unless noted. Turborepo fans these out to each app via `turbo`.

- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run backend + web + `@repo/trpc` (`tsc --watch`) in dev/watch mode concurrently
- `pnpm build` — build all apps/packages
- `pnpm lint` — lint all apps/packages (**the backend lint script runs `eslint --fix`, so it rewrites files**)
- `pnpm check-types` — typecheck all apps/packages
- `pnpm format` — prettier write across the repo (`**/*.{ts,tsx,md}`)

Per-app (run inside `apps/backend` or `apps/web`, or via `turbo run <task> --filter=<app>` from the root):

Backend (`apps/backend`):
- `pnpm dev` — `nest start --watch`
- `pnpm test` — Jest unit tests (`*.spec.ts` under `src`); none exist yet
- `pnpm test:watch` / `pnpm test:cov` — Jest watch/coverage
- `pnpm test:e2e` — e2e tests via `test/jest-e2e.json`; the only e2e file is the untouched Nest boilerplate asserting `GET /` → "Hello World!", which no controller serves (and booting `AppModule` needs `DATABASE_URL`/`UI_URL`)
- To run a single test file: `pnpm test -- path/to/file.spec.ts` (or `jest <pattern>` from `apps/backend`)
- `pnpm exec drizzle-kit generate` — generate a SQL migration from schema changes into `apps/backend/drizzle`
- `pnpm exec drizzle-kit push` / `migrate` — apply schema/migrations to the database (needs `DATABASE_URL`)
- `docker compose up -d` (repo root) — start local Postgres 16 (`fotosnap` db, user/password `postgres`, exposed on 5432)

Frontend (`apps/web`):
- `pnpm dev` — `next dev --port 3000`
- `pnpm check-types` — runs `next typegen` then `tsc --noEmit`
- `pnpm lint` — `eslint --max-warnings 0`

`@repo/trpc` has no `check-types` script and its `exports` point at `dist/` (`./dist/schemas`, `./dist/server/server`). The package must be built (`pnpm build` / `turbo run build --filter=@repo/trpc`, or the `tsc --watch` that `pnpm dev` runs) before the backend or web can resolve `@repo/trpc/*` — on a fresh clone, imports and `check-types` fail until it has been built.

### Environment variables

No `.env.example` is committed and `.env` files are gitignored. Variables read in code:

- Backend: `DATABASE_URL` (required; also used by `drizzle.config.ts`), `UI_URL` (required; better-auth `trustedOrigins`), `PORT` (default 3001)
- Web: `API_URL` (backend origin for the `/api/*` rewrite in `next.config.js`), `NEXT_PUBLIC_API_URL` (backend origin used by `getImageUrl` for `/uploads/...`), `BACKEND_PROTOCOL` + `BACKEND_HOST` (added to `next/image` `remotePatterns`)

The backend listens on `PORT` with global prefix `api`; the web app proxies `/api/:path*` to `API_URL` so the browser only talks to the Next.js origin for API calls. (Uploaded images are the exception: `getImageUrl` points the browser straight at `NEXT_PUBLIC_API_URL`.)

### Production / deploy

`apps/backend/buildspec.yml` (AWS CodeBuild) installs with `--frozen-lockfile`, runs `turbo run build --filter=backend`, then `pnpm --filter=backend deploy --prod out` and assembles a bundle (`dist`, `node_modules`, `drizzle`, `Procfile`, `package.json`) for Elastic Beanstalk. `apps/backend/Procfile` runs `drizzle-kit migrate --config=dist/drizzle.config.js` and then `node dist/src/main.js` — so migrations are applied automatically on every deploy, and the build output layout (`dist/src/main.js`, `dist/drizzle.config.js`) must be preserved. Because `turbo.json` only declares `.next/**` as build outputs, turbo's cache won't restore `dist/` for the backend or `@repo/trpc`.

## Architecture

### Monorepo layout

- `apps/backend` — NestJS API (Express platform, Drizzle ORM over Postgres, better-auth, tRPC via `nestjs-trpc-v2`)
- `apps/web` — Next.js App Router frontend (React 19, Tailwind v4, shadcn/ui components, TanStack Query, tRPC React client)
- `packages/trpc` (`@repo/trpc`) — the *shared contract* between backend and frontend: Zod schemas (`@repo/trpc/schemas`) and the tRPC router **type** (`@repo/trpc/router`)
- `packages/eslint-config`, `packages/typescript-config` — shared tooling configs consumed via `workspace:*`

### tRPC contract flow (the key thing to understand)

Unlike a typical tRPC setup where the router is hand-written once, here the router is defined with NestJS decorators on the backend, and `nestjs-trpc-v2` generates the plain tRPC router type into `packages/trpc/src/server/server.ts` (see `autoSchemaFile` in `apps/backend/src/app.module.ts`'s `TRPCModule.forRoot(...)`). That generated file is committed but its router bodies are placeholders (`"PLACEHOLDER_DO_NOT_REMOVE"`) — the real implementation lives in the Nest router classes, not in that file. The frontend only imports the `AppRouter` **type** from `@repo/trpc/router` for `createTRPCReact<AppRouter>`, never the implementation.

Practical implication: when you add/change a tRPC procedure, edit the Nest router and the matching Zod schema in `packages/trpc/src/schemas/*.schema.ts` (re-exported from `schemas/index.ts`); the backend dev server regenerates `packages/trpc/src/server/server.ts` — don't hand-edit that generated file's procedure bodies.

Routers (one Nest module each) and how they appear on the client — the key is the **class name camelCased**, so the frontend calls `trpc.postsRouter.findAll`, not `trpc.posts.findAll`:
- `PostsRouter` (`src/posts/`) — create, findAll (optionally by `userId`), likePost (toggle), savePost (toggle), getSavedPosts
- `UsersRouter` (`src/auth/users/`) — follow/unfollow, getFollowers/getFollowing, getSuggestedUsers, getUserProfile, updateProfile
- `CommentsRouter` (`src/comments/`) — create, findByPostId, delete (own comments only)
- `StoriesRouter` (`src/stories/`) — create (expires after 24h), getStories (grouped by user; own + followed users, unexpired only)

Router pattern:
- `@Router()` class with `@Query`/`@Mutation` methods, `input`/`output` bound to Zod schemas from `@repo/trpc/schemas`
- `@UseMiddlewares(AuthTrpcMiddleware)` enforces auth per-router; the middleware calls better-auth's `getSession` and injects `user`/`session` into the tRPC context (`AppContext`, `apps/backend/src/app.context.interface.ts`) or throws. Handlers read the caller via `@Ctx() context: AppContext` (`context.user.id`)
- Handlers delegate to a sibling `*.service.ts` for DB access
- Backend code imports via the `src/*` path alias (`tsconfig.json` `paths`) as well as relative paths; new routers must also be added to `AppModule` imports

### Auth

better-auth (`apps/backend/src/app.module.ts`) with the Drizzle adapter, email/password enabled, `trustedOrigins` from `UI_URL`. Auth tables (`user`, `session`, `account`, `verification`) live in `apps/backend/src/auth/schema.ts` alongside the app's own `follow` table, and `user` carries app-specific columns (`bio`, `website`). They are part of the normal Drizzle migrations (`drizzle/0000_*.sql`), so schema changes go through `drizzle-kit generate`. `@thallesp/nestjs-better-auth`'s `AuthGuard` is registered globally (`APP_GUARD`) for REST routes; tRPC routes are separately protected by `AuthTrpcMiddleware`. `main.ts` creates the Nest app with `bodyParser: false` (required by the better-auth Nest integration — don't re-enable it without checking). On the frontend, `apps/web/proxy.ts` (Next middleware) redirects to `/login` when there's no better-auth session cookie, for any route not in `publicRoutes` (`/login`, `/signup`) and not under `/api`; it only checks cookie presence, not validity.

### Database

Drizzle ORM + `pg`, single pooled connection provided via `DATABASE_CONNECTION` token (`apps/backend/src/database/database-connection.ts`), built in `DatabaseModule` from `DATABASE_URL`. The merged schema object (auth + posts + comments + stories schemas) is exported as `schema` from `database.module.ts` and used everywhere `NodePgDatabase<typeof schema>` is injected, so cross-table relational queries (`db.query.post.findMany({ with: { user, likes } })`) work. **A new schema file must be spread into `schema` in `database.module.ts`**, otherwise relational queries won't see it. Schema files live next to their domain (`src/auth/schema.ts`, `src/posts/schemas/schema.ts`, `src/comments/schemas/schema.ts`, `src/stories/schemas/schema.ts`); `drizzle.config.ts` globs `./src/**/schema.ts` (so keep that filename) and outputs migrations to `apps/backend/drizzle`. Tables have circular imports (`auth` ↔ `posts` ↔ `comments`) that are only safe because references are wrapped in callbacks.

### File uploads

REST (not tRPC) endpoint `POST /api/upload/image` (`apps/backend/src/upload/`, multipart field name `image`) using Multer disk storage into `apps/backend/uploads/images` (relative to the process cwd; gitignored) with `<name>-<timestamp>-<uuid>.<ext>` filenames; validated by size (5MB) and mimetype pipes, plus an extension filter (jpg/jpeg/png/gif/webp). Files are served statically at `/uploads/*` (configured in `apps/backend/src/main.ts`, resolved from `dist/src` as `../../uploads`). The endpoint returns `{ filename }`; the frontend resolves a stored filename to a full URL via `apps/web/lib/image.ts`'s `getImageUrl` (`NEXT_PUBLIC_API_URL/uploads/images/<filename>`). Creation flow for posts, stories, and avatars: upload the file via REST first (the browser `fetch`es `/api/upload/image`, handled in `app/page.tsx` and `components/dashboard/sidebar.tsx`), then pass the returned filename as the `image` string into the follow-up call — tRPC `postsRouter.create` / `storiesRouter.create` for posts and stories, but better-auth's `authClient.updateUser({ image })` for avatars (`usersRouter.updateProfile` only accepts `name`, `bio`, `website`). Only filenames are stored in the DB, never URLs.

### Frontend structure

- `app/` — Next.js App Router pages (`login`, `signup`, dashboard at `/`, profile at `users/[userId]`); pages are mostly client components using tRPC hooks
- `components/dashboard/` — feed, sidebar, stories (list/upload/viewer), comments, photo/avatar upload dialogs, edit-profile modal
- `components/users/` — profile page pieces (header, tabs, posts grid, post modal, followers/following modal)
- `components/auth/` — login/signup forms (react-hook-form + the Zod schemas in `lib/auth/schema.ts`)
- `components/ui/` — shadcn/ui primitives (`components.json` configures shadcn; built on `@base-ui/react`)
- `components/theme/` — `next-themes` provider and toggle
- `components/trpc/trpc-provider.tsx` + `lib/trpc/client.ts` — wraps the app with `QueryClientProvider` + tRPC React Query client (`httpBatchLink` to `/api/trpc`; the `QueryClient` is a module-level singleton)
- `lib/auth/client.ts` — better-auth React client (`basePath: /api/auth`)
