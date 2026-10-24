# FocusDeck — changelog

What changed in each release. The app is always the one file `FocusDeck.html`; earlier versions are in the git history (and in tagged releases), not in separate files.

| Version | Date | Summary |
|---|---|---|
| 5.6 | 2026-10-25 | **Current.** Fixes for the chime, two tabs, missed sessions and old-data imports (same data) |
| 5.5 | 2026-10-23 | Fixes for two tabs and imports; reorder by keyboard, backup reminder, time by tag (same data) |
| 5.4 | 2026-10-22 | Liquid Glass look (same data) |
| 5.3 | 2026-10-20 | Security hardening (same data) |
| 5.2 | 2026-10-20 | Redesign (same data) |
| 5.1 | 2026-10-20 | Input cleaning (same app as 5.0) |
| 5.0 | 2026-10-19 | New data format with a session log |
| 4 | before Oct 2026 | Was `Pomofocus Local Timer.html`; not published |
| 3 | before Oct 2026 | Was `Pomofocus Timer.html`; not published |

Up to v5.4 each release was saved as its own file (`FocusDeck-v5.3.html` and so on); the release notes below still use those names. v3 and v4 aren't published because they contained personal tasks and history.

You can check which version you have open in **Settings**: the bottom line reads “FocusDeck v5.6 · data format 5”. In the code, it's the `APP_VERSION` constant and the comment on line 2.

## Where your data lives

Each version keeps its data in the browser, not in the file, under its own storage key:

| Version | Storage key |
|---|---|
| v3 | `focusdeck3` |
| v4 | `focusdeck4` |
| v5.x | `focusdeck5` |

- **All v5.x files share the same data.** You can switch between any v5 files without losing anything.
- **v3 and v4 don't see v5 data.** Opening an old file won't show your new sessions.
- **v5 imports v3/v4 data automatically** on first open, and leaves the old keys untouched.
- **Clearing the browser's site data erases everything.** Use Settings → Export backup.

---

## v5.6 — 2026-10-25

**Why:** four logic bugs found in a code review, each reproduced in headless Chrome. Same data format.

**Fixes**
- **The end-of-session chime rings once.** The alarm is scheduled on the audio clock when a session starts, so it rings on time in a background tab. But `finish()` called `disarm()`, which cancelled that chime just after it started (about 30 ms in) and cleared `Sound.scheduledOk`, so `finish()` always played a second chime. You heard a click and then the chime, or in a background tab the full chime and then another one when the tab caught up. The new `Sound.release()` (*Sound*) lets the scheduled chime ring out, forgets its nodes so an automatically started next session can't cut it off, and tells `finish()` (*Timer engine*) whether it rang.
- **Two open tabs agree when a session ends.** Both tabs run the timer, so both logged the ending session, each with its own random id. Each tab then took the other's copy from the `storage` event, which left the tabs swapped and one of them out of step with what was saved. A rating given in that tab could be lost, and its next save wrote the stale copy back. A session that runs to the end now gets an id made from its start (`end-<start>-<kind>`, in `finish()`), so every tab logs the very same session and saves identical data, which the `storage` listener already ignores.
- **Log a Missed Session refuses sessions that would end in the future.** Only the first session's start was checked, so 3 sessions starting 30 minutes ago put two of them in the future. The log form's submit handler (*Events*) now checks when the last one would end.
- **Old data imported from Settings is cleaned.** v5.5 ran old data through `normalize()` on first open, but not when you used Settings → Import or pasted it. An estimate of −5 or 10⁹ and tags of any length went straight in (the plan then read “1000000000 sessions left”) until the next reload cleaned them. `mergeLegacy()` (*Actions*) now runs the tasks and sessions through `normalize()` first.

**Code changes in the script:** new `Sound.release()`. Changed: `finish()`, `mergeLegacy()` and the log form's submit handler. `APP_VERSION` is 5.6. **The CSP hash changed** (`w1IaHrTJoh08hHG6x7tUVTEPP8wv8O0xTYzzpOhs/XE=`).

