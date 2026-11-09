// Muscle groups the body map can light up. Matches the `muscle` enum in supabase/schema.sql.
export const MUSCLES = [
  "chest", "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "forearms",
  "upper_back", "lats", "traps", "lower_back",
  "abs", "obliques",
  "glutes", "quads", "hamstrings", "adductors", "calves",
] as const;

export type Muscle = (typeof MUSCLES)[number];
export type Glow = "full" | "soft";
export type GlowMap = Partial<Record<Muscle, Glow>>;

export type TargetedExercise = { primary: readonly Muscle[]; secondary: readonly Muscle[] };

// Primary muscles glow fully, secondary ones softly. If a muscle is primary
// for any exercise that day, it glows fully even if it was secondary elsewhere.
export function computeGlow(exercises: readonly TargetedExercise[]): GlowMap {
  const glow: GlowMap = {};
  for (const ex of exercises) {
    for (const m of ex.secondary) if (!glow[m]) glow[m] = "soft";
  }
  for (const ex of exercises) {
    for (const m of ex.primary) glow[m] = "full";
  }
  return glow;
}

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: "Chest", front_delts: "Front delts", side_delts: "Side delts", rear_delts: "Rear delts",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  upper_back: "Upper back", lats: "Lats", traps: "Traps", lower_back: "Lower back",
  abs: "Abs", obliques: "Obliques",
  glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", adductors: "Adductors", calves: "Calves",
};

// Sample days for ?preview=... until chat logging lands in Phase 3.
export const PREVIEWS: Record<string, TargetedExercise[]> = {
  push: [
    { primary: ["chest"], secondary: ["front_delts", "triceps"] },          // incline dumbbell press
    { primary: ["side_delts"], secondary: ["traps"] },                     // lateral raise
    { primary: ["triceps"], secondary: [] },                               // tricep pushdown
  ],
  pull: [
    { primary: ["lats"], secondary: ["biceps", "upper_back", "forearms"] }, // pull up
    { primary: ["upper_back", "lats"], secondary: ["rear_delts", "lower_back"] }, // barbell row
    { primary: ["biceps"], secondary: ["forearms"] },                      // barbell curl
  ],
  legs: [
    { primary: ["quads", "glutes"], secondary: ["adductors", "hamstrings", "lower_back"] }, // back squat
    { primary: ["hamstrings"], secondary: ["calves"] },                    // leg curl
    { primary: ["calves"], secondary: [] },                                // calf raise
    { primary: ["abs"], secondary: ["obliques"] },                         // hanging leg raise
  ],
  "chest-arms": [
    { primary: ["chest"], secondary: ["front_delts", "triceps"] },          // incline dumbbell press
    { primary: ["biceps"], secondary: ["forearms"] },                      // dumbbell curl
    { primary: ["triceps"], secondary: [] },                               // skull crusher
  ],
};
