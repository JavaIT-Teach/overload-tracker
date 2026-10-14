// app.jsx — root app, day tabs, edit mode, JSON import/export
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pol_tracker_v1';
const PALETTE_KEY = 'pol_palette_v1';

const PALETTES = [
  {
    id: 'default',
    name: 'Teal',
    swatch: '#2E7172',
    vars: {
      '--paper': '#FFFFFF', '--paper-2': '#F0EFE9',
      '--ink': '#0E0E10', '--ink-2': '#2A2A2E',
      '--accent': '#2E7172', '--accent-2': '#215859',
      '--accent-tint': 'rgba(46,113,114,0.08)',
      '--card-bg': '#F0EFE9', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#5A5A62', '--muted-2': '#8A8A94',
      '--hair': 'rgba(14,14,16,0.10)', '--hair-2': 'rgba(14,14,16,0.06)',
      '--rule-thick': 'rgba(14,14,16,0.18)',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#BE185D',
    vars: {
      '--paper': '#FFF5F7', '--paper-2': '#FCE7EF',
      '--ink': '#1A0610', '--ink-2': '#4A1228',
      '--accent': '#BE185D', '--accent-2': '#9D0C46',
      '--accent-tint': 'rgba(190,24,93,0.08)',
      '--card-bg': '#FCE7EF', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#8B4A6A', '--muted-2': '#B87A94',
      '--hair': 'rgba(26,6,16,0.10)', '--hair-2': 'rgba(26,6,16,0.06)',
      '--rule-thick': 'rgba(26,6,16,0.18)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    swatch: '#C0392B',
    vars: {
      '--paper': '#FDFAF8', '--paper-2': '#F5EDE8',
      '--ink': '#1A0A06', '--ink-2': '#3D1A12',
      '--accent': '#C0392B', '--accent-2': '#96281B',
      '--accent-tint': 'rgba(192,57,43,0.08)',
      '--card-bg': '#F5EDE8', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#7A5A52', '--muted-2': '#A08078',
      '--hair': 'rgba(26,10,6,0.10)', '--hair-2': 'rgba(26,10,6,0.06)',
      '--rule-thick': 'rgba(26,10,6,0.18)',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    swatch: '#4338CA',
    vars: {
      '--paper': '#FAFAFF', '--paper-2': '#EBEBF8',
      '--ink': '#0A0A1A', '--ink-2': '#1E1E4A',
      '--accent': '#4338CA', '--accent-2': '#3730A3',
      '--accent-tint': 'rgba(67,56,202,0.08)',
      '--card-bg': '#EBEBF8', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#5858A0', '--muted-2': '#8888C0',
      '--hair': 'rgba(10,10,26,0.10)', '--hair-2': 'rgba(10,10,26,0.06)',
      '--rule-thick': 'rgba(10,10,26,0.18)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#334155',
    vars: {
      '--paper': '#F8F9FB', '--paper-2': '#EDF0F4',
      '--ink': '#0F172A', '--ink-2': '#334155',
      '--accent': '#3B82F6', '--accent-2': '#2563EB',
      '--accent-tint': 'rgba(59,130,246,0.09)',
      '--card-bg': '#EDF0F4', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#64748B', '--muted-2': '#94A3B8',
      '--hair': 'rgba(15,23,42,0.10)', '--hair-2': 'rgba(15,23,42,0.06)',
      '--rule-thick': 'rgba(15,23,42,0.18)',
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    swatch: '#B5651D',
    vars: {
      '--paper': '#FEFAF4', '--paper-2': '#F4ECD8',
      '--ink': '#1C1208', '--ink-2': '#3D2A10',
      '--accent': '#B5651D', '--accent-2': '#8B4A12',
      '--accent-tint': 'rgba(181,101,29,0.09)',
      '--card-bg': '#F4ECD8', '--card-border': 'rgba(0,0,0,0.07)',
      '--muted': '#7A6040', '--muted-2': '#A8906A',
      '--hair': 'rgba(28,18,8,0.10)', '--hair-2': 'rgba(28,18,8,0.06)',
      '--rule-thick': 'rgba(28,18,8,0.18)',
    },
  },
];

const ST_VARS_DEFAULT = {
  '--st-dev': '#6B7280', '--st-dev-bg': '#EEF0F3',
  '--st-stable': '#15803D', '--st-stable-bg': '#E6F6EC',
  '--st-plateau': '#B45309', '--st-plateau-bg': '#FDF1DC',
};

function applyPalette(id) {
  const p = PALETTES.find(p => p.id === id) || PALETTES[0];
  const root = document.documentElement;
  // Reset st-* to defaults first, then apply palette (which may override them)
  Object.entries(ST_VARS_DEFAULT).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(p.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  document.body.style.background = p.vars['--paper'];
}
// Stamped onto saved data. NOTE: a version mismatch no longer WIPES your
// data — loading is non-destructive. The seed (routine definitions + the
// hardcoded session history) is RECONCILED into whatever is stored: missing
// exercises are added and missing seeded sessions are merged in by
// exercise+date, but nothing you've logged is ever overwritten or removed.
const SEED_VERSION = 10;

// ── Storage layer ─────────────────────────────────────────────
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // basic shape check
    if (!parsed.days || !Array.isArray(parsed.days)) return null;
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.notes) parsed.notes = {};
    if (!parsed.archive) parsed.archive = [];
    if (!Array.isArray(parsed.removedExerciseIds)) parsed.removedExerciseIds = [];
    if (!parsed.rotation) parsed.rotation = { 1: { count: 0 }, 2: { count: 0 }, 3: { count: 0 }, 4: { count: 0 } };
    // Intentionally NO version-based wipe here. Stored sessions are kept
    // as-is; reconcileStore() brings in any new seed definitions/history.
    return parsed;
  } catch (e) {
    console.warn('Failed to load store:', e);
    return null;
  }
}

// Drop a day that's been retired from the seed entirely (rather than just
// reordered/re-exercised) — e.g. Day 4 · UPPER, removed in the Aug 2026
// consolidation from a 4-day PULL/PUSH/LEGS/UPPER split down to a 3-day
// PULL/PUSH/LEGS split (training frequency dropped to 3x/week). Session and
// note data is keyed by exercise id, not by day, so nothing is deleted —
// those exercises' history remains resolvable via whichever live day now
// hosts an archived copy of their definition (see addArchived() in
// seed.js). Must run BEFORE reconcileDays, otherwise reconcileDays would
// add a second copy of each migrated exercise id (one already sitting in
// the stale retired day, one freshly added to its new host day) before this
// had a chance to remove the stale one. Idempotent — a no-op once the
// retired day is gone.
const RETIRED_DAY_IDS = []; // Day 4 · UPPER re-activated in Workout 6.0
function dropRetiredDays(store) {
  store.days = (store.days || []).filter(d => !RETIRED_DAY_IDS.includes(d.id));
  return store;
}

// IDs that were previously filed under Day 1/2 as addArchived(4,...) entries.
// In Workout 6.0 they move back to Day 4. Remove them from Day 1/2 so they
// don't appear as stale custom exercises there after the version bump.
const DAY4_MIGRATED_IDS = new Set([
  cryptoId('d4_Reverse Curl'),
  cryptoId('d4_Cable Biceps Curl'),
  cryptoId('d4_Neutral-Grip Row Machine'),
  cryptoId('d4_Cable Fly'),
  cryptoId('d4_Close-Grip Bench Press'),
  cryptoId('d4_Flat Dumbbell Bench Press'),
  cryptoId('d4_Lateral Raise'),
]);
function removeDay4MigratedExercises(store) {
  store.days = (store.days || []).map(d => {
    if (d.id !== 1 && d.id !== 2) return d;
    return { ...d, exercises: (d.exercises || []).filter(e => !DAY4_MIGRATED_IDS.has(e.id)) };
  });
  return store;
}

// Ensure every seed day/exercise exists in the store WITHOUT touching any
// exercise that's already there (so user-progressed targets are preserved).
// Exercises the user has deliberately removed (tracked in
// store.removedExerciseIds) are never re-added by this pass.
function reconcileDays(store) {
  const seedDays = (typeof SEED_STORE !== 'undefined' && SEED_STORE.days) ? SEED_STORE.days : null;
  if (!seedDays) return store;
  const removedIds = new Set(store.removedExerciseIds || []);
  const byId = new Map((store.days || []).map(d => [d.id, d]));
  seedDays.forEach(sd => {
    const existing = byId.get(sd.id);
    if (!existing) {
      const freshDay = JSON.parse(JSON.stringify(sd));
      freshDay.exercises = freshDay.exercises.filter(e => !removedIds.has(e.id));
      store.days.push(freshDay);
      return;
    }
    const haveIds = new Set(existing.exercises.map(e => e.id));
    sd.exercises.forEach(se => {
      if (removedIds.has(se.id)) return; // deliberately removed — don't resurrect
      if (!haveIds.has(se.id)) existing.exercises.push(JSON.parse(JSON.stringify(se)));
    });
  });
  return store;
}

// Refresh only the TARGET fields of seeded exercises from the current seed
// definitions (sets / rep range / weight range / cap / notation). Leaves
// sessions, notes and custom weights untouched. Runs once per version bump.
function refreshTargetsFromSeed(store) {
  const seedDays = (typeof SEED_STORE !== 'undefined' && SEED_STORE.days) ? SEED_STORE.days : null;
  if (!seedDays) return store;
  const seedById = new Map();
  seedDays.forEach(d => d.exercises.forEach(e => seedById.set(e.id, e)));
  (store.days || []).forEach(d => {
    d.exercises.forEach(e => {
      const sd = seedById.get(e.id);
      if (!sd) return; // user-added exercise — leave alone
      e.sets = sd.sets;
      e.repMin = sd.repMin; e.repMax = sd.repMax;
      e.weightMin = sd.weightMin; e.weightMax = sd.weightMax;
      e.repCap = sd.repCap;
      e.weightStep = sd.weightStep;
      e.unit = sd.unit;
      e.notation = sd.notation;
      e.repUnit = sd.repUnit;
      if (sd.progressionType) e.progressionType = sd.progressionType;
      delete e.plateau; // clear stale plateau flag on refreshed targets
    });
  });
  return store;
}

// Rebuild each day's exercise ORDER (and archived/calibration flags) from
// the current seed, on a version bump only. refreshTargetsFromSeed already
// syncs target numbers for matched IDs but never touches array position or
// the archived/calibration flags, so a reorder- or archive-only seed change
// (like Workout 5.0) wouldn't otherwise reach an existing install. Session
// history (store.sessions) lives outside day.exercises and is never touched
// here; a genuinely custom exercise (added via "+ Add Exercise", not part of
// any seed) is kept, appended after the seed-ordered ones. An exercise the
// user explicitly removed (removedExerciseIds) is not resurrected.
function resyncExercisesFromSeed(store) {
  const seedDays = (typeof SEED_STORE !== 'undefined' && SEED_STORE.days) ? SEED_STORE.days : null;
  if (!seedDays) return store;
  const removedIds = new Set(store.removedExerciseIds || []);
  store.days = (store.days || []).map(day => {
    const seedDay = seedDays.find(sd => sd.id === day.id);
    if (!seedDay) return day;
    const seedIds = new Set(seedDay.exercises.map(e => e.id));
    const custom = (day.exercises || []).filter(e => !seedIds.has(e.id));
    const ordered = seedDay.exercises
      .filter(se => !removedIds.has(se.id))
      .map(se => JSON.parse(JSON.stringify(se)));
    return { ...day, exercises: [...ordered, ...custom] };
  });
  return store;
}

// ── Seed-rename migration ─────────────────────────────────────
// When a seed exercise is renamed its cryptoId changes (IDs are derived from
// name). Add an entry here for every such rename; the migration finds the old
// exercise in the stored list, re-IDs it in place, merges any sessions/notes
// that accumulated under either ID, and removes any phantom duplicate that
// reconcileDays may have already appended.  Runs on every reconcileStore call
// but is idempotent: after the first pass the old ID is gone, so it's a no-op.
const SEED_RENAMES = [
  // Jul 2026: Chest-Supported Row Machine → Low Rows
  {
    oldId: cryptoId('d1_Chest-Supported Row Machine'),
    newId: cryptoId('d1_Low Rows'),
  },
];

function applySeedRenames(store) {
  const isoDay = iso => String(iso).slice(0, 10);
  for (const { oldId, newId } of SEED_RENAMES) {
    // 1. Re-ID the exercise in place; track which day it lives in.
    let targetDay = null;
    for (const d of (store.days || [])) {
      for (const e of d.exercises) {
        if (e.id === oldId) { e.id = newId; targetDay = d; }
      }
    }
    // 2. Remove any phantom duplicate with newId that reconcileDays may have
    //    previously appended (keep only the first occurrence = the original slot).
    if (targetDay) {
      let seen = false;
      targetDay.exercises = targetDay.exercises.filter(e => {
        if (e.id !== newId) return true;
        if (!seen) { seen = true; return true; }
        return false; // drop phantom
      });
    }
    // 3. Merge sessions: combine old-ID and new-ID arrays, deduplicate by date.
    const oldSessions = store.sessions[oldId];
    if (oldSessions) {
      const existing = store.sessions[newId] || [];
      const existingDates = new Set(existing.map(s => isoDay(s.date)));
      const additions = oldSessions.filter(s => !existingDates.has(isoDay(s.date)));
      store.sessions[newId] = [...existing, ...additions]
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      delete store.sessions[oldId];
    }
    // 4. Transfer notes (if any).
    if (store.notes && store.notes[oldId] && !store.notes[newId]) {
      store.notes[newId] = store.notes[oldId];
      delete store.notes[oldId];
    }
  }
}

// Full non-destructive reconciliation: bring the store up to the current
// seed (definitions + hardcoded history), keeping all logged data, then
// stamp the version. Safe to run on every load (idempotent).
function reconcileStore(store) {
  const upgrading = store.seedVersion !== SEED_VERSION;
  applySeedRenames(store); // must run before reconcileDays
  dropRetiredDays(store); // must run before reconcileDays — see comment above
  if (upgrading) {
    // Move old addArchived Day 4 exercises out of Days 1/2 before
    // reconcileDays re-adds them under Day 4.
    removeDay4MigratedExercises(store);
  }
  reconcileDays(store);
  // One-time, on a version bump only: align targets (and order/archived
  // flags) with the latest seed so existing installs reflect the new
  // progression. Never re-runs once stamped, so any future in-app
  // progression you make is preserved.
  if (upgrading) {
    refreshTargetsFromSeed(store);
    resyncExercisesFromSeed(store);
    // Seed missing standing notes from SEED_STORE.notes.
    if (!store.notes) store.notes = {};
    const seedNotes = (typeof SEED_STORE !== 'undefined' && SEED_STORE.notes) ? SEED_STORE.notes : {};
    for (const [id, sn] of Object.entries(seedNotes)) {
      if (!store.notes[id]) {
        store.notes[id] = { text: sn.text, savedAt: new Date().toISOString() };
      }
    }
    // Init rotation counters if missing or if Day 4 was just re-added.
    if (!store.rotation) store.rotation = {};
    for (const dayId of [1, 2, 3, 4]) {
      if (!store.rotation[dayId]) store.rotation[dayId] = { count: 0 };
    }
  }
  if (typeof mergeSeedHistory === 'function') mergeSeedHistory(store);
  store.seedVersion = SEED_VERSION;
  return store;
}

function saveStore(store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch (e) { console.warn('Save failed:', e); }
}

function freshStore() {
  // Prefer the seeded pre-loaded state if available. Falls back to a
  // bare-routine clone of DEFAULT_ROUTINE if seed didn't load for any reason.
  const seed = (typeof SEED_STORE !== 'undefined') ? SEED_STORE : null;
  const base = seed ? JSON.parse(JSON.stringify(seed)) : {
    days: JSON.parse(JSON.stringify(DEFAULT_ROUTINE.days)),
    sessions: {},
    notes: {},
    archive: [],
  };
  if (!Array.isArray(base.removedExerciseIds)) base.removedExerciseIds = [];
  if (!base.rotation) base.rotation = { 1: { count: 0 }, 2: { count: 0 }, 3: { count: 0 }, 4: { count: 0 } };
  // Seed the hardcoded session history onto the fresh routine.
  return reconcileStore(base);
}

// ── Custom-preset storage (normalized per-exercise localStorage keys) ──
// Presets are stored OUTSIDE the main store blob, one localStorage entry per
// exercise, under the key  presets_<normalizeKey(name)>.  normalizeKey() is
// applied identically on every read and write so the same name always maps to
// the same key.
function normalizeKey(name) {
  return String(name).toLowerCase().replace(/ /g, '_');
}

function presetStorageKey(name) {
  return 'presets_' + normalizeKey(name);
}

function readPresets(name) {
  try {
    const raw = localStorage.getItem(presetStorageKey(name));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(w => Number.isFinite(w)) : [];
  } catch (e) {
    return [];
  }
}

function writePresets(name, arr) {
  try {
    localStorage.setItem(presetStorageKey(name), JSON.stringify(arr));
  } catch (e) {
    console.warn('Preset save failed:', e);
  }
}

// ── "Done this visit" storage (sessionStorage, not the main store) ─────
// doneIds is UI-only — it never affects logged session data — but it's kept
// in sessionStorage rather than bare React state so it survives an
// OS-triggered tab reload (e.g. iOS Safari discarding a backgrounded tab
// under memory pressure), while still resetting on an actual tab/browser
// close, matching the "New session" UX. Reads/writes are defensive: if
// sessionStorage is unavailable (some private-browsing modes throw on
// access) this silently falls back to in-memory-only behavior.
const DONE_IDS_KEY = 'pol_done_ids';

function readDoneIds() {
  try {
    const raw = sessionStorage.getItem(DONE_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

function writeDoneIds(idSet) {
  try {
    sessionStorage.setItem(DONE_IDS_KEY, JSON.stringify([...idSet]));
  } catch (e) {
    // sessionStorage unavailable — doneIds stays in-memory-only for this visit.
  }
}

// ── Root app ─────────────────────────────────────────────────
function App() {
  const [store, setStore] = useState(() => {
    const loaded = loadStore();
    return loaded ? reconcileStore(loaded) : freshStore();
  });
  const [activeDay, setActiveDay] = useState(() => {
    const saved = parseInt(localStorage.getItem('pol_active_day'), 10);
    return Number.isFinite(saved) ? saved : 1;
  });
  const [palette, setPaletteId] = useState(() => localStorage.getItem(PALETTE_KEY) || 'default');
  React.useEffect(() => { applyPalette(palette); }, [palette]);
  const setPalette = (id) => { setPaletteId(id); localStorage.setItem(PALETTE_KEY, id); };

  const [editMode, setEditMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Live Exercise Mode — { exId, originRect } of the tapped card, or null.
  const [liveEx, setLiveEx] = useState(null);
  // Bumped on every preset write so the list re-reads from localStorage.
  const [presetsTick, setPresetsTick] = useState(0);

  // "Done" indicator — UI-only marker for exercises logged this visit. Never
  // affects logged session data (that's in store.sessions). Backed by
  // sessionStorage (see readDoneIds/writeDoneIds above) rather than bare
  // React state so it survives a silent OS-triggered tab reload; still
  // resets on day switch, the "New session" button, or an actual tab close.
  const [doneIds, setDoneIds] = useState(() => readDoneIds());

  // Rotation — tracks whether we've incremented this day's session count
  // for the current browser visit. Resets whenever the active day changes.
  const rotationCountedRef = useRef(false);

  // Apply an update to doneIds and mirror it to sessionStorage in lockstep.
  const updateDoneIds = (next) => {
    setDoneIds(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      writeDoneIds(resolved);
      return resolved;
    });
  };

  // Auto-hide header on scroll-down, reveal on scroll-up.
  // Direction-based: compares current window.scrollY to previous on every event.
  const [topBarHidden, setTopBarHidden] = useState(false);
  const hideGroupRef = useRef(null);
  const [hideHeight, setHideHeight] = useState(140);

  // Measure the hide-group so we know how far to slide everything up.
  React.useLayoutEffect(() => {
    const measure = () => {
      if (hideGroupRef.current) {
        setHideHeight(hideGroupRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeDay]);

  useEffect(() => {
    let last = window.scrollY || 0;
    let ticking = false;

    const update = () => {
      const y = Math.max(0, window.scrollY || 0);
      const dy = y - last;

      // Always reveal near the top of the page
      if (y < 40) {
        setTopBarHidden(false);
      } else if (dy > 6) {
        // Scrolling down — hide
        setTopBarHidden(true);
      } else if (dy < -6) {
        // Scrolling up — reveal
        setTopBarHidden(false);
      }
      last = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Reset to top when switching days. Effects run after the initial mount
  // too (not just on subsequent [activeDay] changes) — skip the doneIds
  // clear on that first run, or a sessionStorage-seeded doneIds (surviving
  // an OS-triggered tab reload) would get wiped immediately after loading.
  const isInitialDayRender = useRef(true);
  useEffect(() => {
    setTopBarHidden(false);
    window.scrollTo(0, 0);
    rotationCountedRef.current = false;
    if (isInitialDayRender.current) {
      isInitialDayRender.current = false;
      return;
    }
    updateDoneIds(new Set());
  }, [activeDay]);

  // Persist on every change
  useEffect(() => { saveStore(store); }, [store]);
  useEffect(() => { localStorage.setItem('pol_active_day', activeDay); }, [activeDay]);

  const day = store.days.find(d => d.id === activeDay) || store.days[0];

  const updateDays = (mutator) => {
    setStore(s => ({ ...s, days: mutator(s.days) }));
  };

  // ── Mutations ────────────────────────────────────────────────
  const logSession = (exId, { sets, note, clusterMode }, statusAtLog) => {
    const ex = findEx(store, exId);
    if (!ex) return;
    const entry = {
      date: new Date().toISOString(),
      sets,
      note: note || '',
      status: statusAtLog,
      unit: ex.unit,
      target: targetString(ex),
      clusterMode: clusterMode || false,
    };
    // Calibration: the FIRST-EVER logged session for this exercise sets its
    // baseline weight range from the actual top set, then clears the flag so
    // every later session behaves like a normal exercise. No-op for a
    // bodyweight calibration exercise (nothing to calibrate weight-wise).
    const isFirstEverSession = !(store.sessions[exId] && store.sessions[exId].length);
    const isBw = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
    const shouldCalibrate = ex.calibration && isFirstEverSession && !isBw;
    const baseline = shouldCalibrate ? roundToStep(maxWeight(sets), ex.weightStep || 5) : null;
    // Increment this day's rotation counter on the first log of each visit.
    const willCountRotation = !rotationCountedRef.current;
    if (willCountRotation) rotationCountedRef.current = true;
    setStore(s => {
      const rot = s.rotation || {};
      const dayRot = rot[day.id] || { count: 0 };
      return {
        ...s,
        sessions: {
          ...s.sessions,
          [exId]: [...(s.sessions[exId] || []), entry],
        },
        days: shouldCalibrate
          ? s.days.map(d => ({
              ...d,
              exercises: d.exercises.map(e => e.id === exId
                ? { ...e, calibration: false, weightMin: baseline, weightMax: baseline }
                : e),
            }))
          : s.days,
        rotation: willCountRotation
          ? { ...rot, [day.id]: { ...dayRot, count: dayRot.count + 1 } }
          : rot,
      };
    });
    updateDoneIds(prev => new Set(prev).add(exId));
  };

  const clearDoneIds = () => updateDoneIds(new Set());

  const toggleDone = (exId) => {
    updateDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId); else next.add(exId);
      return next;
    });
  };

  // Stamp a progression marker on the most recent session of an exercise.
  function stampProgression(sessions, exId, marker) {
    const next = { ...sessions };
    const sess = next[exId] || [];
    if (sess.length > 0) {
      const last = { ...sess[sess.length - 1], progression: marker };
      next[exId] = [...sess.slice(0, -1), last];
    }
    return next;
  }

  // DOUBLE PROGRESSION / OVERLOAD — apply one standard increment.
  // Weighted: shift the whole weight range up by the increment (preserving
  // spread); the rep range is unchanged (reps "reset to floor" behaviorally,
  // and stay frozen when the rep cap is reached). Bodyweight: add one rep
  // toward the cap. Clears any plateau flag.
  const applyIncrement = (exId, override) => {
    setStore(s => {
      let marker = null;
      const days = s.days.map(d => ({
        ...d,
        exercises: d.exercises.map(e => {
          if (e.id !== exId) return e;
          const archive = [...(e.archivedTargets || []), {
            date: new Date().toISOString(),
            repMin: e.repMin, repMax: e.repMax,
            weightMin: e.weightMin, weightMax: e.weightMax,
          }];
          const bw = isBodyweight(e);
          if (bw) {
            const nr = Math.min(e.repCap, e.repMax + 1);
            marker = { kind: 'reps', toReps: nr };
            return { ...e, archivedTargets: archive, repMin: nr, repMax: nr, plateau: false };
          }
          const step = incrementFor(e);
          const nMin = (override && Number.isFinite(override.weightMin)) ? override.weightMin : roundToStep(e.weightMin + step, step);
          const nMax = (override && Number.isFinite(override.weightMax)) ? override.weightMax : roundToStep(e.weightMax + step, step);
          marker = { kind: 'weight', toWeight: nMax };
          return { ...e, archivedTargets: archive, weightMin: nMin, weightMax: nMax, plateau: false };
        }),
      }));
      const sessions = marker ? stampProgression(s.sessions, exId, marker) : s.sessions;
      return { ...s, days, sessions };
    });
  };

  // DYNAMIC WEIGHT DETECTION — the user logged above the recorded ceiling.
  // Set the ceiling to the logged weight; move the floor to preserve spread.
  const updateWeightRange = (exId, newMax) => {
    setStore(s => {
      const days = s.days.map(d => ({
        ...d,
        exercises: d.exercises.map(e => {
          if (e.id !== exId) return e;
          const spread = Math.max(0, e.weightMax - e.weightMin);
          const nMax = newMax;
          const nMin = Math.max(0, nMax - spread);
          return {
            ...e,
            archivedTargets: [...(e.archivedTargets || []), {
              date: new Date().toISOString(),
              repMin: e.repMin, repMax: e.repMax,
              weightMin: e.weightMin, weightMax: e.weightMax,
            }],
            weightMin: nMin,
            weightMax: nMax,
            plateau: false,
          };
        }),
      }));
      const sessions = stampProgression(s.sessions, exId, { kind: 'range', toWeight: newMax });
      return { ...s, days, sessions };
    });
  };

  // PLATEAU CHOICE — log the chosen suggestion as a note on the most recent
  // session; the "genuine plateau" choice also flags the exercise.
  const logPlateauChoice = (exId, text, flag) => {
    setStore(s => {
      const sessions = { ...s.sessions };
      const sess = sessions[exId] || [];
      if (sess.length > 0) {
        const last = { ...sess[sess.length - 1] };
        last.note = last.note ? `${last.note} · ${text}` : text;
        sessions[exId] = [...sess.slice(0, -1), last];
      }
      let days = s.days;
      if (flag) {
        days = s.days.map(d => ({
          ...d,
          exercises: d.exercises.map(e => e.id === exId ? { ...e, plateau: true } : e),
        }));
      }
      return { ...s, days, sessions };
    });
  };

  const saveExerciseNote = (exId, text) => {
    setStore(s => ({
      ...s,
      notes: {
        ...s.notes,
        [exId]: { text, savedAt: new Date().toISOString() },
      },
    }));
  };

  const deleteExerciseNote = (exId) => {
    setStore(s => {
      const next = { ...s.notes };
      delete next[exId];
      return { ...s, notes: next };
    });
  };

  // Saved custom weights — per exercise, persisted to a normalized localStorage
  // key (presets_<normalizeKey(name)>) via readPresets/writePresets. Added when
  // any weight is logged; removed explicitly by tapping the × on a preset.
  // Never auto-cleared between sessions.
  const addCustomWeight = (exId, value) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const ex = findEx(store, exId);
    if (!ex) return;
    const existing = readPresets(ex.name);
    if (existing.includes(value)) return;
    writePresets(ex.name, [...existing, value].sort((a, b) => a - b));
    setPresetsTick(t => t + 1);
  };

  const removeCustomWeight = (exId, value) => {
    const ex = findEx(store, exId);
    if (!ex) return;
    const existing = readPresets(ex.name);
    if (!existing.includes(value)) return;
    writePresets(ex.name, existing.filter(w => w !== value));
    setPresetsTick(t => t + 1);
  };

  const togglePlateau = (exId) => {
    updateDays(days => days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => e.id === exId ? { ...e, plateau: !e.plateau } : e),
    })));
  };

  // Edit mode operations
  const updateEx = (exId, patch) => {
    updateDays(days => days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => e.id === exId ? { ...e, ...patch } : e),
    })));
  };
  // Removing an exercise drops it from its day AND records the id in
  // removedExerciseIds so reconcileDays never re-adds it on a future load.
  // Session/note history for the removed id is left in place (orphaned, not
  // deleted) — matches the "History will be preserved" confirm copy below.
  const removeEx = (exId) => {
    setStore(s => ({
      ...s,
      days: s.days.map(d => ({
        ...d,
        exercises: d.exercises.filter(e => e.id !== exId),
      })),
      removedExerciseIds: s.removedExerciseIds.includes(exId)
        ? s.removedExerciseIds
        : [...s.removedExerciseIds, exId],
    }));
  };
  const addEx = (dayId) => {
    const blank = {
      id: cryptoId(`d${dayId}_new_${Date.now()}`),
      name: 'New Exercise',
      sets: 3,
      repMin: 8, repMax: 10,
      weightMin: 20, weightMax: 20,
      repCap: 12,
      weightStep: 2.5,
      unit: 'kg',
      notation: null,
      repUnit: 'reps',
      progressionType: 'load',
      restSeconds: 30,
    };
    updateDays(days => days.map(d => d.id === dayId ? {
      ...d, exercises: [...d.exercises, blank],
    } : d));
  };

  // REORDER — splice the exercises array for a day into a new order (used by
  // the up/down arrow buttons to swap an exercise with its neighbor).
  // The store saves on every mutation, so the new order persists across reloads.
  const moveExercise = (dayIndex, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setStore(s => {
      const days = s.days.map((d, di) => {
        if (di !== dayIndex) return d;
        const exs = [...d.exercises];
        if (fromIndex < 0 || fromIndex >= exs.length || toIndex < 0 || toIndex >= exs.length) return d;
        const [moved] = exs.splice(fromIndex, 1);
        exs.splice(toIndex, 0, moved);
        return { ...d, exercises: exs };
      });
      return { ...s, days };
    });
  };

  const resetAll = () => {
    if (confirm('Reset to default routine? All session history and notes will be cleared.')) {
      const fresh = freshStore();
      setStore(fresh);
    }
  };

  // ── History-edit mutations ────────────────────────────────────
  // Replace the sets array for a specific exercise session on a given date.
  // Only touches store.sessions[exId]; all other exercises/dates are untouched.
  const editHistorySets = (exId, dateKey, newSets) => {
    setStore(s => {
      const arr = (s.sessions[exId] || []).map(sess =>
        localDateKey(sess.date) === dateKey ? { ...sess, sets: newSets } : sess
      );
      return { ...s, sessions: { ...s.sessions, [exId]: arr } };
    });
  };

  // Add a brand-new session entry for an exercise on a past date (the exercise
  // had no session logged that day originally).
  const addHistorySession = (exId, dateKey, sets) => {
    const ex = findEx(store, exId);
    if (!ex) return;
    const entry = {
      date: dateKey + 'T12:00:00.000Z',
      sets,
      note: '',
      status: 'hold',
      unit: ex.unit,
      target: targetString(ex),
      summary: null,
    };
    setStore(s => ({
      ...s,
      sessions: {
        ...s.sessions,
        [exId]: [...(s.sessions[exId] || []), entry],
      },
    }));
  };

  // Remove the session entry for a specific exercise on a given date entirely.
  const removeHistorySession = (exId, dateKey) => {
    setStore(s => {
      const arr = (s.sessions[exId] || []).filter(
        sess => localDateKey(sess.date) !== dateKey
      );
      return { ...s, sessions: { ...s.sessions, [exId]: arr } };
    });
  };

  const importJson = (json) => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (!parsed.days || !Array.isArray(parsed.days)) throw new Error('Missing "days" array');

      // Normalize each exercise & build name→id remap, preserving history
      const newDays = parsed.days.map(d => {
        const oldDay = store.days.find(od => od.id === d.id || od.name === d.name);
        return {
          id: d.id ?? (oldDay?.id ?? Math.max(0, ...store.days.map(x => x.id)) + 1),
          name: d.name || `Day ${d.id}`,
          subtitle: d.subtitle || '',
          // Existing exercises (matched by name) keep their current manual
          // position; brand-new exercises are appended at the bottom.
          exercises: (() => {
            const normalize = (e) => {
              const existing = oldDay?.exercises.find(oe => oe.name === e.name);
              const id = existing?.id || cryptoId(`d${d.id}_${e.name}`);
              return {
                id,
                name: e.name,
                sets: e.sets ?? 3,
                repMin: e.repMin ?? e.reps ?? 8,
                repMax: e.repMax ?? e.reps ?? 10,
                weightMin: e.weightMin ?? e.weight ?? 0,
                weightMax: e.weightMax ?? e.weight ?? 0,
                repCap: e.repCap ?? 15,
                weightStep: e.weightStep ?? stepFor(e.name),
                unit: e.unit ?? 'kg',
                notation: e.notation ?? null,
                repUnit: e.repUnit ?? 'reps',
              };
            };
            const imported = (d.exercises || []).map(normalize);
            const importedByName = new Map(imported.map(ie => [ie.name, ie]));
            const ordered = [];
            const used = new Set();
            if (oldDay) {
              for (const oe of oldDay.exercises) {
                const match = importedByName.get(oe.name);
                if (match) { ordered.push(match); used.add(oe.name); }
              }
            }
            for (const ie of imported) {
              if (!used.has(ie.name)) ordered.push(ie);
            }
            return ordered;
          })(),
        };
      });

      // Archive removed exercises (their history stays in sessions)
      const newIds = new Set(newDays.flatMap(d => d.exercises.map(e => e.id)));
      const archivedNow = store.days.flatMap(d => d.exercises.filter(e => !newIds.has(e.id))
        .map(e => ({ ...e, archivedAt: new Date().toISOString(), fromDay: d.name })));

      setStore(s => ({
        ...s,
        days: newDays,
        archive: [...(s.archive || []), ...archivedNow],
      }));
      setShowImport(false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  // ── Render ────────────────────────────────────────────────────
  // Archived exercises stay in day.exercises (so History/Export can still
  // resolve their name/unit/target) but never appear in the active list.
  const exercises = day.exercises.filter(ex => !ex.archived);

  // Rotation state — flips every 2 sessions (first log per browser visit).
  const dayRotCount = ((store.rotation || {})[day.id] || {}).count || 0;
  const rotFlipped = Math.floor(dayRotCount / 2) % 2 === 1;

  // Build display list: rotation-aware order, with off-week flag for Day 3 core alternation.
  const displayItems = (() => {
    const items = exercises.map(ex => ({ ex, offWeek: false }));
    if (rotFlipped) {
      if (day.id === 3) {
        // Swap Leg Press (index 0) and Bulgarian Split Squat (index 2).
        // Lying Leg Curl stays at index 1 in both versions.
        if (items.length >= 3) { const t = items[0]; items[0] = items[2]; items[2] = t; }
      } else if (items.length >= 2) {
        // Days 1, 2, 4: swap lead exercise and second exercise.
        const t = items[0]; items[0] = items[1]; items[1] = t;
      }
    }
    // Day 3: Dead Bug / Farmer's Walk alternate each session.
    // Week A (not flipped) → Dead Bug active, Farmer's Walk greyed.
    // Week B (flipped)     → Farmer's Walk active, Dead Bug greyed.
    if (day.id === 3) {
      const deadBugId = cryptoId('d3_Dead Bug');
      const farmersId = cryptoId("d3_Farmer's Walk");
      items.forEach(item => {
        if (item.ex.id === deadBugId && rotFlipped)  item.offWeek = true;
        if (item.ex.id === farmersId  && !rotFlipped) item.offWeek = true;
      });
    }
    return items;
  })();

  return (
    <div className="app-scroll">
      {/* Sticky header. The whole header slides up by the hide-group's
          height when scrolling down, leaving only the day tabs at the top.
          Uses transform only — no layout changes — so body height stays
          constant and the scroll listener can't oscillate. */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250, 250, 250, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transform: topBarHidden ? `translateY(-${hideHeight}px)` : 'translateY(0)',
        transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
        willChange: 'transform',
      }}>
        {/* Collapsible group: utility bar + title + subtitle */}
        <div ref={hideGroupRef}>
          {/* Utility bar */}
          <div style={{
            padding: '18px 22px 0',
            display: 'flex', alignItems: 'baseline', gap: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
              color: 'var(--muted)', textTransform: 'uppercase',
            }}>Progressive Overload</div>
            <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
            <button
              onClick={() => setShowHistory(true)}
              className="tap"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                color: 'var(--ink-2)', textTransform: 'uppercase',
                padding: '8px 0',
              }}
            >History</button>
            <button
              onClick={() => setShowExport(true)}
              className="tap"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                color: 'var(--ink-2)', textTransform: 'uppercase',
                padding: '8px 0',
              }}
            >Export</button>
          </div>

          {/* Title + subtitle + Edit button */}
          <div style={{ padding: '14px 22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={{
                margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 700,
                fontSize: 36, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
              }}>
                Day {day.id} <span style={{ color: 'var(--accent)', fontWeight: 700 }}>· {day.name}</span>
              </h1>
              <button
                onClick={() => setEditMode(m => !m)}
                className="tap"
                style={{
                  padding: '0 12px', height: 32, borderRadius: 6, flexShrink: 0,
                  border: '1px solid var(--hair)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  color: editMode ? 'var(--paper)' : 'var(--ink-2)', textTransform: 'uppercase',
                  background: editMode ? 'var(--ink)' : 'transparent',
                }}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>
            <div style={{
              marginTop: 8, fontSize: 13, color: 'var(--muted)',
              fontWeight: 500, letterSpacing: '0.005em',
            }}>
              {day.subtitle}
            </div>
            {displayItems.length >= 2 && (
              <div style={{
                marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: rotFlipped ? 'rgba(46,113,114,0.10)' : 'var(--card-bg)',
                border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 6,
                padding: '4px 9px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {rotFlipped ? 'Week B · leading with' : 'Week A · leading with'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--accent)', fontWeight: 700 }}>
                  {displayItems[0].ex.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Day tabs — always visible at the top of the visible header */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--hair)',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {store.days.map(d => {
            const active = d.id === activeDay;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDay(d.id)}
                className="tap"
                style={{
                  padding: '14px 14px 12px', minWidth: 0,
                  flex: '1 1 auto',
                  borderBottom: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  transition: 'color 160ms ease, border-color 160ms ease',
                  background: 'transparent',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  textTransform: 'uppercase', opacity: active ? 1 : 0.7,
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: 600,
                }}>Day {d.id}</span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>{d.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Body — slides up in lockstep with the header so no gap appears
          between the day tabs and the first card. */}
      <main style={{
        paddingBottom: 80,
        transform: topBarHidden ? `translateY(-${hideHeight}px)` : 'translateY(0)',
        transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
        willChange: 'transform',
      }}>
        {!editMode && doneIds.size > 0 && (
          <button
            onClick={clearDoneIds}
            className="tap"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: 40, marginBottom: 16,
              border: '1px solid var(--hair)', borderRadius: 6,
              background: 'var(--paper-2)', color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            New session
          </button>
        )}
        {!editMode && (
        <div style={{ padding: '16px 14px 0' }}>
        {displayItems.map(({ ex, offWeek }) => {
          // Notes shape may be legacy array (sessionized) — normalize to {text, savedAt}
          const rawNote = store.notes && store.notes[ex.id];
          const note = Array.isArray(rawNote)
            ? (rawNote.length ? { text: rawNote[rawNote.length - 1].text, savedAt: rawNote[rawNote.length - 1].date } : null)
            : (rawNote && rawNote.text ? rawNote : null);
          return (
            <div key={ex.id} style={offWeek ? { opacity: 0.35, pointerEvents: 'none', position: 'relative' } : {}}>
              {offWeek && (
                <div style={{
                  position: 'absolute', top: 10, right: 16, zIndex: 1,
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--muted)',
                }}>Not this week</div>
              )}
              <ExerciseCard
                ex={ex}
                history={store.sessions[ex.id] || []}
                note={note}
                done={doneIds.has(ex.id)}
                onOpenLive={(exId, rect) => setLiveEx({ exId, originRect: rect })}
                onSaveNote={saveExerciseNote}
                onDeleteNote={deleteExerciseNote}
                onToggleDone={toggleDone}
              />
            </div>
          );
        })}
        </div>
        )}

        {!editMode && (
          <ExportLauncherButton onOpen={() => setShowExport(true)} />
        )}

        {editMode && (
          <EditPane
            day={day}
            dayIndex={store.days.findIndex(d => d.id === day.id)}
            onUpdate={updateEx}
            onRemove={removeEx}
            onAdd={() => addEx(day.id)}
            onMove={moveExercise}
            onTogglePlateau={togglePlateau}
            onShowImport={() => setShowImport(true)}
            onReset={resetAll}
            palette={palette}
            onPaletteChange={setPalette}
          />
        )}
      </main>

      {/* Sheets */}
      {showImport && (
        <ImportSheet
          currentJson={JSON.stringify({ days: store.days.map(d => ({
            id: d.id, name: d.name, subtitle: d.subtitle,
            exercises: d.exercises.map(e => ({
              name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax,
              weightMin: e.weightMin, weightMax: e.weightMax, repCap: e.repCap,
              weightStep: e.weightStep, unit: e.unit, notation: e.notation, repUnit: e.repUnit,
            })),
          })) }, null, 2)}
          onImport={importJson}
          onClose={() => setShowImport(false)}
        />
      )}

      {showExport && (
        <ExportSheet
          store={store}
          onClose={() => setShowExport(false)}
        />
      )}

      {showHistory && (
        <HistorySheet
          store={store}
          onEditSets={editHistorySets}
          onAddSession={addHistorySession}
          onRemoveSession={removeHistorySession}
          onClose={() => setShowHistory(false)}
        />
      )}

      {liveEx && (() => {
        const liveExObj = findEx(store, liveEx.exId);
        if (!liveExObj) return null;
        const rawNote = store.notes && store.notes[liveEx.exId];
        const liveNote = Array.isArray(rawNote)
          ? (rawNote.length ? { text: rawNote[rawNote.length - 1].text, savedAt: rawNote[rawNote.length - 1].date } : null)
          : (rawNote && rawNote.text ? rawNote : null);
        return (
          <LiveExerciseView
            ex={liveExObj}
            history={store.sessions[liveEx.exId] || []}
            note={liveNote}
            customWeights={readPresets(liveExObj.name)}
            originRect={liveEx.originRect}
            onClose={() => setLiveEx(null)}
            onLog={logSession}
            onApplyIncrement={applyIncrement}
            onSaveNote={saveExerciseNote}
            onDeleteNote={deleteExerciseNote}
            onAddCustomWeight={addCustomWeight}
            onRemoveCustomWeight={removeCustomWeight}
            onUpdateEx={updateEx}
          />
        );
      })()}
    </div>
  );
}

