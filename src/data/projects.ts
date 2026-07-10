// Homepage project list. Edit this array directly to add/remove/reorder —
// display order on the homepage follows array order. `liveUrl` puts a project
// in the "Live" section, `sourceUrl` puts it in "Source" (GitHub, npm, etc.);
// set both, either, or neither (neither = not shown).

export interface Project {
  name: string;
  description: string;
  liveUrl?: string;
  sourceUrl?: string;
}

export const PROJECTS: Project[] = [
  {
    name: "DepWarden",
    description:
      "Free dependency security scanner — checks every package against live OSV, CISA KEV, and EPSS data to prioritize real, exploitable vulnerabilities.",
    liveUrl: "https://depwarden.in",
  },
  {
    name: "URL Shortener",
    description: "Personal branded URL shortener with content-aware slugs, click analytics, and a Telegram bot.",
    liveUrl: "/create",
  },
  {
    name: "Lowdep",
    description: "40 zero-dependency CLI tools — csv-peek, changelog-gen, envdead, and more, published to npm.",
    liveUrl: "https://www.npmjs.com/search?q=lowdep",
  },
  {
    name: "Voucher Tracker",
    // TODO: guessed from the app name only — replace with a real description.
    description: "Track and organize vouchers and coupons in one place.",
    liveUrl: "https://frontend-two-woad-69.vercel.app",
  },
  {
    name: "ClipForge",
    // TODO: add liveUrl / sourceUrl once deployed or pushed to GitHub — this
    // entry won't render on the homepage until at least one is set.
    description: "Web app for resizing and converting video clips.",
  },
];
