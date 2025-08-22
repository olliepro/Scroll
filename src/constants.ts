import type { Channel } from "./types";

export const CATEGORY_LABELS: Record<string, string> = {
  "cs.AI": "Artificial Intelligence",
  "cs.CL": "Computation & Language",
  "cs.CV": "Computer Vision",
  "cs.LG": "Machine Learning",
  "cs.RO": "Robotics",
  "cs.DS": "Data Structures & Algorithms",
  "cs.NE": "Neural & Evolutionary Computing",
  "cs.IR": "Information Retrieval",
  "stat.ML": "Statistical ML",
  "math.OC": "Optimization & Control",
  "econ.EM": "Econometrics",
};

export const LS_CHANNELS = "arxiv-reels:channels";
export const LS_LISTS = "arxiv-reels:lists";
export const LS_LAST_CHANNEL = "arxiv-reels:last-channel";
export const LS_STATUSES = "arxiv-reels:statuses";

export const defaultChannels: Channel[] = [
  {
    id: "recent-ml",
    name: "Fresh ML",
    keywords: "",
    categories: ["cs.LG", "stat.ML", "cs.CV", "cs.CL"],
    maxResults: 50,
  },
  {
    id: "ai-theory",
    name: "AI Theory",
    keywords: "generalization PAC bounds optimization",
    categories: ["cs.LG", "math.OC", "cs.AI"],
    maxResults: 40,
  },
  {
    id: "robotics",
    name: "Robotics",
    keywords: "robot manipulation locomotion policy",
    categories: ["cs.RO"],
    maxResults: 40,
  },
];
