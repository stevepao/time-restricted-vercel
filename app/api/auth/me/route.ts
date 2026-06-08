import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getWordPressCurrentUser,
  validateWordPressToken,
  WORDPRESS_AUTH_COOKIE,
} from "@/lib/wordpress-auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(WORDPRESS_AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await getWordPressCurrentUser(token);

  if (user) {
    return NextResponse.json({
      authenticated: true,
      user: {
        name: user.name,
        slug: user.slug,
      },
    });
  }

  const validToken = await validateWordPressToken(token);

  if (!validToken) {
    cookieStore.delete(WORDPRESS_AUTH_COOKIE);

    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({ authenticated: true, user: null });
}
