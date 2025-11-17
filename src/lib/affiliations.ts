import type { OrgInfo } from "../types";
import { buildArxivRequestUrlFromAbsolute } from "./arxivProxy";

const ABSTRACT_MARKERS = [
  ">abstract<",
  ">abstract.<",
  'id="abstract"',
  'class="ltx_abstract"',
  "###### abstract",
].map((s) => s.toLowerCase());

const DEFAULT_MAX_BYTES = 262_144;

function foundAbstract(buf: Uint8Array): boolean {
  const text = new TextDecoder().decode(buf).toLowerCase();
  return ABSTRACT_MARKERS.some((m) => text.includes(m));
}

function stripTags(html: string): string {
  let cleaned = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  const div = document.createElement("div");
  div.innerHTML = cleaned;
  const text = div.textContent || "";
  return text.replace(/\s+/g, " ").trim();
}

export async function fetchAuthorTextFromArxivHtml(
  url: string,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<string> {
  const proxiedUrl = buildArxivRequestUrlFromAbsolute(url);
  const res = await fetch(proxiedUrl);
  let prefix: string;
  const reader = res.body?.getReader();
  if (reader) {
    let buf = new Uint8Array(0);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const newBuf = new Uint8Array(buf.length + value.length);
        newBuf.set(buf);
        newBuf.set(value, buf.length);
        buf = newBuf;
        if (foundAbstract(buf) || buf.length >= maxBytes) {
          break;
        }
      }
    }
    prefix = new TextDecoder("utf-8").decode(buf);
  } else {
    const text = await res.text();
    prefix = text.slice(0, maxBytes);
  }
  const endTitle = prefix.match(/<\/h1\s*>/i);
  if (!endTitle || endTitle.index === undefined) return "";
  const start = endTitle.index + endTitle[0].length;
  const abstractStarts: number[] = [];
  for (const pat of [
    />\s*Abstract\s*</i,
    />\s*Abstract\.\s*</i,
    /id\s*=\s*"abstract"/i,
    /class\s*=\s*"[^"]*ltx_abstract[^"]*"/i,
    /######\s*Abstract/i,
  ]) {
    const m = pat.exec(prefix);
    if (m && m.index !== undefined) abstractStarts.push(m.index);
  }
  if (abstractStarts.length === 0) return "";
  const stop = Math.min(...abstractStarts);
  const authorHtml = prefix.slice(start, stop);
  return stripTags(authorHtml);
}

const ORG_SCHEMA = {
  name: "paper_affiliations",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      organizations: {
        type: "array",
        items: { type: "string" },
        description:
          "Unique list of university/company/lab/institute/organization names affiliated with the paper.",
        minItems: 0,
      },
    },
    required: ["organizations"],
  },
  strict: true,
} as const;

const SYS_INSTRUCTIONS =
  "Extract only the names of organizations that authors are affiliated with. " +
  "Return canonical institution names only (e.g., 'Stanford', 'Google DeepMind', 'MIT'). " +
  "Rules: (1) Deduplicate; (2) Drop departments, schools, cities, countries, postal codes, 'team' names, etc; " +
  "(3) Prefer the parent organization (e.g., 'Harvard University' over 'School of Engineering'); " +
  "(4) Drop email addresses and footnote markers; (5) For uber well-known orgs, you can use the short name or acronym (e.g. 'UC Berkeley', 'MIT', 'Standford'";

export async function extractOrgsWithOpenAI(
  authorBlockText: string,
  apiKey: string,
  model = "gpt-5-nano",
): Promise<string[]> {
  if (!authorBlockText.trim()) return [];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      reasoning_effort: "minimal",
      verbosity: "low",
      messages: [
        { role: "system", content: SYS_INSTRUCTIONS },
        {
          role: "user",
          content:
            "Author/Affiliation Block from arXiv HTML (between title and abstract).\n\n" +
            authorBlockText,
        },
      ],
      response_format: { type: "json_schema", json_schema: ORG_SCHEMA },
    }),
  });
  if (!res.ok) throw new Error("OpenAI API error");
  const data = await res.json();
  const message = data.choices?.[0]?.message?.content;
  let parsed: { organizations?: unknown } = {};
  try {
    parsed = message ? JSON.parse(message) : {};
  } catch {
    parsed = {};
  }
  const orgs = Array.isArray(parsed.organizations)
    ? (parsed.organizations as unknown[])
    : [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const o of orgs) {
    if (typeof o !== "string") continue;
    let name = o.replace(/\s+/g, " ").trim();
    name = name.replace(/[\s,;:/-]+$/, "");
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      cleaned.push(name);
    }
  }
  return cleaned;
}

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

