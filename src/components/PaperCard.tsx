import { motion } from "framer-motion";
import { ExternalLink, FileDown, Heart } from "lucide-react";
import type { AltmetricCounts, ArxivEntry } from "../types";
import { CATEGORY_LABELS } from "../constants";
import { clsx, formatDateShort, renderLaTeX } from "../lib/utils";
import { MetricChip } from "./MetricChip";
import { XIcon, RedditIcon, WikipediaIcon } from "./icons/BrandIcons";

export function PaperCard({
  entry,
  index,
  saved,
  onToggleSave,
  altCounts,
}: {
  entry: ArxivEntry;
  index: number;
  saved: boolean;
  onToggleSave: () => void;
  altCounts: AltmetricCounts | null | undefined;
}) {
  return (
    <section
      data-card="true"
      data-index={index}
      className="h-[calc(100vh-88px-36px)] w-full snap-start relative select-none"
    >
      <div className="absolute inset-0 p-3 sm:p-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="relative h-full w-full max-w-sm sm:max-w-md rounded-3xl border border-white/10 overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.4)]">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900/40 via-slate-900/80 to-slate-950" />
          {/* Header row */}
          <div className="p-3 sm:p-4 flex items-center gap-2 border-b border-white/5">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">
              {formatDateShort(entry.published)}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a
                href={entry.link}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              {entry.pdfUrl && (
                <a
                  href={entry.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </a>
              )}
              <button
                onClick={onToggleSave}
                className={clsx(
                  "px-2 py-1 text-xs rounded-full border flex items-center gap-1",
                  saved
                    ? "bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-200"
                    : "bg-white/5 hover:bg-white/10 border-white/10"
                )}
              >
                {saved ? (
                  <Heart className="h-3.5 w-3.5 fill-fuchsia-500 text-fuchsia-500" />
                ) : (
                  <Heart className="h-3.5 w-3.5" />
                )}
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* Title + Authors */}
          <div className="px-4 pt-4 pb-2 overflow-y-auto no-scrollbar">
            <h2
              className="text-xl sm:text-2xl font-semibold leading-snug text-white"
              dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.title) }}
            />
            <div className="mt-1 text-sm text-zinc-400">
              {entry.authors.slice(0, 6).join(", ")}
              {entry.authors.length > 6 && " et al."}
            </div>
            {/* Categories */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.categories.slice(0, 6).map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300"
                >
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
            {/* Abstract */}
            <p
              className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap"
              style={{
                WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
                maskImage: "linear-gradient(180deg, #000 80%, transparent)",
              }}
              dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.summary) }}
            />
          </div>

          {/* Bottom metrics bar */}
          <div className="mt-auto p-3 sm:p-4 border-t border-white/5 bg-gradient-to-r from-black/40 via-slate-900/40 to-black/40 backdrop-blur">
            <div className="flex items-center gap-3">
              {altCounts?.cited_by_tweeters_count &&
                altCounts.cited_by_tweeters_count > 1 && (
                  <MetricChip
                    icon={<XIcon className="h-4 w-4" />}
                    label="X"
                    value={altCounts.cited_by_tweeters_count}
                  />
                )}
              {altCounts?.cited_by_rdts_count &&
                altCounts.cited_by_rdts_count > 1 && (
                  <MetricChip
                    icon={<RedditIcon className="h-4 w-4" />}
                    label="Reddit"
                    value={altCounts.cited_by_rdts_count}
                  />
                )}
              {altCounts?.cited_by_wikipedia_count &&
                altCounts.cited_by_wikipedia_count > 1 && (
                  <MetricChip
                    icon={<WikipediaIcon className="h-4 w-4" />}
                    label="Wikipedia"
                    value={altCounts.cited_by_wikipedia_count}
                  />
                )}
              <div className="ml-auto text-[11px] text-zinc-400">
                {typeof altCounts?.cited_by_accounts_count === "number" ||
                typeof altCounts?.cited_by_posts_count === "number" ? (
                  <span>
                    {altCounts?.cited_by_accounts_count ?? "—"} accounts •{" "}
                    {altCounts?.cited_by_posts_count ?? "—"} posts
                  </span>
                ) : (
                  <span className="opacity-60">Altmetric: fetching…</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
