import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Dumbbell, Wind, Flower2, Check, ExternalLink, ChevronDown, ChevronLeft,
  ChevronRight, Settings2, Flame, CalendarDays, Repeat, X, Heart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

import PROGRAM, { APP_VERSION, MOBILITY, BLOCKS, STRENGTH_OPTIONS } from "./core/program-henna.js";
import {
  resolveSchedule, buildSections, buildHistoryRows, isTaskDone, countableTasks,
  computeScaleSeries, computeLoadSeries, dateKey, daysBetween, getISOWeek,
} from "./core/engine.js";
import { computeStreak, buildHeatmapCells } from "./core/stats.js";
import { createStore, localStorageAdapter } from "./core/storage.js";

/* --------------------------------- Config -------------------------------- */

const START_DATE = new Date(2026, 7, 31); // Monday 31 August 2026
const RAMP_WEEKS = 2; // first fortnight runs one set lighter

// Set this once the Apps Script backup endpoint exists. Empty = feature off,
// app works exactly the same, just without the cloud copy.
const BACKUP_URL = "";

const store = createStore(localStorageAdapter(), "ptAppHenna_");

/* --------------------------------- Palette ------------------------------- */

const BG = "#FBF7F4";
const CARD = "#FFFFFF";
const BORDER = "#EADFD8";
const TEXT_PRIMARY = "#2E2724";
const TEXT_SECONDARY = "#7A6A62";
const TEXT_MUTED = "#A2938B";
const ROSE = "#C97388";
const SAGE = "#7FB88F";
const HEAT_RGB = "201,115,136";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Karla', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

const CATS = {
  strength: { label: "Strength", color: ROSE, Icon: Dumbbell },
  mobility: { label: "Mobility", color: SAGE, Icon: Wind },
  yoga: { label: "Yoga", color: "#A99BC9", Icon: Flower2 },
  check: { label: "Check", color: "#96877E", Icon: Heart },
  rest: { label: "Rest", color: "#B8A99F", Icon: Heart },
  activity: { label: "Activity", color: "#E0A458", Icon: Flame },
};

