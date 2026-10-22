# FocusDeck User Guide

For FocusDeck v5.5 · October 2026

## Getting started

FocusDeck is a Pomodoro timer, day planner and focus log in one HTML file. Double-click `FocusDeck.html` to open it in your browser; there is nothing to install and no account.

- **Your data lives in the browser, not the file.** It is saved automatically, under the key `focusdeck5`, every time something changes. The same browser on the same computer always finds it again.
- **A different browser, a private window or another computer starts empty.** Move data between them with Settings → Backup → Export, then Restore.
- **In Chrome, every copy of the file sees the same data,** wherever it's saved and whatever it's called. Other browsers may tie the data to where the file is, so keep it in one place.
- **All v5.x files share the same data.** You can swap a v5 file for a newer one and nothing is lost. To check which version is open, look at the last line of the Settings tab.
- **First open after v3 or v4:** your old tasks and history are imported automatically, and a message says how many.
- **Open in more than one browser tab? They stay in sync.** A change in one tab shows up in the others straight away (since v5.5).
- **FocusDeck reopens on the tab you used last,** unless a session is running, in which case it opens on Today.
- **Watch the timer from other tabs.** The tab icon is a small dial: a colored wedge shows the time left, indigo for focus, teal for a break, grey when paused.

The app has four tabs. On a phone-width window they sit in a bar at the bottom.

| Tab | What it is for |
| --- | --- |
| Today | The timer, today's progress and your task plan. Where you spend most of your time. |
| History | Every focus session, day by day. Delete mistakes or add sessions you forgot to time. |
| Insights | Patterns over 7, 30 or 90 days: how much you focus, when, how accurate your estimates are. |
| Settings | Timer lengths, daily target, sounds, backups and the self-check. |

## The timer

Pick a session type, press **Start Focus** (or Space), and the countdown runs until you stop it or time is up. The numbers turn indigo while you focus and teal on a break; grey means paused.

- **Session types:** Focus (25 min by default), Short Break (5) and Long Break (15). You can only switch type while the timer is idle.
- **Pause and Resume** as often as you like. Paused time does not count.
- **The timer runs on the real clock.** Reloading the page, switching tabs or sleeping the laptop does not lose time. If a session ends while FocusDeck is closed, it is logged at its real end time and a message tells you when you come back.
- **The tab title shows the countdown,** so you can watch it from another tab. When a session ends in the background, the title changes to “● Break time” or “● Back to focus”.

### Three ways a focus session can end

Every focus session counts toward your day as **credit**: 1 for a full session, less for a partial one. Credit drives the day strip, streak, task progress and Insights.

| How it ends | Credit | Kept in History | Asked to rate it |
| --- | --- | --- | --- |
| Let it run to 00:00 | 1 | Yes, as Full | Yes |
| **Finish Early** | Time done ÷ planned time (12 of 25 min = 0.48) | Yes, as Ended early | Yes |
| **Discard** | 0 | Yes, struck through as Discarded | No |

Use Finish Early when you did real work but stopped, and Discard for a false start you don't want counted. Both can be undone straight away. A session stopped in under a minute is not logged at all.

### Breaks

- After a focus session the timer switches itself to a break. It suggests a **long break after every 4 credited focus sessions** (change this in Settings), otherwise a short one.
- **Skip Break** goes straight back to Focus. Skipping a long break still resets the count, so you won't be offered long breaks back to back.
- **End Break** stops a break early.
- To run sessions back to back without clicking, turn on *Start breaks automatically* and *Start the next focus session after a break* in Settings → Flow. Auto-start only happens if you were there when the previous session ended, so FocusDeck never runs sessions while you are away.

### Sound and notifications

- A chime plays when any session ends. Choose Chime, Soft or Off in Settings → Alerts, and press **Play** to test it.
- Browsers block sound until you click the page once. After a reload, click anywhere once so the alarm can ring.
- Turn on *Notify when the tab is in the background* to also get a desktop notification. The browser asks for permission the first time; notifications only appear when FocusDeck isn't the tab you are looking at.

