import { useEffect, useState } from "react";
import { ChevronDown, Pencil, Trash2, X } from "lucide-react";
import { CATEGORY_LABELS } from "../constants";
import { clsx, normalizeKeywordString } from "../lib/utils";
import type { ArxivEntry } from "../types";
import { FeedDeleteConfirmation } from "./FeedDeleteConfirmation";
import { KeywordsChipsInput } from "./KeywordsChipsInput";

type EditableChannel = {
  kind: "channel";
  id?: string;
  name: string;
  keywords: string;
  categories: string[];
  author: string;
  maxResults: number;
};

type EditableList = {
  kind: "list";
  id: string;
  name: string;
  papers: ArxivEntry[];
};

export type FeedEditorDraft = EditableChannel | EditableList;

export type FeedEditorTarget = {
  mode: "create" | "edit";
  feed: FeedEditorDraft;
};

type FeedEditorModalProps = {
  isOpen: boolean;
  target: FeedEditorTarget | null;
  onClose: () => void;
  onDelete: (draft: FeedEditorDraft) => void;
  onSave: (draft: FeedEditorDraft) => void;
};

/**
 * Determines whether the category picker should start expanded for the current viewport.
 *
 * @returns Whether the channel editor should default to an expanded category list.
 *
 * @example
 * const defaultCategoriesOpen = shouldOpenCategoriesByDefault();
 */
function shouldOpenCategoriesByDefault(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 721px)").matches;
}

/**
 * Creates a fresh local copy of the editable feed payload.
 *
 * @param feed - Channel or saved-list data being edited.
 * @returns A detached draft object safe for local form mutation.
 *
 * @example
 * const draft = cloneFeedEditorDraft(target.feed);
 */
function cloneFeedEditorDraft(feed: FeedEditorDraft): FeedEditorDraft {
  if (feed.kind === "channel") {
    return {
      ...feed,
      categories: [...feed.categories],
      keywords: normalizeKeywordString(feed.keywords),
    };
  }
  return { ...feed, papers: [...feed.papers] };
}

/**
 * Renders the shared feed editor for channel creation plus channel/list editing.
 *
 * @param props - Open state, feed target, and save/delete callbacks.
 * @returns A modal editor dialog when open, otherwise null.
 */
