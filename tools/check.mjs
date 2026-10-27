#!/usr/bin/env node
/* Check FocusDeck in headless Chrome: the script hash, the built-in self-check in every
   appearance, that two open tabs never overwrite each other's changes, and the parts the
   self-check can't cover because they change data: ending sessions and the chime, undo and redo,
   logging missed sessions, the question sheets, reordering, importing old data, Insights and the
   backup reminder.

       cd tools && npm install   # once: installs puppeteer-core (no browser download)
       node tools/check.mjs      # from the repo root; exits with 1 if anything fails

   Every page gets a fresh, empty browser profile, so this never sees or touches your own data.
   Uses your installed Google Chrome. Elsewhere, set CHROME_PATH to its executable.
   FOCUSDECK_FILE=path/to/other.html checks another copy of the app instead.
*/
import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = process.env.FOCUSDECK_FILE || ROOT + 'FocusDeck.html';   // set it to check another copy, e.g. an older release
const APP = pathToFileURL(FILE).href;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(CHROME)) { console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`); process.exit(1); }

let failed = 0;
const report = (ok, name, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

/* ---------- Script hash ---------- */
try {
  execFileSync('python3', [ROOT + 'tools/csp_hash.py', '--check', FILE], { stdio: 'pipe' });
  report(true, 'CSP script hash is current');
} catch (e) {
  report(false, 'CSP script hash is current', String(e.stdout || e.message).trim() + ' Run tools/csp_hash.py.');
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 20000 });

/** Open FocusDeck in a tab. `seed` ({ storageKey: value }) replaces the context's storage before the first load only,
    so a reload sees what the app saved. Native alert/confirm dialogs are counted in page.nativeDialogs and dismissed. */
async function open(ctx, { hash = '', seed = null } = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.nativeDialogs = 0;
  page.on('dialog', d => { page.nativeDialogs++; d.dismiss(); });
  const seeding = seed && await page.evaluateOnNewDocument(items => {
    localStorage.clear();
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  }, seed);
  await page.goto(APP + hash, { waitUntil: 'load' });
  // Removed rather than guarded by a sessionStorage flag: on CI's Linux Chrome a quick reload sometimes
  // didn't see the flag, so it seeded again and wiped what the app had saved.
  if (seeding) await page.removeScriptToEvaluateOnNewDocument(seeding.identifier);
  const ready = await page.evaluate(() => document.documentElement.classList.contains('ready'));
  if (!ready || errors.length) throw new Error(`FocusDeck didn't start. ${errors.join('; ') || 'Is the CSP hash current?'}`);
  return page;
}

