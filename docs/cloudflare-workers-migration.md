# Cloudflare Workers Migration

Cutover guide for moving **time-restricted.com** from Vercel to Cloudflare
Workers with `@opennextjs/cloudflare`, while keeping `main` / Vercel production
untouched until DNS flips.

Work happens on the `cloudflare-migration` branch.

Last updated: 2026-11-01.

---

## Architecture

- **Runtime:** Cloudflare Workers + OpenNext (`@opennextjs/cloudflare`)
- **Cache:** R2 incremental cache + Durable Object queue + D1 tag cache
- **Contact email:** `@workermailer/smtp` on Workers (same SMTP → SPF/DKIM unchanged);
  Nodemailer for local `next dev` and any remaining Vercel deploys
- **New posts:** `dynamicParams = false` + Cloudflare Deploy Hook
  (`CF_DEPLOY_HOOK_URL`) so first publish rebuilds static slug list

---

## One-time Cloudflare resource setup

From the repo root (Cloudflare account logged in via `npx wrangler login`):

```bash
# R2 bucket for Next incremental cache
npx wrangler r2 bucket create time-restricted-next-cache

# D1 database for on-demand revalidation tags
npx wrangler d1 create time-restricted-next-tag-cache
```

Copy the printed D1 `database_id` into [`wrangler.jsonc`](../wrangler.jsonc)
(`d1_databases[0].database_id`).

Initialize the revalidations table:

```bash
npx wrangler d1 execute time-restricted-next-tag-cache --remote --file=./migrations/0001_revalidations.sql
npx wrangler d1 execute time-restricted-next-tag-cache --local --file=./migrations/0001_revalidations.sql
```

---

## Secrets and vars

Set production secrets (do **not** commit values):

```bash
npx wrangler secret put REVALIDATE_SECRET
npx wrangler secret put WORDPRESS_REDIRECTION_USERNAME
npx wrangler secret put WORDPRESS_REDIRECTION_APPLICATION_PASSWORD
npx wrangler secret put MAILCHIMP_API_KEY
npx wrangler secret put MAILCHIMP_TURNSTILE_SECRET_KEY
npx wrangler secret put SMTP_PASS
npx wrangler secret put CONTACT_TURNSTILE_SECRET_KEY
npx wrangler secret put COMMENT_LOGIN_TURNSTILE_SECRET_KEY
npx wrangler secret put CF_DEPLOY_HOOK_URL
```

Non-secret vars can live in `wrangler.jsonc` `vars` or the Cloudflare dashboard
(Workers → Settings → Variables), matching [`.env.example`](../.env.example):

- `WORDPRESS_API_URL`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`
- `WORDPRESS_REDIRECTION_API_URL`, `WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS`
- `MAILCHIMP_LIST_ID`, Turnstile **site** keys (`NEXT_PUBLIC_*`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`, `CONTACT_TO`, `SMTP_SECURE`

For local Workers preview, put the same keys in `.dev.vars` (gitignored). Use
[`.dev.vars.example`](../.dev.vars.example) as a checklist.

### Cloudflare Deploy Hook

1. Cloudflare Dashboard → Workers & Pages → **time-restricted** → Settings →
   Build → **Deploy Hooks** (or Workers Builds deploy hooks for the connected repo)
2. Create a hook for the production branch
3. Store the URL as secret `CF_DEPLOY_HOOK_URL`

During migration, `VERCEL_DEPLOY_HOOK_URL` remains a supported fallback in code.

---

## Turnstile hostnames

In Cloudflare Turnstile, add allowed hostnames for each widget
(mailchimp signup, contact, comment login):

- Production: `time-restricted.com`, `www.time-restricted.com` (if used)
- Preview: your `*.workers.dev` subdomain after first deploy

Until preview hostnames are added, Turnstile widgets fail on the Workers URL.

---

## Build and preview

```bash
npm run preview   # OpenNext build + local Workers runtime
npm run deploy    # OpenNext build + deploy to Cloudflare
```

Keep WordPress webhooks pointed at **Vercel** until DNS cutover.

---

## Private-window smoke checklist (preview URL)

- [ ] `/`, `/all-posts`, an existing `/blog/{slug}`, `/contact`, `/privacy-policy`
- [ ] Legacy redirects (`/home`, dated post URLs) and `/wp-content/uploads/*`
- [ ] Contact form send (real SMTP via workermailer)
- [ ] Mailchimp subscribe + Turnstile
- [ ] Comment login cookie + post comment
- [ ] `POST /api/revalidate?token=…` for an existing slug → HTML refreshes
- [ ] First-publish payload → `deploy.triggered: true` → after rebuild, new slug 200
- [ ] `/feed.xml`, `/sitemap.xml`

---

## DNS cutover and Vercel teardown

DNS/registrar is already on Cloudflare. Cutover is Worker custom domain binding:

1. Workers → **time-restricted** → Custom Domains → add `time-restricted.com`
   (and `www` if needed)
2. Private-window smoke on production hostname
3. Point WordPress webhook at `https://time-restricted.com/api/revalidate?token=…`
4. **Disconnect Vercel Git** so `main` pushes no longer redeploy Vercel
5. Merge `cloudflare-migration` → `main`
6. Delete/disable the Vercel project when traffic is gone

---

## Free-tier notes

- Account-wide Workers Free: 100k requests/day (shared with other Workers such as
  hillwork)
- 10 ms CPU/request on Free may be tight for Next RSC; validate on preview
- Build minutes are ample for infrequent new-post rebuilds

See also [`cms-publish-and-cpu-optimizations.md`](./cms-publish-and-cpu-optimizations.md).
