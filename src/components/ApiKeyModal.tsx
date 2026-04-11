import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import openAiMarkWhiteUrl from "../assets/openai-mark-white.png";
import { clsx } from "../lib/utils";

type ApiKeyModalProps = {
  isOpen: boolean;
  initialApiKey: string;
  onClose: () => void;
  onSave: (nextApiKey: string) => Promise<void>;
  onClear: () => Promise<void>;
  repoUrl: string;
  storageMode: "loading" | "encrypted-browser" | "session-only";
};

type PreviewBadge = {
  label: string;
  tone: "openai" | "neutral";
};

const previewBadges: PreviewBadge[] = [
  { label: "OpenAI", tone: "openai" },
  { label: "Ohio State", tone: "neutral" },
  { label: "MILA", tone: "neutral" },
];

/**
 * Renders the static paper-card preview shown inside the API key modal.
 *
 * @returns A styled fake paper card demonstrating affiliation badge output.
 */
function ApiKeyPreviewCard() {
  return (
    <div className="scroll-api-preview-card">
      <div className="scroll-api-preview-card__toolbar">
        <span className="scroll-api-preview-card__date">Apr 11, 2026</span>
        <div className="scroll-api-preview-card__actions">
          <span>Open</span>
          <span>PDF</span>
          <span>Save</span>
        </div>
      </div>
      <div className="scroll-api-preview-card__body">
        <h3 className="scroll-api-preview-card__title">
          Agentic Paper Routing with Affiliation-Aware Triage
        </h3>
        <p className="scroll-api-preview-card__authors">
          Ada Example, Mira Chen, Alex Rivera, Noor Patel
        </p>
        <div className="scroll-api-preview-card__badges">
          {previewBadges.map((badge) => (
            <span
              key={badge.label}
              className={clsx(
                "scroll-api-preview-card__badge",
                badge.tone === "openai" &&
                  "scroll-api-preview-card__badge--openai",
              )}
            >
              {badge.tone === "openai" && (
                <img
                  src={openAiMarkWhiteUrl}
                  alt=""
                  className="scroll-api-preview-card__badge-icon"
                />
              )}
              {badge.label}
            </span>
          ))}
        </div>
        <p className="scroll-api-preview-card__summary">
          Affiliation badges appear right under the author line after the app
          sends the paper&apos;s author block to OpenAI and normalizes the
          organization names for display.
        </p>
      </div>
      <div className="scroll-api-preview-card__footer">
        <span className="scroll-api-preview-card__altmetric">Altmetric</span>
        <span className="scroll-api-preview-card__arxiv">arXiv 2604.12345</span>
      </div>
    </div>
  );
}

/**
 * Explains the client-side API key flow in an expandable section.
 *
 * @param props - Public source URL for users who want to inspect the code path.
 * @returns A disclosure panel describing storage, network flow, and trust boundaries.
 */
function ApiKeyFlowDetails({ repoUrl }: { repoUrl: string }) {
  return (
    <details className="scroll-api-details">
      <summary className="scroll-api-details__summary">
        <span>How it works</span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="scroll-api-details__body">
        <p>
          The key stays local to this browser. The site does not proxy your
          OpenAI key through a server-side secret owned by the site.
        </p>
        <ol className="scroll-api-details__list">
          <li>The app fetches the paper&apos;s author block from arXiv.</li>
          <li>
            Your browser sends that extracted affiliation text directly to{" "}
            <code>api.openai.com</code> with your OpenAI API key.
          </li>
          <li>
            GPT-5 Nano returns normalized institution names, and the app
            renders them as badge chips on the paper card.
          </li>
        </ol>
        <p>
          This path is intentionally cheap. It uses OpenAI&apos;s GPT-5 Nano
          model for lightweight affiliation extraction instead of a larger
          model.
        </p>
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="scroll-api-source-link"
        >
          <ExternalLink className="h-4 w-4" />
          View the source code
        </a>
      </div>
    </details>
  );
}

/**
 * Renders the in-app OpenAI API key modal for affiliation extraction.
 *
 * @param props - Modal visibility, persisted key value, and save/clear handlers.
 * @returns The modal when open, otherwise null.
 *
 * @example
 * <ApiKeyModal
 *   isOpen={apiKeyModalOpen}
 *   initialApiKey={openaiKey}
 *   onClose={() => setApiKeyModalOpen(false)}
 *   onSave={(nextApiKey) => setOpenaiKey(nextApiKey)}
 *   onClear={() => setOpenaiKey("")}
 *   repoUrl="https://github.com/olliepro/Scroll"
 * />
 */
