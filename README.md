# Design Learning

A single page of tasks and resources for designers, at
<https://learn.vadimgrin.com>. People sign in with Google, tick tasks off as they
finish them, and every completion sends an email:

> **Jane Doe (jane@example.com) finished "Learn typography basics"**
> Progress: 4 of 12 tasks.

The task list is a Notion page, so it can be edited without touching code.

## Stack

| Concern       | Choice                                                    |
| ------------- | --------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), TypeScript, plain CSS Modules     |
| Sign-in       | Auth.js v5 with the Google provider (JWT sessions, no DB)  |
| Task list     | A Notion page; a copy is saved and refreshed every minute |
| Data          | Postgres on Neon (tables are created automatically)       |
| Email         | Resend                                                    |
| Hosting       | Vercel                                                    |

## Editing the task list

Open the **Design Learning: Tasks** page in Notion. The callout at the top
explains the format:

- Each **heading** starts a section. Text right under it becomes the section intro.
- Each **bullet** (or to-do, numbered item, toggle) under a heading is a task.
- A **callout** under a heading is an info card: shown with its icon, no
  checkbox, and not counted as a task.
- Indent under a task: plain text becomes its description, **links** become
  its resources. Pasted bookmarks work too.
- Everything above the first heading is hidden in the app.

The app shows a saved copy of the page and refreshes it in the background
whenever it's over a minute old, because reading the whole page from Notion
takes around half a minute. So an edit shows up a minute or so later, after a
reload. The very first visit after setup waits for that full read: open the
site once yourself after deploying.

Progress is stored against each task's Notion block id. Renaming or moving a
task keeps everyone's ticks; deleting it and typing it again creates a new task.

## Admin overview

<https://learn.vadimgrin.com/admin> shows everyone's progress: recent ticks,
and per person a progress bar, their latest task and, when expanded, every
task they've ticked per phase. Only admins can open it; everyone else gets
"not found". Admins are the addresses in `ADMIN_EMAILS`, or, if that isn't
set, the notification recipients in `NOTIFY_EMAIL`. People appear once they've
opened the app (visits are recorded from this feature onwards) or ticked a
task.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npm run dev
```

Open <http://localhost:3000>.

Everything except Google sign-in has a local fallback: without Notion
credentials a sample task list is shown, without `DATABASE_URL` progress goes to
`.data/progress.json`, and without `RESEND_API_KEY` the email is printed in the
terminal.

## Where things live

```
src/app/page.tsx             Main page: header, account bar, task list
src/app/task-list.tsx        Checkboxes and progress bar (client component)
src/app/login/page.tsx       Sign-in page
src/app/admin/page.tsx       Admin progress overview
src/app/actions.ts           Server actions: sign in/out, mark task done/undone
src/app/globals.css          Design tokens (colors, type, spacing)
src/auth.ts                  Auth.js config and who is allowed to sign in
src/proxy.ts                 Redirects signed-out visitors to /login
src/lib/curriculum.ts        Loads the task list (saved copy of Notion, or the sample)
src/lib/notion/client.ts     Fetches the Notion page's blocks
src/lib/notion/parse.ts      Turns those blocks into sections and tasks
src/lib/store.ts             Saves completions and the task list copy (Postgres, or local files)
src/lib/notify.ts            Sends the completion email
src/lib/overview.ts          Builds the admin overview from people and completions
src/content/                 Types and the sample task list
tests/                       Tests for the Notion reader and the admin overview
```

## One-time setup

### 1. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project
   and open **APIs & Services → OAuth consent screen** (now called
   **Google Auth Platform**). Choose **External**, fill in the app name
   ("Design Learning") and support email.
2. Under **Audience**, click **Publish app** so any Google account can sign in.
   The app only asks for name and email, so Google doesn't require a review.
3. Go to **Clients → Create client → Web application** and add these
   authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://learn.vadimgrin.com/api/auth/callback/google`
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret`.

### 2. Notion

1. Go to <https://www.notion.so/profile/integrations>, create an **internal**
   integration ("Design Learning") with **Read content** only, and copy its
   secret into `NOTION_TOKEN`.
2. Open the **Design Learning: Tasks** page, click **··· → Connections** and add
   the integration.
3. Copy the page's URL into `NOTION_PAGE_ID`.

### 3. Email (Resend)

1. Create an account at [resend.com](https://resend.com) and an API key →
   `RESEND_API_KEY`.
2. Set `NOTIFY_EMAIL` to the recipients, comma-separated.
3. The default sender `onboarding@resend.dev` only delivers to the address the
   Resend account was created with. To deliver to more than one address, add
   `vadimgrin.com` under **Domains** in Resend, copy the DNS records it shows
   into Cloudflare, and set `EMAIL_FROM` to e.g.
   `Design Learning <learn@vadimgrin.com>`.

### 4. Database (Neon)

In Vercel: **Project → Storage → Create → Neon Postgres**, connected to the
project. Vercel adds `DATABASE_URL` for you. The table is created on first use.

### 5. Deploy (Vercel) and the domain

1. Import the GitHub repo in Vercel (framework is detected) and add the
   environment variables from `.env.example`.
2. **Project → Settings → Domains → Add** `learn.vadimgrin.com`.
3. In Cloudflare DNS, add the record Vercel shows (a `CNAME` for `learn`),
   with the proxy turned off (grey cloud, "DNS only").

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server on port 3000         |
| `npm run build`     | Production build                |
| `npm run start`     | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | Generate route types, run `tsc` |
| `npm test`          | Tests (Notion reader, overview) |