## Planning your day

The Plan section on the Today tab holds three lists: **Today** (what you mean to finish today), **Later** (parked tasks) and **Done**. Sessions you run count toward the task selected at the time.

### Adding tasks

Type in the *New task* row and press Return. Two shortcuts work inside the title:

- `#tag` adds a tag, e.g. `#stats`. Tags group your time in Insights → Time by tag and Estimates vs reality.
- `~number` sets an estimate in focus sessions, e.g. `~6`. Estimates power the progress bars, the capacity line and the estimate insights.

So `Stats past paper #stats ~6` makes a task called “Stats past paper”, tagged stats, estimated at 6 sessions. Press **N** anywhere on the Today tab to jump to the box. The Later list has its own box inside its section.

### Working with a task

| Action | How |
| --- | --- |
| Choose what the next session counts toward | The *Working on* menu under the timer, or the play button on a task |
| Start focusing on a task right away | The **play button** on its row. If the timer is idle it starts a focus session at once. |
| Switch task mid-session | Press the play button on another task. The whole session then counts toward the new one. |
| Mark done | The circle on the left. Undo is offered; tick it again to reopen the task. |
| Edit title, tag, estimate or position, or move between Today and Later | Click the task's title. **Delete Task** is at the bottom of that sheet. |
| Move between Today and Later quickly | The **Later** / **Today** button on the row |
| Reorder | Drag a row up or down, or from Later into Today, with a mouse. From the keyboard, Tab to a task and press **Alt ↑ / ↓** (⌥ on a Mac). On a phone, open the task and pick its **Position**. |

The selected task has an indigo bar on its left and the word *Selected*. Each row shows sessions done against the estimate (for example 3.5 / 6) and a small bar that turns orange once you go over the estimate.

### The capacity line

Above the Today list, one line and one bar answer: “Can I get through this plan today?”

- **Sessions left:** the remaining estimate of every Today task. A task with no estimate counts as 1.
- **Over your target / room for N more:** sessions done today plus sessions left, compared with your daily target.
- **Done around:** when you would finish if you kept going now, including breaks.
- **The bar:** solid = done today, striped = still planned, black tick = your daily target. If the stripes run past the tick, the plan is bigger than your day — move something to Later.

## During and after a session

### Noting distractions

When something pulls you away mid-focus — your phone, a stray thought, someone talking — press **D** (or *Note a distraction*), type a few words and press Return. Esc cancels. The timer keeps running; the point is to park the thought and get back to work. The count shows under the buttons, and each note is saved with the session in History. Insights later compares how distracted your deep and scattered sessions were.

### Rating the session

When a focus session ends (fully or with Finish Early), a card asks how it went:

- **Scattered (1), Steady (2) or Deep (3).** Click one or press 1, 2 or 3.
- **Optional note,** such as “finished Q4, stuck on Q5”. Press Return to save just the note.
- **Skip** closes the card without rating.

Ratings are quick and optional, but they are what makes Insights → Session quality useful. Discarded sessions are not rated.

## The Today card and your streak

The Today card shows time focused, sessions done against your daily target, and your streak.

- **The day strip** has one square per focus session today. A full session fills its square; a partial one fills part of it. The square with an outline is the session running now. Empty squares are what is left of your daily target (8 by default). Hover a square to see its time and task.
- **Streak** counts days in a row with at least some focus credit. If today has none yet, it counts up to yesterday and says “keep it going”, so the streak only breaks once a whole day passes without focus.
- **Day starts at** (Settings, default 04:00) decides which day late nights belong to. With 04:00, a session at 01:30 counts toward the previous day, which keeps late study sessions from splitting a day in two.
- **Daily target** is a rule of thumb: 8 × 25 min ≈ 3 h 20 min of real focus, about 4 hours with breaks. Set it near what you actually manage (Insights shows your average), then raise it by one once you hit it most days.

## History

History lists every focus session, newest day first, with the day's total time and credit. The last 14 days show first; **Show Older Days** loads more.

