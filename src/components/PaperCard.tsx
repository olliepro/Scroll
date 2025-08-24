import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileDown, Heart, X } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { FaRedditAlien, FaWikipediaW } from "react-icons/fa";
import type { AltmetricCounts, ArxivEntry, OrgInfo } from "../types";
import { clsx, formatDateShort, renderLaTeX } from "../lib/utils";
import { MetricChip } from "./MetricChip";

export function PaperCard({
  entry,
  index,
  saved,
  onToggleSave,
  altCounts,
  altStatus,
  status,
  onMarkRead,
  orgs,
  onFullChange,
}: {
  entry: ArxivEntry;
  index: number;
  saved: boolean;
  onToggleSave: () => void;
  altCounts: AltmetricCounts | null | undefined;
  altStatus: number | undefined;
  status: "unviewed" | "viewed" | "read";
  onMarkRead: () => void;
  orgs?: OrgInfo[];
  onFullChange?: (open: boolean) => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const statusSymbol =
    status === "read" ? "✔" : status === "viewed" ? "●" : "○";
  const paraRef = useRef<HTMLParagraphElement | null>(null);
  const seeMoreRef = useRef<HTMLButtonElement | null>(null);
  const metricsRef = useRef<HTMLDivElement | null>(null);
  const [lineClamp, setLineClamp] = useState(14);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const orgIcons = orgs?.filter((o) => o.favicon) ?? [];
  const shouldCollapse = !!orgs && orgs.length > 2;
  const orgExtra = shouldCollapse
    ? orgs.length - (orgIcons.length > 0 ? Math.min(5, orgIcons.length) : 1)
    : 0;

  useEffect(() => {
    function calcClamp() {
      const p = paraRef.current;
      if (!p) return;
      const parent = p.parentElement;
      if (!parent) return;
      const metricsHeight = metricsRef.current?.offsetHeight ?? 0;
      const buttonHeight = seeMoreRef.current?.offsetHeight ?? 0;
      const available =
        parent.clientHeight - p.offsetTop - metricsHeight - buttonHeight - 16;
      const lh = parseFloat(getComputedStyle(p).lineHeight || "16");
      if (lh > 0) setLineClamp(Math.max(3, Math.floor(available / lh)));
    }
    calcClamp();
    window.addEventListener("resize", calcClamp);
    return () => window.removeEventListener("resize", calcClamp);
  }, [entry.summary]);

  useEffect(() => {
    onFullChange?.(showFull);
  }, [showFull, onFullChange]);
  return (
    <>
      <section
        data-card="true"
        data-index={index}
        className="w-full snap-start relative select-none"
        style={{ height: "calc(var(--vh, 1vh) * 100 - 124px)" }}
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
            <div className="flex items-center gap-2">
              <span
                title={status}
                className={clsx(
                  "text-xs",
                  status === "unviewed" && "text-zinc-500",
                  status === "viewed" && "text-sky-400",
                  status === "read" && "text-emerald-400"
                )}
              >
                {statusSymbol}
              </span>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                {formatDateShort(entry.published)}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a
                href={entry.link}
                target="_blank"
                rel="noreferrer"
                onClick={onMarkRead}
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
                  onClick={onMarkRead}
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
          <div className="px-4 pt-4 pb-1 flex-1 overflow-hidden">
            <h2
              className="text-xl sm:text-2xl font-semibold leading-snug text-white"
              dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.title) }}
            />
            <div className="mt-1 text-sm text-zinc-400">
              {entry.authors.slice(0, 6).join(", ")}
              {entry.authors.length > 6 && " et al."}
            </div>
            {/* Organizations */}
            {orgs && orgs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shouldCollapse ? (
                  orgsOpen ? (
                    <>
                      {orgs.map((o) =>
                        o.domain ? (
                          <a
                            key={o.name}
                            href={`https://${o.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1"
                          >
                            {o.favicon && (
                              <img
                                src={o.favicon}
                                alt=""
                                className="h-3.5 w-3.5 rounded-sm"
                              />
                            )}
                            {o.name}
                          </a>
                        ) : (
                          <span
                            key={o.name}
                            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1"
                          >
                            {o.favicon && (
                              <img
                                src={o.favicon}
                                alt=""
                                className="h-3.5 w-3.5 rounded-sm"
                              />
                            )}
                            {o.name}
                          </span>
                        ),
                      )}
                      <button
                        onClick={() => setOrgsOpen(false)}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setOrgsOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1"
                    >
                      {orgIcons.length > 0 ? (
                        orgIcons.slice(0, 5).map((o) => (
                          <img
                            key={o.name}
                            src={o.favicon!}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm"
                          />
                        ))
                      ) : (
                        <span className="text-[11px] text-zinc-300">
                          {orgs[0].name}
                        </span>
                      )}
                      {orgExtra > 0 && (
                        <span className="text-[11px] text-zinc-300">+{orgExtra}</span>
                      )}
                    </button>
                  )
                ) : (
                  orgs.map((o) =>
                    o.domain ? (
                      <a
                        key={o.name}
                        href={`https://${o.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1"
                      >
                        {o.favicon && (
                          <img
                            src={o.favicon}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm"
                          />
                        )}
                        {o.name}
                      </a>
                    ) : (
                      <span
                        key={o.name}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1"
                      >
                        {o.favicon && (
                          <img
                            src={o.favicon}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm"
                          />
                        )}
                        {o.name}
                      </span>
                    ),
                  )
                )}
              </div>
            )}
            {/* Abstract */}
            <p
              ref={paraRef}
              className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: lineClamp,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.summary) }}
            />
            <button
              ref={seeMoreRef}
              onClick={() => {
                setShowFull(true);
                onMarkRead();
              }}
              className="mt-2 text-xs text-fuchsia-300 hover:underline"
            >
              See more
            </button>
          </div>

          {/* Bottom metrics bar */}
          <div
            ref={metricsRef}
            className="mt-auto p-2 sm:p-3 border-t border-white/5 bg-gradient-to-r from-black/40 via-slate-900/40 to-black/40 backdrop-blur"
          >
            <div className="flex items-center gap-3">
              {altCounts?.cited_by_tweeters_count &&
                altCounts.cited_by_tweeters_count > 1 && (
                  <MetricChip
                    icon={<FaXTwitter className="h-4 w-4" />}
                    label="X"
                    value={altCounts.cited_by_tweeters_count}
                  />
                )}
              {altCounts?.cited_by_rdts_count &&
                altCounts.cited_by_rdts_count > 1 && (
                  <MetricChip
                    icon={<FaRedditAlien className="h-4 w-4" />}
                    label="Reddit"
                    value={altCounts.cited_by_rdts_count}
                  />
                )}
              {altCounts?.cited_by_wikipedia_count &&
                altCounts.cited_by_wikipedia_count > 1 && (
                  <MetricChip
                    icon={<FaWikipediaW className="h-4 w-4" />}
                    label="Wikipedia"
                    value={altCounts.cited_by_wikipedia_count}
                  />
                )}
              <div className="ml-auto text-[11px] text-zinc-400">
                {altStatus === 404 ? (
                  <span className="opacity-60">No Social Metrics Yet</span>
                ) : typeof altCounts?.cited_by_accounts_count === "number" ||
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
    {showFull && (
      <div
        className="fixed inset-0 z-50 bg-black/60 flex justify-end overflow-hidden"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="w-full max-w-md bg-slate-950 p-6 overflow-y-auto"
          style={{ height: "calc(var(--vh, 1vh) * 100)" }}
        >
          <button
            className="mb-4 ml-auto rounded-md p-1 hover:bg-white/10"
            onClick={() => setShowFull(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <h2
            className="text-xl font-semibold text-white mb-3"
            dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.title) }}
          />
          <div
            className="text-sm text-zinc-300 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.summary) }}
          />
        </motion.div>
      </div>
    )}
  </>
  );
}
