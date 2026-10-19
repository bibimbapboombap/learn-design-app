# Design Learning

A single page of tasks and resources for designers. People sign in with Google,
tick tasks off as they finish them, and every completion sends an email:

> **Jane Doe (jane@example.com) finished "Learn typography basics"**
> Progress: 4 of 12 tasks.

## Stack

| Concern       | Choice                                                    |
| ------------- | --------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), TypeScript, plain CSS Modules     |
| Sign-in       | Auth.js v5 with the Google provider (JWT sessions, no DB)  |
| Progress data | Postgres on Neon (`task_completions` table, auto-created)  |
| Email         | Resend                                                    |
| Hosting       | Vercel (planned)                                          |

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npm run dev
```

Open <http://localhost:3000>.

Without `DATABASE_URL`, progress is saved to `.data/progress.json`. Without
`RESEND_API_KEY`, the completion email is printed in the terminal instead of
sent. Google sign-in always needs real credentials.

## Where things live

```
src/content/curriculum.ts    The tasks, sections and resource links (edit this)
src/app/page.tsx             Main page: header + task list
src/app/task-list.tsx        Checkboxes, progress count (client component)
src/app/login/page.tsx       Sign-in page
src/app/actions.ts           Server actions: sign in/out, mark task done/undone
src/app/globals.css          Design tokens (colors, type, spacing)
src/auth.ts                  Auth.js config and who is allowed to sign in
src/proxy.ts                 Redirects signed-out visitors to /login
src/lib/progress.ts          Saves completions (Postgres, or a local file)
src/lib/notify.ts            Sends the completion email
```

Task `id`s in `curriculum.ts` are what completions are stored against. Change a
title freely, but don't change an `id` once people have started.

## One-time setup

### 1. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project
   (or pick one) and open **APIs & Services → OAuth consent screen**. Choose
   **External**, fill in the app name and support email, and publish it.
2. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
3. Add the authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret`.

To limit who can sign in, set `ALLOWED_EMAILS` and/or `ALLOWED_DOMAINS`.

### 2. Email (Resend)

1. Create an account at [resend.com](https://resend.com) and an API key →
   `RESEND_API_KEY`.
2. Set `NOTIFY_EMAIL` to the address that should receive notifications.
3. The default sender `onboarding@resend.dev` only delivers to the address the
   Resend account was created with. To send from your own domain, verify it in
   Resend and set `EMAIL_FROM`.

### 3. Database (Neon)

In Vercel: **Project → Storage → Create → Neon Postgres**. Vercel injects
`DATABASE_URL` for you. The table is created on first use.

### 4. Deploy (Vercel)

Import the GitHub repo in Vercel, add the environment variables from
`.env.example`, and deploy. Add the production URL to the Google OAuth
redirect URIs.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server on port 3000         |
| `npm run build`     | Production build                |
| `npm run start`     | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | Generate route types, run `tsc` |
