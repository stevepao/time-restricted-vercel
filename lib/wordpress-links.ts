import sanitizeHtml from "sanitize-html";

const DEFAULT_FRONTEND_ORIGIN = "https://time-restricted.com";
const DEFAULT_WORDPRESS_BACKEND_ORIGIN = "https://api.time-restricted.com";

type RewriteWordPressLinksOptions = {
  backendOrigin?: string;
  frontendOrigin?: string;
};

type AnchorTransform = NonNullable<
  NonNullable<Parameters<typeof sanitizeHtml>[1]>["transformTags"]
>[string];

export function rewriteWordPressLinks(
  html: string,
  options: RewriteWordPressLinksOptions = {},
): string {
  return sanitizeHtml(html, {
    allowedAttributes: false,
    allowedTags: false,
    transformTags: {
      a: createWordPressLinkTransform(options),
    },
  });
}

export function createWordPressLinkTransform(
  options: RewriteWordPressLinksOptions = {},
): AnchorTransform {
  return (tagName, attribs) => ({
    attribs: {
      ...attribs,
      href:
        rewriteWordPressBackendUrl(attribs.href, options) ??
        attribs.href ??
        "",
    },
    tagName,
  });
}

export function rewriteWordPressBackendUrl(
  href: string | undefined,
  options: RewriteWordPressLinksOptions = {},
): string | undefined {
  if (!href) {
    return href;
  }

  const backendOrigin = normalizeOrigin(
    options.backendOrigin ?? getWordPressBackendOrigin(),
  );
  const frontendOrigin = normalizeOrigin(
    options.frontendOrigin ?? getFrontendOrigin(),
  );
  const isRelativeUrl = href.startsWith("/");

  try {
    const url = new URL(href, frontendOrigin);
    const urlOrigin = normalizeOrigin(url.origin);
    const isWordPressBackendUrl = urlOrigin === backendOrigin;
    const isFrontendUrl = urlOrigin === frontendOrigin;

    if (!isWordPressBackendUrl && !isFrontendUrl) {
      return href;
    }

    const frontendPath = isWordPressBackendUrl
      ? getFrontendPath(url.pathname)
      : getDatedPostPath(url.pathname);

    if (!frontendPath) {
      return href;
    }

    const rewrittenUrl = new URL(url.toString());
    const frontendUrl = new URL(frontendOrigin);
    rewrittenUrl.protocol = frontendUrl.protocol;
    rewrittenUrl.host = frontendUrl.host;
    rewrittenUrl.pathname = frontendPath;

    return isRelativeUrl
      ? `${rewrittenUrl.pathname}${rewrittenUrl.search}${rewrittenUrl.hash}`
      : rewrittenUrl.toString();
  } catch {
    if (!href.includes(backendOrigin)) {
      return href;
    }

    return href.replaceAll(backendOrigin, frontendOrigin);
  }
}

function getWordPressBackendOrigin(): string {
  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    return DEFAULT_WORDPRESS_BACKEND_ORIGIN;
  }

  return new URL(wordpressApiUrl).origin;
}

function getFrontendOrigin(): string {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_FRONTEND_ORIGIN
  );
}

function getFrontendPath(pathname: string): string {
  const datedPostPath = getDatedPostPath(pathname);

  if (datedPostPath) {
    return datedPostPath;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getDatedPostPath(pathname: string): string | null {
  const postSlug = pathname.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\/?$/)?.[1];

  return postSlug ? `/blog/${postSlug}` : null;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}
