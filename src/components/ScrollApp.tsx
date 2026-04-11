import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";
import {
  ChevronDown,
} from "lucide-react";
import { fetchArxiv, searchArxiv } from "../lib/arxiv";
import {
  buildFeedCacheKey,
  createFeedCacheEntry,
  isFeedCacheFresh,
} from "../lib/feedCache";
import {
  clearOpenAiKeyFromBrowser,
  isEncryptedBrowserStorageAvailable,
  loadOpenAiKeyFromBrowser,
  saveOpenAiKeyToBrowser,
} from "../lib/openAiKeyStorage";
import { clsx } from "../lib/utils";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  CATEGORY_LABELS,
  LS_CHANNELS,
  LS_LISTS,
  LS_LAST_CHANNEL,
  LS_STATUSES,
  LS_ORG_CACHE,
  LS_FEED_CACHE,
  defaultChannels,
} from "../constants";
import type {
  Channel,
  ArxivEntry,
  FeedCacheEntry,
  SavedList,
  OrgInfo,
} from "../types";
import { loadOrgInfoForEntries } from "../lib/loadOrgInfoForEntries";
import { ApiKeyModal } from "./ApiKeyModal";
import { FeedPickerStrip } from "./FeedPickerStrip";
import { FeedStateOverlay } from "./FeedStateOverlay";
import { KeywordsChipsInput } from "./KeywordsChipsInput";
import { PaperFeed } from "./PaperFeed";
import { ProudfootProjectHeader } from "./ProudfootProjectHeader";
import { SaveToListModal } from "./SaveToListModal";
import { SearchModal } from "./SearchModal";
import "../styles/no-scrollbar";

const scrollIconUrl = new URL("../assets/scroll.png", import.meta.url).href;

function getStatusKey(arxivId: string): string {
  return arxivId.replace(/v\d+$/i, "");
}

function getEntryStatus(
  statuses: Record<string, "unviewed" | "viewed" | "read">,
  arxivId: string,
): "unviewed" | "viewed" | "read" {
  return statuses[getStatusKey(arxivId)] || statuses[arxivId] || "unviewed";
}