/* ---------- Self-check, in each appearance (two of the tests read the colors on screen) ---------- */
const appearances = [
  ['light', []],
  ['dark', [{ name: 'prefers-color-scheme', value: 'dark' }]],
  ['light, Increase Contrast', [{ name: 'prefers-contrast', value: 'more' }]],
  ['dark, Increase Contrast', [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-contrast', value: 'more' }]],
  ['light, Reduce Transparency', [{ name: 'prefers-reduced-transparency', value: 'reduce' }]],
];

async function selfCheck(label, features) {
  const ctx = await browser.createBrowserContext();
  try {
    const page = await ctx.newPage();
    // Through the DevTools protocol: Puppeteer's own emulateMediaFeatures() rejects prefers-contrast.
    await (await page.createCDPSession()).send('Emulation.setEmulatedMedia', { features });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(APP + '#selftest', { waitUntil: 'load' });
    if (errors.length) throw new Error(errors.join('; '));
    const res = await page.evaluate(() => runTests());
    const bad = res.filter(r => !r.ok);
    report(!bad.length, `Self-check (${label}): ${res.length - bad.length} of ${res.length} pass`, bad.map(r => `${r.name}: ${r.err}`).join(' | '));
  } finally { await ctx.close(); }
}

/* ---------- Two tabs ---------- */
const taskTitles = page => page.evaluate(() => JSON.parse(localStorage.getItem('focusdeck5')).tasks.map(t => t.title).sort());
const addTask = async (page, title) => { await page.bringToFront(); await page.click('#quickToday'); await page.keyboard.type(title); await page.keyboard.press('Enter'); };
// Scrolled to the top first: typing in the task box scrolls the page, which would leave the timer under the sticky header.
const tap = async (page, sel) => { await page.bringToFront(); await page.evaluate(() => window.scrollTo(0, 0)); const el = await page.$(sel); if (el) await el.click(); return !!el; };
const settle = () => new Promise(res => setTimeout(res, 300));   // storage events reach other tabs asynchronously

async function twoTabs() {
  const ctx = await browser.createBrowserContext();   // both tabs share this context's storage
  try {
    const a = await open(ctx), b = await open(ctx);

    // A task added in each tab: the second save must not drop the first.
    await addTask(b, 'Added in tab B'); await settle();
    await addTask(a, 'Added in tab A'); await settle();
    const saved = await taskTitles(a);
    report(saved.length === 2, 'Two tabs: a task added in each tab keeps both', `saved: ${JSON.stringify(saved)}`);

    // The other tab shows the change without a reload.
    const shown = await b.$$eval('#listToday .ttitle', els => els.map(e => e.textContent).sort());
    report(shown.length === 2, 'Two tabs: the other tab shows the new task straight away', `tab B shows: ${JSON.stringify(shown)}`);

    // A timer started in one tab runs in the other, and pausing there sticks.
    await tap(b, '[data-act="start"]'); await settle();
    const aStatus = await a.$eval('#timer', el => el.dataset.status);
    await tap(a, '[data-act="pause"]'); await settle();   // no Pause button if tab A never saw the timer start
    const bStatus = await b.$eval('#timer', el => el.dataset.status);
    report(aStatus === 'running' && bStatus === 'paused', 'Two tabs: starting and pausing the timer carries over', `tab A saw ${aStatus}, then tab B saw ${bStatus}`);

    // Leaving a tab (it saves on the way out) doesn't bring back an older copy.
    await a.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await addTask(b, 'Added after A saved'); await settle();
    await a.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await settle();
    const after = await taskTitles(b);
    report(after.length === 3, 'Two tabs: a tab saving on its way out keeps the other tab\'s changes', `saved: ${JSON.stringify(after)}`);

    // v5.6: a session that ends with both tabs open is logged once, and both tabs keep the same data.
    await a.evaluate(() => { S.settings.sound = 'off'; S.timer = idleTimer('short', S.settings); S.timer.plannedSec = 2; startTimer(); });
    await new Promise(res => setTimeout(res, 2600)); await settle();
    const [inA, inB, stored] = await Promise.all([a.evaluate(() => JSON.stringify(S)), b.evaluate(() => JSON.stringify(S)), a.evaluate(() => localStorage.getItem('focusdeck5'))]);
    const ids = json => JSON.parse(json).sessions.map(s => s.id).join();
    report(inA === inB && inA === stored && JSON.parse(stored).sessions.length === 1, 'Two tabs: a session that ends with both open is logged once, and the tabs agree',
      `tab A: ${ids(inA)}; tab B: ${ids(inB)}; saved: ${ids(stored)}`);
  } finally { await ctx.close(); }
}

/* ---------- Data-changing flows, each in its own fresh browser context ---------- */
const MIN = 60e3, DAY = 864e5;
const idle = { kind: 'focus', status: 'idle', plannedSec: 1500, elapsedBefore: 0, segStart: null, sessionStart: null, distractions: [] };
const runningFor = min => ({ ...idle, status: 'running', segStart: Date.now() - min * MIN, sessionStart: Date.now() - min * MIN });
const task = (id, title, extra = {}) => ({ id, title, tag: '', estimate: null, status: 'open', today: true, order: 0, createdAt: Date.now(), doneAt: null, ...extra });
const done = (start, taskId = null) => ({ id: 's' + start, kind: 'focus', taskId, taskTitle: '', start, end: start + 25 * MIN, plannedSec: 1500, actualSec: 1500,
  outcome: 'completed', rating: null, distractions: [], note: '' });
const data = patch => ({ focusdeck5: JSON.stringify({ version: 5, settings: { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyTarget: 8, dayStartHour: 4,
  sound: 'off', autoBreak: false, autoFocus: false, notify: false }, tasks: [], sessions: [], timer: idle, currentTaskId: null, pendingRating: null, ...patch }) });
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('focusdeck5')));
const toastText = page => page.$eval('#toast', el => el.classList.contains('show') ? el.textContent : '');
const order = async page => (await state(page)).tasks.filter(t => t.status === 'open').sort((a, b) => (b.today - a.today) || (a.order - b.order)).map(t => (t.today ? '' : 'later:') + t.id).join(' ');
const keyCombo = async (page, mod, key) => { await page.keyboard.down(mod); await page.keyboard.press(key); await page.keyboard.up(mod); };

