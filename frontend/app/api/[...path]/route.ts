import { NextRequest, NextResponse } from "next/server";

const BACKEND_ORIGIN =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxy(
  request: NextRequest,
  context: { params: { path: string[] } }
): Promise<Response> {
  const path = context.params.path.join("/");
  const target = `${BACKEND_ORIGIN}/api/${path}${request.nextUrl.search}`;

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
          `Backend is not reachable at ${BACKEND_ORIGIN}. ` +
          "Start FastAPI with `docker compose up` (or uvicorn on port 8000) and retry. " +
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