function findEx(store, exId) {
  for (const d of store.days) {
    const e = d.exercises.find(x => x.id === exId);
    if (e) return e;
  }
  return null;
}

// ── Date-based export helpers ─────────────────────────────────
const EMAIL_TO = 'javahirahmedov@gmail.com';

// Local-calendar 'YYYY-MM-DD' key for a Date or ISO string.
function localDateKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "Jun 9, 2026" from a 'YYYY-MM-DD' key (parsed as a local date).
function prettyDateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// All sessions logged on a given local date, grouped by routine day.
// → [{ day, items: [{ ex, session }] }]
function sessionsForDate(store, dateKey) {
  const groups = [];
  for (const day of store.days) {
    const items = [];
    for (const ex of day.exercises) {
      const sess = (store.sessions[ex.id] || [])
        .filter(s => s && s.date && localDateKey(s.date) === dateKey);
      for (const s of sess) items.push({ ex, session: s });
    }
    if (items.length) groups.push({ day, items });
  }
  return groups;
}

// Build the mailto payload for one date.
//   Subject: "Training Log — <date>"
//   Body:    every exercise logged that day, each set as reps×weight, + notes.
// Standing notes (store.notes[exId]) are reference info for while you're
// logging (machine setup, etc.) and are intentionally NEVER included here —
// only session notes (day-specific observations) go in the export.
function buildDateEmail(store, dateKey) {
  const pretty = prettyDateFromKey(dateKey);
  const subject = `Training Log — ${pretty}`;
  const groups = sessionsForDate(store, dateKey);
  if (!groups.length) {
    return { to: EMAIL_TO, subject, body: `No sessions logged for ${pretty}.`, hasData: false, groups };
  }
  const lines = [`Training Log — ${pretty}`, ''];
  for (const g of groups) {
    lines.push(`Day ${g.day.id} · ${g.day.name}`);
    for (const { ex, session } of g.items) {
      lines.push(ex.name);
      let setStr;
      if (session.clusterMode && session.sets.length) {
        const w = session.sets[0].weight;
        const repsStr = session.sets.map(s => s.reps).join(' · ');
        setStr = ex.unit === '' ? repsStr : `${fmt(w)}${ex.unit ? ' ' + ex.unit : ''}: ${repsStr}`;
      } else {
        setStr = session.sets.map(st => (
          ex.unit === ''
            ? `${st.reps} ${ex.repUnit || 'reps'}`
            : `${st.reps}×${fmt(st.weight)}${ex.unit ? ' ' + ex.unit : ''}`
        )).join(', ');
      }
      lines.push(`  ${setStr}`);
      if (session.note) lines.push(`  Note: "${session.note}"`);
    }
    lines.push('');
  }
  return { to: EMAIL_TO, subject, body: lines.join('\n').trim(), hasData: true, groups };
}

