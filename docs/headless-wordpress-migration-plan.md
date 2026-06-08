# Headless WordPress Migration Plan

This document summarizes the work that went into migrating this site from a
WordPress-rendered frontend to a small Next.js App Router frontend. It is meant
as a repeatable plan for another WordPress site of similar scope.

## Goal

Build a React/Next.js frontend that keeps WordPress as the editorial backend,
while preserving the important migration behavior readers and crawlers expect:
stable URLs, redirects, social previews, sitemap and RSS, cache refreshes, and
working forms/comments.

The approach here was bottoms-up rather than adopting a larger WordPress
frontend framework. That kept the surface area small and made the migration
behavior explicit.

## Recommended Build Order

1. Establish the Next.js project foundation.
2. Connect WordPress content APIs.
3. Build public routes and sanitized content rendering.
4. Add SEO, sitemap, robots, and RSS.
5. Handle URL migration: internal link rewrites and redirects.
6. Add cache revalidation webhooks.
7. Add forms, comments, auth, and spam protection.
8. Add recovery pages and launch observability.

## 1. Project Foundation

Start with a standard Next.js App Router project using TypeScript.

Core setup:

- Add `.env.example` with all required integration variables.
- Add `README.md` with setup, deployment, and environment notes.
- Add license and repository metadata.
- Configure `next.config.ts` for the target deployment platform.
- If using Vercel and wanting to avoid image optimization charges, set:

```ts
images: {
  unoptimized: true;
}
```

For Next.js 16, read the local Next docs before implementing special files. Some
file conventions have changed, including `proxy.ts` replacing the older
`middleware.ts` convention.

## 2. WordPress Content APIs

Use WPGraphQL for page/post content when available, and WordPress REST for
plugin-specific metadata or features.

Typical environment variables:

```env
WORDPRESS_API_URL=https://example.com/graphql
SITE_URL=https://www.example.com
```

Create a WordPress API layer similar to `lib/wordpress.ts`:

- `wpFetch()` for GraphQL.
- REST fetch helpers for SEO plugin data.
- Typed return values for posts, pages, comments, categories, and archives.
- Fetch cache tags for broad revalidation.

Useful functions to expose:

- Latest posts.
- Featured posts.
- All posts.
- Search results.
- Category archive posts.
- Month archive posts.
- Post detail by slug.
- Page detail by URI.
- Adjacent posts.
- WordPress SEO data by slug/URI.

## 3. Public Routes

Build the frontend routes around the new public URL structure.

For this project:

- `/`
- `/all-posts`
- `/blog/[slug]`
- `/contact`
- `/privacy-policy`
- `/feed.xml`
- `/sitemap.xml`
- `/robots.txt`

Important route behavior:

- Use `generateStaticParams()` for known posts.
- Do not set `dynamicParams = false` if new WordPress posts should work without
  a full redeploy.
- Use `notFound()` when WordPress returns no post/page.
- Sanitize WordPress HTML before rendering with `dangerouslySetInnerHTML`.
- Preserve basic WordPress formatting: headings, lists, blockquotes, figures,
  images, and links.

## 4. SEO And Social Previews

Implement SEO with the Next.js Metadata API, not client-side tags.

For dynamic WordPress routes:

- Add an async `generateMetadata()` function.
- Await `params` in Next.js App Router pages.
- Fetch the WordPress SEO data separately in `generateMetadata()` and the page.
  Let Next.js caching dedupe where possible.
- Use `metadataBase` from `SITE_URL`.
- Emit absolute Open Graph and Twitter image URLs.
- Prefer the frontend canonical URL over the WordPress backend canonical URL.

Create a helper like `lib/metadata.ts`:

- `getMetadataBase()`
- `buildDefaultMetadata()`
- `buildWordPressMetadata()`

Map Yoast/RankMath REST SEO data when present:

- Title.
- Description.
- Canonical.
- Robots.
- Open Graph title/description/image.
- Twitter title/description/image.
- Published and modified timestamps.

## 5. Sitemap, Robots, And RSS

Add dynamic metadata routes:

- `app/sitemap.ts`
- `app/robots.ts`
- `app/feed.xml/route.ts`

Sitemap behavior:

- Include static routes.
- Fetch published WordPress posts.
- Use frontend URLs, not WordPress backend URLs.
- Use WordPress `modified` dates for `lastModified`.
- Revalidate periodically, for example every hour.

Robots behavior:

- Allow public crawling.
- Point to the sitemap.
- Use `SITE_URL` for host/sitemap values.

