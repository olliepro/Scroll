/* eslint-env node */
import type { VercelRequest, VercelResponse } from "@vercel/node";

function applyCors(req: VercelRequest, res: VercelResponse) {
  const reqHeaders = req.headers["access-control-request-headers"];
  const allow = Array.isArray(reqHeaders)
    ? reqHeaders.join(",")
    : reqHeaders || "*";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", allow);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    applyCors(req, res);
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
    applyCors(req, res);

    const body = await upstream.text();
    res.setHeader("Content-Length", String(Buffer.byteLength(body, "utf8")));
    res.status(upstream.status).send(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).send(msg ?? "Upstream fetch failed");
  }
}
