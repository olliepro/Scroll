import type { MutableRefObject, TouchEvent as ReactTouchEvent } from "react";
import { Bookmark, Pencil, Trash2 } from "lucide-react";
import { clsx, tokenizeKeywords } from "../lib/utils";
import type { Channel, SavedList } from "../types";

type FeedPickerStripProps = {
  activeId: string;
  channels: Channel[];
  className?: string;
  compact?: boolean;
  longPressTriggeredRef: MutableRefObject<boolean>;
  onActivateChannel: (channelId: string) => void;
  onActivateList: (listId: string) => void;
  onCancelLongPress: (event?: TouchEvent) => void;
  onEditChannel: (channelId: string) => void;
  onEditList: (listId: string) => void;
  onRemoveChannel: (channelId: string) => void;
  onRemoveList: (listId: string) => void;
  onStartLongPress: (type: "channel" | "list", id: string, name: string) => void;
  savedLists: SavedList[];
  unviewedCounts: Record<string, number>;
};

type PickerChipProps = {
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartLongPress: () => void;
  onCancelLongPress: (event?: TouchEvent) => void;
  title?: string;
  unviewedCount?: number;
};

function PickerChip({
  active,
  compact = false,
  icon,
  label,
  onActivate,
  onEdit,
  onDelete,
  onStartLongPress,
  onCancelLongPress,
  title,
  unviewedCount,
}: PickerChipProps & { compact?: boolean }) {
  function handleTouchEnd(event: ReactTouchEvent<HTMLButtonElement>) {
    onCancelLongPress(event.nativeEvent);
  }

  return (
    <div className="group flex items-center">
      <button
        type="button"
        title={title}
        onClick={onActivate}
        onTouchStart={onStartLongPress}
        onTouchEnd={handleTouchEnd}
        onTouchMove={() => onCancelLongPress()}
        onTouchCancel={() => onCancelLongPress()}
        className={clsx(
          "flex shrink-0 items-center gap-1 rounded-full border transition-colors",
          compact ? "min-h-8 px-2.5 py-1 text-xs" : "pl-2 pr-2 py-1 text-sm",
          active
            ? "border-rose-400/40 bg-gradient-to-r from-rose-500/30 to-blue-500/30"
            : "border-white/10 bg-white/5 hover:bg-white/10",
          Boolean(icon) && !compact && "border-dashed",
        )}
      >
        {!compact && icon}
        <span className="whitespace-nowrap">{label}</span>
        {(unviewedCount ?? 0) > 0 && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs text-white">
            {unviewedCount}
          </span>
        )}
      </button>
      {!compact && (
        <div className="ml-0 flex w-0 overflow-hidden transition-all duration-200 group-hover:ml-1 group-hover:w-[3.7rem]">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full p-1 hover:bg-white/10"
            title="Edit"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-1 hover:bg-white/10"
            title="Delete"
            aria-label={`Delete ${label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the channel and saved-list picker strip at the top of the app.
 *
 * @param props - Feed picker state, counts, and interaction handlers.
 * @returns A horizontally scrollable picker row.
 *
 * @example
 * <FeedPickerStrip activeId={activeId} channels={channels} savedLists={savedLists} />
 */
export function FeedPickerStrip({
  activeId,
  channels,
  className,
  compact = false,
  longPressTriggeredRef,
  onActivateChannel,
  onActivateList,
  onCancelLongPress,
  onEditChannel,
  onEditList,
  onRemoveChannel,
  onRemoveList,
  onStartLongPress,
  savedLists,
  unviewedCounts,
}: FeedPickerStripProps) {
  return (
    <div
      className={clsx(
        "overflow-x-auto no-scrollbar",
        compact ? "min-w-0 py-0" : "px-3 py-2",
        className,
      )}
    >
      <div className={compact ? undefined : "scroll-page-width"}>
        <div className={clsx("flex", compact ? "gap-1.5" : "min-w-full w-max gap-2")}>
          {channels.map((channel) => (
            <PickerChip
              key={channel.id}
              active={activeId === channel.id}
              compact={compact}
              label={channel.name}
              title={`Keywords: ${tokenizeKeywords(channel.keywords).join(", ") || "—"} | Categories: ${channel.categories.join(", ") || "—"} | Author: ${channel.author || "—"}`}
              unviewedCount={unviewedCounts[channel.id]}
              onActivate={() => {
                if (longPressTriggeredRef.current) return;
                onActivateChannel(channel.id);
              }}
              onEdit={() => onEditChannel(channel.id)}
              onDelete={() => onRemoveChannel(channel.id)}
              onStartLongPress={() =>
                onStartLongPress("channel", channel.id, channel.name)
              }
              onCancelLongPress={onCancelLongPress}
            />
          ))}
          {savedLists.length > 0 && <div className="w-px bg-white/10" aria-hidden="true" />}
          {savedLists.map((list) => (
            <PickerChip
              key={list.id}
              active={activeId === `list:${list.id}`}
              compact={compact}
              icon={<Bookmark className="h-3.5 w-3.5" />}
              label={list.name}
              onActivate={() => {
                if (longPressTriggeredRef.current) return;
                onActivateList(list.id);
              }}
              onEdit={() => onEditList(list.id)}
              onDelete={() => onRemoveList(list.id)}
              onStartLongPress={() => onStartLongPress("list", list.id, list.name)}
              onCancelLongPress={onCancelLongPress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
