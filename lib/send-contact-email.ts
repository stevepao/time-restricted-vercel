import module from "node:module";

type ContactEmailMessage = {
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  to: string;
};

type SmtpConfig = {
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  to: string;
  user: string;
};

export function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const to = process.env.CONTACT_TO ?? user;

  if (!host || !port || !user || !pass || !from || !to) {
    return null;
  }

  return {
    from,
    host,
    pass,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    to,
    user,
  };
}

/**
 * Sends contact-form mail via Nodemailer in local Node / Vercel, and via
 * `@workermailer/smtp` on Cloudflare Workers (same SMTP host → SPF/DKIM unchanged).
 */
export async function sendContactEmail(
  config: SmtpConfig,
  message: Omit<ContactEmailMessage, "from" | "to">,
): Promise<void> {
  const payload: ContactEmailMessage = {
    from: config.from,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    to: config.to,
  };

  if (shouldUseWorkerMailer()) {
    await sendWithWorkerMailer(config, payload);
    return;
  }

  await sendWithNodemailer(config, payload);
}

function shouldUseWorkerMailer(): boolean {
  if (process.env.USE_WORKERMAILER === "true") {
    return true;
  }

  if (process.env.USE_WORKERMAILER === "false") {
    return false;
  }

  // Keep Nodemailer on Vercel and during local `next dev`.
  if (process.env.VERCEL || process.env.NODE_ENV === "development") {
    return false;
  }

  // OpenNext / Workers runtime marker (see OpenNext cloudflare:* examples).
  return Boolean(
    (globalThis as { Cloudflare?: unknown }).Cloudflare ||
      (typeof navigator !== "undefined" &&
        navigator.userAgent.includes("Cloudflare-Workers")),
  );
}

async function sendWithNodemailer(
  config: SmtpConfig,
  message: ContactEmailMessage,
): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.secure,
  });

  await transporter.sendMail({
    from: message.from,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    to: message.to,
  });
}

async function sendWithWorkerMailer(
  config: SmtpConfig,
  message: ContactEmailMessage,
): Promise<void> {
  // Prefer createRequire so OpenNext/esbuild does not statically pull
  // `cloudflare:sockets` into the Node graph (same pattern as OpenNext examples).
  const require = module.createRequire("file:///");
  const { WorkerMailer } = require("@workermailer/smtp") as {
    WorkerMailer: {
      connect: (options: Record<string, unknown>) => Promise<{
        close?: () => Promise<void>;
        send: (email: Record<string, unknown>) => Promise<void>;
      }>;
    };
  };

  const mailer = await WorkerMailer.connect({
    authType: "login",
    credentials: {
      password: config.pass,
      username: config.user,
    },
    host: config.host,
    port: config.port,
    secure: config.secure,
    startTls: !config.secure,
  });

  try {
    await mailer.send({
      from: message.from,
      reply: message.replyTo,
      subject: message.subject,
      text: message.text,
      to: message.to,
    });
  } finally {
    if (typeof mailer.close === "function") {
      await mailer.close().catch(() => undefined);
    }
  }
}
