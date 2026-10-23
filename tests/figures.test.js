import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, hasFigure, pointsOf, kneeFlexion, poseAt, timeline, twoBone, dist, at, BONES } from '../js/figures.js';
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

test('elk figuur hoort bij een bestaande oefening; houdingen en tijdlijnen kloppen', () => {
  for (const [id, fig] of ALL) {
    assert.ok(lib.exercises.has(id), id);
    assert.ok(['side', 'front', undefined].includes(fig.view), id);
    for (const tl of Object.values(fig.timelines)) {
      for (const [, name] of tl.keys) assert.ok(fig.poses[name], `${id}: houding ${name} ontbreekt`);
      if (tl.still) assert.ok(fig.poses[tl.still], `${id}: houding ${tl.still} ontbreekt`);
      for (let i = 1; i < tl.keys.length; i++) assert.ok(tl.keys[i][0] > tl.keys[i - 1][0], `${id}: tijden niet oplopend`);
    }
    for (const name of fig.active) assert.match(name, /^([nf]\.(thigh|shin|foot|arm|fore|palm)|spine\.(low|high)|neck|head|hips|shoulders)$/, `${id}: onbekend bot ${name}`);
  }
  assert.equal(hasFigure('toString'), false);
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

test('elk frame: botten op lengte, alles binnen het beeld', () => {
  const near = (a, b, len) => Math.abs(dist(a, b) - len) < 1e-6;
  for (const [id, fig] of ALL) {
    const [x, y, w, h] = fig.viewBox;
    for (const [phase, t, p] of frames(fig)) {
      const where = `${id} ${phase} ${t}`;
      assert.ok(near(p.pelvis, p.mid, BONES.low) && near(p.mid, p.neck, BONES.high), `${where} rug`);
      for (const s of ['n', 'f']) {
        const q = p[s];
        assert.ok(near(q.hip, q.knee, BONES.thigh) && near(q.knee, q.ankle, BONES.shin) && near(q.ankle, q.toe, BONES.foot), `${where} been ${s}`);
        assert.ok(near(q.shoulder, q.elbow, BONES.arm) && near(q.elbow, q.hand, BONES.fore), `${where} arm ${s}`);
        if (q.fingers) assert.ok(near(q.hand, q.fingers, BONES.hand), `${where} hand ${s}`);
      }
      const pts = [p.pelvis, p.mid, p.neck, ...['n', 'f'].flatMap((s) => Object.values(p[s]))];
      for (const [px, py] of pts) assert.ok(px >= x && px <= x + w && py >= y && py <= y + h, `${where} buiten beeld: ${px.toFixed(1)},${py.toFixed(1)}`);
      const [hx, hy] = p.head;
      assert.ok(hx - BONES.head >= x && hx + BONES.head <= x + w && hy - BONES.head >= y && hy + BONES.head <= y + h, `${where} hoofd buiten beeld`);
    }
  }
});

// De tekening mag de knie nooit verder buigen dan de bibliotheek zegt.
test('kniebuiging nooit boven kneeFlexionMaxDeg uit de bibliotheek', () => {
  for (const [id, fig] of ALL) {
    const max = ex(id).kneeFlexionMaxDeg;
    for (const [phase, t, p] of frames(fig)) {
      for (const s of ['n', 'f']) assert.ok(kneeFlexion(p, s) <= max + 0.5, `${id} ${phase} ${t} knie ${s}: ${kneeFlexion(p, s).toFixed(1)}° > ${max}°`);
    }
  }
});

test('voeten en handen staan waar de houding dat zegt (vloer, muur), op een halve eenheid na', () => {
  for (const [id, fig] of ALL) {
    for (const [name, pose] of Object.entries(fig.poses)) {
      const p = pointsOf(fig, pose);
      for (const s of ['n', 'f']) {
        if (pose.legs[s].ankle) assert.ok(dist(p[s].ankle, pose.legs[s].ankle) < 0.5, `${id} ${name}: enkel ${s} haalt haar plek niet (${dist(p[s].ankle, pose.legs[s].ankle).toFixed(2)})`);
        const target = typeof pose.arms[s].hand === 'string' ? at(p, pose.arms[s].hand) : pose.arms[s].hand;
        if (target) assert.ok(dist(p[s].hand, target) < 0.5, `${id} ${name}: hand ${s} haalt haar plek niet (${dist(p[s].hand, target).toFixed(2)})`);
      }
      if (pose.place?.at) assert.ok(dist(at(p, pose.place.joint), pose.place.at) < 1e-6, `${id} ${name}: place`);
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
