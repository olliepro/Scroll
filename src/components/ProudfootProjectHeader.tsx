import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Home, KeyRound, Plus, Search, X } from "lucide-react";

type ProudfootProjectHeaderProps = {
  logoUrl: string;
  onOpenChannelCreator: () => void;
  onOpenSearch: () => void;
  onOpenApiKeyModal: () => void;
};

type HeaderAction = {
  icon: typeof KeyRound;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary";
};

/**
 * Tracks whether the inline header actions fit without wrapping.
 *
 * @param containerRef - Ref for the full header row.
 * @param brandRef - Ref for the left-side brand block.
 * @param actionsRef - Ref for a hidden width-measurement block of all actions.
 * @returns Whether the header should collapse actions into a menu.
 *
 * @example
 * const isCompact = useCompactHeaderLayout({
 *   containerRef,
 *   brandRef,
 *   actionsRef,
 * });
 */
function useCompactHeaderLayout({
  containerRef,
  brandRef,
  actionsRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  brandRef: React.RefObject<HTMLDivElement | null>;
  actionsRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isCompact, setIsCompact] = useState(false);

  useLayoutEffect(() => {
    function updateCompactState() {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const brandWidth = brandRef.current?.scrollWidth ?? 0;
      const actionsWidth = actionsRef.current?.scrollWidth ?? 0;
      setIsCompact(brandWidth + actionsWidth + 32 > containerWidth);
    }

    updateCompactState();
    const observer = new ResizeObserver(() => updateCompactState());
    if (containerRef.current) observer.observe(containerRef.current);
    if (brandRef.current) observer.observe(brandRef.current);
    if (actionsRef.current) observer.observe(actionsRef.current);
    window.addEventListener("resize", updateCompactState);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCompactState);
    };
  }, [actionsRef, brandRef, containerRef]);

  return isCompact;
}

function HeaderActionButtons({ actions }: { actions: HeaderAction[] }) {
  return (
    <>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            className={[
              "scroll-action-button",
              action.tone === "primary" ? "scroll-action-button--primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={action.onClick}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        );
      })}
    </>
  );
}

function HeaderMenuItems({
  actions,
  onCloseMenu,
}: {
  actions: HeaderAction[];
  onCloseMenu: () => void;
}) {
  return (
    <>
      <a
        className="scroll-project-menu-item"
        href="/"
        onClick={onCloseMenu}
        role="menuitem"
      >
        <Home className="h-4 w-4" />
        Home
      </a>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            className={[
              "scroll-project-menu-item",
              action.tone === "primary" ? "scroll-project-menu-item--primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              onCloseMenu();
              action.onClick();
            }}
            role="menuitem"
            type="button"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        );
      })}
    </>
  );
}

function HeaderMenuOverlay({
  actions,
  onCloseMenu,
}: {
  actions: HeaderAction[];
  onCloseMenu: () => void;
}) {
  return createPortal(
    <div className="scroll-project-menu-overlay" role="presentation">
      <button
        aria-label="Close project actions"
        className="scroll-project-backdrop"
        onClick={onCloseMenu}
        type="button"
      />
      <div
        aria-label="Project actions"
        className="scroll-project-menu-panel"
        role="menu"
      >
        <div className="scroll-project-menu-header">
          <p className="scroll-project-menu-kicker">Project Actions</p>
          <button
            aria-label="Close project actions"
            className="scroll-project-menu-close"
            onClick={onCloseMenu}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <HeaderMenuItems actions={actions} onCloseMenu={onCloseMenu} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * Renders the site-aligned header for the Scroll project page.
 *
 * @param props - Callback handlers for project actions and the project mark asset.
 * @returns A responsive top bar that collapses actions into a menu when space runs out.
 *
 * @example
 * <ProudfootProjectHeader
 *   logoUrl={scrollIconUrl}
 *   onOpenChannelCreator={() => setAdding(true)}
 *   onOpenSearch={() => setSearching(true)}
 *   onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
 * />
 */
export function ProudfootProjectHeader({
  logoUrl,
  onOpenChannelCreator,
  onOpenSearch,
  onOpenApiKeyModal,
}: ProudfootProjectHeaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const brandRef = useRef<HTMLDivElement | null>(null);
  const actionsMeasureRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const actions = useMemo<HeaderAction[]>(
    () => [
      { icon: KeyRound, label: "OpenAI Key", onClick: onOpenApiKeyModal },
      { icon: Search, label: "Search", onClick: onOpenSearch },
      {
        icon: Plus,
        label: "Channel",
        onClick: onOpenChannelCreator,
        tone: "primary",
      },
    ],
    [onOpenApiKeyModal, onOpenChannelCreator, onOpenSearch],
  );
  const isCompact = useCompactHeaderLayout({
    containerRef,
    brandRef,
    actionsRef: actionsMeasureRef,
  });

  useEffect(() => {
    if (!isCompact) setMenuOpen(false);
  }, [isCompact]);

  useEffect(() => {
    const shouldLockPage = isCompact && menuOpen;
    document.body.classList.toggle("scroll-menu-open", shouldLockPage);
    return () => {
      document.body.classList.remove("scroll-menu-open");
    };
  }, [isCompact, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="scroll-project-bar shrink-0">
      <div className="scroll-project-bar-inner" ref={containerRef}>
        <div className="scroll-project-brand" ref={brandRef}>
          <div
            aria-hidden="true"
            className="scroll-project-mark"
            style={{
              WebkitMaskImage: `url(${logoUrl})`,
              maskImage: `url(${logoUrl})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
          <h1 className="scroll-project-title">
            <span className="scroll-project-title-alpha">α</span>
            <span>Scroll</span>
          </h1>
        </div>
        <div className="scroll-project-measure" ref={actionsMeasureRef}>
          <HeaderActionButtons actions={actions} />
          <a className="scroll-home-link" href="/" aria-hidden="true" tabIndex={-1}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </a>
        </div>
        <div
          className={[
            "scroll-project-actions",
            menuOpen ? "scroll-project-actions--menu-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isCompact ? (
            <>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Open project actions"
                className="scroll-menu-toggle"
                onClick={() => setMenuOpen((currentState) => !currentState)}
                type="button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  menu
                </span>
              </button>
              {menuOpen && <HeaderMenuOverlay actions={actions} onCloseMenu={() => setMenuOpen(false)} />}
            </>
          ) : (
            <>
              <HeaderActionButtons actions={actions} />
              <a className="scroll-home-link" href="/" aria-label="Home" title="Home">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
