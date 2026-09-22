/**
 * Operator Forge — 7-Day Challenge registrations → Google Sheet
 *
 * The website posts every landing-page registration here. Each one becomes a
 * row in the "Registrations" tab, created with headers on first use.
 *
 * Setup (once):
 *   1. Open the Google Sheet → Extensions → Apps Script. Replace the contents
 *      of Code.gs with this file and save.
 *   2. Project Settings (gear icon) → Script properties → Add property:
 *        WEBHOOK_SECRET = <a long random string — the same value you set as
 *                          GOOGLE_SHEETS_WEBHOOK_SECRET on the website>
 *      If the script was created at script.google.com rather than from the
 *      sheet's Extensions menu, also add:
 *        SPREADSHEET_ID = <the long ID in the sheet's URL, between /d/ and /edit>
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as:     Me
 *        Who has access: Anyone
 *      Authorise when asked, then copy the Web app URL (ends in /exec).
 *   4. On the website's hosting (Vercel → Settings → Environment Variables):
 *        GOOGLE_SHEETS_WEBHOOK_URL    = <the /exec URL>
 *        GOOGLE_SHEETS_WEBHOOK_SECRET = <the same secret as step 2>
 *      Redeploy the site so it picks them up.
 *   5. Optional: run `testAppend` from the editor to see a test row appear.
 *
 * "Anyone" can reach the URL, but only requests carrying the secret are
 * written; everything else is refused.
 */

const SHEET_NAME = 'Registrations';

const HEADERS = [
  'Received (IST)',
  'Name',
  'Phone',
  'Email',
  'Cohort',
  'Saved in database',
  'Flag',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
];

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply_({ ok: false, error: 'bad json' });
  }

  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || body.secret !== secret) {
    return reply_({ ok: false, error: 'unauthorised' });
  }

  const r = body.registration || {};
  const a = r.attribution || {};
  const row = [
    Utilities.formatDate(new Date(r.submittedAt || Date.now()), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'),
    text_(r.name),
    text_(r.phone),
    text_(r.email),
    text_(r.cohort),
    r.stored === true ? 'Yes' : 'No',
    text_(a.flag),
    text_(a.utm_source),
    text_(a.utm_medium),
    text_(a.utm_campaign),
    text_(a.utm_content),
    text_(a.utm_term),
    text_(a.fbclid),
  ];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    sheet_().appendRow(row);
  } catch (err) {
    return reply_({ ok: false, error: 'script', message: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
  return reply_({ ok: true });
}

/** Lets you open the /exec URL in a browser to check the deployment is live. */
function doGet() {
  return reply_({ ok: true, service: 'operator-forge-registrations' });
}

function sheet_() {
  const book = book_();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/**
 * The spreadsheet this script belongs to, or the one named by SPREADSHEET_ID
 * for a script created on its own at script.google.com.
 */
function book_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id.trim());
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error(
    'This script is not attached to a spreadsheet. Open the sheet → Extensions → Apps Script and paste the code there, or add a SPREADSHEET_ID script property.'
  );
}

/**
 * Plain text, capped. A leading = + - or @ would make Sheets treat the value
 * as a formula (and "+91…" as a number), so those are stored as text.
 */
function text_(value) {
  if (value === undefined || value === null) return '';
  const s = String(value).slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run from the editor to append a clearly-marked test row. */
function testAppend() {
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        secret: secret,
        registration: {
          submittedAt: new Date().toISOString(),
          name: 'TEST — delete me',
          phone: '+919000000000',
          email: 'test@example.com',
          cohort: 'test',
          stored: false,
          attribution: { utm_source: 'apps-script-test' },
        },
      }),
    },
  });
  Logger.log(result.getContent());
}
