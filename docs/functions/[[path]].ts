import { OpenNavServer } from "../../packages/opennav/src/server.ts";
import { AcceptHeaderNegotiator } from "../../packages/engine/src/accept/services/accept-header-negotiator.ts";

const opennav = new OpenNavServer();
const acceptNegotiator = new AcceptHeaderNegotiator();

interface PagesFunctionEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export async function onRequest(context: {
  request: Request;
  env: PagesFunctionEnv;
  next(): Promise<Response>;
}): Promise<Response> {
  const decision = acceptNegotiator.negotiate({
    acceptHeader: context.request.headers.get("accept") ?? null,
    produces: ["text/html", "text/markdown"],
  });

  // 406 — no acceptable type
  if (decision === null) {
    const htmlResponse = await context.next();
    const result = await opennav.negotiate({
      request: context.request,
      htmlResponse,
    });
    if (result.isErr()) return new Response("Internal error", { status: 500 });
    return result.value;
  }

  // HTML — pass through with Vary + Link
  if (decision === "text/html") {
    const htmlResponse = await context.next();
    const result = await opennav.negotiate({
      request: context.request,
      htmlResponse,
    });
    if (result.isErr()) return new Response("Internal error", { status: 500 });
    return result.value;
  }

  // Markdown — try static .md first, fall back to runtime conversion
  const url = new URL(context.request.url);
  const cleanPath = url.pathname.replace(/\.html$/, "");
  const mdPath = cleanPath.endsWith("/")
    ? cleanPath + "index.md"
    : cleanPath + ".md";

  const staticMd = await context.env.ASSETS.fetch(
    new Request(new URL(mdPath, context.request.url), context.request),
  );
  if (staticMd.ok) {
    const headers = new Headers(staticMd.headers);
    headers.set("Vary", "Accept");
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    return new Response(staticMd.body, {
      status: staticMd.status,
      statusText: staticMd.statusText,
      headers,
    });
  }

  const htmlResponse = await context.next();
  if (!htmlResponse.ok) return htmlResponse;

  const result = await opennav.negotiate({
    request: context.request,
    htmlResponse,
  });
  if (result.isErr()) return new Response("Internal error", { status: 500 });
  return result.value;
}
