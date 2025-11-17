import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_HOSTS = new Set([
  "export.arxiv.org",
  "arxiv.org",
]);

function sendCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  sendCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const targetParam = req.query.url;
  const target = Array.isArray(targetParam) ? targetParam[0] : targetParam;
  if (!target) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    res.status(400).json({ error: "Host not allowed" });
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "scroll-arxiv-proxy/1.0 (+https://github.com/openai/scroll)",
      },
    });
    const body = await upstream.text();

    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/xml; charset=utf-8",
    );
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");
    res.send(body);
  } catch {
    res.status(502).json({ error: "Upstream request failed" });
  }
}
