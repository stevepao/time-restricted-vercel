# Time Restricted

Time Restricted is a headless Next.js site for essays about time-restricted eating, Type II diabetes, chronic kidney disease, and related personal health experiments. The app renders content from the WordPress site at `time-restricted.com` and adds a modern static-first front end for posts, archives, comments, contact, and subscriptions.

## Features

- Featured essays, all-posts listing, search results, category archives, and month archives backed by WPGraphQL.
- Static blog post routes generated from WordPress slugs, with sanitized post content and comments.
- Authenticated commenting through WordPress JWT auth and the WordPress REST API.
- Sidebar recent posts, archives, categories, author bio, and Mailchimp signup.
- Contact form delivery through SMTP with Nodemailer.
- Privacy policy page loaded from WordPress page content.
- On-demand path revalidation endpoint for CMS or deployment hooks.

## Stack

- Next.js `16.2.7` App Router
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- WPGraphQL and WordPress REST API
- Nodemailer for contact email
- Mailchimp Marketing API for newsletter subscriptions

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the values for the integrations you plan to use. Local environment files are ignored by Git.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Required for WordPress content:

- `WORDPRESS_API_URL`: WPGraphQL endpoint, for example `https://time-restricted.com/graphql`.

Required for on-demand revalidation:

- `REVALIDATE_SECRET`: shared secret posted to `/api/revalidate`.

Required for Mailchimp signup:

- `MAILCHIMP_API_KEY`: Mailchimp API key including datacenter suffix.
- `MAILCHIMP_LIST_ID`: Mailchimp audience/list ID.

Required for the contact form:

- `SMTP_HOST`: SMTP server hostname.
- `SMTP_PORT`: SMTP server port. Defaults to `587` when omitted.
- `SMTP_USER`: SMTP username.
- `SMTP_PASS`: SMTP password.
- `SMTP_FROM`: optional sender address. Defaults to `SMTP_USER`.
- `CONTACT_TO`: optional recipient address. Defaults to `SMTP_USER`.
- `SMTP_SECURE`: optional. Set to `true` for implicit TLS, or use port `465`.

WordPress account login and comments use the origin derived from `WORDPRESS_API_URL` and expect compatible WordPress JWT authentication endpoints:

- `POST /wp-json/jwt-auth/v1/token`
- `POST /wp-json/jwt-auth/v1/token/validate`
- `GET /wp-json/wp/v2/users/me`
- `POST /wp-json/wp/v2/comments`

## Scripts

- `npm run dev`: start the local development server.
- `npm run build`: create a production build.
- `npm run start`: start the production server after a build.
- `npm run lint`: run ESLint.

## Deployment

This app is designed for deployment on Vercel. Configure the environment variables in the Vercel project settings, then connect the repository and deploy from the selected branch.

For CMS-driven refreshes, post JSON to `/api/revalidate`:

```json
{
  "token": "your-revalidate-secret",
  "path": "/blog/example-post"
}
```

## License

This project is licensed under the MIT License. See `LICENSE` for details.