export default function ScrollApp() {
  const [channels, setChannels] = useLocalStorage<Channel[]>(LS_CHANNELS, defaultChannels);
  const [savedLists, setSavedLists] = useLocalStorage<SavedList[]>(LS_LISTS, []);
  const [activeId, setActiveId] = useLocalStorage<string>(LS_LAST_CHANNEL, channels[0]?.id || "recent-ml");
  const [entries, setEntries] = useState<ArxivEntry[] | null>(null);
  const [loadedChannelId, setLoadedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiKeyStorageMode, setOpenaiKeyStorageMode] = useState<"loading" | "encrypted-browser" | "session-only">("loading");
  const [orgCache, setOrgCache] = useLocalStorage<Record<string, OrgInfo[]>>(LS_ORG_CACHE, {});
  const [feedCache, setFeedCache] = useLocalStorage<Record<string, FeedCacheEntry>>(LS_FEED_CACHE, {});
  const [orgLoadingCount, setOrgLoadingCount] = useState(0);
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("modal") === "api-key";
  });
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
    if (adding || searching || apiKeyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [adding, apiKeyModalOpen, searching]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredOpenAiKey() {
      if (!isEncryptedBrowserStorageAvailable()) {
        if (!cancelled) setOpenaiKeyStorageMode("session-only");
        return;
      }

      try {
        const storedKey = await loadOpenAiKeyFromBrowser();
        if (cancelled) return;
        setOpenaiKey(storedKey);
        setOpenaiKeyStorageMode("encrypted-browser");
      } catch {
        if (!cancelled) setOpenaiKeyStorageMode("session-only");
      }
    }

    void loadStoredOpenAiKey();
    return () => {
      cancelled = true;
    };
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const activeIdRef = useRef(activeId);
  const orgCacheRef = useRef(orgCache);
  const visibleEntryCountRef = useRef(0);
  const scrollLock = useRef(false);
  const lastPositions = useRef<Record<string, number>>({});
  const restoreScrollTimeout = useRef<number | null>(null);
  const viewTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingOrgFetchIds = useRef(new Set<string>());
  const longPressTimeout = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const [statuses, setStatuses] = useLocalStorage<Record<string, "unviewed" | "viewed" | "read">>(LS_STATUSES, {});
  const statusesRef = useRef(statuses);
  useEffect(() => { statusesRef.current = statuses; }, [statuses]);
  useEffect(() => {
    orgCacheRef.current = orgCache;
  }, [orgCache]);

  const [unviewedCounts, setUnviewedCounts] = useState<Record<string, number>>(
    {}
  );

  const [saveTarget, setSaveTarget] = useState<ArxivEntry | null>(null);
  const [newListName, setNewListName] = useState("");

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const SCROLL_LOCK_MS = 420;

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
      const clamped = Math.max(0, Math.min(idx, visibleEntryCountRef.current - 1));
      if (visibleEntryCountRef.current === 0) return;
      setPageIndex(clamped);
      window.requestAnimationFrame(() => {
        const target = el.querySelector(
          `[data-index="${clamped}"]`
        ) as HTMLElement | null;
        if (!target) return;
        scrollLock.current = true;
        el.scrollTo({ top: target.offsetTop, behavior: "smooth" });
        setTimeout(() => {
          scrollLock.current = false;
        }, SCROLL_LOCK_MS);
      });
    },
    []
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

  const activeChannel: Channel | null = useMemo(
    () => channels.find((c) => c.id === activeId) || null,
    [channels, activeId]
  );
  const activeList: SavedList | null = useMemo(
    () => savedLists.find((l) => `list:${l.id}` === activeId) || null,
    [savedLists, activeId]
  );
  const isGalleryView = activeList !== null;
  const activeChannelCacheKey = useMemo(
    () => (activeChannel ? buildFeedCacheKey(activeChannel) : null),
    [activeChannel]
  );
  const visibleEntries = useMemo(() => {
    if (activeList) return activeList.papers;
    if (!activeChannel) return [];
    if (loadedChannelId === activeChannel.id && entries) return entries;
    const cachedFeed = activeChannelCacheKey
      ? feedCache[activeChannelCacheKey]
      : undefined;
    return cachedFeed?.entries ?? [];
  }, [
    activeChannel,
    activeChannelCacheKey,
    activeList,
    entries,
    feedCache,
    loadedChannelId,
  ]);
  const showBlockingLoader = loading && visibleEntries.length === 0;
  const showInlineRefreshIndicator = loading && visibleEntries.length > 0;
  const showBlockingError = Boolean(error) && visibleEntries.length === 0;
  const showInlineError = Boolean(error) && visibleEntries.length > 0;
  const showVisibleEntries = !showBlockingLoader && !showBlockingError;
  const orgLoading = orgLoadingCount > 0;
  const renderedDeckEntries = useMemo(() => {
    if (isGalleryView) return [];
    return visibleEntries.map((entry, index) => ({ entry: entry, index: index }));
  }, [isGalleryView, visibleEntries]);
  useEffect(() => {
    visibleEntryCountRef.current = visibleEntries.length;
  }, [visibleEntries.length]);
  const entriesForEnrichment = useMemo(() => {
    if (isGalleryView) return visibleEntries;
    const startIndex = Math.max(0, pageIndex - 1);
    const endIndex = Math.min(visibleEntries.length, pageIndex + 2);
    return visibleEntries.slice(startIndex, endIndex);
  }, [isGalleryView, pageIndex, visibleEntries]);

  const clearPendingViewTimers = useCallback(() => {
    Object.values(viewTimers.current).forEach(clearTimeout);
    viewTimers.current = {};
  }, []);

  const cancelScheduledCardRestore = useCallback(() => {
    if (restoreScrollTimeout.current !== null) {
      window.clearTimeout(restoreScrollTimeout.current);
      restoreScrollTimeout.current = null;
    }
  }, []);

  const scheduleStoredCardRestore = useCallback((targetId: string) => {
    cancelScheduledCardRestore();
    const stored = lastPositions.current[targetId] || 0;
    setPageIndex(stored);
    restoreScrollTimeout.current = window.setTimeout(() => {
      const target = containerRef.current?.querySelector(
        `[data-index="${stored}"]`
      ) as HTMLElement | null;
      if (target) containerRef.current?.scrollTo({ top: target.offsetTop, behavior: "auto" });
      else containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
      restoreScrollTimeout.current = null;
    }, 0);
  }, [cancelScheduledCardRestore]);

  useEffect(() => cancelScheduledCardRestore, [cancelScheduledCardRestore]);

  useEffect(() => {
    if (!activeChannel || visibleEntries.length === 0) return;
    const count = visibleEntries.filter(
      (entry) => {
        const status = getEntryStatus(statuses, entry.arxivId);
        return status !== "viewed" && status !== "read";
      }
    ).length;
    setUnviewedCounts((p) => ({ ...p, [activeChannel.id]: count }));
  }, [activeChannel, statuses, visibleEntries]);

  useEffect(() => {
    if (!activeChannel && !activeList && channels[0]) {
      setActiveId(channels[0].id);
    }
  }, [activeChannel, activeList, channels, setActiveId]);

  useEffect(() => {
    if (activeList) {
      setLoading(false);
      setError(null);
      clearPendingViewTimers();
      cancelScheduledCardRestore();
      setPageIndex(0);
      window.requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
      return;
    }
    if (!activeChannel || !activeChannelCacheKey) return;

    const cachedFeed = feedCache[activeChannelCacheKey];
    if (isFeedCacheFresh(cachedFeed)) {
      setLoading(false);
      setError(null);
      setEntries(cachedFeed.entries);
      setLoadedChannelId(activeChannel.id);
      clearPendingViewTimers();
      scheduleStoredCardRestore(activeChannel.id);
      return;
    }

    let cancelled = false;
    (async () => {
      cancelScheduledCardRestore();
      if (cachedFeed?.entries.length) {
        setEntries(cachedFeed.entries);
        setLoadedChannelId(activeChannel.id);
        scheduleStoredCardRestore(activeChannel.id);
      } else {
        setEntries(null);
        setLoadedChannelId(null);
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchArxiv(activeChannel);
        if (cancelled) return;
        clearPendingViewTimers();
        if (!cachedFeed?.entries.length) {
          setEntries(res);
          setLoadedChannelId(activeChannel.id);
        }
        setFeedCache((prevCache) => ({
          ...prevCache,
          [activeChannelCacheKey]: createFeedCacheEntry(res),
        }));
        if (!cachedFeed?.entries.length) {
          scheduleStoredCardRestore(activeChannel.id);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Failed to load papers from arXiv"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      cancelScheduledCardRestore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id, activeList?.id]);

  useEffect(() => {
    if (visibleEntries.length === 0 || isGalleryView) return;
    const observerRoot = containerRef.current;
    if (!observerRoot) return;

    const observer = new IntersectionObserver(
      (items) => {
        items.forEach(async (it) => {
          const idx = Number((it.target as HTMLElement).dataset.index);
          const arxivId = visibleEntries[idx]?.arxivId;
          if (it.isIntersecting && it.intersectionRatio >= 0.72) {
            setPageIndex(idx);
            if (arxivId) {
              clearTimeout(viewTimers.current[arxivId]);
              const status = getEntryStatus(statusesRef.current, arxivId);
              if (status !== "read" && status !== "viewed") {
                viewTimers.current[arxivId] = setTimeout(() => {
                  const statusKey = getStatusKey(arxivId);
                  setStatuses((p) => ({
                    ...p,
                    [statusKey]: p[statusKey] === "read" ? "read" : "viewed",
                  }));
                }, 2000);
              }
            }
          } else if (arxivId) {
            clearTimeout(viewTimers.current[arxivId]);
          }
        });
      },
      { root: observerRoot, threshold: [0.72] }
    );

    const cards = containerRef.current?.querySelectorAll("[data-card=true]");
    cards?.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [isGalleryView, setStatuses, visibleEntries]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (isGalleryView) return;
    lastPositions.current[activeIdRef.current] = pageIndex;
  }, [isGalleryView, pageIndex]);

  useEffect(() => {
    if (!openaiKey || entriesForEnrichment.length === 0) return;
    let cancelled = false;

    void loadOrgInfoForEntries({
      entries: entriesForEnrichment,
      openAiKey: openaiKey,
      orgCache: orgCacheRef.current,
      pendingArxivIds: pendingOrgFetchIds.current,
      onEntriesLoaded: (loadedEntries) => {
        if (cancelled) return;
        setOrgCache((prevCache) => {
          const nextEntries = Object.entries(loadedEntries).filter(
            ([arxivId]) => prevCache[arxivId] === undefined,
          );
          if (nextEntries.length === 0) return prevCache;
          return Object.fromEntries([
            ...Object.entries(prevCache),
            ...nextEntries,
          ]);
        });
      },
      onPendingCountChange: (pendingCount) => {
        setOrgLoadingCount(pendingCount);
      },
      shouldCancel: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [entriesForEnrichment, openaiKey, setOrgCache]);

  useEffect(() => {
    if (isGalleryView) return;

    const el = containerRef.current;
    if (!el) return;
    el.style.overflowY = "auto";
    if (isTouchDevice) {
      el.style.setProperty("-webkit-overflow-scrolling", "touch");
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

    window.addEventListener("keydown", onKeyDown as EventListener);

      return () => {
        el.style.overflowY = "";
        el.style.removeProperty("-webkit-overflow-scrolling");
        window.removeEventListener("keydown", onKeyDown as EventListener);
      };
  }, [isGalleryView, isTouchDevice, pageIndex, scrollToIndex]);

  function openSaveMenu(entry: ArxivEntry) {
    markRead(entry.arxivId);
    setSaveTarget(entry);
  }

  function closeSaveMenu() {
    setSaveTarget(null);
    setNewListName("");
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
    const statusKey = getStatusKey(id);
    setStatuses((p) => ({ ...p, [statusKey]: "read" }));
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

  async function handleSaveOpenAiKey(nextApiKey: string) {
    setOpenaiKey(nextApiKey);
    if (!nextApiKey) {
      setOpenaiKeyStorageMode(
        isEncryptedBrowserStorageAvailable()
          ? "encrypted-browser"
          : "session-only",
      );
      return;
    }

    if (!isEncryptedBrowserStorageAvailable()) {
      setOpenaiKeyStorageMode("session-only");
      return;
    }

    await saveOpenAiKeyToBrowser(nextApiKey);
    setOpenaiKeyStorageMode("encrypted-browser");
  }

  async function handleClearOpenAiKey() {
    setOpenaiKey("");
    if (!isEncryptedBrowserStorageAvailable()) {
      setOpenaiKeyStorageMode("session-only");
      return;
    }

    await clearOpenAiKeyFromBrowser();
    setOpenaiKeyStorageMode("encrypted-browser");
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

  const firstUnseenIndex = useMemo(
    () =>
      visibleEntries.findIndex(
        (entry) => {
          const status = getEntryStatus(statuses, entry.arxivId);
          return status !== "viewed" && status !== "read";
        }
      ),
    [visibleEntries, statuses]
  );

  const activateChannel = useCallback(
    (channelId: string) => {
      startTransition(() => {
        setActiveId(channelId);
      });
    },
    [setActiveId],
  );

  const activateList = useCallback(
    (listId: string) => {
      startTransition(() => {
        setActiveId(`list:${listId}`);
      });
    },
    [setActiveId],
  );
  const getStatusForEntry = useCallback(
    (arxivId: string) => getEntryStatus(statuses, arxivId),
    [statuses],
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
          onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
        />

        <FeedPickerStrip
          activeId={activeId}
          channels={channels}
          longPressTriggeredRef={longPressTriggered}
          onActivateChannel={activateChannel}
          onActivateList={activateList}
          onCancelLongPress={cancelLongPress}
          onRemoveChannel={removeChannel}
          onRemoveList={removeList}
          onStartLongPress={startLongPress}
          savedLists={savedLists}
          unviewedCounts={unviewedCounts}
        />

      {saveTarget && (
        <SaveToListModal
          newListName={newListName}
          onClose={closeSaveMenu}
          onCreateList={createList}
          onNewListNameChange={setNewListName}
          onTogglePaperInList={togglePaperInList}
          savedLists={savedLists}
          saveTarget={saveTarget}
        />
      )}

      <SearchModal
        isOpen={searching}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSubmit={performSearch}
        onClose={() => {
          setSearching(false);
          setSearchInput("");
          setSearchResults([]);
          setSearchError(null);
          setSearchLoading(false);
        }}
        searchLoading={searchLoading}
        searchError={searchError}
        searchResults={searchResults}
        onOpenSaveMenu={openSaveMenu}
        onMarkRead={markRead}
        isSaved={isSaved}
      />

      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        initialApiKey={openaiKey}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={handleSaveOpenAiKey}
        onClear={handleClearOpenAiKey}
        repoUrl="https://github.com/olliepro/Scroll"
        storageMode={openaiKeyStorageMode}
      />

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

      <div
        ref={containerRef}
        className={clsx(
          "flex-1 relative",
          isGalleryView && "overflow-y-auto",
          !isGalleryView && "overflow-y-auto no-scrollbar snap-y snap-mandatory overscroll-y-contain",
        )}
      >
        {showVisibleEntries && (
          <div className="h-full w-full relative">
            <PaperFeed
              activeList={activeList}
              deckEntries={renderedDeckEntries}
              getStatus={getStatusForEntry}
              isGalleryView={isGalleryView}
              orgCache={orgCache}
              visibleEntries={visibleEntries}
              isSaved={isSaved}
              markRead={markRead}
              openSaveMenu={openSaveMenu}
            />
          </div>
        )}
        <FeedStateOverlay
          error={error}
          orgLoading={orgLoading}
          showBlockingError={showBlockingError}
          showBlockingLoader={showBlockingLoader}
          showInlineError={showInlineError}
          showInlineRefreshIndicator={showInlineRefreshIndicator}
        />
      </div>

      {!isGalleryView && firstUnseenIndex >= 0 && firstUnseenIndex !== pageIndex && (
        <button
          className="fixed bottom-20 right-4 z-20 px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-sm shadow-lg shadow-black/30"
          onClick={() => scrollToIndex(firstUnseenIndex)}
        >
          Jump to latest unseen
        </button>
      )}
    </div>
  );
}