export function FeedEditorModal({
  isOpen,
  target,
  onClose,
  onDelete,
  onSave,
}: FeedEditorModalProps) {
  const [draft, setDraft] = useState<FeedEditorDraft | null>(target?.feed ?? null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!target) {
      setDraft(null);
      setCategoriesOpen(false);
      setConfirmDelete(false);
      return;
    }
    setDraft(cloneFeedEditorDraft(target.feed));
    setCategoriesOpen(
      target.feed.kind === "channel" && shouldOpenCategoriesByDefault(),
    );
    setConfirmDelete(false);
  }, [target]);

  if (!isOpen || !target || !draft) return null;

  const isChannelDraft = draft.kind === "channel";
  const title = target.mode === "create" ? "Create a Channel" : `Edit ${draft.kind === "channel" ? "Channel" : "List"}`;
  const description = isChannelDraft
    ? "Channels are sets of filters: keywords, categories, and an optional author."
    : "Rename this saved list or remove it entirely.";

  function saveDraft() {
    const currentDraft = draft;
    if (!currentDraft) return;
    if (currentDraft.kind === "channel") {
      onSave({
        ...currentDraft,
        keywords: normalizeKeywordString(currentDraft.keywords),
      });
      return;
    }
    onSave(currentDraft);
  }

  function updateChannelDraft(nextChannelDraft: EditableChannel) {
    setDraft(nextChannelDraft);
  }

  function updateListName(nextName: string) {
    if (!draft || draft.kind !== "list") return;
    setDraft({ ...draft, name: nextName });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] p-4 text-white"
        style={{ maxHeight: "calc(var(--vh, 1vh) * 100)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200/90">
              <Pencil className="h-3.5 w-3.5" />
              {target.mode === "create" ? "New Channel" : "Edit Feed"}
            </div>
            <div className="mt-1 text-lg font-semibold">{title}</div>
            <div className="mt-1 text-sm text-slate-400">{description}</div>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="text-sm text-slate-300">
              {isChannelDraft ? "Name" : "List name"}
            </label>
            <input
              value={draft.name}
              onChange={(event) =>
                isChannelDraft
                  ? updateChannelDraft({ ...draft, name: event.target.value })
                  : updateListName(event.target.value)
              }
              placeholder={isChannelDraft ? "My Vision + LLMs" : "My reading list"}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {isChannelDraft ? (
            <>
              <div>
                <label className="text-sm text-slate-300">Keywords</label>
                <div className="mt-1">
                  <KeywordsChipsInput
                    value={draft.keywords}
                    onChange={(nextValue) =>
                      updateChannelDraft({ ...draft, keywords: nextValue })
                    }
                    placeholder='LLM, RL, "policy gradient"'
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Use commas between terms. Example: <code>LLM, RL, vision-language</code>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">Author</label>
                <input
                  value={draft.author}
                  onChange={(event) =>
                    updateChannelDraft({ ...draft, author: event.target.value })
                  }
                  placeholder="First Last"
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((isOpenState) => !isOpenState)}
                  className="flex w-full items-center justify-between text-sm text-slate-300"
                >
                  <span className="inline-flex items-center gap-2">
                    <span>Categories</span>
                    {!categoriesOpen && draft.categories.length > 0 && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                        {draft.categories.length} selected
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      categoriesOpen && "rotate-180",
                    )}
                  />
                </button>
                {categoriesOpen && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_LABELS).map(([code, label]) => {
                      const isActive = draft.categories.includes(code);
                      return (
                        <button
                          key={code}
                          onClick={() =>
                            updateChannelDraft({
                              ...draft,
                              categories: isActive
                                ? draft.categories.filter((categoryCode) => categoryCode !== code)
                                : [...draft.categories, code],
                            })
                          }
                          className={clsx(
                            "rounded-full border px-2.5 py-1 text-xs",
                            isActive
                              ? "border-rose-400 bg-rose-500/25 text-rose-100"
                              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                          )}
                          type="button"
                        >
                          {label}
                          <span className="ml-1 opacity-60">({code})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                  <label htmlFor="channel-max-results">Items in feed</label>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
                    {draft.maxResults}
                  </span>
                </div>
                <input
                  id="channel-max-results"
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={draft.maxResults}
                  onChange={(event) =>
                    updateChannelDraft({
                      ...draft,
                      maxResults: Number(event.target.value),
                    })
                  }
                  className="mt-3 w-full accent-rose-500"
                />
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>10</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Included Papers
              </div>
              <div className="mt-2 text-base font-semibold text-white">{draft.papers.length}</div>
              <div className="mt-1 text-slate-400">
                Editing a list renames it in place by replacing it with a fresh copy.
              </div>
            </div>
          )}

          <div
            className={clsx(
              "grid gap-2 pt-2",
              target.mode === "edit" ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {target.mode === "edit" && (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-100"
                onClick={() => setConfirmDelete(true)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              disabled={!draft.name.trim()}
              className={clsx(
                "inline-flex h-11 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
                draft.name.trim()
                  ? "bg-rose-500/90 text-white hover:bg-rose-500"
                  : "bg-white/10 text-white/50",
              )}
              onClick={saveDraft}
              type="button"
            >
              {target.mode === "create" ? "Create" : "Save changes"}
            </button>
          </div>
        </div>

        {confirmDelete && (
          <FeedDeleteConfirmation
            name={draft.name.trim() || `this ${draft.kind}`}
            noun={draft.kind}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => onDelete(draft)}
          />
        )}
      </div>
    </div>
  );
}
