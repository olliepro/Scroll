import type { AltmetricCounts, RateLimitInfo } from "../types";

export async function fetchAltmetric(
  arxivId: string
): Promise<{
  counts: AltmetricCounts | null;
  rate: RateLimitInfo;
  status: number;
  retryAfterSec?: number;
}> {
  const baseId = arxivId.replace(/v\d+$/, "");
  const url = `https://api.altmetric.com/v1/arxiv/${baseId}`;
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
    headers: { Accept: "application/json" },
  });

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
    return { counts: null, rate, status: 429, retryAfterSec: retryAfter };
    }

  if (!res.ok) return { counts: null, rate, status: res.status };

  const data = await res.json();
  const counts: AltmetricCounts = {
    cited_by_tweeters_count: data.cited_by_tweeters_count,
    cited_by_rdts_count: data.cited_by_rdts_count,
    cited_by_wikipedia_count: data.cited_by_wikipedia_count,
    cited_by_accounts_count: data.cited_by_accounts_count,
    cited_by_posts_count: data.cited_by_posts_count,
  };
  return { counts, rate, status: res.status };
}
