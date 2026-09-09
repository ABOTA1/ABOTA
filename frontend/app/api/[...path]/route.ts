import { NextRequest, NextResponse } from "next/server";

function backendOrigin(): string | null {
  const raw = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  // Local docker/dev default. Never use this on Vercel — 127.0.0.1 is the
  // serverless isolate, not FastAPI.
  if (process.env.VERCEL) {
    return null;
  }
  return "http://127.0.0.1:8000";
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Gemini + mcp-clickhouse can exceed Vercel/Railway's default 10–60s budget.
export const maxDuration = 300;

async function proxy(
  request: NextRequest,
  context: { params: { path: string[] } }
): Promise<Response> {
  const origin = backendOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_API_URL (and/or BACKEND_INTERNAL_URL) on Vercel to the " +
          "public Railway API, e.g. https://acceptable-laughter-production-4884.up.railway.app",
      },
      { status: 503 }
    );
  }

  const path = context.params.path.join("/");
  const target = `${origin}/api/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
    // Node's fetch requires duplex when sending a body.
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }

  try {
    const upstream = await fetch(target, init);
    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) {
      outHeaders.set("content-type", upstreamType);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error:
          `Backend is not reachable at ${origin}. ` +
          "On Vercel set NEXT_PUBLIC_API_URL to the public Railway API HTTPS URL. " +
          `Details: ${detail}`,
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