RSS behavior:

- Expose `/feed.xml`.
- Include recent posts with title, link, GUID, publish date, and excerpt.
- Add RSS discovery metadata:

```ts
alternates: {
  types: {
    "application/rss+xml": "/feed.xml",
  },
}
```

## 6. URL Migration And Internal Links

Plan for both old external URLs and links embedded inside article content.

For this project, the new URL format is:

```text
https://time-restricted.com/blog/post-slug
```

Old WordPress article links used dated permalinks:

```text
https://time-restricted.com/2018/11/02/post-slug/
```

Create a utility like `lib/wordpress-links.ts` to rewrite links in sanitized
HTML:

- Backend WordPress origin to frontend origin.
- Dated WordPress post permalinks to `/blog/[slug]`.
- Same-domain legacy links, not only backend API-domain links.
- Preserve query strings and hash fragments.

Apply that transform wherever WordPress HTML is rendered:

- Blog post content.
- Comment content.
- WordPress-backed pages such as privacy policy.

Also rewrite embedded WordPress media URLs in raw post HTML. These are separate
from anchor links and usually appear in `img` attributes:

```html
<img src="http://example.com/wp-content/uploads/2020/01/image.jpg" />
```

The frontend should normalize media references to the WordPress backend media
host:

```text
https://api.example.com/wp-content/uploads/2020/01/image.jpg
```

Handle both:

- `img src`
- `img srcset`

This matters because raw WordPress HTML is rendered directly by the browser.
Next.js image configuration does not rewrite image URLs inside
`dangerouslySetInnerHTML`.

## 7. Redirects

If the WordPress Redirection plugin is used, mirror those rules at the frontend
edge/server boundary.

For Next.js 16, use `proxy.ts` at the project root. The older `middleware.ts`
file convention is deprecated.

Environment variables:

```env
WORDPRESS_REDIRECTION_API_URL=https://api.example.com/wp-json/redirection/v1/redirect
WORDPRESS_REDIRECTION_USERNAME=
WORDPRESS_REDIRECTION_APPLICATION_PASSWORD=
WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS=300
```

Implementation behavior:

- Fetch `/wp-json/redirection/v1/redirect`.
- Authenticate with a WordPress Application Password if the endpoint is
  protected.
- Cache the redirect list.
- Match GET/HEAD frontend requests.
- Exclude API routes, static assets, image routes, `robots.txt`, `sitemap.xml`,
  and file-like URLs.
- Support common Redirection plugin fields:
  - `match_url`
  - `url`
  - `action_data.url`
  - `action_code`
  - `match_data.source.flag_query`
  - `match_data.source.flag_case`
  - `match_data.source.flag_trailing`
  - `match_data.source.flag_regex`
- Map absolute WordPress targets back to frontend URLs.
- Avoid redirect loops.

## 8. Revalidation Webhooks

Add an API route:

```text
app/api/revalidate/route.ts
```

The route should accept a secret token and invalidate the affected pages and
WordPress fetch cache tags.

Useful payload formats:

```json
{
  "slug": "example-post"
}
```

or a WordPress webhook payload:

```json
{
  "post": {
    "post_name": "example-post"
  }
}
```

For webhook tools that cannot add arbitrary JSON fields, accept the token in the
URL:

```text
https://www.example.com/api/revalidate?token=REVALIDATE_SECRET
```

Revalidate:

- `/blog/[slug]` or `/blog/example-post`.
- `/`
- `/all-posts`
- `/sitemap.xml`
- WordPress fetch tags.

Use `revalidateTag(tag, { expire: 0 })` for external webhooks that need fresh
data on the next request.

## 9. Forms, Comments, And Spam Protection

For a site with signup, contact, and comment login forms, protect each workflow
with its own Cloudflare Turnstile configuration.

Use separate keys for separate actions:

```env
NEXT_PUBLIC_MAILCHIMP_TURNSTILE_SITE_KEY=
MAILCHIMP_TURNSTILE_SECRET_KEY=

NEXT_PUBLIC_CONTACT_TURNSTILE_SITE_KEY=
CONTACT_TURNSTILE_SECRET_KEY=

NEXT_PUBLIC_COMMENT_LOGIN_TURNSTILE_SITE_KEY=
COMMENT_LOGIN_TURNSTILE_SECRET_KEY=
```

Client-side behavior:

- Load Turnstile once globally.
- Use explicit rendering:

```text
https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit
```

- Do not use generic `cf-turnstile` auto-render classes when multiple widgets
  can appear together.
