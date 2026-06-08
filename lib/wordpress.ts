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
