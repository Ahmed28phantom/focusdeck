#!/usr/bin/env node
/* Retake the README screenshots in docs/screenshots/ with demo data.

   The app opens in headless Chrome with an invented task list and session log
   and a clock frozen at 22:35 on 22 Oct 2026, so the pictures never show your
   own data and come out the same on every run.

       cd tools && npm install       # once: installs puppeteer-core (no browser download)
       node tools/screenshots.mjs   # from the repo root

   Uses your installed Google Chrome. Elsewhere, set CHROME_PATH to its executable.
*/
import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = pathToFileURL(ROOT + 'FocusDeck.html').href;
const OUT = ROOT + 'docs/screenshots/';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const NOW = new Date(2026, 9, 22, 22, 35, 0).getTime();   // Thu 22 Oct 2026, 22:35
const MIN = 60e3;

if (!existsSync(CHROME)) { console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`); process.exit(1); }

/* ---------- Demo data (data format 5) ---------- */
const day = (offset, h, m) => new Date(2026, 9, 22 + offset, h, m).getTime();
const tasks = [
  { id: 'tla', title: 'Linear algebra problem set', tag: 'maths', estimate: 6, status: 'open', today: true, order: 0, createdAt: day(-4, 20, 0), doneAt: null },
  { id: 'trc4', title: 'Read chapter 4', tag: 'reading', estimate: 3, status: 'open', today: true, order: 1, createdAt: day(-5, 20, 0), doneAt: null },
  { id: 'tblog', title: 'Draft blog post', tag: 'writing', estimate: 4, status: 'open', today: true, order: 2, createdAt: day(-6, 20, 0), doneAt: null },
  { id: 'tplan', title: 'Plan next week', tag: 'admin', estimate: 2, status: 'open', today: false, order: 0, createdAt: day(-2, 20, 0), doneAt: null },
  { id: 'trc3', title: 'Read chapter 3', tag: 'reading', estimate: 4, status: 'done', today: true, order: 3, createdAt: day(-10, 20, 0), doneAt: day(-8, 22, 0) },
  { id: 'tobp', title: 'Outline blog post', tag: 'writing', estimate: 3, status: 'done', today: true, order: 4, createdAt: day(-9, 20, 0), doneAt: day(-6, 22, 0) },
];
const title = id => tasks.find(t => t.id === id).title;
// The past 9 days in order, as [taskId, credit]: credit < 1 = Finish Early, 0 = Discard ('x' = no task)
const queue = [
  ['trc3', 1], ['trc3', 1], ['trc3', 0.3], ['tobp', 1], ['tobp', 1], ['x', 0], ['tobp', 1], ['tobp', 1], ['tobp', 1],
  ['tblog', 1], ['trc4', 1], ['tblog', 1], ['tblog', 1], ['trc4', 1], ['x', 0], ['tblog', 1], ['tla', 1], ['tblog', 1],
  ['trc4', 0.5], ['tblog', 0.5], ['tla', 1], ['tla', 1],
];
const perDay = [3, 3, 2, 3, 2, 3, 2, 2, 2];
const startMin = [0, 10, 5, 20, 0, 15, 10, 0, 5];
const ratings = [2, 3, 2, 2, 1, 3, 2, 3, 2, 2, 3, 1, 2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 2];

const sessions = [];
let q = 0, r = 0, n = 0;
function add(start, taskId, credit) {
  const planned = 1500, actual = credit === 0 ? 420 : Math.round(planned * credit);
  const outcome = credit === 1 ? 'completed' : credit === 0 ? 'abandoned' : 'early';
  const t = taskId === 'x' ? null : taskId;
  sessions.push({ id: 's' + n++, kind: 'focus', taskId: t, taskTitle: t ? title(t) : '', start, end: start + actual * 1000,
    plannedSec: planned, actualSec: actual, outcome, rating: credit > 0 ? ratings[r++ % ratings.length] : null,
    distractions: n % 4 === 0 ? [{ at: start + 9 * MIN, text: 'check email' }] : [], note: '' });
  if (credit > 0) sessions.push({ id: 's' + n++, kind: 'short', taskId: null, taskTitle: '', start: start + 25 * MIN, end: start + 30 * MIN,
    plannedSec: 300, actualSec: 300, outcome: 'completed', rating: null, distractions: [], note: '' });
}
perDay.forEach((count, i) => {
  const base = day(i - 9, 21, startMin[i]);
  for (let j = 0; j < count; j++) { const [id, c] = queue[q++]; add(base + j * 30 * MIN, id, c); }
});
// Today: three full sessions, the last break ending 22:25
[['trc4', 1], ['tla', 1], ['tla', 1]].forEach(([id, c], j) => add(day(0, 20, 55) + j * 30 * MIN, id, c));

const settings = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyTarget: 8, dayStartHour: 4,
  sound: 'chime', autoBreak: false, autoFocus: false, notify: false };
const idle = { kind: 'focus', status: 'idle', plannedSec: 1500, elapsedBefore: 0, segStart: null, sessionStart: null, distractions: [] };
const running = { ...idle, status: 'running', segStart: NOW - 1000, sessionStart: NOW - 1000 };
const state = timer => JSON.stringify({ version: 5, settings, tasks, sessions, timer, currentTaskId: 'tla', pendingRating: null });

/* ---------- Capture ---------- */
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--font-render-hinting=none'] });

async function shot(file, { viewport, dark = false, timer = idle, view = 'today' }) {
  const ctx = await browser.createBrowserContext();   // fresh storage for each shot
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  // Injected through the DevTools protocol, so the page's CSP doesn't block it.
  await page.evaluateOnNewDocument((now, data) => {
    const Real = Date;
    class Fixed extends Real { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } }
    window.Date = Fixed;
    localStorage.clear();
    localStorage.setItem('focusdeck5', data);
  }, NOW, state(timer));
  await page.goto(APP, { waitUntil: 'load' });
  if (view !== 'today') await page.evaluate(v => showView(v), view);
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(res => setTimeout(res, 2000));   // let the 1.2 s color-field cross-fade settle
  const ready = await page.evaluate(() => document.documentElement.classList.contains('ready'));
  if (!ready || errors.length) throw new Error(`${file}: FocusDeck didn't start. ${errors.join('; ') || 'Is the CSP hash current? Run tools/csp_hash.py.'}`);
  await page.screenshot({ path: OUT + file });
  console.log('saved docs/screenshots/' + file);
  await ctx.close();
}

const desktop = { width: 1100, height: 1180, deviceScaleFactor: 2 };
const phone = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
try {
  await shot('today-light.png', { viewport: desktop });
  await shot('insights-light.png', { viewport: desktop, view: 'insights' });
  await shot('phone-dark.png', { viewport: phone, dark: true, timer: running });
} finally {
  await browser.close();
}
