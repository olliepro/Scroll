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

// --- Keyword tokenizing (commas/spaces; supports "quoted phrases") ---
export function tokenizeKeywords(s: string): string[] {
  if (!s) return [];
  const cleaned = s.replace(/,+/g, " ").trim();
  const matches = cleaned.match(/"[^"]+"|\S+/g) || [];
  return matches
    .map((t) => t.replace(/^"(.*)"$/, "$1").trim())
    .filter(Boolean);
}