export function ApiKeyModal({
  isOpen,
  initialApiKey,
  onClose,
  onSave,
  onClear,
  repoUrl,
  storageMode,
}: ApiKeyModalProps) {
  const [draftApiKey, setDraftApiKey] = useState(initialApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasSavedKey = useMemo(() => initialApiKey.trim().length > 0, [initialApiKey]);

  useEffect(() => {
    if (!isOpen) return;
    setDraftApiKey(initialApiKey);
    setShowApiKey(false);
    setSaving(false);
  }, [initialApiKey, isOpen]);

  const storageMessage =
    storageMode === "loading"
      ? "Preparing local browser storage for your OpenAI key."
      : "This key stays local to this browser on this device and is used only for affiliation extraction on paper cards.";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="scroll-api-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="scroll-api-close"
          onClick={onClose}
          type="button"
          aria-label="Close OpenAI API key modal"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="scroll-api-hero">
          <div className="scroll-api-hero__copy">
            <div className="scroll-api-kicker">
              <img src={openAiMarkWhiteUrl} alt="" className="scroll-api-kicker__icon" />
              OpenAI Affiliation Enrichment
            </div>
            <h2 className="scroll-api-title">Use your own OpenAI API key</h2>
            <p className="scroll-api-subtitle">
              Turn raw author lines into institution badges on paper cards. This
              accepts an OpenAI API key only, not ChatGPT login credentials.
              Super cheap affiliation extraction, powered by GPT-5 Nano.
            </p>
            <div className="scroll-api-trust-row">
              <span className="scroll-api-trust-pill">
                <ShieldCheck className="h-4 w-4" />
                Local to this browser
              </span>
              <span className="scroll-api-trust-pill">
                <KeyRound className="h-4 w-4" />
                Sent directly to OpenAI
              </span>
              <span className="scroll-api-trust-pill">
                <Sparkles className="h-4 w-4" />
                GPT-5 Nano, low cost
              </span>
            </div>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="scroll-api-source-link"
            >
              <ExternalLink className="h-4 w-4" />
              Curious? Inspect the source code
            </a>
          </div>
          <div className="scroll-api-preview">
            <p className="scroll-api-preview__kicker">Paper Card Preview</p>
            <ApiKeyPreviewCard />
          </div>
        </div>
        <div className="scroll-api-form">
          <label htmlFor="openai-api-key" className="scroll-api-label">
            OpenAI API key
          </label>
          <div className="scroll-api-input-row">
            <img src={openAiMarkWhiteUrl} alt="" className="scroll-api-input-logo" />
            <input
              id="openai-api-key"
              type={showApiKey ? "text" : "password"}
              value={draftApiKey}
              onChange={(event) => setDraftApiKey(event.target.value)}
              placeholder="sk-..."
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="scroll-api-input"
            />
            <button
              className="scroll-api-ghost-button"
              onClick={() => setShowApiKey((currentState) => !currentState)}
              type="button"
              aria-label={showApiKey ? "Hide API key" : "Show API key"}
              title={showApiKey ? "Hide API key" : "Show API key"}
            >
              {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <p className="scroll-api-form__hint">
            {storageMessage}
          </p>
          {hasSavedKey && (
            <div className="scroll-api-saved-banner">
              An OpenAI API key is already available in this browser.
            </div>
          )}
          <ApiKeyFlowDetails repoUrl={repoUrl} />
          <div className="scroll-api-actions">
            <button className="scroll-api-secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="scroll-api-secondary-button"
              onClick={async () => {
                setSaving(true);
                await onClear();
                setDraftApiKey("");
                setShowApiKey(false);
                setSaving(false);
              }}
              disabled={saving || (!hasSavedKey && !draftApiKey.trim())}
              type="button"
            >
              Forget
            </button>
            <button
              className="scroll-api-primary-button"
              onClick={async () => {
                setSaving(true);
                await onSave(draftApiKey.trim());
                setSaving(false);
                onClose();
              }}
              disabled={saving || !draftApiKey.trim()}
              type="button"
            >
              {saving ? "Saving..." : "Save key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
