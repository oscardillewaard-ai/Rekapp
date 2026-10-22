import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderIcs } from '../js/ics.js';
import { at } from './helpers.js';

const ics = (extra = {}) => reminderIcs({ uid: 'rekapp-avond@rekapp', time: '20:30', title: 'Rekapp: avondroutine', description: 'Tijd om te rekken; 10 min.', url: 'https://example.org/rekapp/', now: at(0, 10), ...extra });

test('.ics: dagelijkse herhaling en een alarm op het tijdstip (§7)', () => {
  const t = ics();
  const lines = t.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.ok(lines.includes('RRULE:FREQ=DAILY'));
  assert.ok(lines.includes('BEGIN:VALARM') && lines.includes('TRIGGER:PT0M') && lines.includes('ACTION:DISPLAY'));
  assert.ok(lines.includes('DTSTART:20261102T203000'));
  assert.ok(lines.includes('DTEND:20261102T204500'));
  assert.ok(lines.includes('SUMMARY:Rekapp: avondroutine'));
  assert.ok(lines.includes('DESCRIPTION:Tijd om te rekken\; 10 min.'));
  assert.ok(t.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(t), 'alleen CRLF');
});

test('.ics: tijdstip al voorbij → de eerste herinnering is morgen', () => {
  assert.ok(ics({ now: at(0, 21) }).includes('DTSTART:20261103T203000'));
});

test('.ics: lange regels worden gevouwen op 75 octets', () => {
  const t = ics({ description: 'é'.repeat(100) });
  for (const line of t.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const unfolded = t.replace(/\r\n /g, '');
  assert.ok(unfolded.includes(`DESCRIPTION:${'é'.repeat(100)}`));
});
