# Registration backend — setup guide

This folder is the "server" for the registration form: a **Google Sheet** that stores registrations (one tab per competition), plus a small **Google Apps Script** program that the website talks to. You don't need to install anything. It takes about 20 minutes the first time.

You will need:

- A Google account. Use the **club's account** (for example the Honnudi Kannada Sangha Gmail), not a personal one. Confirmation emails are sent *from* this account, and it will own all the registration data.
- The two files in this folder: **`Code.gs`** and **`Config.gs`**. Open each one in a text editor (or on GitHub) so you can copy its contents.

> Google sometimes moves buttons around. If something below looks slightly different, look for a button with the same name nearby.

---

## 1. Create the Google Sheet

1. Sign in to the club Google account in your browser.
2. Go to **https://sheets.new**. A blank spreadsheet opens.
3. Click the title **"Untitled spreadsheet"** at the top left and type **`KR 2026 Registrations`**. Press **Enter**.

Leave this tab open.

## 2. Open the script editor and paste the code

1. In the spreadsheet's top menu, click **Extensions → Apps Script**. A new browser tab opens with a code editor.
2. Click **"Untitled project"** at the top left, type **`KR 2026 Registration`** and click **Rename**.
3. In the left sidebar under **Files** you'll see **`Code.gs`**, already open with a few lines like `function myFunction() {}`.
   - Click inside the code area, press **Ctrl + A** (Mac: **Cmd + A**) to select everything, and press **Delete**.
   - Copy **all** of this folder's `Code.gs` and paste it in (**Ctrl + V** / **Cmd + V**).
