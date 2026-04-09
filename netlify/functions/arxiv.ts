const ALLOWED_HOSTS = new Set(["export.arxiv.org", "arxiv.org"]);
const DEFAULT_CONTENT_TYPE = "application/xml; charset=utf-8";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const USER_AGENT = "scroll-arxiv-proxy/1.0 (+https://github.com/olliepro/Scroll)";

type HeaderMap = Record<string, string>;
type TargetUrlResolution =
  | { error: null; targetUrl: string }
  | { error: string; targetUrl: null };

/**
 * Builds the shared CORS headers used by the arXiv proxy.
 *
 * @param extraHeaders - Additional response headers to merge into the CORS base set.
 * @returns A serializable header map for the response.
 */
function buildCorsHeaders(extraHeaders: HeaderMap = {}): HeaderMap {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  };
}

/**
 * Creates a JSON error response for invalid requests or upstream failures.
 *
 * @param statusCode - HTTP status code to return.
 * @param payload - JSON payload describing the failure.
 * @returns A Netlify-compatible JSON response object.
 */
function createJsonResponse(
  statusCode: number,
  payload: Record<string, string>,
) {
  return {
    statusCode,
    headers: buildCorsHeaders({ "Content-Type": JSON_CONTENT_TYPE }),
    body: JSON.stringify(payload),
  };
}

/**
 * Validates the requested proxy URL and restricts it to arXiv hosts.
 *
 * @param queryStringParameters - Query string parameters from the incoming event.
 * @returns Either a validated target URL or an error message.
 *
 * @example
 * resolveTargetUrl({
 *   url: "https://export.arxiv.org/api/query?search_query=all:transformer",
 * });
 */
function resolveTargetUrl(
  queryStringParameters: Record<string, string | undefined> | null | undefined,
): TargetUrlResolution {
  const targetUrl = queryStringParameters?.url;
  if (!targetUrl) {
    return { error: "Missing url parameter", targetUrl: null };
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      return { error: "Host not allowed", targetUrl: null };
    }
    return { error: null, targetUrl: parsedUrl.toString() };
  } catch {
    return { error: "Invalid url", targetUrl: null };
  }
}

/**
 * Handles arXiv proxy requests for the Scroll project page.
 *
 * @param event - Netlify function event for `/projects/scroll/api/arxiv`.
 * @returns Upstream XML on success or a JSON error response.
 */
export async function handler(event: {
  httpMethod: string;
  queryStringParameters?: Record<string, string | undefined> | null;
}) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: buildCorsHeaders(), body: "" };
  }

  const targetUrlResolution = resolveTargetUrl(event.queryStringParameters);
  if (targetUrlResolution.targetUrl === null) {
    return createJsonResponse(400, { error: targetUrlResolution.error });
  }

  try {
    const upstreamResponse = await fetch(targetUrlResolution.targetUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    const body = await upstreamResponse.text();

    return {
      statusCode: upstreamResponse.status,
      headers: buildCorsHeaders({
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        "Content-Type":
          upstreamResponse.headers.get("content-type") || DEFAULT_CONTENT_TYPE,
      }),
      body,
    };
  } catch {
    return createJsonResponse(502, { error: "Upstream request failed" });
  }
}
