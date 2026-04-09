import { KeyRound, Plus, Search } from "lucide-react";

type ProudfootProjectHeaderProps = {
  logoUrl: string;
  onOpenChannelCreator: () => void;
  onOpenSearch: () => void;
  onPromptApiKey: () => void;
};

/**
 * Renders the site-aligned header for the Scroll project page.
 *
 * @param props - Callback handlers for project actions and the project mark asset.
 * @returns A compact top bar matching the personal site's palette and navigation.
 *
 * @example
 * <ProudfootProjectHeader
 *   logoUrl={scrollIconUrl}
 *   onOpenChannelCreator={() => setAdding(true)}
 *   onOpenSearch={() => setSearching(true)}
 *   onPromptApiKey={promptApiKey}
 * />
 */
export function ProudfootProjectHeader({
  logoUrl,
  onOpenChannelCreator,
  onOpenSearch,
  onPromptApiKey,
}: ProudfootProjectHeaderProps) {
  return (
    <header className="scroll-project-bar shrink-0">
      <div className="scroll-project-bar-inner">
        <div className="scroll-project-brand">
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
          <div className="scroll-project-copy">
            <p className="scroll-project-kicker">Oliver Proudfoot / Projects</p>
            <h1 className="scroll-project-title">Scroll</h1>
          </div>
        </div>
        <div className="scroll-project-actions">
          <button
            className="scroll-action-button"
            onClick={onPromptApiKey}
            type="button"
          >
            <KeyRound className="h-4 w-4" />
            API Key
          </button>
          <button
            className="scroll-action-button"
            onClick={onOpenSearch}
            type="button"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            className="scroll-action-button scroll-action-button--primary"
            onClick={onOpenChannelCreator}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Channel
          </button>
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
        </div>
      </div>
    </header>
  );
}
