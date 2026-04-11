import { useEffect } from "react";

declare global {
  interface Window {
    _altmetric_embed_init?: () => void;
  }
}

/**
 * Renders an Altmetric badge and asks the embed script to hydrate it after React paints.
 *
 * @param doi - DOI used by Altmetric to render the badge.
 * @returns A hydrated Altmetric badge when a DOI exists, otherwise a small fallback label.
 *
 * @example
 * <AltmetricBadge doi="10.1038/nature.2012.9872" />
 */
export function AltmetricBadge({ doi }: { doi?: string }) {
  useEffect(() => {
    if (!doi) return;

    const handle = window.requestAnimationFrame(() => {
      window._altmetric_embed_init?.();
    });

    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [doi]);

  if (!doi) {
    return <span className="text-[11px] text-slate-500">No DOI badge</span>;
  }

  return (
    <div
      className="altmetric-embed"
      data-badge-popover="top"
      data-badge-type="2"
      data-doi={doi}
    />
  );
}