async function scenario(name, fn) {
  const ctx = await browser.createBrowserContext();
  try { await fn(ctx); } catch (e) { report(false, name, e.message); } finally { await ctx.close(); }
}

async function endingSessions() {
  await scenario('Ending sessions', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: [task('a', 'Essay')], currentTaskId: 'a', timer: runningFor(10) }) });
    const segStart = (await state(p)).timer.segStart;
    await tap(p, '[data-act="finishEarly"]');
    let st = await state(p), s = st.sessions[0];
    report(st.sessions.length === 1 && s.outcome === 'early' && Math.abs(s.actualSec - 600) <= 5 && s.taskId === 'a' && st.timer.kind === 'short' && st.pendingRating === s.id,
      'Finish Early logs partial credit, offers a rating and suggests a short break', JSON.stringify({ n: st.sessions.length, outcome: s && s.outcome, actualSec: s && s.actualSec, next: st.timer.kind }));

    await tap(p, '[data-act="toastAction"]');   // Undo
    st = await state(p);
    report(st.sessions.length === 0 && st.timer.status === 'running' && st.timer.segStart === segStart,
      'Undo brings the running session back exactly as it was', JSON.stringify({ n: st.sessions.length, status: st.timer.status }));

    await tap(p, '[data-act="toastAction"]');   // Redo
    st = await state(p);
    report(st.sessions.length === 1 && st.timer.status === 'idle', 'Redo ends it again', JSON.stringify({ n: st.sessions.length, status: st.timer.status }));

    await addTask(p, 'Something new');
    await p.evaluate(() => undo());
    st = await state(p);
    report(st.sessions.length === 1 && /Can’t undo/.test(await toastText(p)), 'Undo is refused once something else has changed', `${st.sessions.length} sessions; toast: ${await toastText(p)}`);
  });

  await scenario('Discarding a session', async ctx => {
    const p = await open(ctx, { seed: data({ timer: runningFor(10) }) });
    await tap(p, '[data-act="discard"]');
    const st = await state(p), s = st.sessions[0];
    report(st.sessions.length === 1 && s.outcome === 'abandoned' && st.timer.kind === 'focus' && st.pendingRating === null,
      'Discard logs no credit, asks for no rating and stays on focus', JSON.stringify({ outcome: s && s.outcome, next: st.timer.kind, pendingRating: st.pendingRating }));
    const q = await open(await browser.createBrowserContext(), { seed: data({ timer: runningFor(0.5) }) });
    await tap(q, '[data-act="finishEarly"]');
    report((await state(q)).sessions.length === 0, 'A session ended in its first minute isn’t logged');
    await q.browserContext().close();
  });

  await scenario('A session that ended while FocusDeck was closed', async ctx => {
    const seed = data({ timer: runningFor(30) }), segStart = JSON.parse(seed.focusdeck5).timer.segStart;
    const p = await open(ctx, { seed });
    const st = await state(p), s = st.sessions[0];
    report(st.sessions.length === 1 && s.outcome === 'completed' && s.end === segStart + 1500e3 && st.timer.status === 'idle' && st.timer.kind === 'short'
      && /finished while FocusDeck was closed/.test(await toastText(p)), 'It’s logged on start-up, ending when it really ended', JSON.stringify({ n: st.sessions.length, end: s && s.end - segStart, timer: st.timer.kind }));
  });

  // v5.6: the alarm is scheduled when a session starts. When the session ends, that chime should ring out once:
  // not be cut off, and not be played a second time. A stand-in audio context counts chimes and early stops,
  // so this needs no sound device.
  await scenario('The end-of-session chime', async ctx => {
    const p = await open(ctx);
    const run = autoFocus => p.evaluate(async autoFocus => {
      const counts = { rings: 0, cut: 0 }, param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
      Sound.ctx = { state: 'running', currentTime: 0, destination: {}, resume: () => Promise.resolve(),
        createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start() {}, stop(when) { if (when === 0) counts.cut++; } }),
        createGain: () => ({ gain: param, connect() {}, disconnect() {} }) };
      const pattern = Sound.pattern;
      Sound.pattern = function (at) { counts.rings++; return pattern.call(this, at); };
      S.settings.sound = 'chime'; S.settings.autoFocus = autoFocus;
      S.timer = idleTimer('short', S.settings); S.timer.plannedSec = 1;
      startTimer();
      await new Promise(res => setTimeout(res, 1500));
      Sound.pattern = pattern;
      return { ...counts, next: S.timer.kind, status: S.timer.status };
    }, autoFocus);
    let r = await run(false);
    report(r.rings === 1 && r.cut === 0 && r.status === 'idle', 'The chime scheduled at the start rings once when the session ends', JSON.stringify(r));
    await p.evaluate(() => { disarm(); S.timer = idleTimer('focus', S.settings); });
    r = await run(true);   // one chime for the break that ended, one scheduled for the focus session that started by itself
    report(r.rings === 2 && r.cut === 0 && r.next === 'focus' && r.status === 'running', 'Starting the next session by itself doesn’t cut the chime off', JSON.stringify(r));
  });
}