**Tests:** seven new checks in `tools/check.mjs`. They cover a session ending with two tabs open, the chime ringing once and not being cut off when the next session starts by itself (with a stand-in audio context, so no sound device is needed), missed sessions that would end in the future, and pasted old data. v5.5 fails six of them, and v5.6 passes all 40 checks. The user guide now says that sessions that would *end* in the future are refused.

**No change** to the data format or the storage key.

## v5.5 — 2026-10-23

**Why:** fixes and improvements from a code review: data loss with two tabs, imports that could freeze the app, and gaps in reordering, backups and testing. Same data format.

**Fixes**
- **Two open tabs no longer overwrite each other.** Each tab kept its own copy of your data in memory and saved all of it, so with FocusDeck open twice, the tab you weren't using could save its older copy over the other tab's changes (for example when you switched away from it) and those changes were lost. Now a tab takes the other tab's data as soon as it saves (a `storage` listener in `bindEvents()`, *Events*). Tasks, the timer and everything else stay in step without a reload. If both tabs are open when a session ends, both ring.
- **Imported settings are held to the ranges the Settings tab allows.** `normalize()` only checked that a setting was a number, so a crafted backup with `dailyTarget: 1e9` froze the app while it built the day strip, and `longEvery: 0` broke the break and capacity maths. Numbers are now rounded and clamped to the new `SETTING_LIMITS` (*State & storage*), and the sound must be Chime, Soft or Off.
- **Imported sessions keep times the timer could have produced.** A negative planned length gave negative credit, and a huge time spent froze Insights (`splitByHour()` walked it hour by hour). `normalize()` now keeps the planned length between 1 second and a day, time spent between 0 and the planned length, the end no earlier than the start, and drops sessions whose start isn't a real date.
- **Old v3/v4 data is cleaned too.** On first open, old settings went straight into the app without `normalize()`, so an old focus length of 10⁹ minutes stuck. `load()` now runs the migrated data through `normalize()`. `Core.migrateLegacy()` also holds the focus length to 1–120 minutes and caps the old counters (200 sessions a day, 1,000 hand-added on a task), so a crafted file can't make it build millions of sessions.
- **Tasks estimated at more than 60 sessions can be edited.** Quick add accepts `~1` to `~99`, but the Edit Task sheet only allowed up to 60, so the browser refused to save any change to such a task. Both now use `MAX_ESTIMATE` (99, in *Utilities*), and imports round estimates and hold them to 1–99.

**Improvements**
- **Reorder without a mouse.** Dragging only worked with a mouse. Now Tab to a task and press Alt ↑ / ↓ (⌥ on a Mac): it moves, keeps the focus, and its new place is announced to screen readers (`moveTask()`, *Actions*). The Edit Task sheet has a **Position** menu next to Plan, for touch screens (`fillPos()`). It lists the other list's places when you change Plan.
- **Questions in a sheet.** Erase, Restore and importing old data twice used the browser's own `confirm()`, the only part of the app that didn't look like it. They now use a sheet like Edit Task (`ask()` and `#askDialog`). Cancel has the focus when it opens, so Return or Esc never erases anything.
- **Backup reminder.** Your data's only copy is in the browser. If you have five or more sessions and two weeks pass without a JSON export (counted from your first session if you've never exported), FocusDeck says so when you open it, with a **Back Up** button. It does this at most once a week, never while a session is running, and never over another message (`Core.backupDue()`, end of `init()`). Settings → Your data shows when you last exported. The date is kept with the last view under `focusdeck5-ui`, not in your data or backups.
- **Protect from clean-up.** A new row in Settings → Your data asks the browser for persistent storage (`navigator.storage.persist()`), so it won't clear FocusDeck's data when the disk runs low. The browser decides; headless Chrome said no for a file opened from disk.
- **Time by tag** in Insights: focus time per tag for the chosen range, biggest first, up to eight tags (`Core.timeByTag()`).
- **Docs:** in Chrome, every HTML file opened from disk shares one storage area. A copy of FocusDeck in another folder, or under another name, sees the same data (tested in Chrome only), and so can any other local HTML file you open there. The README's privacy section and the user guide now say so. The guide also used to say that opening the file from a new folder loses your data, which isn't true in Chrome.

