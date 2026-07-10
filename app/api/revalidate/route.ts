import { revalidatePath, revalidateTag } from "next/cache";

import {
  shouldTriggerDeployHook,
  triggerVercelDeployHook,
} from "@/lib/vercel-deploy";
import {
  WORDPRESS_CACHE_TAG,
  WORDPRESS_POSTS_CACHE_TAG,
} from "@/lib/wordpress";

const DEFAULT_FULL_REVALIDATION_PATHS = [
  "/",
  "/all-posts",
  "/feed.xml",
  "/sitemap.xml",
];
const DEFAULT_POST_UPDATE_PATHS = ["/", "/all-posts", "/feed.xml", "/sitemap.xml"];

type RevalidateRequestBody = {
  action?: unknown;
  deploy?: unknown;
  new_status?: unknown;
  old_status?: unknown;
  token?: unknown;
  path?: unknown;
  paths?: unknown;
  post?: unknown;
  slug?: unknown;
  tag?: unknown;
  tags?: unknown;
};

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  const token = getRequestToken(request, body);
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return Response.json(
      { message: "REVALIDATE_SECRET environment variable is not set." },
      { status: 500 },
    );
  }

  if (token !== secret) {
    return Response.json({ message: "Invalid token." }, { status: 401 });
  }

  const paths = getPathsToRevalidate(body ?? {});
  const tags = getTagsToRevalidate(body ?? {});

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

  const deploy = shouldTriggerDeployHook(body ?? {})
    ? await triggerVercelDeployHook()
    : {
        message: null,
        ok: null,
        triggered: false,
      };

  return Response.json({
    deploy,
    now: Date.now(),
    paths,
    revalidated: true,
    tags,
  });
}

function getRequestToken(
  request: Request,
  body: RevalidateRequestBody | null,
): string | null {
  const urlToken = new URL(request.url).searchParams.get("token");

  if (urlToken) {
    return urlToken;
  }

  return typeof body?.token === "string" ? body.token : null;
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
  const slug = getPostSlug(body);
  const paths = new Set<string>(
    slug ? DEFAULT_POST_UPDATE_PATHS : DEFAULT_FULL_REVALIDATION_PATHS,
  );

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

  if (slug) {
    paths.add(`/blog/${slug}`);
  } else if (
    !slug &&
    !isValidPath(body.path) &&
    !Array.isArray(body.paths)
  ) {
    paths.add("/blog/[slug]");
  }

  return Array.from(paths);
}

function getTagsToRevalidate(body: RevalidateRequestBody): string[] {
  const tags = new Set<string>();

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

  if (tags.size > 0) {
    return Array.from(tags);
  }

  const slug = getPostSlug(body);

  if (slug) {
    return [WORDPRESS_POSTS_CACHE_TAG];
  }

  return [WORDPRESS_CACHE_TAG, WORDPRESS_POSTS_CACHE_TAG];
}

function isDynamicRoutePattern(path: string): boolean {
  return path.includes("[") && path.includes("]");
}

function getPostSlug(body: RevalidateRequestBody): string | null {
  if (isValidSlug(body.slug)) {
    return body.slug;
  }

  if (isRecord(body.post) && isValidSlug(body.post.post_name)) {
    return body.post.post_name;
  }

  return null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
