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
4. An **Execution log** panel opens at the bottom. Wait until it says **`Setup complete`**.
5. Switch back to the spreadsheet tab. You now have **13 tabs** at the bottom:
   - **Events**: one row per competition, with columns `id | code | name_en | sheet_name | deadline_iso | is_open`.
   - **12 event tabs**, one per competition, named like **`ESY – Essay Writing`**, **`DEB – Debate`**, **`FGS – Faculty Group Singing`**. Each has a bold, frozen header row and holds **only that competition's registrations**. There is no shared "Registrations" tab.
6. You can delete the empty **Sheet1** tab: right-click it → **Delete**.

Every event is created **open** (`is_open` = `TRUE`), so registration works as soon as the website is connected (step 6). It stays open until a coordinator unticks it or the event's deadline passes (step 7).

**`setupSheet` is safe to run again, any time.** It only *adds* what is missing: a new event row, a missing event tab, a missing header. It never deletes, clears or overwrites anything, so existing registrations and coordinator edits (like a closed event) are untouched. Running it twice in a row changes nothing.

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

Registration is **open from the start**. An event accepts registrations until **either** a coordinator closes it **or** its deadline (18 Nov, 11:59 PM IST) passes. There is **no limit on the number of registrations**.

Everything is controlled from the **Events** tab. The website reads it live, about every 30 seconds, so **you never need to redeploy anything** for these changes:

| To do this | Change this cell |
|---|---|
| **Close** an event (stop taking registrations) | `is_open` → **`FALSE`** |
| **Reopen** it | `is_open` → **`TRUE`** (capital letters) |
| Change an event's last date | `deadline_iso` → keep **exactly** this format: `2026-11-18T23:59:00+05:30` |

On the website a closed event shows a "Closed" label and a disabled Register button.

### Where the registrations are

Each competition has its **own tab** (for example **`ESY – Essay Writing`**) with these columns:

`timestamp | reg_id | category | name | usn_or_empid | department | semester | phone | email | team_name | members_json | member_ids | consent_photo`

- A person who registers for two competitions gets one row in each tab. Registration IDs are numbered **per tab**: the first Essay registration is `KR26-ESY-0001`, the first Poem registration is `KR26-POM-0001`.
- The **Events** tab also has a `sheet_name` column. The script finds an event's tab **through that cell**, never by guessing.

### Renaming a tab safely

You may rename an event tab (for example to `Essay – final list`), but **do it in two steps, together**:

1. Rename the tab (double-click its name at the bottom).
2. In the **Events** tab, change that event's **`sheet_name`** cell to the **exact same text**.

If you rename the tab but not the cell (or the other way round), registrations for that event **fail with a server error and nothing is saved**, rather than landing in the wrong tab. Fix the cell (or rename the tab back) and it works again immediately. Running `setupSheet` after a rename is fine: it follows the cell and won't create a duplicate tab. Each event needs its **own** tab; two events must never share one.

### Rules for the spreadsheet

- **Don't change the first (header) row** of the Events tab or of any event tab, and don't rename the `Events` tab.
- **Don't edit** the `reg_id` column.
- To **cancel** a registration, delete its whole row (right-click the row number → **Delete row**). The next registration in that tab still gets a new, higher number, so IDs are never reused.
- You may **add your own columns to the right** (e.g. "attended") in any tab. The script ignores them.
- If a `deadline_iso` cell is broken (wrong format), that event is treated as **closed**, never as open. Fix the format to reopen it.
- If an event's tab is missing or `sheet_name` points at a tab that doesn't exist, that event shows as **closed** on the website, and the script writes a clear message to its log (Apps Script → **Executions**). Run `setupSheet` to recreate a deleted tab (it comes back empty).
- The Sheet holds students' phone numbers and emails. **Share it only with coordinators** (Share → add their emails as Viewer or Editor). Never use "Anyone with the link".

