# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An Instagram-clone monorepo ("fotosnap"): a NestJS backend (`apps/backend`) and a Next.js 16 frontend (`apps/web`), connected by an end-to-end typesafe tRPC API, sharing types via a workspace package (`packages/trpc`). Package manager is pnpm (workspaces), orchestrated by Turborepo.

## Commands

Run from the repo root unless noted. Turborepo fans these out to each app via `turbo`.

- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run backend + web in dev/watch mode concurrently
- `pnpm build` — build all apps/packages
- `pnpm lint` — lint all apps/packages
- `pnpm check-types` — typecheck all apps/packages
- `pnpm format` — prettier write across the repo

Per-app (run inside `apps/backend` or `apps/web`, or via `turbo run <task> --filter=<app>` from the root):

Backend (`apps/backend`):
- `pnpm dev` — `nest start --watch`
- `pnpm test` — Jest unit tests (`*.spec.ts` files under `src`)
- `pnpm test:watch` / `pnpm test:cov` — Jest watch/coverage
- `pnpm test:e2e` — e2e tests via `test/jest-e2e.json`
- To run a single test file: `pnpm test -- path/to/file.spec.ts` (or `jest <pattern>` from `apps/backend`)
- `pnpm exec drizzle-kit generate` — generate a SQL migration from schema changes into `apps/backend/drizzle`
- `pnpm exec drizzle-kit push` / `migrate` — apply schema/migrations to the database
- `docker compose up -d` (repo root) — start local Postgres (`fotosnap` db, exposed on 5432)

Frontend (`apps/web`):
- `pnpm dev` — `next dev --port 3000`
- `pnpm check-types` — runs `next typegen` then `tsc --noEmit`
- `pnpm lint` — `eslint --max-warnings 0`

The backend listens on `PORT` (default 3001) with global prefix `api`; the web app proxies `/api/:path*` to `API_URL` (see `apps/web/next.config.js`) so the browser only ever talks to the Next.js origin.

## Architecture

### Monorepo layout

- `apps/backend` — NestJS API (Express platform, Drizzle ORM over Postgres, better-auth, tRPC via `nestjs-trpc-v2`)
- `apps/web` — Next.js App Router frontend (React 19, Tailwind v4, shadcn/ui components, TanStack Query, tRPC React client)
- `packages/trpc` (`@repo/trpc`) — the *shared contract* between backend and frontend: Zod schemas (`@repo/trpc/schemas`) and the tRPC router **type** (`@repo/trpc/router`)
- `packages/eslint-config`, `packages/typescript-config` — shared tooling configs consumed via `workspace:*`

### tRPC contract flow (the key thing to understand)

Unlike a typical tRPC setup where the router is hand-written once, here the router is defined with NestJS decorators on the backend, and `nestjs-trpc-v2` generates the plain tRPC router type into `packages/trpc/src/server/server.ts` (see `autoSchemaFile` in `apps/backend/src/app.module.ts`'s `TRPCModule.forRoot(...)`). That generated file is committed but its router bodies are placeholders (`"PLACEHOLDER_DO_NOT_REMOVE"`) — the real implementation lives in the Nest router classes, not in that file. The frontend only imports the `AppRouter` **type** from `@repo/trpc/router` for `createTRPCReact<AppRouter>`, never the implementation.

Practical implication: when you add/change a tRPC procedure, edit the Nest router (e.g. `apps/backend/src/posts/posts.router.ts`) and the Zod schema in `packages/trpc/src/schemas/post.schema.ts`; the backend dev server regenerates `packages/trpc/src/server/server.ts` — don't hand-edit that generated file's procedure bodies.

Router pattern (see `apps/backend/src/posts/`):
- `@Router()` class with `@Query`/`@Mutation` methods, `input`/`output` bound to Zod schemas from `@repo/trpc/schemas`
- `@UseMiddlewares(AuthTrpcMiddleware)` enforces auth per-router; the middleware calls better-auth's `getSession` and injects `user`/`session` into the tRPC context (`AppContext`, `apps/backend/src/app.context.interface.ts`) or throws
- Handlers delegate to a sibling `*.service.ts` for DB access

### Auth

better-auth (`apps/backend/src/app.module.ts`) with the Drizzle adapter, email/password enabled. Auth tables (`user`, `session`, `account`, `verification`) live in `apps/backend/src/auth/schema.ts` and are managed by better-auth's own migration flow, not hand-written Drizzle migrations for those tables. `@thallesp/nestjs-better-auth`'s `AuthGuard` is registered globally (`APP_GUARD`) for REST routes; tRPC routes are separately protected by `AuthTrpcMiddleware`. On the frontend, `apps/web/proxy.ts` (Next middleware) redirects to `/login` when there's no better-auth session cookie, for any route not in `publicRoutes` and not under `/api`.

### Database

Drizzle ORM + `pg`, single pooled connection provided via `DATABASE_CONNECTION` token (`apps/backend/src/database/database-connection.ts`), built in `DatabaseModule` from `DATABASE_URL`. The merged schema object (auth + posts schemas) is exported as `schema` from `database.module.ts` and used everywhere `NodePgDatabase<typeof schema>` is injected, so cross-table relational queries (`db.query.post.findMany({ with: { user, likes } })`) work. Schema files live next to their domain (`src/auth/schema.ts`, `src/posts/schemas/schema.ts`); `drizzle.config.ts` globs `./src/**/schema.ts` and outputs migrations to `apps/backend/drizzle`.

### File uploads

REST (not tRPC) endpoint `POST /api/upload/image` (`apps/backend/src/upload/`) using Multer disk storage into `apps/backend/uploads/images` with UUID-suffixed filenames; validated by size (5MB) and mimetype pipes, plus an extension filter. Files are served statically at `/uploads/*` (configured in `apps/backend/src/main.ts`). The frontend resolves a stored filename to a full URL via `apps/web/lib/image.ts`'s `getImageUrl`. Post/avatar creation flow: upload the file via REST first, then pass the returned filename as the `image` string into the tRPC `posts.create` mutation.

### Frontend structure

- `app/` — Next.js App Router pages (`login`, `signup`, dashboard at `/`)
- `components/dashboard/` — feature components (feed, photo/avatar upload dialogs, sidebar, stories)
- `components/ui/` — shadcn/ui primitives (`components.json` configures shadcn)
- `components/trpc/trpc-provider.tsx` + `lib/trpc/client.ts` — wraps the app with `QueryClientProvider` + tRPC React Query client (`httpBatchLink` to `/api/trpc`)
- `lib/auth/client.ts` — better-auth React client (`basePath: /api/auth`)