async function missedSessions() {
  // v5.6: only the first session's start was checked, so later ones could land in the future.
  await scenario('Log a missed session', async ctx => {
    const p = await open(ctx);
    const log = count => p.evaluate(count => {
      showView('history'); openLog();
      const f = $('#logForm'), st = new Date(Date.now() - 40 * 60e3);
      f.elements.date.value = ymd(st); f.elements.time.value = pad(st.getHours()) + ':' + pad(st.getMinutes());
      f.elements.count.value = count;
      f.requestSubmit();
      return S.sessions.filter(s => s.end > Date.now()).length;
    }, count);
    const future = await log(3), refused = (await state(p)).sessions.length, toast = await toastText(p);
    report(future === 0 && refused === 0 && /future/.test(toast), 'Sessions that would end in the future are refused', `${refused} logged; toast: ${toast}`);
    await log(1);
    report((await state(p)).sessions.length === 1, 'One session that has already ended is logged');
  });
}

async function questionSheets() {
  await scenario('Question sheets', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: [task('a', 'One'), task('b', 'Two', { order: 1 })] }) });
    await tap(p, '[data-view="settings"]');
    await tap(p, '[data-act="eraseAll"]');
    const opened = await p.evaluate(() => [$('#askDialog').open, document.activeElement.textContent]);
    report(opened[0] && opened[1] === 'Cancel', 'Erase asks in a sheet, with the focus on Cancel', JSON.stringify(opened));
    await p.keyboard.press('Escape');
    report((await state(p)).tasks.length === 2 && !(await p.$eval('#askDialog', d => d.open)), 'Esc cancels and erases nothing');

    await tap(p, '[data-act="eraseAll"]'); await tap(p, '#askOk'); await settle();   // the sheet answers on its close event
    const erased = (await state(p)).tasks.length;
    await tap(p, '[data-act="toastAction"]');   // Undo
    report(erased === 0 && (await state(p)).tasks.length === 2, 'Erase Everything erases, and Undo brings it all back', `after erase: ${erased} tasks`);

    await p.evaluate(() => { importData({ version: 5, tasks: [], sessions: [] }); });
    const title = await p.$eval('#askTitle', el => el.textContent);
    await tap(p, '#askDialog [data-act="closeDialog"]'); await settle();
    report(title === 'Restore This Backup?' && (await state(p)).tasks.length === 2, 'Restoring a backup asks first, and Cancel keeps your data', `sheet: ${title}`);
    report(p.nativeDialogs === 0, 'No browser confirm() dialogs', `${p.nativeDialogs} shown`);
  });
}

