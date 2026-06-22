// seed-history.js — canonical, hardcoded session history.
// ─────────────────────────────────────────────────────────────
// This is the single source of truth for logged sessions. It is MERGED into
// localStorage (never overwrites it) on every load: a seeded session is added
// only when no session already exists for that exact exercise + calendar date.
// That rule guarantees:
//   • Future sessions you log are NEVER clobbered by a code change.
//   • Re-running the merge is idempotent (safe on every page load).
//   • New seed entries (e.g. a future date added here) flow in automatically.
//
// Keys are "<dayId>::<exact exercise name>" so they resolve to the same
// deterministic exercise id the rest of the app uses (cryptoId("d<day>_<name>")).
//
// Each session: { date, sets: [[reps, weight], ...], note?, prog? }
//   prog: { kind: 'weight', toWeight } | { kind: 'reps', toReps }

(function () {
  // All sessions logged at 19:00 UTC for deterministic day bucketing.
  const D = {
    may18: '2026-05-18T19:00:00.000Z', // PULL
    may21: '2026-05-21T19:00:00.000Z', // PUSH · LEGS · UPPER
    may26: '2026-05-26T19:00:00.000Z', // PULL
    jun3:  '2026-06-03T19:00:00.000Z', // PULL
    jun4:  '2026-06-04T19:00:00.000Z', // PUSH
    jun5:  '2026-06-05T19:00:00.000Z', // LEGS
    jun7:  '2026-06-07T19:00:00.000Z', // UPPER
    jun9:  '2026-06-09T19:00:00.000Z', // PULL
    jun11: '2026-06-11T19:00:00.000Z', // PUSH
    jun12: '2026-06-12T19:00:00.000Z', // LEGS
    jun14: '2026-06-14T19:00:00.000Z', // UPPER
    jun16: '2026-06-16T19:00:00.000Z', // PULL
  };

  // s(reps, weight) → [reps, weight] — tiny helper to keep rows readable.
  const s = (r, w) => [r, w];

  const seedHistory = {
    // ── DAY 1 · PULL ──────────────────────────────────────────
    '1::Chest-Supported Row Machine': [
      { date: D.may18, sets: [s(10,145), s(10,150), s(10,160)] },
      { date: D.may26, sets: [s(10,160), s(10,160), s(10,160)], prog: { kind: 'weight', toWeight: 170 } },
      { date: D.jun3,  sets: [s(12,170), s(13,170), s(12,170)] },
      { date: D.jun9,  sets: [s(12,170), s(11,170), s(12,170)] },
      { date: D.jun16, sets: [s(12,170), s(12,170), s(12,170)] },
    ],
    '1::Lat Pulldown': [
      { date: D.may18, sets: [s(10,121), s(9,121), s(10,121)] },
      { date: D.may26, sets: [s(11,121), s(10,121), s(10,121)], prog: { kind: 'weight', toWeight: 126 } },
      { date: D.jun3,  sets: [s(11,126), s(11,126), s(10,126)] },
      { date: D.jun9,  sets: [s(12,126), s(11,126), s(11,126)] },
      { date: D.jun16, sets: [s(12,126), s(11,126), s(11,126)] },
    ],
    '1::Cable Straight-Arm Pulldown': [
      { date: D.may18, sets: [s(10,44), s(12,33), s(12,33)] },
      { date: D.may26, sets: [s(17,44), s(15,45), s(12,45)] },
      { date: D.jun3,  sets: [s(15,55), s(13,55), s(12,55)] },
      { date: D.jun9,  sets: [s(15,57), s(14,57), s(12,57)], note: '57 too much, go 53' },
      { date: D.jun16, sets: [s(15,53), s(13,53), s(13,53)] },
    ],
    '1::Rear Delt Fly Machine': [
      { date: D.may18, sets: [s(15,80), s(14,80), s(13,80)] },
      { date: D.may26, sets: [s(15,80), s(15,80), s(14,80)] },
      { date: D.jun3,  sets: [s(17,80), s(14,80), s(14,80)] },
      { date: D.jun9,  sets: [s(15,80), s(15,80), s(15,80)] },
      { date: D.jun16, sets: [s(15,80), s(15,80), s(15,80)] },
    ],
    '1::Face Pull': [
      { date: D.may18, sets: [s(15,50), s(15,50), s(15,50)] },
      { date: D.may26, sets: [s(15,50), s(15,50), s(15,50)], prog: { kind: 'weight', toWeight: 55 } },
      { date: D.jun3,  sets: [s(15,55), s(15,55), s(15,55)], prog: { kind: 'weight', toWeight: 60 } },
      { date: D.jun9,  sets: [s(15,60), s(15,60), s(15,60)] },
      { date: D.jun16, sets: [s(15,44), s(15,44), s(15,44)] },
    ],
    '1::Incline Dumbbell Curl': [
      { date: D.may18, sets: [s(10,25), s(8,25), s(8,25)] },
      { date: D.may26, sets: [s(10,25), s(10,25), s(10,25)] },
      { date: D.jun3,  sets: [s(11,25), s(10,25), s(9,25)], prog: { kind: 'weight', toWeight: 27.5 } },
      { date: D.jun9,  sets: [s(10,27.5), s(9,27.5), s(8,27.5)] },
      { date: D.jun16, sets: [s(10,27.5), s(8,27.5), s(7,27.5)] },
    ],
    '1::Behind-the-Back Finger Curls': [
      { date: D.may18, sets: [s(15,66), s(15,66)], prog: { kind: 'weight', toWeight: 70 } },
      { date: D.may26, sets: [s(15,70), s(15,70)], prog: { kind: 'weight', toWeight: 76 } },
      { date: D.jun3,  sets: [s(15,76), s(14,76)] },
      { date: D.jun9,  sets: [s(15,77), s(15,77)] },
      { date: D.jun16, sets: [s(14,77), s(15,77)] },
    ],
    '1::Dumbbell Hammer Curl': [
      { date: D.may18, sets: [s(12,30), s(12,30)] },
      { date: D.may26, sets: [s(12,30), s(11,30)] },
      { date: D.jun3,  sets: [s(14,25), s(12,30)] },
      { date: D.jun16, sets: [s(12,30), s(10,30)] },
    ],

    // ── DAY 2 · PUSH ──────────────────────────────────────────
    '2::Incline Dumbbell Press': [
      { date: D.may21, sets: [s(10,45), s(10,45), s(10,45)], prog: { kind: 'weight', toWeight: 50 } },
      { date: D.jun4,  sets: [s(10,50), s(9,50), s(8,50)] },
      { date: D.jun11, sets: [s(9,50), s(8,50), s(8,45)] },
    ],
    '2::Seated Dumbbell Shoulder Press': [
      { date: D.may21, sets: [s(10,40), s(10,40), s(10,40)], prog: { kind: 'weight', toWeight: 45 } },
      { date: D.jun4,  sets: [s(10,45), s(9,45), s(9,45)] },
      { date: D.jun11, sets: [s(8,45), s(10,40), s(10,40)] },
    ],
    '2::Flat Dumbbell Bench Press': [
      { date: D.may21, sets: [s(12,45), s(10,45), s(10,45)] },
      { date: D.jun4,  sets: [s(14,45), s(11,45), s(13,45)] },
      { date: D.jun11, sets: [s(12,45), s(12,45), s(11,45)] },
    ],
    '2::Machine Chest Fly (Pec Deck)': [
      { date: D.may21, sets: [s(15,100), s(15,100), s(15,100)], prog: { kind: 'weight', toWeight: 110 } },
      { date: D.jun4,  sets: [s(15,110), s(15,110), s(15,110)] },
      { date: D.jun11, sets: [s(15,120), s(12,120), s(12,120)] },
    ],
    '2::Lower Chest Cable Fly': [
      { date: D.may21, sets: [s(15,22), s(15,22), s(15,22)], prog: { kind: 'weight', toWeight: 30 } },
      { date: D.jun4,  sets: [s(15,30), s(15,30), s(15,30)] },
      { date: D.jun11, sets: [s(15,30), s(15,30), s(15,30)] },
    ],
    '2::Incline Cable Fly (low-to-high)': [
      { date: D.jun11, sets: [s(15,17), s(12,17), s(13,17)] },
    ],
    '2::Lateral Raise': [
      { date: D.jun11, sets: [s(15,20), s(15,20), s(15,20), s(13,20)] },
    ],
    '2::Overhead Triceps Extension': [
      { date: D.jun11, sets: [s(12,60), s(11,60), s(11,60)] },
    ],
    '2::Cable Triceps Pushdown': [
      { date: D.jun11, sets: [s(12,77), s(11,77), s(11,77)] },
    ],

    // ── DAY 3 · LEGS ──────────────────────────────────────────
    '3::Leg Press': [
      { date: D.may21, sets: [s(11,175), s(11,175), s(10,175), s(10,170)], prog: { kind: 'weight', toWeight: 180 } },
      { date: D.jun5,  sets: [s(11,180), s(11,180), s(11,180), s(8,180)] },
      { date: D.jun12, sets: [s(11,175), s(11,175), s(11,175), s(11,175)] },
    ],
    '3::Romanian Deadlift': [
      { date: D.may21, sets: [s(12,100), s(12,85), s(12,85)], prog: { kind: 'weight', toWeight: 140 } },
      { date: D.jun5,  sets: [s(12,140), s(12,140), s(10,140)] },
      { date: D.jun12, sets: [s(12,140), s(12,140), s(12,140)] },
    ],
    '3::Lying Leg Curl': [
      { date: D.may21, sets: [s(12,130), s(12,130), s(12,125), s(12,125)] },
      { date: D.jun5,  sets: [s(14,130), s(14,130), s(14,130), s(14,130)] },
      { date: D.jun12, sets: [s(12,130), s(12,130), s(12,130), s(11,130)] },
    ],
    '3::Leg Extension': [
      { date: D.may21, sets: [s(12,220), s(12,220), s(12,220)] },
      { date: D.jun5,  sets: [s(12,220), s(12,220), s(12,220)] },
      { date: D.jun12, sets: [s(12,230), s(12,230), s(12,230)] },
    ],
    '3::Hip Adduction': [
      { date: D.may21, sets: [s(15,130), s(15,120)] },
      { date: D.jun5,  sets: [s(15,130), s(13,130)] },
      { date: D.jun12, sets: [s(15,130), s(15,130)] },
    ],
    '3::Hip Abduction': [
      { date: D.may21, sets: [s(15,190), s(15,180)] },
      { date: D.jun5,  sets: [s(15,190), s(15,190)] },
      { date: D.jun12, sets: [s(15,200), s(12,200)] },
    ],
    '3::Standing Calf Raise': [
      { date: D.may21, sets: [s(15,120), s(15,110), s(15,110)], prog: { kind: 'weight', toWeight: 130 } },
      { date: D.jun5,  sets: [s(15,130), s(15,130), s(15,130)] },
      { date: D.jun12, sets: [s(15,130), s(15,130), s(15,130)] },
    ],
    '3::Dead Bug': [
      { date: D.jun5,  sets: [s(8,0), s(8,0), s(8,0)] },
      { date: D.jun12, sets: [s(9,0), s(9,0), s(9,0)] },
    ],
    '3::Cable Woodchop': [
      { date: D.may21, sets: [s(13,38), s(12,38), s(12,33)] },
      { date: D.jun5,  sets: [s(13,45), s(13,38), s(13,38)] },
      { date: D.jun12, sets: [s(14,38), s(14,38), s(14,38)] },
    ],
    "3::Farmer's Walk": [
      { date: D.may21, sets: [s(3,55), s(3,40), s(3,40)] },
      { date: D.jun12, sets: [s(1,65), s(1,65), s(1,65)] },
    ],

    // ── DAY 4 · UPPER ─────────────────────────────────────────
    '4::Flat Dumbbell Bench Press': [
      { date: D.may21, sets: [s(12,50), s(11,50), s(10,45)] },
      { date: D.jun7,  sets: [s(12,45), s(12,40), s(12,40)] },
      { date: D.jun14, sets: [s(12,45), s(12,45), s(12,45)] },
    ],
    '4::Neutral-Grip Row Machine': [
      { date: D.may21, sets: [s(12,99), s(11,99), s(10,99)] },
      { date: D.jun7,  sets: [s(12,99), s(12,99), s(12,99)] },
      { date: D.jun14, sets: [s(13,104), s(12,110), s(12,115)] },
    ],
    '4::Lateral Raise': [
      { date: D.may21, sets: [s(15,20), s(15,17.5), s(15,17.5)] },
      { date: D.jun7,  sets: [s(16,17.5), s(15,17.5), s(15,17.5)] },
      { date: D.jun14, sets: [s(15,20), s(15,20), s(15,20)] },
    ],
    '4::Cable Fly': [
      { date: D.may21, sets: [s(15,25), s(15,22), s(15,22)] },
      { date: D.jun7,  sets: [s(15,22), s(15,22), s(15,22)] },
      { date: D.jun14, sets: [s(15,33), s(15,33), s(15,37)] },
    ],
    '4::Close-Grip Bench Press': [
      { date: D.may21, sets: [s(11,75), s(10,70), s(10,70)] },
      { date: D.jun14, sets: [s(10,70), s(10,70), s(8,70)] },
    ],
    '4::Cable Biceps Curl': [
      { date: D.may21, sets: [s(15,55), s(15,49), s(15,49)], prog: { kind: 'weight', toWeight: 55 } },
      { date: D.jun7,  sets: [s(15,55), s(15,55), s(13,55)] },
      { date: D.jun14, sets: [s(15,55), s(15,55), s(15,55)] },
    ],
    '4::Reverse Curl': [
      { date: D.may21, sets: [s(12,22.5), s(11,20), s(10,20)] },
      { date: D.jun7,  sets: [s(14,22.5), s(12,22.5), s(12,22.5)] },
      { date: D.jun14, sets: [s(14,22.5), s(12,22.5), s(12,22.5)] },
    ],
  };

  // ── Merge ───────────────────────────────────────────────────
  // Adds any seeded session whose (exercise, calendar-date) pair is not already
  // present in the store. Never edits or removes existing sessions. Mutates and
  // returns the same store object.
  function dayKey(iso) {
    // Deterministic UTC calendar day — independent of the viewer's timezone.
    return String(iso).slice(0, 10);
  }

  function mergeSeedHistory(store) {
    if (!store || !store.sessions) return store;
    if (typeof seedHistory === 'undefined') return store;

    const idFor = (typeof window !== 'undefined' && window.cryptoId)
      ? window.cryptoId
      : (seed => seed); // defensive fallback

    for (const key in seedHistory) {
      const sep = key.indexOf('::');
      const dayId = key.slice(0, sep);
      const name = key.slice(sep + 2);
      const exId = idFor(`d${dayId}_${name}`);

      // Resolve the live exercise def (for unit / target / status). If the
      // exercise isn't present we still seed raw sessions so nothing is lost.
      let ex = null;
      for (const d of (store.days || [])) {
        const found = (d.exercises || []).find(e => e.id === exId);
        if (found) { ex = found; break; }
      }

      const existing = store.sessions[exId] || [];
      const seenDays = new Set(existing.map(se => dayKey(se.date)));

      const additions = [];
      for (const h of seedHistory[key]) {
        if (seenDays.has(dayKey(h.date))) continue; // user/seed data already here
        const sets = h.sets.map(([reps, weight]) => ({ reps, weight }));
        const status = ex && window.deriveStatus ? window.deriveStatus(ex) : 'developing';
        const entry = {
          date: h.date,
          sets,
          note: h.note || '',
          status,
          unit: ex ? ex.unit : 'lbs',
          target: ex && window.targetString ? window.targetString(ex) : '',
          seeded: true,
        };
        if (h.prog) entry.progression = h.prog;
        additions.push(entry);
      }

      if (additions.length) {
        store.sessions[exId] = [...existing, ...additions]
          .sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    }
    return store;
  }

  window.seedHistory = seedHistory;
  window.mergeSeedHistory = mergeSeedHistory;
})();
