// Agenda-herinnering (§7: geen push; "Herinnering in agenda" maakt een .ics
// met dagelijkse herhaling en VALARM). Puur.

const pad = (n) => String(n).padStart(2, '0');

// Lokale tijd zonder tijdzone ("floating"): de agenda toont hem elke dag op
// dezelfde klokuren, ook na de wissel naar zomer- of wintertijd.
function local(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
function utc(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// Tekst volgens RFC 5545: \ ; , en regeleinden escapen.
const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Regels langer dan 75 octets vouwen (vervolgregel begint met een spatie).
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

// time: 'HH:MM'; now: ms (de eerste herinnering is vandaag als dat tijdstip
// nog moet komen, anders morgen). durationMin: lengte van het blok.
export function reminderIcs({ uid, time, title, description, url, now, durationMin = 15 }) {
  const [hh, mm] = time.split(':').map(Number);
  const n = new Date(now);
  let start = new Date(n.getFullYear(), n.getMonth(), n.getDate(), hh, mm);
  if (start.getTime() <= now) start = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, hh, mm);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hh, mm + durationMin);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rekapp//Herinnering//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utc(n)}`,
    `DTSTART:${local(start)}`,
    `DTEND:${local(end)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${esc(title)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    url ? `URL:${url}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
