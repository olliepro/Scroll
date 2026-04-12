export function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function extractArxivIdFromAbsUrl(absUrl: string): string | null {
  const m = absUrl.match(
    /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(v\d+)?)|arxiv\.org\/abs\/(\w+\/\d+(v\d+)?)/
  );
  if (!m) return null;
  return (m[1] || m[3] || "").trim();
}

export function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Splits a user-provided keyword string into normalized query tokens.
 *
 * @param value - Raw keyword input from the editor UI.
 * @returns Individual keywords or quoted phrases with surrounding whitespace removed.
 *
 * @example
 * tokenizeKeywords('LLM, RL, "policy gradient"');
 */
export function tokenizeKeywords(s: string): string[] {
  if (!s) return [];
  if (s.includes(",")) {
    return s
      .split(",")
      .map((token) => token.replace(/^"(.*)"$/, "$1").trim())
      .filter(Boolean);
  }
  const cleaned = s.replace(/,+/g, " ").trim();
  const matches = cleaned.match(/"[^"]+"|\S+/g) || [];
  return matches
    .map((t) => t.replace(/^"(.*)"$/, "$1").trim())
    .filter(Boolean);
}

/**
 * Normalizes keyword input into a comma-separated string with trimmed spacing.
 *
 * @param value - Raw text entered into the keyword field.
 * @returns A canonical comma-separated keyword string.
 *
 * @example
 * normalizeKeywordString("LLM , RL,   policy gradient");
 */
export function normalizeKeywordString(value: string): string {
  return tokenizeKeywords(value).join(", ");
}

import katex from "katex";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderLaTeX(text: string): string {
  const parts = text.split(/\$(.+?)\$/g);
  return parts
    .map((part, i) =>
      i % 2 === 1
        ? katex.renderToString(part, { throwOnError: false })
        : escapeHtml(part)
    )
    .join("");
}
