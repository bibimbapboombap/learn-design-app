<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Single-page learning tracker: Google sign-in (Auth.js v5, `src/auth.ts`), task list from `src/content/curriculum.ts`, completions in Postgres (`src/lib/progress.ts`), email on completion via Resend (`src/lib/notify.ts`).
- `cacheComponents` is on. Anything that reads the session must sit behind `<Suspense>` and go through `getCurrentUser()` in `src/lib/current-user.ts`.
- Every server action re-checks the session itself; never trust ids or user data sent from the client.
- Task ids in `curriculum.ts` are storage keys. Don't rename them.
- Styling is plain CSS Modules plus the tokens in `src/app/globals.css`.
- Check work with `npm run lint`, `npm run typecheck` and `npm run build`.
