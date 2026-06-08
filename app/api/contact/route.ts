import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = getFormValue(formData, "name");
  const email = getFormValue(formData, "email");
  const subject = getFormValue(formData, "subject");
  const message = getFormValue(formData, "message");

  if (!name || !email || !subject || !message) {
    return redirectWithStatus(request, "missing-fields");
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const to = process.env.CONTACT_TO ?? user;

  if (!host || !port || !user || !pass || !from || !to) {
    return redirectWithStatus(request, "not-configured");
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass,
      user,
    },
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
  });

  try {
    await transporter.sendMail({
      from,
      replyTo: email,
      subject: `[Time Restricted] ${subject}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        message,
      ].join("\n"),
      to,
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

function redirectWithStatus(request: Request, status: string): NextResponse {
  const url = new URL("/contact", request.url);
  url.searchParams.set("contact", status);
  url.hash = "contact-form";

  return NextResponse.redirect(url, 303);
}
