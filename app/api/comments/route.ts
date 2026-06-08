import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getWordPressOrigin,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const postId = Number(getFormValue(formData, "postId"));
  const slug = getFormValue(formData, "slug");
  const content = getFormValue(formData, "content");
  const redirectPath = slug ? `/blog/${slug}` : "/";
  const token = (await cookies()).get(WORDPRESS_AUTH_COOKIE)?.value;

  if (!token) {
    return redirectWithStatus(request, redirectPath, "login-required");
  }

  if (!postId || !content) {
    return redirectWithStatus(request, redirectPath, "missing-fields");
  }

  const wordpressOrigin = getWordPressOrigin();

  if (!wordpressOrigin) {
    return redirectWithStatus(request, redirectPath, "not-configured");
  }

  const response = await fetch(`${wordpressOrigin}/wp-json/wp/v2/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      post: postId,
    }),
  });

  if (response.ok) {
    const comment = (await response.json().catch(() => null)) as {
      status?: string;
    } | null;

    return redirectWithStatus(
      request,
      redirectPath,
      comment?.status === "approved" ? "success" : "pending",
    );
  }

  const errorBody = (await response.json().catch(() => null)) as {
    code?: string;
  } | null;

  if (response.status === 401 || response.status === 403) {
    return redirectWithStatus(request, redirectPath, "auth-expired");
  }

  if (response.status === 401 || errorBody?.code === "rest_comment_login_required") {
    return redirectWithStatus(request, redirectPath, "login-required");
  }

  if (errorBody?.code === "rest_comment_closed") {
    return redirectWithStatus(request, redirectPath, "closed");
  }

  return redirectWithStatus(request, redirectPath, "error");
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithStatus(
  request: Request,
  path: string,
  status: string,
): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set("comment", status);
  url.hash = "comments";

  return NextResponse.redirect(url, 303);
}
