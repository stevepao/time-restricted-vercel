import Link from "next/link";

import { getLatestPosts } from "@/lib/wordpress";

export default async function NotFound() {
  const recentPosts = await getLatestPosts();

  return (
    <section className="bg-white p-7 shadow-sm sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-[#575760]">
        404
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-normal leading-tight tracking-tight text-[#222222] sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-[#222222]">
        Sorry, we couldn&apos;t find that page. If you followed an old link, the
        article may have moved during the site migration.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex border border-[#222222] px-4 py-2 text-sm font-semibold text-[#222222] transition hover:bg-[#222222] hover:text-white"
        >
          Go Home
        </Link>
        <Link
          href="/all-posts"
          className="inline-flex border border-zinc-300 px-4 py-2 text-sm font-semibold text-[#1e73be] transition hover:border-[#1e73be]"
        >
          Browse All Posts
        </Link>
        <Link
          href="/contact"
          className="inline-flex border border-zinc-300 px-4 py-2 text-sm font-semibold text-[#1e73be] transition hover:border-[#1e73be]"
        >
          Report a Broken Link
        </Link>
      </div>

      <form action="/" className="mt-10 max-w-xl">
        <label
          htmlFor="not-found-search"
          className="block text-sm font-semibold text-[#222222]"
        >
          Search the site
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="not-found-search"
            name="s"
            type="search"
            placeholder="Search posts"
            className="min-w-0 flex-1 border border-zinc-300 px-3 py-2 text-sm text-[#222222] outline-none transition focus:border-[#1e73be]"
          />
          <button
            type="submit"
            className="bg-[#1e73be] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#222222]"
          >
            Search
          </button>
        </div>
      </form>

      {recentPosts.length > 0 ? (
        <section className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-2xl font-normal text-[#222222]">Recent Posts</h2>
          <div className="mt-6 space-y-5">
            {recentPosts.slice(0, 5).map((post) => (
              <article
                key={post.id}
                className="group border-t-2 border-[#222222] pt-3"
              >
                <div className="mb-2 flex items-center justify-between text-sm font-semibold leading-none text-[#575760]">
                  <span>{formatPostMonthDay(post.date)}</span>
                  <span>{formatPostYear(post.date)}</span>
                </div>
                <h3 className="text-xl font-bold leading-tight tracking-tight text-[#222222]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-[#222222] no-underline transition group-hover:text-[#1e73be]"
                    dangerouslySetInnerHTML={{ __html: post.title }}
                  />
                </h3>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function formatPostMonthDay(date: string | null): string {
  if (!date) {
    return "";
  }

  const postDate = new Date(date);
  return `${String(postDate.getMonth() + 1).padStart(2, "0")}.${String(
    postDate.getDate(),
  ).padStart(2, "0")}`;
}

function formatPostYear(date: string | null): string {
  if (!date) {
    return "";
  }

  return String(new Date(date).getFullYear());
}
