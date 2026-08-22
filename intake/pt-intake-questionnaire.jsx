import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  User,
  Dumbbell,
  Target,
  CalendarDays,
  ShieldAlert,
  Activity,
  Utensils,
  Gauge,
  Footprints,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Share2,
} from "lucide-react";

/* ------------------------------- Design tokens -------------------------------
   Reused from the main PT app (pt-app-scaffold.jsx) on purpose: this intake
   form feeds that app directly, and its category colors (amber=strength,
   teal=cardio, green=mobility, rose=nutrition, blue=testing, purple=habits)
   are reused here per-section so the form doubles as a preview of the app's
   own taxonomy.
-------------------------------------------------------------------------- */
const BG = "#10131A";
const CARD = "#1A1F29";
const BORDER = "#2A3140";
const TEXT_PRIMARY = "#EEF0F3";
const TEXT_SECONDARY = "#8891A3";
const TEXT_MUTED = "#5C6577";
const ACCENT_A = "#E3A23C";
const DANGER = "#C97388";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_BODY = "'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

const SKIP = "__SKIP__";
const STORAGE_KEY = "intake-progress";
// Feature-detected once at load: file-sharing via the Web Share API needs
// both navigator.share and navigator.canShare (the file-sharing check).
// Doesn't change mid-session, so no need to recompute per render.
const SHARE_SUPPORTED = typeof navigator !== "undefined" && Boolean(navigator.share) && Boolean(navigator.canShare);