// Build the mailto payload for a date range (startKey..endKey inclusive).
// Days with no logged sessions are skipped silently. If only one date has
// data, the subject and body degrade to the same format as buildDateEmail.
// Standing notes (store.notes[exId]) are reference info for while you're
// logging (machine setup, etc.) and are intentionally NEVER included here —
// only session notes (day-specific observations) go in the export.
function buildRangeEmail(store, startKey, endKey) {
  // Walk every calendar day in the range.
  const allDayGroups = []; // [{ dateKey, pretty, groups }]
  const start = new Date(startKey + 'T00:00:00');
  const end   = new Date(endKey   + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dk = localDateKey(d);
    const groups = sessionsForDate(store, dk);
    if (groups.length) allDayGroups.push({ dateKey: dk, pretty: prettyDateFromKey(dk), groups });
  }

  if (!allDayGroups.length) {
    const subject = `Training Log — ${prettyDateFromKey(startKey)}–${prettyDateFromKey(endKey)}`;
    return { to: EMAIL_TO, subject, body: 'No sessions logged in this date range.', hasData: false, allDayGroups };
  }

  // Subject: single date if only one day, range otherwise.
  const subject = allDayGroups.length === 1
    ? `Training Log — ${allDayGroups[0].pretty}`
    : `Training Log — ${allDayGroups[0].pretty}–${allDayGroups[allDayGroups.length - 1].pretty}`;

  const lines = [subject, ''];
  for (const { pretty, groups } of allDayGroups) {
    // Day names from each routine-day group logged that date.
    const dayNames = [...new Set(groups.map(g => g.day.name))].join(' · ');
    lines.push(`─── ${pretty} — ${dayNames} ───`);
    lines.push('');
    for (const g of groups) {
      if (groups.length > 1) lines.push(`Day ${g.day.id} · ${g.day.name}`);
      for (const { ex, session } of g.items) {
        lines.push(ex.name);
        const setStr = session.sets.map(st => (
          ex.unit === ''
            ? `${st.reps} ${ex.repUnit || 'reps'}`
            : `${st.reps}×${fmt(st.weight)}${ex.unit ? ' ' + ex.unit : ''}`
        )).join(', ');
        lines.push(`  ${setStr}`);
        if (session.note) lines.push(`  Note: "${session.note}"`);
      }
      lines.push('');
    }
  }

  return { to: EMAIL_TO, subject, body: lines.join('\n').trim(), hasData: true, allDayGroups };
}

