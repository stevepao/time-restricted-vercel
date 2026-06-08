import type { Metadata } from "next";

import type { WordPressSeoData, WordPressSeoImage } from "@/lib/wordpress";

const DEFAULT_SITE_URL = "https://time-restricted.com";
const SITE_NAME = "Time Restricted";
const DEFAULT_DESCRIPTION =
  "Experiences with Time-Restricted Eating and Managing Chronic Disease";

type BuildWordPressMetadataInput = {
  canonicalPath?: string;
  defaultDescription?: string;
  defaultTitle: string;
  seo: WordPressSeoData | null;
  type?: "article" | "website";
};

export function getMetadataBase(): URL {
  const configuredUrl =
    process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

  return new URL(configuredUrl);
}

export function buildDefaultMetadata(): Metadata {
  const metadataBase = getMetadataBase();

  return {
    alternates: {
      types: {
        "application/rss+xml": "/feed.xml",
      },
    },
    description: DEFAULT_DESCRIPTION,
    metadataBase,
    openGraph: {
      description: DEFAULT_DESCRIPTION,
      siteName: SITE_NAME,
      title: SITE_NAME,
      type: "website",
      url: metadataBase.toString(),
    },
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    twitter: {
      card: "summary_large_image",
      description: DEFAULT_DESCRIPTION,
      title: SITE_NAME,
    },
  };
}

export function buildWordPressMetadata({
  canonicalPath,
  defaultDescription,
  defaultTitle,
  seo,
  type = "website",
}: BuildWordPressMetadataInput): Metadata {
  const metadataBase = getMetadataBase();
  const title = seo?.title ?? defaultTitle;
  const description = seo?.description ?? defaultDescription;
  const canonical = canonicalPath ?? seo?.canonical ?? seo?.url ?? "/";
  const canonicalUrl = toAbsoluteUrl(canonical, metadataBase);
  const openGraphTitle = seo?.openGraphTitle ?? title;
  const openGraphDescription = seo?.openGraphDescription ?? description;
  const twitterTitle = seo?.twitterTitle ?? openGraphTitle;
  const twitterDescription = seo?.twitterDescription ?? openGraphDescription;
  const openGraphImage = toMetadataImage(seo?.openGraphImage, metadataBase);
  const twitterImage = toMetadataImage(
    seo?.twitterImage ?? seo?.openGraphImage,
    metadataBase,
  );

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description: description ?? undefined,
    metadataBase,
    openGraph: {
      description: openGraphDescription ?? undefined,
      images: openGraphImage ? [openGraphImage] : undefined,
      modifiedTime: type === "article" ? seo?.modifiedTime ?? undefined : undefined,
      publishedTime:
        type === "article" ? seo?.publishedTime ?? undefined : undefined,
      siteName: SITE_NAME,
      title: openGraphTitle,
      type,
      url: canonicalUrl,
    },
    robots: toRobotsMetadata(seo?.robots),
    title,
    twitter: {
      card: "summary_large_image",
      description: twitterDescription ?? undefined,
      images: twitterImage?.url ? [twitterImage.url] : undefined,
      title: twitterTitle,
    },
  };
}

function toMetadataImage(
  image: WordPressSeoImage | null | undefined,
  metadataBase: URL,
): { height?: number; url: string; width?: number } | null {
  if (!image?.url) {
    return null;
  }

  return {
    height: image.height ?? undefined,
    url: toAbsoluteUrl(image.url, metadataBase),
    width: image.width ?? undefined,
  };
}

function toRobotsMetadata(
  robots: WordPressSeoData["robots"] | undefined,
): Metadata["robots"] {
  if (!robots) {
    return undefined;
  }

  return {
    follow: robots.follow ?? undefined,
    index: robots.index ?? undefined,
  };
}

function toAbsoluteUrl(url: string, metadataBase: URL): string {
  return new URL(url, metadataBase).toString();
}
