import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";

import { CommentForm } from "@/app/components/comment-form";
import { CommentStatusMessage } from "@/app/components/comment-status-message";
import {
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug,
  type WordPressComment,
} from "@/lib/wordpress";
import { getWordPressOrigin } from "@/lib/wordpress-auth";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getAllPostSlugs();

  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { slug } = await params;
  const [post, adjacentPosts] = await Promise.all([
    getPostBySlug(slug),
    getAdjacentPosts(slug),
  ]);

  if (!post) {
    notFound();
  }

  const title = sanitizePlainText(post.title);
  const content = sanitizePostContent(post.content ?? "");
  const featuredImage = post.featuredImage?.node;
  const comments = post.comments.nodes;
  const commentsOpen = post.commentStatus?.toLowerCase() === "open";
  const wordpressOrigin = getWordPressOrigin();
  const createAccountUrl = wordpressOrigin
    ? `${wordpressOrigin}/wp-login.php?action=register`
    : null;

  return (
    <article className="bg-white p-8 shadow-sm sm:p-10">
      <Link
        href="/"
        className="text-sm font-semibold text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222]"
      >
        &larr; Back to all posts
      </Link>

      <header className="mt-10 border-b border-zinc-200 pb-10">
        {post.date ? (
          <time
            dateTime={post.date}
            className="text-sm font-medium uppercase tracking-[0.3em] text-[#575760]"
          >
            {formatPostDate(post.date)}
          </time>
        ) : null}
        <h1 className="mt-5 text-4xl font-normal leading-tight tracking-tight text-[#222222] sm:text-5xl">
          {title}
        </h1>
      </header>

      {featuredImage ? (
        <figure className="mt-8">
          <Image
            src={featuredImage.sourceUrl}
            alt={featuredImage.altText || title}
            width={1024}
            height={640}
            className="h-auto w-full"
            priority
          />
        </figure>
      ) : null}

      <div
        className="mt-10 space-y-6 text-[17px] leading-8 text-[#222222] [&_a]:font-medium [&_a]:text-[#1e73be] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#222222] [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-200 [&_blockquote]:bg-zinc-50 [&_blockquote]:p-5 [&_blockquote]:italic [&_h2]:pt-6 [&_h2]:text-3xl [&_h2]:font-normal [&_h2]:leading-tight [&_h3]:pt-4 [&_h3]:text-2xl [&_h3]:font-normal [&_img]:h-auto [&_img]:max-w-full [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-6 [&_strong]:font-semibold [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      <nav
        aria-label="Post navigation"
        className="mt-12 grid gap-4 border-y border-zinc-200 py-6 text-sm sm:grid-cols-2"
      >
        {adjacentPosts.previous ? (
          <Link
            href={`/blog/${adjacentPosts.previous.slug}`}
            className="text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222]"
          >
            <span className="block text-xs uppercase tracking-wider text-[#575760]">
              Previous Post
            </span>
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizeInlineHtml(adjacentPosts.previous.title),
              }}
            />
          </Link>
        ) : (
          <span />
        )}

        {adjacentPosts.next ? (
          <Link
            href={`/blog/${adjacentPosts.next.slug}`}
            className="text-left text-[#1e73be] underline underline-offset-4 transition hover:text-[#222222] sm:text-right"
          >
            <span className="block text-xs uppercase tracking-wider text-[#575760]">
              Next Post
            </span>
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizeInlineHtml(adjacentPosts.next.title),
              }}
            />
          </Link>
        ) : null}
      </nav>

      <section id="comments" className="mt-12">
        <h2 className="mb-6 text-2xl font-normal text-[#222222]">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>

        <Suspense fallback={null}>
          <CommentStatusMessage />
        </Suspense>

        {comments.length > 0 ? (
          <ol className="space-y-6">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-[#555555]">No comments yet.</p>
        )}

        <div className="mt-10 border-t border-zinc-200 pt-8">
          {commentsOpen ? (
            <CommentForm
              createAccountUrl={createAccountUrl}
              postId={post.databaseId}
              slug={post.slug}
            />
          ) : (
            <p className="text-sm text-[#555555]">
              Comments are closed for this post.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}

function CommentItem({ comment }: { comment: WordPressComment }) {
  const authorName = comment.author?.node?.name || "Anonymous";
  const authorUrl = comment.author?.node?.url;

  return (
    <li className="border border-zinc-200 p-5">
      <div className="mb-3 text-sm">
        {authorUrl ? (
          <a
            href={authorUrl}
            className="font-semibold text-[#1e73be] underline underline-offset-4"
            rel="noopener noreferrer"
          >
            {authorName}
          </a>
        ) : (
          <span className="font-semibold text-[#222222]">{authorName}</span>
        )}
        {comment.date ? (
          <time className="ml-2 text-[#575760]" dateTime={comment.date}>
            {formatPostDate(comment.date)}
          </time>
        ) : null}
      </div>
      <div
        className="space-y-4 text-sm leading-7 text-[#222222] [&_a]:text-[#1e73be] [&_a]:underline [&_p]:mb-4"
        dangerouslySetInnerHTML={{
          __html: sanitizeCommentContent(comment.content ?? ""),
        }}
      />
    </li>
  );
}

function sanitizePostContent(content: string): string {
  return sanitizeHtml(content, {
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["alt", "height", "loading", "sizes", "src", "srcset", "width"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "figure",
      "figcaption",
      "img",
    ]),
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer" },
        true,
      ),
    },
  });
}

function sanitizeCommentContent(content: string): string {
  return sanitizeHtml(content, {
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedTags: ["a", "br", "em", "p", "strong"],
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer" },
        true,
      ),
    },
  });
}

function sanitizeInlineHtml(content: string): string {
  return sanitizeHtml(content, {
    allowedAttributes: {},
    allowedTags: [],
  });
}

function sanitizePlainText(content: string): string {
  return decodeHtmlEntities(sanitizeInlineHtml(content));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, codePoint: string) =>
      String.fromCodePoint(Number(codePoint)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(date));
}

