// Per-page <title>, meta description, and robots tag. Private pages are kept out of search engines.
import { matchPath } from "react-router-dom";

const SITE = "Work & Brew";
const DEFAULT_DESCRIPTION =
  "Scout-verified NYC cafés for getting work done: Wi-Fi, outlets, seating, and noise checked in person by the Work & Brew team.";

const PAGES = [
  { path: "/", title: "Work & Brew Café Map: Scout-Verified NYC Cafés to Work From", description: DEFAULT_DESCRIPTION },
  { path: "/about", title: `About Us | ${SITE}`, description: "Meet the Work & Brew team and the café scouts who visit every NYC café in person before it goes on the map." },
  { path: "/for-owners", title: `For Café Owners & Creators | ${SITE}`, description: "Own a NYC café or create content? Get discovered by remote workers and students who want spots worth coming back to." },
  { path: "/event", title: `Events | ${SITE}`, description: "Work & Brew pop-ups and coworking sessions at partnered NYC cafés." },
  { path: "/scout-signup", title: `Join the Café Scouts | ${SITE}`, description: "Sign up to scout NYC cafés with Work & Brew." },
  { path: "/privacy", title: `Privacy Policy | ${SITE}`, description: "How Work & Brew collects, uses, and protects your information." },
  { path: "/terms", title: `Terms of Service | ${SITE}`, description: "The terms for using the Work & Brew website and app." },
  { path: "/sms-privacy", title: `SMS Privacy | ${SITE}`, description: "How Work & Brew handles phone numbers and text message consent." },
  { path: "/sms-terms", title: `SMS Terms | ${SITE}`, description: "Terms for Work & Brew text message reminders." },
  { path: "/login", title: `Log In | ${SITE}`, noindex: true },
  { path: "/dashboard", title: `Your Dashboard | ${SITE}`, noindex: true },
  { path: "/settings", title: `Settings | ${SITE}`, noindex: true },
  { path: "/team/:section?", title: `Team Hub | ${SITE}`, noindex: true },
  { path: "/ops/:key", title: `Scout Portal | ${SITE}`, noindex: true },
];

const NOT_FOUND = { title: `Page Not Found | ${SITE}`, noindex: true };

export function metaFor(pathname) {
  return PAGES.find((p) => matchPath({ path: p.path, end: true }, pathname)) || NOT_FOUND;
}

function setTag(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (content == null) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function applyPageMeta(pathname) {
  const meta = metaFor(pathname);
  document.title = meta.title;
  setTag("description", meta.description || DEFAULT_DESCRIPTION);
  setTag("robots", meta.noindex ? "noindex, nofollow" : null);
}
