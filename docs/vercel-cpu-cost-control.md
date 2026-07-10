# Vercel CPU And Runtime Cost Control

Low-traffic headless sites can still show high Vercel fluid active CPU if each page
view triggers multiple serverless invocations, proxy work, and uncached dynamic
renders. Treat this as an ongoing optimization pass after launch, not a launch
blocker.

This document records cost-control patterns from another headless WordPress project
and evaluates whether each applies to **time-restricted.com** (`time-restricted-vercel`).

Last reviewed: 2026-07-10.

**Status key**

| Status | Meaning |
|--------|---------|
| ✅ **Apply** | Worth doing on this project |
| ⚠️ **Partial** | Applies with caveats or reduced benefit |
| ✔️ **Done** | Already implemented here |
| ❌ **N/A** | Does not apply to this codebase |

---

## Why CPU Can Look High On A Quiet Site

Typical multipliers for this architecture:

- Every page view may trigger more than one serverless function.
- Client-side auth checks can duplicate work if separate endpoints call session
  helpers independently.
- `proxy.ts` may load WordPress Redirection rules on most non-root routes.
- Only a subset of post URLs may be prebuilt; unknown or legacy post URLs can
  remain dynamic and re-render on bot crawls.
- `not-found.tsx` can fetch WordPress data for junk 404s.
- WordPress webhook revalidation and crawler traffic can exceed human traffic.

### Additional multipliers on this project

Reviewed against the current codebase:

| Source | Location | Notes |
|--------|----------|-------|
| **Full post list fetched for sidebar archives** | `getArchiveMonths()` → `getAllPostSummaries()` in `app/layout.tsx` | Paginates **every published post** (100 per GraphQL page) on every layout render |
| **Full post list fetched again on blog posts** | `getAdjacentPosts()` → `getAllPostSummaries()` | Same full pagination, often in the **same request** as layout archives — not deduped |
| Sidebar recent posts + categories | `app/layout.tsx` | Two additional GraphQL calls per page |
| Homepage featured list | `app/page.tsx` | Another GraphQL call |
| Blog post body + comments | `getPostBySlug()` | One or more GraphQL calls; comment threads paginate 100 at a time |
| Blog post SEO metadata | `generateMetadata()` → `getPostSeoBySlug()` | Separate REST fetch from GraphQL post body |
| `/all-posts` archive | `getAllPosts()` | Full post list again |
| Proxy redirect lookup | `proxy.ts` | Runs on most HTML routes; may fetch Redirection plugin rules (default TTL 300s) |
| 404 recovery list | `app/not-found.tsx` | `getLatestPosts()` on every unmatched URL |
| Legacy URL / bot 404 traffic | Migration + GSC | Junk paths and old WordPress URLs generate expensive 404 renders |
| `/feed.xml` and `/sitemap.xml` | `app/feed.xml/route.ts`, `app/sitemap.ts` | Regenerate hourly; each pulls all posts |
| Homepage query-param routes | `app/page.tsx` | `?s=`, `?category=`, `?year=&month=` force dynamic renders |

> **Highest hidden cost:** `getAllPostSummaries()` is the workhorse behind archives,
> adjacent-post navigation, `/all-posts`, and `/feed.xml`. A single blog page view can
> trigger **two full post-list paginations** (layout + adjacent posts) plus post body,
> SEO, and sidebar queries — even when the HTML was prebuilt at deploy time and is
> being regenerated after cache expiry or webhook invalidation.

---

## Low-Risk Reduction Plan (Source Project)

Each item is marked with applicability for **this** project.

### 1. Combine client auth checks into one endpoint — ❌ **N/A**

Replace separate `/api/auth/session` and `/api/auth/permissions` client calls with one
`/api/auth/summary` route.

- Return `isAuthConfigured`, `isSignedIn`, and `canViewAllPosts`.
- Share the result through one client provider/hook so each page makes one auth
  request.
- Expected impact (source project): roughly one-third fewer function invocations per
  page view.

**This project:** Already uses a single `/api/auth/me` route, called only from
`CommentForm` on blog pages with comments open. No `/api/auth/session` +
`/api/auth/permissions` split. No `getServerSession()` on the server. **No action
needed.**

