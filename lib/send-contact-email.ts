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

type MailAddress = {
  email: string;
  name?: string;
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

  // OpenNext sets NEXTJS_ENV=production in wrangler vars for Workers deploys.
  if (process.env.NEXTJS_ENV === "production") {
    return true;
  }

  // Cloudflare Workers / OpenNext runtime markers.
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
  const { WorkerMailer } = await import("@workermailer/smtp");
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

  const from = parseMailAddress(message.from);
  const reply = parseMailAddress(message.replyTo);
  const to = parseMailAddress(message.to).email;

  try {
    await mailer.send({
      from,
      reply,
      subject: message.subject,
      text: message.text,
      to,
    });
  } finally {
    if (typeof mailer.close === "function") {
      await mailer.close().catch(() => undefined);
    }
  }
}

/** Accepts `user@example.com` or `Display Name <user@example.com>`. */
function parseMailAddress(value: string): MailAddress {
  const trimmed = value.trim();
  const angled = trimmed.match(/^(.*?)\s*<([^<>]+)>$/);

  if (angled) {
    const name = angled[1]?.trim().replace(/^["']|["']$/g, "");
    const email = angled[2]?.trim();

    if (email) {
      return name ? { email, name } : { email };
    }
  }

  return { email: trimmed };
}
