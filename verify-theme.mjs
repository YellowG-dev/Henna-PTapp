// Theme verification — run: node verify-theme.mjs
//
// Needs no node_modules. It imports core/themes.js (pure data, no React) and
// reads app.jsx and config.jsx as TEXT, so it cannot be broken by a missing
// install and runs in any of the three client repos unchanged.
//
// What it is for: Phase 0 moved the theme from a module-load constant to a
// runtime value and turned 30 hardcoded colours into tokens, across a file
// three people use daily, in repos that had no tests of any kind. This is the
// harness that says the refactor changed nothing.
//
// BASELINE below is what each app rendered BEFORE Phase 0, transcribed from
// the pre-refactor source. Phase 0 must reproduce it exactly. Phase 1 will
// deliberately break the contrast assertions at the bottom — that is the point
// of Phase 1, and those are reported, not asserted.

import fs from "fs";
import { THEMES, THEME_IDS, buildTheme } from "./src/core/themes.js";

const appSrc = fs.readFileSync("./src/app.jsx", "utf8");
const configSrc = fs.readFileSync("./src/config.jsx", "utf8");

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got      ${a}\n        expected ${e}`}`);
}
function ok(label, cond) {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
}

/* ------------------------------ the baseline ------------------------------ */

const BASELINE = {
  "amber-slate": {
    BG: "#10131A", CARD: "#1A1F29", BORDER: "#2A3140",
    TEXT_PRIMARY: "#EEF0F3", TEXT_SECONDARY: "#8891A3", TEXT_MUTED: "#5C6577",
    ACCENT: "#E3A23C", ACCENT_2: "#4CB6C4", HEAT_RGB: "111,207,151",
    FONT_DISPLAY: "'Space Grotesk', system-ui, sans-serif",
    FONT_BODY: "'IBM Plex Sans', system-ui, sans-serif",
    FONT_MONO: "'IBM Plex Mono', ui-monospace, monospace",
  },
  "rose-linen": {
    BG: "#FBF7F4", CARD: "#FFFFFF", BORDER: "#EADFD8",
    TEXT_PRIMARY: "#2E2724", TEXT_SECONDARY: "#7A6A62", TEXT_MUTED: "#A2938B",
    ACCENT: "#C97388", ACCENT_2: "#7FB88F", HEAT_RGB: "201,115,136",
    FONT_DISPLAY: "'Fraunces', Georgia, serif",
    FONT_BODY: "'Karla', system-ui, sans-serif",
    FONT_MONO: "'IBM Plex Mono', ui-monospace, monospace",
  },
};

// The literals that used to sit inline in app.jsx, and the token each became.
const LITERALS = [
  ["ON_ACCENT", "#fff"],
  ["BADGE.neutral.tint", "rgba(136,145,163,0.16)"],
  ["BADGE.neutral.border", "rgba(136,145,163,0.45)"],
  ["BADGE.ramp.tint", "rgba(127,184,143,0.16)"],
  ["BADGE.ramp.border", "rgba(127,184,143,0.45)"],
  ["BADGE.ramp.text", "#4C7A5A"],
  ["BADGE.gentler.tint", "rgba(201,115,136,0.14)"],
  ["BADGE.gentler.border", "rgba(201,115,136,0.4)"],
  ["BADGE.moved.tint", "rgba(169,155,201,0.16)"],
  ["BADGE.moved.border", "rgba(169,155,201,0.45)"],
  ["BADGE.moved.text", "#6D5F91"],
  ["TINT.soft", "rgba(201,115,136,0.1)"],
  ["TINT.softBorder", "rgba(201,115,136,0.3)"],
  ["TINT.selected", "rgba(201,115,136,0.12)"],
];

const dig = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

/* --------------------------- 1. themes are complete ----------------------- */

console.log("--- every theme carries every token ---");
const REQUIRED = [
  "id", "label", "mode", "BG", "CARD", "BORDER", "TEXT_PRIMARY", "TEXT_SECONDARY",
  "TEXT_MUTED", "ACCENT", "ACCENT_2", "ON_ACCENT", "OK", "HEAT_RGB", "TINT", "BADGE",
  "FONT_DISPLAY", "FONT_BODY", "FONT_MONO", "FONT_IMPORT",
];
THEME_IDS.forEach((id) => {
  const missing = REQUIRED.filter((k) => THEMES[id][k] == null);
  check(`${id}: no missing tokens`, missing, []);
  const badges = Object.keys(THEMES[id].BADGE).sort();
  check(`${id}: the four status badges`, badges, ["gentler", "moved", "neutral", "ramp"]);
  check(`${id}: tint keys`, Object.keys(THEMES[id].TINT).sort(), ["selected", "soft", "softBorder"]);
});
ok("theme ids match their map keys", THEME_IDS.every((id) => THEMES[id].id === id));

/* ------------------------- 2. this repo renders as before ------------------ */

console.log("\n--- this repo reproduces its pre-Phase-0 values ---");
const idMatch = configSrc.match(/export const DEFAULT_THEME_ID = "([^"]+)"/);
ok("config.jsx declares a DEFAULT_THEME_ID", Boolean(idMatch));
const themeId = idMatch && idMatch[1];
ok(`DEFAULT_THEME_ID "${themeId}" exists in themes.js`, Boolean(THEMES[themeId]));

