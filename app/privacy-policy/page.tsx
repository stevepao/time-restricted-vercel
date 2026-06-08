import type { Metadata } from "next";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";

import { buildWordPressMetadata } from "@/lib/metadata";
import { getPageByUri, getPageSeoByUri } from "@/lib/wordpress";
import { rewriteWordPressBackendUrl } from "@/lib/wordpress-links";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoByUri("privacy-policy");

  return buildWordPressMetadata({
    canonicalPath: "/privacy-policy",
    defaultDescription: seo?.description ?? "Privacy Policy for Time Restricted.",
    defaultTitle: seo?.title ?? "Privacy Policy",
    seo,
  });
}

export default async function PrivacyPolicyPage() {
  const page = await getPageByUri("privacy-policy");

  if (!page) {
    notFound();
  }

  const title = sanitizeHtml(page.title, {
    allowedAttributes: {},
    allowedTags: [],
  });
  const content = sanitizePageContent(page.content ?? "");

  return (
    <article className="bg-white p-7 shadow-sm sm:p-8">
      <h1 className="mb-6 text-3xl font-normal leading-tight text-[#222222]">
        {title}
      </h1>

      <div
        className="space-y-5 text-sm leading-7 text-[#222222] [&_a]:font-medium [&_a]:text-[#1e73be] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#222222] [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-200 [&_blockquote]:bg-zinc-50 [&_blockquote]:p-5 [&_h2]:pt-5 [&_h2]:text-2xl [&_h2]:font-normal [&_h2]:leading-tight [&_h3]:pt-4 [&_h3]:text-xl [&_h3]:font-normal [&_hr]:my-8 [&_hr]:border-zinc-200 [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-5 [&_strong]:font-semibold [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}

function sanitizePageContent(content: string): string {
  return sanitizeHtml(content, {
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["hr"]),
    transformTags: {
      a: (tagName, attribs) => ({
        attribs: {
          ...attribs,
          href: rewriteWordPressBackendUrl(attribs.href) ?? "",
          rel: "noopener noreferrer",
        },
        tagName,
      }),
    },
  });
}
