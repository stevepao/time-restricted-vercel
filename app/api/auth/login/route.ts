import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { loginToWordPress, WORDPRESS_AUTH_COOKIE } from "@/lib/wordpress-auth";

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const credentials = await getCredentials(request);

  if (!credentials.username || !credentials.password) {
    return NextResponse.json(
      { message: "Please enter your username and password." },
      { status: 400 },
    );
  }

  try {
    const login = await loginToWordPress(
      credentials.username,
      credentials.password,
    );
    const cookieStore = await cookies();

    cookieStore.set({
      name: WORDPRESS_AUTH_COOKIE,
      value: login.token,
      httpOnly: true,
      maxAge: ONE_WEEK_IN_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({
      user: {
        email: login.user_email ?? null,
        name: login.user_display_name ?? login.user_nicename ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "WordPress login failed.";

    return NextResponse.json({ message }, { status: 401 });
  }
}

async function getCredentials(
  request: Request,
): Promise<{ password: string; username: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: unknown;
      username?: unknown;
    } | null;

    return {
      password: typeof body?.password === "string" ? body.password : "",
      username: typeof body?.username === "string" ? body.username : "",
    };
  }

  const formData = await request.formData();

  return {
    password: getFormValue(formData, "password"),
    username: getFormValue(formData, "username"),
  };
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}
