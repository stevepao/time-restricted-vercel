export const WORDPRESS_AUTH_COOKIE = "time_restricted_wp_jwt";

export type WordPressJwtLogin = {
  token: string;
  user_display_name?: string;
  user_email?: string;
  user_nicename?: string;
};

export type WordPressCurrentUser = {
  id: number;
  name: string;
  slug: string;
};

export function getWordPressOrigin(): string | null {
  const wordpressApiUrl = process.env.WORDPRESS_API_URL;

  if (!wordpressApiUrl) {
    return null;
  }

  return new URL(wordpressApiUrl).origin;
}

export async function loginToWordPress(
  username: string,
  password: string,
): Promise<WordPressJwtLogin> {
  const wordpressOrigin = getWordPressOrigin();

  if (!wordpressOrigin) {
    throw new Error("WORDPRESS_API_URL environment variable is not set.");
  }

  const response = await fetch(`${wordpressOrigin}/wp-json/jwt-auth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password,
      username,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | (Partial<WordPressJwtLogin> & { message?: string })
    | null;

  if (!response.ok || !body?.token) {
    throw new Error(body?.message || "WordPress login failed.");
  }

  return {
    token: body.token,
    user_display_name: body.user_display_name,
    user_email: body.user_email,
    user_nicename: body.user_nicename,
  };
}

export async function validateWordPressToken(token: string): Promise<boolean> {
  const wordpressOrigin = getWordPressOrigin();

  if (!wordpressOrigin) {
    return false;
  }

  const response = await fetch(
    `${wordpressOrigin}/wp-json/jwt-auth/v1/token/validate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.ok;
}

export async function getWordPressCurrentUser(
  token: string,
): Promise<WordPressCurrentUser | null> {
  const wordpressOrigin = getWordPressOrigin();

  if (!wordpressOrigin) {
    return null;
  }

  const response = await fetch(`${wordpressOrigin}/wp-json/wp/v2/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as Partial<WordPressCurrentUser>;

  if (!user.id || !user.name || !user.slug) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    slug: user.slug,
  };
}