Each row shows start–end time, task, minutes, how it ended (Full, Ended early, Discarded) and your rating. A line underneath holds the note, distractions with their times, and “added by hand” for logged sessions.

- **Delete a session:** the × at the end of the row. Undo is offered.
- **Log a missed session:** for work you did without the timer. Click **Log a Missed Session…**, set the date, start time, how many sessions (1–12) and the task, then **Add to History**. Each session uses your current focus length, with a short-break gap between them. Future times are refused.
- **Imported sessions** from v3/v4 have placeholder times (9:00 onwards) because the old versions only stored counts. A note on the day says so.

## Insights

Insights turns your session log into five answers. It needs at least 3 credited focus sessions to appear. Switch between the last **7, 30 or 90 days** at the top; the estimate panel always uses all time.

| Panel | What it tells you | How to use it |
| --- | --- | --- |
| Headline figures | Total focus, average per active day, % of sessions run to the end, your typical rating | The per-day average is the honest number for your daily target |
| Focus per day | Hours per day as bars, with your daily target as a dashed line | Spot slumps and which days of the week you protect |
| When you focus | A weekday × hour grid, darker = more focus, plus your busiest 2-hour window | Book your hardest work into that window |
| Time by tag | Focus time per tag, biggest first; sessions with no tagged task count as untagged | Check your hours go where you meant them to |
| Estimates vs reality | For finished tasks with an estimate: actual ÷ estimate (median), per tag and for recent tasks | 1.5× means tasks take half again as long as you think; pad new estimates by that much |
| Session quality | Distractions per session, deep vs scattered comparison, count of each rating | If scattered sessions carry far more distractions, remove the usual culprit |

Discarded sessions never count toward time. Imported v3/v4 sessions count toward totals and the daily chart but not the hour grid, completion rate or quality, because their times and outcomes are unknown.

## Settings reference

Changes apply instantly; there is no Save button. A new focus or break length applies to the timer straight away if it is idle, otherwise from the next session.

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Focus length | 25 min | 1–120 | Length of a focus session |
| Short break | 5 min | 1–60 | Length of a short break |
| Long break | 15 min | 1–90 | Length of a long break |
| Long break after | 4 sessions | 2–12 | Credited focus sessions before a long break is suggested |
| Daily target | 8 sessions | 1–30 | Sets the day strip, capacity line and the target line in Insights |
| Day starts at | 04:00 | 00:00–06:00 | Sessions before this hour count toward the previous day |
| Start breaks automatically | Off | — | A break starts as soon as focus ends |
| Start the next focus session after a break | Off | — | Focus starts as soon as a break ends |
| Sound when a session ends | Chime | Chime, Soft, Off | The alarm sound |
| Notify when the tab is in the background | Off | — | Desktop notification at the end of a session |

Light and dark appearance follow your system setting; since v5.2 there is no theme option in the app.

## Your data

Everything sits in this browser only. Clearing the browser's site data erases it, so export a backup every week or two and keep it somewhere safe, such as Google Drive. If two weeks go by without one, FocusDeck reminds you when you open it (at most once a week), with a **Back Up** button. Settings shows when you last exported.

| Action | Where | What happens |
| --- | --- | --- |
| Backup → Export | Settings → Your data | Downloads `focusdeck-backup-<date>.json` with all tasks, sessions and settings |
| Backup → Restore… | Settings → Your data | Replaces everything with a backup file after asking. Undo is offered. |
| Sessions as CSV → Export | Settings → Your data | Downloads every session as a spreadsheet: day, start, end, task, tag, minutes, outcome, credit, rating, distraction count, note |
| Import from the old FocusDeck | Settings → Your data | Adds v3/v4 data from this browser to what you already have. Warns before importing twice. |
| Paste its data | Settings → Your data | The same import, for old data from another browser (instructions are under the link) |
| Protect from clean-up | Settings → Your data | Asks the browser not to clear FocusDeck's data when the disk runs low on space. The browser decides, and Chrome may say no for a file opened from disk. It doesn't stop you clearing site data yourself, so keep backing up. |
| Erase… | Settings → Your data | Deletes everything after asking. You can undo straight after. |

