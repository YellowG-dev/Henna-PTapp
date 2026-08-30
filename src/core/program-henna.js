/**
 * Henna — program data.
 *
 * Everything client-specific lives here. The engine reads this and nothing
 * else, so a new client is a new file like this one, not a new app.
 *
 * Built from her intake (24 Aug 2026) plus coaching input from John:
 *   - 45, desk job, returning to systematic training after a break
 *   - Goal: strength & toning; what it means to her: more energy
 *   - RA affecting fingers, wrists, elbows — well controlled, no flares on
 *     medication, symptoms elevated around her cycle. Cleared for resistance
 *     training.
 *   - Home gym: treadmill, 4 kg dumbbells, 6/8/10 kg kettlebells, resistance
 *     bands, yoga blocks, foam roller, ankle/wrist weights 0.5-2 kg, bench,
 *     stair
 *   - 3 days/week, 30-45 min
 *   - Declined: nutrition tracking, weigh-ins, InBody, VO2max, bpm zones,
 *     sleep tracking
 *   - Opted in: mobility tracking, meditation tracking
 *
 * Grip note running through every selection: heavy dumbbell holds are limited
 * by her hands long before the target muscle is challenged. Kettlebells carry
 * lower-body load, ankle weights load single-leg work without touching the
 * hands, and every pull/press has a band alternative.
 */

export const PROGRAM_ID = "henna";
export const CLIENT_NAME = "Henna";
export const APP_VERSION = "1.1.0";

/* --------------------------------- Slots --------------------------------- */
// One slot: strength. Walking is a daily check rather than a scheduled block,
// because she chose walking as her only cardio and a step target already
// covers it.
export const SLOTS = ["strength", "yoga"];

/* ------------------------------- Strength -------------------------------- */
// sets/reps here are the week-3-onward targets. Weeks 1-2 run 2 sets — the
// app's "first fortnight" flag drops one set.
//
// Progression ladder, in order, before load ever changes:
//   reps to the top of the range -> slower tempo (3s down) -> single-leg or
//   single-arm -> then add weight.
// Her jumps are coarse (2 kg on a kettlebell is 20-33%), so the rep ranges
// run wider than standard and the ladder has three rungs before loading.

const DAY_A = {
  label: "Day A — Full Body",
  cat: "strength",
  exercises: [
    {
      id: "a1",
      name: "Goblet squat to box",
      presc: "3 × 8–15",
      detail: "Kettlebell held at the chest. Sit to the bench, stand up.",
      video: "https://www.youtube.com/watch?v=Aub3U8uHNQk",
      altName: "Bodyweight box squat",
      sets: 3,
    },
    {
      id: "a2",
      name: "Hip thrust, shoulders on bench",
      presc: "3 × 10–15",
      detail: "Kettlebell across the hips, pad it with a towel.",
      video: "https://www.youtube.com/watch?v=LxdfGyNBuRU",
      altName: "Single-leg glute bridge on the floor",
      altVideo: "https://www.youtube.com/watch?v=sVfp4LN9niA",
      sets: 3,
    },
    {
      id: "a3",
      name: "Incline push-up",
      presc: "3 × 8–15",
      detail: "Hands on the bench. Lower the surface as you get stronger.",
      video: "https://www.youtube.com/watch?v=E--Ls5QtFqI",
      altName: "Band chest press",
      altVideo: "https://www.youtube.com/watch?v=LL9PtGB5hvc",
      sets: 3,
    },
    {
      id: "a4",
      name: "One-arm row",
      presc: "3 × 8–15 / side",
      detail: "Kettlebell, hand and knee on the bench.",
      video: "https://www.youtube.com/watch?v=fURsHPHgssI",
      altName: "Seated band row",
      altVideo: "https://www.youtube.com/watch?v=_bx9tP2lAPU",
      sets: 3,
    },
    {
      id: "a5",
      name: "Forearm plank",
      presc: "3 × 20–40s",
      detail: "On the forearms, not the hands.",
      video: "https://www.youtube.com/watch?v=s6coxb732BA",
      altName: "Knees down",
      sets: 3,
    },
    {
      id: "a6",
      name: "Calf raise",
      presc: "2 × 12–20",
      detail: "On the stair, full range down and up.",
      video: "https://www.youtube.com/watch?v=H6WptvjXkgw",
      sets: 2,
    },
  ],
};