---

### 2. Prebuild all public posts — ✔️ **Done**

Set `WORDPRESS_PREBUILD_POST_LIMIT=0` to prebuild every public post at build time.

- Expected impact (source project): fewer dynamic SSR renders for dated post URLs.

**This project:** `app/blog/[slug]/page.tsx` calls `getAllPostSlugs()` with no limit
in `generateStaticParams()`. There is no `WORDPRESS_PREBUILD_POST_LIMIT` env var.
All published slugs are prebuilt at deploy time. Unknown slugs still render
dynamically (`dynamicParams` defaults to `true`). **No action needed** unless you
want `dynamicParams = false` to block bot probes of garbage slugs (see item 8 below).

---

### 3. Increase Redirection cache TTL — ✅ **Apply**

Raise `WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS` to `86400` if redirect rules rarely
change.

- Expected impact: fewer WordPress Redirection API fetches from `proxy.ts`.
- Risk: very low.

**This project:** Default is `300` (`.env.example`, `proxy.ts`). Redirect rules change
rarely. **Set to `86400` in Vercel production env.**

---

### 4. Skip redirect lookup on known App Router paths — ✅ **Apply**

Extend `proxy.ts` to skip Redirection scans for first-party routes. Keep redirect
lookup for legacy/unknown paths.

- Expected impact: less proxy CPU on normal browsing.
- Risk: low if Redirection rules are mostly legacy URLs.

**This project:** `proxy.ts` calls `getMatchingRedirect()` (WordPress Redirection API)
after built-in legacy handlers on most routes. Skip plugin lookup for:

- `/`
- `/all-posts`
- `/contact`
- `/privacy-policy`
- `/blog/*`

Legacy dated URLs, `/home`, `/posts`, etc. are already handled before the plugin
lookup. **Implement in `proxy.ts`.**

---

### 5. Lighten the 404 page — ⚠️ **Partial**

Replace full `getPublicPosts()` usage in `app/not-found.tsx` with a smaller
recent-posts query.

- Expected impact: lower cost for bot-generated 404 traffic.

**This project:** Already uses `getLatestPosts()` (10 posts, displays 5), not a full
archive. Still triggers a GraphQL round-trip on every 404 — costly during bot crawls
of legacy WordPress URLs. Options: remove the recent-posts list entirely, reduce to
`first: 5`, or cache the query. **Worth doing during migration bot traffic.**

---

### 6. Lengthen public content cache TTL — ⚠️ **Partial**

Increase default WordPress fetch `revalidate` for public reads from `300` to `3600`
when webhook revalidation is configured.

- Expected impact: fewer WordPress round-trips after cache expiry.

**This project:** `wpFetch()` and `wpRestFetch()` use cache **tags** without a
time-based `revalidate`. Content refreshes via `/api/revalidate` webhooks, not a 300s
timer. `app/sitemap.ts` and `app/feed.xml/route.ts` already use `revalidate = 3600`.
There is no global 300s fetch TTL to bump. Optional: add `revalidate: 3600` to
GraphQL fetches as fallback when webhooks fail. **Lower priority than items 3, 4, and
9.**

---

### 7. Avoid duplicate server-side session on post pages — ❌ **N/A**

Pass session data from the post page into `Comments` instead of calling
`getServerSession()` again in the component.

**This project:** Auth is client-only via `CommentForm` → `/api/auth/me`. The post
page server component does not call session helpers. **No action needed.**

---

### What to avoid early

- Removing `proxy.ts` entirely.
- CDN-caching authenticated auth responses.
- Disabling webhook revalidation to save CPU.
- Making protected routes static without understanding auth requirements (not
  relevant here — `/all-posts` is public).

### How to validate improvements

In Vercel Observability, compare before and after:

- Invocations of auth routes.
- Invocations of dynamic dated post routes.
- 404 route cost.
- Overall fluid active CPU percentage over 24–48 hours.

---

## Applicability Summary

