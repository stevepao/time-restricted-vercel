import { revalidatePath, revalidateTag } from "next/cache";

import {
  WORDPRESS_CACHE_TAG,
  WORDPRESS_POSTS_CACHE_TAG,
} from "@/lib/wordpress";

const DEFAULT_WORDPRESS_POST_PATHS = ["/", "/all-posts", "/sitemap.xml"];
const DEFAULT_WORDPRESS_TAGS = [WORDPRESS_CACHE_TAG, WORDPRESS_POSTS_CACHE_TAG];

type RevalidateRequestBody = {
  token?: unknown;
  path?: unknown;
  paths?: unknown;
  slug?: unknown;
  tag?: unknown;
  tags?: unknown;
};

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return Response.json(
      { message: "REVALIDATE_SECRET environment variable is not set." },
      { status: 500 },
    );
  }

  if (!body || body.token !== secret) {
    return Response.json({ message: "Invalid token." }, { status: 401 });
  }

  const paths = getPathsToRevalidate(body);
  const tags = getTagsToRevalidate(body);

  for (const path of paths) {
    if (isDynamicRoutePattern(path)) {
      revalidatePath(path, "page");
    } else {
      revalidatePath(path);
    }
  }

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return Response.json({
    now: Date.now(),
    paths,
    revalidated: true,
    tags,
  });
}

async function parseJsonBody(
  request: Request,
): Promise<RevalidateRequestBody | null> {
  try {
    return (await request.json()) as RevalidateRequestBody;
  } catch {
    return null;
  }
}

function isValidPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path.length <= 1024
  );
}

function getPathsToRevalidate(body: RevalidateRequestBody): string[] {
  const paths = new Set<string>(DEFAULT_WORDPRESS_POST_PATHS);

  if (isValidPath(body.path)) {
    paths.add(body.path);
  }

  if (Array.isArray(body.paths)) {
    for (const path of body.paths) {
      if (isValidPath(path)) {
        paths.add(path);
      }
    }
  }

  if (isValidSlug(body.slug)) {
    paths.add(`/blog/${body.slug}`);
  } else if (!isValidPath(body.path) && !Array.isArray(body.paths)) {
    paths.add("/blog/[slug]");
  }

  return Array.from(paths);
}

function getTagsToRevalidate(body: RevalidateRequestBody): string[] {
  const tags = new Set<string>(DEFAULT_WORDPRESS_TAGS);

  if (isValidTag(body.tag)) {
    tags.add(body.tag);
  }

  if (Array.isArray(body.tags)) {
    for (const tag of body.tags) {
      if (isValidTag(tag)) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags);
}

function isDynamicRoutePattern(path: string): boolean {
  return path.includes("[") && path.includes("]");
}

function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= 256 &&
    !slug.includes("/") &&
    !slug.includes("?")
  );
}

function isValidTag(tag: unknown): tag is string {
  return typeof tag === "string" && tag.length > 0 && tag.length <= 256;
}
