import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { fetchArxiv } from "../lib/arxiv";
import { fetchAltmetric } from "../lib/altmetric";
import { clsx, tokenizeKeywords } from "../lib/utils";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { CATEGORY_LABELS, LS_CHANNELS, LS_LAST_CHANNEL, LS_SAVED, defaultChannels } from "../constants";
import type {
  AltmetricCounts,
  Channel,
  ArxivEntry,
  RateLimitInfo,
} from "../types";
import { KeywordsChipsInput } from "./KeywordsChipsInput";
import { PaperCard } from "./PaperCard";
import "../styles/no-scrollbar";

const SAVED_CHANNEL_ID = "__saved__";

export default function ScrollApp() {
  const [channels, setChannels] = useLocalStorage<Channel[]>(
    LS_CHANNELS,
    defaultChannels
  );
  const [savedIds, setSavedIds] = useLocalStorage<string[]>(LS_SAVED, []);
  const [activeId, setActiveId] = useLocalStorage<string>(
    LS_LAST_CHANNEL,
    channels[0]?.id || "recent-ml"
  );

  const [entries, setEntries] = useState<ArxivEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [altCache, setAltCache] = useState<
    Record<string, { counts: AltmetricCounts | null; status?: number } | undefined>
  >({});
  const [rateInfo, setRateInfo] = useState<RateLimitInfo | null>(null);
  const [rateLimitHoldUntil, setRateLimitHoldUntil] = useState<number | null>(
    null
  );
  const [, forceTick] = useState(0); // seconds countdown re-render

  // Ticker to update the Retry-After countdown UI
  useEffect(() => {
    if (!rateLimitHoldUntil) return;
    const t = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [rateLimitHoldUntil]);

  const [adding, setAdding] = useState(false);
  const [newChannel, setNewChannel] = useState<Channel>({
    id: "",
    name: "",
    keywords: "",
    categories: [],
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const scrollLock = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const activeChannel: Channel | null = useMemo(
    () => channels.find((c) => c.id === activeId) || null,
    [channels, activeId]
  );

  useEffect(() => {
    if (!activeChannel) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchArxiv(activeChannel);
        setEntries(res);
        setPageIndex(0);
        setTimeout(
          () => containerRef.current?.scrollTo({ top: 0, behavior: "auto" }),
          0
        );
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Failed to load papers from arXiv"
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id]);

  // Fetch Altmetrics for the fully visible card, with rate-limit respect
  useEffect(() => {
    if (!entries || entries.length === 0) return;

    const observer = new IntersectionObserver(
      (items) => {
        items.forEach(async (it) => {
          if (it.isIntersecting && it.intersectionRatio >= 0.95) {
            const idx = Number((it.target as HTMLElement).dataset.index);
            setPageIndex(idx);

            const arxivId = entries[idx]?.arxivId;
            const now = Date.now();
            if (rateLimitHoldUntil && now < rateLimitHoldUntil) return;

            if (arxivId && altCache[arxivId] === undefined) {
              try {
                const { counts, rate, status, retryAfterSec } =
                  await fetchAltmetric(arxivId);
                setAltCache((p) => ({
                  ...p,
                  [arxivId]: { counts, status },
                }));
                setRateInfo(rate);
                if (status === 429 && retryAfterSec) {
                  setRateLimitHoldUntil(now + retryAfterSec * 1000);
                }
              } catch {
                setAltCache((p) => ({
                  ...p,
                  [arxivId]: { counts: null },
                }));
              }
            }
          }
        });
      },
      { threshold: [0.95] }
    );

    const cards = containerRef.current?.querySelectorAll("[data-card=true]");
    cards?.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [entries, altCache, rateLimitHoldUntil]);

  // Controlled page-by-page scrolling (no multi-skip, snappy)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const SCROLL_LOCK_MS = 550;
    function scrollToIndex(idx: number) {
      if (!el) return;
      const clamped = Math.max(0, Math.min(idx, (entries?.length || 1) - 1));
      const target = el.querySelector(
        `[data-index="${clamped}"]`
      ) as HTMLElement | null;
      if (target) {
        scrollLock.current = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          scrollLock.current = false;
        }, SCROLL_LOCK_MS);
      }
    }

    function onWheel(e: WheelEvent) {
      if (scrollLock.current) return e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return; // ignore tiny
      e.preventDefault();
      if (e.deltaY > 0) scrollToIndex(pageIndex + 1);
      else scrollToIndex(pageIndex - 1);
    }

    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    }
    function onTouchMove(e: TouchEvent) {
      if (touchStartY.current !== null) e.preventDefault(); // block momentum
    }
    function onTouchEnd(e: TouchEvent) {
      if (scrollLock.current) return;
      const startY = touchStartY.current;
      const endY = e.changedTouches[0]?.clientY ?? startY;
      touchStartY.current = null;
      if (startY == null || endY == null) return;
      const dy = startY - endY;
      if (Math.abs(dy) < 35) return; // require intent
      if (dy > 0) scrollToIndex(pageIndex + 1);
      else scrollToIndex(pageIndex - 1);
    }

    el.style.overflow = "hidden";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

      return () => {
        el.style.overflow = "auto";
        el.removeEventListener("wheel", onWheel as EventListener);
        el.removeEventListener("touchstart", onTouchStart as EventListener);
        el.removeEventListener("touchmove", onTouchMove as EventListener);
        el.removeEventListener("touchend", onTouchEnd as EventListener);
      };
  }, [pageIndex, entries?.length]);

  function toggleSave(arxivId: string) {
    setSavedIds((prev) =>
      prev.includes(arxivId)
        ? prev.filter((x) => x !== arxivId)
        : [...prev, arxivId]
    );
  }

  function addChannel(ch: Omit<Channel, "id">) {
    const id =
      ch.name.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Math.random().toString(36).slice(2, 7);
    const newCh: Channel = { id, ...ch };
    setChannels((prev) => [newCh, ...prev]);
    setActiveId(id);
    setAdding(false);
    setNewChannel({ id: "", name: "", keywords: "", categories: [] });
  }

  function removeChannel(id: string) {
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(channels[0]?.id || "");
  }

  const isSavedChannel = activeId === SAVED_CHANNEL_ID;
  const visibleEntries = useMemo(() => {
    if (!entries) return [];
    if (!isSavedChannel) return entries;
    const savedSet = new Set(savedIds);
    return entries.filter((e) => {
      const base = e.arxivId.replace(/v\d+$/, "");
      return savedSet.has(e.arxivId) || savedSet.has(base);
    });
  }, [entries, isSavedChannel, savedIds]);

    return (
      <div className="h-screen w-full text-zinc-100 flex flex-col overflow-hidden relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.2)_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.15)_0%,_transparent_60%)]" />
        {/* Top bar */}
        <div className="shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-lg">
          <div className="px-4 py-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-fuchsia-400 animate-pulse" />
            <div className="text-lg font-bold tracking-wide bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-sky-300 bg-clip-text text-transparent">
              Scroll
            </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setActiveId(SAVED_CHANNEL_ID)}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm border transition-colors",
                isSavedChannel
                  ? "bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/40 border-fuchsia-500/40"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              Saved
            </button>
              <button
                onClick={() => setAdding(true)}
                className="px-3 py-1.5 rounded-md text-sm bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-fuchsia-500/20"
              >
              <span className="inline-flex items-center gap-1">
                <Plus className="h-4 w-4" /> Channel
              </span>
            </button>
          </div>
        </div>

        {/* Channel strip */}
        <div className="px-3 pb-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className={clsx(
                  "group flex items-center pl-2 pr-2 py-1 rounded-full border transition-colors",
                  activeId === ch.id
                    ? "bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/40 border-fuchsia-500/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <button
                  onClick={() => setActiveId(ch.id)}
                  title={`Keywords: ${tokenizeKeywords(ch.keywords).join(", ") || "—"} | Categories: ${ch.categories.join(", ") || "—"}`}
                  className="text-sm whitespace-nowrap"
                >
                  {ch.name}
                </button>
                <div className="overflow-hidden transition-all duration-200 w-0 group-hover:w-7 ml-0 group-hover:ml-1">
                  <button
                    onClick={() => removeChannel(ch.id)}
                    className="p-1 rounded-full hover:bg-white/10"
                    title="Delete"
                    aria-label={`Delete ${ch.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setActiveId(SAVED_CHANNEL_ID)}
              className={clsx(
                "pl-2 pr-2 py-1 rounded-full border text-sm transition-colors",
                isSavedChannel
                  ? "bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/40 border-fuchsia-500/40"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
            >
              Saved
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel modal */}
      {adding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setAdding(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 backdrop-blur-xl text-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold">Create a Channel</div>
            <div className="text-zinc-400 text-sm">
              Channels are sets of filters: keywords and arXiv categories. Newest
              first.
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-sm text-zinc-300">Name</label>
                <input
                  value={newChannel.name}
                  onChange={(e) =>
                    setNewChannel((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="My Vision + LLMs"
                  className="mt-1 w-full bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-600/40"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300">Keywords</label>
                <div className="mt-1">
                  <KeywordsChipsInput
                    value={newChannel.keywords}
                    onChange={(v) =>
                      setNewChannel((p) => ({ ...p, keywords: v }))
                    }
                    placeholder={"Type a keyword, press Enter — use quotes for phrases"}
                  />
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Example: <code>"vision-language" retrieval RAG "policy gradient"</code>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-300">Categories</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(CATEGORY_LABELS).map(([code, label]) => {
                    const active = newChannel.categories.includes(code);
                    return (
                      <button
                        key={code}
                        onClick={() =>
                          setNewChannel((p) => ({
                            ...p,
                            categories: active
                              ? p.categories.filter((c) => c !== code)
                              : [...p.categories, code],
                          }))
                        }
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-xs border",
                          active
                            ? "bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-200"
                            : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                        )}
                      >
                        {label}
                        <span className="opacity-60 ml-1">({code})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button
                  disabled={!newChannel.name.trim()}
                  className={clsx(
                    "px-3 py-1.5 rounded-md",
                    newChannel.name.trim()
                      ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 shadow-lg shadow-fuchsia-500/20"
                      : "bg-white/10 text-white/50"
                  )}
                  onClick={() =>
                    addChannel({
                      name: newChannel.name.trim(),
                      keywords: newChannel.keywords.trim(),
                      categories: newChannel.categories,
                      maxResults: 40,
                    })
                  }
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll container */}
      <div ref={containerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading newest papers…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-zinc-300">
              <div className="font-semibold mb-1">Couldn’t load arXiv</div>
              <div className="text-sm text-zinc-400">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="h-full w-full relative">
            <div className="h-full w-full">
              {visibleEntries?.map((e, idx) => (
                <PaperCard
                  key={e.id}
                  entry={e}
                  index={idx}
                  saved={
                    savedIds.includes(e.arxivId) ||
                    savedIds.includes(e.arxivId.replace(/v\d+$/, ""))
                  }
                  onToggleSave={() =>
                    toggleSave(e.arxivId.replace(/v\d+$/, ""))
                  }
                  altCounts={altCache[e.arxivId]?.counts}
                  altStatus={altCache[e.arxivId]?.status}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: rate limit + page indicator */}
      <div className="shrink-0 px-3 py-2 text-xs text-zinc-400 flex items-center gap-3 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <div>
          {entries ? (
            <span>
              Card {Math.min(pageIndex + 1, entries.length)} / {entries.length}
            </span>
          ) : (
            <span>—</span>
          )}
        </div>

        {rateLimitHoldUntil && Date.now() < rateLimitHoldUntil ? (
          <div className="ml-auto">
            Altmetric paused — retry in{" "}
            {Math.max(
              0,
              Math.ceil((rateLimitHoldUntil - Date.now()) / 1000)
            )}
            s
          </div>
        ) : rateInfo ? (
          <div className="ml-auto flex items-center gap-3 opacity-80">
            {typeof rateInfo.hourlyRemaining === "number" && (
              <span>
                Altmetric hourly: {rateInfo.hourlyRemaining}/
                {rateInfo.hourlyLimit ?? "?"}
              </span>
            )}
            {typeof rateInfo.dailyRemaining === "number" && (
              <span>
                Daily: {rateInfo.dailyRemaining}/{rateInfo.dailyLimit ?? "?"}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
