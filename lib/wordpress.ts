import { cache } from "react";

export const WORDPRESS_CACHE_TAG = "wordpress";
export const WORDPRESS_POSTS_CACHE_TAG = "wordpress-posts";

type GraphQLVariables = Record<string, unknown>;

type GraphQLError = {
  message: string;
};

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: GraphQLError[];
};

export type WordPressFeaturedImage = {
  node: {
    altText: string | null;
    sourceUrl: string;
  } | null;
} | null;

export type WordPressSeoImage = {
  height: number | null;
  url: string;
  width: number | null;
};

export type WordPressSeoData = {
  canonical: string | null;
  description: string | null;
  featuredImage: WordPressSeoImage | null;
  modifiedTime: string | null;
  openGraphDescription: string | null;
  openGraphImage: WordPressSeoImage | null;
  openGraphTitle: string | null;
  publishedTime: string | null;
  robots: {
    follow: boolean | null;
    index: boolean | null;
  } | null;
  title: string | null;
  twitterDescription: string | null;
  twitterImage: WordPressSeoImage | null;
  twitterTitle: string | null;
  url: string | null;
};

export type WordPressPost = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
  excerpt: string | null;
  featuredImage: WordPressFeaturedImage;
};

export type WordPressPostDetail = {
  commentStatus: string | null;
  comments: WordPressCommentsConnection;
  content: string | null;
  databaseId: number;
  date: string | null;
  featuredImage: WordPressFeaturedImage;
  id: string;
  slug: string;
  title: string;
};

export type WordPressComment = {
  author: {
    node: {
      name: string | null;
      url: string | null;
    } | null;
  } | null;
  content: string | null;
  date: string | null;
  id: string;
};

type WordPressCommentsConnection = {
  nodes: WordPressComment[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
};

export type AdjacentPost = {
  slug: string;
  title: string;
};

export type WordPressPage = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
  content: string | null;
};

type RestRenderedValue = {
  rendered?: string;
};

type RestMediaSize = {
  height?: number;
  source_url?: string;
  width?: number;
};

type RestMedia = {
  alt_text?: string;
  media_details?: {
    height?: number;
    sizes?: Record<string, RestMediaSize>;
    width?: number;
  };
  source_url?: string;
};

type RestSeoImage =
  | string
  | {
      height?: number;
      sourceUrl?: string;
      source_url?: string;
      url?: string;
      width?: number;
    };

type RestYoastSeo = {
  canonical?: string;
  description?: string;
  og_description?: string;
  og_image?: RestSeoImage[];
  og_title?: string;
  og_url?: string;
  robots?: {
    follow?: string;
    index?: string;
  };
  title?: string;
  twitter_description?: string;
  twitter_image?: RestSeoImage;
  twitter_title?: string;
};

type RestRankMathSeo = {
  canonical?: string;
  description?: string;
  metaDesc?: string;
  metaDescription?: string;
  og_description?: string;
  og_image?: RestSeoImage | RestSeoImage[];
  og_title?: string;
  openGraph?: {
    description?: string;
    image?: RestSeoImage | RestSeoImage[];
    title?: string;
  };
  robots?: string[] | string;
  title?: string;
  twitter?: {
    description?: string;
    image?: RestSeoImage | RestSeoImage[];
    title?: string;
  };
  twitter_description?: string;
  twitter_image?: RestSeoImage | RestSeoImage[];
  twitter_title?: string;
};

type RestSeoDocument = {
  date?: string | null;
  featured_media?: number;
  jetpack_featured_media_url?: string;
  link?: string;
  modified?: string | null;
  rank_math_head_json?: RestRankMathSeo;
  rank_math_seo?: RestRankMathSeo;
  slug?: string;
  title?: RestRenderedValue;
  excerpt?: RestRenderedValue;
  yoast_head_json?: RestYoastSeo;
};

export type WordPressCategory = {
  id: string;
  name: string;
  slug: string;
  count: number | null;
};

export type WordPressArchiveMonth = {
  year: number;
  month: number;
  label: string;
  count: number;
};

type LatestPostsResponse = {
  posts: {
    nodes: WordPressPost[];
  };
};

