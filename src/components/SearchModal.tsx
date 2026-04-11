import { ExternalLink, FileDown, Heart } from "lucide-react";
import type { ArxivEntry } from "../types";
import { clsx, renderLaTeX } from "../lib/utils";

type SearchModalProps = {
  isOpen: boolean;
  searchInput: string;
  onSearchInputChange: (nextValue: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  searchLoading: boolean;
  searchError: string | null;
  searchResults: ArxivEntry[];
  onOpenSaveMenu: (entry: ArxivEntry) => void;
  onMarkRead: (paperId: string) => void;
  isSaved: (paperId: string) => boolean;
};

/**
 * Renders a single arXiv search result inside the search modal.
 *
 * @param props - Search result metadata and action callbacks for a paper.
 * @returns A styled search result card.
 */
function SearchResultCard({
  entry,
  onOpenSaveMenu,
  onMarkRead,
  isSaved,
}: {
  entry: ArxivEntry;
  onOpenSaveMenu: (entry: ArxivEntry) => void;
  onMarkRead: (paperId: string) => void;
  isSaved: (paperId: string) => boolean;
}) {
  return (
    <div className="p-3 rounded-xl border border-white/10 bg-white/5">
      <div
        className="font-semibold"
        dangerouslySetInnerHTML={{ __html: renderLaTeX(entry.title) }}
      />
      <div className="text-sm text-slate-400">{entry.authors.join(", ")}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={entry.link}
          target="_blank"
          rel="noreferrer"
          onClick={() => onMarkRead(entry.arxivId)}
          className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
        {entry.pdfUrl && (
          <a
            href={entry.pdfUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onMarkRead(entry.arxivId)}
            className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
          >
            <FileDown className="h-3.5 w-3.5" /> PDF
          </a>
        )}
        <button
          onClick={() => onOpenSaveMenu(entry)}
          className={clsx(
            "px-2 py-1 text-xs rounded-full border flex items-center gap-1",
            isSaved(entry.arxivId)
              ? "bg-rose-500/20 border-rose-400 text-rose-100"
              : "bg-white/5 hover:bg-white/10 border-white/10",
          )}
          type="button"
        >
          {isSaved(entry.arxivId) ? (
            <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
          ) : (
            <Heart className="h-3.5 w-3.5" />
          )}
          {isSaved(entry.arxivId) ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

/**
 * Renders the paper search overlay for manual arXiv lookup.
 *
 * @param props - Search input state, results, and modal event handlers.
 * @returns The search modal when open, otherwise null.
 */
export function SearchModal({
  isOpen,
  searchInput,
  onSearchInputChange,
  onSubmit,
  onClose,
  searchLoading,
  searchError,
  searchResults,
  onOpenSaveMenu,
  onMarkRead,
  isSaved,
}: SearchModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] text-white p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-2">Search Papers</div>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSubmit()}
            placeholder="Title or DOI"
            className="flex-1 bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
          <button
            onClick={onSubmit}
            disabled={!searchInput.trim() || searchLoading}
            className="px-3 py-2 rounded-md bg-gradient-to-r from-rose-500 to-blue-500 text-sm disabled:opacity-50"
            type="button"
          >
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </div>
        {searchError && <div className="text-sm text-red-500 mt-2">{searchError}</div>}
        <div className="mt-4 space-y-4">
          {searchResults.map((entry) => (
            <SearchResultCard
              key={entry.id}
              entry={entry}
              onOpenSaveMenu={onOpenSaveMenu}
              onMarkRead={onMarkRead}
              isSaved={isSaved}
            />
          ))}
          {searchResults.length === 0 && !searchLoading && searchInput && (
            <div className="text-sm text-slate-400">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
