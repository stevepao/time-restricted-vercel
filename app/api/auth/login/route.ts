import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { loginToWordPress, WORDPRESS_AUTH_COOKIE } from "@/lib/wordpress-auth";

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const TURNSTILE_ACTION = "comment_login";
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type LoginCredentials = {
  password: string;
  turnstileToken: string;
  username: string;
};

type TurnstileVerificationResponse = {
  action?: string;
  success?: boolean;
};

export async function POST(request: Request) {
  const credentials = await getCredentials(request);

  if (!credentials.username || !credentials.password) {
    return NextResponse.json(
      { message: "Please enter your username and password." },
      { status: 400 },
    );
  }

  const turnstileSecretKey = process.env.COMMENT_LOGIN_TURNSTILE_SECRET_KEY;

  if (!turnstileSecretKey) {
    return NextResponse.json(
      { message: "Comment login verification is not configured." },
      { status: 500 },
    );
  }

  if (!credentials.turnstileToken) {
    return NextResponse.json(
      { message: "Please complete the verification challenge." },
      { status: 400 },
    );
  }

  const turnstileVerified = await verifyCommentLoginTurnstileToken(
    turnstileSecretKey,
    credentials.turnstileToken,
    getClientIp(request),
  );

  if (!turnstileVerified) {
    return NextResponse.json(
      { message: "Verification failed. Please try again." },
      { status: 403 },
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
): Promise<LoginCredentials> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: unknown;
      turnstileToken?: unknown;
      username?: unknown;
    } | null;

    return {
      password: typeof body?.password === "string" ? body.password : "",
      turnstileToken:
        typeof body?.turnstileToken === "string" ? body.turnstileToken : "",
      username: typeof body?.username === "string" ? body.username : "",
    };
  }

  const formData = await request.formData();

  return {
    password: getFormValue(formData, "password"),
    turnstileToken: getFormValue(formData, "turnstileToken"),
    username: getFormValue(formData, "username"),
  };
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function verifyCommentLoginTurnstileToken(
  secret: string,
  response: string,
  remoteIp: string | null,
): Promise<boolean> {
  const body = new URLSearchParams({
    response,
    secret,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const verificationResponse = await fetch(TURNSTILE_SITEVERIFY_URL, {
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const verification =
      (await verificationResponse.json().catch(() => null)) as
        | TurnstileVerificationResponse
        | null;

    return Boolean(
      verificationResponse.ok &&
        verification?.success &&
        verification.action === TURNSTILE_ACTION,
    );
  } catch {
    return false;
  }
}

function getClientIp(request: Request): string | null {
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