const base = BASELINE[themeId];
Object.keys(base).forEach((k) => check(`${k} unchanged`, THEMES[themeId][k], base[k]));
LITERALS.forEach(([path, value]) =>
  check(`${path} carries the old literal`, dig(THEMES[themeId], path), value)
);

/* ------------------------- 3. the refactor is complete --------------------- */

console.log("\n--- app.jsx ---");
const leftovers = appSrc.match(/"#[0-9A-Fa-f]{3,8}"|rgba\([0-9., ]*\)/g) || [];
check("no colour literal survives in app.jsx", [...new Set(leftovers)].sort(), []);
ok("module-scope THEME destructuring is gone", !/^const \{\n[^}]*\} = THEME;/m.test(appSrc));
ok("useTheme() is defined", /function useTheme\(\)/.test(appSrc));
ok("a provider wraps the tree", /<ThemeContext.Provider value=\{THEME\}>/.test(appSrc));
ok("entry point still exports HennaApp by default", /export default function HennaApp\(\)/.test(appSrc));

// A token dropped into a JSX ATTRIBUTE needs braces: color={ON_ACCENT}, never
// color=ON_ACCENT. The latter is a syntax error the build catches, but only
// after a failed deploy, so it is cheaper to catch here. Five sites in app.jsx
// are attribute-position and were broken by the first version of this refactor.
const bareAttr = appSrc.match(/\b\w+=(ON_ACCENT|TINT|BADGE|ACCENT|BG|CARD|BORDER)\b/g) || [];
check("no token sits unbraced in a JSX attribute", [...new Set(bareAttr)].sort(), []);

// Every component that reads a token must call the hook first. Counting them
// is what catches a component added later that quietly uses a stale binding.
const hookCalls = (appSrc.match(/\} = useTheme\(\);/g) || []).length;
check("six components call useTheme()", hookCalls, 6);
const hookIdx = appSrc.indexOf("} = useTheme();");
const firstUse = appSrc.search(/style=\{\{[^}]*\b(BG|CARD|ACCENT|TEXT_MUTED)\b/);
ok("the first hook call precedes the first token use", hookIdx > -1 && hookIdx < firstUse);

// Every name destructured from the hook must exist in every theme, or a theme
// switch would hand a component `undefined` and render an invisible element.
const destructured = [...appSrc.matchAll(/const \{([^}]+)\} = useTheme\(\);/g)]
  .flatMap((m) => m[1].split(",").map((s) => s.trim().split(":")[0].trim()))
  .filter(Boolean);
const perTheme = THEME_IDS.map((id) => {
  const t = buildTheme(id, { mobility: { color: "#000" } });
  return destructured.filter((k) => t[k] === undefined);
});
check("every destructured token resolves in every theme", [...new Set(perTheme.flat())], []);

/* ------------------------------- 4. contrast ------------------------------ */
// Reported, not asserted. Phase 0 must not change these; Phase 1 must fix them.

const hex = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
const lum = (c) => {
  const s = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};
const rgbaParts = (s) => {
  const [r, g, b, a] = s.replace(/rgba?\(|\)/g, "").split(",").map(Number);
  return [[r, g, b], a];
};

console.log("\n--- contrast (WCAG AA, 4.5:1 — the app's text is 10-13px, so none of it is 'large') ---");
const t = THEMES[themeId];
const C = hex(t.CARD);
const tintOn = (rgba, surface) => {
  const [rgb, a] = rgbaParts(rgba);
  return over(rgb, a, surface);
};
const pairs = [
  ["TEXT_PRIMARY on CARD", hex(t.TEXT_PRIMARY), C],
  ["TEXT_SECONDARY on CARD", hex(t.TEXT_SECONDARY), C],
  ["TEXT_MUTED on CARD", hex(t.TEXT_MUTED), C],
  ["TEXT_MUTED on BG", hex(t.TEXT_MUTED), hex(t.BG)],
  ["ON_ACCENT on ACCENT", hex(t.ON_ACCENT), hex(t.ACCENT)],
  ["ACCENT on CARD", hex(t.ACCENT), C],
  ["ACCENT_2 on CARD", hex(t.ACCENT_2), C],
  ["BADGE.ramp.text on its tint", hex(t.BADGE.ramp.text), tintOn(t.BADGE.ramp.tint, C)],
  ["BADGE.moved.text on its tint", hex(t.BADGE.moved.text), tintOn(t.BADGE.moved.tint, C)],
  ["ACCENT on BADGE.gentler.tint", hex(t.ACCENT), tintOn(t.BADGE.gentler.tint, C)],
];
let fails = 0;
pairs.forEach(([name, fg, bg]) => {
  const r = ratio(fg, bg);
  if (r < 4.5) fails++;
  console.log(`  ${r < 4.5 ? "fail" : "ok  "} ${String(r).padStart(6)}:1  ${name}`);
});
console.log(`  ${fails} of ${pairs.length} pairs below 4.5:1 — Phase 1's target.`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
