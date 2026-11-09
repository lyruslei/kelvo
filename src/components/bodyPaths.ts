import type { Muscle } from "@/lib/muscles";

// Original drawing, 200 x 440 per figure, centre line x = 100.
// Each shape is drawn for the viewer's left half only and mirrored for the right.

// Body outline (the light "gaps" between muscles), left half.
export const SILHOUETTE =
  "M100 54 L93 54 Q93 61 90 63 Q78 66 66 69 Q52 73 49 88 Q47 104 50 118 Q46 136 45 152 " +
  "Q40 172 37 196 Q34 208 36 220 Q38 232 44 234 Q48 230 47 222 Q50 212 52 206 Q58 188 62 170 " +
  "Q67 150 69 130 L71 122 Q72 148 74 170 Q69 186 67 202 Q63 240 66 284 Q67 296 69 306 " +
  "Q66 336 69 366 Q70 392 72 410 Q67 420 70 428 L90 428 Q92 418 89 410 Q90 380 90 350 " +
  "Q91 322 90 306 Q93 292 94 280 Q97 246 98 214 L100 212 Z";

export const HEAD = { cx: 100, cy: 31, rx: 16, ry: 21 };

type Shape = { muscle: Muscle; d: string };

export const FRONT: Shape[] = [
  { muscle: "traps", d: "M93 64 Q84 67 74 69 Q86 72 94 74 Z" },
  { muscle: "side_delts", d: "M66 71 Q54 74 51 88 Q50 100 54 108 Q56 92 61 82 Q64 75 66 71 Z" },
  { muscle: "front_delts", d: "M70 71 Q63 77 61 88 Q58 98 57 106 Q66 96 74 88 Q76 79 70 71 Z" },
  { muscle: "chest", d: "M98 75 L80 73 Q72 77 69 88 Q68 101 75 109 Q88 114 98 110 Z" },
  { muscle: "biceps", d: "M56 108 Q49 122 49 138 Q50 152 56 156 Q66 144 68 128 Q67 114 60 108 Z" },
  { muscle: "forearms", d: "M51 158 Q45 172 41 194 Q40 206 45 210 Q55 192 61 172 Q63 162 58 156 Z" },
  { muscle: "obliques", d: "M80 116 Q75 124 75 138 Q75 156 80 170 L85 168 Q84 142 85 117 Z" },
  { muscle: "abs", d: "M88 115 L98 115 L98 128 L88 129 Q87 122 88 115 Z" },
  { muscle: "abs", d: "M88 132 L98 131 L98 146 L88 147 Z" },
  { muscle: "abs", d: "M88 150 L98 149 L98 164 L88 165 Z" },
  { muscle: "abs", d: "M88 168 L98 167 L98 196 Q92 192 89 184 Z" },
  { muscle: "quads", d: "M80 204 Q70 214 68 240 Q67 266 72 288 Q79 296 86 290 Q91 262 91 236 Q91 214 86 204 Z" },
  { muscle: "quads", d: "M88 258 Q95 266 95 282 Q93 292 88 290 Q90 274 88 258 Z" },
  { muscle: "adductors", d: "M90 206 Q96 214 97 230 Q96 246 93 254 Q92 232 90 206 Z" },
  { muscle: "calves", d: "M72 310 Q66 332 69 360 Q72 378 78 386 Q80 352 80 326 Q79 312 72 310 Z" },
];

export const BACK: Shape[] = [
  { muscle: "traps", d: "M99 58 L93 60 Q86 66 74 70 Q86 76 92 92 L99 120 Z" },
  { muscle: "rear_delts", d: "M70 71 Q56 73 51 87 Q50 100 54 108 Q61 92 74 83 Q76 76 70 71 Z" },
  { muscle: "upper_back", d: "M76 86 Q67 94 66 106 Q76 114 88 111 Q92 104 90 96 Q84 88 76 86 Z" },
  { muscle: "lats", d: "M68 112 Q67 132 72 150 Q78 166 90 178 L91 128 Q82 118 68 112 Z" },
  { muscle: "lower_back", d: "M93 126 L99 124 L99 196 Q93 194 90 188 Q93 170 93 126 Z" },
  { muscle: "triceps", d: "M55 111 Q49 124 49 138 Q51 150 57 154 Q65 140 66 124 Q64 113 59 108 Z" },
  { muscle: "forearms", d: "M51 158 Q45 172 41 194 Q40 206 45 210 Q55 192 61 172 Q63 162 58 156 Z" },
  { muscle: "glutes", d: "M98 200 Q82 196 74 208 Q69 226 76 240 Q88 248 98 242 Z" },
  { muscle: "hamstrings", d: "M74 248 Q68 270 70 292 Q76 302 84 300 Q89 284 90 266 L89 250 Q82 250 74 248 Z" },
  { muscle: "hamstrings", d: "M91 250 L97 249 Q98 276 95 296 Q90 298 89 292 Q92 270 91 250 Z" },
  { muscle: "calves", d: "M73 310 Q64 328 67 352 Q72 368 81 364 Q86 342 86 322 Q82 310 73 310 Z" },
  { muscle: "calves", d: "M88 312 Q96 324 94 350 Q90 364 84 362 Q89 336 88 312 Z" },
];

// Shapes that fill the figure but aren't tracked (they never glow).
export const DECOR_FRONT: string[] = [
  "M82 312 Q88 316 89 340 Q88 370 85 394 Q82 370 82 340 Z",      // shin
  "M74 112 Q70 118 72 128 L78 124 Q78 116 74 112 Z",              // serratus
  "M93 56 L93 63 Q96 66 99 68 L99 58 Z",                          // neck
];
export const DECOR_BACK: string[] = [
  "M76 372 Q74 390 76 404 L84 404 Q86 388 84 368 Z",              // achilles
  "M69 168 Q68 186 72 198 L84 194 Q78 182 72 170 Z",              // hip
];