const DAY_B = {
  label: "Day B — Full Body",
  cat: "strength",
  exercises: [
    {
      id: "b1",
      name: "Romanian deadlift",
      presc: "3 × 8–15",
      detail: "Two kettlebells. Hips back, back flat, feel it in the hamstrings.",
      video: "https://www.youtube.com/watch?v=uUjqvxEWcbo",
      altName: "Band RDL",
      sets: 3,
    },
    {
      id: "b2",
      name: "Split squat",
      presc: "3 × 8–12 / side",
      detail: "Rear foot on the FLOOR, not elevated. Ankle weights to load it.",
      video: "https://www.youtube.com/watch?v=vTlcCN-Kbr4",
      altName: "Bodyweight, hand on the wall",
      sets: 3,
    },
    {
      id: "b3",
      name: "Dumbbell floor press",
      presc: "3 × 8–15",
      detail: "Elbows lightly touch the floor, then press.",
      video: "https://www.youtube.com/watch?v=T0Y3OBF1bNI",
      altName: "Band chest press",
      altVideo: "https://www.youtube.com/watch?v=LL9PtGB5hvc",
      sets: 3,
    },
    {
      id: "b4",
      name: "Half-kneeling band lat pulldown",
      presc: "3 × 10–15",
      detail: "Band anchored high. Pull the elbow to your back pocket.",
      video: "https://www.youtube.com/watch?v=gcPmrdcGh5I",
      sets: 3,
    },
    {
      id: "b5",
      name: "Dead bug",
      presc: "3 × 8 / side",
      detail: "Lower back stays pressed into the floor throughout.",
      video: "https://www.youtube.com/watch?v=T1h8n4YMonY",
      altName: "Feet stay down",
      sets: 3,
    },
    {
      id: "b6",
      name: "Band pull-apart",
      presc: "2 × 15",
      detail: "Straight arms, squeeze the shoulder blades.",
      video: "https://www.youtube.com/watch?v=LoBBo1dtY6I",
      sets: 2,
    },
  ],
};

const DAY_C = {
  label: "Day C — Full Body",
  cat: "strength",
  exercises: [
    {
      id: "c1",
      name: "Step-up",
      presc: "3 × 8–12 / side",
      detail: "Onto the stair. Ankle weights or the 4 kg dumbbells to load it.",
      video: "https://www.youtube.com/watch?v=9ZknEYboBOQ",
      altName: "Lower step, no weight",
      sets: 3,
    },
    {
      id: "c2",
      name: "Single-leg glute bridge",
      presc: "3 × 8–15 / side",
      detail: "Keep the hips level — that's the whole exercise.",
      video: "https://www.youtube.com/watch?v=sVfp4LN9niA",
      altName: "Two-leg bridge",
      sets: 3,
    },
    {
      id: "c3",
      name: "Seated shoulder press",
      presc: "3 × 8–15",
      detail: "4 kg dumbbells, back supported on the bench.",
      video: "https://www.youtube.com/watch?v=SSXS4Z8OkCg",
      altName: "Band overhead press",
      altVideo: "https://www.youtube.com/watch?v=Zli1UXH9ZeE",
      sets: 3,
    },
    {
      id: "c4",
      name: "Bent-over row, two arms",
      presc: "3 × 8–15",
      detail: "Hinge at the hips, back flat. Kettlebells or dumbbells.",
      video: "https://www.youtube.com/watch?v=8yqWpLd_b6Y",
      altName: "Seated band row",
      altVideo: "https://www.youtube.com/watch?v=PKZW3s3G_Y0",
      sets: 3,
    },
    {
      id: "c5",
      name: "Bird dog",
      presc: "3 × 8 / side",
      detail: "Opposite arm and leg, no twisting.",
      video: "https://www.youtube.com/watch?v=T1h8n4YMonY",
      altName: "Arm only",
      sets: 3,
    },
    {
      id: "c6",
      name: "Side plank",
      presc: "2 × 15–30s / side",
      detail: "On the forearm.",
      video: "https://www.youtube.com/watch?v=0M-erHBl48U",
      altName: "Knees bent",
      sets: 2,
    },
  ],
};

