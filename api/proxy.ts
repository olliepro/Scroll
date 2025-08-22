/* eslint-env node */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "accept");
    res.status(204).end();
    return;
  }

  const { url } = req.query;
  if (!url || Array.isArray(url)) {
    res.status(400).send("Missing url param");
    return;
  }

  try {
    const upstream = await fetch(url as string, {
      headers: {
        ...(req.headers.accept ? { accept: req.headers.accept } : {}),
      },
    });

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "content-length" || lower === "content-encoding") return;
      res.setHeader(key, value);
    });
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "accept");

    const body = await upstream.text();
    res.setHeader("Content-Length", String(Buffer.byteLength(body, "utf8")));
    res.status(upstream.status).send(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).send(msg ?? "Upstream fetch failed");
  }
}
