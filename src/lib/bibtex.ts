import type { ArxivEntry, SavedList } from "../types";

const TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "using",
  "via",
  "with",
  "without",
]);

/**
 * Removes the arXiv version suffix from a paper identifier.
 *
 * @param arxivId - arXiv identifier that may include a version suffix.
 * @returns The versionless arXiv identifier.
 *
 * @example
 * const versionlessId = toVersionlessArxivId("1706.03762v7");
 * // "1706.03762"
 */
function toVersionlessArxivId(arxivId: string): string {
  return arxivId.replace(/v\d+$/i, "");
}

/**
 * Escapes BibTeX-sensitive characters inside a field value.
 *
 * @param value - Raw field value from arXiv metadata.
 * @returns A BibTeX-safe value string.
 *
 * @example
 * const escapedTitle = escapeBibtexValue("Learning & Control");
 * // "Learning \\& Control"
 */
function escapeBibtexValue(value: string): string {
  const replacements: Record<string, string> = {
    "\\": "\\\\",
    "{": "\\{",
    "}": "\\}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
  };

  return value.replace(/[\\{}&%$#_~^]/g, (character) => replacements[character]);
}

/**
 * Normalizes a string into ASCII-ish lowercase tokens for BibTeX keys and filenames.
 *
 * @param value - Raw text to normalize.
 * @returns Lowercase alphanumeric tokens separated by single spaces.
 */
function normalizeAsciiTokens(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Builds the base citation key for a paper before duplicate suffix handling.
 *
 * @param entry - Paper metadata from the arXiv feed.
 * @returns A deterministic base citation key.
 *
 * @example
 * const citationKey = buildBibtexCitationKeyBase(entry);
 */
function buildBibtexCitationKeyBase(entry: ArxivEntry): string {
  const versionlessArxivId = toVersionlessArxivId(entry.arxivId);
  const firstAuthorName = entry.authors[0] ?? "";
  const authorTokens = normalizeAsciiTokens(firstAuthorName)
    .split(/\s+/)
    .filter(Boolean);
  const firstAuthorLastName = authorTokens.at(-1) ?? "";
  const publishedYear = entry.published.slice(0, 4);
  const titleToken = normalizeAsciiTokens(entry.title)
    .split(/\s+/)
    .find((token) => token && !TITLE_STOP_WORDS.has(token));

  if (!firstAuthorLastName || !publishedYear || !titleToken) {
    return normalizeAsciiTokens(versionlessArxivId).replace(/\s+/g, "") || "arxiv";
  }

  return `${firstAuthorLastName}${publishedYear}${titleToken}`;
}

/**
 * Formats one paper as a BibTeX `@misc` entry.
 *
 * @param entry - Paper metadata from the arXiv feed.
 * @param citationKey - Optional explicit citation key used for list-level collision handling.
 * @returns A single BibTeX entry string.
 *
 * @example
 * const bibtexEntry = buildBibtexEntry(entry);
 */
function formatBibtexEntry(entry: ArxivEntry, citationKey: string): string {
  const versionlessArxivId = toVersionlessArxivId(entry.arxivId);
  const fields = [
    `  title = {${escapeBibtexValue(entry.title)}}`,
    `  author = {${entry.authors.map(escapeBibtexValue).join(" and ")}}`,
    `  year = {${entry.published.slice(0, 4)}}`,
    `  eprint = {${versionlessArxivId}}`,
    "  archivePrefix = {arXiv}",
  ];

  if (entry.categories[0]) {
    fields.push(`  primaryClass = {${escapeBibtexValue(entry.categories[0])}}`);
  }

  fields.push(`  url = {https://arxiv.org/abs/${versionlessArxivId}}`);

  return `@misc{${citationKey},\n${fields.join(",\n")}\n}`;
}

/**
 * Builds unique citation keys for an ordered list of papers.
 *
 * @param entries - Papers that will be exported together.
 * @returns Citation keys in the same order as the provided papers.
 */
function buildUniqueCitationKeys(entries: ArxivEntry[]): string[] {
  const seenCounts = new Map<string, number>();

  return entries.map((entry) => {
    const baseCitationKey = buildBibtexCitationKeyBase(entry);
    const nextCount = (seenCounts.get(baseCitationKey) ?? 0) + 1;
    seenCounts.set(baseCitationKey, nextCount);
    return nextCount === 1 ? baseCitationKey : `${baseCitationKey}-${nextCount}`;
  });
}

/**
 * Formats one arXiv paper as a canonical BibTeX `@misc` entry.
 *
 * @param entry - Paper metadata from the arXiv feed.
 * @returns A single BibTeX entry string with a deterministic citation key.
 *
 * @example
 * const bibtexEntry = buildBibtexEntry(entry);
 */
export function buildBibtexEntry(entry: ArxivEntry): string {
  return formatBibtexEntry(entry, buildBibtexCitationKeyBase(entry));
}

/**
 * Formats every paper in a saved list as one BibTeX document.
 *
 * @param list - Saved list whose papers should be exported together.
 * @returns A `.bib` file body ending with a trailing newline.
 *
 * @example
 * const bibtexDocument = buildBibtexForList(list);
 */
export function buildBibtexForList(list: SavedList): string {
  const citationKeys = buildUniqueCitationKeys(list.papers);
  const entries = list.papers.map((entry, index) =>
    formatBibtexEntry(entry, citationKeys[index]),
  );

  return entries.length > 0 ? `${entries.join("\n\n")}\n` : "";
}