The CSV opens in Excel and loads straight into pandas with `pd.read_csv()`, which makes it a good dataset for your own analysis. Text that starts with = + - or @ gets a leading ' so Excel never runs it as a formula.

**Versions.** The app is always the one file `FocusDeck.html`; CHANGELOG.md lists what changed in each release. All v5.x versions share the same data, so updating to a newer file keeps all your sessions.

## Keyboard shortcuts and undo

Shortcuts work on the Today tab when you are not typing in a box. Press **?** to see this list in the app.

| Key | Does |
| --- | --- |
| Space | Start, pause or resume |
| N | Jump to the new-task box |
| D | Note a distraction (during focus) |
| 1 / 2 / 3 | Rate the session that just ended |
| Alt ↑ / ↓ (⌥ on Mac) | Move the task you've tabbed to up or down its list |
| Ctrl Z (⌘Z on Mac) | Undo the last change, on any tab |
| Shift Ctrl Z (⇧⌘Z) | Redo |
| ? | Show all shortcuts |
| Esc | Close a sheet or cancel a box |

**What can be undone:** Finish Early, Discard, marking a task done, deleting a task or session, logging missed sessions, imports, restoring a backup and erasing everything. Use the **Undo** button in the message at the bottom (it stays 10 seconds, longer while your pointer is on it) or the shortcut.

Undo only reaches the last change, and only while nothing else has changed since. This is on purpose: it can never wipe out a session you logged afterwards. Adding tasks, moving them and changing settings are not undoable; just change them back.

## A suggested daily routine

1. **Plan (2 minutes).** Open the Today tab. Add today's tasks with `#tag ~estimate`, move anything that won't fit to Later, and check the capacity line stays near your target.
2. **Pick the first task.** Press its play button; the session starts.
3. **Focus.** When something distracts you, press D, write three words, carry on.
4. **Rate.** When the chime goes, press 1, 2 or 3, and add a note if there is something to remember.
5. **Break.** Step away from the screen. Skip a break only when you are truly mid-flow.
6. **Tick off finished tasks** as you go, so progress and estimates stay honest.
7. **Fill gaps.** Did focused work away from the timer? Add it in History → Log a Missed Session.
8. **Weekly (10 minutes).** Look at Insights on 7 days, adjust your daily target and estimates, and export a backup.

## Troubleshooting and FAQ

If FocusDeck shows **“FocusDeck couldn’t start”**, either the browser is out of date or the file's code was edited without updating its security hash. Run `python3 tools/csp_hash.py FocusDeck.html` after any edit to the script.

| Problem | Fix |
| --- | --- |
| My sessions are gone | You are probably in a different browser or a private window, or (outside Chrome) opened a copy of the file saved somewhere else. Go back to the original setup, or Restore a backup. |
| No sound at the end of a session | Click the page once after opening or reloading it; browsers block sound until you interact. Check Settings → Alerts isn't set to Off and your volume is up. |
| No desktop notification | Notifications only show when FocusDeck is in a background tab. If Settings says “Blocked by the browser”, allow notifications for this page in the browser's site settings. |
| A shortcut doesn't work | Click outside any text box first (or press Esc), and make sure you are on the Today tab. |
| Undo says something changed | Undo only works on the very last change. Fix it by hand instead. |
| Insights is empty | It appears after 3 credited focus sessions. |
| Late-night session shows on the wrong day | Adjust Settings → Day starts at. |
| Want to check the app works | Settings → Self-check → Run. Every test should pass. Run it in light and in dark mode, since one test checks the colors on screen. |

**Does it work offline?** Yes. Since v5.2 it loads nothing from the internet, and since v5.3 its security policy blocks any network request.

**Can I use it on my phone?** Yes, in a phone browser at a narrow width it switches to a bottom tab bar and larger buttons. The data on your phone is separate from your computer's; use Backup and Restore to move it.

**Will it remind me when the browser is closed?** No. The timer keeps correct time and logs the session when you return, but nothing can ring while the page is closed.
