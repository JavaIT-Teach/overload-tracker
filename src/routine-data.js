// Progressive Overload Tracker — pre-loaded routine data
//
// EXPECTED JSON IMPORT FORMAT:
// {
//   "days": [
//     {
//       "id": 1,
//       "name": "PULL",
//       "subtitle": "Back + Biceps + Forearms",
//       "exercises": [
//         {
//           "name": "Chest-Supported Row Machine",
//           "sets": 3,
//           "repMin": 8, "repMax": 10,
//           "weightMin": 140, "weightMax": 160,
//           "repCap": 12,
//           "weightStep": 5,         // optional, default 5 (use 2.5 for dumbbells)
//           "unit": "lbs",           // optional, default "lbs"
//           "notation": null         // optional: "per side" | "per hand" | "per side reps" | "steps" | etc
//         }
//       ]
//     }
//   ]
// }
//
// On import:
//   • Exercises matched by (day, name) preserve their session history.
//   • New exercises start fresh.
//   • Removed exercises have their history archived but never deleted.

// Step heuristics by name keyword
function stepFor(name) {
  const n = name.toLowerCase();
  if (n.includes('dumbbell') || n.includes('lateral raise') || n.includes('hammer curl') || n.includes('incline curl') || n.includes('reverse curl') || n.includes('farmer')) return 2.5;
  return 5;
}

const ex = (name, sets, repMin, repMax, weightMin, weightMax, repCap, opts = {}) => ({
  id: cryptoId(name),
  name,
  sets,
  repMin, repMax,
  weightMin, weightMax,
  repCap,
  weightStep: opts.weightStep ?? stepFor(name),
  unit: opts.unit ?? 'lbs',
  notation: opts.notation ?? null,
  repUnit: opts.repUnit ?? 'reps',
});

function cryptoId(seed) {
  // deterministic-ish id from seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'ex_' + (h >>> 0).toString(36);
}

const DEFAULT_ROUTINE = {
  days: [
    {
      id: 1, name: 'PULL', subtitle: 'Back · Biceps · Forearms',
      exercises: [
        ex('Chest-Supported Row Machine', 3, 8, 10, 140, 160, 12),
        ex('Lat Pulldown', 3, 8, 10, 110, 121, 12),
        ex('Cable Straight-Arm Pulldown', 3, 12, 15, 33, 44, 15),
        ex('Rear Delt Fly Machine', 3, 15, 15, 70, 80, 15),
        ex('Face Pull', 3, 12, 15, 50, 50, 15),
        ex('Incline Dumbbell Curl', 3, 8, 10, 25, 25, 12),
        ex('Behind-the-Back Finger Curls', 2, 12, 15, 60, 66, 15),
        ex('Hammer Curl', 2, 12, 12, 25, 30, 12),
      ],
    },
    {
      id: 2, name: 'PUSH', subtitle: 'Chest · Shoulders · Triceps',
      exercises: [
        ex('Incline Dumbbell Press', 3, 10, 10, 45, 50, 12),
        ex('Seated Dumbbell Shoulder Press', 3, 10, 10, 40, 45, 12),
        ex('Flat Dumbbell Bench Press', 3, 12, 12, 40, 45, 15),
        ex('Machine Chest Fly (Pec Deck)', 3, 12, 15, 100, 100, 15),
        ex('Lower Chest Cable Fly', 3, 12, 15, 22, 22, 15),
        ex('Incline Cable Fly', 3, 12, 15, 13, 17, 15),
        ex('Lateral Raise', 4, 15, 15, 15, 17.5, 15),
        ex('Overhead Triceps Extension', 3, 12, 12, 55, 60, 12),
        ex('Cable Triceps Pushdown', 3, 10, 12, 71, 71, 12),
      ],
    },
    {
      id: 3, name: 'LEGS', subtitle: 'Lower Body · Core',
      exercises: [
        ex('Leg Press', 4, 10, 10, 170, 170, 12, { notation: 'per side' }),
        ex('Romanian Deadlift', 3, 10, 12, 85, 85, 12),
        ex('Lying Leg Curl', 4, 12, 12, 125, 130, 12),
        ex('Leg Extension', 3, 12, 12, 220, 220, 12),
        ex('Hip Adduction', 2, 12, 15, 120, 120, 15),
        ex('Hip Abduction', 2, 15, 15, 160, 180, 15),
        ex('Standing Calf Raise', 3, 15, 15, 110, 110, 15),
        ex('Dead Bug', 3, 8, 8, 0, 0, 12, { notation: 'per side · bodyweight', unit: '' }),
        ex('Cable Woodchop', 3, 12, 12, 33, 33, 15, { notation: 'per side' }),
        ex("Farmer's Walk", 3, 3, 3, 40, 40, 5, { notation: 'per hand', repUnit: 'laps' }),
      ],
    },
    {
      id: 4, name: 'UPPER', subtitle: 'Chest · Back · Shoulders · Arms',
      exercises: [
        ex('Flat Dumbbell Bench Press', 3, 10, 12, 45, 50, 12),
        ex('Neutral-Grip Row Machine', 3, 10, 12, 99, 99, 12),
        ex('Lateral Raise', 3, 12, 15, 17.5, 17.5, 15),
        ex('Cable Fly', 3, 12, 15, 22, 22, 15),
        ex('Close-Grip Bench Press', 3, 8, 10, 70, 70, 12),
        ex('Cable Biceps Curl', 3, 12, 15, 49, 49, 15),
        ex('Reverse Curl', 3, 10, 12, 20, 20, 12),
      ],
    },
  ],
};

// Re-key day exercises so duplicate names across days don't collide
DEFAULT_ROUTINE.days.forEach(d => {
  d.exercises.forEach(e => { e.id = cryptoId(`d${d.id}_${e.name}`); });
});

window.DEFAULT_ROUTINE = DEFAULT_ROUTINE;
window.cryptoId = cryptoId;
window.stepFor = stepFor;
