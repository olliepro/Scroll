import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Loader2,
  Trash2,
  Bookmark,
  ChevronDown,
  ExternalLink,
  FileDown,
  Heart,
} from "lucide-react";
import { fetchArxiv, searchArxiv } from "../lib/arxiv";
import { clsx, tokenizeKeywords, renderLaTeX } from "../lib/utils";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { faviconsForArxivUrl } from "../lib/affiliations";
import {
  CATEGORY_LABELS,
  LS_CHANNELS,
  LS_LISTS,
  LS_LAST_CHANNEL,
  LS_STATUSES,
  LS_OPENAI_KEY,
  LS_ORG_CACHE,
  defaultChannels,
} from "../constants";
import type {
  Channel,
  ArxivEntry,
  SavedList,
  OrgInfo,
} from "../types";
import { KeywordsChipsInput } from "./KeywordsChipsInput";
import { PaperCard } from "./PaperCard";
import { ProudfootProjectHeader } from "./ProudfootProjectHeader";
import "../styles/no-scrollbar";

const scrollIconUrl = new URL("../assets/scroll.png", import.meta.url).href;

export default function ScrollApp() {
  const [channels, setChannels] = useLocalStorage<Channel[]>(
    LS_CHANNELS,
    defaultChannels
  );
  const [savedLists, setSavedLists] = useLocalStorage<SavedList[]>(
    LS_LISTS,
    []
  );
  const [activeId, setActiveId] = useLocalStorage<string>(
    LS_LAST_CHANNEL,
    channels[0]?.id || "recent-ml"
  );

  const [entries, setEntries] = useState<ArxivEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openaiKey, setOpenaiKey] = useLocalStorage<string>(
    LS_OPENAI_KEY,
    ""
  );
  const [orgCache, setOrgCache] = useLocalStorage<Record<string, OrgInfo[]>>(
    LS_ORG_CACHE,
    {}
  );
  const [orgLoading, setOrgLoading] = useState(false);

  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newChannel, setNewChannel] = useState<Channel>({
    id: "",
    name: "",
    keywords: "",
    categories: [],
    author: "",
    maxResults: 40,
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<ArxivEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (adding || searching) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [adding, searching]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const scrollLock = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const lastPositions = useRef<Record<string, number>>({});
  const viewTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const longPressTimeout = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const [statuses, setStatuses] = useLocalStorage<
    Record<string, "unviewed" | "viewed" | "read">
  >(LS_STATUSES, {});
  const statusesRef = useRef(statuses);
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  const [unviewedCounts, setUnviewedCounts] = useState<Record<string, number>>(
    {}
  );

  const [saveTarget, setSaveTarget] = useState<ArxivEntry | null>(null);
  const [newListName, setNewListName] = useState("");

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const SCROLL_LOCK_MS = 275;

  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  const scrollToIndex = useCallback(
    (idx: number) => {
      const el = containerRef.current;
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
    },
    [entries]
  );

  function startLongPress(
    type: "channel" | "list",
    id: string,
    name: string
  ) {
    if (!isTouchDevice) return;
    longPressTriggered.current = false;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      if (window.confirm(`Delete ${name}?`)) {
        if (type === "channel") removeChannel(id);
        else removeList(id);
      }
    }, 600);
  }

  function cancelLongPress(e?: TouchEvent) {
    if (!isTouchDevice) return;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    if (longPressTriggered.current && e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function promptApiKey() {
    const key = window.prompt("Enter OpenAI API key", openaiKey || "");
    if (key !== null) setOpenaiKey(key.trim());
  }

  const activeChannel: Channel | null = useMemo(
    () => channels.find((c) => c.id === activeId) || null,
    [channels, activeId]
  );
  const activeList: SavedList | null = useMemo(
    () => savedLists.find((l) => `list:${l.id}` === activeId) || null,
    [savedLists, activeId]
  );

  useEffect(() => {
    if (!activeChannel || !entries) return;
    const count = entries.filter(
      (e) =>
        statuses[e.arxivId] !== "viewed" && statuses[e.arxivId] !== "read"
    ).length;
    setUnviewedCounts((p) => ({ ...p, [activeChannel.id]: count }));
  }, [activeChannel, entries, statuses]);

  useEffect(() => {
    if (!activeChannel && !activeList && channels[0]) {
      setActiveId(channels[0].id);
    }
  }, [activeChannel, activeList, channels, setActiveId]);

  useEffect(() => {
    if (activeList) {
      setLoading(false);
      setError(null);
      setEntries(activeList.papers);
      Object.values(viewTimers.current).forEach(clearTimeout);
      viewTimers.current = {};
      const stored = lastPositions.current[activeId] || 0;
      setPageIndex(stored);
      setTimeout(() => {
        const target = containerRef.current?.querySelector(
          `[data-index="${stored}"]`
        ) as HTMLElement | null;
        if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
        else containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
      }, 0);
      return;
    }
    if (!activeChannel) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchArxiv(activeChannel);
        Object.values(viewTimers.current).forEach(clearTimeout);
        viewTimers.current = {};
        setEntries(res);
        const stored = lastPositions.current[activeChannel.id] || 0;
        setPageIndex(stored);
        setTimeout(() => {
          const target = containerRef.current?.querySelector(
            `[data-index="${stored}"]`
          ) as HTMLElement | null;
          if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
          else containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
        }, 0);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Failed to load papers from arXiv"
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id, activeList?.id]);

  useEffect(() => {
    if (!entries || entries.length === 0) return;

    const observer = new IntersectionObserver(
      (items) => {
        items.forEach(async (it) => {
          const idx = Number((it.target as HTMLElement).dataset.index);
          const arxivId = entries[idx]?.arxivId;
          if (it.isIntersecting && it.intersectionRatio >= 0.95) {
            setPageIndex(idx);
            if (arxivId) {
              clearTimeout(viewTimers.current[arxivId]);
              const status = statusesRef.current[arxivId];
              if (status !== "read" && status !== "viewed") {
                viewTimers.current[arxivId] = setTimeout(() => {
                  setStatuses((p) => ({
                    ...p,
                    [arxivId]: p[arxivId] === "read" ? "read" : "viewed",
                  }));
                }, 2000);
              }
            }
          } else if (arxivId) {
            clearTimeout(viewTimers.current[arxivId]);
          }
        });
      },
      { threshold: [0.95] }
    );

    const cards = containerRef.current?.querySelectorAll("[data-card=true]");
    cards?.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [entries, setStatuses]);

  useEffect(() => {
    lastPositions.current[activeId] = pageIndex;
  }, [pageIndex, activeId]);

  // Fetch affiliations for papers
  useEffect(() => {
    if (!entries || !openaiKey) return;
    const missing = entries.filter((e) => orgCache[e.arxivId] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;
    setOrgLoading(true);
    Promise.all(
      missing.map(async (e) => {
        const htmlUrl = e.link.replace("/abs/", "/html/");
        try {
          const orgs = await faviconsForArxivUrl(htmlUrl, openaiKey);
          return { id: e.arxivId, orgs };
        } catch {
          return { id: e.arxivId, orgs: [] as OrgInfo[] };
        }
      })
    )
      .then((res) => {
        if (cancelled) return;
        setOrgCache((p) => {
          const next = { ...p };
          res.forEach((r) => {
            next[r.id] = r.orgs;
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setOrgLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entries, openaiKey, orgCache, setOrgCache]);

  // Controlled page-by-page scrolling (no multi-skip, snappy)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (document.body.style.overflow === "hidden") return;
      if (scrollLock.current) return e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return; // ignore tiny
      e.preventDefault();
      if (e.deltaY > 0) scrollToIndex(pageIndex + 1);
      else scrollToIndex(pageIndex - 1);
    }

    function onTouchStart(e: TouchEvent) {
      if (document.body.style.overflow === "hidden") return;
      touchStartY.current = e.touches[0]?.clientY ?? null;
    }
    function onTouchMove(e: TouchEvent) {
      if (document.body.style.overflow === "hidden") return;
      if (touchStartY.current !== null) e.preventDefault(); // block momentum
    }
    function onTouchEnd(e: TouchEvent) {
      if (document.body.style.overflow === "hidden") return;
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

    function onKeyDown(e: KeyboardEvent) {
      if (document.body.style.overflow === "hidden") return;
      if (scrollLock.current) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToIndex(pageIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIndex(pageIndex - 1);
      }
    }

    el.style.overflow = "hidden";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("keydown", onKeyDown as EventListener);

      return () => {
        el.style.overflow = "auto";
        el.removeEventListener("wheel", onWheel as EventListener);
        el.removeEventListener("touchstart", onTouchStart as EventListener);
        el.removeEventListener("touchmove", onTouchMove as EventListener);
        el.removeEventListener("touchend", onTouchEnd as EventListener);
        window.removeEventListener("keydown", onKeyDown as EventListener);
      };
  }, [pageIndex, entries?.length, scrollToIndex]);

  function openSaveMenu(entry: ArxivEntry) {
    markRead(entry.arxivId);
    setSaveTarget(entry);
  }

  function togglePaperInList(listId: string) {
    if (!saveTarget) return;
    const base = saveTarget.arxivId.replace(/v\d+$/, "");
    setSavedLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const exists = l.papers.some(
          (p) =>
            p.arxivId === saveTarget.arxivId ||
            p.arxivId.replace(/v\d+$/, "") === base
        );
        const papers = exists
          ? l.papers.filter(
              (p) =>
                !(
                  p.arxivId === saveTarget.arxivId ||
                  p.arxivId.replace(/v\d+$/, "") === base
                )
            )
          : [...l.papers, saveTarget];
        return { ...l, papers };
      })
    );
  }

  function createList() {
    if (!saveTarget || !newListName.trim()) return;
    const id =
      newListName.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Math.random().toString(36).slice(2, 7);
    const newList: SavedList = {
      id,
      name: newListName.trim(),
      papers: [saveTarget],
    };
    setSavedLists((p) => [...p, newList]);
    setNewListName("");
  }

  function isSaved(id: string) {
    const base = id.replace(/v\d+$/, "");
    return savedLists.some((l) =>
      l.papers.some(
        (p) => p.arxivId === id || p.arxivId.replace(/v\d+$/, "") === base
      )
    );
  }

  function markRead(id: string) {
    setStatuses((p) => ({ ...p, [id]: "read" }));
  }

  async function performSearch() {
    if (!searchInput.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await searchArxiv(searchInput.trim());
      setSearchResults(res);
    } catch (e) {
      setSearchError(String(e));
    } finally {
      setSearchLoading(false);
    }
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
    setNewChannel({
      id: "",
      name: "",
      keywords: "",
      categories: [],
      author: "",
      maxResults: 40,
    });
    setCategoriesOpen(false);
  }

  function removeChannel(id: string) {
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(channels[0]?.id || "");
  }

  function removeList(id: string) {
    setSavedLists((prev) => prev.filter((l) => l.id !== id));
    if (activeId === `list:${id}`) setActiveId(channels[0]?.id || "");
  }

  const visibleEntries = useMemo(() => entries || [], [entries]);

  const firstUnseenIndex = useMemo(
    () =>
      visibleEntries.findIndex(
        (e) =>
          statuses[e.arxivId] !== "viewed" && statuses[e.arxivId] !== "read"
      ),
    [visibleEntries, statuses]
  );

    return (
      <div
        className="scroll-app-shell w-full text-slate-100 flex flex-col overflow-hidden relative"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_rgba(229,77,103,0.16)_0%,_transparent_58%),radial-gradient(ellipse_at_bottom_right,_rgba(63,98,186,0.16)_0%,_transparent_62%)]" />
        <ProudfootProjectHeader
          logoUrl={scrollIconUrl}
          onOpenChannelCreator={() => setAdding(true)}
          onOpenSearch={() => setSearching(true)}
          onPromptApiKey={promptApiKey}
        />

        {/* Channel strip */}
        <div className="px-3 py-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className={clsx(
                  "group flex items-center pl-2 pr-2 py-1 rounded-full border transition-colors",
                  activeId === ch.id
                    ? "bg-gradient-to-r from-rose-500/30 to-blue-500/30 border-rose-400/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                onTouchStart={() => startLongPress("channel", ch.id, ch.name)}
                onTouchEnd={(e) => cancelLongPress(e.nativeEvent)}
                onTouchMove={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
              >
                <button
                  onClick={() => {
                    if (longPressTriggered.current) return;
                    setActiveId(ch.id);
                  }}
                  title={`Keywords: ${tokenizeKeywords(ch.keywords).join(", ") || "—"} | Categories: ${ch.categories.join(", ") || "—"} | Author: ${ch.author || "—"}`}
                  className="text-sm whitespace-nowrap"
                >
                  {ch.name}
                </button>
                {unviewedCounts[ch.id] > 0 && (
                  <span className="ml-1 px-1.5 min-w-[1.25rem] h-5 inline-flex items-center justify-center text-xs rounded-full bg-red-600 text-white">
                    {unviewedCounts[ch.id]}
                  </span>
                )}
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
            {savedLists.length > 0 && (
              <div className="w-px bg-white/10" aria-hidden="true" />
            )}
            {savedLists.map((list) => (
              <div
                key={list.id}
                className={clsx(
                  "group flex items-center pl-2 pr-2 py-1 rounded-full border-dashed border text-sm transition-colors",
                  activeId === `list:${list.id}`
                    ? "bg-gradient-to-r from-blue-500/30 to-slate-500/30 border-blue-400/40"
                    : "bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/20"
                )}
                onTouchStart={() => startLongPress("list", list.id, list.name)}
                onTouchEnd={(e) => cancelLongPress(e.nativeEvent)}
                onTouchMove={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
              >
                <button
                  onClick={() => {
                    if (longPressTriggered.current) return;
                    setActiveId(`list:${list.id}`);
                  }}
                  className="flex items-center gap-1"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  {list.name}
                </button>
                <div className="overflow-hidden transition-all duration-200 w-0 group-hover:w-7 ml-0 group-hover:ml-1">
                  <button
                    onClick={() => removeList(list.id)}
                    className="p-1 rounded-full hover:bg-white/10"
                    title="Delete"
                    aria-label={`Delete ${list.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      {saveTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => {
            setSaveTarget(null);
            setNewListName("");
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] backdrop-blur-xl shadow-lg shadow-black/30 text-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-3 bg-gradient-to-r from-rose-200 via-slate-100 to-blue-200 bg-clip-text text-transparent">
              Save to List
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedLists.map((list) => {
                const checked = list.papers.some(
                  (p) =>
                    p.arxivId === saveTarget.arxivId ||
                    p.arxivId.replace(/v\\d+$/, "") ===
                      saveTarget.arxivId.replace(/v\\d+$/, "")
                );
                return (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-white/10"
                  >
                    <input
                      type="checkbox"
                      className="accent-rose-500"
                      checked={checked}
                      onChange={() => togglePaperInList(list.id)}
                    />
                    {list.name}
                  </label>
                );
              })}
              <div className="flex gap-2 pt-2">
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="New list name"
                  className="flex-1 bg-black/40 border border-white/10 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
                <button
                  disabled={!newListName.trim()}
                  onClick={createList}
                  className="px-3 py-1 rounded-md bg-gradient-to-r from-rose-500 to-blue-500 text-sm disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => {
                  setSaveTarget(null);
                  setNewListName("");
                }}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {searching && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => {
            setSearching(false);
            setSearchInput("");
            setSearchResults([]);
            setSearchError(null);
            setSearchLoading(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] text-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-2">Search Papers</div>
            <div className="flex gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch()}
                placeholder="Title or DOI"
                className="flex-1 bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <button
                onClick={performSearch}
                disabled={!searchInput.trim() || searchLoading}
                className="px-3 py-2 rounded-md bg-gradient-to-r from-rose-500 to-blue-500 text-sm disabled:opacity-50"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            {searchError && (
              <div className="text-sm text-red-500 mt-2">{searchError}</div>
            )}
            <div className="mt-4 space-y-4">
              {searchResults.map((e) => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5"
                >
                  <div
                    className="font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: renderLaTeX(e.title),
                    }}
                  />
                  <div className="text-sm text-slate-400">
                    {e.authors.join(", ")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => markRead(e.arxivId)}
                      className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                    {e.pdfUrl && (
                      <a
                        href={e.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markRead(e.arxivId)}
                        className="px-2 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1"
                      >
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </a>
                    )}
                    <button
                      onClick={() => openSaveMenu(e)}
                      className={clsx(
                        "px-2 py-1 text-xs rounded-full border flex items-center gap-1",
                        isSaved(e.arxivId)
                          ? "bg-rose-500/20 border-rose-400 text-rose-100"
                          : "bg-white/5 hover:bg-white/10 border-white/10"
                      )}
                    >
                      {isSaved(e.arxivId) ? (
                        <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
                      ) : (
                        <Heart className="h-3.5 w-3.5" />
                      )}
                      {isSaved(e.arxivId) ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && !searchLoading && searchInput && (
                <div className="text-sm text-slate-400">No results</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Channel modal */}
      {adding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
          style={{ height: "calc(var(--vh, 1vh) * 100)" }}
          onClick={() => {
            setAdding(false);
            setCategoriesOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-[#141a28] to-[#0f1320] backdrop-blur-xl text-white p-4 overflow-y-auto"
            style={{ maxHeight: "calc(var(--vh, 1vh) * 100)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold">Create a Channel</div>
            <div className="text-slate-400 text-sm">
              Channels are sets of filters: keywords and arXiv categories. Newest
              first.
            </div>

            <div className="space-y-3 mt-3">
              <div>
                <label className="text-sm text-slate-300">Name</label>
                <input
                  value={newChannel.name}
                  onChange={(e) =>
                    setNewChannel((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="My Vision + LLMs"
                  className="mt-1 w-full bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Keywords</label>
                <div className="mt-1">
                  <KeywordsChipsInput
                    value={newChannel.keywords}
                    onChange={(v) =>
                      setNewChannel((p) => ({ ...p, keywords: v }))
                    }
                    placeholder={"Type a keyword, press Enter — use quotes for phrases"}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Example: <code>"vision-language" retrieval RAG "policy gradient"</code>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">Author</label>
                <input
                  value={newChannel.author ?? ""}
                  onChange={(e) =>
                    setNewChannel((p) => ({ ...p, author: e.target.value }))
                  }
                  placeholder="First Last"
                  className="mt-1 w-full bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Example: <code>Yann LeCun</code>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setCategoriesOpen((o) => !o)}
                  className="flex items-center justify-between w-full text-sm text-slate-300"
                >
                  Categories
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      categoriesOpen && "rotate-180"
                    )}
                  />
                </button>
                {categoriesOpen && (
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
                              ? "bg-rose-500/25 border-rose-400 text-rose-100"
                              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
                          )}
                        >
                          {label}
                          <span className="opacity-60 ml-1">({code})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-300">Items in feed</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newChannel.maxResults}
                  onChange={(e) =>
                    setNewChannel((p) => ({
                      ...p,
                      maxResults: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full bg-black/40 border border-white/10 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10"
                  onClick={() => {
                    setAdding(false);
                    setCategoriesOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!newChannel.name.trim()}
                  className={clsx(
                    "px-3 py-1.5 rounded-md",
                    newChannel.name.trim()
                      ? "bg-gradient-to-r from-rose-500 to-blue-500 shadow-lg shadow-black/30"
                      : "bg-white/10 text-white/50",
                  )}
                  onClick={() =>
                    addChannel({
                      name: newChannel.name.trim(),
                      keywords: newChannel.keywords.trim(),
                      categories: newChannel.categories,
                      author: newChannel.author?.trim() || undefined,
                      maxResults: newChannel.maxResults,
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
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading newest papers…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-slate-300">
              <div className="font-semibold mb-1">Couldn’t load arXiv</div>
              <div className="text-sm text-slate-400">{error}</div>
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
                  saved={isSaved(e.arxivId)}
                  onToggleSave={() => openSaveMenu(e)}
                  status={statuses[e.arxivId] || "unviewed"}
                  onMarkRead={() => markRead(e.arxivId)}
                  orgs={orgCache[e.arxivId]}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {firstUnseenIndex >= 0 && firstUnseenIndex !== pageIndex && (
        <button
          className="fixed bottom-20 right-4 z-20 px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-sm shadow-lg shadow-black/30"
          onClick={() => scrollToIndex(firstUnseenIndex)}
        >
          Jump to latest unseen
        </button>
      )}

      {/* Footer: rate limit + page indicator */}
      <div className="shrink-0 px-3 py-2 text-xs text-slate-400 flex items-center gap-3 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <div>
          {entries ? (
            <span>
              Card {Math.min(pageIndex + 1, entries.length)} / {entries.length}
            </span>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>
      {orgLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <img
            src={scrollIconUrl}
            className="h-32 w-32 animate-pulse"
            alt="Loading"
          />
        </div>
      )}
    </div>
  );
}
