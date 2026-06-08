import { revalidatePath } from "next/cache";

type RevalidateRequestBody = {
  token?: unknown;
  path?: unknown;
};

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return Response.json(
      { message: "REVALIDATE_SECRET environment variable is not set." },
      { status: 500 },
    );
  }

  if (!body || body.token !== secret) {
    return Response.json({ message: "Invalid token." }, { status: 401 });
  }

  if (!isValidPath(body.path)) {
    return Response.json(
      { message: "A valid path beginning with / is required." },
      { status: 400 },
    );
  }

  revalidatePath(body.path);

  return Response.json({
    revalidated: true,
    path: body.path,
    now: Date.now(),
  });
}

async function parseJsonBody(
  request: Request,
): Promise<RevalidateRequestBody | null> {
  try {
    return (await request.json()) as RevalidateRequestBody;
  } catch {
    return null;
  }
}

function isValidPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path.length <= 1024
  );
}
