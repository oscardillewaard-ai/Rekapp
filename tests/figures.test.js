import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGURES, hasFigure, joints, kneeFlexion, poseAt, timeline, twoBone, dist, BONES } from '../js/figures.js';
import { lib, ex } from './helpers.js';

// Alle tijdlijnen van een figuur, elke 25 ms (een lus één keer rond, anders
// tot een halve seconde na de laatste houding).
function* frames(fig) {
  for (const [phase, tl] of Object.entries(fig.timelines)) {
    const end = tl.loop ?? tl.keys[tl.keys.length - 1][0] + 500;
    for (let t = 0; t <= end; t += 25) yield [phase, t, joints(poseAt(fig, phase, t))];
  }
}

test('proef: drie figuren, voor bestaande oefeningen (statisch, PNF en dynamisch)', () => {
  assert.deepEqual(Object.keys(FIGURES).sort(), ['enkel_rock', 'gastroc_muur', 'hamstring_pnf']);
  assert.deepEqual(Object.keys(FIGURES).map((id) => ex(id).type).sort(), ['dynamic', 'pnf', 'static']);
  assert.equal(hasFigure('gastroc_muur'), true);
  assert.equal(hasFigure('couch_stretch'), false);
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
  for (const [id, fig] of Object.entries(FIGURES)) {
    const [x, y, w, h] = fig.viewBox;
    for (const [phase, t, p] of frames(fig)) {
      for (const s of ['n', 'f']) {
        assert.ok(Math.abs(dist(p.pelvis, p[s].knee) - BONES.thigh) < 1e-6, `${id} ${phase} ${t} dij ${s}`);
        assert.ok(Math.abs(dist(p[s].knee, p[s].ankle) - BONES.shin) < 1e-6, `${id} ${phase} ${t} scheen ${s}`);
        assert.ok(Math.abs(dist(p.shoulder, p[s].elbow) - BONES.upper) < 1e-6, `${id} ${phase} ${t} bovenarm ${s}`);
        assert.ok(Math.abs(dist(p[s].elbow, p[s].hand) - BONES.fore) < 1e-6, `${id} ${phase} ${t} onderarm ${s}`);
      }
      const pts = [p.pelvis, p.neck, p.shoulder, ...['n', 'f'].flatMap((s) => Object.values(p[s]))];
      for (const [px, py] of pts) assert.ok(px >= x && px <= x + w && py >= y && py <= y + h, `${id} ${phase} ${t} buiten beeld: ${px},${py}`);
      assert.ok(p.head[1] - BONES.head >= y && p.head[0] - BONES.head >= x, `${id} ${phase} ${t} hoofd buiten beeld`);
    }
  }
});

// De tekening mag de knie nooit verder buigen dan de bibliotheek zegt.
test('kniebuiging nooit boven kneeFlexionMaxDeg uit de bibliotheek', () => {
  for (const [id, fig] of Object.entries(FIGURES)) {
    const max = ex(id).kneeFlexionMaxDeg;
    for (const [phase, t, p] of frames(fig)) {
      for (const s of ['n', 'f']) assert.ok(kneeFlexion(p, s) <= max + 0.5, `${id} ${phase} ${t} knie ${s}: ${kneeFlexion(p, s).toFixed(1)}° > ${max}°`);
    }
  }
});

test('voeten en handen staan vast waar de houding dat zegt (vloer, muur)', () => {
  for (const [id, fig] of Object.entries(FIGURES)) {
    for (const [name, pose] of Object.entries(fig.poses)) {
      const p = joints(pose);
      for (const s of ['n', 'f']) {
        if (pose.legs[s].ankle) assert.ok(dist(p[s].ankle, pose.legs[s].ankle) < 1e-6, `${id} ${name} enkel ${s} haalt de vloer niet`);
        if (pose.arms[s].hand) assert.ok(dist(p[s].hand, pose.arms[s].hand) < 1e-6, `${id} ${name} hand ${s} haalt haar plek niet`);
      }
    }
  }
});

test('kuit tegen de muur: in de rekstand achterste been gestrekt, hiel plat, voorste knie licht gebogen', () => {
  const fig = FIGURES.gastroc_muur;
  const p = joints(fig.poses.stretch);
  assert.ok(kneeFlexion(p, 'n') < 0.5);
  assert.ok(kneeFlexion(p, 'f') > 5 && kneeFlexion(p, 'f') <= 20);
  assert.ok(Math.abs(p.n.ankle[1] - 84) < 1e-9);
  assert.equal(fig.poses.stretch.legs.n.foot, 90); // hiel plat
  // Het werk eindigt in de rekstand en blijft daar.
  assert.deepEqual(poseAt(fig, 'work', 60000), fig.poses.stretch);
  assert.deepEqual(poseAt(fig, 'prep', 3000), fig.poses.start);
});

test('enkel-rocks: lus van 2,5 s, voorste knie ~30–45°, hiel plat', () => {
  const fig = FIGURES.enkel_rock;
  assert.equal(timeline(fig, 'work').loop, 2500);
  let max = 0;
  for (let t = 0; t < 2500; t += 10) {
    const p = joints(poseAt(fig, 'work', t));
    max = Math.max(max, kneeFlexion(p, 'n'));
    assert.ok(dist(p.n.ankle, [106, 84]) < 1e-9);
  }
  assert.ok(max >= 30 && max <= 45, `knie ${max}`);
  // Lus: zelfde houding een ronde later.
  assert.deepEqual(poseAt(fig, 'work', 700), poseAt(fig, 'work', 700 + 2500 * 4));
});

test('PNF: aanspannen toont inspanning, loslaten trekt het been verder; vanaf ronde 2 vanuit de diepere stand', () => {
  const fig = FIGURES.hamstring_pnf;
  const legAngle = (pose) => pose.legs.n.angle;
  assert.equal(poseAt(fig, 'contract', 3000).effort, 1);
  assert.equal(poseAt(fig, 'relax', 5000).effort, 0);
  assert.ok(legAngle(poseAt(fig, 'relax', 5000)) > legAngle(poseAt(fig, 'contract', 3000)));
  // Ronde 2 begint waar ronde 1 eindigde: geen sprong.
  assert.deepEqual(poseAt(fig, 'contract', 0, { round: 2 }), poseAt(fig, 'relax', 25000, { round: 1 }));
  assert.deepEqual(poseAt(fig, 'contract', 0, { round: 3 }), poseAt(fig, 'relax', 25000, { round: 2 }));
  // Beide knieën gestrekt (kneeFlexionMaxDeg 0).
  assert.equal(ex('hamstring_pnf').kneeFlexionMaxDeg, 0);
});

test('minder beweging: een vaste houding (de eindstand of "still")', () => {
  for (const fig of Object.values(FIGURES)) {
    for (const phase of Object.keys(fig.timelines)) {
      const a = poseAt(fig, phase, 0, { reduced: true });
      const b = poseAt(fig, phase, 1234, { reduced: true });
      assert.deepEqual(a, b);
    }
  }
  assert.deepEqual(poseAt(FIGURES.enkel_rock, 'work', 0, { reduced: true }), FIGURES.enkel_rock.poses.fwd);
});

test('elke segmentsoort van de speler heeft een tijdlijn', () => {
  for (const fig of Object.values(FIGURES)) {
    for (const kind of ['prep', 'switch', 'transition', 'work', 'contract', 'relax']) {
      assert.ok(timeline(fig, kind).keys.length > 0);
      assert.ok(poseAt(fig, kind, 1000).pelvis);
    }
  }
  assert.ok(lib.exercises.size > 3);
});
