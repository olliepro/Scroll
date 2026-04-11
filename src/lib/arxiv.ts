import type { Channel, ArxivEntry } from "../types";
import { fetchArxivResource } from "./arxivProxy";
import { extractArxivIdFromAbsUrl, tokenizeKeywords } from "./utils";

function buildArxivQuery(ch: Channel) {
  const catClause = ch.categories?.length
    ? `(${ch.categories.map((c) => `cat:${c}`).join(" OR ")})`
    : "";

  const kws = tokenizeKeywords(ch.keywords);
  const kwClause = kws.length
    ? `(${kws
        .map((k) => (k.includes(" ") ? `all:"${k}"` : `all:${k}`))
        .join(" AND ")})`
    : "";

  const authorClause = ch.author?.trim()
    ? `(au:"${ch.author.trim()}")`
    : "";

  const raw =
    [catClause, kwClause, authorClause].filter(Boolean).join(" AND ") ||
    `all:"machine learning"`;

  const params = new URLSearchParams({
    search_query: raw,
    start: "0",
    max_results: String(ch.maxResults ?? 40),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  return `https://export.arxiv.org/api/query?${params.toString()}`;
}

/**
 * Reads the DOI from an arXiv Atom entry when it is present.
 *
 * @param entry - XML entry node from the arXiv Atom feed.
 * @returns The normalized DOI string, or undefined when the entry has no DOI.
 *
 * @example
 * const doi = extractDoi(entry);
 */
function extractDoi(entry: Element): string | undefined {
  const doiText =
    entry.getElementsByTagName("arxiv:doi")[0]?.textContent ??
    entry.getElementsByTagNameNS("*", "doi")[0]?.textContent ??
    "";
  const doi = doiText.trim().replace(/^https?:\/\/doi\.org\//i, "");
  return doi || undefined;
}

function parseArxivFeed(text: string): ArxivEntry[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const entries = Array.from(xml.getElementsByTagName("entry"));

  return entries.map((e) => {
    const id = e.getElementsByTagName("id")[0]?.textContent || "";
    const arxivId = extractArxivIdFromAbsUrl(id) || id;
    const title =
      (e.getElementsByTagName("title")[0]?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    const summary =
      (e.getElementsByTagName("summary")[0]?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    const authors = Array.from(e.getElementsByTagName("author")).map(
      (a) => a.getElementsByTagName("name")[0]?.textContent || ""
    );
    const published = e.getElementsByTagName("published")[0]?.textContent || "";
    const linkEl = Array.from(e.getElementsByTagName("link")).find(
      (l) => l.getAttribute("type") === "text/html"
    );
    const pdfEl = Array.from(e.getElementsByTagName("link")).find(
      (l) => l.getAttribute("type") === "application/pdf"
    );
    const categories = Array.from(e.getElementsByTagName("category")).map(
      (c) => c.getAttribute("term") || ""
    );

    return {
      id,
      arxivId,
      doi: extractDoi(e),
      title,
      summary,
      authors,
      link: linkEl?.getAttribute("href") || id,
      pdfUrl: pdfEl?.getAttribute("href") || undefined,
      published,
      categories,
    };
  });
}

async function fetchArxivFeedXml(url: string): Promise<string> {
  const res = await fetchArxivResource(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch arXiv feed: ${res.status}`);
  }
  return res.text();
}

export async function fetchArxiv(channel: Channel): Promise<ArxivEntry[]> {
  const url = buildArxivQuery(channel);
  const text = await fetchArxivFeedXml(url);
  return parseArxivFeed(text);
}

export async function searchArxiv(
  query: string,
  maxResults = 5
): Promise<ArxivEntry[]> {
  const trimmed = query
    .trim()
    .replace(/^arXiv:/i, "")
    .replace(/^https?:\/\/(?:www\.)?arxiv\.org\/abs\//i, "")
    .replace(/^https?:\/\/doi\.org\//i, "");

  const isDoi = /^10\.\d{4,9}\/\S+$/i.test(trimmed);
  const isArxivId =
    /^\d{4}\.\d{4,5}(v\d+)?$/i.test(trimmed) ||
    /^[a-z-]+\/\d{7}(v\d+)?$/i.test(trimmed);

  const clause = isDoi
    ? `doi:"${trimmed}"`
    : isArxivId
      ? `id:${trimmed}`
      : `ti:${trimmed.replace(/[()]/g, "")}`;

  const params = new URLSearchParams({
    search_query: clause,
    start: "0",
    max_results: String(maxResults),
    sortBy: isArxivId ? "submittedDate" : "relevance",
    sortOrder: "descending",
  });

  const text = await fetchArxivFeedXml(
    `https://export.arxiv.org/api/query?${params.toString()}`,
  );
  return parseArxivFeed(text);
}