async function reordering() {
  await scenario('Reordering tasks', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: [task('a', 'A'), task('b', 'B', { order: 1 }), task('c', 'C', { order: 2 })] }) });
    await p.bringToFront();
    await p.evaluate(() => $('li[data-id="a"] .tbody').focus());
    await keyCombo(p, 'Alt', 'ArrowDown');
    const focusOn = await p.evaluate(() => document.activeElement.closest('li') && document.activeElement.closest('li').dataset.id);
    report(await order(p) === 'b a c' && focusOn === 'a', 'Alt+↓ moves the focused task down and keeps the focus on it', `${await order(p)}; focus on ${focusOn}`);
    await keyCombo(p, 'Alt', 'ArrowUp'); await keyCombo(p, 'Alt', 'ArrowUp');
    report(await order(p) === 'a b c', 'Alt+↑ moves it back up and stops at the top', await order(p));

    await tap(p, 'li[data-id="c"] .tbody');
    await p.select('#taskForm select[name="pos"]', '0');
    await tap(p, '#taskForm .nb.end');   // Save
    report(await order(p) === 'c a b', 'The edit sheet’s Position menu moves a task', await order(p));

    await tap(p, 'li[data-id="a"] .tbody');
    await p.select('#taskForm select[name="plan"]', 'later');
    const places = await p.$$eval('#taskForm select[name="pos"] option', os => os.map(o => o.textContent));
    await tap(p, '#taskForm .nb.end');
    report(await order(p) === 'c b later:a' && places.join() === '1 of 1', 'Changing Plan offers places in the other list', `${await order(p)}; offered ${places.join(', ')}`);
  });
}

async function doneToday() {
  await scenario('Done today', async ctx => {
    const now = Date.now();
    const earlier = [...Array(32)].map((_, i) => task('e' + i, 'Earlier ' + i, { status: 'done', doneAt: now - (i + 1) * DAY }));
    const p = await open(ctx, { seed: data({ tasks: [task('t', 'Today', { status: 'done', doneAt: now }), ...earlier, task('o', 'Open')] }) });
    await p.$eval('#doneBox', d => { d.open = true; });
    const look = () => p.evaluate(() => [$$('#listDone li[data-id]').length, $('#doneCount').textContent, $('#doneEarlier').textContent]);
    let v = await look();
    report(v.join('|') === '1|(1)|Show 32 earlier', 'The Done box shows only tasks finished today', v.join(' · '));
    await tap(p, '#doneEarlier'); v = await look();
    report(v[0] === 31 && v[2] === 'Show 2 more', 'Show earlier adds older tasks a page at a time', v.join(' · '));
    await tap(p, '#doneEarlier'); v = await look();
    report(v[0] === 33 && v[2] === 'Hide earlier', 'The last page shows every finished task', v.join(' · '));
    await tap(p, '#doneEarlier'); v = await look();
    report(v[0] === 1, 'Hide earlier goes back to today’s', v.join(' · '));

    await p.evaluate(() => $('#listDone li[data-id="t"] .check').click());   // reopen it
    const after = await p.evaluate(() => [$('#doneBox').hidden, $('#listDone').textContent.trim(), !!$('#listToday li[data-id="t"]')]);
    report(after.join('|') === 'false|Nothing finished yet today.|true', 'With nothing done today, earlier tasks are still one click away', after.join(' · '));
  });
}