function FontImport() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      html, body, #root { background: ${BG}; min-height: 100%; }
      body { margin: 0; }
    `}</style>
  );
}

/* --------------------------------- Sections ---------------------------------
   Each field maps to a specific placeholder in pt-app-scaffold.jsx — see the
   review payload at the end for how these get grouped for hand-off.

   Reordered for a general-condition / balanced-wellness intake (not a
   strength-first one): why → current state → health context → logistics →
   the actual movement mix → nutrition → daily habits → optional testing →
   tone. Daily mobility/yoga and meditation live in "Daily habits &
   lifestyle" as trackable habits, distinct from the weekly gym/cardio/
   mind-body class balance asked about in "Movement mix".
-------------------------------------------------------------------------- */
const SECTIONS = [
  {
    id: "basics",
    title: "Basics",
    icon: User,
    color: TEXT_SECONDARY,
    intro:
      "A few questions to build your training plan. Nothing here is required except your name — skip anything else you'd rather not answer.",
    fields: [
      { key: "name", type: "text", label: "What's your name?", required: true },
      { key: "age", type: "number", label: "Age" },
      { key: "sex", type: "select", label: "Sex", options: ["Male", "Female", "Prefer not to say"] },
      { key: "height", type: "number", label: "Height (cm)" },
      { key: "weight", type: "number", label: "Current weight (kg)" },
      {
        key: "activityLevel",
        type: "select",
        label: "Outside of training, what's your day-to-day activity like?",
        options: ["Desk job", "Mixed — on my feet sometimes", "On my feet a lot", "Physically demanding job"],
      },
    ],
  },
  {
    id: "goals",
    title: "Goals & what matters to you",
    icon: Target,
    color: "#E3A23C",
    intro: "Start with why — everything else in this plan gets built around this.",
    fields: [
      {
        key: "primaryGoal",
        type: "select",
        label: "Primary goal",
        options: [
          "General fitness & energy",
          "Weight management",
          "Strength & toning",
          "Endurance (running/walking)",
          "Stress relief & wellbeing",
          "Flexibility & mobility",
          "Sport-specific",
        ],
      },
      {
        key: "lifeGoalMeaning",
        type: "textarea",
        label: 'What does "being in good shape" actually mean for you day to day?',
        placeholder: "e.g. more energy, better sleep, less pain, fitting into clothes, keeping up with the kids",
      },
      { key: "secondaryGoal", type: "text", label: "Secondary goal, if any" },
      { key: "timeline", type: "text", label: "Timeline or event driving it, if any" },
    ],
  },
  {
    id: "activity",
    title: "Current activity & experience",
    icon: Activity,
    color: "#E3A23C",
    fields: [
      {
        key: "currentMovement",
        type: "select-other",
        multi: true,
        label: "What do you currently do for movement?",
        hint: "Pick as many as apply.",
        options: [
          "Walking",
          "Running",
          "Gym or strength training",
          "Group fitness classes",
          "Yoga",
          "Pilates",
          "Swimming",
          "Cycling",
          "Team sports",
          "Nothing right now",
          "Other",
        ],
      },
      {
        key: "experience",
        type: "select",
        label: "Experience level",
        options: [
          "New to structured exercise",
          "Returning after a break",
          "Comfortable and consistent",
          "Very experienced",
        ],
      },
      { key: "enjoyKeep", type: "textarea", label: "Anything you already enjoy and want to keep doing?" },
      { key: "avoidTried", type: "textarea", label: "Anything you've tried and want to avoid?" },
    ],
  },
  {
    id: "health",
    title: "Health & medical history",
    icon: ShieldAlert,
    color: TEXT_SECONDARY,
    fields: [
      {
        key: "medicalConditions",
        type: "textarea",
        label: "Any diagnosed medical conditions we should know about?",
        placeholder:
          "e.g. asthma, diabetes, heart condition, thyroid, high blood pressure — write 'none' if not applicable",
      },
      {
        key: "injuryHistory",
        type: "textarea",
        label: "Past or current injuries, surgeries, or physical limitations",
        placeholder: "Write 'none' if not applicable",
      },
      { key: "movementsToAvoid", type: "textarea", label: "Movements or activities to avoid or approach cautiously" },
      {
        key: "medicationsTreatments",
        type: "textarea",
        label: "Medications or treatments relevant to exercise, if any",
        skippable: true,
        skipLabel: "Skip — not applicable",
      },
      {
        key: "jointTracker",
        type: "text",
        label: "Track a specific joint/area or symptom daily?",
        placeholder: "e.g. Left knee",
        skippable: true,
        skipLabel: "Skip — don't track this",
      },
    ],
  },
  {
    id: "schedule",
    title: "Schedule & availability",
    icon: CalendarDays,
    color: "#E3A23C",
    fields: [
      {
        key: "daysPerWeek",
        type: "select",
        label: "Days per week you can realistically train",
        options: ["2", "3", "4", "5", "6"],
      },
      {
        key: "sessionLength",
        type: "select",
        label: "Session length you'll commit to",
        options: ["30–45 min", "45–60 min", "60–75 min", "75+ min"],
      },
      {
        key: "weeklyConflict",
        type: "textarea",
        label: "Any real recurring weekly conflict?",
        hint: "Only relevant for a genuine alternating-week pattern — shift work, custody schedule, etc. Leave blank otherwise.",
      },
    ],
  },
  {
    id: "movementMix",
    title: "Movement mix — gym, cardio, mind-body",
    icon: Dumbbell,
    color: "#E3A23C",
    intro: "How should your week be balanced across these three?",
    fields: [
      {
        key: "gymPriority",
        type: "select",
        label: "Gym / strength training",
        options: ["A lot", "Some", "Little or none"],
      },
      {
        key: "cardioPriority",
        type: "select",
        label: "Cardio (running, walking, cycling, etc.)",
        options: ["A lot", "Some", "Little or none"],
      },
      {
        key: "mindBodyPriority",
        type: "select",
        label: "Mind-body (yoga, pilates, stretching classes)",
        options: ["A lot", "Some", "Little or none"],
      },
      {
        key: "cardioModality",
        type: "select-other",
        multi: true,
        label: "Preferred cardio modality",
        hint: "Pick as many as apply.",
        options: ["Walking", "Running", "Cycling", "Swimming", "Rowing", "Stairs", "Other"],
      },
      {
        key: "equipmentAccess",
        type: "select",
        multi: true,
        label: "Training environment",
        hint: "Pick as many as apply.",
        options: ["Full gym", "Home gym", "Studio classes", "Outdoors", "Bodyweight only"],
      },
      {
        key: "homeEquipment",
        type: "textarea",
        label: "What equipment do you have at home?",
        condition: (a) => valueIncludes(a.equipmentAccess, "Home gym"),
      },
      {
        key: "needsNoGymBackup",
        type: "select",
        label: "Need a no-gym backup day, or is gym access constant?",
        options: ["Yes, add a backup day", "No, gym access is constant"],
      },
      {
        key: "hrMode",
        type: "select",
        label: "Heart rate",
        options: ["I know my max HR", "Estimate from age", "Skip — just show % effort, no bpm"],
      },
      {
        key: "maxHR",
        type: "number",
        label: "Max HR (bpm)",
        condition: (a) => a.hrMode === "I know my max HR",
      },
    ],
  },
  {
    id: "nutrition",
    title: "Nutrition",
    icon: Utensils,
    color: "#C97388",
    fields: [
      {
        key: "nutritionMode",
        type: "select",
        label: "Nutrition tracking",
        options: [
          "Use existing targets",
          "Calculate from my stats",
          "Not tracking numbers, but want general guidance",
          "Skip — don't track nutrition at all",
        ],
      },
      {
        key: "existingTargets",
        type: "textarea",
        label: "What are your current targets? (calories, protein, fat, carbs)",
        condition: (a) => a.nutritionMode === "Use existing targets",
      },
      {
        key: "dietaryRestrictions",
        type: "text",
        label: "Dietary restrictions or preferences",
        condition: (a) => a.nutritionMode && a.nutritionMode !== "Skip — don't track nutrition at all",
      },
      {
        key: "eatingHabitsDescription",
        type: "textarea",
        label: "How would you describe your eating habits day to day?",
        condition: (a) => a.nutritionMode && a.nutritionMode !== "Skip — don't track nutrition at all",
      },
      {
        key: "nutritionChallengeGoal",
        type: "text",
        label: "Biggest nutrition challenge or goal right now",
        condition: (a) => a.nutritionMode && a.nutritionMode !== "Skip — don't track nutrition at all",
      },
      {
        key: "priorTrackingExperience",
        type: "text",
        label: "Prior experience tracking food?",
        condition: (a) => a.nutritionMode && a.nutritionMode !== "Skip — don't track nutrition at all",
      },
    ],
  },
  {
    id: "habits",
    title: "Daily habits & lifestyle",
    icon: Footprints,
    color: "#9C8CF0",
    fields: [
      {
        key: "stepGoal",
        type: "select",
        label: "Step goal",
        options: ["10,000 (suggested)", "Custom number", "Skip — don't track steps"],
      },
      {
        key: "stepCustom",
        type: "number",
        label: "Custom step target",
        condition: (a) => a.stepGoal === "Custom number",
      },
      {
        key: "hydrationGoal",
        type: "select",
        label: "Hydration goal",
        options: ["3 L (suggested)", "Custom amount", "Skip — don't track water"],
      },
      {
        key: "hydrationCustom",
        type: "number",
        label: "Custom target (liters)",
        condition: (a) => a.hydrationGoal === "Custom amount",
      },
      { key: "sleepTracking", type: "select", label: "Sleep tracking", options: ["Add it", "Not interested"] },
      {
        key: "trackWeight",
        type: "select",
        label: "Daily weigh-in (7-day rolling average)",
        options: ["Yes, track it", "Skip — don't track weight"],
      },
      {
        key: "mobilityTracking",
        type: "select",
        label: "10-minute yoga / mobility flow",
        options: ["Yes, track it", "Skip — don't track this"],
      },
      {
        key: "tightAreas",
        type: "textarea",
        label: "Any tight areas or focus points for the flow?",
        hint: "Leave blank to use a generic flow.",
        condition: (a) => a.mobilityTracking === "Yes, track it",
      },
      {
        key: "meditationTracking",
        type: "select",
        label: "Daily meditation / mindfulness practice",
        options: ["Yes, track it", "Skip — don't track this"],
      },
    ],
  },
  {
    id: "testing",
    title: "Testing & metrics",
    icon: Gauge,
    color: "#5B9BD5",
    fields: [
      {
        key: "inbodyAccess",
        type: "select",
        label: "InBody scan access",
        options: ["Yes, regular access", "Yes, occasional access", "No access — skip"],
      },
      {
        key: "inbodyInterval",
        type: "select",
        label: "How often?",
        options: ["Every 4 weeks", "Every 6 weeks", "Every 8 weeks", "Every 12 weeks"],
        condition: (a) => (a.inbodyAccess || "").indexOf("Yes") === 0,
      },
      {
        key: "vo2maxAccess",
        type: "select",
        label: "VO2max test access",
        options: ["Yes, regular access", "Yes, occasional access", "No access — skip"],
      },
      {
        key: "vo2maxInterval",
        type: "select",
        label: "How often?",
        options: ["Every 4 weeks", "Every 6 weeks", "Every 8 weeks", "Every 12 weeks"],
        condition: (a) => (a.vo2maxAccess || "").indexOf("Yes") === 0,
      },
    ],
  },
  {
    id: "tone",
    title: "Tone & motivation style",
    icon: MessageCircle,
    color: "#E3A23C",
    fields: [
      {
        key: "toneStyle",
        type: "select",
        label: "Preferred tone",
        options: ["Blunt / clinical", "Encouraging / motivational", "Balanced / neutral"],
      },
      {
        key: "substitutionLogging",
        type: "select",
        label: "Log substitutions/notes when you skip or swap an exercise?",
        options: ["Yes, I'd use that", "No, skip it"],
      },
    ],
  },
];

/* --------------------------------- Storage ----------------------------------
   Uses the browser's native localStorage — this runs as a plain static page
   (GitHub Pages), not inside a Claude artifact, so window.storage isn't
   available. localStorage writes are synchronous and don't depend on any
   publish step, so answers save immediately as you go, on this device.
-------------------------------------------------------------------------- */
async function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* not found or error — use fallback */
  }
  return fallback;
}
async function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* best-effort; state still holds locally */
  }
}
async function clearJSON(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    /* nothing to clear */
  }
}

/* --------------------------- Field value / display --------------------------- */
// Treats both a plain string (single-select) and an array (multi-select) the
// same way, so older saved progress from before multi-select still works.
function valueIncludes(val, opt) {
  if (Array.isArray(val)) return val.includes(opt);
  return val === opt;
}

// Renders a select / select-other value (single string or multi array) as
// display text, resolving "Other" against its free-text companion field.
function formatSelectValue(field, val, answers) {
  const resolveOne = (v) => {
    if (v === "Other") {
      const other = answers[`${field.key}Other`];
      return other ? `Other — ${other}` : "Other";
    }
    return v;
  };
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    return val.map(resolveOne).join(", ");
  }
  if (val === undefined || val === null || val === "") return null;
  return field.type === "select-other" ? resolveOne(val) : val;
}

function fieldDisplayValue(field, answers) {
  if (field.condition && !field.condition(answers)) return null;
  const val = answers[field.key];
  if (field.skippable && val === SKIP) return "Not tracked";
  if (field.type === "select" || field.type === "select-other") {
    return formatSelectValue(field, val, answers);
  }
  if (val === undefined || val === null || val === "") return null;
  return val;
}

function buildSummary(answers) {
  const sectionsOut = {};
  SECTIONS.forEach((s) => {
    const out = {};
    s.fields.forEach((f) => {
      if (f.condition && !f.condition(answers)) return;
      const val = answers[f.key];
      if (f.skippable && val === SKIP) {
        out[f.key] = "not_tracked";
        return;
      }
      if (f.type === "select" || f.type === "select-other") {
        const formatted = formatSelectValue(f, val, answers);
        if (formatted === null) return;
        out[f.key] = formatted;
        return;
      }
      if (val === undefined || val === null || val === "") return;
      out[f.key] = val;
    });
    sectionsOut[s.id] = out;
  });
  return { payload: { sections: sectionsOut, generatedAt: new Date().toISOString() } };
}

/* ----------------------------------- Field ----------------------------------- */
function Field({ field, answers, setAnswer, accent }) {
  if (field.condition && !field.condition(answers)) return null;
  const value = answers[field.key];
  const isSkipped = field.skippable && value === SKIP;

  const labelRow = (
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <p style={{ color: TEXT_PRIMARY }} className="text-sm font-medium">
        {field.label}
        {field.required && <span style={{ color: accent }}> *</span>}
      </p>
      {field.skippable && (
        <button
          type="button"
          onClick={() => setAnswer(field.key, isSkipped ? "" : SKIP)}
          style={{
            background: isSkipped ? accent : "transparent",
            color: isSkipped ? "#14171C" : TEXT_SECONDARY,
            borderColor: isSkipped ? accent : BORDER,
          }}
          className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border focus:outline-none focus-visible:ring-2"
        >
          {field.skipLabel || "Skip"}
        </button>
      )}
    </div>
  );

  if (isSkipped) {
    return (
      <div>
        {labelRow}
        <p style={{ color: TEXT_MUTED }} className="text-xs italic">
          Not tracked.
        </p>
      </div>
    );
  }

  if (field.type === "text" || field.type === "number") {
    return (
      <div>
        {labelRow}
        <input
          type="text"
          inputMode={field.type === "number" ? "decimal" : "text"}
          value={value || ""}
          onChange={(e) => setAnswer(field.key, e.target.value)}
          placeholder={field.placeholder}
          style={{ fontFamily: FONT_BODY, color: TEXT_PRIMARY, borderColor: BORDER, background: BG }}
          className="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus-visible:ring-2"
        />
        {field.hint && (
          <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">
            {field.hint}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {labelRow}
        <textarea
          rows={2}
          value={value || ""}
          onChange={(e) => setAnswer(field.key, e.target.value)}
          placeholder={field.placeholder}
          style={{ fontFamily: FONT_BODY, color: TEXT_PRIMARY, borderColor: BORDER, background: BG }}
          className="w-full text-sm px-3 py-2 rounded-lg border resize-none focus:outline-none focus-visible:ring-2"
        />
        {field.hint && (
          <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">
            {field.hint}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "select" || field.type === "select-other") {
    const isMulti = Boolean(field.multi);
    const arrVal = isMulti ? (Array.isArray(value) ? value : []) : null;
    const isSelected = (opt) => (isMulti ? arrVal.includes(opt) : value === opt);
    const handleClick = (opt) => {
      if (!isMulti) {
        setAnswer(field.key, opt);
        return;
      }
      const next = arrVal.includes(opt) ? arrVal.filter((o) => o !== opt) : [...arrVal, opt];
      setAnswer(field.key, next);
    };
    const otherActive = field.type === "select-other" && isSelected("Other");
    return (
      <div>
        {labelRow}
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleClick(opt)}
              style={{
                background: isSelected(opt) ? accent : "transparent",
                color: isSelected(opt) ? "#14171C" : TEXT_SECONDARY,
                borderColor: isSelected(opt) ? accent : BORDER,
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus-visible:ring-2"
            >
              {opt}
            </button>
          ))}
        </div>
        {otherActive && (
          <input
            type="text"
            value={answers[`${field.key}Other`] || ""}
            onChange={(e) => setAnswer(`${field.key}Other`, e.target.value)}
            placeholder="Please specify"
            style={{ fontFamily: FONT_BODY, color: TEXT_PRIMARY, borderColor: BORDER, background: BG }}
            className="w-full text-sm px-3 py-2 rounded-lg border mt-2 focus:outline-none focus-visible:ring-2"
          />
        )}
        {field.hint && (
          <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">
            {field.hint}
          </p>
        )}
      </div>
    );
  }

  return null;
}

/* --------------------------------- Review ------------------------------------ */
function ReviewPanel({
  answers,
  onJump,
  onCopy,
  copyStatus,
  onShare,
  shareStatus,
  canShare,
  onReset,
  showResetConfirm,
  setShowResetConfirm,
}) {
  const { payload } = useMemo(() => buildSummary(answers), [answers]);
  const jsonText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  return (
    <div className="space-y-3">
      {SECTIONS.map((s, i) => {
        const rows = s.fields
          .map((f) => ({ label: f.label, val: fieldDisplayValue(f, answers) }))
          .filter((r) => r.val !== null);
        return (
          <div key={s.id} style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border overflow-hidden">
            <button
              type="button"
              onClick={() => onJump(i)}
              style={{ borderLeftColor: s.color }}
              className="w-full text-left border-l-4 px-4 py-2.5 flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
            >
              <span style={{ color: s.color }} className="text-[11px] font-bold uppercase tracking-wide">
                {s.title}
              </span>
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-medium">
                Edit
              </span>
            </button>
            {rows.length > 0 ? (
              <div className="px-4 pb-3 space-y-1">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-start justify-between gap-3">
                    <span style={{ color: TEXT_MUTED }} className="text-[11px] flex-1">
                      {r.label}
                    </span>
                    <span
                      style={{ color: TEXT_PRIMARY, fontFamily: FONT_MONO }}
                      className="text-[11px] text-right max-w-[55%]"
                    >
                      {r.val}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: TEXT_MUTED }} className="text-[11px] px-4 pb-3">
                Nothing answered here yet.
              </p>
            )}
          </div>
        );
      })}

      <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4">
        <p style={{ color: TEXT_PRIMARY }} className="text-sm font-semibold mb-1">
          Send your answers
        </p>
        <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-2">
          {canShare
            ? "Share the file straight to WhatsApp, Messages, or email — or copy the text below."
            : "Copy the text below and send it back — it's what gets used to tailor the app."}
        </p>
        {canShare && (
          <button
            type="button"
            onClick={onShare}
            style={{ background: ACCENT_A, color: "#14171C" }}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg mb-2 focus:outline-none focus-visible:ring-2"
          >
            <Share2 size={15} />
            {shareStatus || "Share"}
          </button>
        )}
        <textarea
          readOnly
          rows={6}
          value={jsonText}
          style={{ fontFamily: FONT_MONO, color: TEXT_PRIMARY, background: BG, borderColor: BORDER }}
          className="w-full text-[10px] p-2 rounded-lg border focus:outline-none focus-visible:ring-2"
        />
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={onCopy}
            style={{ borderColor: BORDER, color: TEXT_PRIMARY }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none focus-visible:ring-2"
          >
            {copyStatus || "Copy"}
          </button>
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              style={{ color: TEXT_MUTED }}
              className="text-[11px] font-medium focus:outline-none focus-visible:underline"
            >
              Start over
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                style={{ color: DANGER }}
                className="text-[11px] font-semibold focus:outline-none focus-visible:underline"
              >
                Confirm reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{ color: TEXT_MUTED }}
                className="text-[11px] focus:outline-none focus-visible:underline"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- App ----------------------------------- */
export default function IntakeQuestionnaire() {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [warnRequired, setWarnRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadJSON(STORAGE_KEY, null);
      if (!cancelled && saved) {
        setAnswers(saved.answers || {});
        setStep(typeof saved.step === "number" ? saved.step : 0);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    saveJSON(STORAGE_KEY, { answers, step });
  }, [answers, step, loading]);

  const setAnswer = useCallback((key, val) => {
    setWarnRequired(false);
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }, []);

  const isReview = step === SECTIONS.length;
  const section = !isReview ? SECTIONS[step] : null;

  const goNext = () => {
    if (section && section.id === "basics") {
      if (!answers.name || !answers.name.trim()) {
        setWarnRequired(true);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, SECTIONS.length));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const jumpTo = (idx) => setStep(idx);

  const resetAll = async () => {
    setAnswers({});
    setStep(0);
    setShowResetConfirm(false);
    await clearJSON(STORAGE_KEY);
  };

  const copyAnswers = async () => {
    const { payload } = buildSummary(answers);
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch (e) {
      setCopyStatus("Select & copy manually below");
    }
    setTimeout(() => setCopyStatus(""), 2500);
  };

  // Hands the answers off as a real file to the device's native share sheet
  // (WhatsApp, Messages, Mail, etc.) — only rendered when SHARE_SUPPORTED.
  // Empty title avoids a known iOS Safari quirk where a non-empty title can
  // break file attachment when sharing to WhatsApp/Instagram.
  const shareAnswers = async () => {
    const { payload } = buildSummary(answers);
    const text = JSON.stringify(payload, null, 2);
    const safeName = (answers.name || "intake")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const file = new File([text], `${safeName || "intake"}-answers.json`, { type: "application/json" });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      setShareStatus("Not supported here — use Copy instead");
      setTimeout(() => setShareStatus(""), 3000);
      return;
    }
    try {
      await navigator.share({ files: [file], title: "" });
      setShareStatus("Shared");
    } catch (e) {
      if (e && e.name !== "AbortError") {
        setShareStatus("Couldn't share — try Copy instead");
      }
    }
    setTimeout(() => setShareStatus(""), 2500);
  };

  if (loading) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <FontImport />
        <p style={{ color: TEXT_SECONDARY, fontFamily: FONT_BODY }} className="text-sm">
          Loading…
        </p>
      </div>
    );
  }

  const progressFrac = (isReview ? SECTIONS.length : step) / SECTIONS.length;
  const progressColor = isReview ? ACCENT_A : section.color;
  const SectionIcon = section ? section.icon : ClipboardCheck;

  return (
    <div style={{ background: BG, fontFamily: FONT_BODY, color: TEXT_PRIMARY }} className="min-h-screen w-full pb-10">
      <FontImport />
      <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <SectionIcon size={16} style={{ color: progressColor }} />
          <h1 style={{ fontFamily: FONT_DISPLAY, color: TEXT_PRIMARY }} className="text-lg font-bold">
            {isReview ? "Review & submit" : section.title}
          </h1>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs mb-3">
          {isReview ? "Last step — check everything looks right before copying." : `Section ${step + 1} of ${SECTIONS.length}`}
        </p>
        <div style={{ background: BORDER }} className="w-full h-1.5 rounded-full overflow-hidden mb-5">
          <div
            style={{ width: `${progressFrac * 100}%`, background: progressColor }}
            className="h-full transition-all"
          />
        </div>

        {!isReview && section.intro && (
          <p style={{ color: TEXT_SECONDARY }} className="text-xs mb-4">
            {section.intro}
          </p>
        )}

        {!isReview ? (
          <>
            <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4 space-y-5">
              {section.fields.map((f) => (
                <Field key={f.key} field={f} answers={answers} setAnswer={setAnswer} accent={section.color} />
              ))}
            </div>
            {warnRequired && (
              <p style={{ color: DANGER }} className="text-xs mt-2">
                Please enter a name before continuing.
              </p>
            )}
          </>
        ) : (
          <ReviewPanel
            answers={answers}
            onJump={jumpTo}
            onCopy={copyAnswers}
            copyStatus={copyStatus}
            onShare={shareAnswers}
            shareStatus={shareStatus}
            canShare={SHARE_SUPPORTED}
            onReset={resetAll}
            showResetConfirm={showResetConfirm}
            setShowResetConfirm={setShowResetConfirm}
          />
        )}

        <div className="flex items-center justify-between mt-5">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            style={{
              color: step === 0 ? TEXT_MUTED : TEXT_PRIMARY,
              borderColor: BORDER,
              opacity: step === 0 ? 0.4 : 1,
            }}
            className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg border focus:outline-none focus-visible:ring-2"
          >
            <ChevronLeft size={16} /> Back
          </button>
          {!isReview && (
            <button
              type="button"
              onClick={goNext}
              style={{ background: section.color, color: "#14171C" }}
              className="flex items-center gap-1 text-sm font-semibold px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2"
            >
              {step === SECTIONS.length - 1 ? "Review answers" : "Next"} <ChevronRight size={16} />
            </button>
          )}
        </div>

        <p style={{ color: TEXT_MUTED }} className="text-[11px] text-center mt-4">
          Your answers save automatically in this browser as you go — no publishing step needed. Come back anytime on
          this same device to pick up where you left off.
        </p>
      </div>
    </div>
  );
}
