"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const mailchimpTurnstileSiteKey =
  process.env.NEXT_PUBLIC_MAILCHIMP_TURNSTILE_SITE_KEY;

const statusMessages: Record<string, string> = {
  error: "Something went wrong. Please try again.",
  "missing-email": "Please provide a valid email address.",
  "missing-turnstile": "Please complete the verification challenge.",
  "not-configured": "Email signup is not configured yet.",
  success: "Thank you, your sign-up request was successful!",
  "turnstile-failed": "Verification failed. Please try again.",
};

export function MailchimpSignupForm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("subscribe");
  const message = status ? statusMessages[status] : null;

  return (
    <section id="mailchimp-signup" className="bg-white p-7 shadow-sm">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#666666]">
        Sign up for updates to Time-Restricted
      </h2>

      {message ? (
        <p className="mb-4 text-xs leading-5 text-[#555555]">{message}</p>
      ) : null}

      <form action="/api/subscribe" method="post" className="space-y-4">
        <input type="hidden" name="redirectTo" value={pathname || "/"} />

        <p>
          <label
            htmlFor="mailchimp-email"
            className="mb-1 block text-xs text-[#555555]"
          >
            Email address:
          </label>
          <input
            id="mailchimp-email"
            type="email"
            name="EMAIL"
            placeholder="Your email address"
            required
            className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-[#222222] outline-none placeholder:text-[#9a9a9a] focus:border-[#1e73be]"
          />
        </p>

        <p>
          <label
            htmlFor="mailchimp-first-name"
            className="mb-1 block text-xs text-[#555555]"
          >
            First Name
          </label>
          <input
            id="mailchimp-first-name"
            type="text"
            name="FNAME"
            placeholder="Your first name"
            className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-[#222222] outline-none placeholder:text-[#9a9a9a] focus:border-[#1e73be]"
          />
        </p>

        <p>
          <label
            htmlFor="mailchimp-last-name"
            className="mb-1 block text-xs text-[#555555]"
          >
            Last Name
          </label>
          <input
            id="mailchimp-last-name"
            type="text"
            name="LNAME"
            placeholder="Your last name"
            className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-[#222222] outline-none placeholder:text-[#9a9a9a] focus:border-[#1e73be]"
          />
        </p>

        {mailchimpTurnstileSiteKey ? (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="afterInteractive"
            />
            <div
              className="cf-turnstile"
              data-action="mailchimp_signup"
              data-sitekey={mailchimpTurnstileSiteKey}
              data-size="compact"
              data-theme="auto"
            />
          </>
        ) : null}

        <button
          type="submit"
          className="bg-[#55555e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222222]"
        >
          Sign up
        </button>
      </form>
    </section>
  );
}