**What's checked on every submission** (by the script, not just the website): every field is re-validated with the same rules as the form (USN present and at most 20 characters — any format is accepted, department list, odd-semester list, phone, email, team size). The script also checks the event is open and before its deadline. It rejects anyone whose USN or employee ID, as the registrant **or as any team member**, is already registered for **that event** (the same person may still enter several different events). It also blocks bots (a hidden "honeypot" field, and forms submitted less than 3 seconds after opening). All of this runs inside a lock, so two simultaneous registrations can never get the same registration ID or slip past the duplicate check. Values are stored as plain text, so text such as `=…` can never run as a spreadsheet formula.

## 8. Confirmation emails and the daily limit

- Each successful registration emails the registrant (in Kannada and English) from the club account.
- **Gmail has a daily sending limit**: about **100 emails/day** for a normal Gmail account (more for Google Workspace accounts). On a busy day the limit may run out. Registration **still succeeds**; only the email is skipped. The student still sees their pass on screen and can download it.
- To check how many emails are left today: Apps Script → function drop-down → **`checkEmailQuota`** → **▶ Run** → read the Execution log.

## 9. Updating the script later (important!)

You need this when a developer changes `Code.gs`, or when **`Config.gs`** changes. `Config.gs` changes whenever event details, departments, semesters or validation rules change in the website; `npm run build` prints a message telling you when.

1. Apps Script → click **Code.gs** (or **Config.gs**) → **Ctrl + A** → paste the new version → **Save**.
2. Click **Deploy → Manage deployments**.
3. Select the existing deployment, click the **✏️ pencil (Edit)**.
4. Under **Version**, choose **New version**. Click **Deploy**.

⚠️ Do **not** use "New deployment" for updates. That creates a *different* URL, and the website would keep talking to the old one. "Manage deployments → Edit → New version" keeps the same URL.

Event IDs come from the website's data. If a new competition is added there, run **`setupSheet`** again after updating `Config.gs`. It adds the missing Events row and the new event's tab, and never deletes or overwrites anything.

## 10. Testing after setup

1. On the live website, register yourself for one competition with a test USN. You should see a pass, a new row in **that competition's tab** (and no row in any other tab), and an email.
2. Register again with the same USN for the same competition. You should see "already registered" and the same registration ID. Registering the same USN for a *different* competition works.
3. **Simultaneous-registration test** (a developer runs this): `npm run race -- "https://script.google.com/macros/s/…/exec" s-essay 10`
   It fires 10 registrations for the Essay event at the same instant. **All 10 must succeed**, with 10 different, consecutive registration IDs and no duplicate rows in the tab.
4. Delete the test rows (names "Race Test …", USNs starting `1BY99ZZ`) and your own test rows from the event tabs.

## 11. Troubleshooting

| What you see | What to do |
|---|---|
| Website says "Registration is temporarily unavailable" | The Netlify variable is missing, or the site wasn't redeployed after adding it (step 6). |
| An event shows "Closed" | Its `is_open` cell is `FALSE`, its deadline has passed, or its tab is missing (step 7). |
| `?action=status` shows a Google sign-in page | Deployment access must be **Anyone** (step 5.3). |
| You changed the code but nothing changed on the site | You saved but didn't deploy a **New version** (step 9). |
| Execution log says `Missing tab "Events"` | The Events tab was renamed or deleted. Rename it back, or run `setupSheet` again. |
| Execution log says `tab "…" not found` | An event tab was renamed or deleted. Rename it back, or fix that event's `sheet_name` cell in the Events tab, or run `setupSheet` to recreate it. Registrations for that event fail (and nothing is written) until then. |
| Execution log says `row 1 must be: timestamp \| reg_id \| …` | A header cell in an event tab was edited. Restore the exact header text. |
| Students say "Lots of people are registering right now" | Many submissions arrived at once and one waited too long for its turn. It clears within seconds; they just press Retry. |
| No confirmation emails | Daily quota used up (step 8), or the email went to spam. Registrations are still saved. |
| A student lost their pass | On the site's pass page, they enter their USN/employee ID **and** the full phone number they registered with. After 5 wrong tries the lookup pauses for 10 minutes. |