function FontImport() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      html, body, #root { background: ${BG}; min-height: 100%; }
      body { margin: 0; -webkit-tap-highlight-color: transparent; }
    `}</style>
  );
}

/* -------------------------------- Helpers -------------------------------- */

function weeksSinceStart(date) {
  return Math.floor(daysBetween(START_DATE, date) / 7);
}
function isRampWeek(date) {
  const w = weeksSinceStart(date);
  return w >= 0 && w < RAMP_WEEKS;
}
function setCountFor(task, ramp) {
  if (task.sets == null) return 0;
  return ramp ? Math.max(1, task.sets - 1) : task.sets;
}

/* ---------------------------------- App ---------------------------------- */

export default function HennaApp() {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState({});
  const [overrides, setOverrides] = useState({});
  const [settings, setSettings] = useState({ gentler: false });
  const [view, setView] = useState("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [expanded, setExpanded] = useState({});
  const [sectionOpen, setSectionOpen] = useState({});

  const [loadDrafts, setLoadDrafts] = useState({});
  const [notesDraft, setNotesDraft] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [exNoteDrafts, setExNoteDrafts] = useState({});

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calSelected, setCalSelected] = useState(today);
  const [editingBlock, setEditingBlock] = useState(false);
  const [activityDraft, setActivityDraft] = useState("");
  const [moveSource, setMoveSource] = useState(null);

  const [backupText, setBackupText] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  /* ------------------------------ Load state ----------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [l, ov, s] = await Promise.all([
        store.loadJSON("log", {}),
        store.loadJSON("overrides", {}),
        store.loadJSON("settings", { gentler: false }),
      ]);
      if (cancelled) return;
      setLog(l);
      setOverrides(ov);
      setSettings(s);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const viewedDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [today, dayOffset]);
  const viewedKey = dateKey(viewedDate);
  const rec = log[viewedKey];
  const ramp = isRampWeek(viewedDate);
  const gentler = typeof rec?.gentler === "boolean" ? rec.gentler : settings.gentler;

  /* ------------------------ Reset drafts on day change -------------------- */

  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    const r = log[viewedKey];
    setNotesDraft(r?.notes || "");
    const drafts = {};
    Object.entries(r?.loads || {}).forEach(([exId, arr]) => {
      (arr || []).forEach((entry, i) => {
        if (entry?.w != null) drafts[`${exId}:${i}:w`] = String(entry.w);
        if (entry?.r != null) drafts[`${exId}:${i}:r`] = String(entry.r);
      });
    });
    setLoadDrafts(drafts);
    setExNoteDrafts({});
    setEditingNote(null);
  }, [viewedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------------- Writers ------------------------------- */

  const persist = useCallback((updater) => {
    setLog((prev) => {
      const base = prev[viewedKey] || { done: {} };
      const nextRec = updater({ ...base });
      const next = { ...prev, [viewedKey]: { ...nextRec, gentler } };
      store.saveJSON("log", next);
      pushBackup(next);
      return next;
    });
  }, [viewedKey, gentler]);

  const toggleTask = useCallback((id) => {
    persist((r) => ({ ...r, done: { ...r.done, [id]: !r.done?.[id] } }));
  }, [persist]);

  const markSection = useCallback((ids, value) => {
    persist((r) => {
      const done = { ...r.done };
      ids.forEach((id) => { done[id] = value; });
      return { ...r, done };
    });
  }, [persist]);

  const setScale = useCallback((id, value) => {
    persist((r) => ({ ...r, scales: { ...(r.scales || {}), [id]: value } }));
  }, [persist]);

  const commitNotes = useCallback(() => {
    persist((r) => {
      const next = { ...r };
      const t = notesDraft.trim();
      if (t) next.notes = t; else delete next.notes;
      return next;
    });
  }, [persist, notesDraft]);

  const commitLoad = useCallback((exId, idx, field, raw) => {
    persist((r) => {
      const loads = { ...(r.loads || {}) };
      const arr = [...(loads[exId] || [])];
      const prev = arr[idx] || {};
      const num = parseFloat(String(raw).trim().replace(",", "."));
      const val = raw !== "" && !isNaN(num) ? num : null;
      arr[idx] = { w: field === "w" ? val : prev.w ?? null, r: field === "r" ? val : prev.r ?? null };
      loads[exId] = arr;
      return { ...r, loads };
    });
  }, [persist]);

  const commitExNote = useCallback((exId, raw) => {
    persist((r) => {
      const notes = { ...(r.exNotes || {}) };
      const t = (raw || "").trim();
      if (t) notes[exId] = t; else delete notes[exId];
      return { ...r, exNotes: notes };
    });
  }, [persist]);

  const toggleAlt = useCallback((exId, altName) => {
    persist((r) => {
      const subs = { ...(r.subs || {}) };
      if (subs[exId]) delete subs[exId];
      else subs[exId] = { name: altName };
      return { ...r, subs };
    });
  }, [persist]);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      store.saveJSON("settings", next);
      return next;
    });
  }, []);

  const writeOverrides = useCallback((updater) => {
    setOverrides((prev) => {
      const next = updater(prev);
      store.saveJSON("overrides", next);
      return next;
    });
  }, []);

  const setBlock = useCallback((d, value) => {
    const key = dateKey(d);
    writeOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), strength: value } }));
  }, [writeOverrides]);

  const resetBlock = useCallback((d) => {
    const key = dateKey(d);
    writeOverrides((prev) => {
      if (!prev[key]) return prev;
      const day = { ...prev[key] };
      delete day.strength;
      const next = { ...prev };
      if (Object.keys(day).length === 0) delete next[key]; else next[key] = day;
      return next;
    });
  }, [writeOverrides]);

  const swapBlock = useCallback((a, b) => {
    const ka = dateKey(a), kb = dateKey(b);
    const ia = resolveSchedule(a, "auto", overrides, PROGRAM).slots.strength;
    const ib = resolveSchedule(b, "auto", overrides, PROGRAM).slots.strength;
    writeOverrides((prev) => ({
      ...prev,
      [ka]: { ...(prev[ka] || {}), strength: ib },
      [kb]: { ...(prev[kb] || {}), strength: ia },
    }));
  }, [overrides, writeOverrides]);

  const addActivity = useCallback((d, name) => {
    const t = name.trim();
    if (!t) return;
    const key = dateKey(d);
    writeOverrides((prev) => {
      const day = { ...(prev[key] || {}) };
      const list = Array.isArray(day.activities) ? day.activities : [];
      day.activities = [...list, { id: `${Date.now()}`, name: t }];
      return { ...prev, [key]: day };
    });
  }, [writeOverrides]);

  const removeActivity = useCallback((d, id) => {
    const key = dateKey(d);
    writeOverrides((prev) => {
      if (!prev[key]?.activities) return prev;
      const day = { ...prev[key] };
      day.activities = day.activities.filter((a) => a.id !== id);
      const next = { ...prev };
      if (day.activities.length === 0 && !("strength" in day)) delete next[key];
      else next[key] = day;
      return next;
    });
  }, [writeOverrides]);

  /* -------------------------------- Derived ------------------------------- */

  const sections = useMemo(
    () => buildSections(viewedDate, { weekType: "A", gentler, overrides }, PROGRAM),
    [viewedDate, gentler, overrides]
  );
  const info = useMemo(
    () => resolveSchedule(viewedDate, "auto", overrides, PROGRAM),
    [viewedDate, overrides]
  );

  const countable = useMemo(() => countableTasks(sections), [sections]);
  const doneCount = countable.filter((t) => isTaskDone(t, rec)).length;
  const pct = countable.length ? doneCount / countable.length : 0;

  const historyRows = useMemo(() => buildHistoryRows(log, overrides, PROGRAM), [log, overrides]);
  const trendRows = useMemo(() => historyRows.filter((r) => r.date !== todayKey), [historyRows, todayKey]);
  const streak = useMemo(() => computeStreak(historyRows), [historyRows]);
  const heatmap = useMemo(() => buildHeatmapCells(historyRows, 12), [historyRows]);
  const energySeries = useMemo(() => computeScaleSeries(trendRows, "energy").slice(-45), [trendRows]);
  const symptomSeries = useMemo(() => computeScaleSeries(trendRows, "symptoms").slice(-45), [trendRows]);
  const completionSeries = useMemo(
    () => trendRows.slice(-30).map((r) => ({
      label: r.dateObj.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      pct: Math.round(r.pct * 100),
    })),
    [trendRows]
  );
  const avgPct = trendRows.length
    ? trendRows.slice(-30).reduce((s, r) => s + r.pct, 0) / Math.min(trendRows.length, 30)
    : 0;

  const exercisesWithHistory = useMemo(() => {
    const found = new Set();
    Object.values(log).forEach((r) => {
      Object.entries(r?.loads || {}).forEach(([id, arr]) => {
        if ((arr || []).some((e) => e?.w != null)) found.add(id);
      });
    });
    const nameFor = (id) => {
      for (const block of Object.values(BLOCKS.strength)) {
        const ex = block.exercises.find((e) => e.id === id);
        if (ex) return ex.name;
      }
      return id;
    };
    return [...found].map((id) => ({ id, name: nameFor(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [log]);

  useEffect(() => {
    if (!selectedExerciseId && exercisesWithHistory.length) {
      setSelectedExerciseId(exercisesWithHistory[0].id);
    }
  }, [exercisesWithHistory, selectedExerciseId]);

  const loadSeries = useMemo(
    () => (selectedExerciseId ? computeLoadSeries(log, selectedExerciseId, todayKey).slice(-30) : []),
    [log, selectedExerciseId, todayKey]
  );

  const lastLoads = useMemo(() => {
    const out = {};
    Object.keys(log).sort().forEach((dstr) => {
      if (dstr >= viewedKey) return;
      Object.entries(log[dstr]?.loads || {}).forEach(([id, arr]) => {
        if ((arr || []).some((e) => e?.w != null || e?.r != null)) {
          const [y, m, d] = dstr.split("-").map(Number);
          out[id] = { dateObj: new Date(y, m - 1, d), entries: arr };
        }
      });
    });
    return out;
  }, [log, viewedKey]);

  const lastExNotes = useMemo(() => {
    const out = {};
    Object.keys(log).sort().forEach((dstr) => {
      if (dstr >= viewedKey) return;
      Object.entries(log[dstr]?.exNotes || {}).forEach(([id, note]) => {
        if (note) out[id] = note;
      });
    });
    return out;
  }, [log, viewedKey]);

  /* -------------------------------- Backup -------------------------------- */

  const exportBackup = useCallback(() => {
    setBackupText(JSON.stringify({ log, overrides, settings, exportedAt: todayKey }));
    setImportStatus("");
  }, [log, overrides, settings, todayKey]);

  const copyBackup = useCallback(async () => {
    const text = backupText || JSON.stringify({ log, overrides, settings });
    if (!backupText) setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Select and copy");
    }
    setTimeout(() => setCopyStatus(""), 2500);
  }, [backupText, log, overrides, settings]);

  const importBackup = useCallback(() => {
    try {
      const parsed = JSON.parse(backupText);
      if (!parsed || typeof parsed !== "object") throw new Error("bad");
      setLog(parsed.log || {});
      setOverrides(parsed.overrides || {});
      setSettings(parsed.settings || { gentler: false });
      store.saveJSON("log", parsed.log || {});
      store.saveJSON("overrides", parsed.overrides || {});
      store.saveJSON("settings", parsed.settings || { gentler: false });
      setImportStatus("Restored");
    } catch {
      setImportStatus("Couldn't read that — check it's a full backup");
    }
    setTimeout(() => setImportStatus(""), 3500);
  }, [backupText]);

  /* --------------------------------- Render -------------------------------- */

  if (loading) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <FontImport />
        <p style={{ color: TEXT_SECONDARY, fontFamily: FONT_BODY }} className="text-sm">Loading…</p>
      </div>
    );
  }

  const dateLabel = viewedDate.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
  const size = 88, stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  return (
    <div style={{ background: BG, fontFamily: FONT_BODY, color: TEXT_PRIMARY }} className="min-h-screen w-full pb-12">
      <FontImport />

      <div className="px-4 pt-6 pb-4 max-w-md mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: FONT_BODY, color: ROSE, letterSpacing: "0.16em" }}
               className="text-[10px] uppercase font-semibold">
              Henna · Daily Log
            </p>
            {view === "today" ? (
              <div className="flex items-center gap-1 mt-1 -ml-1.5">
                <button onClick={() => setDayOffset((o) => o - 1)} aria-label="Previous day"
                        style={{ color: TEXT_MUTED }} className="shrink-0 p-1.5 rounded-lg">
                  <ChevronLeft size={18} />
                </button>
                <h1 style={{ fontFamily: FONT_DISPLAY }} className="text-[17px] font-semibold truncate flex-1 text-center">
                  {dateLabel}
                </h1>
                <button onClick={() => setDayOffset((o) => o + 1)} aria-label="Next day"
                        style={{ color: TEXT_MUTED }} className="shrink-0 p-1.5 rounded-lg">
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <h1 style={{ fontFamily: FONT_DISPLAY }} className="text-lg font-semibold mt-1">
                {view === "calendar" ? "Calendar" : view === "history" ? "Progress" : "Your Program"}
              </h1>
            )}
          </div>
          <button onClick={() => setSettingsOpen((v) => !v)} aria-label="Settings"
                  style={{ borderColor: BORDER, color: settingsOpen ? ROSE : TEXT_MUTED, background: CARD }}
                  className="mt-1 ml-2 shrink-0 rounded-full border p-2">
            <Settings2 size={16} />
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl border mt-3" style={{ borderColor: BORDER, background: CARD }}>
          {[["today", "Today"], ["calendar", "Calendar"], ["history", "Progress"], ["program", "Program"]].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
                    style={{ background: view === k ? ROSE : "transparent", color: view === k ? "#fff" : TEXT_SECONDARY }}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg">
              {label}
            </button>
          ))}
        </div>

        {settingsOpen && (
          <div style={{ background: CARD, borderColor: BORDER }} className="mt-3 rounded-2xl border p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Gentler week</p>
                <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">
                  One less set, bottom of the rep range, lighter weight. Use it whenever you need it — it's part of
                  the plan, not falling behind.
                </p>
              </div>
              <button onClick={() => updateSettings({ gentler: !settings.gentler })}
                      aria-pressed={settings.gentler} aria-label="Toggle gentler week"
                      style={{ background: settings.gentler ? ROSE : BORDER }}
                      className="shrink-0 w-11 h-6 rounded-full relative transition-colors">
                <span style={{ background: "#fff", left: settings.gentler ? 22 : 3 }}
                      className="absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm" />
              </button>
            </div>

            <div style={{ borderColor: BORDER }} className="border-t pt-4">
              <p className="text-xs font-semibold mb-1">Backup</p>
              <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-2">
                Your log lives on this device. Copy a backup now and then, and keep it somewhere safe.
              </p>
              <div className="flex gap-1.5 mb-2">
                <button onClick={exportBackup} style={{ borderColor: BORDER }}
                        className="flex-1 text-xs font-semibold py-1.5 rounded-lg border">Show backup</button>
                <button onClick={copyBackup} style={{ borderColor: BORDER }}
                        className="flex-1 text-xs font-semibold py-1.5 rounded-lg border">{copyStatus || "Copy"}</button>
              </div>
              <textarea value={backupText} onChange={(e) => setBackupText(e.target.value)} rows={3}
                        placeholder="Backup appears here — or paste one to restore"
                        style={{ fontFamily: FONT_MONO, background: BG, borderColor: BORDER }}
                        className="w-full text-[10px] p-2 rounded-lg border" />
              <div className="flex items-center justify-between mt-2">
                <button onClick={importBackup} style={{ color: ROSE }} className="text-[11px] font-semibold">
                  Restore from above
                </button>
                {importStatus && <span style={{ color: TEXT_MUTED }} className="text-[11px]">{importStatus}</span>}
              </div>
            </div>
            <p style={{ color: TEXT_MUTED }} className="text-[10px]">v{APP_VERSION}</p>
          </div>
        )}

        {view === "today" && (
          <>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {ramp && (
                <span style={{ background: "rgba(127,184,143,0.16)", color: "#4C7A5A", borderColor: "rgba(127,184,143,0.45)" }}
                      className="text-[11px] px-2 py-0.5 rounded-full border font-medium">
                  Week {weeksSinceStart(viewedDate) + 1} · easing in
                </span>
              )}
              {gentler && (
                <span style={{ background: "rgba(201,115,136,0.14)", color: ROSE, borderColor: "rgba(201,115,136,0.4)" }}
                      className="text-[11px] px-2 py-0.5 rounded-full border font-medium">
                  Gentler week
                </span>
              )}
              {info.anyMoved && (
                <span style={{ background: "rgba(169,155,201,0.16)", color: "#6D5F91", borderColor: "rgba(169,155,201,0.45)" }}
                      className="text-[11px] px-2 py-0.5 rounded-full border font-medium">
                  Rearranged
                </span>
              )}
              {dayOffset !== 0 && (
                <button onClick={() => setDayOffset(0)} style={{ color: ROSE }} className="text-[11px] font-semibold">
                  Back to today
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 mt-5">
              <div style={{ width: size, height: size }} className="relative shrink-0">
                <svg width={size} height={size}>
                  <defs>
                    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={ROSE} />
                      <stop offset="100%" stopColor={SAGE} />
                    </linearGradient>
                  </defs>
                  <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={BORDER} strokeWidth={stroke} />
                  <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#ring)" strokeWidth={stroke}
                          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                          transform={`rotate(-90 ${size / 2} ${size / 2})`}
                          style={{ transition: "stroke-dashoffset 300ms ease" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontFamily: FONT_MONO }} className="text-base font-semibold">{Math.round(pct * 100)}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontFamily: FONT_MONO }} className="text-sm">{doneCount} of {countable.length} done</p>
                <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
                  {dayOffset === 0 ? "Tick things off as you go" : dayOffset < 0 ? "Past day — edits save to that day" : "Coming up"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------- Today -------------------------------- */}
      {view === "today" && (
        <div className="px-4 max-w-md mx-auto space-y-3">
          {sections.map((section) => {
            const cat = CATS[section.cat] || CATS.check;
            const Icon = cat.Icon;
            const plainIds = section.tasks.filter((t) => !t.type || t.type === "exercise").map((t) => t.id);
            const allDone = plainIds.length > 0 && plainIds.every((id) => rec?.done?.[id]);
            const hasTasks = section.tasks.length > 0;
            const defaultOpen = !["strength", "mobility"].includes(section.key);
            const isOpen = sectionOpen[section.key] !== undefined ? sectionOpen[section.key] : defaultOpen;

            return (
              <div key={section.key} style={{ background: CARD, borderColor: BORDER }}
                   className="rounded-2xl border overflow-hidden">
                <div role={hasTasks ? "button" : undefined} tabIndex={hasTasks ? 0 : undefined}
                     onClick={() => hasTasks && setSectionOpen((p) => ({ ...p, [section.key]: !isOpen }))}
                     onKeyDown={(e) => { if (hasTasks && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSectionOpen((p) => ({ ...p, [section.key]: !isOpen })); } }}
                     style={{ borderLeftColor: cat.color }}
                     className={`border-l-4 px-4 py-3 ${hasTasks ? "cursor-pointer select-none" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={15} style={{ color: cat.color }} className="shrink-0" />
                      <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold truncate">{section.title}</h2>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {plainIds.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); markSection(plainIds, !allDone); }}
                                style={{ color: cat.color }} className="text-[11px] font-semibold">
                          {allDone ? "Clear" : "All"}
                        </button>
                      )}
                      {hasTasks && (
                        <ChevronDown size={16} style={{ color: TEXT_MUTED, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
                      )}
                    </div>
                  </div>
                  {section.subtitle && (
                    <p style={{ color: TEXT_MUTED }} className="text-[12px] mt-1">{section.subtitle}</p>
                  )}
                </div>

                {hasTasks && isOpen && (
                  <div style={{ borderColor: BORDER }} className="border-t">
                    {section.tasks.map((task, i) => {
                      const border = { borderColor: BORDER, borderTopWidth: i === 0 ? 0 : 1 };

                      if (task.type === "scale") {
                        const value = rec?.scales?.[task.id];
                        const has = value != null;
                        return (
                          <div key={task.id} style={border} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span style={{ background: has ? cat.color : "transparent", borderColor: has ? cat.color : BORDER }}
                                    className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center">
                                {has && <Check size={12} strokeWidth={3} color="#fff" />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{task.name}</p>
                                <p style={{ color: TEXT_MUTED }} className="text-[11px]">{task.presc}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-2 ml-8">
                              {task.scale.map((n) => (
                                <button key={n} onClick={() => setScale(task.id, n)}
                                        style={{
                                          background: value === n ? cat.color : "transparent",
                                          color: value === n ? "#fff" : TEXT_SECONDARY,
                                          borderColor: value === n ? cat.color : BORDER,
                                        }}
                                        className="w-9 h-9 text-sm font-semibold rounded-lg border">
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (task.type === "notes") {
                        return (
                          <div key={task.id} style={border} className="px-4 py-3">
                            <p className="text-sm font-medium mb-1.5">{task.name}</p>
                            <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
                                      onBlur={commitNotes} placeholder={task.presc} rows={2}
                                      style={{ borderColor: BORDER, background: BG }}
                                      className="w-full text-xs p-2 rounded-lg border resize-none" />
                          </div>
                        );
                      }

                      const checked = Boolean(rec?.done?.[task.id]);
                      const sub = rec?.subs?.[task.id];
                      const isSub = Boolean(sub?.name);
                      const collapsible = section.cat === "strength" || section.cat === "mobility";
                      const open = Boolean(expanded[task.id]);

                      return (
                        <div key={task.id} style={border}>
                          <div role="button" tabIndex={0}
                               onClick={() => toggleTask(task.id)}
                               onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTask(task.id); } }}
                               className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                            <span style={{ background: checked || isSub ? cat.color : "transparent", borderColor: checked || isSub ? cat.color : BORDER }}
                                  className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center">
                              {isSub ? <Repeat size={11} strokeWidth={3} color="#fff" /> : checked && <Check size={12} strokeWidth={3} color="#fff" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p style={{ color: checked && !isSub ? TEXT_MUTED : TEXT_PRIMARY, textDecoration: checked && !isSub ? "line-through" : "none" }}
                                 className="text-sm font-medium truncate">
                                {isSub ? sub.name : task.name}
                              </p>
                              {!collapsible && <p style={{ fontFamily: FONT_MONO, color: TEXT_MUTED }} className="text-[11px] mt-0.5">{task.presc}</p>}
                            </div>
                            {collapsible ? (
                              <button onClick={(e) => { e.stopPropagation(); setExpanded((p) => ({ ...p, [task.id]: !open })); }}
                                      aria-label={open ? "Hide detail" : "Show detail"} aria-expanded={open}
                                      style={{ color: TEXT_MUTED }} className="shrink-0 p-1">
                                <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
                              </button>
                            ) : task.video ? (
                              <a href={task.video} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                 style={{ color: cat.color }} className="shrink-0 p-1.5" aria-label="Watch demonstration">
                                <ExternalLink size={14} />
                              </a>
                            ) : null}
                          </div>

                          {collapsible && open && (
                            <div className="px-4 pb-3 pl-12 -mt-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span style={{ fontFamily: FONT_MONO, color: TEXT_SECONDARY, background: BG, borderColor: BORDER }}
                                      className="text-[11px] px-2 py-1 rounded-md border">{task.presc}</span>
                                {task.video && (
                                  <a href={task.video} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                     style={{ color: cat.color }} className="text-[11px] font-semibold flex items-center gap-1">
                                    Watch <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                              {task.detail && <p style={{ color: TEXT_SECONDARY }} className="text-[11px]">{task.detail}</p>}

                              {section.cat === "strength" && (() => {
                                const count = setCountFor(task, ramp);
                                const last = lastLoads[task.id];
                                const lastNote = lastExNotes[task.id];
                                return (
                                  <>
                                    {lastNote && (
                                      <p style={{ background: "rgba(201,115,136,0.1)", color: ROSE, borderColor: "rgba(201,115,136,0.3)" }}
                                         className="text-[11px] px-2 py-1 rounded-md border">📌 {lastNote}</p>
                                    )}
                                    {last && (
                                      <p style={{ color: TEXT_MUTED }} className="text-[11px]">
                                        Last: {last.entries.map((e) => (e?.w != null ? `${e.w}${e.r != null ? `×${e.r}` : ""}` : "–")).join(", ")}
                                        {" · "}{daysBetween(last.dateObj, viewedDate)}d ago
                                      </p>
                                    )}
                                    <div className="flex gap-2 flex-wrap">
                                      {Array.from({ length: count }).map((_, si) => {
                                        const wKey = `${task.id}:${si}:w`, rKey = `${task.id}:${si}:r`;
                                        const le = last?.entries?.[si];
                                        return (
                                          <div key={si} className="flex flex-col items-center gap-0.5">
                                            <span style={{ color: TEXT_MUTED }} className="text-[9px] uppercase tracking-wide">Set {si + 1}</span>
                                            <div className="flex gap-1">
                                              <input type="text" inputMode="decimal" aria-label={`${task.name} set ${si + 1} kg`}
                                                     placeholder={le?.w != null ? String(le.w) : "kg"}
                                                     value={loadDrafts[wKey] ?? ""} onClick={(e) => e.stopPropagation()}
                                                     onChange={(e) => setLoadDrafts((p) => ({ ...p, [wKey]: e.target.value }))}
                                                     onBlur={(e) => commitLoad(task.id, si, "w", e.target.value)}
                                                     style={{ fontFamily: FONT_MONO, borderColor: BORDER, background: BG }}
                                                     className="w-11 text-center text-xs px-1 py-1 rounded-md border" />
                                              <input type="text" inputMode="numeric" aria-label={`${task.name} set ${si + 1} reps`}
                                                     placeholder={le?.r != null ? String(le.r) : "reps"}
                                                     value={loadDrafts[rKey] ?? ""} onClick={(e) => e.stopPropagation()}
                                                     onChange={(e) => setLoadDrafts((p) => ({ ...p, [rKey]: e.target.value }))}
                                                     onBlur={(e) => commitLoad(task.id, si, "r", e.target.value)}
                                                     style={{ fontFamily: FONT_MONO, borderColor: BORDER, background: BG }}
                                                     className="w-10 text-center text-xs px-1 py-1 rounded-md border" />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {task.altName && (
                                      <button onClick={(e) => { e.stopPropagation(); toggleAlt(task.id, task.altName); }}
                                              style={{ color: isSub ? "#fff" : cat.color, background: isSub ? cat.color : "transparent", borderColor: cat.color }}
                                              className="text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border">
                                        <Repeat size={12} />
                                        {isSub ? `Doing: ${task.altName} — switch back` : `Easier option: ${task.altName}`}
                                      </button>
                                    )}
                                    {task.altVideo && (
                                      <a href={task.altVideo} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                         style={{ color: TEXT_SECONDARY }} className="text-[11px] flex items-center gap-1">
                                        Watch the easier option <ExternalLink size={10} />
                                      </a>
                                    )}

                                    <div style={{ borderColor: BORDER }} className="pt-2 border-t">
                                      {editingNote === task.id ? (
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <input type="text" value={exNoteDrafts[task.id] ?? ""}
                                                 onChange={(e) => setExNoteDrafts((p) => ({ ...p, [task.id]: e.target.value }))}
                                                 onBlur={(e) => commitExNote(task.id, e.target.value)}
                                                 placeholder="e.g. try 10 kg next time"
                                                 style={{ borderColor: BORDER, background: BG }}
                                                 className="w-full text-xs px-2.5 py-1.5 rounded-lg border" />
                                          <button onClick={() => setEditingNote(null)} style={{ color: TEXT_SECONDARY }}
                                                  className="text-[11px] font-semibold mt-1.5">Done</button>
                                        </div>
                                      ) : (
                                        <button onClick={(e) => { e.stopPropagation(); setEditingNote(task.id); setExNoteDrafts((p) => ({ ...p, [task.id]: rec?.exNotes?.[task.id] || "" })); }}
                                                style={{ color: TEXT_SECONDARY }} className="text-[11px] font-semibold">
                                          📌 {rec?.exNotes?.[task.id] ? "Edit note" : "Note for next time"}
                                        </button>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------ Calendar ------------------------------ */}
      {view === "calendar" && (
        <CalendarView
          {...{ calYear, calMonth, setCalYear, setCalMonth, calSelected, setCalSelected, overrides,
                todayKey, today, moveSource, setMoveSource, swapBlock, setBlock, resetBlock,
                editingBlock, setEditingBlock, activityDraft, setActivityDraft, addActivity, removeActivity }}
        />
      )}

      {/* ------------------------------- Progress ----------------------------- */}
      {view === "history" && (
        <div className="px-4 max-w-md mx-auto space-y-3">
          {historyRows.length === 0 ? (
            <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-6 text-center">
              <CalendarDays size={22} style={{ color: TEXT_MUTED }} className="mx-auto mb-2" />
              <p className="text-sm font-medium">Nothing here yet</p>
              <p style={{ color: TEXT_MUTED }} className="text-xs mt-1">
                Tick off today and come back — your trends build up day by day.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[[historyRows.length, "Days logged"], [`${Math.round(avgPct * 100)}%`, "Avg · 30d"], [streak, "Streak"]].map(([v, l]) => (
                  <div key={l} style={{ background: CARD, borderColor: BORDER }} className="rounded-xl border p-3 text-center">
                    <p style={{ fontFamily: FONT_MONO }} className="text-lg font-semibold">{v}</p>
                    <p style={{ color: TEXT_MUTED }} className="text-[10px] mt-0.5 uppercase tracking-wide">{l}</p>
                  </div>
                ))}
              </div>

              {energySeries.length > 0 && (
                <ChartCard title="Energy" note="Dots: each day. Line: 7-day average — that's the one to watch."
                           data={energySeries} color={SAGE} domain={[1, 5]} unit="/5" />
              )}
              {symptomSeries.length > 0 && (
                <ChartCard title="Hands / wrists / elbows" note="Lower is better. Watch how this moves against your cycle and your training."
                           data={symptomSeries} color={ROSE} domain={[1, 5]} unit="/5" />
              )}

              {exercisesWithHistory.length > 0 && (
                <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold">Getting stronger</h2>
                    <select value={selectedExerciseId || ""} onChange={(e) => setSelectedExerciseId(e.target.value)}
                            style={{ background: BG, borderColor: BORDER, color: TEXT_PRIMARY }}
                            className="text-[11px] px-2 py-1 rounded-lg border max-w-[150px]">
                      {exercisesWithHistory.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  {loadSeries.length > 1 ? (
                    <div style={{ width: "100%", height: 150 }}>
                      <ResponsiveContainer>
                        <LineChart data={loadSeries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} interval="preserveStartEnd" />
                          <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }}
                                   formatter={(v) => [`${v} kg`, "Heaviest set"]} />
                          <Line type="monotone" dataKey="maxWeight" stroke={ROSE} strokeWidth={2.5} dot={{ r: 2, fill: ROSE }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p style={{ color: TEXT_MUTED }} className="text-xs">Log this exercise twice and a trend appears here.</p>
                  )}
                </div>
              )}

              {completionSeries.length > 0 && (
                <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4">
                  <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold mb-3">Consistency</h2>
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <LineChart data={completionSeries} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }}
                                 formatter={(v) => [`${v}%`, "Complete"]} />
                        <Line type="monotone" dataKey="pct" stroke={SAGE} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4">
                <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold mb-3">Last 12 weeks</h2>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {heatmap.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                      {week.map((cell) => (
                        <div key={cell.date} title={`${cell.date}${cell.pct === null ? "" : ` · ${Math.round(cell.pct * 100)}%`}`}
                             style={{ width: 10, height: 10, borderRadius: 2,
                                      background: cell.pct === null ? "transparent" : `rgba(${HEAT_RGB}, ${0.15 + cell.pct * 0.75})`,
                                      border: `1px solid ${cell.pct === null ? BORDER : "transparent"}` }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------- Program ------------------------------ */}
      {view === "program" && <ProgramView />}
    </div>
  );
}

/* ------------------------------ Sub-components ---------------------------- */

function ChartCard({ title, note, data, color, domain, unit }) {
  const latest = data[data.length - 1];
  return (
    <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold">{title}</h2>
        {latest && (
          <span style={{ fontFamily: FONT_MONO, color: TEXT_SECONDARY }} className="text-xs">
            {latest.value}{unit} · {latest.avg} avg
          </span>
        )}
      </div>
      <div style={{ width: "100%", height: 150 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={domain} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11 }} />
            <Line type="monotone" dataKey="value" stroke={TEXT_MUTED} strokeWidth={1.5} dot={{ r: 2, fill: TEXT_MUTED }} />
            <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-2">{note}</p>
    </div>
  );
}

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const weeks = [];
  const cursor = new Date(year, month, 1 - offset);
  for (let w = 0; w < Math.ceil((offset + days) / 7); w++) {
    const week = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

function CalendarView(p) {
  const weeks = useMemo(() => getMonthMatrix(p.calYear, p.calMonth), [p.calYear, p.calMonth]);
  const selInfo = useMemo(() => resolveSchedule(p.calSelected, "auto", p.overrides, PROGRAM), [p.calSelected, p.overrides]);
  const block = selInfo.slots.strength ? BLOCKS.strength[selInfo.slots.strength] : null;
  const monthLabel = new Date(p.calYear, p.calMonth, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const go = (delta) => {
    let m = p.calMonth + delta, y = p.calYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    p.setCalMonth(m); p.setCalYear(y);
  };

  const pick = (d) => {
    p.setEditingBlock(false);
    p.setActivityDraft("");
    if (p.moveSource) {
      if (dateKey(p.moveSource) !== dateKey(d)) p.swapBlock(p.moveSource, d);
      p.setMoveSource(null);
    }
    p.setCalSelected(d);
    p.setCalMonth(d.getMonth());
    p.setCalYear(d.getFullYear());
  };

  return (
    <div className="px-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => go(-1)} aria-label="Previous month" style={{ borderColor: BORDER, color: TEXT_SECONDARY, background: CARD }} className="rounded-full border p-2">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <h2 style={{ fontFamily: FONT_DISPLAY }} className="text-base font-semibold">{monthLabel}</h2>
          <button onClick={() => pick(p.today)} style={{ color: ROSE }} className="text-[11px] font-semibold">Today</button>
        </div>
        <button onClick={() => go(1)} aria-label="Next month" style={{ borderColor: BORDER, color: TEXT_SECONDARY, background: CARD }} className="rounded-full border p-2">
          <ChevronRight size={16} />
        </button>
      </div>

      {p.moveSource && (
        <div style={{ background: "rgba(201,115,136,0.1)", borderColor: ROSE }} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 mb-3">
          <p className="text-xs">Moving a session — tap the day to swap it with.</p>
          <button onClick={() => p.setMoveSource(null)} style={{ color: ROSE }} className="text-xs font-semibold shrink-0">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} style={{ color: TEXT_MUTED }} className="text-center text-[10px] font-medium">{d}</div>
        ))}
      </div>

      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const inMonth = d.getMonth() === p.calMonth;
              const isToday = dateKey(d) === p.todayKey;
              const isSel = dateKey(d) === dateKey(p.calSelected);
              const i = resolveSchedule(d, "auto", p.overrides, PROGRAM);
              return (
                <button key={dateKey(d)} onClick={() => pick(d)}
                        style={{ background: isSel ? "rgba(201,115,136,0.12)" : CARD,
                                 borderColor: isToday ? ROSE : BORDER,
                                 borderWidth: isToday ? 2 : 1,
                                 borderStyle: i.anyMoved ? "dashed" : "solid" }}
                        className="aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5">
                  <span style={{ fontFamily: FONT_MONO, color: inMonth ? TEXT_PRIMARY : TEXT_MUTED }} className="text-xs">{d.getDate()}</span>
                  <span className="flex gap-0.5 h-1.5">
                    {i.slots.strength && <span style={{ background: ROSE }} className="w-1.5 h-1.5 rounded-full" />}
                    {i.activities.length > 0 && <span style={{ background: CATS.activity.color }} className="w-1.5 h-1.5 rounded-full" />}
                    {d.getDay() === 0 && <span style={{ background: CATS.yoga.color }} className="w-1.5 h-1.5 rounded-full" />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[["Strength", ROSE], ["Yoga", CATS.yoga.color], ["Activity", CATS.activity.color]].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: TEXT_SECONDARY }}>
            <span style={{ background: c }} className="w-2 h-2 rounded-full" />{l}
          </span>
        ))}
      </div>

      <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border overflow-hidden mt-4">
        <div className="px-4 py-3">
          <h3 style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold">
            {p.calSelected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h3>
        </div>

        <div style={{ borderColor: BORDER, borderLeftColor: ROSE }} className="border-t border-l-4 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-y-1.5">
            <div className="flex items-center gap-2">
              <Dumbbell size={14} style={{ color: ROSE }} />
              <p style={{ fontFamily: FONT_DISPLAY }} className="text-xs font-semibold">{block ? block.label : "No session"}</p>
            </div>
            <div className="flex items-center gap-2.5">
              {selInfo.slots.strength && (
                <button onClick={() => p.setMoveSource(p.moveSource ? null : p.calSelected)} style={{ color: ROSE }} className="text-[11px] font-semibold">
                  ⇄ Move
                </button>
              )}
              <button onClick={() => p.setEditingBlock(!p.editingBlock)} style={{ color: TEXT_SECONDARY }} className="text-[11px] font-semibold">
                {selInfo.slots.strength ? "Change" : "Add"}
              </button>
              {selInfo.moved.strength && (
                <button onClick={() => p.resetBlock(p.calSelected)} style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold">Reset</button>
              )}
            </div>
          </div>

          {p.editingBlock && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {STRENGTH_OPTIONS.map((opt) => (
                <button key={String(opt.value)} onClick={() => { p.setBlock(p.calSelected, opt.value); p.setEditingBlock(false); }}
                        style={{ background: selInfo.slots.strength === opt.value ? ROSE : "transparent",
                                 color: selInfo.slots.strength === opt.value ? "#fff" : TEXT_SECONDARY,
                                 borderColor: selInfo.slots.strength === opt.value ? ROSE : BORDER }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border">
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {block && (
            <div className="space-y-1 mt-2">
              {block.exercises.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs flex-1">{e.name}</span>
                  <span style={{ fontFamily: FONT_MONO, color: TEXT_MUTED }} className="text-[11px] shrink-0">{e.presc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderColor: BORDER, borderLeftColor: CATS.activity.color }} className="border-t border-l-4 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} style={{ color: CATS.activity.color }} />
            <p style={{ fontFamily: FONT_DISPLAY }} className="text-xs font-semibold">Extra activity</p>
          </div>
          {selInfo.activities.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {selInfo.activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">{a.name}</span>
                  <button onClick={() => p.removeActivity(p.calSelected, a.id)} aria-label={`Remove ${a.name}`} style={{ color: TEXT_MUTED }} className="shrink-0 p-1">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input type="text" value={p.activityDraft} onChange={(e) => p.setActivityDraft(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") { p.addActivity(p.calSelected, p.activityDraft); p.setActivityDraft(""); } }}
                   placeholder="e.g. Long walk 45 min"
                   style={{ borderColor: BORDER, background: BG }} className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border" />
            <button onClick={() => { p.addActivity(p.calSelected, p.activityDraft); p.setActivityDraft(""); }}
                    style={{ background: CATS.activity.color, color: "#fff" }} className="shrink-0 text-xs font-semibold px-3 rounded-lg">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, color, defaultOpen, children }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div style={{ background: CARD, borderColor: BORDER }} className="rounded-2xl border overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} style={{ borderLeftColor: color }}
              className="w-full text-left border-l-4 px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <p style={{ fontFamily: FONT_DISPLAY }} className="text-sm font-semibold">{title}</p>
          {subtitle && <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown size={16} style={{ color: TEXT_MUTED, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms", flexShrink: 0 }} />
      </button>
      {open && <div style={{ borderColor: BORDER }} className="border-t px-4 py-3 text-sm space-y-3">{children}</div>}
    </div>
  );
}

function ExerciseList({ exercises, color }) {
  return (
    <div className="space-y-1.5">
      {exercises.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex-1">{e.name}</span>
          <span style={{ fontFamily: FONT_MONO, color: TEXT_MUTED }} className="shrink-0">{e.presc}</span>
          {e.video && (
            <a href={e.video} target="_blank" rel="noopener noreferrer" style={{ color }} className="shrink-0 p-2 -m-2" aria-label="Watch demonstration">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function ProgramView() {
  return (
    <div className="px-4 max-w-md mx-auto space-y-3">
      <Section title="Your goals" color={ROSE} defaultOpen>
        <div className="space-y-2 text-xs">
          <p><strong>Strength and toning</strong> — and what you said it's really for: <strong>more energy</strong>.</p>
          <p style={{ color: TEXT_SECONDARY }}>
            That's why the app asks about your energy every day. It's the thing we're actually trying to change, so
            it's the thing worth measuring.
          </p>
        </div>
      </Section>

      <Section title="The week" subtitle="3 sessions · 30–45 min each" color={ROSE}>
        <div className="space-y-1 text-xs">
          {[["Mon", "Day A"], ["Tue", "Walk"], ["Wed", "Day B"], ["Thu", "Walk"], ["Fri", "Day C"], ["Sat", "Rest"], ["Sun", "Yoga"]].map(([d, s]) => (
            <div key={d} className="flex items-center justify-between">
              <span style={{ fontFamily: FONT_MONO, color: TEXT_SECONDARY, width: 46 }} className="shrink-0">{d}</span>
              <span className="flex-1">{s}</span>
            </div>
          ))}
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs">
          Plus the mobility flow every day, and 10,000 steps. Walking days are flexible — move them around your week.
        </p>
      </Section>

      {["a", "b", "c"].map((k) => (
        <Section key={k} title={BLOCKS.strength[k].label} color={ROSE}>
          <ExerciseList exercises={BLOCKS.strength[k].exercises} color={ROSE} />
        </Section>
      ))}

      <Section title="How to get stronger" subtitle="Reps first, weight last" color={ROSE}>
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

      <Section title="Your hands" subtitle="Why the program looks the way it does" color={ROSE}>
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

      <Section title="Gentler weeks" color={SAGE}>
        <p className="text-xs">
          You told John things feel more sensitive around your cycle. The switch in Settings trims every session —
          one less set, lighter, bottom of the rep range. Use it whenever you want it. Training through a rough patch
          at 70% beats skipping the week entirely.
        </p>
      </Section>

      <Section title="Daily mobility" subtitle="~12 min · neck, upper back, rotation" color={SAGE}>
        <ExerciseList exercises={MOBILITY} color={SAGE} />
        <p style={{ color: TEXT_MUTED }} className="text-xs">
          Built around a desk day: opening the upper back, and rotation from three different positions. The breathing
          at the end counts as your meditation.
        </p>
      </Section>

      <Section title="Weekly yoga" subtitle="Sundays · 20–30 min" color={CATS.yoga.color}>
        <p className="text-xs mb-2">Neck, shoulders and upper back — the same areas as the daily flow, with more time.</p>
        <a href="https://www.youtube.com/watch?v=gnVIx5z9-Fk" target="_blank" rel="noopener noreferrer"
           style={{ color: CATS.yoga.color }} className="text-xs font-semibold flex items-center gap-1">
          Open the session <ExternalLink size={12} />
        </a>
      </Section>

      <Section title="Walking" color={SAGE}>
        <div className="text-xs space-y-2">
          <p>2–3 times a week, 20–40 minutes on the treadmill, plus 10,000 steps a day.</p>
          <p style={{ color: TEXT_SECONDARY }}>
            No heart-rate numbers — just how it feels:
          </p>
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

/* ------------------------------ Cloud backup ------------------------------ */

/**
 * Best-effort copy to a Google Apps Script endpoint. Fire-and-forget: a
 * failure here must never block or break the local save, which is the real
 * source of truth. Inert until BACKUP_URL is set.
 */
let backupTimer = null;
function pushBackup(log) {
  if (!BACKUP_URL) return;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    try {
      fetch(BACKUP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ person: "Henna", kind: "backup", payload: { log, syncedAt: new Date().toISOString() } }),
      }).catch(() => {});
    } catch {
      /* offline or blocked — the local copy is unaffected */
    }
  }, 4000);
}
