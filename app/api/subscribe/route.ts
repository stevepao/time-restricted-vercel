import { NextResponse } from "next/server";

const TURNSTILE_ACTION = "mailchimp_signup";
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationResponse = {
  action?: string;
  success?: boolean;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = getFormValue(formData, "EMAIL");
  const firstName = getFormValue(formData, "FNAME");
  const lastName = getFormValue(formData, "LNAME");
  const redirectTo = getSafeRedirectPath(getFormValue(formData, "redirectTo"));
  const turnstileToken = getFormValue(formData, "cf-turnstile-response");

  if (!email) {
    return redirectWithStatus(request, redirectTo, "missing-email");
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const turnstileSecretKey = process.env.MAILCHIMP_TURNSTILE_SECRET_KEY;

  if (!apiKey || !listId || !turnstileSecretKey) {
    return redirectWithStatus(request, redirectTo, "not-configured");
  }

  if (!turnstileToken) {
    return redirectWithStatus(request, redirectTo, "missing-turnstile");
  }

  const turnstileVerified = await verifyMailchimpTurnstileToken(
    turnstileSecretKey,
    turnstileToken,
    getClientIp(request),
  );

  if (!turnstileVerified) {
    return redirectWithStatus(request, redirectTo, "turnstile-failed");
  }

  const datacenter = apiKey.split("-")[1];

  if (!datacenter) {
    return redirectWithStatus(request, redirectTo, "not-configured");
  }

  const response = await fetch(
    `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString(
          "base64",
        )}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
        status: "subscribed",
      }),
    },
  );

  if (response.ok) {
    return redirectWithStatus(request, redirectTo, "success");
  }

  const errorBody = (await response.json().catch(() => null)) as {
    title?: string;
  } | null;

  if (errorBody?.title === "Member Exists") {
    return redirectWithStatus(request, redirectTo, "success");
  }

  return redirectWithStatus(request, redirectTo, "error");
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function verifyMailchimpTurnstileToken(
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

function getSafeRedirectPath(path: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path.split("?")[0] || "/";
}

function redirectWithStatus(
  request: Request,
  path: string,
  status: string,
): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set("subscribe", status);
  url.hash = "mailchimp-signup";

  return NextResponse.redirect(url, 303);
}
