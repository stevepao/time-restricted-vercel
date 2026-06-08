import Link from "next/link";

import {
  getFeaturedPosts,
  getPostsByCategory,
  getPostsByMonth,
  searchPosts,
  type WordPressPost,
} from "@/lib/wordpress";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    month?: string | string[];
    s?: string | string[];
    year?: string | string[];
  }>;
};

type PostListView = {
  description: string;
  heading: string;
  kicker: string;
  posts: WordPressPost[];
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const view = await getPostListView(params ?? {});

  return (
    <section id="latest-posts" className="bg-white p-7 shadow-sm sm:p-8">
      <header className="mb-16">
        <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight text-[#222222] sm:text-[2rem]">
          {view.heading}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[#222222]">
          {view.description}
        </p>
        <p className="mt-7 text-xs font-medium uppercase tracking-wider text-[#575760]">
          {view.kicker}
        </p>
      </header>

      {view.posts.length > 0 ? (
        <div className="space-y-12">
          {view.posts.map((post) => (
            <article
              key={post.id}
              className="group border-t-4 border-[#222222] pt-4"
            >
              <div className="mb-4 flex items-center justify-between text-3xl font-semibold leading-none text-[#222222]">
                <span>{formatPostMonthDay(post.date)}</span>
                <span>{formatPostYear(post.date)}</span>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#222222]">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-[#222222] no-underline transition group-hover:text-[#1e73be]"
                    dangerouslySetInnerHTML={{ __html: post.title }}
                  />
                </h2>
                {post.excerpt ? (
                  <div
                    className="line-clamp-3 text-sm leading-6 text-[#575760]"
                    dangerouslySetInnerHTML={{ __html: post.excerpt }}
                  />
                ) : null}
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex items-center text-sm text-[#1e73be] underline underline-offset-4"
              >
                Read more
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-zinc-300 bg-white p-10 text-center text-[#575760]">
          No posts have been published yet.
        </div>
      )}
    </section>
  );
}

async function getPostListView(
  params: Awaited<NonNullable<HomePageProps["searchParams"]>>,
): Promise<PostListView> {
  const search = getSearchParam(params.s)?.trim();
  const category = getSearchParam(params.category)?.trim();
  const yearParam = getSearchParam(params.year);
  const monthParam = getSearchParam(params.month);
  const year = Number(yearParam);
  const month = Number(monthParam);

  if (search) {
    return {
      description: `Posts matching “${search}”.`,
      heading: `Search results for “${search}”`,
      kicker: "Search Results",
      posts: await searchPosts(search),
    };
  }

  if (category) {
    return {
      description: `Posts filed under the ${category.replaceAll("-", " ")} category.`,
      heading: `Category: ${category.replaceAll("-", " ")}`,
      kicker: "Category Archive",
      posts: await getPostsByCategory(category),
    };
  }

  if (
    yearParam &&
    monthParam &&
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return {
      description: `Posts published during ${formatArchiveHeading(year, month)}.`,
      heading: formatArchiveHeading(year, month),
      kicker: "Monthly Archive",
      posts: await getPostsByMonth(year, month),
    };
  }

  return {
    description:
      "Stephen Pao writes about living with Type II diabetes, chronic kidney disease, and long-term time-restricted eating.",
    heading: "Experiences with Time-Restricted Eating and Managing Chronic Disease",
    kicker: "Featured Essays",
    posts: await getFeaturedPosts(),
  };
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatArchiveHeading(year: number, month: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
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
