import type { AltmetricCounts, RateLimitInfo } from "../types";

interface AltmetricApiData {
  cited_by_tweeters_count?: number;
  cited_by_rdts_count?: number;
  cited_by_wikipedia_count?: number;
  cited_by_accounts_count?: number;
  cited_by_posts_count?: number;
}

export async function fetchAltmetric(
  arxivId: string,
  debug?: (msg: string) => void
): Promise<{
  counts: AltmetricCounts | null;
  rate: RateLimitInfo;
  status: number;
  retryAfterSec?: number;
}> {
  const baseId = arxivId.replace(/v\d+$/, "");
  const url = `https://api.altmetric.com/v1/arxiv/${baseId}`;
  debug?.(`Proxying altmetric for ${baseId}`);
  let res: Response;
  try {
    res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug?.(`Network error: ${msg}`);
    throw new Error(`Network error while requesting Altmetric: ${msg}`);
  }
  debug?.(`Status ${res.status}`);

  const toInt = (v: string | null) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isNaN(n) ? undefined : n;
  };

  const rate: RateLimitInfo = {
    hourlyLimit:
      toInt(res.headers.get("X-HourlyRateLimit-Limit")) ??
      toInt(res.headers.get("X-RateLimit-Limit")),
    hourlyRemaining:
      toInt(res.headers.get("X-HourlyRateLimit-Remaining")) ??
      toInt(res.headers.get("X-RateLimit-Remaining")),
    dailyLimit: toInt(res.headers.get("X-DailyRateLimit-Limit")),
    dailyRemaining: toInt(res.headers.get("X-DailyRateLimit-Remaining")),
  };

  if (res.status === 429) {
    const retryAfter = toInt(res.headers.get("Retry-After"));
    debug?.(`Rate limited. Retry after ${retryAfter ?? 0}s`);
    return { counts: null, rate, status: 429, retryAfterSec: retryAfter };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    debug?.(`Non-OK status ${res.status}: ${body.slice(0, 200)}`);
    return { counts: null, rate, status: res.status };
  }

  let data: AltmetricApiData;
  try {
    data = (await res.json()) as AltmetricApiData;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug?.(`JSON parse error: ${msg}`);
    throw new Error(`Failed to parse Altmetric JSON: ${msg}`);
  }
  const counts: AltmetricCounts = {
    cited_by_tweeters_count: data.cited_by_tweeters_count ?? 0,
    cited_by_rdts_count: data.cited_by_rdts_count ?? 0,
    cited_by_wikipedia_count: data.cited_by_wikipedia_count ?? 0,
    cited_by_accounts_count: data.cited_by_accounts_count ?? 0,
    cited_by_posts_count: data.cited_by_posts_count ?? 0,
  };
  return { counts, rate, status: res.status };
}
