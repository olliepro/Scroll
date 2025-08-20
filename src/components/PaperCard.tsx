import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileDown, Heart } from "lucide-react";
import type { AltmetricCounts, ArxivEntry } from "../types";
import { CATEGORY_LABELS } from "../constants";
import { clsx, formatDateShort } from "../lib/utils";
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
      <div className="absolute inset-0 p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="h-full w-full rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-lg overflow-hidden flex flex-col"
        >
          {/* Header row */}
          <div className="p-3 sm:p-4 flex items-center gap-2 border-b border-slate-200">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">
              {formatDateShort(entry.published)}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a
                href={entry.link}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              {entry.pdfUrl && (
                <a
                  href={entry.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1"
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
                    ? "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-300"
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
            <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-slate-900">
              {entry.title}
            </h2>
            <div className="mt-1 text-sm text-slate-600">
              {entry.authors.slice(0, 6).join(", ")}
              {entry.authors.length > 6 && " et al."}
            </div>
            {/* Categories */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.categories.slice(0, 6).map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 rounded-full bg-indigo-100 border border-indigo-200 text-[11px] text-indigo-700"
                >
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
            {/* Abstract */}
            <p
              className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
              style={{
                WebkitMaskImage: "linear-gradient(180deg, #000 80%, transparent)",
                maskImage: "linear-gradient(180deg, #000 80%, transparent)",
              }}
            >
              {entry.summary}
            </p>
          </div>

          {/* Bottom metrics bar */}
          <div className="mt-auto p-3 sm:p-4 border-t border-slate-200 bg-white/70 backdrop-blur">
            <div className="flex items-center gap-3">
              <MetricChip
                icon={<XIcon className="h-4 w-4" />}
                label="X"
                value={altCounts?.cited_by_tweeters_count}
              />
              <MetricChip
                icon={<RedditIcon className="h-4 w-4" />}
                label="Reddit"
                value={altCounts?.cited_by_rdts_count}
              />
              <MetricChip
                icon={<WikipediaIcon className="h-4 w-4" />}
                label="Wikipedia"
                value={altCounts?.cited_by_wikipedia_count}
              />
              <div className="ml-auto text-[11px] text-slate-600">
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