const NO_GYM = {
  label: "No-Gym Day",
  cat: "strength",
  subtitle: "Away from home — same shape, no equipment",
  exercises: [
    { id: "n1", name: "Bodyweight squat", presc: "3 × 15–20", sets: 3 },
    { id: "n2", name: "Glute bridge", presc: "3 × 15–20", sets: 3 },
    { id: "n3", name: "Incline push-up", presc: "3 × 8–15", detail: "Any raised surface — desk, wall, chair.", sets: 3 },
    { id: "n4", name: "Band or towel row", presc: "3 × 12–15", sets: 3 },
    { id: "n5", name: "Forearm plank", presc: "3 × 20–40s", sets: 3 },
    { id: "n6", name: "Walk", presc: "20–30 min", sets: 1 },
  ],
};


const YOGA = {
  label: "Weekly Yoga",
  cat: "yoga",
  subtitle: "20–30 min · neck, shoulders, upper back",
  exercises: [
    {
      id: "y1",
      name: "Upper body yoga",
      presc: "30 min",
      detail: "Follow along with the video. Blocks under the hips or back wherever it helps.",
      video: "https://www.youtube.com/watch?v=gnVIx5z9-Fk",
      altName: "20 min version",
      altVideo: "https://www.youtube.com/watch?v=IlplXfNE45U",
      sets: null,
    },
  ],
};

export const BLOCKS = {
  strength: { a: DAY_A, b: DAY_B, c: DAY_C, nogym: NO_GYM },
  yoga: { session: YOGA },
};

export const SLOT_OPTIONS = {
  strength: [
    { value: null, label: "Rest" },
    { value: "a", label: "Day A" },
    { value: "b", label: "Day B" },
    { value: "c", label: "Day C" },
    { value: "nogym", label: "No-Gym" },
  ],
  yoga: [
    { value: null, label: "None" },
    { value: "session", label: "Yoga" },
  ],
};

export const SLOT_META = {
  strength: { label: "Strength", color: "#C97388" },
  yoga: { label: "Yoga", color: "#A99BC9" },
};

/* ------------------------------- Schedule -------------------------------- */
// Mon / Wed / Fri, non-consecutive. No A/B week alternation — she has no
// rotating constraint, so both weeks are identical and the week-type control
// stays hidden.
const WEEK = {
  1: { strength: "a", yoga: null },
  2: { strength: null, yoga: null },
  3: { strength: "b", yoga: null },
  4: { strength: null, yoga: null },
  5: { strength: "c", yoga: null },
  6: { strength: null, yoga: null },
  0: { strength: null, yoga: "session", note: "No strength today — yoga and the mobility flow" },
};

export const SCHEDULE = { A: WEEK, B: WEEK };

/* ------------------------------- Mobility -------------------------------- */
// Daily, ~12 min. Neck, upper back and spinal rotation are the focus, per
// John. Rotation appears three times from three positions — thread the
// needle, quadruped rotation, open book — because it was named as a priority.

