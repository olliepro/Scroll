import { useEffect } from "react";

declare global {
  interface Window {
    _altmetric_embed_init?: () => void;
  }
}

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
  useEffect(() => {
    if (!arxivId) return;

    const handle = window.requestAnimationFrame(() => {
      window._altmetric_embed_init?.();
    });

    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [arxivId]);

  if (!arxivId) {
    return <span className="text-[11px] text-slate-500">No arXiv badge</span>;
  }

  return (
    <div
      className="altmetric-embed"
      data-badge-popover="top"
      data-badge-type="2"
      data-arxiv-id={arxivId}
    />
  );
}
