import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, hasFigure, pointsOf, points3dOf, kneeFlexion, poseAt, timeline, twoBone, dist, at, BONES } from '../js/figures.js';
import { twoBone3, project, joints3d, behind } from '../js/figures/rig3d.js';
import { lib, ex } from './helpers.js';

// Alle tijdlijnen van een figuur, elke 25 ms (een lus één keer rond, anders
// tot een halve seconde na de laatste houding).
function* frames(fig) {
  for (const [phase, tl] of Object.entries(fig.timelines)) {
    const end = tl.loop ?? tl.keys[tl.keys.length - 1][0] + 500;
    for (let t = 0; t <= end; t += 25) yield [phase, t, pointsOf(fig, poseAt(fig, phase, t)), poseAt(fig, phase, t)];
  }
}
const ALL = Object.entries(FIGURES);
// Bij een 3D-figuur rekenen de controles in de ruimte, niet in beeld.
const real = (fig, pose) => (fig.view === '3d' ? points3dOf(fig, pose) : pointsOf(fig, pose));

test('elk figuur hoort bij een bestaande oefening; houdingen en tijdlijnen kloppen', () => {
  for (const [id, fig] of ALL) {
    assert.ok(lib.exercises.has(id), id);
    assert.ok(['side', 'front', '3d', undefined].includes(fig.view), id);
    if (fig.view === '3d') assert.ok(Number.isFinite(fig.camera.yaw) && Number.isFinite(fig.camera.pitch), `${id}: camera`);
    for (const tl of Object.values(fig.timelines)) {
      for (const [, name] of tl.keys) assert.ok(fig.poses[name], `${id}: houding ${name} ontbreekt`);
      if (tl.still) assert.ok(fig.poses[tl.still], `${id}: houding ${tl.still} ontbreekt`);
      for (let i = 1; i < tl.keys.length; i++) assert.ok(tl.keys[i][0] > tl.keys[i - 1][0], `${id}: tijden niet oplopend`);
    }
    for (const name of fig.active) assert.match(name, /^([nf]\.(thigh|shin|foot|arm|fore|palm|trap)|spine\.(low|high)|neck|head|hips|shoulders)$/, `${id}: onbekend bot ${name}`);
  }
  assert.equal(hasFigure('toString'), false);
});

test('elke oefening uit de bibliotheek heeft een stokfiguur', () => {
  const missing = [...lib.exercises.keys()].filter((id) => !hasFigure(id));
  assert.deepEqual(missing, []);
  assert.equal(ALL.length, lib.exercises.size);
});

test('twoBone: beide botten houden hun lengte; te ver weg wordt gestrekt', () => {
  const { joint, end } = twoBone([0, 0], [10, 30], 20, 19, 'front');
  assert.ok(Math.abs(dist([0, 0], joint) - 20) < 1e-9);
  assert.ok(Math.abs(dist(joint, end) - 19) < 1e-9);
  assert.ok(dist(end, [10, 30]) < 1e-9);
  assert.ok(joint[0] > 5); // knie naar voren
  const far = twoBone([0, 0], [0, 100], 20, 19, 'front');
  assert.ok(Math.abs(far.end[1] - 39) < 1e-6 && Math.abs(far.joint[0]) < 1e-6);
});

test('3D: twoBone3 houdt de botlengtes en buigt naar de poolrichting; camera 0, 0 is het zijaanzicht', () => {
  const { joint, end } = twoBone3([0, 0, 0], [0, -30, 10], 20, 19, [1, 0, 0]);
  assert.ok(Math.abs(dist([0, 0, 0], joint) - 20) < 1e-9 && Math.abs(dist(joint, end) - 19) < 1e-9);
  assert.ok(dist(end, [0, -30, 10]) < 1e-9);
  assert.ok(joint[0] > 5); // knie naar voren (x), zoals gevraagd
  assert.deepEqual(project([10, 20, 0]), [90, 66]); // x naar rechts, y omhoog: in beeld omlaag gemeten
  assert.deepEqual(project([10, 20, 7]), [90, 66]); // diepte telt niet mee
  const [x, y] = project([0, 0, 10], { yaw: 90, pitch: 0 });
  assert.ok(Math.abs(x - 70) < 1e-9 && Math.abs(y - 86) < 1e-9); // gedraaid: de n-kant schuift naar links
  assert.ok(project([0, 0, 10], { yaw: 0, pitch: 30 })[1] > 86); // van boven: dichterbij is lager in beeld
});

