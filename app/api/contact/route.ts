import { NextResponse } from "next/server";

import {
  getSmtpConfigFromEnv,
  sendContactEmail,
} from "@/lib/send-contact-email";

const TURNSTILE_ACTION = "contact_form";
const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationResponse = {
  action?: string;
  success?: boolean;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = getFormValue(formData, "name");
  const email = getFormValue(formData, "email");
  const subject = getFormValue(formData, "subject");
  const message = getFormValue(formData, "message");
  const turnstileToken = getFormValue(formData, "cf-turnstile-response");

  if (!name || !email || !subject || !message) {
    return redirectWithStatus(request, "missing-fields");
  }

  const smtp = getSmtpConfigFromEnv();
  const turnstileSecretKey = process.env.CONTACT_TURNSTILE_SECRET_KEY;

  if (!smtp || !turnstileSecretKey) {
    return redirectWithStatus(request, "not-configured");
  }

  if (!turnstileToken) {
    return redirectWithStatus(request, "missing-turnstile");
  }

  const turnstileVerified = await verifyContactTurnstileToken(
    turnstileSecretKey,
    turnstileToken,
    getClientIp(request),
  );

  if (!turnstileVerified) {
    return redirectWithStatus(request, "turnstile-failed");
  }

  try {
    await sendContactEmail(smtp, {
      replyTo: email,
      subject: `[Time Restricted] ${subject}`,
      text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    });

    return redirectWithStatus(request, "success");
  } catch {
    return redirectWithStatus(request, "error");
  }
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function verifyContactTurnstileToken(
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

function redirectWithStatus(request: Request, status: string): NextResponse {
  const url = new URL("/contact", request.url);
  url.searchParams.set("contact", status);
  url.hash = "contact-form";

  return NextResponse.redirect(url, 303);
}
