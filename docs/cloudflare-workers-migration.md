# Cloudflare Workers Hosting

**Status (2026-11-01): cutover complete.** Production for
`time-restricted.com` runs on Cloudflare Workers via
`@opennextjs/cloudflare`. The Vercel Git integration was disconnected; the
Vercel project may still exist until you delete it after DNS is fully settled.

This doc is the post-migration record: what we run, how it was set up, and what
future-you still needs to know. Day-to-day publishing details live in
[`cms-publish-and-cpu-optimizations.md`](./cms-publish-and-cpu-optimizations.md).
The older [`vercel-cpu-cost-control.md`](./vercel-cpu-cost-control.md) is
historical (pre-migration Vercel era).

---

## Current architecture

- **Runtime:** Cloudflare Workers + OpenNext (`@opennextjs/cloudflare`)
- **Worker name:** `time-restricted` (`wrangler.jsonc`)
- **Cache:** R2 incremental cache + Durable Object queue + D1 tag cache
- **Contact email:** `@workermailer/smtp` on Workers (same SMTP → SPF/DKIM
  unchanged); Nodemailer only for local `next dev`
- **New posts:** `dynamicParams = false` + Cloudflare Deploy Hook
  (`CF_DEPLOY_HOOK_URL`) so first publish rebuilds the static slug list
- **Code deploys:** Workers Builds on `git push origin main` (OpenNext build +
  deploy). Content-only new slugs use the Deploy Hook, not a git push.

---

## What already happened (do not re-do blindly)

1. Created R2 + D1 + DO bindings; real D1 `database_id` is in `wrangler.jsonc`
2. Deployed OpenNext Worker; bound custom domain `time-restricted.com`
3. Synced runtime secrets with `scripts/sync-wrangler-secrets.sh`
4. Added Turnstile hostnames for prod (and preview `*.workers.dev` as needed)
5. Connected GitHub → Workers Builds; production branch `main`
6. Created Deploy Hook; stored as Worker secret `CF_DEPLOY_HOOK_URL`
7. Merged `cloudflare-migration` → `main`; disconnected Vercel Git
8. Optional leftover: delete/disable the Vercel project when traffic is gone

Branch `cloudflare-migration` is historical; **`main` is the source of truth.**

---

## Day-to-day commands

```bash
npm run preview   # OpenNext build + local Workers runtime
npm run deploy    # OpenNext build + deploy to Cloudflare (manual)
```

Prefer git push to `main` once Workers Builds is healthy. If you deploy with
Wrangler/OpenNext CLI, use keep-vars so dashboard secrets survive:

```bash
npx @opennextjs/cloudflare deploy -- --keep-vars
```

### Workers Builds settings (reference)

| Field | Value |
|-------|--------|
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command | `npx @opennextjs/cloudflare deploy -- --keep-vars` |
| Preview command | `npx wrangler preview` |

**Build variables** (CI only — needed for SSG / `NEXT_PUBLIC_*` inlining):

- `WORDPRESS_API_URL`, `SITE_URL`
- `NEXT_PUBLIC_MAILCHIMP_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_CONTACT_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_COMMENT_LOGIN_TURNSTILE_SITE_KEY`

**Runtime secrets** stay on the Worker (not only in Build vars): SMTP,
Mailchimp API key, Turnstile secrets, `REVALIDATE_SECRET`,
`CF_DEPLOY_HOOK_URL`, redirection credentials, etc.

---

## Re-running one-time setup (only if recreating resources)

```bash
npx wrangler login
./scripts/cloudflare-setup.sh
./scripts/sync-wrangler-secrets.sh
```

`cloudflare-setup.sh` creates the R2 bucket + D1 database, writes the D1
`database_id` into [`wrangler.jsonc`](../wrangler.jsonc), and applies
[`migrations/0001_revalidations.sql`](../migrations/0001_revalidations.sql).

Local Workers preview: copy [`.dev.vars.example`](../.dev.vars.example) →
`.dev.vars` (gitignored).

### Deploy Hook (already configured; recreate if lost)

1. Workers → **time-restricted** → Settings → Builds → **Deploy Hooks**
2. Hook for production branch `main`
3. `npx wrangler secret put CF_DEPLOY_HOOK_URL` (paste the hook URL)

Code still accepts legacy `VERCEL_DEPLOY_HOOK_URL` / `DEPLOY_HOOK_URL` if set;
prefer `CF_DEPLOY_HOOK_URL` only.

### Turnstile hostnames

For each widget (Mailchimp, contact, comment login):

- Production: `time-restricted.com` (and `www` if used)
- Preview: `*.workers.dev` subdomain if you still smoke-test there

---

## Smoke checklist (production)

Use when debugging regressions:

- [ ] `/`, `/all-posts`, an existing `/blog/{slug}`, `/contact`, `/privacy-policy`
- [ ] Legacy redirects (`/home`, dated post URLs) and `/wp-content/uploads/*`
- [ ] Contact form (WorkerMailer / SMTP)
- [ ] Mailchimp subscribe + Turnstile
- [ ] Comment login + post comment
- [ ] `POST /api/revalidate?token=…` for an existing slug → HTML refreshes
- [ ] New publish → `deploy.triggered: true` → after rebuild, new slug 200
- [ ] `/feed.xml`, `/sitemap.xml`

WordPress revalidation webhook should target:

`https://time-restricted.com/api/revalidate?token=…`

---

## Pricing / limits notes

- Workers Paid was needed in practice (Free ~10 ms CPU/request is tight for Next)
- Account-wide request limits are shared with other Workers on the account
- Build minutes are fine for infrequent new-post rebuilds

---

## Lessons worth remembering

- Wrong GraphQL host → HTML parsed as JSON; use `https://api.…/graphql`
- Placeholder D1 id fails at runtime; use the real UUID from `wrangler d1 create`
- Nodemailer does not run on Workers; use `@workermailer/smtp` + address parsing
- `patch-package` keeps `cloudflare:sockets` external for SMTP
- Build vars ≠ runtime secrets; `NEXT_PUBLIC_*` must be present at **build** time
- Trash/delete does not fire the deploy hook; site stays fine (stale slug until
  next rebuild at worst)
