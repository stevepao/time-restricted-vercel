import sanitizeHtml from "sanitize-html";

import { getMetadataBase } from "@/lib/metadata";
import { getAllPosts, type WordPressPost } from "@/lib/wordpress";

const SITE_TITLE = "Time Restricted";
const SITE_DESCRIPTION =
  "Experiences with Time-Restricted Eating and Managing Chronic Disease";
const FEED_ITEM_LIMIT = 50;

export const revalidate = 3600;

export async function GET() {
  const siteUrl = getMetadataBase();
  const posts = (await getAllPosts()).slice(0, FEED_ITEM_LIMIT);
  const latestPostDate = posts.find((post) => post.date)?.date;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <link>${escapeXml(siteUrl.toString())}</link>
    <atom:link href="${escapeXml(toAbsoluteUrl("/feed.xml", siteUrl))}" rel="self" type="application/rss+xml" />
    <language>en-US</language>
    <lastBuildDate>${formatRssDate(latestPostDate ?? new Date())}</lastBuildDate>
${posts.map((post) => renderFeedItem(post, siteUrl)).join("\n")}
  </channel>
</rss>
`;

  return new Response(rss, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

function renderFeedItem(post: WordPressPost, siteUrl: URL): string {
  const postUrl = toAbsoluteUrl(`/blog/${post.slug}`, siteUrl);
  const title = toPlainText(post.title);
  const description = post.excerpt ? sanitizeFeedHtml(post.excerpt) : "";

  return `    <item>
      <title>${toCdata(title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      ${post.date ? `<pubDate>${formatRssDate(post.date)}</pubDate>` : ""}
      ${description ? `<description>${toCdata(description)}</description>` : ""}
    </item>`;
}

function sanitizeFeedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedTags: ["a", "br", "em", "p", "strong"],
  });
}

function toPlainText(html: string): string {
  return decodeHtmlEntities(
    sanitizeHtml(html, {
      allowedAttributes: {},
      allowedTags: [],
    }),
  );
}

function toAbsoluteUrl(path: string, siteUrl: URL): string {
  return new URL(path, siteUrl).toString();
}

function formatRssDate(date: Date | string): string {
  return new Date(date).toUTCString();
}

function toCdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