4. Add the second file:
   - Next to **Files**, click the **+** button, then **Script**.
   - Type **`Config`** as the name (no `.gs`, it's added for you) and press **Enter**.
   - Delete the placeholder code in it, then copy **all** of this folder's `Config.gs` and paste it in.
5. Click the **Save** icon (the floppy disk) or press **Ctrl + S** / **Cmd + S**.

You should now have exactly two files: `Code.gs` and `Config.gs`.

⚠️ The project must contain **only these two files**, each defining things once. A leftover old file that also says `var CONFIG = …` can silently override the real one.

## 3. (Recommended) Set the time zone

1. In the left sidebar, click the **gear icon (Project Settings)**.
2. Under **Time zone**, choose **(GMT+05:30) India Standard Time**. Settings save automatically.
3. Click the **`< >` icon (Editor)** in the left sidebar to go back to the code.

(The registration rules use exact times with `+05:30`, so this only makes the logs easier to read.)

## 4. Create the tabs (run `setupSheet`)

1. In the toolbar above the code there is a drop-down showing a function name. Click it and choose **`setupSheet`**.
2. Click **▶ Run**.
3. The first time, Google asks for permission:
   1. Click **Review permissions**.
   2. Choose the club Google account.
   3. You'll see **"Google hasn't verified this app"**. This is normal, because it's your own script. Click **Advanced** (bottom left), then **Go to KR 2026 Registration (unsafe)**.
   4. Read the list (it needs to see and edit this spreadsheet and to send email as you) and click **Allow**.
4. An **Execution log** panel opens at the bottom. It should start with **`Config 4d8d0965 (schema 6) lists 14 events`** (your version is the one printed by `npm run gas:config` and found at the top of `Config.gs`; it changes whenever the events or site data change), then one line per event (`s-essay: Events row ADDED; tab "ESY – Essay Writing" CREATED`), a line `Summary tab CREATED`, and end with **`Setup complete … 14 events; 14 Events row(s) added; 14 event tab(s) created …`**. On a re-run the same lines say *already there / already existed*.
   - If it instead fails with **`Config.gs has no events — paste the latest Config.gs`** or **`Config.gs is schema … but Code.gs expects …`**, the `Config.gs` file in the Apps Script project is empty, old, or from another version of the site. Nothing was changed in the spreadsheet. Paste the latest `Config.gs` (step 2.4), save, and run `setupSheet` again.
   - To check which Config the project is using without changing anything, run **`checkConfig`**.
5. Switch back to the spreadsheet tab. You now have **16 tabs** at the bottom:
   - **Events**: one row per competition, with columns `id | code | name_en | sheet_name | deadline_iso | is_open | whatsapp_url | max_teams` (`whatsapp_url` starts empty, see step 7, "WhatsApp group links"; `max_teams` is 30 for Treasure Hunt and empty for everything else, see "Team cap").
   - **14 event tabs**, one per competition, named like **`ESY – Essay Writing`**, **`DEB – Debate`**, **`FGS – Faculty Group Singing`**. Each has a bold, frozen header row and holds **only that competition's registrations**. There is no shared "Registrations" tab.
   - **Summary**: a live overview built from formulas (see "The Summary tab").
6. You can delete the empty **Sheet1** tab: right-click it → **Delete**.

Every event is created **open** (`is_open` = `TRUE`), so registration works as soon as the website is connected (step 6). It stays open until a coordinator unticks it or the event's deadline passes (step 7).

**`setupSheet` is safe to run again, any time.** It only *adds* what is missing: a new event row, a missing event tab, a missing column, the Summary tab. A missing column is always **appended at the end** of a tab (after any columns you added yourself); nothing is moved, renamed, deleted, cleared or overwritten, so existing registrations and coordinator edits (like a closed event or a changed `max_teams`) are untouched. Running it twice in a row changes nothing.

**If your spreadsheet already has an old "Registrations" tab** (from an earlier version, where all events shared one tab): `setupSheet` leaves it alone and nothing reads or writes it any more. Once you have copied across anything you need, **delete that tab by hand** (right-click the tab → **Delete**). An old Events tab with a `seats` column is upgraded in place: the new `sheet_name` column is added on the right and your `is_open` values are kept (tick the ones that are still `FALSE`). You can delete the leftover `seats` column; it is ignored.

## 5. Publish the script as a web app

1. In the Apps Script tab, click the blue **Deploy** button (top right) → **New deployment**.
2. Next to **Select type**, click the **gear icon** → **Web app**.
3. Fill in:
   - **Description**: `v1`
   - **Execute as**: **Me (your club email)**
   - **Who has access**: **Anyone**. This is required so students can submit without signing in. It only lets them use the form; it does **not** give anyone access to the spreadsheet.
4. Click **Deploy**. If Google asks for permission again, repeat step 4.3.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…long…/exec`. Click **Copy**, then click **Done**.
6. **Test it:** paste the URL into a new browser tab, add **`?action=status`** to the end and press **Enter**. You should see text starting with `{"ok":true,"events":{`. If you see a Google sign-in page instead, "Who has access" isn't set to **Anyone**. Fix it via **Deploy → Manage deployments → ✏️ Edit**.

Keep this URL private-ish. Don't post it anywhere; the website uses it behind the scenes.

## 6. Connect the website (Netlify)

1. Go to **https://app.netlify.com** and open the site (e.g. `kr2k26-bmsit`).
2. Click **Site configuration** (left sidebar) → **Environment variables** → **Add a variable** → **Add a single variable**.
3. **Key**: `VITE_REGISTRATION_ENDPOINT`. **Value**: the Web app URL from step 5. Click **Create variable**.
4. Click **Deploys** (left sidebar) → **Trigger deploy** → **Deploy site**. Wait for the deploy to show **Published**.

The build refuses to publish on Netlify if this variable is missing, so a broken form can never go live by accident.

*For developers running the site on their own computer:* put the same line in a file called `.env` in the project folder (`VITE_REGISTRATION_ENDPOINT=https://…/exec`). Without it, `npm run dev` uses the built-in local mock instead.

## 7. Running registration (for coordinators)

Registration is **open from the start**. An event accepts registrations until **either** a coordinator closes it **or** its deadline (18 Nov, 11:59 PM IST) passes. There is **no limit on the number of registrations, except Treasure Hunt: at most 30 teams** (see "Team cap" below).

Everything is controlled from the **Events** tab. The website reads it live, about every 30 seconds, so **you never need to redeploy anything** for these changes:

| To do this | Change this cell |
|---|---|
| **Close** an event (stop taking registrations) | `is_open` → **`FALSE`** |
| **Reopen** it | `is_open` → **`TRUE`** (capital letters) |
| Change an event's last date | `deadline_iso` → keep **exactly** this format: `2026-11-18T23:59:00+05:30` |
| Change how many teams an event takes | `max_teams` → a whole number (e.g. `30`, `32`); **empty = no limit**; `0` = no new registrations |

On the website a closed event shows a "Closed" label and a disabled Register button.

### Team cap (`max_teams`)

- Only **Treasure Hunt** is capped: its `max_teams` cell is **30**. Every other event's cell is empty, which means no limit. You can type a number into any event's cell at any time; no redeploy is needed.
- What counts: every registration in that event's tab that has a `reg_id` and is **not WITHDRAWN** (see below). For team events one registration = one team.
- When the event is full, the next person gets a friendly "This competition is full" message and nothing is saved. The check happens inside the script lock, so two people can never both get the last place.
- On the website the card says "Limited to 30 teams", then **"Few seats left"** when 4 or fewer places are left, and **"Full"** (Register button disabled) at 0. A withdrawn team frees its place again.
- `setupSheet` added this column **once**, filled in 30 for Treasure Hunt, and will never overwrite what you type there afterwards (even an empty cell).

### Withdrawing a registration (`status` column) — please don't delete rows

Every event tab has a **`status`** column at the end. To cancel a registration, type **`WITHDRAWN`** in that row's `status` cell (capitals or not, it doesn't matter). Leave the row where it is.

A withdrawn row:
- no longer blocks that person (or their team members) from registering again; they get a **new** registration ID,
- no longer counts towards the Treasure Hunt cap, the Summary tab or the status the website reads,
- gives "This registration (KR26-…) has been withdrawn" if the person tries to find their pass.

To undo a withdrawal, clear the cell. The script never writes to the `status` column. Deleting a row still works and never causes an ID to be reused (see "Registration IDs"), but you lose the record of who withdrew, so prefer `WITHDRAWN`.

### The Summary tab

`setupSheet` creates a **Summary** tab once. It is made of formulas and **updates by itself**; the script never writes to it again and nothing reads it, so you can format it as you like (but don't type over the formulas).

- Row 1: headers `Code | Event | For | Regs | People | Cap | Left | Open`. Row 2: **totals**. Both rows and the first column stay frozen, so it reads well on a phone.
- One row per row of the Events tab: **Regs** = registrations that are not WITHDRAWN, **People** = those registrants plus all their team members, **Cap / Left** = `max_teams` and the places left (only where `max_teams` is set), **Open** = the `is_open` cell, **For** = students / faculty.
- It finds each event's tab through the Events tab's `sheet_name` cell, so renamed tabs and new events show up automatically (up to 40 events). If a row shows `?`, that event's tab or its `status` column is missing; run `setupSheet`.
- If you ever delete the Summary tab, running `setupSheet` creates a fresh one.

### WhatsApp group links (optional)

Each event can have a WhatsApp group (or channel) that registrants are invited to join. **Where to put the link:** in the **Events** tab, in the **`whatsapp_url`** column (the last column, header in row 1), on the row of that competition. Paste the invite link as it comes from WhatsApp, for example `https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv`. A channel link `https://whatsapp.com/channel/<code>` also works. Nothing needs to be redeployed.

- The link is shown **only to people who registered for that event**: on their pass page (a green **"Join the WhatsApp group"** button below the pass, also after they find the pass again with their ID + phone) and in their confirmation email (a button in the HTML email and a plain line in the text version, in Kannada and English). It is **not** printed on the downloaded pass image, and it is **never** published through the status the website reads, so it can't be seen by someone who hasn't registered.
- Leave the cell **empty** for events without a group: nothing about WhatsApp is shown for them.
- Only `https://chat.whatsapp.com/<code>` and `https://whatsapp.com/channel/<code>` links are accepted. A trailing `?mode=…` that WhatsApp adds when you copy a link is removed automatically. **Anything else is ignored** (the event is treated as having no link, and the script log in Apps Script → **Executions** says `Ignoring the whatsapp_url of event "<id>"`). Check the log if a link you pasted doesn't show up.
- `setupSheet` adds the `whatsapp_url` column to an existing Events tab if it is missing (existing values are not touched) and never fills in or overwrites a link you pasted.
- If the website's contact email is set (`src/data/site.json → contactEmail`, then paste the regenerated `Config.gs`), replies to the confirmation email go there. Today it is empty, so no Reply-To is set.

### Where the registrations are

Each competition has its **own tab** (for example **`ESY – Essay Writing`**) with these columns:

`timestamp | reg_id | category | name | usn_or_empid | department | semester | phone | email | team_name | members_json | member_ids | consent_photo | eligibility_confirmed | status`

- `timestamp` is India time as plain text, e.g. `2026-11-14 18:05:09 IST`. (Rows from before this update say `…Z`, which is UTC; run `convertTimestampsToIST` once to convert them, see "One-off functions".)
- `eligibility_confirmed` is `TRUE` for the Elocution and both Simple Kannada Debates (the registrant confirmed Kannada is not their mother tongue; registration is refused without it) and empty elsewhere. `status` is yours: see "Withdrawing a registration".
- In tabs that existed before, the two newest columns were added **at the end**, after any columns you had added yourself. That's fine: the script finds every column by its header name.
- A person who registers for two competitions gets one row in each tab.

**Registration IDs.** They are numbered **per event**: the first Essay registration is `KR26-ESY-0001`, the first Poem registration is `KR26-POM-0001`. The next number is always **1 + the highest number that event has ever issued** (the highest `reg_id` in the tab, withdrawn rows included, or a counter the script keeps in its Script Properties, whichever is higher). It never depends on the number of rows, so withdrawing or deleting rows, even the newest one, can never hand out an ID twice.
- The **Events** tab also has a `sheet_name` column. The script finds an event's tab **through that cell**, never by guessing.

### Renaming a tab safely

You may rename an event tab (for example to `Essay – final list`), but **do it in two steps, together**:

1. Rename the tab (double-click its name at the bottom).
2. In the **Events** tab, change that event's **`sheet_name`** cell to the **exact same text**.

If you rename the tab but not the cell (or the other way round), registrations for that event **fail with a server error and nothing is saved**, rather than landing in the wrong tab. Fix the cell (or rename the tab back) and it works again immediately. Running `setupSheet` after a rename is fine: it follows the cell and won't create a duplicate tab. Each event needs its **own** tab; two events must never share one.

### Rules for the spreadsheet

- **Don't change the first (header) row** of the Events tab or of any event tab, and don't rename the `Events` tab.
- **Don't edit** the `reg_id` column.
- To **cancel** a registration, type **`WITHDRAWN`** in its `status` cell. Don't delete rows (see "Withdrawing a registration").
- Don't **hide** or **filter out** rows to cancel them: hidden rows still count (duplicate check, cap, Summary).
- You may **add your own columns** (e.g. "attended") in any tab. The script ignores them, and columns it adds later go after yours.
- Don't name any tab **`Summary`** or **`Events`** apart from the ones the script made.
- If a `deadline_iso` cell is broken (wrong format), that event is treated as **closed**, never as open. Fix the format to reopen it.
- If an event's tab is missing or `sheet_name` points at a tab that doesn't exist, that event shows as **closed** on the website, and the script writes a clear message to its log (Apps Script → **Executions**). Run `setupSheet` to recreate a deleted tab (it comes back empty).
- The Sheet holds students' phone numbers and emails. **Share it only with coordinators** (Share → add their emails as Viewer or Editor). Never use "Anyone with the link".

**What's checked on every submission** (by the script, not just the website): every field is re-validated with the same rules as the form (USN present and at most 20 characters — any format is accepted, department list, odd-semester list, phone, email, team size). The script also checks the event is open and before its deadline. It rejects anyone whose USN or employee ID, as the registrant **or as any team member**, is already registered for **that event** (the same person may still enter several different events). Withdrawn rows are ignored by the duplicate check. For the two events for non-Kannadigas the "Kannada is not my mother tongue" confirmation is required. For a capped event (Treasure Hunt) the cap is checked last. It also blocks bots (a hidden "honeypot" field, and forms submitted less than 3 seconds after opening). All of this runs inside a lock, so two simultaneous registrations can never get the same registration ID, slip past the duplicate check, or both take the last place. Values are stored as plain text, so text such as `=…` can never run as a spreadsheet formula.

## 8. Confirmation emails and the daily limit

- Each successful registration emails the registrant (in Kannada and English) from the club account. The email has an HTML version (with a **"View your pass"** button, and a "Join the WhatsApp group" button when the event has a valid link) and a plain-text version for apps that don't show HTML.
- **"View your pass"** opens `<siteUrl>/register/success?id=<registration ID>` (`siteUrl` is in `src/data/site.json`). The registration ID is filled in; the person types the mobile number they registered with. The link contains only the registration ID, never the phone number or USN. The pass page also accepts a registration ID in place of a USN/employee ID (a team member can use their own phone number).
- **Gmail has a daily sending limit**: about **100 emails/day** for a normal Gmail account (more for Google Workspace accounts). On a busy day the limit may run out. Registration **still succeeds**; only the email is skipped. The student still sees their pass on screen and can download it.
- To check how many emails are left today: Apps Script → function drop-down → **`checkEmailQuota`** → **▶ Run** → read the Execution log.

## 9. Updating the script later (important!)

You need this when a developer changes `Code.gs`, or when **`Config.gs`** changes. `Config.gs` changes whenever event details, departments, semesters or validation rules change in the website; `npm run build` prints a message telling you when.

1. Apps Script → click **Code.gs** (or **Config.gs**) → **Ctrl + A** → paste the new version → **Save**.
2. Click **Deploy → Manage deployments**.
3. Select the existing deployment, click the **✏️ pencil (Edit)**.
4. Under **Version**, choose **New version**. Click **Deploy**.

⚠️ Do **not** use "New deployment" for updates. That creates a *different* URL, and the website would keep talking to the old one. "Manage deployments → Edit → New version" keeps the same URL.

**Check that the right Config is live.** Open `<your /exec URL>?action=status` in a browser: the answer contains `"configVersion":"4d8d0965"` (this release; it changes with the data). It must equal the `CONFIG_VERSION` printed by `npm run gas:config` (and found at the top of `Config.gs`). If it differs, or the answer is `CONFIG_MISMATCH`, the deployment is still running old code: paste, save, and deploy a New version.

Event IDs come from the website's data. If a new competition is added there, run **`setupSheet`** again after updating `Config.gs`. It adds the missing Events row and the new event's tab, and never deletes or overwrites anything.

### Adding the faculty Simple Kannada Debate (Config `c82d0f3f`, schema 6)

Do this after the November 2026 update below. Nothing is removed or rewritten; the schema stays 6.

1. **Code.gs**: Apps Script → `Code.gs` → **Ctrl + A** → paste the new `Code.gs` → **Save**.
2. **Config.gs**: same for `Config.gs` (paste both before running anything).
3. Run **`checkConfig`**. The log must say `Config.gs OK — version c82d0f3f, schema 6, 15 events: …`.
4. Run **`setupSheet`**. Expected log: `f-simple-debate: Events row ADDED; tab "FSD – Simple Kannada Debate – Faculty (for non-Kannadigas)" CREATED`; every other event `already there; … already existed`; `Summary tab already exists — left as it is.`. In the spreadsheet: one new tab, one new last row in **Events** (`is_open` TRUE), and the **Summary** tab shows FSD on its next row by itself (its formulas already cover 40 rows; it is not rewritten).
5. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (same URL). Then `<your /exec URL>?action=status` must contain `"configVersion":"c82d0f3f"` and `"f-simple-debate"`.
6. **After the website has been deployed** (so the new card and the faculty Debate notice are live):
   - Run **`notifyDebateMediumChange`**. It only emails Debate registrants who never got the Debate notice (everyone else is skipped); faculty among them now also get the new option.
   - Run **`notifyFacultyDebateOption`** once (log: `notifyFacultyDebateOption: N sent, 0 failed, …`). It emails only faculty Debate registrants who already got the old notice, with just the new option. The order of these two does not matter, and neither ever emails the same address twice.

### Updating to the November 2026 version (Config `4d8d0965`, schema 6)

Registration is live, so do it in this order. Until step 6 the website keeps using the version that is deployed now, and every step only *adds* things to the spreadsheet.

1. **Code.gs**: Apps Script → `Code.gs` → **Ctrl + A** → paste the new `Code.gs` → **Save**.
2. **Config.gs**: same for `Config.gs`. Paste **both** files before running anything: they belong together (schema 6).
3. Run **`checkConfig`**. The log must say `Config.gs OK — version 4d8d0965, schema 6, 14 events: …`.
4. Run **`setupSheet`**. If Google asks for permission again, allow it (as in step 4.3). Expected log: `s-elocution` and `s-simple-debate`: Events row ADDED, tab CREATED; every older event: `already there; … already existed; column(s) eligibility_confirmed, status appended at the end`; `s-treasure-hunt: … max_teams set to 30`; `Summary tab CREATED`. Then check in the spreadsheet: two new tabs, the Summary tab at the end, `max_teams` = 30 for Treasure Hunt, and in every older event tab two new empty columns **after** the existing ones, with all rows unchanged.
5. Run **`checkEmailQuota`** if you plan to run step 8 today (you need about one email per Debate registrant).
6. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (keeps the same URL).
7. Open `<your /exec URL>?action=status`: it must contain `"configVersion":"4d8d0965"` and, for `s-treasure-hunt`, a `"seatsLeft"` value. Then run **`convertTimestampsToIST`** once (log: `convertTimestampsToIST: N timestamp(s) converted to IST.`). Do it after step 6, so no new UTC timestamps are written afterwards. Running it again changes nothing.
8. **After the website itself has been deployed** (so the Debate notice and the two new competitions are visible), run **`notifyDebateMediumChange`** once (log: `notifyDebateMediumChange: N sent, 0 failed, …`). If the daily email quota runs out it says so; run it again the next day and it continues where it stopped, without emailing anyone twice.

## One-off and helper functions (run from the editor)

Choose the function in the drop-down above the code and click **▶ Run**; the result appears in the Execution log. None of them change a registration.

| Function | What it does | When |
|---|---|---|
| `checkConfig` | Shows which `Config.gs` version is pasted. Read-only. | After every paste |
| `setupSheet` | Adds what is missing (rows, tabs, columns at the end, Summary). Never deletes or overwrites. | After every `Config.gs` update |
| `convertTimestampsToIST` | **One-off.** Rewrites old `2026-11-10T05:00:00.000Z` timestamps in every event tab to `2026-11-10 10:30:00 IST`. Skips rows already in IST, leaves anything else alone, logs how many it changed. Only the `timestamp` cells change. | Once, after deploying the November 2026 version |
| `notifyDebateMediumChange` | **One-off.** Emails every Debate (student and faculty) registrant who has not withdrawn: the Debate is now in Kannada only; tell a coordinator if you want to withdraw. Student Debate registrants also get links to the Simple Kannada Debate and Elocution; faculty Debate registrants a link to the faculty Simple Kannada Debate (their addresses are also recorded as `notified_facultySimpleDebate`). Each address at most once, ever (the list is kept in Script Properties as `notified_debateMedium`); failed sends are retried on the next run. Logs sent / failed / skipped. | Once, after the website is updated |
| `notifyFacultyDebateOption` | **One-off.** Emails only faculty Debate registrants (not withdrawn) who already received the Debate notice before it mentioned the faculty Simple Kannada Debate, with just that option and its link. Each address at most once, ever (Script Properties `notified_facultySimpleDebate`); failed sends are retried on the next run. Logs sent / failed / skipped. | Once, after the website shows the new competition |
| `findRegistrations` | **Read-only diagnostic.** Type a USN or employee ID between the quotes of `var FIND_REGISTRATIONS_ID = '';` (just above the function), save, run, then clear it again. Lists every row in every event tab that holds that ID: as registrant or team member, withdrawn or not, and whether the row is hidden or filtered. | When someone gets "already registered" unexpectedly |
| `checkEmailQuota` | How many emails can still be sent today. | Before a mailing |

## Why does someone get "already registered" (DUPLICATE)?

The script checks only that competition's own tab (through its `sheet_name`), reading it live inside the lock. Nothing is cached, so a row you just removed really is gone for the check. If someone still gets DUPLICATE, the website shows the registration ID it found. Search the tab for it, or run `findRegistrations` with their USN. The usual causes:

1. **They are a team member in another team's row** (`member_ids` column). Deleting or withdrawing their own row doesn't remove them from the other team.
2. **The row is still there**: it was hidden, filtered out, or only some of its cells were cleared (for example `member_ids` or `usn_or_empid` were left). Hidden and filtered rows still count.
3. **The row was deleted in a different tab** than the one the event's `sheet_name` points to (e.g. a copy of the tab).
4. **Their first try actually worked.** Before this update the website gave up after 20 seconds and retried automatically. When the script was busy, the first try could still be saved and the retry then said "already registered" with that new ID. The website now waits 35 seconds, longer than the script's 20-second queue, so this should no longer happen.

From now on, mark rows **WITHDRAWN** instead of deleting them; withdrawn rows never cause a DUPLICATE.

## 10. Testing after setup

1. On the live website, register yourself for one competition with a test USN. You should see a pass, a new row in **that competition's tab** (and no row in any other tab), and an email.
2. Register again with the same USN for the same competition. You should see "already registered" and the same registration ID. Registering the same USN for a *different* competition works.
3. **Simultaneous-registration test** (a developer runs this): `npm run race -- "https://script.google.com/macros/s/…/exec" s-essay 10`
   It fires 10 registrations for the Essay event at the same instant. **All 10 must succeed**, with 10 different, consecutive registration IDs and no duplicate rows in the tab. On a capped individual event (set its `max_teams` to a small number first) exactly that many succeed and the rest answer `FULL`. (The script cannot fire Treasure Hunt teams; the "two people for the 30th place" case is covered by `npm run test:server`.)
4. Delete the test rows (names "Race Test …", USNs starting `1BY99ZZ`) and your own test rows from the event tabs.

## 11. Troubleshooting

| What you see | What to do |
|---|---|
| Website says "Registration is temporarily unavailable" | The Netlify variable is missing, or the site wasn't redeployed after adding it (step 6). |
| An event shows "Closed" | Its `is_open` cell is `FALSE`, its deadline has passed, or its tab is missing (step 7). |
| `?action=status` shows a Google sign-in page | Deployment access must be **Anyone** (step 5.3). |
| You changed the code but nothing changed on the site | You saved but didn't deploy a **New version** (step 9). |
| Status/registration answers reason `CONFIG_MISMATCH` or `CONFIG_EMPTY`, or `setupSheet` says "Config.gs has no events" | The `Config.gs` in the Apps Script project is old, empty or missing. Paste the latest `Config.gs` **and** `Code.gs`, save, and deploy a **New version** (step 9). Run `checkConfig` to confirm. |
| A pasted WhatsApp link doesn't appear on the pass or in the email | Check the Execution log for `Ignoring the whatsapp_url of event …`. The cell must hold only a `https://chat.whatsapp.com/<code>` (or `https://whatsapp.com/channel/<code>`) link, no extra text. Existing registrants see it after they reload / look up their pass; emails already sent don't change. |
| Execution log says `Missing tab "Events"` (reason `EVENTS_TAB_MISSING`) | The Events tab was renamed or deleted. Rename it back, or run `setupSheet` again. |
| Execution log says `tab "…" not found` (reason `EVENT_TAB_MISSING:<eventId>`) | An event tab was renamed or deleted. Rename it back, or fix that event's `sheet_name` cell in the Events tab, or run `setupSheet` to recreate it. Registrations for that event fail (and nothing is written) until then. |
| Execution log says `has no "…" column in row 1` (reason `EVENTS_COLUMN_MISSING:<column>` or `EVENT_TAB_COLUMN_MISSING:<eventId>:<column>`) | A header cell in the Events tab or in an event tab was edited. Restore the exact header text. |
| Students say "Lots of people are registering right now" (reason `LOCK_TIMEOUT`) | Many submissions arrived at once and one waited too long for its turn. It clears within seconds; they just press Retry. |

**Finding out what went wrong.** Every "Something went wrong on our side" answer carries a short `reason`. In the browser it is printed to the console (F12 → Console) as `[registration] register: server error, reason=…`; visitors never see it. The same line is written to the Apps Script log (**Executions**) as `SERVER reason=… where=…`, followed by the detailed message. Reasons: `CONFIG_MISMATCH`, `CONFIG_EMPTY`, `EVENTS_TAB_MISSING`, `EVENTS_COLUMN_MISSING:<column>`, `EVENT_SHEET_NAME_MISSING:<eventId>`, `EVENT_TAB_RESERVED:<eventId>` (an event's `sheet_name` is `Events` or `Summary`), `EVENT_TAB_SHARED:<eventId>`, `EVENT_TAB_MISSING:<eventId>`, `EVENT_TAB_COLUMN_MISSING:<eventId>:<column>`, `LOCK_TIMEOUT`, and `UNEXPECTED` (anything else — the real error message is only in the Executions log). `BAD_RESPONSE` is added by the website itself when the script answers with something that isn't JSON (usually a Google sign-in or error page: check step 5.3 and step 9).
| No confirmation emails | Daily quota used up (step 8), or the email went to spam. Registrations are still saved. |
| "This competition is full" | The event's `max_teams` is reached. Raise the number, clear the cell (no limit), or mark withdrawn teams `WITHDRAWN` to free places. |
| "This registration has been withdrawn" on the pass page | Its `status` cell says WITHDRAWN. Clear the cell if that was a mistake. |
| Someone gets "already registered" but you removed them | See "Why does someone get DUPLICATE?" above, and run `findRegistrations`. |
| The Summary shows `?` for an event | That event's tab is missing or has no `status` column: run `setupSheet`. |
| A student lost their pass | On the site's pass page, they enter their registration ID (or USN/employee ID) **and** the full phone number they registered with, or open the "View your pass" button in their confirmation email. After 5 wrong tries the lookup pauses for 10 minutes. |
