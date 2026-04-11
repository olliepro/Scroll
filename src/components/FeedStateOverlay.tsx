import { Loader2 } from "lucide-react";

type FeedStateOverlayProps = {
  error: string | null;
  orgLoading: boolean;
  showBlockingError: boolean;
  showBlockingLoader: boolean;
  showInlineError: boolean;
  showInlineRefreshIndicator: boolean;
};

/**
 * Renders blocking and non-blocking feed status overlays.
 *
 * @param props - Active loading, error, and enrichment status flags.
 * @returns Overlay UI for feed refresh and enrichment states.
 *
 * @example
 * <FeedStateOverlay
 *   error={error}
 *   orgLoading={orgLoading}
 *   showBlockingError={showBlockingError}
 *   showBlockingLoader={showBlockingLoader}
 *   showInlineError={showInlineError}
 *   showInlineRefreshIndicator={showInlineRefreshIndicator}
 * />
 */
export function FeedStateOverlay({
  error,
  orgLoading,
  showBlockingError,
  showBlockingLoader,
  showInlineError,
  showInlineRefreshIndicator,
}: FeedStateOverlayProps) {
  return (
    <>
      {showBlockingLoader && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading newest papers…</span>
          </div>
        </div>
      )}
      {showBlockingError && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center text-slate-300">
            <div className="mb-1 font-semibold">Couldn’t load arXiv</div>
            <div className="text-sm text-slate-400">{error}</div>
          </div>
        </div>
      )}
      {showInlineRefreshIndicator && (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </div>
        </div>
      )}
      {showInlineError && (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <div className="rounded-full border border-rose-400/20 bg-rose-500/12 px-3 py-1.5 text-xs text-rose-200 backdrop-blur-md">
            Refresh failed. Showing cached papers.
          </div>
        </div>
      )}
      {orgLoading && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-30">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enriching affiliations…
          </div>
        </div>
      )}
    </>
  );
}
