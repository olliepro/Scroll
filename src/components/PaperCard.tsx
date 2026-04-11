import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileDown, Heart, X } from "lucide-react";
import type { ArxivEntry, OrgInfo } from "../types";
import { clsx, formatDateShort, renderLaTeX } from "../lib/utils";
import { AltmetricBadge } from "./AltmetricBadge";

/**
 * Builds the canonical DOI that arXiv exposes in the "Cite as" field.
 *
 * @param entry - Paper metadata from the arXiv feed.
 * @returns The feed DOI when present, otherwise the versionless arXiv DOI.
 *
 * @example
 * const altmetricDoi = getAltmetricDoi(entry);
 */
function getAltmetricDoi(entry: ArxivEntry): string {
  return entry.doi ?? `10.48550/arXiv.${entry.arxivId.replace(/v\d+$/i, "")}`;
}

export function PaperCard({
  entry,
  index,
  saved,
  onToggleSave,
  status,
  onMarkRead,
  orgs,
}: {
  entry: ArxivEntry;
  index: number;
  saved: boolean;
  onToggleSave: () => void;
  status: "unviewed" | "viewed" | "read";
  onMarkRead: () => void;
  orgs?: OrgInfo[];
}) {
  const [showFull, setShowFull] = useState(false);
  const statusSymbol =
    status === "read" ? "✔" : status === "viewed" ? "●" : "○";
  const paraRef = useRef<HTMLParagraphElement | null>(null);
  const [lineClamp, setLineClamp] = useState(14);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const altmetricDoi = getAltmetricDoi(entry);
  const orgIcons = orgs?.filter((o) => o.favicon) ?? [];
  const shouldCollapse = !!orgs && orgs.length > 2;
  const orgExtra = shouldCollapse
    ? orgs.length - (orgIcons.length > 0 ? Math.min(5, orgIcons.length) : 1)
    : 0;
  const seeMoreRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function calcClamp() {
      const p = paraRef.current;
      if (!p) return;
      const parent = p.parentElement;
      if (!parent) return;
      const seeMore = seeMoreRef.current;
      const reserve = (seeMore?.offsetHeight || 0) + 4;
      const available = parent.clientHeight - p.offsetTop - reserve;
      const lh = parseFloat(getComputedStyle(p).lineHeight || "16");
      if (lh > 0) setLineClamp(Math.max(3, Math.floor(available / lh)));
    }
    calcClamp();
    window.addEventListener("resize", calcClamp);
    return () => window.removeEventListener("resize", calcClamp);
  }, [entry.summary, orgsOpen]);

  useEffect(() => {
    if (showFull) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFull]);
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
            className="relative h-full w-full max-w-sm sm:max-w-md rounded-3xl border border-white/10 overflow-hidden flex flex-col bg-gradient-to-b from-[#1a2334] via-[#121722] to-[#0b0d12] shadow-[0_0_30px_rgba(0,0,0,0.4)] [transform:translateZ(0)] [backface-visibility:hidden]">
          {/* Header row */}
          <div className="p-3 sm:p-4 flex items-center gap-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span
                title={status}
                className={clsx(
                  "text-xs",
                  status === "unviewed" && "text-slate-500",
                  status === "viewed" && "text-blue-300",
                  status === "read" && "text-rose-300"
                )}
              >
                {statusSymbol}
              </span>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
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
                    ? "bg-rose-500/20 border-rose-400 text-rose-100"
                    : "bg-white/5 hover:bg-white/10 border-white/10"
                )}
              >
                {saved ? (
                  <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                ) : (
                  <Heart className="h-3.5 w-3.5" />
                )}
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* Title + Authors */}
          <div className="px-4 pt-4 pb-0 flex-1 overflow-hidden">
            <h2
              className="text-xl sm:text-2xl font-semibold leading-snug text-white"
              dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.title) }}
            />
            <div className="mt-1 text-sm text-slate-400">
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
                            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1"
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
                            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1"
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
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300"
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
                        <span className="text-[11px] text-slate-300">
                          {orgs[0].name}
                        </span>
                      )}
                      {orgExtra > 0 && (
                        <span className="text-[11px] text-slate-300">+{orgExtra}</span>
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
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1"
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
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1"
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
              className="mt-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
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
              className="mt-0.5 text-xs text-rose-200 hover:underline"
            >
              See more
            </button>
          </div>

          {/* Bottom metrics bar */}
          <div className="mt-auto p-2 sm:p-3 border-t border-white/5 bg-gradient-to-r from-[#0b0d12]/95 via-[#151c2c]/95 to-[#0b0d12]/95">
            <div className="flex min-h-8 items-center justify-between gap-3">
              <AltmetricBadge doi={altmetricDoi} />
              <span className="ml-auto text-[11px] text-slate-500">
                DOI {altmetricDoi}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
    {showFull && (
      <div
        className="fixed inset-0 z-50 bg-black/60 flex justify-end overflow-hidden"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}
        onWheel={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="w-full max-w-md bg-[#0f1320] p-6 overflow-y-auto"
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
            className="text-sm text-slate-300 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.summary) }}
          />
        </motion.div>
      </div>
    )}
  </>
  );
}
