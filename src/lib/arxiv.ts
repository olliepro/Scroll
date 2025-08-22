import type { Channel, ArxivEntry } from "../types";
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

  const raw =
    [catClause, kwClause].filter(Boolean).join(" AND ") ||
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

export async function fetchArxiv(
  channel: Channel,
  debug?: (msg: string) => void
): Promise<ArxivEntry[]> {
  const url = buildArxivQuery(channel);
  debug?.(`Proxying to ${url}`);
  let res: Response;
  try {
    res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug?.(`Network error: ${msg}`);
    throw new Error(`Network error while requesting arXiv: ${msg}`);
  }

  debug?.(`Status ${res.status}`);
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug?.(`Read error: ${msg}`);
    throw new Error(`Failed to read arXiv response: ${msg}`);
  }
  debug?.(`Body length ${text.length}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || "<empty>"}`);
  }

  const parser = new DOMParser();
  let xml: Document;
  try {
    xml = parser.parseFromString(text, "application/xml");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug?.(`Parse error: ${msg}`);
    throw new Error(`Failed to parse arXiv XML: ${msg}`);
  }
  const entries = Array.from(xml.getElementsByTagName("entry"));
  debug?.(`Parsed ${entries.length} entries`);

  const out: ArxivEntry[] = entries.map((e) => {
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
      title,
      summary,
      authors,
      link: linkEl?.getAttribute("href") || id,
      pdfUrl: pdfEl?.getAttribute("href") || undefined,
      published,
      categories,
    };
  });

  return out;
}