// Bottom-of-day launcher — opens the date export sheet.
function ExportLauncherButton({ onOpen }) {
  return (
    <div style={{ padding: '26px 22px 8px' }}>
      <button
        onClick={onOpen}
        className="tap"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: 48, borderRadius: 6,
          border: '1px solid var(--hair)', background: 'var(--paper)',
          color: 'var(--ink-2)',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 600,
        }}
      >
        Send to Email
      </button>
    </div>
  );
}

// ── Palette picker ─────────────────────────────────────────────
function PalettePicker({ current, onChange }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10,
      }}>Color Theme</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {PALETTES.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className="tap"
            title={p.name}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '10px 12px', borderRadius: 10,
              border: current === p.id
                ? `2px solid ${p.swatch}`
                : '2px solid transparent',
              background: current === p.id ? 'var(--accent-tint)' : 'var(--paper-2)',
              cursor: 'pointer', minWidth: 56,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: p.swatch,
              boxShadow: current === p.id ? `0 0 0 3px ${p.swatch}40` : 'none',
              transition: 'box-shadow 150ms ease',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-2)', fontWeight: 600,
            }}>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Edit pane ─────────────────────────────────────────────────
function EditPane({ day, dayIndex, onUpdate, onRemove, onAdd, onMove, onShowImport, onReset, onTogglePlateau, palette, onPaletteChange }) {
  // Archived exercises stay in day.exercises but are hidden here too. Move
  // targets are resolved by id against the FULL array (not the filtered
  // list's position) so an up/down click always swaps with the neighboring
  // ACTIVE exercise, even if an archived one sits between them underneath.
  const allExercises = day.exercises;
  const exercises = allExercises.filter(ex => !ex.archived);
  const GAP = 24;

  return (
    <div style={{ padding: '22px 22px 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 14,
        borderBottom: '1px solid var(--hair)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          color: 'var(--accent)', textTransform: 'uppercase',
        }}>Edit Mode</span>
        <span style={{ flex: 1 }} />
        <button onClick={onShowImport} className="tap" style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--ink-2)', textTransform: 'uppercase', padding: '8px 0',
        }}>Import JSON</button>
      </div>

      <PalettePicker current={palette} onChange={onPaletteChange} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginTop: 0 }}>
        {exercises.map((ex, i) => {
          const fullIndex = allExercises.findIndex(e => e.id === ex.id);
          const prevActive = exercises[i - 1];
          const nextActive = exercises[i + 1];
          const prevFullIndex = prevActive ? allExercises.findIndex(e => e.id === prevActive.id) : -1;
          const nextFullIndex = nextActive ? allExercises.findIndex(e => e.id === nextActive.id) : -1;
          return (
            <EditRow
              key={ex.id}
              ex={ex}
              isFirst={i === 0}
              isLast={i === exercises.length - 1}
              onMoveUp={() => prevFullIndex >= 0 && onMove(dayIndex, fullIndex, prevFullIndex)}
              onMoveDown={() => nextFullIndex >= 0 && onMove(dayIndex, fullIndex, nextFullIndex)}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onTogglePlateau={onTogglePlateau}
            />
          );
        })}
      </div>

      <button onClick={onAdd} className="tap" style={{
        width: '100%', height: 48, marginTop: 24,
        border: '1px dashed var(--rule-thick)', borderRadius: 6,
        color: 'var(--ink-2)', fontSize: 13, fontWeight: 500,
      }}>
        + Add Exercise to Day {day.id}
      </button>

      <button onClick={onReset} className="tap" style={{
        marginTop: 24, fontSize: 11, color: 'var(--muted)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.10em',
        textTransform: 'uppercase', padding: '8px 0',
      }}>
        Reset all data
      </button>
    </div>
  );
}

