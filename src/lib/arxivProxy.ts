const DEFAULT_PROXY_ENDPOINT = "/api/arxiv";
const PROXY_ENDPOINT =
  (import.meta.env.VITE_ARXIV_PROXY_ENDPOINT as string | undefined) ||
  DEFAULT_PROXY_ENDPOINT;

function resolveBaseUrl(endpoint: string): URL {
  if (/^https?:\/\//i.test(endpoint)) {
    return new URL(endpoint);
  }

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
  return new URL(endpoint, origin);
}

export function buildArxivProxyUrl(target: string): string {
  if (!PROXY_ENDPOINT || PROXY_ENDPOINT === "direct") {
    return target;
  }

  try {
    const proxyUrl = resolveBaseUrl(PROXY_ENDPOINT);
    proxyUrl.searchParams.set("url", target);
    return proxyUrl.toString();
  } catch {
    return target;
  }
}

export function fetchArxivResource(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const proxiedUrl = buildArxivProxyUrl(url);
  return fetch(proxiedUrl, init);
}
