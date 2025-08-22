/* eslint-env node */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      if (key.toLowerCase() === "content-length" || key.toLowerCase() === "content-encoding") return;
      res.setHeader(key, value);
    });
    res.setHeader("Access-Control-Allow-Origin", "*");

    const body = await upstream.text();
    res.status(upstream.status).send(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).send(msg ?? "Upstream fetch failed");
  }
}
