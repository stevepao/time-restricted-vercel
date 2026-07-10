import Link from "next/link";

export default function NotFound() {
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
    </section>
  );
}