**Code changes in the script:** new `MAX_ESTIMATE`, `MAX_DATE_MS`, `plural()`, `SETTING_LIMITS`, `SOUNDS`, `Core.timeByTag()`, `Core.backupDue()`, `ask()`, `fillPos()`, `moveTask()`, `saveUI()` and `syncPersist()`. Changed: `normalize()`, `load()`, `Core.migrateLegacy()`, `mergeLegacy()` and `importData()` (now async), `openEdit()`, the Edit Task submit handler, `renderInsights()`, `syncSettings()`, `showView()`, the key handler, `bindEvents()` and `init()`. `APP_VERSION` is 5.5. **The CSP hash changed** (`eTUHrVbV7jWwIcZ4JlYISaFWdnbCvfBqX4x4/V4PCPM=`).

**Tests:** seven new self-tests at the end of the list, so the earlier numbers don't change. They cover imported settings, the Settings ranges matching the inputs, large estimates, imported session times, runaway old counters, time by tag and the backup reminder. v5.4 fails the ones it can run.
- **New `tools/check.mjs`** (`node tools/check.mjs`) runs in headless Chrome with a fresh profile for each scenario, so it never sees your data. It runs the CSP hash check and the self-check in light, dark, Increase Contrast (light and dark) and Reduce Transparency. It also tests what the self-check can't, because it changes data: two tabs at once, Finish Early, Discard, undo and redo (including undo being refused after another change), a session that ended while the app was closed, the question sheets, reordering by keyboard and sheet, old data with out-of-range values, time by tag and the backup reminder. `FOCUSDECK_FILE=…` points it at another copy; v5.4 fails 12 of these checks, and v5.5 passes them all.
- **GitHub Actions** (`.github/workflows/check.yml`) runs `check.mjs` on every push and pull request.
- The README and user guide no longer give a test count, which went stale with every release.

**No change** to the data format or the storage key.

## v5.4 — 2026-10-22

**Why:** a Liquid Glass and glassmorphism look, following the Liquid Glass page of the Apple Design skill (`references/hig/liquid-glass.md`, distilled from HIG › Materials, Color, Layout and Branding). Same app, same features, same data.

**The rule it follows:** Apple's Liquid Glass has two layers. Glass goes only on the controls that float above the content, never on the content itself. Putting glass on cards and lists is the generic “glassmorphism template” look, so v5.4 doesn't.

**Content layer** (in the `<style>` block, *Content layer: the color field*)
- **A color field behind the app** (new `<div class="backdrop">` at the top of `<body>`): two soft color blobs that change with the timer: faint indigo and teal when idle, indigo while focusing, teal on a break and grey when paused. They cross-fade over 1.2 s and don't move otherwise, so nothing drifts in your peripheral vision while you focus. The brand color now lives here (HIG › Branding), and the glass picks it up.
- **The timer sits straight on the field.** It's no longer a white card, so the countdown and its glass controls are the first thing you see.
- **Cards** (day strip, plan, Later/Done, History, Insights, Settings) are 80% white, or 74% dark grey in dark mode, so a hint of the field shows through. They don't use blur: the field is already smooth, and blurring dozens of cards would cost battery for no visible gain.

**Functional layer — Liquid Glass** (in *Functional layer: Liquid Glass*)
- **Where:** the section tabs, the timer's Focus / Short Break / Long Break switch, the timer buttons, the Edit Task and Shortcuts sheets, and the toast. Nothing else, following “use Liquid Glass sparingly”.
- **How it's built:** blur (24 px, 40 px on sheets) with a 1.6× saturation boost, a translucent fill, a bright gradient rim (a masked `::after`), an inner top highlight and a soft shadow. These values come from the skill's cross-platform section.
- **Interactive:** glass controls glow where the pointer is (`bindGlass()` in *Rendering*; sets `--mx`/`--my`), and the timer buttons swell slightly when pressed instead of shrinking, like Apple's interactive glass.
- **Color budget:** only the primary timer action (Start / Pause / Resume) is tinted, and the tint goes on the background, not the label (HIG › Color). Everything else on glass stays monochrome.
- **Tabs:** on wider screens they float as a glass capsule in the header, with the selected tab on a lighter pill. On phones they float as a capsule above the bottom edge instead of a full-width bar, and the FocusDeck title scrolls away.
- **Scroll edge effect:** content blurs and fades where it meets the header (`header.top::before`), and on phones where it meets the tab bar (new `<div class="edge-b">`). There's no painted bar under the tabs.
- **Sheets** have rounder corners (22 px). On phones they float 8 px from the edges, as in iOS 26.
- **Toast:** now glass with dark text, instead of a dark pill.

