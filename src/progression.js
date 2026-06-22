// Progression logic & helpers — pure functions
// ─────────────────────────────────────────────────────────────

// Status from exercise definition.
// - Fixed reps + fixed weight  → 'stable'   (ready to progress)
// - Anything with a range      → 'developing'
// 'plateau' is set elsewhere (when cap is reached and weight can't increase).
function deriveStatus(ex) {
  if (ex.plateau) return 'plateau';
  const repFixed = ex.repMin === ex.repMax;
  const weightFixed = ex.weightMin === ex.weightMax;
  if (repFixed && weightFixed) return 'stable';
  return 'developing';
}

// Did the user hit the ceiling? (max reps AND max weight on every set)
function hitCeiling(ex, sets) {
  if (!sets || sets.length === 0) return false;
  return sets.every(s => s.reps >= ex.repMax && s.weight >= ex.weightMax);
}

// Build the rep button row for a logging set: a couple below to a couple above the range,
// clamped to [1, repCap + 2]. Always includes repMin..repMax.
function repButtonRange(ex) {
  const lo = Math.max(1, ex.repMin - 2);
  const hi = Math.min(ex.repCap + 2, ex.repMax + 2);
  const arr = [];
  for (let r = lo; r <= hi; r++) arr.push(r);
  return arr;
}

// Build weight options: 3 steps below current target → 3 steps above target,
// then dedupe & sort. Always include weightMin, weightMax, current target.
function weightButtonRange(ex) {
  const step = ex.weightStep || 5;
  const center = (ex.weightMin + ex.weightMax) / 2;
  const set = new Set();
  for (let i = -3; i <= 3; i++) {
    const v = roundToStep(center + i * step, step);
    if (v >= 0) set.add(v);
  }
  set.add(ex.weightMin); set.add(ex.weightMax);
  return [...set].sort((a, b) => a - b);
}

function roundToStep(v, step) {
  return Math.round(v / step) * step;
}

// Format a number cleanly: 17.5 → "17.5", 50.0 → "50".
function fmt(n) {
  if (n == null) return '';
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10) / 10);
}

// Pretty target string ("8–10 × 140–160 lbs", "10 × 45 lbs", etc.)
function targetString(ex) {
  const reps = ex.repMin === ex.repMax ? fmt(ex.repMin) : `${fmt(ex.repMin)}–${fmt(ex.repMax)}`;
  const w = ex.weightMin === ex.weightMax ? fmt(ex.weightMin) : `${fmt(ex.weightMin)}–${fmt(ex.weightMax)}`;
  const wPart = (ex.unit === '' && ex.weightMin === 0) ? 'bodyweight' : `${w}${ex.unit ? ' ' + ex.unit : ''}`;
  return `${ex.sets} × ${reps} ${ex.repUnit || 'reps'} · ${wPart}`;
}