function ProgressionTypeToggle({ value, onChange }) {
  const opts = [
    { id: 'load', label: 'Load' },
    { id: 'reps', label: 'Reps' },
    { id: 'none', label: 'None' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="tap"
          style={{
            flex: 1, height: 32, borderRadius: 5,
            background: value === o.id ? 'var(--accent)' : 'var(--paper-2)',
            color: value === o.id ? '#fff' : 'var(--ink-2)',
            border: value === o.id ? 'none' : '0.5px solid var(--card-border)',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}
        >{o.label}</button>
      ))}
    </div>
  );
}

function EditRow({ ex, isFirst, isLast, onMoveUp, onMoveDown, onUpdate, onRemove, onTogglePlateau }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
      <div style={{
        flexShrink: 0, width: 34, alignSelf: 'stretch',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
      }}>
        <button
          type="button"
          aria-label="Move exercise up"
          onClick={onMoveUp}
          disabled={isFirst}
          className="tap"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: isFirst ? 'var(--muted-2)' : 'var(--accent)',
            opacity: isFirst ? 0.3 : 1,
            cursor: isFirst ? 'default' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Move exercise down"
          onClick={onMoveDown}
          disabled={isLast}
          className="tap"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: isLast ? 'var(--muted-2)' : 'var(--accent)',
            opacity: isLast ? 0.3 : 1,
            cursor: isLast ? 'default' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        padding: '16px 18px',
        background: 'var(--card-bg)', border: '0.5px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
      }}>
      <input
        value={ex.name}
        onChange={e => onUpdate(ex.id, { name: e.target.value })}
        style={{
          width: '100%', border: 'none', background: 'transparent',
          fontFamily: 'var(--font-sans)', fontWeight: 600,
          fontSize: 16, color: 'var(--ink)', padding: 0, outline: 'none',
          letterSpacing: '-0.015em',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginTop: 12 }}>
        <NumField label="Sets" value={ex.sets} min={1} max={10} onChange={v => onUpdate(ex.id, { sets: v })} />
        <NumField label="Rep cap" value={ex.repCap} min={1} max={100} onChange={v => onUpdate(ex.id, { repCap: v })} />
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10,
        marginTop: 10, padding: 10, background: 'rgba(0, 0, 0, 0.03)', borderRadius: 6,
      }}>
        <NumField label="Rep min" value={ex.repMin} min={1} max={ex.repMax} onChange={v => onUpdate(ex.id, { repMin: v })} />
        <NumField label="Rep max" value={ex.repMax} min={ex.repMin} max={ex.repCap} onChange={v => onUpdate(ex.id, { repMax: v })} />
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10,
        marginTop: 10, padding: 10, background: 'rgba(46, 113, 114, 0.07)', borderRadius: 6,
      }}>
        <NumField label={`Wt min (${ex.unit || '—'})`} value={ex.weightMin} step={ex.weightStep} min={0} max={ex.weightMax} onChange={v => onUpdate(ex.id, { weightMin: v })} />
        <NumField label={`Wt max (${ex.unit || '—'})`} value={ex.weightMax} step={ex.weightStep} min={ex.weightMin} max={9999} onChange={v => onUpdate(ex.id, { weightMax: v })} />
      </div>
      <div style={{ marginTop: 10 }}>
        <ProgressionTypeToggle
          value={ex.progressionType || 'load'}
          onChange={v => onUpdate(ex.id, { progressionType: v })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={() => onTogglePlateau(ex.id)} className="tap" style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: ex.plateau ? 'var(--st-plateau)' : 'var(--muted)',
          textTransform: 'uppercase', padding: '6px 0',
        }}>
          {ex.plateau ? '✓ Plateau flagged' : 'Flag plateau'}
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => confirm(`Remove "${ex.name}"? History will be preserved.`) && onRemove(ex.id)} className="tap" style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase', padding: '6px 0',
        }}>
          Remove
        </button>
      </div>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min, max }) {
  // Local text state so the field is freely editable: you can clear it,
  // retype, and enter any digits. Bounds are applied only on blur, never
  // mid-keystroke (mid-keystroke clamping is what made fields feel "stuck").
  const [str, setStr] = React.useState(value == null ? '' : String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setStr(value == null ? '' : String(value));
  }, [value, focused]);

  const commit = (raw) => {
    if (raw === '' || raw === '-' || raw === '.') {
      setStr(value == null ? '' : String(value));
      return;
    }
    let v = parseFloat(raw);
    if (!Number.isFinite(v)) {
      setStr(value == null ? '' : String(value));
      return;
    }
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    onChange(v);
    setStr(String(v));
  };

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'var(--muted)', overflowWrap: 'break-word',
      }}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={str}
        onFocus={() => setFocused(true)}
        onChange={e => {
          setStr(e.target.value);
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v); // live update, unclamped — clamp on blur
        }}
        onBlur={e => { setFocused(false); commit(e.target.value); }}
        className="num"
        style={{
          width: '100%', minWidth: 0, boxSizing: 'border-box',
          height: 40, border: '1px solid var(--hair)', borderRadius: 4,
          padding: '0 10px', background: 'var(--paper)', fontSize: 16,
          outline: 'none',
        }}
      />
    </label>
  );
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Import sheet ──────────────────────────────────────────────
function ImportSheet({ currentJson, onImport, onClose }) {
  const [text, setText] = useState(currentJson);
  const [error, setError] = useState(null);

  const tryImport = () => {
    const res = onImport(text);
    if (!res.ok) setError(res.error);
  };

  return (
    <Sheet onClose={onClose} title="JSON Import">
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Paste a routine JSON below. Existing exercises are matched by name —
        their session history is preserved. New exercises start fresh.
      </p>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(null); }}
        spellCheck={false}
        style={{
          width: '100%', height: 320, padding: 12,
          border: '1px solid var(--hair)', borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11.5,
          background: 'var(--paper)', color: 'var(--ink-2)', outline: 'none',
          lineHeight: 1.55, whiteSpace: 'pre',
        }}
      />
      {error && (
        <div style={{ marginTop: 8, color: 'var(--st-plateau)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} className="tap" style={{
          flex: 1, height: 48, borderRadius: 6,
          border: '1px solid var(--hair)', color: 'var(--ink-2)',
          fontSize: 14,
        }}>Cancel</button>
        <button onClick={tryImport} className="tap" style={{
          flex: 2, height: 48, borderRadius: 6,
          background: 'var(--ink)', color: 'var(--paper)',
          fontSize: 14, fontWeight: 500,
        }}>Import & Load</button>
      </div>
    </Sheet>
  );
}

