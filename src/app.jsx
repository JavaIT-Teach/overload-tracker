// app.jsx — root app, day tabs, edit mode, JSON import/export
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pol_tracker_v1';
// Stamped onto saved data. NOTE: a version mismatch no longer WIPES your
// data — loading is non-destructive. The seed (routine definitions + the
// hardcoded session history) is RECONCILED into whatever is stored: missing
// exercises are added and missing seeded sessions are merged in by
// exercise+date, but nothing you've logged is ever overwritten or removed.
const SEED_VERSION = 4;

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
    // Intentionally NO version-based wipe here. Stored sessions are kept
    // as-is; reconcileStore() brings in any new seed definitions/history.
    return parsed;
  } catch (e) {
    console.warn('Failed to load store:', e);
    return null;
  }
}

// Ensure every seed day/exercise exists in the store WITHOUT touching any
// exercise that's already there (so user-progressed targets are preserved).
function reconcileDays(store) {
  const seedDays = (typeof SEED_STORE !== 'undefined' && SEED_STORE.days) ? SEED_STORE.days : null;
  if (!seedDays) return store;
  const byId = new Map((store.days || []).map(d => [d.id, d]));
  seedDays.forEach(sd => {
    const existing = byId.get(sd.id);
    if (!existing) {
      store.days.push(JSON.parse(JSON.stringify(sd)));
      return;
    }
    const haveIds = new Set(existing.exercises.map(e => e.id));
    sd.exercises.forEach(se => {
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
      delete e.plateau; // clear stale plateau flag on refreshed targets
    });
  });
  return store;
}

