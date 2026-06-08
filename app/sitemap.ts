import type { MetadataRoute } from "next";

const FRONTEND_SITE_URL = "https://time-restricted.com";
const WORDPRESS_REST_API_URL = "https://api.time-restricted.com/wp-json/wp/v2";
const POSTS_PER_PAGE = 100;

type WordPressRestPost = {
  modified: string;
  slug: string;
};

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticRoutes, posts] = await Promise.all([
    getStaticRoutes(),
    getPublishedPosts(),
  ]);

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      changeFrequency: "weekly" as const,
      lastModified: post.modified,
      priority: 0.7,
      url: `${FRONTEND_SITE_URL}/blog/${post.slug}`,
    })),
  ];
}

async function getPublishedPosts(): Promise<WordPressRestPost[]> {
  const posts: WordPressRestPost[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await fetch(
      `${WORDPRESS_REST_API_URL}/posts?per_page=${POSTS_PER_PAGE}&page=${page}&status=publish&_fields=slug,modified`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WordPress posts for sitemap: ${response.status} ${response.statusText}`,
      );
    }

    posts.push(...((await response.json()) as WordPressRestPost[]));
    totalPages = Number(response.headers.get("x-wp-totalpages") ?? 1);
    page += 1;
  } while (page <= totalPages);

  return posts;
}

async function getStaticRoutes(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  return [
    {
      changeFrequency: "daily",
      lastModified: now,
      priority: 1,
      url: FRONTEND_SITE_URL,
    },
    {
      changeFrequency: "daily",
      lastModified: now,
      priority: 0.9,
      url: `${FRONTEND_SITE_URL}/all-posts`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.6,
      url: `${FRONTEND_SITE_URL}/contact`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.3,
      url: `${FRONTEND_SITE_URL}/privacy-policy`,
    },
  ];
}
