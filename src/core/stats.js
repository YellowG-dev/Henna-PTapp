// Generic statistics. buildHistoryRows moved to engine.js when it became
// program-driven; these three depend only on rows + dates, so they stay here.
import { dateKey } from "./dates.js";
function computeWeightSeries(rows) {
  const byDate = {};
  rows.forEach((r) => {
    if (r.weight != null) byDate[r.date] = r.weight;
  });
  return rows
    .filter((r) => r.weight != null)
    .map((r) => {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(r.dateObj);
        d.setDate(d.getDate() - i);
        const w = byDate[dateKey(d)];
        if (w != null) {
          sum += w;
          count += 1;
        }
      }
      return {
        date: r.date,
        label: r.dateObj.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        weight: r.weight,
        avg7: count ? Math.round((sum / count) * 10) / 10 : null,
      };
    });
}

function computeStreak(rows, threshold = 0.8) {
  if (!rows.length) return 0;
  const byDate = {};
  rows.forEach((r) => (byDate[r.date] = r));
  const cursor = new Date(rows[rows.length - 1].dateObj);
  let streak = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = dateKey(cursor);
    const r = byDate[key];
    if (r && r.pct >= threshold) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

function buildHeatmapCells(rows, weeksBack = 12) {
  const byDate = {};
  rows.forEach((r) => (byDate[r.date] = r));

  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (weeksBack * 7 - 1));
  start.setDate(start.getDate() - start.getDay()); // snap back to Sunday

  const cells = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = dateKey(cursor);
    cells.push({ date: key, dow: cursor.getDay(), pct: byDate[key] ? byDate[key].pct : null });
    cursor.setDate(cursor.getDate() + 1);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export { computeWeightSeries, computeStreak, buildHeatmapCells };
