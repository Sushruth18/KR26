/**
 * Unit checks for the Day 2 schedule, the Now/Next logic and the .ics generator (no browser).
 *   npm run test:schedule
 */
import assert from 'node:assert/strict';
import schedule from '../src/data/schedule.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };
import artist from '../src/data/artist.json' with { type: 'json' };
import events from '../src/data/events.json' with { type: 'json' };
import { buildIcs } from '../src/lib/ics';
import { day2Position, day2Stops, defaultDay, istInstant, parseDay, positionIn, stopState } from '../src/lib/schedule';
import type { CompetitionEvent, SiteConfig } from '../src/lib/schemas';

let n = 0;
const ok = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`PASS  ${name}`);
};
const at = (hhmm: string, date = site.day2Date) => istInstant(date, hhmm);

ok('Day 2 lists exactly the confirmed stops, in order, with the confirmed names and venues', () => {
  const want: [string, string, string][] = [
    ['09:00', 'Rally', 'Bill Board'],
    ['10:00', 'Inauguration & Procession', 'Main Stage'],
    ['12:05', 'Dance Competition (Students & Faculty)', 'Main Stage'],
    ['12:30', 'Music Competition (Students & Faculty)', 'Main Stage'],
    ['12:45', 'Rangasthala Performance', 'Main Stage'],
    ['13:00', 'Rushaang Performance', 'Main Stage'],
    ['13:30', 'Tandava Performance', 'Main Stage'],
    ['13:50', 'Fashion Show', 'Main Stage'],
    ['14:30', 'Music Concert & DJ', 'Main Stage'],
  ];
  assert.deepEqual(day2Stops.map((s) => [s.start, s.title.en, s.venue.en]), want);
  assert.equal(day2Stops.find((s) => s.start === '09:00')!.title.kn, 'ರ‍್ಯಾಲಿ');
  assert.equal(day2Stops.find((s) => s.start === '09:00')!.venue.kn, 'ಬಿಲ್‌ಬೋರ್ಡ್');
});

ok('stops carry start times only (no end, no duration, no break)', () => {
  for (const s of schedule) {
    assert.ok(!('end' in s) && !('duration' in s) && !('kind' in s), `${s.start} has end/duration/kind`);
    assert.ok(!/break/i.test(s.title.en) && !s.title.kn.includes('ವಿರಾಮ'));
  }
  assert.equal(schedule.length, 9);
});

ok('highlight = procession, headline = concert; Veeragase & Tamate kept', () => {
  assert.equal(day2Stops.filter((s) => s.highlight).map((s) => s.start).join(), '10:00');
  assert.equal(day2Stops.filter((s) => s.headline).map((s) => s.start).join(), '14:30');
  assert.equal(day2Stops.find((s) => s.highlight)!.description!.en, 'with Veeragase & Tamate troupes');
});

ok('Dance and Music competition slots are plain stops (no registration)', () => {
  for (const start of ['12:05', '12:30']) {
    const s = day2Stops.find((x) => x.start === start)! as Record<string, unknown>;
    assert.ok(!('eventId' in s) && !('registerUrl' in s));
  }
});

ok('Now / Next: before, during, on the boundary, last stop, after eventEnd', () => {
  const pos = (hhmm: string, date = site.day2Date) => day2Position(at(hhmm, date));
  assert.deepEqual(day2Position(at('08:59')), { current: -1, next: 0 });
  assert.deepEqual(pos('09:00'), { current: 0, next: 1 }); // a stop is current from its start …
  assert.deepEqual(pos('09:59'), { current: 0, next: 1 });
  assert.deepEqual(pos('10:00'), { current: 1, next: 2 }); // … until the next one starts
  assert.deepEqual(pos('12:50'), { current: 4, next: 5 });
  assert.deepEqual(pos('14:29'), { current: 7, next: 8 });
  assert.deepEqual(pos('14:30'), { current: 8, next: -1 }); // last stop: no next
  assert.deepEqual(pos('17:44'), { current: 8, next: -1 }); // runs until eventEnd 17:45
  assert.deepEqual(pos('17:45'), { current: -1, next: -1 });
  assert.deepEqual(day2Position(at('10:00', site.day1Date)), { current: -1, next: 0 }); // the day before: next is the first stop
});

ok('positionIn with an empty list, and stopState labels', () => {
  assert.deepEqual(positionIn([], 10, 5), { current: -1, next: -1 });
  assert.equal(stopState(0, 2, 3), 'past');
  assert.equal(stopState(2, 2, 3), 'current');
  assert.equal(stopState(3, 2, 3), 'next');
  assert.equal(stopState(4, 2, 3), 'upcoming');
  assert.equal(stopState(0, -1, 0), 'next');
  assert.equal(stopState(1, -1, 0), 'upcoming');
});

ok('default day: Day 1 on 20 Nov (IST), Day 2 otherwise; ?day= parsing', () => {
  assert.equal(defaultDay(istInstant(site.day1Date, '00:00')), 1);
  assert.equal(defaultDay(istInstant(site.day1Date, '23:59')), 1);
  assert.equal(defaultDay(istInstant(site.day2Date, '09:00')), 2);
  assert.equal(defaultDay(istInstant('2026-11-11', '12:00')), 2);
  assert.equal(parseDay('1'), 1);
  assert.equal(parseDay('2'), 2);
  assert.equal(parseDay('3'), null);
  assert.equal(parseDay(null), null);
});

ok('.ics: one entry per Day 2 stop with the same start and names; last stop ends at eventEnd', () => {
  const event = events[0]! as CompetitionEvent;
  const labels = { suffix: 'KR 2026', day2Description: 'Karnataka Rajyotsava 2026 — Day 2', description: 'Reg', location: 'BMSIT&M' };
  for (const lang of ['kn', 'en'] as const) {
    const ics = buildIcs({ regId: 'KR26-ESY-0001', event, site: site as unknown as SiteConfig, lang, stops: day2Stops, artistName: artist.name[lang], labels });
    const text = ics.replace(/\r\n /g, '');
    assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 1 + day2Stops.length);
    const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    day2Stops.forEach((s, i) => {
      const end = day2Stops[i + 1] ? at(day2Stops[i + 1]!.start) : Date.parse(site.eventEnd);
      assert.ok(text.includes(`DTSTART:${utc(at(s.start))}\r\nDTEND:${utc(end)}\r\n`), `${lang} ${s.start} times`);
      assert.ok(text.includes(`SUMMARY:${s.title[lang].replace(/,/g, '\\,')}\r\n`), `${lang} ${s.start} name`);
    });
    assert.ok(text.includes(`DESCRIPTION:${artist.name[lang].replace(/,/g, '\\,')}`), `${lang}: headline stop mentions the artist`);
    assert.ok(!/\bDAP\b|Motor Head|Movie Promotion|Break/.test(text));
    assert.ok(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'folded');
  }
});

console.log(`\n${n} groups passed.`);
