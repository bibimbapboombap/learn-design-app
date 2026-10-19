<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Single-page learning tracker: Google sign-in (Auth.js v5, `src/auth.ts`), task list read from a Notion page (`src/lib/curriculum.ts`, `src/lib/notion/`), completions and a snapshot of the Notion task list in Postgres (`src/lib/store.ts`), email on completion via Resend (`src/lib/notify.ts`).
- `cacheComponents` is on. Anything that reads the session must sit behind `<Suspense>` and go through `getCurrentUser()` in `src/lib/current-user.ts`.
- Every server action re-checks the session itself; never trust ids or user data sent from the client.
- Task ids are Notion block ids and double as storage keys for completions. The page format the parser expects is documented in `src/lib/notion/parse.ts` and in a callout on the Notion page; keep the two in sync.
- Notion is slow to read in full (~1 request per task, ~3 req/s), so pages always render from the snapshot and refresh it with `after()`; never fetch Notion on the request path except for the very first load.
- `src/lib/notion/*` has no runtime imports so `npm test` can run it with plain Node. Keep it that way.
- Styling is plain CSS Modules plus the tokens in `src/app/globals.css`. Light theme only, Notion-like, must work on phones.
- Check work with `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
