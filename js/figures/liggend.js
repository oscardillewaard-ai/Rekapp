// Stokfiguren: liggende oefeningen. Zie rig.js voor het skelet en de hoeken.

export const LIGGEND = {};

// Hamstrings met band (contract-relax): ruglig, het gestrekte been (n) omhoog
// in de band, het andere been plat. Aanspannen: duwen in de band (het been
// beweegt nauwelijks); loslaten: het been iets verder trekken. Beide knieën
// gestrekt.
LIGGEND.hamstring_pnf = (() => {
  const pose = (angle, hand, effort = 0) => ({
    pelvis: [80, 78], torso: -90, head: -97, effort,
    legs: { n: { angle, foot: angle + 90 }, f: { angle: 90, foot: 180 } },
    arms: { n: { hand, bend: 'down' }, f: { hand: [hand[0] - 1, hand[1] + 1], bend: 'down' } },
  });
  return {
    viewBox: [34, 27, 92, 59],
    props: [{ floor: 82 }],
    bands: [['n.hand', 'n.sole']],
    effort: 'n',
    active: ['n.thigh'],
    poses: {
      start: pose(155, [69, 57]),
      push: pose(152, [69.5, 56.5], 1),
      deep: pose(165, [67, 58.5]),
      deepPush: pose(162, [68, 57.5], 1),
    },
    timelines: {
      prep: { keys: [[0, 'start']] },
      contract: { keys: [[0, 'start'], [500, 'push']] },
      relax: { keys: [[0, 'push'], [400, 'start'], [3000, 'deep']] },
      // Vanaf de tweede ronde begint het aanspannen in de diepere stand.
      contract2: { keys: [[0, 'deep'], [500, 'deepPush']] },
      relax2: { keys: [[0, 'deepPush'], [400, 'deep']] },
      demo: { loop: 11000, keys: [[0, 'start'], [600, 'push'], [4200, 'push'], [4600, 'start'], [7000, 'deep'], [9500, 'deep'], [10800, 'start']], still: 'deep' },
    },
  };
})();
