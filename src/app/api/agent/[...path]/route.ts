import { NextResponse } from "next/server";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:8000";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, { params }: Context) {
  const { path } = await params;
  const target = `${AGENT_URL}/${path.map(encodeURIComponent).join("/")}`;
  const hasBody = request.method !== "GET" && request.method !== "DELETE";

  try {
    const res = await fetch(target, {
      method: request.method,
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = typeof data.detail === "string" ? data.detail : "Agent service error";
      return NextResponse.json({ error }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error:
          "Agent service is not running. Start it with `cd agent && uv run appgen-service`.",
      },
      { status: 503 }
    );
  }
}

export { forward as GET, forward as POST, forward as DELETE };
