// Geometrie voor de SVG-lijngrafiek van de zelftests (§6.10). Puur: geeft
// coördinaten en paden terug; tekenen doet ui/tests.js.

// series: [{ key, points: [{ x, y }] }]; bands: [{ key, lo, hi }] (de band
// voor je meetfout). Afmetingen in SVG-eenheden.
export function lineChart({ series, bands = [], width = 320, height = 180, pad = { top: 12, right: 12, bottom: 28, left: 40 } }) {
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = [...series.flatMap((s) => s.points.map((p) => p.y)), ...bands.flatMap((b) => [b.lo, b.hi])];
  if (!xs.length) return null;
  let [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  if (x0 === x1) { x0 -= 86400000; x1 += 86400000; }
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const span = y1 - y0 || Math.max(1, Math.abs(y1) * 0.1);
  y0 -= span * 0.15;
  y1 += span * 0.15;
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const sx = (x) => pad.left + ((x - x0) / (x1 - x0)) * iw;
  const sy = (y) => pad.top + (1 - (y - y0) / (y1 - y0)) * ih;
  const r = (v) => Math.round(v * 10) / 10;
  return {
    width, height, pad,
    lines: series.map((s) => ({
      key: s.key,
      path: s.points.map((p, i) => `${i ? 'L' : 'M'}${r(sx(p.x))},${r(sy(p.y))}`).join(' '),
      dots: s.points.map((p) => ({ cx: r(sx(p.x)), cy: r(sy(p.y)), x: p.x, y: p.y })),
    })),
    bands: bands.map((b) => ({ key: b.key, x: pad.left, y: r(sy(b.hi)), w: iw, h: r(sy(b.lo) - sy(b.hi)) })),
    yTicks: niceTicks(y0, y1, 4).map((v) => ({ v, y: r(sy(v)) })),
    xRange: [x0, x1],
  };
}

// Ronde waarden voor de as.
export function niceTicks(lo, hi, count) {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