export const MOBILITY = [
  { id: "m1", name: "Cat–cow", presc: "60s", video: "https://www.youtube.com/watch?v=qSmuPsi1_9g" },
  { id: "m2", name: "Thread the needle", presc: "90s (45/side)", video: "https://www.youtube.com/watch?v=JPK24P1JD6s" },
  { id: "m3", name: "Quadruped thoracic rotation", presc: "60s", video: "https://www.youtube.com/watch?v=aOFdI2oTTxU" },
  { id: "m4", name: "Thoracic extension over roller", presc: "90s", video: "https://www.youtube.com/watch?v=9Y11Kc0E0og" },
  { id: "m5", name: "Open book", presc: "90s (45/side)", video: "https://www.youtube.com/watch?v=rDviWORCWEw" },
  { id: "m6", name: "World's greatest stretch", presc: "90s (45/side)", video: "https://www.youtube.com/watch?v=-CiWQ2IvY34" },
  { id: "m7", name: "Chin tucks", presc: "45s", video: "https://www.youtube.com/watch?v=7rnlAVhAK-8" },
  { id: "m8", name: "Levator scapulae stretch", presc: "60s (30/side)", video: "https://www.youtube.com/watch?v=U9tijfMcfP8" },
  { id: "m9", name: "Upper trap stretch", presc: "60s (30/side)", video: "https://www.youtube.com/watch?v=DwdEkATOppo" },
  { id: "m10", name: "Doorway pec stretch", presc: "60s (30/side)", detail: "Forearm on the frame, not the palm.", video: "https://www.youtube.com/watch?v=069o76BafTk" },
  { id: "m11", name: "Band pull-aparts", presc: "45s", video: "https://www.youtube.com/watch?v=LoBBo1dtY6I" },
  { id: "m12", name: "Breathing, 4 in / 6 out", presc: "90s", detail: "Finishing this counts as your meditation for the day.", video: "https://www.youtube.com/watch?v=kgTL5G1ibIo" },
];

/* --------------------------- Daily & weekly ------------------------------ */

export const DAILY = [
  {
    key: "mobility",
    cat: "mobility",
    title: "Daily Mobility Flow",
    subtitle: "~12 min · neck, upper back, rotation",
    tasks: MOBILITY.map((m) => ({
      id: m.id,
      name: m.name,
      presc: m.presc,
      detail: m.detail || null,
      video: m.video,
    })),
  },
  {
    key: "check",
    cat: "check",
    title: "Daily Check",
    subtitle: null,
    tasks: [
      {
        id: "energy",
        type: "scale",
        name: "Energy today",
        presc: "1 = wiped out · 5 = great",
        scale: [1, 2, 3, 4, 5],
      },
      {
        id: "symptoms",
        type: "scale",
        name: "Hands / wrists / elbows",
        presc: "1 = no symptoms · 5 = very sore",
        scale: [1, 2, 3, 4, 5],
      },
      { id: "steps", name: "Walk 10,000 steps", presc: "Daily step target" },
      { id: "water", name: "Drink 2 L water", presc: "Daily hydration target" },
      { id: "meditation", name: "Meditation", presc: "Breathing at the end of the flow counts" },
      { id: "notes", type: "notes", name: "Notes", presc: "Optional — how the day felt" },
    ],
  },
];

/* -------------------------------- Wiring --------------------------------- */

export const PROGRAM = {
  id: PROGRAM_ID,
  clientName: CLIENT_NAME,
  slots: SLOTS,
  blocks: BLOCKS,
  schedule: SCHEDULE,
  daily: DAILY,
  restLabel: "Rest Day",
  restSubtitle: "Nothing scheduled — the mobility flow still applies",
  gentlerNote: "Gentler week — 2 sets, bottom of the rep range, lighter",
  // No deload anchor: her gentler week is a switch she flips, not a date.
  // Her cycle already provides one rhythm; the app doesn't impose a second.
  deloadAnchor: null,
  // UI flags. showDeloadToggle draws the weekly D column in the Calendar;
  // usesHeartRate reveals the Max HR field in Settings.
  showDeloadToggle: true,
  usesHeartRate: false,
  tracking: {
    weight: false,
    nutrition: false,
    testing: false,
    heartRate: false,
    scales: ["energy", "symptoms"],
  },
};

export default PROGRAM;
