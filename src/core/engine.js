import { getISOWeek, dateKey, daysBetween } from "./dates.js";

/**
 * The engine. Knows how a training app WORKS; knows nothing about any
 * particular person's program.
 *
 * Every function takes a `program` object as its last argument. Swap the
 * program, get a different app — same scheduling, same history maths, same
 * override system.
 *
 * This replaces the original schedule.js, which imported one specific
 * client's STRENGTH/SCHEDULE/MOBILITY directly and so could only ever
 * produce that one app.
 */

/* ------------------------------- Scheduling ------------------------------ */

/**
 * What is actually happening on a given date, after per-day overrides.
 *
 * Overrides are keyed 'YYYY-MM-DD'. A key being PRESENT (even set to null)
 * means "the user moved or cleared this", which is why hasOwnProperty is used
 * rather than a truthiness check — clearing a session must beat the template.
 */
export function resolveSchedule(date, weekOverride, overrides, program) {
  const auto = getISOWeek(date) % 2 === 0 ? "A" : "B";
  const weekType = weekOverride === "auto" ? auto : weekOverride;
  const key = dateKey(date);

  const base = (program.schedule[weekType] || {})[date.getDay()] || {};
  const ov = (overrides && overrides[key]) || {};

  const slots = {};
  const moved = {};
  for (const slotName of program.slots) {
    const isOverridden = Object.prototype.hasOwnProperty.call(ov, slotName);
    slots[slotName] = isOverridden ? ov[slotName] || null : base[slotName] || null;
    moved[slotName] = isOverridden;
  }

  const activities = Array.isArray(ov.activities) ? ov.activities : [];
  const note = ov.note !== undefined ? ov.note : base.note || null;

  return {
    weekType,
    slots,
    moved,
    note,
    activities,
    anyMoved: Object.values(moved).some(Boolean) || activities.length > 0,
    isTrainingDay: Object.values(slots).some(Boolean) || activities.length > 0,
  };
}

/* ------------------------------- Sections -------------------------------- */

/**
 * The day's task list.
 *
 * Sections come from three places, in order:
 *   1. scheduled slots  — whatever the template or an override put here today
 *   2. extra activities — things added ad hoc from the Calendar
 *   3. daily sections   — mobility, checks: every day regardless
 *
 * `gentler` trims volume without changing the shape of the day. In the
 * original this was a calendar-driven "deload"; here it is a flag the caller
 * owns, so a client can drive it from a date wave OR a manual toggle.
 */
export function buildSections(date, opts, program) {
  const { weekType = "A", gentler = false, overrides = {} } = opts || {};
  const info = resolveSchedule(date, weekType, overrides, program);
  const sections = [];

  if (!info.isTrainingDay) {
    sections.push({
      key: "rest",
      cat: "rest",
      title: program.restLabel || "Rest Day",
      subtitle: info.note || program.restSubtitle || null,
      tasks: [],
    });
  }

  for (const slotName of program.slots) {
    const value = info.slots[slotName];
    if (!value) continue;
    const block = program.blocks[slotName] && program.blocks[slotName][value];
    if (!block) continue;

    sections.push({
      key: slotName,
      cat: block.cat || slotName,
      title: block.label,
      subtitle: gentler ? block.gentlerNote || program.gentlerNote : block.subtitle || null,
      tasks: block.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        presc: gentler && e.gentlerPresc ? e.gentlerPresc : e.presc,
        detail: e.detail || null,
        video: e.video || null,
        altName: e.altName || null,
        altVideo: e.altVideo || null,
        sets: e.sets != null ? (gentler ? Math.max(1, e.sets - 1) : e.sets) : null,
        type: e.type || "exercise",
      })),
    });
  }

  if (info.activities.length) {
    sections.push({
      key: "activity",
      cat: "activity",
      title: "Extra Activity",
      subtitle: "Added from Calendar",
      tasks: info.activities.map((a) => ({ id: `act-${a.id}`, name: a.name, presc: "Logged activity" })),
    });
  }

  for (const daily of program.daily || []) {
    // Weekly items (e.g. a yoga session) only appear on their own day.
    if (daily.dayOfWeek != null && daily.dayOfWeek !== date.getDay()) continue;
    sections.push({
      key: daily.key,
      cat: daily.cat,
      title: daily.title,
      subtitle: daily.subtitle || null,
      tasks: daily.tasks.map((t) => ({ ...t })),
    });
  }

  return sections;
}

