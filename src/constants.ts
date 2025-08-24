import type { Channel } from "./types";

export const LS_CHANNELS = "arxiv-reels:channels";
export const LS_LISTS = "arxiv-reels:lists";
export const LS_LAST_CHANNEL = "arxiv-reels:last-channel";
export const LS_STATUSES = "arxiv-reels:statuses";
export const LS_OPENAI_KEY = "arxiv-reels:openai-key";
export const LS_ORG_CACHE = "arxiv-reels:org-cache";

export const defaultChannels: Channel[] = [
  {
    id: "recent-ml",
    name: "Fresh ML",
    keywords: "",
    maxResults: 50,
  },
  {
    id: "ai-theory",
    name: "AI Theory",
    keywords: "generalization PAC bounds optimization",
    maxResults: 40,
  },
  {
    id: "robotics",
    name: "Robotics",
    keywords: "robot manipulation locomotion policy",
    maxResults: 40,
  },
];