// v5.8: a task past its estimate counted as 0 sessions left, so the plan looked finished while it was still open.
async function capacity() {
  await scenario('Capacity line', async ctx => {
    const now = Date.now();
    const p = await open(ctx, { seed: data({ tasks: [task('o', 'Overrun', { estimate: 2 })], sessions: [3, 2, 1].map(h => done(now - h * 60 * MIN, 'o')) }) });
    const txt = await p.$eval('#capText', el => el.textContent);
    report(/^1 session left · .* · done around/.test(txt), 'A task past its estimate still counts one session left', txt);
  });
}

// v5.9: with three or more finished tasks, the capacity line also gives the finish time at your usual estimate ratio.
async function usualPace() {
  await scenario('Capacity at your usual pace', async ctx => {
    const now = Date.now(), s = [];
    ['a', 'b', 'c'].forEach((id, i) => { for (let j = 0; j < 3; j++) s.push(done(now - (10 + i * 3 + j) * 60 * MIN, id)); });
    const finished = ['a', 'b', 'c'].map(id => task(id, 'Done ' + id, { status: 'done', estimate: 2, doneAt: now - DAY }));
    const p = await open(ctx, { seed: data({ tasks: [...finished, task('n', 'Next', { estimate: 4 })], sessions: s }) });
    const [txt, title] = await p.$eval('#capText', el => [el.textContent, el.title]);
    report(/^4 sessions left · .* · done around .+ \(.+ at your usual 1\.5×\)$/.test(txt) && /1\.5×/.test(title), 'The capacity line adds the finish time at your usual estimate ratio', txt);
  });
}

// v5.9: tasks left on Today from earlier days get a once-a-day question.
async function carryOver() {
  const tasks = () => [task('old', 'Old one', { plannedAt: Date.now() - 2 * DAY }), task('new', 'New one', { order: 1, plannedAt: Date.now() })];
  const look = p => p.evaluate(() => [$('#carry').hidden, $('#carryText').textContent, !!$('#listToday li[data-id="old"]'), !!$('#listLater li[data-id="old"]'),
    $('#listToday li[data-id="old"] .tmeta')?.textContent.includes('from ') ?? null, $('#listToday li[data-id="new"] .tmeta')?.textContent.includes('from ') ?? null]);
  await scenario('Tasks left from earlier days', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: tasks() }) });
    let v = await look(p);
    report(v.join('|') === 'false|1 task left from earlier days.|true|false|true|false', 'Tasks left from earlier days get a banner and show their age', v.join(' · '));
    await tap(p, '[data-act="carryLater"]'); v = await look(p);
    report(v[0] && !v[2] && v[3] && /Moved 1 task to Later/.test(await toastText(p)), 'Move to Later moves them and says so, with Undo', v.join(' · '));
    await p.reload({ waitUntil: 'load' }); v = await look(p);
    report(v[0] && v[3], 'The banner stays gone for the rest of the day', v.join(' · '));
  });
  await scenario('Keeping tasks from earlier days', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: tasks() }) });
    await tap(p, '[data-act="carryKeep"]');
    await p.reload({ waitUntil: 'load' });
    const v = await look(p);
    report(v[0] && v[2], 'Keep in Today keeps them and hides the banner for the day', v.join(' · '));
  });
}

