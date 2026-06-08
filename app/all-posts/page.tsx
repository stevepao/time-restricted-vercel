import Link from "next/link";
import type { Metadata } from "next";

import { getAllPosts } from "@/lib/wordpress";
import { buildWordPressMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildWordPressMetadata({
  canonicalPath: "/all-posts",
  defaultDescription: "Browse all essays published on Time Restricted.",
  defaultTitle: "All Posts",
  seo: null,
});

export default async function AllPostsPage() {
  const posts = await getAllPosts();

  return (
    <section className="bg-white p-7 shadow-sm sm:p-8">
      <h1 className="mb-10 text-3xl font-normal leading-tight text-[#222222]">
        All Posts
      </h1>

      {posts.length > 0 ? (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group border-t-2 border-[#222222] pt-3"
            >
              <div className="mb-3 flex items-center justify-between text-lg font-semibold leading-none text-[#222222]">
                <span>{formatPostMonthDay(post.date)}</span>
                <span>{formatPostYear(post.date)}</span>
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#222222]">
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-[#222222] no-underline transition group-hover:text-[#1e73be]"
                  dangerouslySetInnerHTML={{ __html: post.title }}
                />
              </h2>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#555555]">
          No posts have been published yet.
        </p>
      )}
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