**Accessibility**
- **Contrast:** colors were picked numerically so text still clears 4.5:1 in the worst case: both blobs at full strength, a card on top, and glass over the darkest (light mode) or brightest (dark mode) thing that can scroll beneath it. To get there in light mode, four text colors got slightly darker: `--ink2` `#5c5c63`→`#55555c`, `--ink3` `#66666d`→`#5e5e65`, `--accent` (text only) `#5b52d6`→`#4f46c8`, `--break` (text only) `#0e7486`→`#0b6574`. Button fills (`--accent-fill`, `--break-fill`) are unchanged.
- **Reduce Transparency:** every card and glass surface turns opaque with a hairline border, and the blur, rim, glow and scroll edge go away.
- **Increase Contrast:** cards go opaque, and glass gets a thicker fill and a visible border.
- **Reduce Motion:** no swell on press and no color cross-fade (the existing rule turns off all transitions).
- **Dark mode:** fields and the Delete button in sheets use a grey fill so they show against the dark glass.

**Tried and dropped:** true lens refraction, which bends content at the glass rim using an SVG displacement filter as a backdrop filter. It only works in Chrome and Edge. At a glass thickness that keeps labels readable, it changed the image by at most 4/255 per pixel, which you can't see. It wasn't worth a browser-specific code path.

**Code changes in the script:** `renderTimer()` sets `<html data-mode>` (idle / focus / break / paused) for the color field. `bindGlass()` is new and is called from `init()`. `APP_VERSION` is 5.4. **The CSP hash changed** (`ox/xN3WP3bvkkMGWrOsd/StEhZjVIgb4kx0V483d2PU=`).

**Tests:** 21 self-tests (was 20). New #21 “Text stays 4.5:1 on the color field, cards and glass” composites each translucent layer over its worst case using the live colors, so run it in both light and dark. All 21 pass in light, dark, Increase Contrast, Reduce Transparency and Reduce Motion, on desktop and phone widths (headless Chromium).

**No change** to the data format, storage key, or any timer, stats or import logic.

## v5.3 — 2026-10-20

**Why:** hardening before publishing on GitHub, plus a second pass with the Apple Design skill (app icon, first run, VoiceOver).

**Security**
- **Content-Security-Policy** (new `<meta>` tag in the head): the browser only runs the one script in the file, identified by its SHA-256 hash, and blocks every network request (`connect-src 'none'`). Injected scripts and inline handlers can't run, and no data can leave the page even if a bug slipped through.
  - ⚠️ **Editing the script changes its hash.** After any edit to the `<script>` block, run `python3 tools/csp_hash.py FocusDeck-vX.html`. If you forget, the app shows a “FocusDeck couldn’t start” notice instead of silently breaking.
- **Timer cleaning:** new `cleanTimer()` in *State & storage*. A saved or imported timer now only keeps a known type and status and real numbers (v5.2 kept whatever the file said, which could show “NaN:NaN”).
- **Formula-safe CSV:** `csvCell()` in *Actions* prefixes `'` to text starting with `= + - @`, so Excel shows it instead of running it as a formula.
- `<meta name="referrer" content="no-referrer">` added.

