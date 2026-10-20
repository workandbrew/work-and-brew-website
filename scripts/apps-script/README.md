# Scout workflow — setup (one time, ~15 min)

The scout map (`public/scout-map.html` → workandbrew.app/ops/teambrew26) now has the café
form built in. Its backend is a small script that lives inside the café spreadsheet.
Nothing secret is in the website code.

## 1. Put the script in the spreadsheet

1. Open the café spreadsheet → **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs` and paste in the contents of `scripts/apps-script/Code.gs`.
3. Click **Save** (disk icon).
4. **Deploy → New deployment → ⚙ Select type → Web app**
   - Description: `scout api`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, approve the permissions (it needs Drive + Sheets + "connect to an external service" for Slack).
6. Copy the **Web app URL** (ends in `/exec`).

## 2. Paste the URL into the map

In `public/scout-map.html`, find:

```
const SCOUT_API_URL = 'REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL';
```

and paste the URL between the quotes. Commit + push.

## 3. Slack (so submissions land in the channels)

Do this once per channel:

1. Go to https://api.slack.com/apps → **Create New App → From scratch** → name it `Work & Brew Scouts`, pick the workspace.
2. In the app: **Incoming Webhooks → turn On → Add New Webhook to Workspace** → pick `#cafe-submissions` → Allow. Copy the webhook URL.
3. **Add New Webhook to Workspace** again → pick `#address-corrections` → Allow. Copy that URL too.
4. Back in Apps Script: **⚙ Project Settings → Script Properties → Add script property**
   - `SLACK_SUBMISSIONS_WEBHOOK` = first URL
   - `SLACK_ADDRESS_WEBHOOK` = second URL

Until these are set, submissions still save to the sheet — they just don't ping Slack.

## 4. Public map reads the sheet

In Vercel → Project → Settings → Environment Variables, add:

- `VITE_MARKERS_FEED_URL` = the Web app URL + `?action=markers`

Redeploy. Completed cafés now come from the spreadsheet; `/markers.csv` is only a fallback.

## Optional script properties

- `DRIVE_FOLDER_ID` — a folder in Drive to keep café photo folders in. If empty, the script creates
  "Work & Brew — Café Photos" in the Drive of whoever deployed.
- `APPROVER_EMAILS` — comma-separated. Defaults to Den, David, Armando, workandbrew.app.
- `SHEET_NAME` — tab name, if the café list isn't the first tab.

## How it flows

Scout opens a café on the map → **📝 Scout this café** → fills the form in the side panel,
uploads photos (they go to Drive: `Café Photos / <number> <name>`) → **Submit** →
status becomes **In Review**, the sheet row fills in, `#cafe-submissions` gets the summary
with a **Review** link → an approver opens it, picks listing photos, edits wording, adds the
website → **Approve & publish** → status **Visit Completed**, café moves to the Completed tab
and appears on the public map. **Send back** sets **Needs Revisit** and tells the scout why.

"Address wrong? Tell us" → flags the row (`AddressFlag` = reported) and pings
`#address-corrections`. Fix the address with ✏️ on the café, then clear the flag cell.

## Changing the code later

Whenever `Code.gs` changes: paste the new version → **Deploy → Manage deployments → ✏ → Version: New version → Deploy**. The URL stays the same.
