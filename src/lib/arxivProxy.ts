const ARXIV_ORIGIN = "https://export.arxiv.org";

function resolveProxyBase() {
  const configured = import.meta.env.VITE_ARXIV_PROXY_BASE;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }
  return import.meta.env.PROD ? "/api/arxiv" : "";
}

const PROXY_BASE = resolveProxyBase();

function buildArxivTargetUrl(path: string, params?: URLSearchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = params && [...params.entries()].length
    ? `?${params.toString()}`
    : "";
  return `${ARXIV_ORIGIN}${normalizedPath}${search}`;
}

export function buildArxivRequestUrl(path: string, params?: URLSearchParams) {
  const target = buildArxivTargetUrl(path, params);
  if (!PROXY_BASE) return target;
  const separator = PROXY_BASE.includes("?") ? "&" : "?";
  return `${PROXY_BASE}${separator}target=${encodeURIComponent(target)}`;
}

export function buildArxivRequestUrlFromAbsolute(rawUrl: string) {
  const replaced = rawUrl.replace(
    /^https?:\/\/(?:www\.)?arxiv\.org/i,
    ARXIV_ORIGIN,
  );
  const url = new URL(replaced);
  return buildArxivRequestUrl(url.pathname, url.searchParams);
}