test('3D: alleen het duidelijk verste been of de verste arm wordt gedimd, een rekkend lid niet', () => {
  const pts = joints3d({
    pelvis: [0, 41, 0], torso: [0, 1, 0],
    legs: { n: { thigh: [0, -1, 0] }, f: { thigh: [0, -1, 0] } },
    arms: { n: { upper: [0, -1, 0.1] }, f: { upper: [0, -1, -0.1] } },
  });
  assert.deepEqual(behind(pts, { yaw: 0, pitch: 0 }), { 'n.leg': false, 'f.leg': true, 'n.arm': false, 'f.arm': true });
  assert.equal(behind(pts, { yaw: 90, pitch: 0 })['f.leg'], false); // van voren: even ver
  assert.equal(behind(pts, { yaw: 0, pitch: 0 }, { 'f.leg': true })['f.leg'], false);
});

// Voorverkorte delen (spineScale, scale) zijn zoveel korter.
test('elk frame: botten op lengte, alles binnen het beeld', () => {
  const near = (a, b, len) => Math.abs(dist(a, b) - len) < 1e-6;
  for (const [id, fig] of ALL) {
    const [x, y, w, h] = fig.viewBox;
    for (const [phase, t, p, pose] of frames(fig)) {
      const where = `${id} ${phase} ${t}`;
      const r = real(fig, pose);
      const flat = fig.view !== '3d'; // voorverkorting bestaat alleen in 2D
      const k = flat ? pose.spineScale ?? 1 : 1;
      assert.ok(near(r.pelvis, r.mid, BONES.low * k) && near(r.mid, r.neck, BONES.high * k), `${where} rug`);
      for (const s of ['n', 'f']) {
        const q = r[s];
        const lk = flat ? pose.legs[s].scale ?? 1 : 1;
        const ak = flat ? pose.arms[s].scale ?? 1 : 1;
        const sk = lk * (flat ? pose.legs[s].shinScale ?? 1 : 1);
        assert.ok(near(q.hip, q.knee, BONES.thigh * lk) && near(q.knee, q.ankle, BONES.shin * sk) && near(q.ankle, q.toe, BONES.foot), `${where} been ${s}`);
        assert.ok(near(q.shoulder, q.elbow, BONES.arm * ak) && near(q.elbow, q.hand, BONES.fore * ak * (flat ? pose.arms[s].foreScale ?? 1 : 1)), `${where} arm ${s}`);
        if (q.fingers) assert.ok(near(q.hand, q.fingers, BONES.hand), `${where} hand ${s}`);
      }
      const pts = [p.pelvis, p.mid, p.neck, ...['n', 'f'].flatMap((s) => Object.values(p[s]))];
      for (const [px, py] of pts) assert.ok(px >= x && px <= x + w && py >= y && py <= y + h, `${where} buiten beeld: ${px.toFixed(1)},${py.toFixed(1)}`);
      const [hx, hy] = p.head;
      assert.ok(hx - BONES.head >= x && hx + BONES.head <= x + w && hy - BONES.head >= y && hy + BONES.head <= y + h, `${where} hoofd buiten beeld`);
    }
  }
});

// De tekening mag de knie nooit verder buigen dan de bibliotheek zegt: in de
// houdingen zelf exact, onderweg tussen twee houdingen hooguit 4° meer (een
// gestrekt been dat even meegeeft). Een voorverkort been (scale) heeft geen
// echte hoek in beeld en telt hier niet mee; kneeCheck beperkt de controle tot
// het rekkende been waar de bibliotheek alleen dat bedoelt.
test('kniebuiging nooit boven kneeFlexionMaxDeg uit de bibliotheek', () => {
  for (const [id, fig] of ALL) {
    const max = ex(id).kneeFlexionMaxDeg;
    const sides = fig.kneeCheck ?? ['n', 'f'];
    const measurable = (pose, s) => fig.view === '3d' || ((pose.legs[s].scale ?? 1) === 1 && (pose.legs[s].shinScale ?? 1) === 1);
    for (const [name, pose] of Object.entries(fig.poses)) {
      const p = real(fig, pose);
      for (const s of sides) if (measurable(pose, s)) assert.ok(kneeFlexion(p, s) <= max + 0.5, `${id} ${name} knie ${s}: ${kneeFlexion(p, s).toFixed(1)}° > ${max}°`);
    }
    for (const [phase, t, , pose] of frames(fig)) {
      const p = real(fig, pose);
      for (const s of sides) if (measurable(pose, s)) assert.ok(kneeFlexion(p, s) <= max + 4, `${id} ${phase} ${t} knie ${s}: ${kneeFlexion(p, s).toFixed(1)}° > ${max}°`);
    }
  }
});

