type DeployHookBody = {
  action?: unknown;
  deploy?: unknown;
  new_status?: unknown;
  old_status?: unknown;
  post?: unknown;
};

export type DeployHookResult = {
  message: string | null;
  ok: boolean | null;
  triggered: boolean;
};

export function shouldTriggerDeployHook(body: DeployHookBody): boolean {
  if (body.deploy === false) {
    return false;
  }

  if (body.deploy === true) {
    return true;
  }

  if (!isRecord(body.post)) {
    return false;
  }

  const post = body.post;
  const status = getString(post.post_status);

  if (status !== "publish") {
    return false;
  }

  const action = getString(body.action)?.toLowerCase();

  if (action === "created" || action === "publish") {
    return true;
  }

  const oldStatus = getString(body.old_status) ?? getString(post.old_status);
  const newStatus =
    getString(body.new_status) ?? getString(post.new_status) ?? status;

  if (newStatus === "publish" && oldStatus && oldStatus !== "publish") {
    return true;
  }

  if (action === "updated" || action === "save_post") {
    return false;
  }

  return isFirstPublish(post);
}

/**
 * Triggers a production rebuild so `generateStaticParams()` picks up new blog
 * slugs (`dynamicParams = false`). Prefers Cloudflare Workers deploy hooks;
 * falls back to the legacy Vercel env name during migration.
 */
export async function triggerDeployHook(): Promise<DeployHookResult> {
  const deployHookUrl =
    process.env.CF_DEPLOY_HOOK_URL ??
    process.env.DEPLOY_HOOK_URL ??
    process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!deployHookUrl) {
    return {
      message:
        "CF_DEPLOY_HOOK_URL (or DEPLOY_HOOK_URL / VERCEL_DEPLOY_HOOK_URL) is not configured.",
      ok: null,
      triggered: false,
    };
  }

  try {
    const response = await fetch(deployHookUrl, { method: "POST" });

    if (!response.ok) {
      return {
        message: `Deploy hook request failed: ${response.status} ${response.statusText}`,
        ok: false,
        triggered: true,
      };
    }

    return {
      message: "Deploy hook accepted.",
      ok: true,
      triggered: true,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Deploy hook request failed.";

    return {
      message,
      ok: false,
      triggered: true,
    };
  }
}

function isFirstPublish(post: Record<string, unknown>): boolean {
  const publishedAt = parseWordPressTimestamp(
    getString(post.post_date_gmt) ?? getString(post.post_date),
  );
  const modifiedAt = parseWordPressTimestamp(
    getString(post.post_modified_gmt) ?? getString(post.post_modified),
  );

  if (publishedAt === null || modifiedAt === null) {
    return false;
  }

  return Math.abs(modifiedAt - publishedAt) <= 120_000;
}

function parseWordPressTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.endsWith("Z") ? value : `${value}Z`;
  const timestamp = Date.parse(normalized);

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
