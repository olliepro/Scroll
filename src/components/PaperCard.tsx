import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileDown, Heart, X } from "lucide-react";
import type { ArxivEntry, OrgInfo } from "../types";
import { clsx, formatDateShort, renderLaTeX } from "../lib/utils";
import { AltmetricBadge } from "./AltmetricBadge";

const SEE_MORE_RESERVE_PX = 24;

/**
 * Builds the versionless arXiv identifier Altmetric's badge embed expects.
 *
 * @param entry - Paper metadata from the arXiv feed.
 * @returns The versionless arXiv identifier.
 *
 * @example
 * const altmetricArxivId = getAltmetricArxivId(entry);
 */
function getAltmetricArxivId(entry: ArxivEntry): string {
  return entry.arxivId.replace(/v\d+$/i, "");
}

/**
 * Checks whether the clamped abstract paragraph is visually truncated.
 *
 * @param paragraphElement - Rendered abstract paragraph element.
 * @returns Whether the paragraph content overflows its visible height.
 *
 * @example
 * const isTruncated = isClampedParagraphTruncated(paragraphElement);
 */
function isClampedParagraphTruncated(
  paragraphElement: HTMLParagraphElement,
): boolean {
  return paragraphElement.scrollHeight - paragraphElement.clientHeight > 1;
}

export function PaperCard({
  entry,
  index,
  mode = "deck",
  saved,
  onToggleSave,
  status,
  onMarkRead,
  orgs,
}: {
  entry: ArxivEntry;
  index: number;
  mode?: "deck" | "gallery";
  saved: boolean;
  onToggleSave: () => void;
  status: "unviewed" | "viewed" | "read";
  onMarkRead: () => void;
  orgs?: OrgInfo[];
}) {
  const isGallery = mode === "gallery";
  const [showFull, setShowFull] = useState(false);
  const statusSymbol =
    status === "read" ? "✔" : status === "viewed" ? "●" : "○";
  const paraRef = useRef<HTMLParagraphElement | null>(null);
  const [dynamicLineClamp, setDynamicLineClamp] = useState(14);
  const [showsSeeMore, setShowsSeeMore] = useState(false);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const altmetricArxivId = getAltmetricArxivId(entry);
  const orgIcons = orgs?.filter((o) => o.favicon) ?? [];
  const shouldCollapse = !!orgs && orgs.length > 2;
  const lineClamp = isGallery ? 2 : dynamicLineClamp;
  const orgExtra = shouldCollapse
    ? orgs.length - (orgIcons.length > 0 ? Math.min(5, orgIcons.length) : 1)
    : 0;

  useEffect(() => {
    if (isGallery) return;

    function calcClamp() {
      const p = paraRef.current;
      if (!p) return;
      const parent = p.parentElement;
      if (!parent) return;
      const available = parent.clientHeight - p.offsetTop - SEE_MORE_RESERVE_PX;
      const lh = parseFloat(getComputedStyle(p).lineHeight || "16");
      if (lh > 0) setDynamicLineClamp(Math.max(3, Math.floor(available / lh)));
    }

    calcClamp();
    window.addEventListener("resize", calcClamp);
    return () => window.removeEventListener("resize", calcClamp);
  }, [entry.summary, isGallery, orgsOpen]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const paragraphElement = paraRef.current;
      if (!paragraphElement) return;
      setShowsSeeMore(isClampedParagraphTruncated(paragraphElement));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [entry.summary, lineClamp, orgsOpen]);

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
        data-card={isGallery ? undefined : "true"}
        data-index={index}
        className={clsx(
          "w-full relative select-none",
          !isGallery && "snap-start",
        )}
        style={
          isGallery ? undefined : { height: "calc(var(--vh, 1vh) * 100 - 124px)" }
        }
      >
        <div
          className={clsx(
            isGallery
              ? "h-full w-full"
              : "absolute inset-0 flex justify-center p-3 sm:p-6",
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className={clsx(
              "relative w-full rounded-3xl border border-white/10 overflow-hidden flex flex-col bg-gradient-to-b from-[#1a2334] via-[#121722] to-[#0b0d12] shadow-[0_0_30px_rgba(0,0,0,0.4)] [transform:translateZ(0)] [backface-visibility:hidden]",
              isGallery ? "min-h-full" : "h-full max-w-sm sm:max-w-md",
            )}
          >
          {/* Header row */}
          <div
            className={clsx(
              "flex items-center gap-2 border-b border-white/5",
              isGallery ? "p-3" : "p-3 sm:p-4",
            )}
          >
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
          <div
            className={clsx(
              "px-4 pt-4 overflow-hidden",
              isGallery ? "pb-4" : "flex-1 pb-0",
            )}
          >
            <h2
              className={clsx(
                "font-semibold leading-snug text-white",
                isGallery ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
              )}
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
            {showsSeeMore && (
              <button
                onClick={() => {
                  setShowFull(true);
                  onMarkRead();
                }}
                className="mt-0.5 text-xs text-rose-200 hover:underline"
              >
                See more
              </button>
            )}
          </div>

          {/* Bottom metrics bar */}
          <div
            className={clsx(
              "mt-auto border-t border-white/5",
              isGallery ? "p-2.5" : "p-2 sm:p-3",
            )}
          >
            <div className="flex min-h-8 items-center justify-between gap-3">
              <AltmetricBadge arxivId={altmetricArxivId} />
              <span className="ml-auto text-[11px] text-slate-500">
                arXiv {altmetricArxivId}
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