test('voeten en handen staan waar de houding dat zegt (vloer, muur), op een halve eenheid na', () => {
  for (const [id, fig] of ALL) {
    for (const [name, pose] of Object.entries(fig.poses)) {
      const p = real(fig, pose);
      for (const s of ['n', 'f']) {
        if (pose.legs[s].ankle) assert.ok(dist(p[s].ankle, pose.legs[s].ankle) < 0.5, `${id} ${name}: enkel ${s} haalt haar plek niet (${dist(p[s].ankle, pose.legs[s].ankle).toFixed(2)})`);
        const target = typeof pose.arms[s].hand === 'string' ? at(p, pose.arms[s].hand) : pose.arms[s].hand;
        if (target) assert.ok(dist(p[s].hand, target) < 0.5, `${id} ${name}: hand ${s} haalt haar plek niet (${dist(p[s].hand, target).toFixed(2)})`);
      }
      if (pose.place?.at) assert.ok(dist(at(p, pose.place.joint), pose.place.at) < 1e-6, `${id} ${name}: place`);
    }
  }
});

// Een waarde die maar in één van twee houdingen staat (bijv. chest of scale),
// of een andere buigrichting, zou aan het begin of halverwege de overgang
// verspringen in plaats van mee te bewegen.
test('vloeiend: geen enkel punt verspringt (≤ 1 eenheid per ms)', () => {
  const points = (pts) => [pts.pelvis, pts.mid, pts.chest, pts.neck, pts.head, ...['n', 'f'].flatMap((k) => Object.values(pts[k]))];
  for (const [id, fig] of ALL) {
    for (const [phase, tl] of Object.entries(fig.timelines)) {
      const end = tl.loop ?? tl.keys[tl.keys.length - 1][0] + 500;
      const times = [...tl.keys.map(([t]) => t), ...Array.from({ length: Math.floor(end / 25) + 1 }, (_, i) => i * 25)];
      for (const t of times) {
        for (const [a, b] of [[t - 1, t], [t, t + 1]]) {
          if (a < 0) continue;
          const p = points(pointsOf(fig, poseAt(fig, phase, a)));
          const q = points(pointsOf(fig, poseAt(fig, phase, b)));
          const jump = Math.max(...p.map((x, i) => dist(x, q[i])));
          assert.ok(jump <= 1, `${id} ${phase} ${a}→${b} ms: ${jump.toFixed(2)}`);
        }
      }
    }
  }
});

test('minder beweging: per fase één vaste houding', () => {
  for (const fig of Object.values(FIGURES)) {
    for (const phase of Object.keys(fig.timelines)) {
      assert.deepEqual(poseAt(fig, phase, 0, { reduced: true }), poseAt(fig, phase, 1234, { reduced: true }));
    }
  }
});

test('elke segmentsoort van de speler heeft een tijdlijn', () => {
  for (const fig of Object.values(FIGURES)) {
    for (const kind of ['prep', 'switch', 'transition', 'work', 'contract', 'relax']) {
      assert.ok(timeline(fig, kind).keys.length > 0);
      assert.ok(poseAt(fig, kind, 1000).pelvis);
    }
  }
});

// Herhaalde oefeningen bewegen in het tempo van de dosis uit de bibliotheek.
// Wisselend (links en rechts om en om): één lus is twee herhalingen.
test('dynamisch en actief: één lus per herhaling (seconden ÷ herhalingen)', () => {
  for (const [id, fig] of ALL) {
    const x = ex(id);
    if (x.type !== 'dynamic' && x.type !== 'active') continue;
    const d = x.defaultDose;
    const sec = d.perSideSec ?? d.durationSec;
    assert.ok(d.reps, `${id}: geen herhalingen`);
    const per = x.sided === 'alternating' ? 2 : 1;
    assert.equal(timeline(fig, 'work').loop, Math.round((sec / d.reps) * 1000 * per), id);
  }
});

// ---------- Per oefening ----------

test('kuit tegen de muur: in de rekstand achterste been gestrekt, hiel plat, voorste knie licht gebogen', () => {
  const fig = FIGURES.gastroc_muur;
  const p = pointsOf(fig, fig.poses.stretch);
  assert.ok(kneeFlexion(p, 'n') < 0.5);
  assert.ok(kneeFlexion(p, 'f') > 5 && kneeFlexion(p, 'f') <= 20);
  assert.ok(Math.abs(p.n.ankle[1] - 84) < 1e-9);
  assert.equal(fig.poses.stretch.legs.n.foot, 90); // hiel plat
  assert.deepEqual(poseAt(fig, 'work', 60000), fig.poses.stretch);
  assert.deepEqual(poseAt(fig, 'prep', 3000), fig.poses.start);
});