**Apple Design skill pass**
- **App icon** (HIG › App icons): a tab icon — a white dial on indigo, no text. While a session runs, a wedge shows the time left and the icon turns teal on a break and grey when paused, so you can see the timer from another tab (`setIcon()` in *Rendering*).
- **First run** (HIG › Onboarding: teach in context): a brand-new user sees a short tip in the empty plan explaining `#tag`, `~estimate` and the play button. The placeholder is now just “New task” (the long example was cut off on phones). The Done list hides until something is done.
- **Restores your place** (HIG › Launching): reopening FocusDeck shows the tab you were last on, unless a session is running. Stored under its own key `focusdeck5-ui`, outside the data format and backups.
- **VoiceOver** (HIG › VoiceOver): switching tabs moves focus to the tab's title; the daily chart describes itself (total, best day, target); idle page titles name the tab (“History — FocusDeck”).
- **Phones:** the three timer buttons stay on one row.

**Tests:** 20 self-tests (was 18). New #18 “A crafted timer is cleaned to safe values”, #19 “CSV export defuses spreadsheet formulas”.

**Also new:** `tools/csp_hash.py` (updates or checks the hash; treats Windows and Unix line endings alike, as browsers do), `.gitattributes` (keeps line endings stable in git), README.md, LICENSE (MIT), `docs/USER_GUIDE.md`, `docs/screenshots/`.

**No change** to the data format or storage key.

## v5.2 — 2026-10-20

**Why:** a design pass against Apple's Human Interface Guidelines (via the Apple Design skill). The v5.1 look — warm cream, serif headings, terracotta accent — is the most common template look in AI-generated UIs, and the review found real accessibility gaps. Same app, same features, same data.

**Accessibility** (all in the `<style>` block unless noted)
- **Contrast:** v5.1's faint text (`--ink3`, used for the shortcut hints, footnotes, chart labels and version line) was 2.97:1 on the background; HIG minimum is 4.5:1. Every text color now clears 4.5:1 in light and dark, with darker variants when the system's *Increase Contrast* is on.
- **Text size setting:** sizes moved from `px` to `rem`, so the browser's font-size setting now scales the app (v5.1 ignored it). Smallest text raised from 10.5px to 11px; body is 16px, 17px on phones.
- **Tap targets:** checkboxes, task buttons, the history delete × and steppers are 44×44 on phones and narrow windows (were 18–26px).
- **Keyboard:** each task row is now a real button, so you can Tab to it and press Enter to edit (v5.1's clickable row couldn't be reached by keyboard).
- **Screen readers:** the end of a session is announced (`announce()` in *Rendering*, called from `finish()`); the day strip and hour chart have text descriptions; task buttons name their task.
- **Motion and transparency:** animations switch off with *Reduce Motion*; blurred bars go solid with *Reduce Transparency*.
- **Light weight dropped:** the countdown no longer uses a Light (300) weight.

