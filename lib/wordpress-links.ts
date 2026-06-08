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

type ImageTransform = AnchorTransform;

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

export function createWordPressImageTransform(
  options: RewriteWordPressLinksOptions = {},
): ImageTransform {
  return (tagName, attribs) => {
    const transformedAttribs = { ...attribs };

    if (attribs.src) {
      transformedAttribs.src =
        rewriteWordPressImageUrl(attribs.src, options) ?? attribs.src;
    }

    if (attribs.srcset) {
      transformedAttribs.srcset =
        rewriteWordPressImageSrcset(attribs.srcset, options) ?? attribs.srcset;
    }

    return {
      attribs: transformedAttribs,
      tagName,
    };
  };
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

export function rewriteWordPressImageUrl(
  src: string | undefined,
  options: RewriteWordPressLinksOptions = {},
): string | undefined {
  if (!src) {
    return src;
  }

  try {
    const frontendOrigin = normalizeOrigin(
      options.frontendOrigin ?? getFrontendOrigin(),
    );
    const mediaOrigin = normalizeOrigin(getWordPressMediaOrigin(options));
    const url = new URL(src, frontendOrigin);

    if (!isWordPressUploadPath(url.pathname)) {
      return src;
    }

    const urlOrigin = normalizeOrigin(url.origin);

    if (
      urlOrigin !== frontendOrigin &&
      urlOrigin !== mediaOrigin &&
      urlOrigin !== normalizeOrigin(DEFAULT_WORDPRESS_BACKEND_ORIGIN)
    ) {
      return src;
    }

    const mediaUrl = new URL(mediaOrigin);
    url.protocol = mediaUrl.protocol;
    url.host = mediaUrl.host;

    return url.toString();
  } catch {
    return src;
  }
}

export function rewriteWordPressImageSrcset(
  srcset: string | undefined,
  options: RewriteWordPressLinksOptions = {},
): string | undefined {
  if (!srcset) {
    return srcset;
  }

  return srcset
    .split(",")
    .map((candidate) => rewriteSrcsetCandidate(candidate, options))
    .join(", ");
}

function getWordPressBackendOrigin(): string {
  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    return DEFAULT_WORDPRESS_BACKEND_ORIGIN;
  }

  return new URL(wordpressApiUrl).origin;
}

function getWordPressMediaOrigin(options: RewriteWordPressLinksOptions): string {
  if (options.backendOrigin) {
    return options.backendOrigin;
  }

  const backendOrigin = normalizeOrigin(getWordPressBackendOrigin());
  const frontendOrigin = normalizeOrigin(getFrontendOrigin());

  if (backendOrigin !== frontendOrigin) {
    return backendOrigin;
  }

  return DEFAULT_WORDPRESS_BACKEND_ORIGIN;
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

function isWordPressUploadPath(pathname: string): boolean {
  return pathname.startsWith("/wp-content/uploads/");
}

function rewriteSrcsetCandidate(
  candidate: string,
  options: RewriteWordPressLinksOptions,
): string {
  const trimmedCandidate = candidate.trim();

  if (!trimmedCandidate) {
    return trimmedCandidate;
  }

  const parts = trimmedCandidate.split(/\s+/);
  const url = parts[0];

  if (!url) {
    return trimmedCandidate;
  }

  const rewrittenUrl = rewriteWordPressImageUrl(url, options);

  return [rewrittenUrl ?? url, ...parts.slice(1)].join(" ");
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}
