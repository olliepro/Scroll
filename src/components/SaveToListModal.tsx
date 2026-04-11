import type { ArxivEntry, SavedList } from "../types";

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
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] p-6 text-white shadow-lg shadow-black/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 bg-gradient-to-r from-rose-200 via-slate-100 to-blue-200 bg-clip-text text-lg font-semibold text-transparent">
          Save to List
        </div>
        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {savedLists.map((list) => (
            <label
              key={list.id}
              className="flex items-center gap-2 rounded p-1.5 text-sm hover:bg-white/10"
            >
              <input
                type="checkbox"
                className="accent-rose-500"
                checked={savedListContainsPaper(list, saveTarget)}
                onChange={() => onTogglePaperInList(list.id)}
              />
              {list.name}
            </label>
          ))}
          <div className="flex gap-2 pt-2">
            <input
              value={newListName}
              onChange={(event) => onNewListNameChange(event.target.value)}
              placeholder="New list name"
              className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
            <button
              type="button"
              disabled={!newListName.trim()}
              onClick={onCreateList}
              className="rounded-md bg-gradient-to-r from-rose-500 to-blue-500 px-3 py-1 text-sm disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
        <div className="mt-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
