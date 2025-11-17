const ALLOWED_HOST = /^https:\/\/(?:export\.)?arxiv\.org\//i;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,User-Agent");
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const target = req.query?.target;
  if (!target || Array.isArray(target) || !ALLOWED_HOST.test(target)) {
    res.status(400).json({ error: "Invalid target" });
    return;
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "scroll-arxiv-proxy",
      },
    });

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }
    res.status(upstream.status).send(buffer);
  } catch (err) {
    res.status(502).json({ error: "Upstream fetch failed" });
  }
};
