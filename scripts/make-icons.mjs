// Draws the app icons from the logo mark in src/components/logoMark.ts:
//   src/app/icon.svg        browser tab (rounded tile)
//   src/app/apple-icon.png  iPhone home screen, 180px (iOS rounds the corners itself)
//   public/icon-192.png, public/icon-512.png  Android / installed app (also used as maskable)
//
// Run after changing the mark: node scripts/make-icons.mjs

import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { markSvgPaths } from "../src/components/logoMark.ts";

const root = new URL("../", import.meta.url);
const BG = "#0A0A0A";
// The ring fills 66% of the tile: big enough to read at 16px, inside the maskable safe zone.
const ring = `<g transform="translate(87 87) scale(3.38)">${markSvgPaths()}</g>`;
const svg = (rounded) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512"${rounded ? ' rx="112"' : ""} fill="${BG}"/>${ring}</svg>`;

writeFileSync(new URL("src/app/icon.svg", root), svg(true) + "\n");
const square = Buffer.from(svg(false));
for (const [path, px] of [["src/app/apple-icon.png", 180], ["public/icon-192.png", 192], ["public/icon-512.png", 512]]) {
  await sharp(square).resize(px, px).flatten({ background: BG }).png().toFile(new URL(path, root).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  console.log(`wrote ${path} (${px}px)`);
}
