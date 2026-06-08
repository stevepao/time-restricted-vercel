import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { WORDPRESS_AUTH_COOKIE } from "@/lib/wordpress-auth";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete(WORDPRESS_AUTH_COOKIE);

  return NextResponse.json({ ok: true });
}
