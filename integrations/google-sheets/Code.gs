/**
 * Operator Forge — 7-Day Challenge registrations → Google Sheet + email
 *
 * The website posts every landing-page registration here. Each one becomes a
 * row in the "Registrations" tab, created with headers on first use, and an
 * email to NOTIFY_EMAIL (hello@operatorforge.in unless the property says
 * otherwise). Replying to that email replies to the person who registered.
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
 *      Optional — to send the notification somewhere else:
 *        NOTIFY_EMAIL   = <address, or several separated by commas>
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as:     Me
 *        Who has access: Anyone
 *      Authorise when asked, then copy the Web app URL (ends in /exec).
 *   4. On the website's hosting (Vercel → Settings → Environment Variables):
 *        GOOGLE_SHEETS_WEBHOOK_URL    = <the /exec URL>
 *        GOOGLE_SHEETS_WEBHOOK_SECRET = <the same secret as step 2>
 *      Redeploy the site so it picks them up.
 *   5. In the editor, pick `authorize` in the function list and click Run.
 *      Google asks for permission here (not when deploying): Review
 *      permissions → your account → Advanced → Go to … (unsafe) → Allow.
 *      Optional: run `testAppend` to see a test row and email arrive.
 *
 * "Anyone" can reach the URL, but only requests carrying the secret are
 * written; everything else is refused.
 *
 * Emails go out from the Google account that deployed the script (daily
 * limit: 100 for Gmail, 1,500 for Google Workspace). After updating the code,
 * deploy a new version and allow the new "send email" permission.
 */

const SHEET_NAME = 'Registrations';
const DEFAULT_NOTIFY_EMAIL = 'hello@operatorforge.in';

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

  // The row is saved; the email is a bonus and never undoes it.
  let emailError = null;
  try {
    notify_(r, a, row[0]);
  } catch (err) {
    emailError = String((err && err.message) || err);
  }
  return reply_({ ok: true, emailed: emailError === null, emailError: emailError });
}

/** One email per registration, with everything needed to follow up. */
function notify_(r, a, receivedIst) {
  const to = (PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL).trim();
  if (!to) return;

  const name = plain_(r.name) || 'Someone';
  const phone = plain_(r.phone);
  const email = plain_(r.email);
  const isTest = r.cohort === 'connection-test' || r.cohort === 'test';
  const source = [a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean).map(plain_).join(' / ') || 'Direct';
  const digits = phone.replace(/\D/g, '');

  const details = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ['Received', receivedIst + ' IST'],
    ['Source', source],
    ['Saved in database', r.stored === true ? 'Yes' : 'No'],
  ];
  if (a.flag) details.push(['Flag', plain_(a.flag)]);

  const rowsHtml = details
    .map(function (d) {
      return '<tr><td style="padding:6px 16px 6px 0;color:#6B6B6B;white-space:nowrap">' + esc_(d[0]) +
        '</td><td style="padding:6px 0;color:#0B0B0B;font-weight:600">' + esc_(d[1]) + '</td></tr>';
    })
    .join('');
  const actions = [];
  if (digits.length >= 10) actions.push('<a href="https://wa.me/' + digits + '" style="color:#0B0B0B">WhatsApp ' + esc_(phone) + '</a>');
  if (email) actions.push('<a href="mailto:' + esc_(email) + '" style="color:#0B0B0B">Email ' + esc_(email) + '</a>');

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0B0B0B">' +
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#6B6B6B">7-DAY OPERATIONS LEADER CHALLENGE</p>' +
    '<h2 style="margin:0 0 16px;font-size:20px">' + (isTest ? '[TEST] ' : '') + 'New registration: ' + esc_(name) + '</h2>' +
    '<table style="border-collapse:collapse">' + rowsHtml + '</table>' +
    (actions.length ? '<p style="margin:16px 0 0">' + actions.join(' &middot; ') + '</p>' : '') +
    '<p style="margin:16px 0 0;font-size:12px;color:#6B6B6B">They are on their way to the Razorpay payment page. ' +
    'Registered is not the same as paid — check the admin panel for payment status.</p>' +
    '</div>';
  const text = details.map(function (d) { return d[0] + ': ' + d[1]; }).join('\n');

  const message = {
    to: to,
    subject: (isTest ? '[TEST] ' : '') + 'New 7-Day Challenge registration — ' + name,
    htmlBody: html,
    body: text,
    name: 'Operator Forge',
  };
  // Reply goes straight to the person who registered.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) message.replyTo = email;
  MailApp.sendEmail(message);
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

/** A value for the email: plain text, one line, capped. */
function plain_(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

function esc_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this once from the editor after pasting new code: Google asks for the
 * spreadsheet and email permissions here, not when you deploy. It changes
 * nothing — it only reports what it can reach.
 */
function authorize() {
  const book = book_();
  Logger.log('Spreadsheet: ' + book.getName());
  Logger.log('Emails left today: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Notifications go to: ' +
    (PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL));
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