**Platform conventions**
- **Theme setting removed.** Appearance follows the system light/dark setting (HIG › Dark Mode: avoid an app-specific appearance setting). `theme` was dropped from `DEFAULT_SETTINGS`; an old saved value is ignored.
- **Tab bar on phones:** under 640px wide, the four sections move to a bottom tab bar with icons and one-word labels. On wider screens they sit in the header as icon + label tabs.
- **Undo shortcuts:** ⌘Z / Ctrl+Z undoes the last change and ⇧⌘Z / Shift+Ctrl+Z redoes it (`withUndo`, `undo`, `redo` in *State & storage*). Undo only works while nothing else has changed since, so it can never wipe later sessions.
- **Sheets:** Edit Task opens as a sheet with Cancel on the left, Save on the right and Delete Task at the bottom in red. On phones it rises from the bottom.
- **Settings as grouped lists:** steppers (− value +) instead of bare number boxes, switches instead of checkboxes.
- **Buttons:** all timer buttons are the same size; the main one is set apart by color, not size, and sits last (as in Apple's Clock). Every button now has a press state. Button and segment labels use title-style capitalization (“Start Focus”, “Short Break”); descriptions stay in sentence case.

**Color and type**
- **One color, one meaning:** indigo = focus (the color Apple devices already use for Focus), teal = break, red = destructive, green = done, orange = over estimate. In v5.1 terracotta meant both “progress” and “delete”.
- **The countdown is the one signature element:** large rounded numerals that turn indigo while focusing and teal on a break. Everything else is neutral grey and white.
- **System fonts** (SF Pro on Apple devices) replace IBM Plex. The file no longer loads anything from Google Fonts, so it works fully offline and makes no outside requests.

**Smaller UX changes**
- The undo toast stays 10 seconds and pauses while you hover or focus it (was 7s).
- Removed the per-task *Edit* button (the row itself opens it); *Focus* is now a play icon.
- Keyboard-shortcut hints are hidden on touch devices.
- Empty states say what to do next.

**Tests:** 18 self-tests (was 16). New #16 “The removed theme setting is ignored”, #17 “Text colors meet 4.5:1 contrast in the current appearance” (reads the live colors, so run it in both light and dark).

**No change** to the data format, storage key or any timer, stats or import logic.

## v5.1 — 2026-10-20

**Why:** before sharing the file publicly (friends, GitHub).

- **Changed:** `normalize()` in the *State & storage* section now cleans all loaded or imported data:
  - **IDs:** reduced to letters, numbers, `-` and `_`.
  - **Numbers:** forced to numbers, or set to empty if invalid.
  - **Fixed-choice fields:** status, type, outcome and rating only accept known values.
  - **Text:** capped to the input-box lengths.
  - **Settings:** only accept known keys of the right type.
  - **Broken sessions:** dropped instead of crashing the views.
- **Why it matters:** a crafted backup file could previously have injected code through task IDs or estimates.
- **Added:** self-test #16, “A crafted backup cannot inject HTML”.
- **Added:** version label in Settings. Backups now record `appVersion`.
- **No change** to how the app looks or works.

## v5.0 — 2026-10-19

Full rebuild. Same single-file, double-click-to-open app.

- **Data:**
  - Counters were replaced by a **session log**, with start, end, task, outcome, rating and distractions for each session.
  - Stats, streak, History and task progress are all calculated from that log.
  - Data from v3/v4 is imported automatically.
- **Timer:**
  - Wall-clock based, and survives a page reload.
  - A session that ends while the tab is closed is logged at its real end time.
  - The alarm is pre-scheduled on the audio clock so it rings on time in background tabs.
- **Ending a session:**
  - **Finish early** gives partial credit for the time actually done.
  - **Discard** gives no credit.
  - Both can be undone.
  - Skip no longer counts as a full session.
- **Planning:** Today and Later lists.
  - A capacity line shows sessions left vs your daily target, plus a projected finish time.
  - Quick-add understands `#tag ~estimate`.
  - Tasks can be dragged to reorder.
- **Focus helpers:**
  - A rating (Scattered / Steady / Deep) after each session.
  - Press `D` to note a distraction mid-session.
- **History:**
  - Every session is listed per day and can be deleted with undo.
  - **Log a missed session** replaces the old ± buttons.
- **Insights:** headline numbers, focus per day, a weekday × hour chart, estimates vs reality, and session quality.
- **Settings:**
  - Changes apply instantly.
  - **Day starts at** (default 04:00) counts late-night sessions toward the right day.
  - Export a JSON backup or a sessions CSV, and restore from a backup or pasted data.
  - Built-in self-check (15 tests).
- **Design:**
  - One warm-paper theme that follows the system's light/dark mode.
  - IBM Plex fonts.
  - No emoji.
  - Large countdown instead of the ring.
  - Works at phone width.

## v4 — archived

- Wall-clock timer, so it no longer drifts in background tabs.
- **Skip** counted the session as done.
- Manual ± adjusters for today's count and per task.
- Shipped with study tasks and history preloaded.

## v3 — archived

- Original version: tick-counting timer, six themes, tasks with priority and estimates, daily history.

---

## How to version from now on

- **Edit `FocusDeck.html` in place;** git keeps every earlier version. For a release, bump `APP_VERSION` and the line-2 comment, commit, and tag it (`git tag v5.5`).
- **After editing the script, update its hash:** `python3 tools/csp_hash.py FocusDeck.html` (`--check` only reports). Then run `node tools/check.mjs`, or open the file and run the self-check in light and dark.
- **Fixes and small features** get a minor bump (5.1 → 5.2).
- **Changes to the stored data format** get a major bump (→ v6). Use a new storage key, plus an import from `focusdeck5`.
- **Add an entry at the top of this file** for each release: what changed, where in the code, and why.
