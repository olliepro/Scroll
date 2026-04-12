import { BookmarkPlus, Check, FolderPlus, X } from "lucide-react";
import type { ArxivEntry, SavedList } from "../types";
import { renderLaTeX } from "../lib/utils";

type SaveToListModalProps = {
  newListName: string;
  onClose: () => void;
  onCreateList: () => void;
  onNewListNameChange: (value: string) => void;
  onTogglePaperInList: (listId: string) => void;
  savedLists: SavedList[];
  saveTarget: ArxivEntry;
};

/**
 * Checks whether a saved list already contains a paper, ignoring arXiv versions.
 *
 * @param list - Saved list being inspected.
 * @param paper - Paper the user is trying to save.
 * @returns Whether the list already contains that paper.
 */
function savedListContainsPaper(list: SavedList, paper: ArxivEntry): boolean {
  const versionlessTargetId = paper.arxivId.replace(/v\d+$/, "");
  return list.papers.some(
    (savedPaper) =>
      savedPaper.arxivId === paper.arxivId ||
      savedPaper.arxivId.replace(/v\d+$/, "") === versionlessTargetId,
  );
}

/**
 * Renders the modal used to add the current paper to one or more saved lists.
 *
 * @param props - Saved-list modal state and handlers from the main app.
 * @returns A blocking modal dialog or nothing when closed.
 */
export function SaveToListModal({
  newListName,
  onClose,
  onCreateList,
  onNewListNameChange,
  onTogglePaperInList,
  savedLists,
  saveTarget,
}: SaveToListModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(229,77,103,0.16),_transparent_32%),linear-gradient(180deg,_#141a28,_#0f1320)] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200/90">
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save Paper
            </div>
            <div className="mt-1 bg-gradient-to-r from-rose-200 via-slate-100 to-blue-200 bg-clip-text text-lg font-semibold text-transparent">
              Save to List
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Add this paper to existing lists or create a new one.
            </div>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 rounded-2xl border border-white/8 bg-black/20 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Selected Paper
          </div>
          <div
            className="mt-2 text-base font-semibold text-white"
            dangerouslySetInnerHTML={{ __html: renderLaTeX(saveTarget.title) }}
          />
          <div className="mt-1 text-sm text-slate-400">
            {saveTarget.authors.slice(0, 5).join(", ")}
            {saveTarget.authors.length > 5 && " et al."}
          </div>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {savedLists.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              No lists yet. Create your first list below.
            </div>
          )}
          {savedLists.map((list) => {
            const isChecked = savedListContainsPaper(list, saveTarget);
            return (
              <button
                key={list.id}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/8"
                onClick={() => onTogglePaperInList(list.id)}
                type="button"
              >
                <span
                  className={[
                    "flex h-5 w-5 items-center justify-center rounded-md border text-[11px]",
                    isChecked
                      ? "border-rose-400 bg-rose-500/20 text-rose-100"
                      : "border-white/15 bg-black/20 text-transparent",
                  ].join(" ")}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {list.name}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {list.papers.length} saved {list.papers.length === 1 ? "paper" : "papers"}
                  </span>
                </span>
              </button>
            );
          })}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <FolderPlus className="h-3.5 w-3.5" />
              New List
            </div>
            <input
              value={newListName}
              onChange={(event) => onNewListNameChange(event.target.value)}
              placeholder="New list name"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={!newListName.trim()}
                onClick={onCreateList}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-blue-500 px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