| # | Change | Status |
|---|--------|--------|
| 1 | Combine client auth into one endpoint | ❌ **N/A** |
| 2 | Prebuild all public posts | ✔️ **Done** |
| 3 | Increase Redirection cache TTL | ✅ **Apply** |
| 4 | Skip redirect lookup on known paths | ✅ **Apply** |
| 5 | Lighten the 404 page | ⚠️ **Partial** |
| 6 | Lengthen public content cache TTL | ⚠️ **Partial** |
| 7 | Dedupe server-side session on post pages | ❌ **N/A** |

---

## Additional Factors (Not In Source Project)

These are likely contributors to high **Fluid Active CPU** on the Vercel Hobby tier
for this site specifically. Fluid Active CPU measures compute time, not just request
count — long GraphQL pagination loops cost more per request than a simple static
response.

### High impact

| Factor | Location | Why it costs CPU |
|--------|----------|------------------|
| **Double full post-list fetch per blog page** | `getArchiveMonths()` + `getAdjacentPosts()` both call `getAllPostSummaries()` | Two paginated scans of every post on each blog render after cache miss |
| **Layout archive sidebar** | `app/layout.tsx` → `getArchiveMonths()` | Full post list on **every page**, not just blog posts |
| **Global webhook invalidation** | `app/api/revalidate/route.ts` → `revalidateTag('wordpress')` | Any CMS edit invalidates all tagged fetches; next bot crawl regenerates many pages at once |
| **Proxy + page = two execution layers** | `proxy.ts` then App Router render | Every HTML request pays proxy logic before the page handler |
| **In-memory redirect cache lost on cold start** | `proxy.ts` module-level `redirectCache` | Each new serverless instance refetches Redirection rules until warm |
| **Migration / SEO bot traffic** | GSC, Bing, legacy WordPress URLs | Crawlers hit dated paths, `/home`, junk slugs → redirects + 404 renders with full layout |

### Medium impact

| Factor | Location | Why it costs CPU |
|--------|----------|------------------|
| **Dynamic homepage variants** | `app/page.tsx` with `searchParams` | `/?category=`, `/?year=&month=`, `/?s=` bypass static caching |
| **Comment pagination loop** | `getPostBySlug()` | Posts with 100+ comments trigger multiple GraphQL round-trips |
| **Duplicate SEO fetch** | `generateMetadata()` REST + page GraphQL | Two WordPress calls per blog post render |
| **`/all-posts` full archive** | `getAllPosts()` | Entire post list on each render after cache miss |
| **`/feed.xml` full fetch, slice 50** | `getAllPosts().slice(0, 50)` | Fetches all posts hourly to serve 50 items |
| **`/sitemap.xml` REST pagination** | `app/sitemap.ts` | Hourly regen; bare `fetch()` without shared cache tags |
| **Next.js `<Link>` prefetch** | Sidebar, homepage, all-posts | Visible blog links prefetch RSC payloads in the background |
| **`sanitize-html` on post content** | `app/blog/[slug]/page.tsx`, privacy policy | CPU time on long HTML bodies during render |

### Lower impact / environmental

| Factor | Notes |
|--------|-------|
| **Preview deployments** | Each preview build + traffic counts toward Hobby limits |
| **WordPress backend latency** | Slow GraphQL/REST responses extend function duration → more Fluid CPU per invocation |
| **Auth API on blog pages** | `/api/auth/me` per blog page with comments — minor compared to layout/post-list cost |
| **Contact / subscribe / comment POST routes** | Only run on form submission — negligible for CPU quota |
| **Image optimization disabled** | `unoptimized: true` in `next.config.ts` — **good**; avoids Image Optimization CPU |

### Hobby tier context

Vercel Hobby includes limited **Fluid Active CPU** (compute-seconds), not just
function invocations. A low-traffic site can hit the CPU cap when:

- Crawlers generate many renders per day (often 10–100× human visits during migration).
- Each render runs layout + full post-list pagination + post body.
- Webhook revalidation causes a burst of cold regenerations.
- Cold starts repeat proxy redirect fetches.

Check **Vercel → Usage → Fluid Active CPU** and **Observability → Functions** to see
which routes consume the most time. Expect `/blog/[slug]`, `/`, `404`, and `proxy`
to rank high.

---

## Recommended Actions For This Project

Ordered by effort vs. impact:

### Do first (config only)

1. ✅ **Set `WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS=86400`** in Vercel production.

### Do next (small code changes)

2. ✅ **Skip WordPress Redirection plugin lookup for known first-party paths** in
   `proxy.ts`.

3. ⚠️ **Reduce 404 WordPress cost** — remove or shrink recent-posts query in
   `app/not-found.tsx`.

### High value, not in source project (consider next)

4. ✅ **Stop fetching the full post list twice per blog page.**
   - Wrap `getAllPostSummaries()` in React `cache()` so layout + `getAdjacentPosts()`
     share one result per request.
   - Better: replace `getArchiveMonths()` with a dedicated lightweight GraphQL query
     (or cached static list) instead of scanning all post nodes.

5. ✅ **Cache or statically generate archive months.**
   - Archive month labels change only when a post is published; tie invalidation to
     the existing webhook instead of recomputing from all posts on every render.

6. ⚠️ **Add `revalidate: 3600`** to `wpFetch()` / `wpRestFetch()` as time-based
   fallback alongside tag revalidation.

7. ⚠️ **Set `prefetch={false}`** on sidebar/archive blog links if Observability
   shows high background `/blog/*` invocations.

8. ⚠️ **Set `dynamicParams = false`** on blog posts to reject garbage slug probes —
   only if new posts are covered by deploy + webhook workflow.

9. ⚠️ **Narrow webhook revalidation** — avoid blanket `revalidateTag('wordpress')`
   on minor edits if bursts correlate with CPU spikes.

### Not needed here

- ❌ Combined auth summary endpoint (item 1)
- ❌ Prebuild post limit env var (item 2)
- ❌ Server-side session deduplication (item 7)

---

## Project-Specific Cost Profile

Compared to the source project, this site is **simpler on auth** but pays more for
**layout + repeated full post-list queries**:

```
Typical blog post page view (after cache miss)
├── proxy.ts                    → legacy handlers + maybe Redirection API fetch
├── layout.tsx                  → getLatestPosts (1×)
│                               → getArchiveMonths → getAllPostSummaries (N×)
│                               → getCategories (1×)
├── blog/[slug]/page.tsx        → getPostBySlug (1–M× comments)
│                               → getAdjacentPosts → getAllPostSummaries (N× again)
└── generateMetadata            → getPostSeoBySlug (1× REST)

N = number of GraphQL pages needed to list all posts (ceil(posts / 100))
M = number of comment pages (ceil(comments / 100))
```

```
Typical 404 (bot / legacy URL)
├── proxy.ts                    → legacy handlers + maybe Redirection API fetch
├── layout.tsx                  → 3× GraphQL + full post list for archives
└── not-found.tsx               → getLatestPosts()
```

The highest-value changes for **this** repo:

1. **#3 and #4** from the source plan (Redirection cache + skip known paths)
2. **#4 and #5 in Recommended Actions** (dedupe / eliminate full post-list fetches)
3. **#5** from source plan (404 slimming) during migration bot traffic

---

## Related Files

| File | Role |
|------|------|
| `proxy.ts` | Legacy redirects + WordPress Redirection plugin fetch |
| `app/layout.tsx` | Sidebar WordPress queries on every page |
| `app/not-found.tsx` | 404 recovery + recent posts query |
| `app/blog/[slug]/page.tsx` | Post SSG via `generateStaticParams()` |
| `lib/wordpress.ts` | GraphQL/REST fetch, `getAllPostSummaries()`, cache tags |
| `app/api/revalidate/route.ts` | Webhook-driven cache invalidation |
| `app/feed.xml/route.ts` | Hourly RSS regen |
| `app/sitemap.ts` | Hourly sitemap regen |
| `.env.example` | `WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS=300` |

---

## Decision Log

| Date | Decision |
|------|----------|
| 2026-07-10 | Document imported from another project; applicability reviewed against current codebase. No code changes made yet. |
| 2026-07-10 | Implemented items 1–3: default Redirection TTL 86400, skip plugin lookup on first-party paths in `proxy.ts`, React `cache()` on `getAllPostSummaries`, `getArchiveMonths`, and `getAdjacentPosts`. |