/* ---------------------------- Completion rules --------------------------- */

/**
 * One place that decides whether a task counts as done. Every other
 * completion figure in the app — the ring, history, streaks — routes through
 * here, so they can never disagree with each other.
 */
export function isTaskDone(task, rec) {
  if (!rec) return false;
  switch (task.type) {
    case "notes":
      return false; // a journal field, never counted
    case "scale":
      return rec.scales?.[task.id] != null;
    case "number":
      return typeof rec.numbers?.[task.id] === "number";
    default:
      return Boolean(rec.done?.[task.id]) || Boolean(rec.subs?.[task.id]?.name);
  }
}

/** Tasks that count toward the day's percentage — notes are excluded. */
export function countableTasks(sections) {
  return sections.flatMap((s) => s.tasks).filter((t) => t.type !== "notes");
}

/* ------------------------------- History --------------------------------- */

/**
 * One row per logged day, rebuilding that day's actual task list so old
 * percentages stay correct even after the program changes.
 */
export function buildHistoryRows(log, overrides, program) {
  return Object.keys(log)
    .sort()
    .map((dstr) => {
      const [y, m, d] = dstr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const rec = log[dstr] || {};
      const weekType = rec.weekType || (getISOWeek(dateObj) % 2 === 0 ? "A" : "B");
      const gentler = Boolean(rec.gentler);

      const sections = buildSections(dateObj, { weekType, gentler, overrides }, program);
      const byCat = {};
      let total = 0;
      let doneCount = 0;

      for (const sec of sections) {
        if (!sec.tasks.length) continue;
        if (!byCat[sec.cat]) byCat[sec.cat] = { total: 0, done: 0 };
        for (const task of sec.tasks) {
          if (task.type === "notes") continue;
          byCat[sec.cat].total += 1;
          total += 1;
          if (isTaskDone(task, rec)) {
            byCat[sec.cat].done += 1;
            doneCount += 1;
          }
        }
      }

      const info = resolveSchedule(dateObj, weekType, overrides, program);

      return {
        date: dstr,
        dateObj,
        total,
        doneCount,
        pct: total ? doneCount / total : 0,
        byCat,
        scales: rec.scales || {},
        numbers: rec.numbers || {},
        isTrainingDay: info.isTrainingDay,
        gentler,
      };
    });
}

/**
 * Rolling average of any tracked number.
 *
 * Two buckets, deliberately separate:
 *   scales  — 1-5 subjective ratings (energy, symptoms)
 *   numbers — measured values (bodyweight in kg, hours slept)
 *
 * Both are noisy day to day, so the average is the line worth watching. This
 * is the same 7-day rolling average the original app applied to bodyweight,
 * generalised so any client can point it at whatever they actually track.
 */
export function computeSeries(rows, id, { bucket = "scales", windowDays = 7 } = {}) {
  const byDate = {};
  rows.forEach((r) => {
    const v = r[bucket]?.[id];
    if (typeof v === "number") byDate[r.date] = v;
  });

  return rows
    .filter((r) => typeof r[bucket]?.[id] === "number")
    .map((r) => {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < windowDays; i++) {
        const d = new Date(r.dateObj);
        d.setDate(d.getDate() - i);
        const v = byDate[dateKey(d)];
        if (v != null) {
          sum += v;
          count += 1;
        }
      }
      return {
        date: r.date,
        label: r.dateObj.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        value: r[bucket][id],
        avg: count ? Math.round((sum / count) * 10) / 10 : null,
      };
    });
}

/** Heaviest logged set per session, for the strength progression chart. */
export function computeLoadSeries(log, exerciseId, excludeDate) {
  return Object.keys(log)
    .sort()
    .filter((dstr) => dstr !== excludeDate)
    .map((dstr) => {
      const loads = log[dstr]?.loads?.[exerciseId];
      if (!loads) return null;
      const weights = loads.map((e) => (typeof e === "number" ? e : e?.w)).filter((w) => w != null);
      if (!weights.length) return null;
      const [y, m, d] = dstr.split("-").map(Number);
      return {
        date: dstr,
        label: new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        maxWeight: Math.max(...weights),
      };
    })
    .filter(Boolean);
}

export { getISOWeek, dateKey, daysBetween };

/** @deprecated use computeSeries(rows, id, { bucket: "scales" }) */
export function computeScaleSeries(rows, id, windowDays = 7) {
  return computeSeries(rows, id, { bucket: "scales", windowDays });
}