interface WikidataClaim {
  mainsnak?: { datavalue?: { value?: unknown } };
}

interface WikidataEntity {
  claims?: Record<string, WikidataClaim[]>;
}

async function wikidataQidForLabel(name: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: name.trim(),
    language: "en",
    type: "item",
    limit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${WIKIDATA_API}?${params.toString()}`);
  if (!res.ok) return null;
  const hits = (await res.json()).search || [];
  return hits[0]?.id || null;
}

async function wikidataEntity(qid: string): Promise<WikidataEntity> {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${WIKIDATA_API}?${params.toString()}`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.entities?.[qid] || {};
}

function firstClaimValue(entity: WikidataEntity, prop: string) {
  const claims = entity.claims?.[prop] || [];
  if (!claims.length) return null;
  const mainsnak = claims[0].mainsnak || {};
  const datavalue = mainsnak.datavalue || {};
  return datavalue.value;
}

function domainFromP856(entity: WikidataEntity): string | null {
  const val = firstClaimValue(entity, "P856");
  const url =
    typeof val === "string" ? val : (val as { url?: string } | null)?.url;
  if (!url) return null;
  let netloc = new URL(url).host.toLowerCase();
  if (netloc.startsWith("www.")) netloc = netloc.slice(4);
  return netloc;
}

export function faviconUrlForDomain(domain: string, size = 128): string {
  let d = domain.toLowerCase();
  if (d.startsWith("www.")) d = d.slice(4);
  return `https://www.google.com/s2/favicons?domain=${d}&sz=${size}`;
}

const DEFAULT_FAVICON_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACiElEQVQ4EaVTzU8TURCf2tJuS7tQtlRb6UKBIkQwkRRSEzkQgyEc6lkOKgcOph78Y+CgjXjDs2i44FXY9AMTlQRUELZapVlouy3d7kKtb0Zr0MSLTvL2zb75eL838xtTvV6H/xELBptMJojeXLCXyobnyog4YhzXYvmCFi6qVSfaeRdXdrfaU1areV5KykmX06rcvzumjY/1ggkR3Jh+bNf1mr8v1D5bLuvR3qDgFbvbBJYIrE1mCIoCrKxsHuzK+Rzvsi29+6DEbTZz9unijEYI8ObBgXOzlcrx9OAlXyDYKUCzwwrDQx1wVDGg089Dt+gR3mxmhcUnaWeoxwMbm/vzDFzmDEKMMNhquRqduT1KwXiGt0vre6iSeAUHNDE0d26NBtAXY9BACQyjFusKuL2Ry+IPb/Y9ZglwuVscdHaknUChqLF/O4jn3V5dP4mhgRJgwSYm+gV0Oi3XrvYB30yvhGa7BS70eGFHPoTJyQHhMK+F0ZesRVVznvXw5Ixv7/C10moEo6OZXbWvlFAF9FVZDOqEABUMRIkMd8GnLwVWg9/RkJF9sA4oDfYQAuzzjqzwvnaRUFxn/X2ZlmGLXAE7AL52B4xHgqAUqrC1nSNuoJkQtLkdqReszz/9aRvq90NOKdOS1nch8TpL555WDp49f3uAMXhACRjD5j4ykuCtf5PP7Fm1b0DIsl/VHGezzP1KwOiZQobFF9YyjSRYQETRENSlVzI8iK9mWlzckpSSCQHVALmN9Az1euDho9Xo8vKGd2rqooA8yBcrwHgCqYR0kMkWci08t/R+W4ljDCanWTg9TJGwGNaNk3vYZ7VUdeKsYJGFNkfSzjXNrSX20s4/h6kB81/271ghG17l+rPTAAAAAElFTkSuQmCC";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function orgToFavicon(name: string, size = 128): Promise<OrgInfo> {
  const qid = await wikidataQidForLabel(name);
  const entity: WikidataEntity = qid ? await wikidataEntity(qid) : {};
  const domain = domainFromP856(entity);
  let favicon = domain ? faviconUrlForDomain(domain, size) : null;
  if (favicon) {
    try {
      const res = await fetch(favicon);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        if (b64 === DEFAULT_FAVICON_B64) favicon = null;
      }
    } catch {
      // ignore errors
    }
  }
  return { name, domain, favicon };
}

export async function faviconsForArxivUrl(
  url: string,
  apiKey: string,
  size = 128,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<OrgInfo[]> {
  const authorText = await fetchAuthorTextFromArxivHtml(url, maxBytes);
  const orgNames = await extractOrgsWithOpenAI(authorText, apiKey);
  const results = await Promise.all(orgNames.map((o) => orgToFavicon(o, size)));
  return results;
}