// ISO week key, e.g. "2026-W20"
function isoWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = (t.getUTCDay() + 6) % 7; // Mon=0
  t.setUTCDate(t.getUTCDate() - dn + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const wk = 1 + Math.round(((t - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fullDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Given an ISO week key ("2026-W21"), return the Date of its Monday (UTC).
function isoWeekStart(weekKey) {
  const [y, w] = weekKey.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // Mon=0
  const week1Mon = new Date(jan4.getTime() - jan4Dow * 86400000);
  return new Date(week1Mon.getTime() + (w - 1) * 7 * 86400000);
}

// Human label: "Week of May 19" — Sunday/Monday agnostic, shows ISO-week Monday.
function weekLabel(weekKey) {
  const d = isoWeekStart(weekKey);
  return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

// Long label: "May 19 – May 25, 2026"
function weekRangeLabel(weekKey) {
  const start = isoWeekStart(weekKey);
  const end = new Date(start.getTime() + 6 * 86400000);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startFmt = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const endFmt = end.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  return `${startFmt} – ${endFmt}`;
}

// ═══════════════════════════════════════════════════════════════
//  PROGRESSIVE OVERLOAD ENGINE (v2)
//  Pure, offline, no AI. All logic derives from logged data.
// ═══════════════════════════════════════════════════════════════

// Largest weight across a set list.
function maxWeight(sets) {
  return (sets || []).reduce((m, s) => Math.max(m, s.weight || 0), 0);
}

// Total reps across a set list.
function totalReps(sets) {
  return (sets || []).reduce((n, s) => n + (s.reps || 0), 0);
}

// Identical sessions: same length, same reps & weight on every set.
function identicalSessions(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return false;
  return a.every((s, i) => s.reps === b[i].reps && s.weight === b[i].weight);
}

// Standard increment: dumbbells 2.5, machines/cables 5 (encoded in weightStep).
function incrementFor(ex) {
  return ex.weightStep || (typeof stepFor === 'function' ? stepFor(ex.name) : 5) || 5;
}

// Is this a bodyweight exercise?
function isBodyweight(ex) {
  return ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
}

// Deload target: weight × 0.95, rounded to the increment. Shown as a number,
// never a percentage.
function deloadWeight(ex, weight) {
  return roundToStep((weight || 0) * 0.95, incrementFor(ex));
}

const STATUS_LABELS = {
  criteria_met: 'Criteria met — ready to load up',
  partial: 'Partial — hold weight',
  fatigue: 'Fatigue drop detected',
  plateau: 'Plateau detected',
};

// "Up / Down / Same — detail" comparing a session to the previous one.
function comparePerformance(ex, sets, prev) {
  if (!prev || !prev.length) return { dir: 'Same', detail: 'first logged session' };
  const bw = isBodyweight(ex);
  const wNow = maxWeight(sets), wPrev = maxWeight(prev);
  const unit = ex.unit ? ' ' + ex.unit : '';

  if (!bw && wNow !== wPrev) {
    const up = wNow > wPrev;
    return { dir: up ? 'Up' : 'Down', detail: `${up ? 'heavier' : 'lighter'} — ${fmt(wPrev)}${unit} → ${fmt(wNow)}${unit}` };
  }
  // Same top weight → find the set with the largest rep change.
  let best = null;
  const n = Math.min(sets.length, prev.length);
  for (let i = 0; i < n; i++) {
    const d = sets[i].reps - prev[i].reps;
    if (best === null || Math.abs(d) > Math.abs(best.d)) best = { i, d };
  }
  if (!best || best.d === 0) {
    const rNow = totalReps(sets), rPrev = totalReps(prev);
    if (rNow === rPrev) return { dir: 'Same', detail: 'matched last session' };
    const up = rNow > rPrev;
    return { dir: up ? 'Up' : 'Down', detail: `${Math.abs(rNow - rPrev)} ${up ? 'more' : 'fewer'} total reps` };
  }
  const up = best.d > 0;
  return { dir: up ? 'Up' : 'Down', detail: `${Math.abs(best.d)} ${up ? 'more' : 'fewer'} rep${Math.abs(best.d) === 1 ? '' : 's'} on set ${best.i + 1}` };
}

// Core analysis of a session against the exercise's pre-session state and the
// two prior sessions. Returns every signal the UI needs.
function analyze(ex, sets, prev, prevPrev) {
  const bw = isBodyweight(ex);
  const repCeil = ex.repMax;
  const wMaxLogged = maxWeight(sets);

  const hits = sets.map(s => s.reps >= repCeil);
  const allHit = hits.length > 0 && hits.every(Boolean);
  const someHit = hits.some(Boolean);
  const partial = someHit && !allHit;

  // Overload — any set exceeding the rep ceiling by ≥2 (keep the biggest).
  let overload = null;
  sets.forEach((s, i) => {
    const excess = s.reps - repCeil;
    if (excess >= 2 && (!overload || excess > overload.excess)) {
      overload = { set: i + 1, reps: s.reps, excess };
    }
  });

  // Dynamic weight detection — any set above the current ceiling.
  const aboveRange = !bw && wMaxLogged > ex.weightMax;
  const spread = Math.max(0, ex.weightMax - ex.weightMin);
  const newCeil = wMaxLogged;
  const newFloor = Math.max(0, newCeil - spread);

  // Fatigue drop — set 1 vs final set ≥ 3 reps.
  const set1 = sets[0] ? sets[0].reps : 0;
  const lastReps = sets.length ? sets[sets.length - 1].reps : 0;
  const drop = set1 - lastReps;
  const fatigue = drop >= 3;
  const z = fatigue ? deloadWeight(ex, wMaxLogged || ex.weightMax) : null;

  const atRepCap = ex.repMax >= ex.repCap;

  // Plateau A — at rep ceiling (all sets), at weight ceiling, rep cap reached.
  const plateauA = allHit && (bw || wMaxLogged >= ex.weightMax) && atRepCap;
  // Plateau B — identical reps+weight across 3 consecutive sessions.
  const plateauB = identicalSessions(sets, prev) && identicalSessions(prev, prevPrev);
  const plateau = plateauA || plateauB;

  let status;
  if (plateau) status = 'plateau';
  else if (fatigue) status = 'fatigue';
  else if (allHit) status = 'criteria_met';
  else status = 'partial';

  return {
    bodyweight: bw, repCeil, wMaxLogged,
    allHit, partial, someHit,
    overload, aboveRange, newCeil, newFloor, spread,
    fatigue, drop, z, set1, lastReps,
    atRepCap, plateauA, plateauB, plateau,
    status,
    vs: comparePerformance(ex, sets, prev),
  };
}

// Three-line summary built directly from a session's analysis.
//   Line 1 — performance vs last session (Up / Down / Same + detail)
//   Line 2 — progression status (one of the four canonical labels)
//   Line 3 — one actionable note

// Plateau "Next Step" — the specific action from the staged plateau response.
// Always concrete, always with exact numbers; never a vague "vary the stimulus".
// last / prev / prevPrev are set-lists (most-recent first among the three).
//   Stage 1  reps below cap            → add a rep (N+1)
//   Stage 2  reps at cap               → add weight (current + increment)
//   Stage 2-hold  weight just raised,
//            rep floor not rebuilt yet  → hold weight, build back to the floor
//   Stage 3  three identical sessions
//            already at the top         → slow the eccentric / deload
function plateauNextStep(ex, last, prev, prevPrev) {
  const bw = isBodyweight(ex);
  const unit = ex.unit ? ' ' + ex.unit : '';
  const repUnit = ex.repUnit || 'reps';
  const repCap = ex.repCap;
  const repFloor = ex.repMin;
  const incr = incrementFor(ex);

  const sets = last || [];
  const N = sets.length ? sets[sets.length - 1].reps : 0;        // final-set reps
  const minReps = sets.length ? Math.min(...sets.map(s => s.reps)) : 0;
  const X = maxWeight(sets);                                      // current top weight
  const Xnext = roundToStep(X + incr, incr);

  const wPrev = prev && prev.length ? maxWeight(prev) : X;
  const wPrev2 = prevPrev && prevPrev.length ? maxWeight(prevPrev) : wPrev;
  const weightRaisedRecently = !bw && (X > wPrev || wPrev > wPrev2);

  // Stage 2-hold — weight was just/recently raised and the rep floor isn't back.
  if (!bw && weightRaisedRecently && minReps < repFloor) {
    return `Hold at ${fmt(X)}${unit} — build back to ${fmt(repFloor)} ${repUnit}`;
  }
  // Stage 1 — reps still below the cap: add a rep.
  if (N < repCap) {
    return `Increase to ${N + 1} ${repUnit} next session`;
  }
  // Reps are at the cap.
  if (!bw) {
    // Stage 3 — three identical sessions already at the top of the range: the load
    // can't keep climbing on schedule, so change the stimulus or deload.
    const stuck = identicalSessions(sets, prev) && identicalSessions(prev, prevPrev);
    if (stuck && X >= ex.weightMax) {
      return 'Slow the eccentric to 3 seconds, or consider a deload';
    }
    // Stage 2 — rep cap reached: add weight.
    return `Increase weight to ${fmt(Xnext)}${unit} next session`;
  }
  // Bodyweight at cap — keep adding reps.
  return `Increase to ${N + 1} ${repUnit} next session`;
}

function buildSummary(ex, sets, prev, prevPrev) {
  const a = analyze(ex, sets, prev, prevPrev);
  const unit = ex.unit ? ' ' + ex.unit : '';

  const line2 = STATUS_LABELS[a.status];

  let line3;
  if (a.status === 'plateau') {
    line3 = plateauNextStep(ex, sets, prev, prevPrev);
  } else if (a.status === 'fatigue') {
    line3 = `Set 1 was ${a.set1} reps, final set was ${a.lastReps} reps. Consider dropping to ${fmt(a.z)}${unit} next session.`;
  } else if (a.status === 'criteria_met') {
    line3 = a.bodyweight
      ? `Every set reached ${a.repCeil} — add a rep next session.`
      : `Every set hit ${a.repCeil} — confirm the load increase.`;
  } else if (a.overload) {
    line3 = `Set ${a.overload.set} ran ${a.overload.excess} over target — the load is light.`;
  } else {
    line3 = a.someHit
      ? 'Some sets short of the ceiling — hold weight, build the rest up.'
      : 'Working within range — hold weight, add reps next time.';
  }

  return { dir: a.vs.dir, line1: `${a.vs.dir} — ${a.vs.detail}`, line2, line3, status: a.status };
}

// ═══════════════════════════════════════════════════════════════
//  NEXT-SESSION COACH (v4) — deterministic, exactly three outcomes
//  Computed from a SINGLE logged set vs the exercise's stored rep range
//  and weight range. No vague suggestions, no dependence on other sets.
//
//    1. reps < repMin                          → "Repeat weight next session."
//    2. reps in range AND weight < weightMax   → hold (no numeric suggestion)
//    3. reps at repMax AND weight at weightMax → "Weight range increases."
//                                                (shift weight range +1 step,
//                                                 reps reset to floor behaviorally)
//  No other states exist.
// ═══════════════════════════════════════════════════════════════
const VERDICT = {
  repeat:   { kind: 'repeat',   text: 'Repeat weight next session.' },
  hold:     { kind: 'hold',     text: 'Logged \u2014 keep working within current range.' },
  increase: { kind: 'increase', text: 'Weight range increases.' },
};

// The verdict for one just-logged set. Returns null if the set is incomplete.
function nextSessionVerdict(ex, set) {
  if (!ex || !set || set.reps == null || set.weight == null) return null;
  const reps = set.reps, weight = set.weight;
  // 1 — below the rep floor: hold the load, repeat next session.
  if (reps < ex.repMin) return VERDICT.repeat;
  // 3 — both ceilings reached in this set: the weight range steps up.
  //     Bodyweight is excluded (no weight ceiling to raise) and falls to hold.
  if (!isBodyweight(ex) && reps >= ex.repMax && weight >= ex.weightMax) return VERDICT.increase;
  // 2 — inside the range, below the weight ceiling: nothing changes.
  return VERDICT.hold;
}

// True iff ANY logged set hit both ceilings. The weight range is shifted exactly
// once per session regardless of how many sets qualified.
function sessionRaisesRange(ex, sets) {
  return (sets || []).some(s => {
    const v = nextSessionVerdict(ex, s);
    return v && v.kind === 'increase';
  });
}

// One governing verdict for the post-session summary. Priority: increase > repeat > hold.
function governingVerdict(ex, sets) {
  let sawRepeat = false;
  for (const s of (sets || [])) {
    const v = nextSessionVerdict(ex, s);
    if (!v) continue;
    if (v.kind === 'increase') return VERDICT.increase;
    if (v.kind === 'repeat') sawRepeat = true;
  }
  return sawRepeat ? VERDICT.repeat : VERDICT.hold;
}

// Verdict snapshot for the most recent session of a stored exercise.
function summarize(ex, history) {
  if (!history || !history.length) return null;
  const last = history[history.length - 1];
  return {
    verdict: governingVerdict(ex, last.sets),
    perSet: (last.sets || []).map(s => nextSessionVerdict(ex, s)),
    status: deriveStatus(ex),
  };
}

// Ordered queue of actionable post-log prompts for a freshly logged session.
// Returns at most one weight/progression prompt plus an optional plateau panel,
// so the user is never asked to raise the load twice for the same session.
//   dynamicWeight → overload → progression  (mutually exclusive)
//   plateau replaces all of the above when a plateau is detected
function buildPrompts(a, ex) {
  const prompts = [];
  if (a.aboveRange) {
    prompts.push({ type: 'dynamicWeight', x: a.newCeil, newFloor: a.newFloor });
  } else if (a.plateau) {
    prompts.push({ type: 'plateau', reason: a.plateauB ? 'identical' : 'ceiling' });
  } else if (a.overload && !a.bodyweight) {
    prompts.push({ type: 'overload', set: a.overload.set, reps: a.overload.reps, excess: a.overload.excess });
  } else if (a.allHit) {
    const canProgress = a.bodyweight ? (ex.repMax < ex.repCap) : true;
    if (canProgress) prompts.push({ type: 'progression' });
  }
  return prompts;
}

// Total logged sessions across the whole store (used to re-arm the deload banner).
function totalSessionCount(store) {
  return Object.values(store.sessions || {}).reduce((n, arr) => n + (arr ? arr.length : 0), 0);
}

// Deload scan across all four days: ≥3 distinct exercises whose last two
// sessions show the same top weight but fewer total reps.
function detectDeload(store) {
  const declining = [];
  for (const day of store.days) {
    for (const ex of day.exercises) {
      const h = store.sessions[ex.id] || [];
      if (h.length < 2) continue;
      const a = h[h.length - 2], b = h[h.length - 1];
      if (maxWeight(b.sets) === maxWeight(a.sets) && totalReps(b.sets) < totalReps(a.sets)) {
        declining.push(ex.name);
      }
    }
  }
  return { signal: declining.length >= 3, count: declining.length, exercises: declining };
}

Object.assign(window, {
  deriveStatus, hitCeiling, repButtonRange, weightButtonRange,
  roundToStep, fmt, targetString, isoWeekKey, isoWeekStart,
  weekLabel, weekRangeLabel, shortDate, fullDate,
  // engine v2
  maxWeight, totalReps, identicalSessions, incrementFor, isBodyweight,
  deloadWeight, comparePerformance, analyze, summarize, buildSummary,
  plateauNextStep,
  buildPrompts, totalSessionCount, detectDeload,
  STATUS_LABELS,
  // coach v4 — deterministic next-session verdict
  VERDICT, nextSessionVerdict, sessionRaisesRange, governingVerdict,
});
