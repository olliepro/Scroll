import type { ArxivEntry, OrgInfo, SavedList } from "../types";
import { PaperCard } from "./PaperCard";
import { SavedListExportToolbar } from "./SavedListExportToolbar";

type DeckEntry = {
  entry: ArxivEntry;
  index: number;
};

type PaperFeedProps = {
  activeList: SavedList | null;
  deckEntries: DeckEntry[];
  getStatus: (arxivId: string) => "unviewed" | "viewed" | "read";
  isGalleryView: boolean;
  orgCache: Record<string, OrgInfo[]>;
  visibleEntries: ArxivEntry[];
  isSaved: (arxivId: string) => boolean;
  markRead: (arxivId: string) => void;
  openSaveMenu: (entry: ArxivEntry) => void;
};

/**
 * Renders the active feed as either a saved-list gallery or a deck window.
 *
 * @param props - Active list state, rendered entries, and card event handlers.
 * @returns The visible paper feed for the current selection.
 */
export function PaperFeed({
  activeList,
  deckEntries,
  getStatus,
  isGalleryView,
  orgCache,
  visibleEntries,
  isSaved,
  markRead,
  openSaveMenu,
}: PaperFeedProps) {
  if (isGalleryView) {
    return (
      <div className="flex h-full w-full flex-col">
        {activeList && <SavedListExportToolbar list={activeList} />}
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 p-3 pb-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((entry, index) => (
            <PaperCard
              key={entry.id}
              entry={entry}
              index={index}
              mode="gallery"
              saved={isSaved(entry.arxivId)}
              onToggleSave={() => openSaveMenu(entry)}
              status={getStatus(entry.arxivId)}
              onMarkRead={() => markRead(entry.arxivId)}
              orgs={orgCache[entry.arxivId]}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {deckEntries.map(({ entry, index }) => (
        <PaperCard
          key={entry.id}
          entry={entry}
          index={index}
          saved={isSaved(entry.arxivId)}
          onToggleSave={() => openSaveMenu(entry)}
          status={getStatus(entry.arxivId)}
          onMarkRead={() => markRead(entry.arxivId)}
          orgs={orgCache[entry.arxivId]}
        />
      ))}
    </div>
  );
}
