type FeedDeleteConfirmationProps = {
  name: string;
  noun: "channel" | "list";
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Renders a blocking confirmation dialog before deleting a feed item.
 *
 * @param props - Feed name, feed type, and confirmation callbacks.
 * @returns A fullscreen confirmation overlay.
 *
 * @example
 * <FeedDeleteConfirmation name="Robotics" noun="channel" onCancel={close} onConfirm={remove} />
 */
export function FeedDeleteConfirmation({
  name,
  noun,
  onCancel,
  onConfirm,
}: FeedDeleteConfirmationProps) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-rose-400/20 bg-[#111624] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-lg font-semibold">Delete {noun}</div>
        <div className="mt-2 text-sm text-slate-400">
          This will permanently remove <span className="text-slate-200">{name}</span>.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
