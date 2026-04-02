import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/oauth";
import { linkLicense } from "@/lib/license";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { license_key?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.license_key || typeof body.license_key !== "string") {
    return Response.json({ error: "license_key is required" }, { status: 400 });
  }

  try {
    const result = await linkLicense(accessToken, body.license_key);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "License link failed";
    // Map known error messages to appropriate status codes
    const status = message.includes("already linked") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
