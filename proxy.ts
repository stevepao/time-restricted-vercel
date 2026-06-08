import { NextResponse, type NextRequest } from "next/server";

const REDIRECTION_ENDPOINT_PATH = "/wp-json/redirection/v1/redirect";
const DEFAULT_CACHE_TTL_SECONDS = 300;
const MAX_REDIRECT_PAGES = 20;
const REDIRECTS_PER_PAGE = 100;

type RedirectStatusCode = 301 | 302 | 303 | 307 | 308;

type WordPressRedirectRule = {
  action_code?: unknown;
  action_data?: unknown;
  action_type?: unknown;
  enabled?: unknown;
  match_data?: unknown;
  match_type?: unknown;
  match_url?: unknown;
  regex?: unknown;
  status?: unknown;
  url?: unknown;
};

type RedirectCache = {
  expiresAt: number;
  rules: WordPressRedirectRule[];
};

let redirectCache: RedirectCache | null = null;
let redirectFetchPromise: Promise<WordPressRedirectRule[]> | null = null;

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const legacyPostRedirect = getLegacyDatedPostRedirect(request);

  if (legacyPostRedirect) {
    return NextResponse.redirect(legacyPostRedirect, 301);
  }

  const redirect = await getMatchingRedirect(request);

  if (!redirect) {
    return NextResponse.next();
  }

  return NextResponse.redirect(redirect.url, redirect.statusCode);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};

function getLegacyDatedPostRedirect(request: NextRequest): URL | null {
  const postSlug = request.nextUrl.pathname.match(
    /^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\/?$/,
  )?.[1];

  if (!postSlug) {
    return null;
  }

  const redirectUrl = new URL(`/blog/${postSlug}`, request.url);
  redirectUrl.search = request.nextUrl.search;

  return redirectUrl;
}

async function getMatchingRedirect(
  request: NextRequest,
): Promise<{ statusCode: RedirectStatusCode; url: URL } | null> {
  const rules = await getRedirectRules();

  for (const rule of rules) {
    const target = getRedirectTarget(rule);

    if (!target || !isSupportedRule(rule)) {
      continue;
    }

    const match = matchRedirectRule(rule, request);

    if (!match) {
      continue;
    }

    const redirectUrl = toRedirectUrl(
      applyRegexMatches(target, match.regexMatches),
      request,
    );

    if (!redirectUrl || isSameRequestUrl(redirectUrl, request)) {
      continue;
    }

    if (match.passQuery) {
      for (const [key, value] of request.nextUrl.searchParams) {
        redirectUrl.searchParams.append(key, value);
      }
    }

    return {
      statusCode: getRedirectStatusCode(rule),
      url: redirectUrl,
    };
  }

  return null;
}

async function getRedirectRules(): Promise<WordPressRedirectRule[]> {
  const now = Date.now();

  if (redirectCache && redirectCache.expiresAt > now) {
    return redirectCache.rules;
  }

  if (!redirectFetchPromise) {
    redirectFetchPromise = fetchRedirectRules()
      .then((rules) => {
        redirectCache = {
          expiresAt: Date.now() + getCacheTtlMs(),
          rules,
        };

        return rules;
      })
      .catch((error: unknown) => {
        console.error("Failed to fetch WordPress redirects.", error);
        redirectCache = {
          expiresAt: Date.now() + getCacheTtlMs(),
          rules: [],
        };

        return [];
      })
      .finally(() => {
        redirectFetchPromise = null;
      });
  }

  return redirectFetchPromise;
}

async function fetchRedirectRules(): Promise<WordPressRedirectRule[]> {
  const endpoint = getRedirectionEndpoint();

  if (!endpoint) {
    return [];
  }

  const headers = new Headers({
    Accept: "application/json",
  });
  const authorization = getAuthorizationHeader();

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const rules: WordPressRedirectRule[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(endpoint);
    url.searchParams.set("per_page", String(REDIRECTS_PER_PAGE));
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      cache: "force-cache",
      headers,
      next: { revalidate: getCacheTtlSeconds() },
    });

    if (!response.ok) {
      throw new Error(
        `WordPress Redirection request failed: ${response.status} ${response.statusText}`,
      );
    }

    rules.push(...parseRedirectRules(await response.json()));
    totalPages = Math.max(
      1,
      Number(response.headers.get("x-wp-totalpages") ?? 1),
    );
    page += 1;
  } while (page <= totalPages && page <= MAX_REDIRECT_PAGES);

  return rules;
}

function matchRedirectRule(
  rule: WordPressRedirectRule,
  request: NextRequest,
): { passQuery: boolean; regexMatches: RegExpExecArray | null } | null {
  const source = getString(rule.match_url) ?? getString(rule.url);

  if (!source) {
    return null;
  }

  const sourceFlags = getSourceFlags(rule);
  const queryMode = getString(sourceFlags.flag_query);
  const passQuery = queryMode === "pass";

  if (isRegexRule(rule, sourceFlags)) {
    const flags = sourceFlags.flag_case === false ? "i" : "";
    const matchInput = source.includes("?")
      ? `${request.nextUrl.pathname}${request.nextUrl.search}`
      : request.nextUrl.pathname;

    try {
      const regex = new RegExp(source, flags);
      const regexMatches = regex.exec(matchInput);

      if (!regexMatches) {
        return null;
      }

      return { passQuery, regexMatches };
    } catch {
      return null;
    }
  }

  const sourceUrl = toSourceUrl(source, request.url);

  if (!sourceUrl) {
    return null;
  }

  if (
    !pathsMatch(
      request.nextUrl.pathname,
      sourceUrl.pathname,
      sourceFlags.flag_case !== false,
      sourceFlags.flag_trailing === true,
    )
  ) {
    return null;
  }

  if (queryMode === "exact" && request.nextUrl.search !== sourceUrl.search) {
    return null;
  }

  return { passQuery, regexMatches: null };
}

