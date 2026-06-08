import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = getFormValue(formData, "EMAIL");
  const firstName = getFormValue(formData, "FNAME");
  const lastName = getFormValue(formData, "LNAME");
  const redirectTo = getSafeRedirectPath(getFormValue(formData, "redirectTo"));

  if (!email) {
    return redirectWithStatus(request, redirectTo, "missing-email");
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;

  if (!apiKey || !listId) {
    return redirectWithStatus(request, redirectTo, "not-configured");
  }

  const datacenter = apiKey.split("-")[1];

  if (!datacenter) {
    return redirectWithStatus(request, redirectTo, "not-configured");
  }

  const response = await fetch(
    `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString(
          "base64",
        )}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
        status: "subscribed",
      }),
    },
  );

  if (response.ok) {
    return redirectWithStatus(request, redirectTo, "success");
  }

  const errorBody = (await response.json().catch(() => null)) as {
    title?: string;
  } | null;

  if (errorBody?.title === "Member Exists") {
    return redirectWithStatus(request, redirectTo, "success");
  }

  return redirectWithStatus(request, redirectTo, "error");
}

function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getSafeRedirectPath(path: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path.split("?")[0] || "/";
}

function redirectWithStatus(
  request: Request,
  path: string,
  status: string,
): NextResponse {
  const url = new URL(path, request.url);
  url.searchParams.set("subscribe", status);
  url.hash = "mailchimp-signup";

  return NextResponse.redirect(url, 303);
}
