import type { Channel, ArxivEntry } from "../types";
import { extractArxivIdFromAbsUrl, tokenizeKeywords } from "./utils";

function buildArxivQuery(ch: Channel) {
  const kws = tokenizeKeywords(ch.keywords);
  const kwClause = kws.length
    ? `(${kws
        .map((k) => (k.includes(" ") ? `all:"${k}"` : `all:${k}`))
        .join(" AND ")})`
    : "";

  const raw = kwClause || `all:"machine learning"`;

  const params = new URLSearchParams({
    search_query: raw,
    start: "0",
    max_results: String(ch.maxResults ?? 40),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  return `https://export.arxiv.org/api/query?${params.toString()}`;
}

export async function fetchArxiv(channel: Channel): Promise<ArxivEntry[]> {
  const url = buildArxivQuery(channel);
  const res = await fetch(url);
  const text = await res.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const entries = Array.from(xml.getElementsByTagName("entry"));

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

    return {
      id,
      arxivId,
      title,
      summary,
      authors,
      link: linkEl?.getAttribute("href") || id,
      pdfUrl: pdfEl?.getAttribute("href") || undefined,
      published,
    };
  });

  return out;
}
