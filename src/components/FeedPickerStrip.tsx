import type { MutableRefObject, TouchEvent as ReactTouchEvent } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { clsx, tokenizeKeywords } from "../lib/utils";
import type { Channel, SavedList } from "../types";

type FeedPickerStripProps = {
  activeId: string;
  channels: Channel[];
  longPressTriggeredRef: MutableRefObject<boolean>;
  onActivateChannel: (channelId: string) => void;
  onActivateList: (listId: string) => void;
  onCancelLongPress: (event?: TouchEvent) => void;
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
  onDelete: () => void;
  onStartLongPress: () => void;
  onCancelLongPress: (event?: TouchEvent) => void;
  title?: string;
  unviewedCount?: number;
};

function PickerChip({
  active,
  icon,
  label,
  onActivate,
  onDelete,
  onStartLongPress,
  onCancelLongPress,
  title,
  unviewedCount,
}: PickerChipProps) {
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
          "flex items-center gap-1 rounded-full border pl-2 pr-2 py-1 text-sm transition-colors",
          active
            ? "border-rose-400/40 bg-gradient-to-r from-rose-500/30 to-blue-500/30"
            : "border-white/10 bg-white/5 hover:bg-white/10",
          Boolean(icon) && "border-dashed",
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        {(unviewedCount ?? 0) > 0 && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs text-white">
            {unviewedCount}
          </span>
        )}
      </button>
      <div className="ml-0 w-0 overflow-hidden transition-all duration-200 group-hover:ml-1 group-hover:w-7">
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
  longPressTriggeredRef,
  onActivateChannel,
  onActivateList,
  onCancelLongPress,
  onRemoveChannel,
  onRemoveList,
  onStartLongPress,
  savedLists,
  unviewedCounts,
}: FeedPickerStripProps) {
  return (
    <div className="overflow-x-auto px-3 py-2 no-scrollbar">
      <div className="flex gap-2">
        {channels.map((channel) => (
          <PickerChip
            key={channel.id}
            active={activeId === channel.id}
            label={channel.name}
            title={`Keywords: ${tokenizeKeywords(channel.keywords).join(", ") || "—"} | Categories: ${channel.categories.join(", ") || "—"} | Author: ${channel.author || "—"}`}
            unviewedCount={unviewedCounts[channel.id]}
            onActivate={() => {
              if (longPressTriggeredRef.current) return;
              onActivateChannel(channel.id);
            }}
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
            icon={<Bookmark className="h-3.5 w-3.5" />}
            label={list.name}
            onActivate={() => {
              if (longPressTriggeredRef.current) return;
              onActivateList(list.id);
            }}
            onDelete={() => onRemoveList(list.id)}
            onStartLongPress={() => onStartLongPress("list", list.id, list.name)}
            onCancelLongPress={onCancelLongPress}
          />
        ))}
      </div>
    </div>
  );
}
