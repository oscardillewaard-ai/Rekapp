// 3D-modus (instelling "3D-figuren"): een figuur uit zij- of vooraanzicht in de
// ruimte zetten, zodat een camera er schuin naar kan kijken (zie rig3d.js voor
// de wereld: x vooruit, y omhoog, z naar de kijker). Puur.
//
// Zijaanzicht: het beeldvlak is het vlak x–y; de n-kant komt naar voren (z+),
// de f-kant naar achteren, de romp in het midden. Een hand die een punt van het
// figuur vastpakt ('f.ankle', 'head') gaat mee naar de diepte van dat punt.
// Vooraanzicht: het figuur kijkt de camera aan (x vooruit), n staat rechts in
// beeld (z−). Diepte die het 2D-figuur niet kent, blijft 0: zulke figuren
// blijven in 3D wat plat.
import { BONES } from './rig.js';
import { floorRect } from './rig3d.js';

const SPINE = new Set(['pelvis', 'mid', 'chest', 'neck', 'head']);
const LEG = new Set(['hip', 'knee', 'ankle', 'toe', 'thighMid', 'shinMid']);

// Diepte van een punt van het figuur ('n.knee', 'chest', …) in zijaanzicht.
function sideZ(key) {
  if (SPINE.has(key)) return 0;
  const sign = key[0] === 'n' ? 1 : -1;
  return sign * (LEG.has(key.slice(2)) ? BONES.hipW : BONES.shoulderW);
}

// Per arm: de diepte van de hand, gemiddeld over de houdingen van het figuur
// (vast per figuur, zodat niets verspringt tussen twee houdingen).
export function handDepths(fig) {
  const out = {};
  for (const side of ['n', 'f']) {
    const own = side === 'n' ? BONES.shoulderW : -BONES.shoulderW;
    const zs = Object.values(fig.poses).map((pose) => {
      const t = pose.arms[side].hand;
      return typeof t === 'string' ? sideZ(t) : own;
    });
    out[side] = zs.reduce((a, b) => a + b, 0) / zs.length;
  }
  return out;
}

// Punten van joints() (zijaanzicht) in de ruimte.
export function liftSide(pts, hands) {
  const out = {};
  for (const [key, val] of Object.entries(pts)) {
    if (Array.isArray(val)) {
      out[key] = [val[0] - 80, 86 - val[1], 0];
      continue;
    }
    const sign = key === 'n' ? 1 : -1;
    const sh = sign * BONES.shoulderW;
    const hand = hands[key];
    const z = { shoulder: sh, elbow: (sh + hand) / 2, hand, foreMid: (sh + 3 * hand) / 4, fingers: hand };
    out[key] = Object.fromEntries(Object.entries(val).map(([j, p]) => [j, [p[0] - 80, 86 - p[1], z[j] ?? sign * BONES.hipW]]));
  }
  return out;
}

// Punten van joints() (vooraanzicht) in de ruimte: het figuur kijkt naar x+.
export function liftFront(pts) {
  const out = {};
  for (const [key, val] of Object.entries(pts)) {
    out[key] = Array.isArray(val) ? [0, 86 - val[1], 80 - val[0]] : liftFront(val);
  }
  return out;
}

// Rekwisieten in de ruimte. De zijden van een blok (bed, trede, kast) en de
// vloer krijgen een normaal: van de camera af gekeerd worden ze niet getekend
// (projectProp), zodat een blok bij het ronddraaien geen draadmodel wordt. Een
// muur is een vlak achter of naast het figuur en blijft van beide kanten
// zichtbaar.
export function liftProps(fig) {
  const [vx, , vw] = fig.viewBox;
  const front = fig.view === 'front';
  const out = [];
  for (const p of fig.props) {
    if (p.floor !== undefined) {
      out.push(front
        ? { ...floorRect(-18, 18, 80 - (vx + vw), 80 - vx, 86 - p.floor), normal: [0, 1, 0] }
        : { ...floorRect(vx - 76, vx + vw - 84, -14, 14, 86 - p.floor), normal: [0, 1, 0] });
    } else if (p.wall !== undefined) {
      const [top, bottom] = [86 - p.y1, 86 - p.y2];
      if (front) {
        const z = 80 - p.wall;
        out.push({ poly: [[-18, bottom, z], [18, bottom, z], [18, top, z], [-18, top, z]] });
      } else {
        const x = p.wall - 80;
        out.push({ poly: [[x, bottom, -18], [x, bottom, 18], [x, top, 18], [x, top, -18]] });
      }
    } else if (p.line) {
      const [x1, y1, x2, y2] = p.line;
      out.push({ seg: front ? [[0, 86 - y1, 80 - x1], [0, 86 - y2, 80 - x2]] : [[x1 - 80, 86 - y1, 0], [x2 - 80, 86 - y2, 0]] });
    } else if (p.rect) {
      const [x, y, w, h] = p.rect;
      if (front) {
        // In vooraanzicht een vlak achter het figuur (muur, deuropening).
        const [z0, z1, top, bottom] = [80 - x - w, 80 - x, 86 - y, 86 - y - h];
        out.push({ poly: [[-6, bottom, z0], [-6, bottom, z1], [-6, top, z1], [-6, top, z0]], solid: p.solid });
      } else {
        // Een blok (bed, trede, kussen): zes zijden, de zichtbare worden getekend.
        const d = p.solid ? 8 : 16;
        const [x0, x1, y0, y1] = [x - 80, x + w - 80, 86 - y - h, 86 - y];
        const face = (poly, normal) => ({ poly, normal, solid: p.solid });
        out.push(
          face([[x0, y1, -d], [x1, y1, -d], [x1, y1, d], [x0, y1, d]], [0, 1, 0]),
          face([[x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d]], [0, 0, 1]),
          face([[x0, y0, -d], [x1, y0, -d], [x1, y1, -d], [x0, y1, -d]], [0, 0, -1]),
          face([[x1, y0, -d], [x1, y0, d], [x1, y1, d], [x1, y1, -d]], [1, 0, 0]),
          face([[x0, y0, -d], [x0, y0, d], [x0, y1, d], [x0, y1, -d]], [-1, 0, 0]),
        );
      }
    } else if (p.poly) {
      // Een vlak in het beeld (bv. de koepel van een BOSU): in het midden van
      // de diepte, van beide kanten zichtbaar.
      out.push({ poly: p.poly.map(([x, y]) => (front ? [0, 86 - y, 80 - x] : [x - 80, 86 - y, 0])), solid: p.solid });
    } else if (p.circle) {
      // Een rol (handdoek) dwars onder het figuur: een strook.
      const [cx, cy, r] = p.circle;
      const [x, y] = [cx - 80, 86 - cy];
      out.push(front
        ? { poly: [[-12, y, 80 - cx - r], [12, y, 80 - cx - r], [12, y, 80 - cx + r], [-12, y, 80 - cx + r]], normal: [0, 1, 0], solid: p.solid }
        : { poly: [[x - r, y, -12], [x + r, y, -12], [x + r, y, 12], [x - r, y, 12]], normal: [0, 1, 0], solid: p.solid });
    }
  }
  return out;
}