function parseRedirectRules(responseBody: unknown): WordPressRedirectRule[] {
  const collection = Array.isArray(responseBody)
    ? responseBody
    : getRedirectCollection(responseBody);

  return collection.filter(isRecord).map((item) => item);
}

function getRedirectCollection(responseBody: unknown): unknown[] {
  if (!isRecord(responseBody)) {
    return [];
  }

  for (const key of ["items", "redirects", "data"]) {
    const value = responseBody[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function isSupportedRule(rule: WordPressRedirectRule): boolean {
  const status = getString(rule.status);
  const enabled = rule.enabled;
  const matchType = getString(rule.match_type);
  const actionType = getString(rule.action_type);

  return (
    enabled !== false &&
    enabled !== "false" &&
    status !== "disabled" &&
    (!matchType || matchType === "url") &&
    (!actionType || actionType === "url")
  );
}

function getRedirectTarget(rule: WordPressRedirectRule): string | null {
  const actionData = rule.action_data;

  if (typeof actionData === "string") {
    return actionData.trim() || null;
  }

  if (isRecord(actionData)) {
    return getString(actionData.url)?.trim() || null;
  }

  return null;
}

function getSourceFlags(rule: WordPressRedirectRule): Record<string, unknown> {
  if (!isRecord(rule.match_data) || !isRecord(rule.match_data.source)) {
    return {};
  }

  return rule.match_data.source;
}

function isRegexRule(
  rule: WordPressRedirectRule,
  sourceFlags: Record<string, unknown>,
): boolean {
  return rule.regex === true || sourceFlags.flag_regex === true;
}

function pathsMatch(
  requestPath: string,
  sourcePath: string,
  caseSensitive: boolean,
  trailingSensitive: boolean,
): boolean {
  let normalizedRequestPath = trailingSensitive
    ? requestPath
    : stripTrailingSlash(requestPath);
  let normalizedSourcePath = trailingSensitive
    ? sourcePath
    : stripTrailingSlash(sourcePath);

  if (!caseSensitive) {
    normalizedRequestPath = normalizedRequestPath.toLowerCase();
    normalizedSourcePath = normalizedSourcePath.toLowerCase();
  }

  return normalizedRequestPath === normalizedSourcePath;
}

function toSourceUrl(source: string, baseUrl: string): URL | null {
  try {
    return new URL(source.startsWith("/") ? source : `/${source}`, baseUrl);
  } catch {
    return null;
  }
}

function toRedirectUrl(target: string, request: NextRequest): URL | null {
  try {
    const redirectUrl = new URL(target, request.url);
    const wordpressOrigin = getWordPressOrigin();

    if (wordpressOrigin && redirectUrl.origin === wordpressOrigin) {
      const frontendOrigin = new URL(getFrontendOrigin(request));
      redirectUrl.protocol = frontendOrigin.protocol;
      redirectUrl.host = frontendOrigin.host;
    }

    if (redirectUrl.origin === request.nextUrl.origin) {
      redirectUrl.pathname = getFrontendPath(redirectUrl.pathname);
    }

    return redirectUrl;
  } catch {
    return null;
  }
}

function applyRegexMatches(
  target: string,
  regexMatches: RegExpExecArray | null,
): string {
  if (!regexMatches) {
    return target;
  }

  return target.replace(/\$(\d+)/g, (_match, index: string) => {
    return regexMatches[Number(index)] ?? "";
  });
}

function getRedirectStatusCode(rule: WordPressRedirectRule): RedirectStatusCode {
  const statusCode = Number(rule.action_code);

  if (
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 307 ||
    statusCode === 308
  ) {
    return statusCode;
  }

  return 301;
}

function isSameRequestUrl(url: URL, request: NextRequest): boolean {
  return (
    url.origin === request.nextUrl.origin &&
    url.pathname === request.nextUrl.pathname &&
    url.search === request.nextUrl.search
  );
}

function getRedirectionEndpoint(): string | null {
  if (process.env.WORDPRESS_REDIRECTION_API_URL) {
    return process.env.WORDPRESS_REDIRECTION_API_URL;
  }

  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    return null;
  }

  return new URL(REDIRECTION_ENDPOINT_PATH, new URL(wordpressApiUrl).origin)
    .href;
}

function getAuthorizationHeader(): string | null {
  const username = process.env.WORDPRESS_REDIRECTION_USERNAME;
  const password = process.env.WORDPRESS_REDIRECTION_APPLICATION_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return `Basic ${btoa(`${username}:${password}`)}`;
}

function getCacheTtlSeconds(): number {
  const configuredSeconds = Number(
    process.env.WORDPRESS_REDIRECTION_CACHE_TTL_SECONDS,
  );

  if (Number.isFinite(configuredSeconds) && configuredSeconds > 0) {
    return configuredSeconds;
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}

function getCacheTtlMs(): number {
  return getCacheTtlSeconds() * 1000;
}

function getWordPressOrigin(): string | null {
  const redirectionApiUrl = process.env.WORDPRESS_REDIRECTION_API_URL;

  if (redirectionApiUrl) {
    return new URL(redirectionApiUrl).origin;
  }

  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    return null;
  }

  return new URL(wordpressApiUrl).origin;
}

function getFrontendOrigin(request: NextRequest): string {
  return process.env.SITE_URL ?? request.nextUrl.origin;
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

function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/$/, "");
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