- Assign unique container IDs.
- Reset widgets after submissions.

Server-side behavior:

- Verify each Turnstile token in the specific API route.
- Keep verifier logic scoped to the form/action if using separate Cloudflare
  widgets.
- Return helpful errors for missing configuration, invalid tokens, and backend
  failures.

## 10. Comments And WordPress Auth

If preserving WordPress comments:

- Use WordPress JWT auth for login.
- Store the JWT in an HTTP-only cookie.
- Validate the token with WordPress before showing logged-in state.
- Post comments through the WordPress REST API.
- Add Turnstile to the login step if the comment form requires login.

Expected WordPress endpoints:

```text
POST /wp-json/jwt-auth/v1/token
POST /wp-json/jwt-auth/v1/token/validate
GET  /wp-json/wp/v2/users/me
POST /wp-json/wp/v2/comments
```

## 11. Recovery And Launch Pages

Add a custom `app/not-found.tsx` page.

Include:

- A clear 404 message.
- Migration context: the page may have moved.
- Link to home.
- Link to all posts.
- Search form.
- Contact link for reporting broken links.
- Recent posts from WordPress.

This is especially useful during a URL migration because some old links will be
missed initially.

## 12. Environment Checklist

Common Vercel variables:

```env
WORDPRESS_API_URL=
SITE_URL=
REVALIDATE_SECRET=

WORDPRESS_REDIRECTION_API_URL=
WORDPRESS_REDIRECTION_USERNAME=
WORDPRESS_REDIRECTION_APPLICATION_PASSWORD=
WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS=300

MAILCHIMP_API_KEY=
MAILCHIMP_LIST_ID=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
CONTACT_TO=
SMTP_SECURE=false

NEXT_PUBLIC_MAILCHIMP_TURNSTILE_SITE_KEY=
MAILCHIMP_TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_CONTACT_TURNSTILE_SITE_KEY=
CONTACT_TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_COMMENT_LOGIN_TURNSTILE_SITE_KEY=
COMMENT_LOGIN_TURNSTILE_SECRET_KEY=
```

Only include variables needed by the next site. A simpler site may not need
Mailchimp, SMTP, comments, JWT auth, or all Turnstile keys.

## 13. WordPress-Side Checklist

Before launch:

- Confirm WPGraphQL works.
- Confirm REST API works.
- Confirm SEO plugin data is exposed if using Yoast/RankMath.
- Configure Redirection plugin rules.
- Create a WordPress Application Password for redirect-rule reads.
- Configure webhook plugin to POST to:

```text
https://www.example.com/api/revalidate?token=REVALIDATE_SECRET
```

- Confirm webhook payload includes a post slug or `post.post_name`.
- Confirm old URL patterns and internal permalink patterns.

## 14. Verification Checklist

Run locally:

```bash
npm run lint
npm run build
```

Spot-check before launch:

- Homepage renders posts.
- Individual post pages render.
- New/unbuilt post slugs can render.
- Old dated links inside article content rewrite to `/blog/[slug]`.
- Redirection plugin rules redirect correctly.
- `/sitemap.xml` contains frontend URLs.
- `/robots.txt` points to the sitemap.
- `/feed.xml` returns valid RSS XML.
- Social preview tags are post-specific.
- X/Twitter and Facebook validators see absolute image URLs.
- Revalidation webhook refreshes the expected post.
- Contact/signup/comment flows work.
- 404 page helps users recover.

After launch:

- Submit sitemap in Google Search Console and Bing Webmaster Tools.
- Inspect a few important URLs.
- Watch crawl errors and 404s.
- Add missing redirects as they appear.
- Monitor form/API errors.

## 15. Optional Enhancements

These are useful but not required for a small migrated blog:

- JSON-LD structured data for `BlogPosting` and breadcrumbs.
- Draft/preview mode for unpublished WordPress posts.
- Lightweight analytics.
- Error monitoring such as Sentry.
- Security headers. Be careful with CSP because Turnstile and third-party forms
  require external scripts.
- Webmention or ActivityPub support if the site has IndieWeb goals.

## Bottom-Up Versus Faust

For a small editorial site, the bottoms-up approach is often a good fit. It
requires implementing integration details directly, but avoids inheriting a
larger framework's conventions and abstractions.

Faust or another WordPress-focused frontend framework may be a better fit when
the site needs WordPress-native previews, menus, template hierarchy, block
rendering, or a larger editorial workflow. For a site like this one, most of the
work was migration-specific and would still need to be understood and customized
even with a framework.