test('enkel-rocks: lus van 2,5 s, voorste knie ~30–45°, hiel plat', () => {
  const fig = FIGURES.enkel_rock;
  let max = 0;
  for (let t = 0; t < 2500; t += 10) {
    const p = pointsOf(fig, poseAt(fig, 'work', t));
    max = Math.max(max, kneeFlexion(p, 'n'));
    assert.ok(dist(p.n.ankle, [106, 84]) < 1e-9);
  }
  assert.ok(max >= 30 && max <= 45, `knie ${max}`);
  assert.deepEqual(poseAt(fig, 'work', 700), poseAt(fig, 'work', 700 + 2500 * 4));
});

test('PNF: aanspannen toont inspanning, loslaten trekt het been verder; vanaf ronde 2 vanuit de diepere stand', () => {
  const fig = FIGURES.hamstring_pnf;
  const legAngle = (pose) => pose.legs.n.angle;
  assert.equal(poseAt(fig, 'contract', 3000).effort, 1);
  assert.equal(poseAt(fig, 'relax', 5000).effort, 0);
  assert.ok(legAngle(poseAt(fig, 'relax', 5000)) > legAngle(poseAt(fig, 'contract', 3000)));
  assert.deepEqual(poseAt(fig, 'contract', 0, { round: 2 }), poseAt(fig, 'relax', 25000, { round: 1 }));
  assert.deepEqual(poseAt(fig, 'contract', 0, { round: 3 }), poseAt(fig, 'relax', 25000, { round: 2 }));
  assert.equal(ex('hamstring_pnf').kneeFlexionMaxDeg, 0);
});

// ---------- 3D-modus ----------

test('3D-modus: elk figuur past in zijn beeldkader, ook rondgedraaid', async () => {
  const { as3d, turnViewBox } = await import('../js/figures.js');
  const inside = ([x, y, w, h], [px, py], r = 0) => px - r >= x - 1 && px + r <= x + w + 1 && py - r >= y - 1 && py + r <= y + h + 1;
  for (const [id, fig] of ALL) {
    const g = as3d(fig);
    assert.equal(g.view, '3d', id);
    const turn = turnViewBox(g);
    for (const [phase, tl] of Object.entries(fig.timelines)) {
      const end = tl.loop ?? tl.keys[tl.keys.length - 1][0] + 500;
      for (let t = 0; t <= end; t += Math.max(25, Math.ceil(end / 200))) {
        const pose = poseAt(g, phase, t);
        const p = pointsOf(g, pose);
        for (const q of [p.pelvis, p.mid, p.neck, ...['n', 'f'].flatMap((s) => Object.values(p[s]))]) assert.ok(inside(g.viewBox, q), `${id} ${phase} ${t}: buiten beeld`);
        assert.ok(inside(g.viewBox, p.head, BONES.head), `${id} ${phase} ${t}: hoofd buiten beeld`);
        for (const yaw of [g.camera.yaw + 90, g.camera.yaw + 180, g.camera.yaw + 270]) {
          const r = pointsOf({ ...g, camera: { ...g.camera, yaw } }, pose);
          assert.ok(inside(turn, r.head, BONES.head) && inside(turn, r.pelvis), `${id} ${phase} ${t} yaw ${yaw}: buiten het draaikader`);
        }
      }
    }
  }
});

test('3D-modus: een opgetild zijaanzicht is van opzij gezien precies de 2D-tekening; benen houden hun lengte', async () => {
  const { as3d } = await import('../js/figures.js');
  for (const [id, fig] of ALL) {
    if (fig.view === '3d' || fig.view === 'front') continue;
    const g = as3d(fig);
    for (const pose of Object.values(fig.poses)) {
      const flat = pointsOf(fig, pose);
      const side = pointsOf({ ...g, camera: { yaw: 0, pitch: 0 } }, pose);
      for (const k of ['pelvis', 'neck', 'head']) assert.ok(dist(flat[k], side[k]) < 1e-9, `${id}: ${k}`);
      for (const s of ['n', 'f']) for (const j of Object.keys(flat[s])) assert.ok(dist(flat[s][j], side[s][j]) < 1e-9, `${id}: ${s}.${j}`);
      const q = points3dOf(g, pose);
      for (const s of ['n', 'f']) {
        assert.ok(Math.abs(dist(q[s].hip, q[s].knee) - dist(flat[s].hip, flat[s].knee)) < 1e-9, `${id}: dij ${s}`);
        assert.ok(Math.abs(dist(q[s].knee, q[s].ankle) - dist(flat[s].knee, flat[s].ankle)) < 1e-9, `${id}: scheen ${s}`);
      }
    }
  }
});
