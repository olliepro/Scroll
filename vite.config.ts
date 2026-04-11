import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const ARXIV_PROXY_PATHS = new Set([
  "/api/arxiv",
  "/projects/scroll/api/arxiv",
]);
const ALLOWED_ARXIV_HOSTS = new Set(["export.arxiv.org", "arxiv.org"]);
const DEV_PROXY_USER_AGENT =
  "scroll-vite-dev-proxy/1.0 (+https://github.com/olliepro/Scroll)";

/**
 * Validates and resolves the requested arXiv target URL for local dev proxying.
 *
 * @param requestUrl - Incoming dev-server request URL including the `url` query parameter.
 * @returns A validated upstream URL or `null` when the request should be rejected.
 *
 * @example
 * const targetUrl = resolveDevProxyTargetUrl(
 *   requestUrl: "/api/arxiv?url=https://export.arxiv.org/api/query?search_query=all:test",
 * );
 */
function resolveDevProxyTargetUrl(requestUrl: string): string | null {
  const parsedRequestUrl = new URL(requestUrl, "http://localhost");
  const targetUrl = parsedRequestUrl.searchParams.get("url");
  if (!targetUrl) return null;

  try {
    const parsedTargetUrl = new URL(targetUrl);
    assertAllowedArxivHost(parsedTargetUrl.hostname);
    return parsedTargetUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Asserts that the requested upstream host is one of the allowed arXiv origins.
 *
 * @param hostname - Hostname extracted from the requested upstream URL.
 * @returns Nothing when the hostname is allowed.
 */
function assertAllowedArxivHost(hostname: string): void {
  if (!ALLOWED_ARXIV_HOSTS.has(hostname)) {
    throw new Error(`Disallowed arXiv proxy host: ${hostname}`);
  }
}

/**
 * Creates a Vite middleware plugin that mirrors the Netlify arXiv proxy in local dev.
 *
 * @returns A Vite plugin that serves `/api/arxiv` and `/projects/scroll/api/arxiv`.
 */
function createArxivDevProxyPlugin(): Plugin {
  return {
    name: "scroll-arxiv-dev-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url;
        if (!requestUrl) return next();
        const pathname = new URL(requestUrl, "http://localhost").pathname;
        if (!ARXIV_PROXY_PATHS.has(pathname)) return next();

        const targetUrl = resolveDevProxyTargetUrl(requestUrl);
        if (!targetUrl) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Invalid or missing url parameter" }));
          return;
        }

        try {
          const upstreamResponse = await fetch(targetUrl, {
            headers: { "User-Agent": DEV_PROXY_USER_AGENT },
          });
          const body = await upstreamResponse.text();
          response.statusCode = upstreamResponse.status;
          response.setHeader(
            "Content-Type",
            upstreamResponse.headers.get("content-type") ||
              "application/xml; charset=utf-8",
          );
          response.end(body);
        } catch {
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Upstream request failed" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), createArxivDevProxyPlugin()],
});
