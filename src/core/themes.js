// Themes — every colour decision in the app, named by the job it does.
//
// WHY THIS FILE EXISTS
// Before this, `app.jsx` destructured THEME once at module load
// (`const { BG, CARD, ... } = THEME;`) and used bare identifiers in 315 places.
// That is resolved exactly once, when the bundle loads, so nothing could ever
// change at runtime. A theme switcher is impossible against that shape, which
// is why this file — and the `useTheme()` hook in app.jsx — exist.
//
// WHY NOT CSS CUSTOM PROPERTIES
// Because recharts passes these values straight into SVG *presentation
// attributes* (`stroke={BORDER}`, `tick={{ fill: TEXT_MUTED }}`). `var()`
// resolves in CSS declarations, not in presentation attributes, so the charts
// would silently lose their colours. Keeping real string values in JS is the
// only mechanism that works everywhere in this app.
//
// NAMING RULE
// Tokens are named for the JOB, never the colour. `ON_ACCENT`, not `WHITE`.
// The day a theme has a pale accent, `ON_ACCENT` becomes dark and every one of
// its call sites follows. A token called `WHITE` would have to be edited in 18
// places, which is the problem this file removes.
//
// THIS FILE IS BYTE-IDENTICAL ACROSS THE THREE CLIENT REPOS.
// `config.jsx` is NOT — it stays per-client and picks a default from here.

/* -------------------------------------------------------------------------
   PHASE 0 NOTE — READ BEFORE "FIXING" ANYTHING BELOW

   Phase 0 is a pure refactor: every value here is the value the app renders
   TODAY, so all three apps must look pixel-identical before and after.

   That means two known-wrong values are preserved on purpose:

     - BADGE.gentler is a ROSE tint. Rose is Henna's accent. It was hardcoded
       in the byte-identical app.jsx and paired with `color: ACCENT`, so Juha's
       and Joonatan's apps render amber text on a pink tint. Wrong today,
       wrong here, deliberately unchanged until Phase 1.
     - BADGE.moved is a LILAC tint — Henna's "yoga" category colour, same story.

   Also preserved: TINT.* are rose for the same reason, and ON_ACCENT is #fff
   everywhere even though it fails contrast on every accent in every theme.

   Phase 1 changes VALUES ONLY, touching no structure. Keeping the two phases
   separate is what makes "renders identically" a clean pass/fail in Phase 0
   and "contrast improved" a clean pass/fail in Phase 1.
   ------------------------------------------------------------------------- */

/** Shared by every theme in Phase 0 — see the note above. */
const PHASE0_BADGES = {
  // Skip day. Text colour is NOT here: it follows CATS.check.color, because
  // the badge deliberately matches the check category in each client's palette.
  neutral: { tint: "rgba(136,145,163,0.16)", border: "rgba(136,145,163,0.45)" },
  // "Week N · easing in".
  ramp: { tint: "rgba(127,184,143,0.16)", border: "rgba(127,184,143,0.45)", text: "#4C7A5A" },
  // "Gentler week". Text follows ACCENT, so it is not a token here.
  gentler: { tint: "rgba(201,115,136,0.14)", border: "rgba(201,115,136,0.4)" },
  // "Rearranged".
  moved: { tint: "rgba(169,155,201,0.16)", border: "rgba(169,155,201,0.45)", text: "#6D5F91" },
};

/** Soft filled surfaces: the note pill, the calendar move banner, the selected day. */
const PHASE0_TINTS = {
  soft: "rgba(201,115,136,0.1)",
  softBorder: "rgba(201,115,136,0.3)",
  selected: "rgba(201,115,136,0.12)",
};

const SPACE_GROTESK =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
const FRAUNCES =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const THEMES = {
  // Juha's and Joonatan's current look, unchanged.
  "amber-slate": {
    id: "amber-slate",
    label: "Amber on slate",
    mode: "dark",
    BG: "#10131A",
    CARD: "#1A1F29",
    BORDER: "#2A3140",
    TEXT_PRIMARY: "#EEF0F3",
    TEXT_SECONDARY: "#8891A3",
    TEXT_MUTED: "#5C6577",
    ACCENT: "#E3A23C",
    ACCENT_2: "#4CB6C4",
    // Foreground on any filled swatch — accent buttons, category dots, ticks.
    ON_ACCENT: "#fff",
    // Fallback "target met" green when a palette defines no mobility colour.
    OK: "#7FB88F",
    HEAT_RGB: "111,207,151",
    TINT: PHASE0_TINTS,
    BADGE: PHASE0_BADGES,
    FONT_DISPLAY: "'Space Grotesk', system-ui, sans-serif",
    FONT_BODY: "'IBM Plex Sans', system-ui, sans-serif",
    FONT_MONO: "'IBM Plex Mono', ui-monospace, monospace",
    FONT_IMPORT: SPACE_GROTESK,
  },

  // Henna's current look, unchanged. Note this is a LIGHT theme — the app has
  // had one all along; it was simply baked into one repo's config.jsx.
  "rose-linen": {
    id: "rose-linen",
    label: "Rose on linen",
    mode: "light",
    BG: "#FBF7F4",
    CARD: "#FFFFFF",
    BORDER: "#EADFD8",
    TEXT_PRIMARY: "#2E2724",
    TEXT_SECONDARY: "#7A6A62",
    TEXT_MUTED: "#A2938B",
    ACCENT: "#C97388",
    ACCENT_2: "#7FB88F",
    ON_ACCENT: "#fff",
    OK: "#7FB88F",
    HEAT_RGB: "201,115,136",
    TINT: PHASE0_TINTS,
    BADGE: PHASE0_BADGES,
    FONT_DISPLAY: "'Fraunces', Georgia, serif",
    FONT_BODY: "'Karla', system-ui, sans-serif",
    FONT_MONO: "'IBM Plex Mono', ui-monospace, monospace",
    FONT_IMPORT: FRAUNCES,
  },
};

export const THEME_IDS = Object.keys(THEMES);

/**
 * Merge a theme with a client's own category palette.
 *
 * CATS is CLIENT data, not theme data: Juha has nine categories, Henna and
 * Joonatan six, and they are not the same six. Putting them in the theme would
 * force every theme to carry categories that two of the three apps never show.
 * The theme supplies colours; `config.jsx` decides which categories exist.
 *
 * Returns the exact key set `app.jsx` expects, so no call site changes.
 */
export function buildTheme(id, cats) {
  const theme = THEMES[id] || THEMES[THEME_IDS[0]];
  return {
    ...theme,
    CATS: cats,
    // Preserves the previous derivation exactly:
    //   const OK_COLOR = (CATS.mobility && CATS.mobility.color) || "#7FB88F";
    OK_COLOR: (cats && cats.mobility && cats.mobility.color) || theme.OK,
  };
}
