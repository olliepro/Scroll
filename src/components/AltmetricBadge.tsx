import { useEffect, useRef, useState } from "react";
import { scheduleAltmetricHydration } from "../lib/altmetric";

/**
 * Renders an Altmetric badge and asks the embed script to hydrate it after React paints.
 *
 * @param arxivId - Versionless arXiv identifier used by Altmetric's badge embed.
 * @returns A hydrated Altmetric badge when an arXiv identifier exists, otherwise a small fallback label.
 *
 * @example
 * <AltmetricBadge arxivId="1706.03762" />
 */
export function AltmetricBadge({ arxivId }: { arxivId?: string }) {
  const badgeHostRef = useRef<HTMLDivElement | null>(null);
  const [showsPopover, setShowsPopover] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePopoverState = () => setShowsPopover(mediaQuery.matches);

    updatePopoverState();
    mediaQuery.addEventListener("change", updatePopoverState);
    return () => {
      mediaQuery.removeEventListener("change", updatePopoverState);
    };
  }, []);

  useEffect(() => {
    const badgeHost = badgeHostRef.current;
    if (!badgeHost || !arxivId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsNearViewport(entry?.isIntersecting ?? false);
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(badgeHost);
    return () => observer.disconnect();
  }, [arxivId]);

  useEffect(() => {
    if (!arxivId || !isNearViewport) return;
    scheduleAltmetricHydration();
  }, [arxivId, isNearViewport, showsPopover]);

  if (!arxivId) {
    return <span className="text-[11px] text-slate-500">No arXiv badge</span>;
  }

  return (
    <div ref={badgeHostRef}>
      {isNearViewport ? (
        <div
          className="altmetric-embed"
          data-badge-type="2"
          data-arxiv-id={arxivId}
          {...(showsPopover ? { "data-badge-popover": "top" } : {})}
        />
      ) : (
        <span className="text-[11px] text-slate-500">Badge loading</span>
      )}
    </div>
  );
}
