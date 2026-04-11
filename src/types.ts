export interface Channel {
  id: string;
  name: string;
  keywords: string; // stored serialized; edited via chips input
  categories: string[];
  author?: string;
  maxResults?: number;
}

export interface ArxivEntry {
  id: string;
  arxivId: string;
  title: string;
  summary: string;
  authors: string[];
  pdfUrl?: string;
  link: string;
  published: string;
  categories: string[];
}

export interface OrgInfo {
  name: string;
  domain: string | null;
  favicon: string | null;
}

export interface AltmetricCounts {
  cited_by_tweeters_count?: number;
  cited_by_rdts_count?: number;
  cited_by_wikipedia_count?: number;
  cited_by_accounts_count?: number;
  cited_by_posts_count?: number;
}

export interface RateLimitInfo {
  hourlyLimit?: number;
  hourlyRemaining?: number;
  dailyLimit?: number;
  dailyRemaining?: number;
}

export interface SavedList {
  id: string;
  name: string;
  papers: ArxivEntry[];
}