// ── Export sheet ──────────────────────────────────────────────
// Sessions are preserved indefinitely in localStorage. This sheet lets the
// user pick any week that has logged sessions and export just that week.
// If only one week of data exists, the picker is skipped automatically.
// Standing notes (store.notes[exId]) are reference info for while you're
// logging (machine setup, etc.) and are intentionally never shown here —
// this preview must match the actual emailed/copied body exactly, which
// only ever includes session notes.
function GroupPreview({ groups }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(g => (
        <div key={g.day.id}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
            marginBottom: 10,
          }}>Day {g.day.id} · {g.day.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {g.items.map(({ ex, session }, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                  color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>{ex.name}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.5 }}>
                  {session.sets.map((st, j) => (
                    <span key={j}>
                      {st.reps}<span style={{ color: 'var(--muted-2)' }}>×</span>{fmt(st.weight)}
                      {j < session.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>}
                    </span>
                  ))}
                  {ex.unit && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{ex.unit}</span>}
                </div>
                {session.note && (
                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    “{session.note}”
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportSheet({ store, onClose }) {
  const todayKey = localDateKey(new Date());

  const [mode, setMode] = useState('today'); // 'today' | 'pick' | 'range'

  // Single-date state (today / pick modes)
  const [picked, setPicked] = useState(() => sessionStorage.getItem('pol_export_date') || todayKey);

  // Range state
  const sevenDaysAgo = (() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return localDateKey(d);
  })();
  const thisWeekMonday = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return localDateKey(d);
  })();
  const [rangeStart, setRangeStart] = useState(() => sessionStorage.getItem('pol_range_start') || sevenDaysAgo);
  const [rangeEnd,   setRangeEnd]   = useState(() => sessionStorage.getItem('pol_range_end')   || todayKey);

  // Persist single-date pick across sheet opens
  useEffect(() => {
    if (mode === 'pick') sessionStorage.setItem('pol_export_date', picked);
  }, [mode, picked]);

  // Persist range across sheet opens
  useEffect(() => {
    if (mode === 'range') {
      sessionStorage.setItem('pol_range_start', rangeStart);
      sessionStorage.setItem('pol_range_end',   rangeEnd);
    }
  }, [mode, rangeStart, rangeEnd]);

  const dateKey = mode === 'today' ? todayKey : picked;

  // Single-day email (today / pick modes)
  const singleEmail = useMemo(
    () => mode !== 'range' ? buildDateEmail(store, dateKey) : null,
    [store, dateKey, mode]
  );

  // Range email
  const rangeEmail = useMemo(
    () => mode === 'range' ? buildRangeEmail(store, rangeStart, rangeEnd) : null,
    [store, rangeStart, rangeEnd, mode]
  );

  const active   = mode === 'range' ? rangeEmail   : singleEmail;
  const hasData  = active ? active.hasData  : false;
  const body     = active ? active.body     : '';
  const subject  = active ? active.subject  : '';
  const mailHref = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Count total logged sets across the active result
  const totalLogged = useMemo(() => {
    if (!hasData) return 0;
    if (mode === 'range') {
      return (rangeEmail.allDayGroups || []).reduce((n, { groups }) =>
        n + groups.reduce((m, g) => m + g.items.length, 0), 0);
    }
    return (singleEmail.groups || []).reduce((n, g) => n + g.items.length, 0);
  }, [hasData, mode, singleEmail, rangeEmail]);

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!hasData) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const segStyle = (active) => ({
    flex: 1, height: 42, borderRadius: 6,
    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
    textTransform: 'uppercase', fontWeight: 600,
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--paper)' : 'var(--ink-2)',
    border: active ? '1px solid var(--ink)' : '1px solid var(--hair)',
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
  });

  const dateInputStyle = {
    width: '100%', height: 48, padding: '0 14px',
    border: '1px solid var(--hair)', borderRadius: 6,
    background: 'var(--paper)', color: 'var(--ink)', outline: 'none',
    fontFamily: 'var(--font-mono)', fontSize: 14,
    boxSizing: 'border-box',
  };

  return (
    <Sheet onClose={onClose} title="Export" titleStyle={{ fontSize: 24, overflow: 'visible', textOverflow: 'clip', flexShrink: 0 }}>

      {/* Mode tabs: Today / Pick a date / Date range */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('today')} className="tap" style={segStyle(mode === 'today')}>Today</button>
        <button onClick={() => setMode('pick')}  className="tap" style={segStyle(mode === 'pick')}>Pick date</button>
        <button onClick={() => setMode('range')} className="tap" style={segStyle(mode === 'range')}>Range</button>
      </div>

      {/* ── Single-date pick ── */}
      {mode === 'pick' && (
        <div className="reveal" style={{ marginBottom: 4 }}>
          <input
            type="date"
            value={picked}
            max={todayKey}
            onChange={e => { if (e.target.value) setPicked(e.target.value); }}
            className="num"
            style={dateInputStyle}
          />
        </div>
      )}

      {/* ── Range picker ── */}
      {mode === 'range' && (
        <div className="reveal">
          {/* Preset shortcuts */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'This week', start: thisWeekMonday, end: todayKey },
              { label: 'Last 7 days', start: sevenDaysAgo, end: todayKey },
            ].map(p => {
              const isActive = rangeStart === p.start && rangeEnd === p.end;
              return (
                <button
                  key={p.label}
                  onClick={() => { setRangeStart(p.start); setRangeEnd(p.end); }}
                  className="tap"
                  style={{
                    height: 34, padding: '0 14px', borderRadius: 6,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                    background: isActive ? 'var(--accent-tint)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--hair)',
                  }}
                >{p.label}</button>
              );
            })}
          </div>

          {/* Start / End date inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>Start</span>
              <input
                type="date"
                value={rangeStart}
                max={rangeEnd}
                onChange={e => { if (e.target.value) setRangeStart(e.target.value); }}
                style={dateInputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>End</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                max={todayKey}
                onChange={e => { if (e.target.value) setRangeEnd(e.target.value); }}
                style={dateInputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Preview heading ── */}
      {mode !== 'range' && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 14px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700,
            color: 'var(--ink)', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{prettyDateFromKey(dateKey)}</span>
          <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          {hasData && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{totalLogged} logged</span>
          )}
        </div>
      )}

      {mode === 'range' && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '20px 0 14px' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          {hasData && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{(rangeEmail.allDayGroups || []).length} days · {totalLogged} logged</span>
          )}
        </div>
      )}

      {/* ── Preview body ── */}
      {mode !== 'range' && (
        hasData ? (
          <GroupPreview groups={singleEmail.groups} />
        ) : (
          <div style={{
            padding: '22px 16px', borderRadius: 8,
            border: '1px dashed var(--rule-thick)',
            textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', fontWeight: 500,
          }}>
            No sessions logged for this date.
          </div>
        )
      )}

      {mode === 'range' && (
        hasData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {(rangeEmail.allDayGroups || []).map(({ dateKey: dk, pretty, groups }) => (
              <div key={dk}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
                    color: 'var(--ink)', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                  }}>{pretty}</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)',
                    letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 700,
                  }}>{groups.map(g => g.day.name).join(' · ')}</span>
                </div>
                <GroupPreview groups={groups} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '22px 16px', borderRadius: 8,
            border: '1px dashed var(--rule-thick)',
            textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', fontWeight: 500,
          }}>
            No sessions logged in this date range.
          </div>
        )
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button
          onClick={copy}
          disabled={!hasData}
          className="tap"
          style={{
            flex: 1, height: 48, borderRadius: 6,
            border: '1px solid var(--hair)',
            color: hasData ? 'var(--ink-2)' : 'var(--muted-2)',
            background: copied ? 'var(--st-stable-bg)' : 'transparent',
            fontSize: 14, fontWeight: 500,
            cursor: hasData ? 'pointer' : 'not-allowed',
          }}
        >{copied ? '✓ Copied' : 'Copy'}</button>
        <a
          href={hasData ? mailHref : undefined}
          className="tap"
          aria-disabled={!hasData}
          onClick={e => {
            e.preventDefault();
            if (!hasData) return;
            // Pin scroll position — some browsers reset to top on mailto navigation.
            const y = window.scrollY;
            window.location.href = mailHref;
            requestAnimationFrame(() => window.scrollTo(0, y));
          }}
          style={{
            flex: 2, height: 48, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hasData ? 'var(--accent)' : 'var(--paper-2)',
            color: hasData ? '#FFFFFF' : 'var(--muted-2)',
            textDecoration: 'none',
            fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
            cursor: hasData ? 'pointer' : 'not-allowed',
          }}
        >Send to Email</a>
      </div>
    </Sheet>
  );
}