// v5.9: the daily backup to a folder, with a stand-in folder (the real one needs a person to pick it).
async function dailyBackup() {
  await scenario('Daily backup to a folder', async ctx => {
    const p = await open(ctx, { seed: data({ tasks: [task('a', 'Essay')], currentTaskId: 'a', sessions: [0, 1, 2].map(i => done(Date.now() - (i + 2) * 60 * MIN, 'a')) }) });
    const stored = await p.evaluate(async () => { await AutoBackup.store('readwrite', kv => kv.put({ name: 'probe' }, 'probe')); return (await AutoBackup.store('readonly', kv => kv.get('probe'))).name; });
    report(stored === 'probe', 'The folder can be remembered in IndexedDB on a file:// page', String(stored));

    const setUp = permission => p.evaluate(permission => {
      window.__files = window.__files || Object.fromEntries([...Array(9)].map((_, i) => [`focusdeck-auto-2026-01-${String(10 + i).padStart(2, '0')}.json`, '{}']).concat([['notes.txt', 'mine']]));
      let perm = permission;
      AutoBackup.dir = { name: 'Backups', queryPermission: async () => perm, requestPermission: async () => (perm = 'granted'),
        getFileHandle: async n => ({ createWritable: async () => { let buf = ''; return { write: async d => { buf += d; }, close: async () => { __files[n] = buf; } }; } }),
        entries: async function* () { for (const n of Object.keys(__files)) yield [n, {}]; }, removeEntry: async n => { delete __files[n]; } };
      saveUI({ lastAutoAt: null, lastBackupAt: null });
    }, permission);
    const files = () => p.evaluate(() => { const today = `focusdeck-auto-${todayKey()}.json`, f = __files[today];
      return { autos: Object.keys(__files).filter(n => n.startsWith('focusdeck-auto-')).length, notes: 'notes.txt' in __files, sessions: f ? JSON.parse(f).sessions.length : -1, backedUp: !!loadUI().lastBackupAt }; });

    await setUp('granted');
    await p.evaluate(() => AutoBackup.daily()); await settle();
    let f = await files();
    report(f.sessions === 3 && f.autos === 7 && f.notes && f.backedUp, 'The first open of the day saves a backup and keeps the newest 7', JSON.stringify(f));
    await tap(p, '[data-view="settings"]');
    const status = await p.$eval('#autoStatus', el => el.textContent);
    report(/Saving to “Backups”\. Last saved today\./.test(status), 'Settings shows the folder and when it last saved', status);

    await p.evaluate(() => { S.timer = { ...S.timer, kind: 'focus', status: 'running', plannedSec: 1500, elapsedBefore: 0, segStart: Date.now() - 600e3, sessionStart: Date.now() - 600e3 }; finish('early'); });
    await settle(); f = await files();
    report(f.sessions === 4, 'A finished focus session rewrites today’s file', JSON.stringify(f));

    await setUp('prompt');
    // Already saved today, but the browser restarted and wants permission again: it must still ask.
    await p.evaluate(() => { delete __files[`focusdeck-auto-${todayKey()}.json`]; saveUI({ lastAutoAt: Date.now() }); AutoBackup.daily(); }); await settle();
    const asked = await toastText(p);
    await tap(p, '[data-act="toastAction"]'); await settle(); f = await files();
    report(/Save today’s backup to “Backups”\?/.test(asked) && f.sessions === 4, 'After a restart it asks first, even later the same day, and saves on Save', `${asked}; ${JSON.stringify(f)}`);
  });
}

