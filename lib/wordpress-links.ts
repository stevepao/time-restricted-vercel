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

  if (!href.includes(backendOrigin)) {
    return href;
  }

  try {
    const url = new URL(href);

    if (normalizeOrigin(url.origin) !== backendOrigin) {
      return href;
    }

    const rewrittenUrl = new URL(
      url.toString().replace(backendOrigin, frontendOrigin),
    );
    rewrittenUrl.pathname = getFrontendPath(url.pathname);

    return rewrittenUrl.toString();
  } catch {
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
  const postSlug = pathname.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\/?$/)?.[1];

  if (postSlug) {
    return `/blog/${postSlug}`;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}