// ── Sheet (modal) ─────────────────────────────────────────────
// ── History browsing & editing ────────────────────────────────

// Collect every distinct logged date across all exercises, newest first.
function allLoggedDates(store) {
  const seen = new Set();
  for (const sess of Object.values(store.sessions || {})) {
    for (const s of (sess || [])) {
      if (s && s.date) seen.add(localDateKey(s.date));
    }
  }
  return [...seen].sort((a, b) => (a < b ? 1 : -1));
}

// ── HistorySheet — date-list picker ──────────────────────────
function HistorySheet({ store, onEditSets, onAddSession, onRemoveSession, onClose }) {
  const [editingDate, setEditingDate] = useState(null);
  const dates = allLoggedDates(store);

  if (editingDate) {
    return (
      <HistoryDayEditor
        store={store}
        dateKey={editingDate}
        onEditSets={onEditSets}
        onAddSession={onAddSession}
        onRemoveSession={onRemoveSession}
        onBack={() => setEditingDate(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet onClose={onClose} title="History">
      {dates.length === 0 && (
        <div style={{
          padding: '22px 16px', borderRadius: 8,
          border: '1px dashed var(--rule-thick)',
          textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', fontWeight: 500,
        }}>
          No sessions logged yet.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {dates.map(dk => {
          const groups = sessionsForDate(store, dk);
          const dayNames = [...new Set(groups.map(g => g.day.name))].join(' · ');
          const exCount = groups.reduce((n, g) => n + g.items.length, 0);
          const isToday = dk === localDateKey(new Date());
          return (
            <button
              key={dk}
              onClick={() => setEditingDate(dk)}
              className="tap"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '14px 0',
                borderBottom: '1px solid var(--hair)',
                background: 'none', textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                  color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>
                  {prettyDateFromKey(dk)}
                  {isToday && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.10em',
                      textTransform: 'uppercase', color: 'var(--accent)',
                    }}>Today</span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--muted)', marginTop: 3,
                }}>
                  {dayNames} · {exCount} exercise{exCount !== 1 ? 's' : ''}
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>›</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ── HistoryDayEditor — edit one past day's sessions ───────────
function HistoryDayEditor({ store, dateKey, onEditSets, onAddSession, onRemoveSession, onBack, onClose }) {
  const isToday = dateKey === localDateKey(new Date());
  const pretty = prettyDateFromKey(dateKey);

  // All exercises that were logged on this date, by day group
  const groups = sessionsForDate(store, dateKey);

  // Per-exercise local set state: { [exId]: sets[] } — drives the inline editors
  const [localSets, setLocalSets] = useState(() => {
    const init = {};
    for (const g of groups) {
      for (const { ex, session } of g.items) {
        init[ex.id] = session.sets.map(s => ({ ...s }));
      }
    }
    return init;
  });

  // Track which exercises are "dirty" (local edits not yet saved)
  const [dirty, setDirty] = useState({});

  // Which exercise is showing the remove-session confirm prompt
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Which set index is showing the remove-set confirm prompt: { exId, idx }
  const [confirmRemoveSet, setConfirmRemoveSet] = useState(null);

  // "Add exercise" panel open?
  const [addingEx, setAddingEx] = useState(null); // null | dayId

  const updateLocalSet = (exId, idx, field, rawVal) => {
    const val = rawVal === '' ? '' : Number(rawVal);
    setLocalSets(prev => {
      const sets = prev[exId].map((s, i) => i === idx ? { ...s, [field]: val } : s);
      return { ...prev, [exId]: sets };
    });
    setDirty(prev => ({ ...prev, [exId]: true }));
  };

  const saveEdits = (exId) => {
    const sets = localSets[exId];
    // Filter out any set with empty/non-numeric reps or weight
    const valid = sets.filter(s => Number.isFinite(s.reps) && (Number.isFinite(s.weight) || s.weight === 0));
    if (!valid.length) return;
    onEditSets(exId, dateKey, valid);
    setDirty(prev => ({ ...prev, [exId]: false }));
  };

  const addSet = (exId) => {
    setLocalSets(prev => {
      const sets = prev[exId];
      const last = sets[sets.length - 1] || { reps: 8, weight: 0 };
      return { ...prev, [exId]: [...sets, { reps: last.reps, weight: last.weight }] };
    });
    setDirty(prev => ({ ...prev, [exId]: true }));
  };

  const requestRemoveSet = (exId, idx) => {
    setConfirmRemoveSet({ exId, idx });
  };

  const confirmDoRemoveSet = () => {
    if (!confirmRemoveSet) return;
    const { exId, idx } = confirmRemoveSet;
    setLocalSets(prev => {
      const sets = prev[exId].filter((_, i) => i !== idx);
      return { ...prev, [exId]: sets };
    });
    setDirty(prev => ({ ...prev, [exId]: true }));
    setConfirmRemoveSet(null);
  };

  const requestRemoveSession = (exId) => setConfirmRemove(exId);

  const confirmDoRemoveSession = () => {
    if (!confirmRemove) return;
    onRemoveSession(confirmRemove, dateKey);
    setConfirmRemove(null);
    // Remove from local state
    setLocalSets(prev => {
      const next = { ...prev };
      delete next[confirmRemove];
      return next;
    });
  };

  // All exercises on any day's routine that aren't already logged this date
  const loggedExIds = new Set(
    groups.flatMap(g => g.items.map(({ ex }) => ex.id))
  );

  // Get all exercises for a given day that aren't yet logged this date
  // (excludes archived — you can still edit their existing entries, just not
  // backfill new ones for a retired exercise).
  const unloggedForDay = (day) =>
    day.exercises.filter(ex => !ex.archived && !loggedExIds.has(ex.id));

  const [newExSets, setNewExSets] = useState([{ reps: 8, weight: 0 }]);

  const resetAddPanel = () => {
    setAddingEx(null);
    setNewExSets([{ reps: 8, weight: 0 }]);
  };

  const submitNewSession = (exId) => {
    const valid = newExSets.filter(s => Number.isFinite(s.reps) && Number.isFinite(s.weight));
    if (!valid.length) return;
    onAddSession(exId, dateKey, valid);
    // Optimistically add to local state so the editor shows immediately
    setLocalSets(prev => ({ ...prev, [exId]: valid.map(s => ({ ...s })) }));
    resetAddPanel();
  };

  const inputStyle = {
    width: 60, height: 34, borderRadius: 6, border: '1px solid var(--hair)',
    background: 'var(--paper)', color: 'var(--ink)',
    fontFamily: 'var(--font-mono)', fontSize: 14, textAlign: 'center',
    outline: 'none', padding: '0 4px',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(20, 18, 14, 0.32)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '92%',
          background: 'var(--paper)',
          borderRadius: '16px 16px 0 0',
          overflow: 'auto',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.12)',
        }}
      >
        {/* History-edit banner — always visible at top */}
        {!isToday && (
          <div style={{
            background: '#FFF7E6',
            borderBottom: '2px solid #F5A623',
            padding: '10px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C17B00',
            }}>Editing historical data</span>
            <span style={{ flex: 1 }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C17B00',
              letterSpacing: '0.06em',
            }}>{pretty}</span>
          </div>
        )}

        <div style={{ padding: '14px 22px 32px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--hair)', margin: '0 auto 18px' }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <button onClick={onBack} className="tap" style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
              letterSpacing: '0.06em', padding: '4px 0',
            }}>‹ Back</button>
            <h2 style={{
              flex: 1, margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 700,
              fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em',
            }}>{pretty}</h2>
            <button onClick={onClose} className="tap" style={{
              fontSize: 22, color: 'var(--muted)', padding: '0 8px',
            }}>×</button>
          </div>

          {/* Per-exercise editors */}
          {groups.map(g => (
            <div key={g.day.id} style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
                marginBottom: 14,
              }}>Day {g.day.id} · {g.day.name}</div>

              {g.items.map(({ ex, session }) => {
                const sets = localSets[ex.id] || [];
                const isDirty = dirty[ex.id];
                const verdict = governingVerdict(ex, sets);
                const vTone = verdict.kind === 'increase' ? '#2E7172'
                            : verdict.kind === 'repeat'   ? '#C0392B'
                            : '#888';
                return (
                  <div key={ex.id} style={{
                    background: 'var(--card-bg)', borderRadius: 14,
                    border: '0.5px solid rgba(0,0,0,0.07)',
                    padding: '16px 16px 14px', marginBottom: 12,
                  }}>
                    {/* Exercise name + remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{
                        flex: 1, fontFamily: 'var(--font-sans)', fontSize: 15,
                        fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em',
                      }}>{ex.name}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: vTone,
                      }}>{verdict.text.split(' ')[0]}</span>
                      <button
                        onClick={() => requestRemoveSession(ex.id)}
                        className="tap"
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: '#C0392B',
                          border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4,
                          padding: '3px 8px',
                        }}
                      >Remove</button>
                    </div>

                    {/* Session note for this date — display only, same as the
                        inline per-card History view and the export preview. */}
                    {session.note && (
                      <div style={{
                        marginTop: -4, marginBottom: 12, fontSize: 12.5,
                        color: 'var(--ink-2)', lineHeight: 1.5,
                      }}>
                        “{session.note}”
                      </div>
                    )}

                    {/* Column labels */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '24px 1fr 1fr 28px',
                      gap: 6, alignItems: 'center', marginBottom: 6,
                    }}>
                      <span />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                        textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center',
                      }}>Reps</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                        textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center',
                      }}>{ex.unit || 'BW'}</span>
                      <span />
                    </div>

                    {/* Set rows */}
                    {sets.map((s, idx) => (
                      <div key={idx} style={{
                        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 28px',
                        gap: 6, alignItems: 'center', marginBottom: 8,
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                          textAlign: 'center',
                        }}>{idx + 1}</span>
                        <input
                          type="number"
                          value={s.reps}
                          onChange={e => updateLocalSet(ex.id, idx, 'reps', e.target.value)}
                          style={inputStyle}
                        />
                        {ex.unit !== '' ? (
                          <input
                            type="number"
                            value={s.weight}
                            onChange={e => updateLocalSet(ex.id, idx, 'weight', e.target.value)}
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{
                            textAlign: 'center', fontFamily: 'var(--font-mono)',
                            fontSize: 12, color: 'var(--muted)',
                          }}>—</span>
                        )}
                        <button
                          onClick={() => requestRemoveSet(ex.id, idx)}
                          className="tap"
                          style={{
                            width: 24, height: 24, borderRadius: 4,
                            border: '1px solid var(--hair)', background: 'none',
                            color: 'var(--muted)', fontSize: 14, lineHeight: 1,
                          }}
                        >×</button>
                      </div>
                    ))}

                    {/* Add set + Save row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => addSet(ex.id)}
                        className="tap"
                        style={{
                          flex: 1, height: 34, borderRadius: 6,
                          border: '1px dashed var(--rule-thick)', background: 'none',
                          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: 'var(--muted)',
                        }}
                      >+ Set</button>
                      {isDirty && (
                        <button
                          onClick={() => saveEdits(ex.id)}
                          className="tap"
                          style={{
                            flex: 1, height: 34, borderRadius: 6,
                            background: 'var(--accent)', border: 'none',
                            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                            textTransform: 'uppercase', color: '#fff', fontWeight: 700,
                          }}
                        >Save</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Add exercise section */}
          {store.days.some(d => unloggedForDay(d).length > 0) && (
            <div style={{ marginTop: 8 }}>
              {addingEx === null ? (
                <button
                  onClick={() => setAddingEx('pick')}
                  className="tap"
                  style={{
                    width: '100%', height: 44, borderRadius: 8,
                    border: '1px dashed var(--rule-thick)', background: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--muted)',
                  }}
                >+ Add Exercise</button>
              ) : addingEx === 'pick' ? (
                <div style={{
                  background: 'var(--card-bg)', borderRadius: 14,
                  border: '0.5px solid rgba(0,0,0,0.07)', padding: '16px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12,
                  }}>Choose exercise</div>
                  {store.days.map(d => {
                    const available = unloggedForDay(d);
                    if (!available.length) return null;
                    return (
                      <div key={d.id} style={{ marginBottom: 10 }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                          textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6,
                        }}>Day {d.id} · {d.name}</div>
                        {available.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => setAddingEx(ex.id)}
                            className="tap"
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '10px 12px', borderRadius: 6,
                              border: '1px solid var(--hair)', background: 'none',
                              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)',
                              marginBottom: 6,
                            }}
                          >{ex.name}</button>
                        ))}
                      </div>
                    );
                  })}
                  <button onClick={resetAddPanel} className="tap" style={{
                    marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--muted)',
                  }}>Cancel</button>
                </div>
              ) : (
                // addingEx is an exId — show the set-entry form
                (() => {
                  const ex = findEx(store, addingEx);
                  if (!ex) return null;
                  return (
                    <div style={{
                      background: 'var(--card-bg)', borderRadius: 14,
                      border: '0.5px solid rgba(0,0,0,0.07)', padding: '16px',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                        color: 'var(--ink)', marginBottom: 14,
                      }}>{ex.name}</div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '24px 1fr 1fr 28px',
                        gap: 6, alignItems: 'center', marginBottom: 6,
                      }}>
                        <span />
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center',
                        }}>Reps</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center',
                        }}>{ex.unit || 'BW'}</span>
                        <span />
                      </div>
                      {newExSets.map((s, idx) => (
                        <div key={idx} style={{
                          display: 'grid', gridTemplateColumns: '24px 1fr 1fr 28px',
                          gap: 6, alignItems: 'center', marginBottom: 8,
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                            textAlign: 'center',
                          }}>{idx + 1}</span>
                          <input
                            type="number"
                            value={s.reps}
                            onChange={e => {
                              const v = e.target.value === '' ? '' : Number(e.target.value);
                              setNewExSets(prev => prev.map((r, i) => i === idx ? { ...r, reps: v } : r));
                            }}
                            style={inputStyle}
                          />
                          {ex.unit !== '' ? (
                            <input
                              type="number"
                              value={s.weight}
                              onChange={e => {
                                const v = e.target.value === '' ? '' : Number(e.target.value);
                                setNewExSets(prev => prev.map((r, i) => i === idx ? { ...r, weight: v } : r));
                              }}
                              style={inputStyle}
                            />
                          ) : (
                            <span style={{
                              textAlign: 'center', fontFamily: 'var(--font-mono)',
                              fontSize: 12, color: 'var(--muted)',
                            }}>—</span>
                          )}
                          {newExSets.length > 1 && (
                            <button
                              onClick={() => setNewExSets(prev => prev.filter((_, i) => i !== idx))}
                              className="tap"
                              style={{
                                width: 24, height: 24, borderRadius: 4,
                                border: '1px solid var(--hair)', background: 'none',
                                color: 'var(--muted)', fontSize: 14, lineHeight: 1,
                              }}
                            >×</button>
                          )}
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => setNewExSets(prev => {
                            const last = prev[prev.length - 1];
                            return [...prev, { reps: last.reps, weight: last.weight }];
                          })}
                          className="tap"
                          style={{
                            flex: 1, height: 34, borderRadius: 6,
                            border: '1px dashed var(--rule-thick)', background: 'none',
                            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                            textTransform: 'uppercase', color: 'var(--muted)',
                          }}
                        >+ Set</button>
                        <button
                          onClick={() => submitNewSession(addingEx)}
                          className="tap"
                          style={{
                            flex: 1, height: 34, borderRadius: 6,
                            background: 'var(--accent)', border: 'none',
                            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                            textTransform: 'uppercase', color: '#fff', fontWeight: 700,
                          }}
                        >Add</button>
                        <button
                          onClick={resetAddPanel}
                          className="tap"
                          style={{
                            flex: 1, height: 34, borderRadius: 6,
                            border: '1px solid var(--hair)', background: 'none',
                            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                            textTransform: 'uppercase', color: 'var(--muted)',
                          }}
                        >Cancel</button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>

        {/* Confirm: remove set */}
        {confirmRemoveSet && (
          <div
            onClick={() => setConfirmRemoveSet(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(20,18,14,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--paper)', borderRadius: 14, padding: '24px 22px',
                width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700,
                color: 'var(--ink)', marginBottom: 8,
              }}>Remove set {confirmRemoveSet.idx + 1}?</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--muted)',
                marginBottom: 20,
              }}>This will delete this set from the historical log. It cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmRemoveSet(null)} className="tap" style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '1px solid var(--hair)', background: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: 'var(--ink-2)',
                }}>Cancel</button>
                <button onClick={confirmDoRemoveSet} className="tap" style={{
                  flex: 1, height: 40, borderRadius: 8,
                  background: '#C0392B', border: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: '#fff', fontWeight: 700,
                }}>Remove</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm: remove exercise session */}
        {confirmRemove && (
          <div
            onClick={() => setConfirmRemove(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(20,18,14,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--paper)', borderRadius: 14, padding: '24px 22px',
                width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700,
                color: 'var(--ink)', marginBottom: 8,
              }}>Remove exercise?</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--muted)',
                marginBottom: 20,
              }}>
                This will delete the entire log entry for{' '}
                <strong>{findEx(store, confirmRemove)?.name}</strong> on {pretty}.
                Other days and exercises are not affected.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmRemove(null)} className="tap" style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '1px solid var(--hair)', background: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: 'var(--ink-2)',
                }}>Cancel</button>
                <button onClick={confirmDoRemoveSession} className="tap" style={{
                  flex: 1, height: 40, borderRadius: 8,
                  background: '#C0392B', border: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: '#fff', fontWeight: 700,
                }}>Remove</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Sheet({ title, children, onClose, titleStyle }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(20, 18, 14, 0.32)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '88%',
          background: 'var(--paper)',
          borderRadius: '16px 16px 0 0',
          padding: '14px 22px 26px',
          overflow: 'auto',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--hair)', margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 700,
            fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.02em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            ...(titleStyle || {}),
          }}>{title}</h2>
          <button onClick={onClose} className="tap" style={{
            fontSize: 22, color: 'var(--muted)', padding: '0 8px', flexShrink: 0,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Mount ────────────────────────────────────────────────────
function Root() {
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
