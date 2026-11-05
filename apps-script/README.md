# Registration backend — setup guide

This folder is the "server" for the registration form: a **Google Sheet** that stores registrations, plus a small **Google Apps Script** program that the website talks to. You don't need to install anything. It takes about 20 minutes the first time.

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

## 4. Create the tabs (run `setupSheet` once)

1. In the toolbar above the code there is a drop-down showing a function name. Click it and choose **`setupSheet`**.
2. Click **▶ Run**.
3. The first time, Google asks for permission:
   1. Click **Review permissions**.
   2. Choose the club Google account.
   3. You'll see **"Google hasn't verified this app"**. This is normal, because it's your own script. Click **Advanced** (bottom left), then **Go to KR 2026 Registration (unsafe)**.
   4. Read the list (it needs to see and edit this spreadsheet and to send email as you) and click **Allow**.
4. An **Execution log** panel opens at the bottom. Wait until it says **`Setup complete`**.
5. Switch back to the spreadsheet tab. You now have two new tabs at the bottom:
   - **Events**: one row per competition, with columns `id | code | name_en | seats | deadline_iso | is_open`.
   - **Registrations**: only a header row for now.
6. You can delete the empty **Sheet1** tab: right-click it → **Delete**.

Every event starts with **`is_open` = `FALSE`**, so nobody can register yet. That's intended (see step 7).

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

## 7. Opening and running registration (for coordinators)

Everything happens in the **Events** tab. The website reads it live, about every 30 seconds, so **you never need to redeploy anything** for these changes:

| To do this | Change this cell |
|---|---|
| **Open registration** for an event (8 Nov) | `is_open` → type **`TRUE`** (capital letters) |
| **Close** an event early | `is_open` → **`FALSE`** |
| Change the number of places | `seats` → a number. A team counts as **1 seat**. |
| Change an event's last date | `deadline_iso` → keep **exactly** this format: `2026-11-18T23:59:00+05:30` |

Rules for the spreadsheet:

- **Don't rename** the tabs `Events` and `Registrations`, and don't change their first (header) row.
- **Don't edit** the `reg_id` column.
- To **cancel** a registration, delete its whole row (right-click the row number → **Delete row**). That frees the seat. The next registration still gets a new, higher number, so IDs are never reused.
- You may **add your own columns to the right** (e.g. "attended") in either tab. The script ignores them.
- If a `deadline_iso` cell is broken (wrong format), that event is treated as **closed**, never as open. Fix the format to reopen it.
- **Per-event lists:** create a new tab and put this in cell A1 (change `s-essay` to the event's `id`):
  `=FILTER(Registrations!A:N, Registrations!C:C="s-essay")`
  Don't type anything into the Registrations tab itself, apart from deleting rows.
- The Sheet holds students' phone numbers and emails. **Share it only with coordinators** (Share → add their emails as Viewer or Editor). Never use "Anyone with the link".

**What's checked on every submission** (by the script, not just the website): every field is re-validated with the same rules as the form (USN present and at most 20 characters — any format is accepted, department list, odd-semester list, phone, email, team size). The script also checks the event is open, before its deadline, and has a seat left. It rejects anyone whose USN or employee ID, as the registrant **or as any team member**, is already registered for that event. One person may enter several different events. It also blocks bots (a hidden "honeypot" field, and forms submitted less than 3 seconds after opening). All of this runs inside a lock, so two people can never both get the last seat. Values are stored as plain text, so text such as `=…` can never run as a spreadsheet formula.

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

Event IDs come from the website's data. If a new competition is added there, run **`setupSheet`** again after updating `Config.gs`. It only adds missing rows and never deletes or overwrites anything.

## 10. Testing after setup

1. In the **Events** tab, set `is_open` to `TRUE` for one event.
2. On the live website, register yourself for it with a test USN. You should see a pass, a new row in **Registrations**, and an email.
3. Register again with the same USN. You should see "already registered" and the same registration ID.
4. **Last-seat test** (a developer runs this): set that event's `seats` to (its number of rows in Registrations) + 1, then run
   `npm run race -- "https://script.google.com/macros/s/…/exec" s-essay`
   Exactly **1** of the 5 simultaneous registrations should succeed and the other 4 should be told "FULL".
5. Delete your test rows from **Registrations**, put `seats` back, and set `is_open` back to `FALSE` until 8 Nov.

## 11. Troubleshooting

| What you see | What to do |
|---|---|
| Website says "Registration is temporarily unavailable" | The Netlify variable is missing, or the site wasn't redeployed after adding it (step 6). |
| Every event shows "Opens soon" / "Closed" | `is_open` is still `FALSE` (step 7). |
| `?action=status` shows a Google sign-in page | Deployment access must be **Anyone** (step 5.3). |
| You changed the code but nothing changed on the site | You saved but didn't deploy a **New version** (step 9). |
| Execution log says `Missing tab "Events"` | A tab was renamed or deleted. Rename it back, or run `setupSheet` again. |
| Execution log says `row 1 must be: id \| code \| …` | A header cell was edited. Restore the exact header text. |
| Students say "Lots of people are registering right now" | Many submissions arrived at once. It clears within seconds; they just press Retry. |
| No confirmation emails | Daily quota used up (step 8), or the email went to spam. Registrations are still saved. |
| A student lost their pass | On the site's pass page, they enter their USN/employee ID **and** the full phone number they registered with. After 5 wrong tries the lookup pauses for 10 minutes. |