async function oldData() {
  await scenario('Old data with out-of-range values', async ctx => {
    const v4 = { settings: { pomo: 1e9, longAfter: 50, short: 5, long: 15 }, tasks: [{ id: 't1', name: 'Old task', pomosDone: 2, est: 3 }],
      history: [{ date: '2026-04-26', pomos: 3, sessions: [] }] };
    const p = await open(ctx, { seed: { focusdeck4: JSON.stringify(v4) } });
    const st = await state(p);
    report(st.settings.focusMin === 120 && st.settings.longEvery === 12 && st.sessions.length === 5 && st.sessions.every(s => s.plannedSec === 7200),
      'v4 settings are held to the Settings ranges on first open', JSON.stringify({ focusMin: st.settings.focusMin, longEvery: st.settings.longEvery, n: st.sessions.length, planned: st.sessions[0] && st.sessions[0].plannedSec }));
    await tap(p, '[data-view="insights"]');
    report(/Focus per day/.test(await p.$eval('#insightsBody', el => el.textContent)), 'Insights still renders');
  });

  // v5.6: old data imported from Settings skipped normalize(), so its estimates and tags went in unchecked.
  await scenario('Old data pasted into Settings', async ctx => {
    const p = await open(ctx);
    await tap(p, '[data-view="settings"]');
    await p.$eval('details.paste', d => { d.open = true; });
    await p.$eval('#pasteBox', (el, v) => { el.value = v; }, JSON.stringify({ tasks: [{ id: 't1', name: 'Negative', est: -5, tag: 'x'.repeat(500) },
      { id: 't2', name: 'Huge', est: 1e9, tag: 'ok' }], history: [{ date: '2026-04-26', pomos: 1, sessions: [] }] }));
    await tap(p, '[data-act="importPaste"]');
    const tasks = (await state(p)).tasks.sort((a, b) => a.title.localeCompare(b.title));
    report(tasks.length === 2 && tasks[0].estimate === 99 && tasks[1].estimate === null && tasks.every(t => t.tag.length <= 24),
      'Pasted old data is cleaned like any other import', JSON.stringify(tasks.map(t => [t.title, t.estimate, t.tag.length])));
  });
}

async function insightsByTag() {
  await scenario('Time by tag', async ctx => {
    const now = Date.now();
    const p = await open(ctx, { seed: data({ tasks: [task('m', 'Problems', { tag: 'maths' }), task('w', 'Draft', { tag: 'writing' })],
      sessions: [done(now - DAY, 'm'), done(now - DAY + 30 * MIN, 'm'), done(now - 2 * DAY, 'w'), done(now - 2 * DAY + 30 * MIN)] }) });
    await tap(p, '[data-view="insights"]');
    const text = await p.$eval('#insightsBody', el => el.textContent);
    report(/Time by tag/.test(text) && /#maths took the most/.test(text) && /#writing/.test(text), 'Insights shows focus time per tag', text.match(/Time by tag.{0,90}/)?.[0] || 'section missing');
  });
}

async function backupReminder() {
  await scenario('Backup reminder', async ctx => {
    const start = Date.now() - 20 * DAY;
    const p = await open(ctx, { seed: data({ sessions: [0, 1, 2, 3, 4, 5].map(i => done(start + i * 30 * MIN)) }) });
    report(/haven’t backed up yet/.test(await toastText(p)), 'After two weeks without a backup, FocusDeck says so on start-up', `toast: ${await toastText(p)}`);
    await p.evaluate(() => { window.__downloads = []; download = name => __downloads.push(name); });   // keep the file off your disk
    await tap(p, '[data-act="toastAction"]');   // Back Up
    const files = await p.evaluate(() => __downloads);
    await tap(p, '[data-view="settings"]');
    const age = await p.$eval('#backupAge', el => el.textContent);
    report(files.length === 1 && /^focusdeck-backup-/.test(files[0]) && age === 'Last exported today.', 'Back Up exports, and Settings shows when', `${files.join()}; ${age}`);
    const persist = await p.$eval('#persistStatus', el => el.textContent);
    report(persist.length > 0, 'Settings says whether the browser may clear the data', persist);
    await p.reload({ waitUntil: 'load' });
    report(!(await toastText(p)), 'No reminder right after a backup', `toast: ${await toastText(p)}`);
  });
}

try {
  for (const [label, features] of appearances) await selfCheck(label, features);
  await twoTabs();
  await endingSessions();
  await missedSessions();
  await questionSheets();
  await reordering();
  await doneToday();
  await capacity();
  await usualPace();
  await carryOver();
  await dailyBackup();
  await oldData();
  await insightsByTag();
  await backupReminder();
} catch (e) {
  report(false, 'Check ran to the end', e.message);
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
