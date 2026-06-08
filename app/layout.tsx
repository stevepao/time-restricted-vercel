import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";

import { MailchimpSignupForm } from "@/app/components/mailchimp-signup-form";
import {
  getArchiveMonths,
  getCategories,
  getLatestPosts,
  type WordPressArchiveMonth,
  type WordPressCategory,
  type WordPressPost,
} from "@/lib/wordpress";
import { buildDefaultMetadata } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = buildDefaultMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarPosts, archiveMonths, categories] = await Promise.all([
    getSidebarPosts(),
    getSidebarArchiveMonths(),
    getSidebarCategories(),
  ]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f8f9] text-[#222222]">
        <Script id="turnstile-callback" strategy="beforeInteractive">
          {`
            window.onloadTurnstileCallback = function () {
              if (window.__timeRestrictedTurnstile) {
                window.__timeRestrictedTurnstile.renderAll();
              }
            };
          `}
        </Script>
        <Script
          id="cloudflare-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
          strategy="afterInteractive"
        />
        <a
          href="#primary"
          className="absolute -left-[999px] top-auto h-px w-px overflow-hidden focus:left-4 focus:top-4 focus:z-50 focus:h-auto focus:w-auto focus:rounded-sm focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#1e73be] focus:shadow-lg"
        >
          Skip to content
        </a>

        <div className="flex min-h-screen flex-col">
          <header className="bg-white shadow-sm">
            <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <div>
                <Link
                  href="/"
                  className="text-xl font-bold tracking-tight text-[#222222] no-underline transition hover:text-[#1e73be]"
                >
                  Time Restricted
                </Link>
              </div>

              <nav
                aria-label="Primary navigation"
                className="flex flex-wrap items-center gap-x-9 gap-y-3 text-sm"
              >
                <Link
                  href="/all-posts"
                  className="text-[#222222] no-underline transition hover:text-[#1e73be]"
                >
                  All Posts
                </Link>
                <Link
                  href="/contact"
                  className="text-[#222222] no-underline transition hover:text-[#1e73be]"
                >
                  Contact
                </Link>
              </nav>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-[960px] flex-1 gap-4 px-6 py-4 lg:grid-cols-[minmax(0,1fr)_232px] lg:px-8">
            <main id="primary" className="min-w-0">
              {children}
            </main>

            <aside
              aria-label="Sidebar"
              className="space-y-5 text-sm leading-6 text-[#555555]"
            >
              <section className="bg-white p-7 shadow-sm">
                <form action="/" role="search" className="flex">
                  <label className="sr-only" htmlFor="site-search">
                    Search
                  </label>
                  <input
                    id="site-search"
                    name="s"
                    type="search"
                    placeholder="Search ..."
                    className="min-w-0 flex-1 border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-[#222222] outline-none placeholder:text-[#9a9a9a] focus:border-[#1e73be]"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center bg-[#55555e] text-white transition hover:bg-[#222222]"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </form>
              </section>

              <section className="bg-white p-7 shadow-sm">
                <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#666666]">
                  Recent Posts
                </h2>
                <ul className="space-y-2">
                  {sidebarPosts.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-[#555555] underline underline-offset-2 transition hover:text-[#111111]"
                        dangerouslySetInnerHTML={{ __html: post.title }}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-white p-7 shadow-sm">
                <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#666666]">
                  Archives
                </h2>
                <ul className="space-y-2">
                  {archiveMonths.map((archiveMonth) => (
                    <li key={`${archiveMonth.year}-${archiveMonth.month}`}>
                      <Link
                        href={`/?year=${archiveMonth.year}&month=${archiveMonth.month}`}
                        className="text-[#555555] underline underline-offset-2 transition hover:text-[#111111]"
                      >
                        {archiveMonth.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-white p-7 shadow-sm">
                <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-[#666666]">
                  Categories
                </h2>
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/?category=${category.slug}`}
                        className="text-[#555555] underline underline-offset-2 transition hover:text-[#111111]"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <Suspense
                fallback={
                  <section className="bg-white p-7 shadow-sm">
                    <h2 className="text-xs font-medium uppercase tracking-wider text-[#666666]">
                      Sign up for updates to Time-Restricted
                    </h2>
                  </section>
                }
              >
                <MailchimpSignupForm />
              </Suspense>

              <section className="bg-white p-7 shadow-sm">
                <Image
                  src="https://time-restricted.com/wp-content/uploads/2026/05/stephen-pao-200-200.jpg"
                  alt="Stephen Pao"
                  width={96}
                  height={96}
                  className="mx-auto mb-5 h-24 w-24 rounded-full object-cover"
                />
                <h2 className="mb-3 text-2xl font-normal text-[#222222]">
                  About
                </h2>
                <p className="text-left text-xs leading-5 text-[#555555]">
                  Stephen Pao writes about living with Type II diabetes, chronic
                  kidney disease, and long-term time-restricted eating. After a
                  diagnosis in 2003, he began experimenting with alternative
                  approaches to managing chronic disease, including prolonged
                  fasting alongside a low-carb lifestyle. These essays document
                  that ongoing experience.
                </p>
              </section>
            </aside>
          </div>

          <footer className="mt-6 bg-white">
            <div className="mx-auto flex w-full max-w-[960px] flex-col gap-2 px-6 py-8 text-sm text-[#575760] lg:px-8">
              <p>Copyright © 2026 Hillwork, LLC.</p>
              <Link
                href="/privacy-policy"
                className="text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222]"
              >
                Privacy Policy
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

async function getSidebarPosts(): Promise<WordPressPost[]> {
  try {
    return await getLatestPosts();
  } catch {
    return [];
  }
}

async function getSidebarArchiveMonths(): Promise<WordPressArchiveMonth[]> {
  try {
    return await getArchiveMonths();
  } catch {
    return [];
  }
}

async function getSidebarCategories(): Promise<WordPressCategory[]> {
  try {
    return await getCategories();
  } catch {
    return [];
  }
}