// Full non-destructive reconciliation: bring the store up to the current
// seed (definitions + hardcoded history), keeping all logged data, then
// stamp the version. Safe to run on every load (idempotent).
function reconcileStore(store) {
  const upgrading = store.seedVersion !== SEED_VERSION;
  reconcileDays(store);
  // One-time, on a version bump only: align targets with the latest seed so
  // existing installs reflect the new (June) progression. Never re-runs once
  // stamped, so any future in-app progression you make is preserved.
  if (upgrading) refreshTargetsFromSeed(store);
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
  const [editMode, setEditMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Live Exercise Mode — { exId, originRect } of the tapped card, or null.
  const [liveEx, setLiveEx] = useState(null);
  // Bumped on every preset write so the list re-reads from localStorage.
  const [presetsTick, setPresetsTick] = useState(0);

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

  // Reset to top when switching days
  useEffect(() => {
    setTopBarHidden(false);
    window.scrollTo(0, 0);
  }, [activeDay]);

  // Persist on every change
  useEffect(() => { saveStore(store); }, [store]);
  useEffect(() => { localStorage.setItem('pol_active_day', activeDay); }, [activeDay]);

  const day = store.days.find(d => d.id === activeDay) || store.days[0];

  const updateDays = (mutator) => {
    setStore(s => ({ ...s, days: mutator(s.days) }));
  };

  // ── Mutations ────────────────────────────────────────────────
  const logSession = (exId, { sets, note, summary }, statusAtLog) => {
    const ex = findEx(store, exId);
    if (!ex) return;
    const entry = {
      date: new Date().toISOString(),
      sets,
      note: note || '',
      status: statusAtLog,
      unit: ex.unit,
      target: targetString(ex),
      summary: summary || null,
    };
    setStore(s => ({
      ...s,
      sessions: {
        ...s.sessions,
        [exId]: [...(s.sessions[exId] || []), entry],
      },
    }));
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
  const applyIncrement = (exId) => {
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
          const nMin = roundToStep(e.weightMin + step, step);
          const nMax = roundToStep(e.weightMax + step, step);
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

  // DELOAD SIGNAL — dismiss the recovery banner until the condition re-arms
  // (which requires at least one new session to be logged afterwards).
  const dismissDeload = () => {
    setStore(s => ({ ...s, deloadDismissedAt: totalSessionCount(s) }));
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
  const removeEx = (exId) => {
    updateDays(days => days.map(d => ({
      ...d,
      exercises: d.exercises.filter(e => e.id !== exId),
    })));
  };
  const addEx = (dayId) => {
    const blank = {
      id: cryptoId(`d${dayId}_new_${Date.now()}`),
      name: 'New Exercise',
      sets: 3,
      repMin: 8, repMax: 10,
      weightMin: 50, weightMax: 50,
      repCap: 12,
      weightStep: 5,
      unit: 'lbs',
      notation: null,
      repUnit: 'reps',
    };
    updateDays(days => days.map(d => d.id === dayId ? {
      ...d, exercises: [...d.exercises, blank],
    } : d));
  };

  // DRAG-TO-REORDER — splice the exercises array for a day into a new order.
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
                unit: e.unit ?? 'lbs',
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
  const exercises = day.exercises;

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
        {!editMode && <DeloadBanner store={store} onDismiss={dismissDeload} />}
        {!editMode && exercises.map(ex => {
          // Notes shape may be legacy array (sessionized) — normalize to {text, savedAt}
          const rawNote = store.notes && store.notes[ex.id];
          const note = Array.isArray(rawNote)
            ? (rawNote.length ? { text: rawNote[rawNote.length - 1].text, savedAt: rawNote[rawNote.length - 1].date } : null)
            : (rawNote && rawNote.text ? rawNote : null);
          return (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              history={store.sessions[ex.id] || []}
              note={note}
              onOpenLive={(exId, rect) => setLiveEx({ exId, originRect: rect })}
              onSaveNote={saveExerciseNote}
              onDeleteNote={deleteExerciseNote}
            />
          );
        })}

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
            onUpdateRange={updateWeightRange}
            onPlateauChoice={logPlateauChoice}
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

// ── Deload signal banner ──────────────────────────────────────
// Surfaces when ≥3 distinct exercises across all four days show a downward
// rep trend (same weight, fewer reps) over their last two sessions.
// Dismissible; re-arms only after a new session is logged.
function DeloadBanner({ store, onDismiss }) {
  const deload = detectDeload(store);
  const total = totalSessionCount(store);
  if (!deload.signal) return null;
  if (total <= (store.deloadDismissedAt || 0)) return null;

  return (
    <div style={{ padding: '16px 22px 0' }}>
      <div className="reveal" style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 14px 14px 16px',
        background: 'var(--st-plateau-bg)',
        borderLeft: '3px solid var(--st-plateau)',
        borderRadius: 6,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--st-plateau)', fontWeight: 700,
            marginBottom: 5,
          }}>Recovery signal</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45, fontWeight: 500 }}>
            {deload.count} exercises declining across recent sessions. Consider a deload week.
          </div>
        </div>
        <button onClick={onDismiss} className="tap" aria-label="Dismiss" style={{
          width: 28, height: 28, minHeight: 28, flexShrink: 0,
          fontSize: 18, color: 'var(--muted)', lineHeight: 1,
        }}>×</button>
      </div>
    </div>
  );
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
  return { to: EMAIL_TO, subject, body: lines.join('\n').trim(), hasData: true, groups };
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

// ── Edit pane ─────────────────────────────────────────────────
function EditPane({ day, dayIndex, onUpdate, onRemove, onAdd, onMove, onShowImport, onReset, onTogglePlateau }) {
  const exercises = day.exercises;
  const GAP = 24;
  const [drag, setDrag] = React.useState(null); // { from, to, dy } | null
  const dragRef = React.useRef(null);
  const startY = React.useRef(0);
  const metrics = React.useRef(null);          // { mids:[], heights:[] }
  const cardRefs = React.useRef([]);
  cardRefs.current.length = exercises.length;

  // Pointer/touch drag (HTML5 DnD is unreliable on iOS). The handle starts a
  // drag; the dragged card follows the finger via transform while the others
  // shift to reveal the slot; the drop index is found by comparing midpoints.
  const beginDrag = (index, e) => {
    if (dragRef.current) return; // ignore the second of pointerdown+touchstart
    const y = (e.clientY != null) ? e.clientY
      : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const rects = cardRefs.current.map(n => n ? n.getBoundingClientRect() : { top: 0, height: 0 });
    metrics.current = {
      mids: rects.map(r => r.top + r.height / 2),
      heights: rects.map(r => r.height),
    };
    startY.current = y;
    dragRef.current = { from: index, to: index, dy: 0 };
    setDrag(dragRef.current);
    if (e.pointerId != null && e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

  const dragging = drag !== null;

  React.useEffect(() => {
    if (!dragging) return;
    const getY = (e) => {
      if (e.clientY != null) return e.clientY;
      if (e.touches && e.touches[0]) return e.touches[0].clientY;
      if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
      return 0;
    };
    const onMoveEvt = (e) => {
      if (!dragRef.current || !metrics.current) return;
      if (e.cancelable) e.preventDefault(); // block page scroll mid-drag (iOS)
      const dy = getY(e) - startY.current;
      const mids = metrics.current.mids;
      const from = dragRef.current.from;
      const draggedMid = mids[from] + dy;
      let to = from;
      if (dy < 0) {
        for (let i = from - 1; i >= 0; i--) { if (draggedMid < mids[i]) to = i; else break; }
      } else {
        for (let i = from + 1; i < mids.length; i++) { if (draggedMid > mids[i]) to = i; else break; }
      }
      dragRef.current = { from, to, dy };
      setDrag({ from, to, dy });
    };
    const onUpEvt = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d && d.from !== d.to) onMove(dayIndex, d.from, d.to);
    };
    window.addEventListener('pointermove', onMoveEvt, { passive: false });
    window.addEventListener('pointerup', onUpEvt);
    window.addEventListener('pointercancel', onUpEvt);
    window.addEventListener('touchmove', onMoveEvt, { passive: false });
    window.addEventListener('touchend', onUpEvt);
    window.addEventListener('touchcancel', onUpEvt);
    return () => {
      window.removeEventListener('pointermove', onMoveEvt);
      window.removeEventListener('pointerup', onUpEvt);
      window.removeEventListener('pointercancel', onUpEvt);
      window.removeEventListener('touchmove', onMoveEvt);
      window.removeEventListener('touchend', onUpEvt);
      window.removeEventListener('touchcancel', onUpEvt);
    };
  }, [dragging, dayIndex, onMove]);

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginTop: 20 }}>
        {exercises.map((ex, i) => {
          const isDragged = drag != null && drag.from === i;
          let translateY = 0;
          let transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
          if (drag != null) {
            if (isDragged) {
              translateY = drag.dy;
              transition = 'none';
            } else {
              const lift = ((metrics.current && metrics.current.heights[drag.from]) || 0) + GAP;
              if (drag.from < drag.to && i > drag.from && i <= drag.to) translateY = -lift;
              else if (drag.from > drag.to && i < drag.from && i >= drag.to) translateY = lift;
            }
          }
          return (
            <div
              key={ex.id}
              ref={el => { cardRefs.current[i] = el; }}
              style={{
                position: 'relative',
                transform: `translateY(${translateY}px)`,
                transition,
                zIndex: isDragged ? 20 : 1,
                boxShadow: isDragged ? '0 14px 30px rgba(15,15,16,0.18)' : 'none',
                borderRadius: isDragged ? 10 : 0,
                background: isDragged ? 'var(--paper)' : 'transparent',
                touchAction: dragging ? 'none' : 'auto',
              }}
            >
              <EditRow
                ex={ex}
                index={i}
                onHandleDown={beginDrag}
                dragging={isDragged}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onTogglePlateau={onTogglePlateau}
              />
            </div>
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

function EditRow({ ex, index, onHandleDown, dragging, onUpdate, onRemove, onTogglePlateau }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={e => onHandleDown(index, e)}
        onTouchStart={e => onHandleDown(index, e)}
        className="tap"
        style={{
          flexShrink: 0, width: 34, alignSelf: 'stretch',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', touchAction: 'none',
          background: 'transparent', border: 'none',
          color: dragging ? 'var(--accent)' : 'var(--muted-2)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <line x1="3" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div style={{ flex: 1, minWidth: 0, borderLeft: '2px solid var(--hair)', paddingLeft: 14 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <NumField label="Sets" value={ex.sets} min={1} max={10} onChange={v => onUpdate(ex.id, { sets: v })} />
        <NumField label="Rep cap" value={ex.repCap} min={1} max={100} onChange={v => onUpdate(ex.id, { repCap: v })} />
        <NumField label="Rep min" value={ex.repMin} min={1} max={ex.repMax} onChange={v => onUpdate(ex.id, { repMin: v })} />
        <NumField label="Rep max" value={ex.repMax} min={ex.repMin} max={ex.repCap} onChange={v => onUpdate(ex.id, { repMax: v })} />
        <NumField label={`Wt min (${ex.unit || '—'})`} value={ex.weightMin} step={ex.weightStep} min={0} max={ex.weightMax} onChange={v => onUpdate(ex.id, { weightMin: v })} />
        <NumField label={`Wt max (${ex.unit || '—'})`} value={ex.weightMax} step={ex.weightStep} min={ex.weightMin} max={9999} onChange={v => onUpdate(ex.id, { weightMax: v })} />
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
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'var(--muted)',
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
function ExportSheet({ store, onClose }) {
  const todayKey = localDateKey(new Date());
  // "Today" is preselected on every open; the picked date is remembered for
  // the rest of the browser session.
  const [mode, setMode] = useState('today'); // 'today' | 'pick'
  const [picked, setPicked] = useState(() => sessionStorage.getItem('pol_export_date') || todayKey);
  const dateKey = mode === 'today' ? todayKey : picked;

  useEffect(() => {
    if (mode === 'pick') sessionStorage.setItem('pol_export_date', picked);
  }, [mode, picked]);

  const { to, subject, body, hasData, groups } = useMemo(
    () => buildDateEmail(store, dateKey),
    [store, dateKey]
  );
  const mailHref = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const totalLogged = hasData ? groups.reduce((n, g) => n + g.items.length, 0) : 0;

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

  return (
    <Sheet onClose={onClose} title="Export" titleStyle={{ fontSize: 24, overflow: 'visible', textOverflow: 'clip', flexShrink: 0 }}>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
        Email or copy every session logged on a single date.
      </p>

      {/* Today / Pick a date */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setMode('today')} className="tap" style={segStyle(mode === 'today')}>Today</button>
        <button onClick={() => setMode('pick')} className="tap" style={segStyle(mode === 'pick')}>Pick a date</button>
      </div>

      {mode === 'pick' && (
        <div className="reveal" style={{ marginTop: 12 }}>
          <input
            type="date"
            value={picked}
            max={todayKey}
            onChange={e => { if (e.target.value) setPicked(e.target.value); }}
            className="num"
            style={{
              width: '100%', height: 48, padding: '0 14px',
              border: '1px solid var(--hair)', borderRadius: 6,
              background: 'var(--paper)', color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>
      )}

      {/* Selected-date heading */}
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

      {/* Preview / empty state */}
      {hasData ? (
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
      ) : (
        <div style={{
          padding: '22px 16px', borderRadius: 8,
          border: '1px dashed var(--rule-thick)',
          textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', fontWeight: 500,
        }}>
          No sessions logged for this date.
        </div>
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
          onClick={e => { if (!hasData) e.preventDefault(); }}
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
