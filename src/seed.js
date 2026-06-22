// seed.js — pre-loaded routine DEFINITIONS for first run.
// ─────────────────────────────────────────────────────────────
// Builds the day/exercise structure (targets, units, notation). Session
// history lives in seed-history.js and is merged in separately so logged
// progress is never tied to a code change. SEED_STORE.sessions starts empty;
// mergeSeedHistory() fills it.
//
// Current date in app: June 10, 2026. Targets below reflect where each lift
// sits after the June sessions.

(function() {
  function makeEx(dayId, name, def, opts = {}) {
    return {
      id: cryptoId(`d${dayId}_${name}`),
      name,
      sets: def.sets,
      repMin: def.repMin, repMax: def.repMax,
      weightMin: def.wMin, weightMax: def.wMax,
      repCap: def.repCap,
      weightStep: opts.weightStep ?? stepFor(name),
      unit: opts.unit ?? 'lbs',
      notation: opts.notation ?? null,
      repUnit: opts.repUnit ?? 'reps',
    };
  }

  const days = [
    { id: 1, name: 'PULL',  subtitle: 'Back · Biceps · Forearms',           exercises: [] },
    { id: 2, name: 'PUSH',  subtitle: 'Chest · Shoulders · Triceps',        exercises: [] },
    { id: 3, name: 'LEGS',  subtitle: 'Lower Body · Core',                  exercises: [] },
    { id: 4, name: 'UPPER', subtitle: 'Chest · Back · Shoulders · Arms',    exercises: [] },
  ];

  // add(dayId, name, def, opts) — pushes an exercise definition. No sessions
  // here; those come from seed-history.js.
  function add(dayId, name, def, opts) {
    const ex = makeEx(dayId, name, def, opts || {});
    days.find(d => d.id === dayId).exercises.push(ex);
    return ex;
  }

  // ── DAY 1 · PULL ────────────────────────────────────────────
  add(1, 'Chest-Supported Row Machine', { sets: 3, repMin: 10, repMax: 12, wMin: 170, wMax: 170, repCap: 12 });
  add(1, 'Lat Pulldown',                { sets: 3, repMin: 10, repMax: 12, wMin: 126, wMax: 126, repCap: 12 });
  add(1, 'Cable Straight-Arm Pulldown', { sets: 3, repMin: 12, repMax: 15, wMin: 53,  wMax: 53,  repCap: 15 });
  add(1, 'Rear Delt Fly Machine',       { sets: 3, repMin: 15, repMax: 15, wMin: 80,  wMax: 80,  repCap: 15 });
  add(1, 'Face Pull',                   { sets: 3, repMin: 15, repMax: 15, wMin: 60,  wMax: 60,  repCap: 15 });
  add(1, 'Incline Dumbbell Curl',       { sets: 3, repMin: 8,  repMax: 10, wMin: 27.5, wMax: 27.5, repCap: 12 });
  add(1, 'Behind-the-Back Finger Curls',{ sets: 2, repMin: 15, repMax: 15, wMin: 77,  wMax: 77,  repCap: 15 });
  add(1, 'Dumbbell Hammer Curl',        { sets: 2, repMin: 12, repMax: 12, wMin: 25,  wMax: 30,  repCap: 12 });

  // ── DAY 2 · PUSH ────────────────────────────────────────────
  add(2, 'Incline Dumbbell Press',          { sets: 3, repMin: 8,  repMax: 10, wMin: 50,  wMax: 50,  repCap: 12 });
  add(2, 'Seated Dumbbell Shoulder Press',  { sets: 3, repMin: 9,  repMax: 10, wMin: 45,  wMax: 45,  repCap: 12 });
  add(2, 'Flat Dumbbell Bench Press',       { sets: 3, repMin: 12, repMax: 15, wMin: 45,  wMax: 45,  repCap: 15 });
  add(2, 'Machine Chest Fly (Pec Deck)',    { sets: 3, repMin: 15, repMax: 15, wMin: 110, wMax: 110, repCap: 15 });
  add(2, 'Lower Chest Cable Fly',           { sets: 3, repMin: 15, repMax: 15, wMin: 30,  wMax: 30,  repCap: 15 });
  add(2, 'Incline Cable Fly (low-to-high)', { sets: 3, repMin: 12, repMax: 15, wMin: 17,  wMax: 20,  repCap: 15 });
  add(2, 'Lateral Raise',                   { sets: 4, repMin: 13, repMax: 15, wMin: 20,  wMax: 22.5, repCap: 15 });
  add(2, 'Overhead Triceps Extension',      { sets: 3, repMin: 10, repMax: 12, wMin: 60,  wMax: 65,  repCap: 12 });
  add(2, 'Cable Triceps Pushdown',          { sets: 3, repMin: 10, repMax: 12, wMin: 77,  wMax: 82,  repCap: 12 });

  // ── DAY 3 · LEGS + CORE ─────────────────────────────────────
  add(3, 'Leg Press',           { sets: 4, repMin: 10, repMax: 11, wMin: 180, wMax: 180, repCap: 12 }, { notation: 'per side' });
  add(3, 'Romanian Deadlift',   { sets: 3, repMin: 12, repMax: 12, wMin: 140, wMax: 140, repCap: 12 });
  add(3, 'Lying Leg Curl',      { sets: 4, repMin: 12, repMax: 14, wMin: 130, wMax: 130, repCap: 15 });
  add(3, 'Leg Extension',       { sets: 3, repMin: 12, repMax: 12, wMin: 220, wMax: 220, repCap: 12 });
  add(3, 'Hip Adduction',       { sets: 2, repMin: 13, repMax: 15, wMin: 130, wMax: 130, repCap: 15 });
  add(3, 'Hip Abduction',       { sets: 2, repMin: 15, repMax: 15, wMin: 190, wMax: 190, repCap: 15 });
  add(3, 'Standing Calf Raise', { sets: 3, repMin: 15, repMax: 15, wMin: 130, wMax: 130, repCap: 15 });
  add(3, 'Dead Bug',            { sets: 3, repMin: 8,  repMax: 8,  wMin: 0,   wMax: 0,   repCap: 12 }, { notation: 'per side · bodyweight', unit: '' });
  add(3, 'Cable Woodchop',      { sets: 3, repMin: 13, repMax: 13, wMin: 38,  wMax: 45,  repCap: 15 }, { notation: 'per side' });
  add(3, "Farmer's Walk",       { sets: 3, repMin: 3,  repMax: 3,  wMin: 40,  wMax: 55,  repCap: 5 },  { notation: 'per hand', repUnit: 'laps' });

  // ── DAY 4 · UPPER ───────────────────────────────────────────
  add(4, 'Flat Dumbbell Bench Press', { sets: 3, repMin: 10, repMax: 12, wMin: 45, wMax: 50, repCap: 12 });
  add(4, 'Neutral-Grip Row Machine',  { sets: 3, repMin: 12, repMax: 12, wMin: 99, wMax: 99, repCap: 12 });
  add(4, 'Lateral Raise',             { sets: 3, repMin: 15, repMax: 15, wMin: 17.5, wMax: 17.5, repCap: 15 });
  add(4, 'Cable Fly',                 { sets: 3, repMin: 15, repMax: 15, wMin: 22, wMax: 22, repCap: 15 });
  add(4, 'Close-Grip Bench Press',    { sets: 3, repMin: 10, repMax: 11, wMin: 70, wMax: 75, repCap: 12 });
  add(4, 'Cable Biceps Curl',         { sets: 3, repMin: 15, repMax: 15, wMin: 55, wMax: 55, repCap: 15 });
  add(4, 'Reverse Curl',              { sets: 3, repMin: 12, repMax: 12, wMin: 22.5, wMax: 22.5, repCap: 12 });

  // ── Expose ──────────────────────────────────────────────────
  window.SEED_STORE = {
    days,
    sessions: {},   // filled by mergeSeedHistory()
    notes: {},
    archive: [],
  };
})();
