/**
 * Henna — the only file that differs between clients (alongside her program
 * data). app.jsx imports from here and is byte-identical across every app.
 */
import React from "react";
import { Dumbbell, Wind, Flower2, Heart, Flame, ExternalLink } from "lucide-react";
import PROGRAM_DATA, { MOBILITY, BLOCKS, SLOT_OPTIONS, SLOT_META, APP_VERSION } from "./core/program-henna.js";

export { MOBILITY, BLOCKS, SLOT_OPTIONS, SLOT_META, APP_VERSION };

export const PROGRAM = PROGRAM_DATA;
export const CLIENT_LABEL = "Daily PT · Henna";
export const STORAGE_PREFIX = "ptAppHenna_";

// Programme start. The first fortnight runs one set lighter.
export const START_DATE = new Date(2026, 7, 31); // Monday 31 August 2026
export const RAMP_WEEKS = 2;

// Set once the Apps Script backup endpoint exists. Empty = feature off.
export const BACKUP_URL = "";

const ACCENT = "#C97388";   // rose
const ACCENT_2 = "#7FB88F"; // sage

export const THEME = {
  BG: "#FBF7F4",
  CARD: "#FFFFFF",
  BORDER: "#EADFD8",
  TEXT_PRIMARY: "#2E2724",
  TEXT_SECONDARY: "#7A6A62",
  TEXT_MUTED: "#A2938B",
  ACCENT,
  ACCENT_2,
  HEAT_RGB: "201,115,136",
  FONT_DISPLAY: "'Fraunces', Georgia, serif",
  FONT_BODY: "'Karla', system-ui, sans-serif",
  FONT_MONO: "'IBM Plex Mono', ui-monospace, monospace",
  FONT_IMPORT:
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
  CATS: {
    strength: { label: "Strength", color: ACCENT, Icon: Dumbbell },
    mobility: { label: "Mobility", color: ACCENT_2, Icon: Wind },
    yoga: { label: "Yoga", color: "#A99BC9", Icon: Flower2 },
    check: { label: "Check", color: "#96877E", Icon: Heart },
    rest: { label: "Rest", color: "#B8A99F", Icon: Heart },
    activity: { label: "Activity", color: "#E0A458", Icon: Flame },
  },
};

/* ------------------------------ Program tab ------------------------------- */

export function ProgramView({ Section, ExerciseList, theme }) {
  const { ACCENT: A, ACCENT_2: B, CATS, TEXT_MUTED, TEXT_SECONDARY } = theme;
  return (
    <div className="px-4 max-w-md mx-auto space-y-3">
      <Section title="Your goals" color={A} defaultOpen>
        <div className="space-y-2 text-xs">
          <p><strong>Strength and toning</strong> — and what you said it's really for: <strong>more energy</strong>.</p>
          <p style={{ color: TEXT_SECONDARY }}>
            That's why the app asks about your energy every day. It's the thing we're actually trying to change, so
            it's the thing worth measuring.
          </p>
        </div>
      </Section>

      <Section title="The week" subtitle="3 sessions · 30–45 min each" color={A}>
        <div className="space-y-1 text-xs">
          {[["Mon", "Day A"], ["Tue", "Walk"], ["Wed", "Day B"], ["Thu", "Walk"], ["Fri", "Day C"], ["Sat", "Rest"], ["Sun", "Yoga"]].map(([d, s]) => (
            <div key={d} className="flex items-center justify-between">
              <span style={{ fontFamily: theme.FONT_MONO, color: TEXT_SECONDARY, width: 46 }} className="shrink-0">{d}</span>
              <span className="flex-1">{s}</span>
            </div>
          ))}
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs">
          Plus the mobility flow every day, and 10,000 steps. Walking days are flexible — move them around your week.
        </p>
      </Section>

      {["a", "b", "c"].map((k) => (
        <Section key={k} title={BLOCKS.strength[k].label} color={A}>
          <ExerciseList exercises={BLOCKS.strength[k].exercises} color={A} />
        </Section>
      ))}

      <Section title="How to get stronger" subtitle="Reps first, weight last" color={A}>
        <div className="text-xs space-y-2">
          <p>Pick a weight where the last rep feels like you had 2–3 more in you. Then climb, in this order:</p>
          <ol style={{ color: TEXT_SECONDARY }} className="list-decimal ml-4 space-y-1">
            <li>Add a rep, until every set is at the top of its range</li>
            <li>Slow it down — 3 seconds lowering</li>
            <li>Go single-leg or single-arm</li>
            <li><em>Then</em> add weight, and drop back to the bottom of the range</li>
          </ol>
          <p style={{ color: TEXT_MUTED }}>
            Three steps before the weight changes. Your jumps are big — 6 kg to 8 kg is a third heavier — so this
            gives your joints time to catch up with your muscles.
          </p>
        </div>
      </Section>

      <Section title="Your hands" subtitle="Why the program looks the way it does" color={A}>
        <div className="text-xs space-y-2">
          <p>
            Your grip will often tire before the muscle you're training does. That's not weakness — it's just where
            your RA sits. So the program routes around it:
          </p>
          <ul style={{ color: TEXT_SECONDARY }} className="list-disc ml-4 space-y-1">
            <li>Kettlebells at the chest rather than hanging from one hand</li>
            <li>Ankle weights for single-leg work — no hands involved at all</li>
            <li>A band alternative on every pull and press</li>
            <li>Planks on forearms, push-ups on a raised surface</li>
          </ul>
          <p style={{ color: TEXT_MUTED }}>
            On days your hands are sore, take the easier option and log it. That's the app working as intended, not a
            missed session.
          </p>
        </div>
      </Section>

      <Section title="Gentler weeks" color={B}>
        <p className="text-xs">
          You told John things feel more sensitive around your cycle. The switch in Settings trims every session —
          one less set, lighter, bottom of the rep range. Use it whenever you want it. Training through a rough patch
          at 70% beats skipping the week entirely.
        </p>
      </Section>

      <Section title="Daily mobility" subtitle="~12 min · neck, upper back, rotation" color={B}>
        <ExerciseList exercises={MOBILITY} color={B} />
        <p style={{ color: TEXT_MUTED }} className="text-xs">
          Built around a desk day: opening the upper back, and rotation from three different positions. The breathing
          at the end counts as your meditation.
        </p>
      </Section>

      <Section title="Weekly yoga" subtitle="Sundays by default · move it from Calendar" color={CATS.yoga.color}>
        <p className="text-xs mb-2">Neck, shoulders and upper back — the same areas as the daily flow, with more time.</p>
        <ExerciseList exercises={BLOCKS.yoga.session.exercises} color={CATS.yoga.color} />
      </Section>

      <Section title="Walking" color={B}>
        <div className="text-xs space-y-2">
          <p>2–3 times a week, 20–40 minutes on the treadmill, plus 10,000 steps a day.</p>
          <p style={{ color: TEXT_SECONDARY }}>No heart-rate numbers — just how it feels:</p>
          <ul style={{ color: TEXT_SECONDARY }} className="list-disc ml-4 space-y-1">
            <li><strong>Easy</strong> — you could hold a conversation</li>
            <li><strong>Brisk</strong> — short sentences only. This is the useful one.</li>
            <li><strong>Hard</strong> — a few words at a time. Optional.</li>
          </ul>
          <p style={{ color: TEXT_MUTED }}>When brisk gets easy, add incline before you add speed.</p>
        </div>
      </Section>
    </div>
  );
}
