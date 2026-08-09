# ResolveAI

Production-style AI customer support workspace. Support tickets are **Gmail threads** executed through **Swytchcode** (no direct Gmail SDK in the app).

## Stack

Next.js 15 + TypeScript + Tailwind + `@swytchcode/runtime` + global `swytchcode` CLI.

## How to run locally

```bash
npm install -g swytchcode
swytchcode login
cd resolve-ai
npm install
cp .env.example .env.local
```

### Gmail support inbox (live)

```bash
swytchcode get gmail
swytchcode add method gmail.user.profile.get
swytchcode add method gmail.user.threads.get
swytchcode add method gmail.user.threads.get1
swytchcode add method gmail.user.messages.get
swytchcode add method gmail.user.messages.get1
swytchcode add method gmail.user.send.create1
swytchcode add method gmail.user.labels.get
swytchcode add method gmail.user.modify.create1
swytchcode auth connect Gmail
```

In `.env.local`:

```env
SWYTCHCODE_MODE=live
SUPPORT_INBOX_EMAIL=you@gmail.com
SUPPORT_LABEL=ResolveAI
GMAIL_POLL_INTERVAL_MS=15000
```

```bash
npm run dev
```

Open [http://localhost:3000/inbox](http://localhost:3000/inbox).

While `SWYTCHCODE_MODE=dry-run`, Inbox stays empty on purpose (no fake Gmail tickets) and shows connection setup steps.

## Docs

- `docs/GMAIL_SWYTCHCODE.md` — ResolveAI ↔ real Gmail canonical IDs

## Scripts

```bash
npm run build
npm run start
npm run lint
```
