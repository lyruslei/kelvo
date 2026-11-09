// The kelvo mark: a ring split into 6 segments, one per muscle group (chest, back,
// shoulders, arms, legs, abs), lit like the body map: 2 worked, 1 worked lightly, 3 not.
// Drawn in a 100 x 100 box. Used by the wordmark's "o", the app icons
// (scripts/make-icons.mjs) and the showcase video, so they always match.
// Pure: no I/O, safe in the browser.

export const MARK = {
  stroke: 15,       // ring thickness
  radius: 40.5,     // centre line of the ring
  gapDeg: 14,       // gap between segments
  colors: ["#FFC300", "#FFC300", "#B07A00", "#4E493F", "#4E493F", "#4E493F"], // clockwise from the top
};

// One SVG arc path per segment, clockwise from 12 o'clock.
export function markSegments(): { d: string; color: string }[] {
  const n = MARK.colors.length;
  const step = 360 / n;
  const at = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(50 + MARK.radius * Math.cos(rad)).toFixed(2)} ${(50 + MARK.radius * Math.sin(rad)).toFixed(2)}`;
  };
  return MARK.colors.map((color, i) => {
    const from = -90 + i * step + MARK.gapDeg / 2;
    const to = from + step - MARK.gapDeg;
    return { d: `M${at(from)} A${MARK.radius} ${MARK.radius} 0 0 1 ${at(to)}`, color };
  });
}

// The mark as SVG markup (no <svg> wrapper), for icons and the video.
export const markSvgPaths = () =>
  markSegments()
    .map((s) => `<path d="${s.d}" fill="none" stroke="${s.color}" stroke-width="${MARK.stroke}"/>`)
    .join("");