type LatestPostsVariables = {
  first: number;
};

type FeaturedPostsVariables = {
  first: number;
  categoryName: string;
};

type SearchPostsVariables = {
  first: number;
  search: string;
};

type CategoryPostsVariables = {
  first: number;
  categoryName: string;
};

type PostBySlugResponse = {
  post: WordPressPostDetail | null;
};

type PostBySlugVariables = {
  commentsAfter: string | null;
  slug: string;
};

type PageByUriResponse = {
  page: WordPressPage | null;
};

type PageByUriVariables = {
  uri: string;
};

type PostSlugsResponse = {
  posts: {
    nodes: Array<{
      slug: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type PostSlugsVariables = {
  first: number;
  after: string | null;
};

type PostSummariesResponse = {
  posts: {
    nodes: WordPressPost[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type PostSummariesVariables = {
  first: number;
  after: string | null;
};

type CategoriesResponse = {
  categories: {
    nodes: WordPressCategory[];
  };
};

type CategoriesVariables = {
  first: number;
};

export async function wpFetch<
  TData,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(query: string, variables?: TVariables): Promise<TData> {
  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    throw new Error("WORDPRESS_API_URL environment variable is not set.");
  }

  const response = await fetch(wordpressApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    next: { tags: [WORDPRESS_CACHE_TAG, WORDPRESS_POSTS_CACHE_TAG] },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const body = (await response.json()) as GraphQLResponse<TData>;

  if (!response.ok) {
    throw new Error(
      `WordPress API request failed: ${response.status} ${response.statusText}`,
    );
  }

  if (body.errors?.length) {
    throw new Error(
      body.errors.map((error) => error.message).join("\n"),
    );
  }

  if (!body.data) {
    throw new Error("WordPress API response did not include data.");
  }

  return body.data;
}

export async function getLatestPosts(): Promise<WordPressPost[]> {
  const data = await wpFetch<LatestPostsResponse, LatestPostsVariables>(
    `
      query GetLatestPosts($first: Int!) {
        posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                altText
                sourceUrl
              }
            }
          }
        }
      }
    `,
    { first: 10 },
  );

  return data.posts.nodes;
}

export async function getFeaturedPosts(): Promise<WordPressPost[]> {
  const data = await wpFetch<LatestPostsResponse, FeaturedPostsVariables>(
    `
      query GetFeaturedPosts($first: Int!, $categoryName: String!) {
        posts(
          first: $first
          where: {
            categoryName: $categoryName
            orderby: { field: DATE, order: DESC }
          }
        ) {
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                altText
                sourceUrl
              }
            }
          }
        }
      }
    `,
    { first: 10, categoryName: "featured" },
  );

  return data.posts.nodes;
}

export async function searchPosts(search: string): Promise<WordPressPost[]> {
  const data = await wpFetch<LatestPostsResponse, SearchPostsVariables>(
    `
      query SearchPosts($first: Int!, $search: String!) {
        posts(
          first: $first
          where: {
            search: $search
            orderby: { field: DATE, order: DESC }
          }
        ) {
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                altText
                sourceUrl
              }
            }
          }
        }
      }
    `,
    { first: 25, search },
  );

  return data.posts.nodes;
}

export async function getPostsByCategory(
  categoryName: string,
): Promise<WordPressPost[]> {
  const data = await wpFetch<LatestPostsResponse, CategoryPostsVariables>(
    `
      query GetPostsByCategory($first: Int!, $categoryName: String!) {
        posts(
          first: $first
          where: {
            categoryName: $categoryName
            orderby: { field: DATE, order: DESC }
          }
        ) {
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                altText
                sourceUrl
              }
            }
          }
        }
      }
    `,
    { first: 25, categoryName },
  );

  return data.posts.nodes;
}

export async function getPostsByMonth(
  year: number,
  month: number,
): Promise<WordPressPost[]> {
  const posts = await getAllPostSummaries();

  return posts.filter((post) => {
    const postMonth = getPostYearMonth(post.date);

    return postMonth?.year === year && postMonth.month === month;
  });
}

export async function getCategories(): Promise<WordPressCategory[]> {
  const data = await wpFetch<CategoriesResponse, CategoriesVariables>(
    `
      query GetCategories($first: Int!) {
        categories(first: $first) {
          nodes {
            id
            name
            slug
            count
          }
        }
      }
    `,
    { first: 100 },
  );

  return data.categories.nodes
    .filter((category) => (category.count ?? 0) > 0)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function getArchiveMonths(): Promise<WordPressArchiveMonth[]> {
  const posts = await getAllPostSummaries();
  const archiveCounts = new Map<string, WordPressArchiveMonth>();

  for (const post of posts) {
    const postMonth = getPostYearMonth(post.date);

    if (!postMonth) {
      continue;
    }

    const key = `${postMonth.year}-${String(postMonth.month).padStart(2, "0")}`;
    const archiveMonth = archiveCounts.get(key);

    if (archiveMonth) {
      archiveMonth.count += 1;
    } else {
      archiveCounts.set(key, {
        ...postMonth,
        count: 1,
        label: new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
        }).format(new Date(postMonth.year, postMonth.month - 1, 1)),
      });
    }
  }

  return Array.from(archiveCounts.values()).sort(
    (first, second) =>
      second.year - first.year || second.month - first.month,
  );
}

export async function getAllPosts(): Promise<WordPressPost[]> {
  return getAllPostSummaries();
}

export async function getPostBySlug(
  slug: string,
): Promise<WordPressPostDetail | null> {
  const comments: WordPressComment[] = [];
  let commentsAfter: string | null = null;
  let hasNextCommentsPage = true;
  let currentPost: WordPressPostDetail | null = null;

  while (hasNextCommentsPage) {
    const data: PostBySlugResponse = await wpFetch<
      PostBySlugResponse,
      PostBySlugVariables
    >(
      `
      query GetPostBySlug($slug: ID!, $commentsAfter: String) {
        post(id: $slug, idType: SLUG) {
          commentStatus
          databaseId
          id
          title
          slug
          date
          content
          featuredImage {
            node {
              altText
              sourceUrl
            }
          }
          comments(
            first: 100
            after: $commentsAfter
            where: { order: ASC, orderby: COMMENT_DATE }
          ) {
            nodes {
              id
              date
              content
              author {
                node {
                  name
                  url
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
      { commentsAfter, slug },
    );

    if (!data.post) {
      return null;
    }

    currentPost = data.post;
    comments.push(...data.post.comments.nodes);
    hasNextCommentsPage = data.post.comments.pageInfo.hasNextPage;
    commentsAfter = data.post.comments.pageInfo.endCursor;
  }

  return currentPost
    ? {
        ...currentPost,
        comments: {
          ...currentPost.comments,
          nodes: comments,
        },
      }
    : null;
}

export async function getAdjacentPosts(
  slug: string,
): Promise<{ previous: AdjacentPost | null; next: AdjacentPost | null }> {
  const posts = await getAllPostSummaries();
  const currentIndex = posts.findIndex((post) => post.slug === slug);

  if (currentIndex === -1) {
    return { previous: null, next: null };
  }

  const newerPost = posts[currentIndex - 1] ?? null;
  const olderPost = posts[currentIndex + 1] ?? null;

  return {
    next: newerPost
      ? { slug: newerPost.slug, title: newerPost.title }
      : null,
    previous: olderPost
      ? { slug: olderPost.slug, title: olderPost.title }
      : null,
  };
}

export async function getPageByUri(uri: string): Promise<WordPressPage | null> {
  const trimmedUri = uri.replace(/^\/|\/$/g, "");
  const uriAttempts = [`/${trimmedUri}/`, trimmedUri];

  for (const uriAttempt of uriAttempts) {
    const page = await fetchPageByUri(uriAttempt);

    if (page) {
      return page;
    }
  }

  return null;
}

export const getPostSeoBySlug = cache(
  async (slug: string): Promise<WordPressSeoData | null> => {
    const posts = await wpRestFetch<RestSeoDocument[]>(
      `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`,
    );
    const post = posts[0];

    if (!post) {
      return null;
    }

    return mapRestSeoDocument(post);
  },
);

export const getPageSeoByUri = cache(
  async (uri: string): Promise<WordPressSeoData | null> => {
    const trimmedUri = uri.replace(/^\/|\/$/g, "");
    const pages = await wpRestFetch<RestSeoDocument[]>(
      `/wp-json/wp/v2/pages?slug=${encodeURIComponent(trimmedUri)}`,
    );
    const page = pages[0];

    if (!page) {
      return null;
    }

    return mapRestSeoDocument(page);
  },
);

async function fetchPageByUri(uri: string): Promise<WordPressPage | null> {
  const data = await wpFetch<PageByUriResponse, PageByUriVariables>(
    `
      query GetPageByUri($uri: ID!) {
        page(id: $uri, idType: URI) {
          id
          title
          slug
          date
          content
        }
      }
    `,
    { uri },
  );

  return data.page;
}

async function wpRestFetch<TData>(path: string): Promise<TData> {
  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    throw new Error("WORDPRESS_API_URL environment variable is not set.");
  }

  const url = new URL(path, new URL(wordpressApiUrl).origin);
  const response = await fetch(url, {
    next: { tags: [WORDPRESS_CACHE_TAG, WORDPRESS_POSTS_CACHE_TAG] },
  });

  if (!response.ok) {
    throw new Error(
      `WordPress REST request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as TData;
}

async function mapRestSeoDocument(
  document: RestSeoDocument,
): Promise<WordPressSeoData> {
  const yoastSeo = document.yoast_head_json ?? null;
  const rankMathSeo = document.rank_math_head_json ?? document.rank_math_seo ?? null;
  const featuredImage = await getRestFeaturedImage(document);

  return {
    canonical: getFirstString(yoastSeo?.canonical, rankMathSeo?.canonical),
    description: getFirstString(
      yoastSeo?.description,
      rankMathSeo?.description,
      rankMathSeo?.metaDescription,
      rankMathSeo?.metaDesc,
      document.excerpt?.rendered,
    ),
    featuredImage,
    modifiedTime: document.modified ?? null,
    openGraphDescription: getFirstString(
      yoastSeo?.og_description,
      rankMathSeo?.openGraph?.description,
      rankMathSeo?.og_description,
      yoastSeo?.description,
      rankMathSeo?.description,
      document.excerpt?.rendered,
    ),
    openGraphImage:
      getSeoImage(yoastSeo?.og_image?.[0]) ??
      getSeoImage(rankMathSeo?.openGraph?.image) ??
      getSeoImage(rankMathSeo?.og_image) ??
      featuredImage,
    openGraphTitle: getFirstString(
      yoastSeo?.og_title,
      rankMathSeo?.openGraph?.title,
      rankMathSeo?.og_title,
      yoastSeo?.title,
      rankMathSeo?.title,
      document.title?.rendered,
    ),
    publishedTime: document.date ?? null,
    robots: mapRobots(yoastSeo?.robots, rankMathSeo?.robots),
    title: getFirstString(
      yoastSeo?.title,
      rankMathSeo?.title,
      document.title?.rendered,
    ),
    twitterDescription: getFirstString(
      yoastSeo?.twitter_description,
      rankMathSeo?.twitter?.description,
      rankMathSeo?.twitter_description,
      yoastSeo?.og_description,
      rankMathSeo?.openGraph?.description,
      yoastSeo?.description,
      rankMathSeo?.description,
      document.excerpt?.rendered,
    ),
    twitterImage:
      getSeoImage(yoastSeo?.twitter_image) ??
      getSeoImage(rankMathSeo?.twitter?.image) ??
      getSeoImage(rankMathSeo?.twitter_image) ??
      getSeoImage(yoastSeo?.og_image?.[0]) ??
      getSeoImage(rankMathSeo?.openGraph?.image) ??
      getSeoImage(rankMathSeo?.og_image) ??
      featuredImage,
    twitterTitle: getFirstString(
      yoastSeo?.twitter_title,
      rankMathSeo?.twitter?.title,
      rankMathSeo?.twitter_title,
      yoastSeo?.og_title,
      rankMathSeo?.openGraph?.title,
      yoastSeo?.title,
      rankMathSeo?.title,
      document.title?.rendered,
    ),
    url: getFirstString(yoastSeo?.og_url, document.link),
  };
}

async function getRestFeaturedImage(
  document: RestSeoDocument,
): Promise<WordPressSeoImage | null> {
  if (document.featured_media) {
    const media = await wpRestFetch<RestMedia>(
      `/wp-json/wp/v2/media/${document.featured_media}?_fields=source_url,media_details`,
    );
    const preferredSize =
      media.media_details?.sizes?.["featured-content-lg"] ??
      media.media_details?.sizes?.large ??
      media.media_details?.sizes?.full;
    const url = preferredSize?.source_url ?? media.source_url;

    if (url) {
      return {
        height: preferredSize?.height ?? media.media_details?.height ?? null,
        url,
        width: preferredSize?.width ?? media.media_details?.width ?? null,
      };
    }
  }

  if (document.jetpack_featured_media_url) {
    return {
      height: null,
      url: document.jetpack_featured_media_url,
      width: null,
    };
  }

  return null;
}

function getSeoImage(
  image: RestSeoImage | RestSeoImage[] | null | undefined,
): WordPressSeoImage | null {
  if (Array.isArray(image)) {
    return getSeoImage(image[0]);
  }

  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    return { height: null, url: image, width: null };
  }

  const url = image.url ?? image.sourceUrl ?? image.source_url;

  if (!url) {
    return null;
  }

  return {
    height: typeof image.height === "number" ? image.height : null,
    url,
    width: typeof image.width === "number" ? image.width : null,
  };
}

function mapRobots(
  yoastRobots: RestYoastSeo["robots"] | undefined,
  rankMathRobots: RestRankMathSeo["robots"] | undefined,
): WordPressSeoData["robots"] {
  if (yoastRobots) {
    return {
      follow:
        yoastRobots.follow === "follow"
          ? true
          : yoastRobots.follow === "nofollow"
            ? false
            : null,
      index:
        yoastRobots.index === "index"
          ? true
          : yoastRobots.index === "noindex"
            ? false
            : null,
    };
  }

  if (rankMathRobots) {
    const robots = Array.isArray(rankMathRobots)
      ? rankMathRobots
      : rankMathRobots.split(",");

    return {
      follow: robots.includes("follow")
        ? true
        : robots.includes("nofollow")
          ? false
          : null,
      index: robots.includes("index")
        ? true
        : robots.includes("noindex")
          ? false
          : null,
    };
  }

  return null;
}

function getFirstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = normalizeText(value);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const decoded = decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  return decoded || null;
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

export async function getAllPostSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: PostSlugsResponse = await wpFetch<
      PostSlugsResponse,
      PostSlugsVariables
    >(
      `
        query GetAllPostSlugs($first: Int!, $after: String) {
          posts(first: $first, after: $after) {
            nodes {
              slug
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      { first: 100, after },
    );

    slugs.push(...data.posts.nodes.map((post) => post.slug));
    hasNextPage = data.posts.pageInfo.hasNextPage;
    after = data.posts.pageInfo.endCursor;
  }

  return slugs;
}

async function getAllPostSummaries(): Promise<WordPressPost[]> {
  const posts: WordPressPost[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: PostSummariesResponse = await wpFetch<
      PostSummariesResponse,
      PostSummariesVariables
    >(
      `
        query GetAllPostSummaries($first: Int!, $after: String) {
          posts(
            first: $first
            after: $after
            where: { orderby: { field: DATE, order: DESC } }
          ) {
            nodes {
              id
              title
              slug
              date
              excerpt
              featuredImage {
                node {
                  altText
                  sourceUrl
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      { first: 100, after },
    );

    posts.push(...data.posts.nodes);
    hasNextPage = data.posts.pageInfo.hasNextPage;
    after = data.posts.pageInfo.endCursor;
  }

  return posts;
}

function getPostYearMonth(
  date: string | null,
): { year: number; month: number } | null {
  if (!date) {
    return null;
  }

  const [year, month] = date.split("-").map(Number);

  if (!year || !month) {
    return null;
  }

  return { year, month };
}
