/**
 * Work & Brew — Scout Workflow backend
 * ------------------------------------------------------------
 * Apps Script project (standalone or bound to the sheet — either works; it opens the
 * spreadsheet by SPREADSHEET_ID). Deployed as a Web App: Execute as "Me", access "Anyone".
 *
 * What it does
 *   POST upload        → saves a photo/video into the café's Drive folder
 *   POST submit        → writes the scout's answers to the sheet, pings #cafe-submissions
 *   POST flagAddress   → marks the address as reported, pings #address-corrections
 *   POST getSubmission → returns a submission for the review screen
 *   POST approve       → finalizes the row (Status = Visit Completed), pings Slack
 *   POST sendBack      → Status = Needs Revisit, pings Slack with the note
 *   POST removeUpload  → trashes a file the scout removed before submitting
 *   GET  ?action=markers → CSV of completed cafés for the public map
 *
 * One-time settings: Project Settings → Script Properties
 *   SLACK_SUBMISSIONS_WEBHOOK  (required)  incoming webhook for #cafe-submissions
 *   SLACK_ADDRESS_WEBHOOK      (required)  incoming webhook for #address-corrections
 *   DRIVE_FOLDER_ID            (optional)  parent folder for café photos; created if missing
 *   SHEET_NAME                 (optional)  tab name; defaults to the first tab
 *   APPROVER_EMAILS            (optional)  comma list; defaults to the list below
 */

var SUPABASE_URL = 'https://occdbhckswnhzkubfyge.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jY2RiaGNrc3duaHprdWJmeWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNTIyMTMsImV4cCI6MjA5OTkyODIxM30.t8jbngCkE-UHrKpqoTUa82vnp8orbB5qCYnZ_nOIx6w';
var SITE_URL = 'https://workandbrew.app/ops/teambrew26';
var DEFAULT_APPROVERS = ['denissemedinaflores@gmail.com', 'davidatorres123@gmail.com', 'abishop039@gmail.com', 'workandbrew.app@gmail.com'];

// Columns the workflow adds to the sheet (appended after existing ones if missing)
var EXTRA_COLUMNS = [
  'ReviewStatus', 'Website', 'HoursWeekday', 'HoursWeekend', 'WeekendRestrictions', 'Environment',
  'SeatsType', 'Notes', 'DateScouted', 'SubmittedBy', 'PhotoIds', 'ListingPhotoIds', 'DriveFolderUrl',
  'AddressFlag', 'AddressFlagNote', 'ApprovedBy', 'ApprovedAt', 'SendBackNote'
];

// ------------------------------------------------------------ entry points
function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var user = verifyUser_(body.token);
    switch (body.action) {
      case 'upload':        out = handleUpload_(body, user); break;
      case 'removeUpload':  out = handleRemoveUpload_(body, user); break;
      case 'submit':        out = handleSubmit_(body, user); break;
      case 'flagAddress':   out = handleFlagAddress_(body, user); break;
      case 'getSubmission': out = handleGetSubmission_(body, user); break;
      case 'approve':       out = handleApprove_(body, user); break;
      case 'sendBack':      out = handleSendBack_(body, user); break;
      default: throw new Error('Unknown action: ' + body.action);
    }
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  if (action === 'markers') {
    return ContentService.createTextOutput(buildMarkersCsv_()).setMimeType(ContentService.MimeType.CSV);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'workandbrew-scout-api' })).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------ auth
function verifyUser_(token) {
  if (!token) throw new Error('Please log in to the scout map first.');
  var res = UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/user', {
    method: 'get', muteHttpExceptions: true,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (res.getResponseCode() !== 200) throw new Error('Your login expired. Refresh the map and log in again.');
  var u = JSON.parse(res.getContentText());
  return { email: (u.email || '').toLowerCase(), name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '' };
}

function approvers_() {
  var p = PropertiesService.getScriptProperties().getProperty('APPROVER_EMAILS');
  return (p ? p.split(',') : DEFAULT_APPROVERS).map(function (s) { return s.trim().toLowerCase(); });
}
function requireApprover_(user) {
  if (approvers_().indexOf(user.email) === -1) throw new Error('Only approvers can do that.');
}

// ------------------------------------------------------------ sheet helpers
var SPREADSHEET_ID = '1X-odDqYsioz5XJaReTBQYKJPuR6IhR3ltZi7BuBhrfc'; // the café database sheet

function sheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  return (name && ss.getSheetByName(name)) || ss.getSheets()[0];
}

function headers_(sh) {
  var lastCol = sh.getLastColumn();
  var row = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  row.forEach(function (h, i) { if (h !== '') map[String(h).trim()] = i + 1; });
  return map;
}

function ensureColumns_(sh) {
  var h = headers_(sh);
  var missing = EXTRA_COLUMNS.filter(function (c) { return !h[c]; });
  if (missing.length) {
    var start = sh.getLastColumn() + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
    sh.getRange(1, start, 1, missing.length).setFontWeight('bold');
  }
  return headers_(sh);
}

function norm_(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

// Find the row for a café: by Number first, then by Name + Address, then Name alone.
function findRow_(sh, h, cafe) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var numCol = h['Number'], nameCol = h['Name'], addrCol = h['Address'];
  var data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var wantNum = norm_(cafe.number), wantName = norm_(cafe.name), wantAddr = norm_(cafe.address);
  if (wantNum && numCol) {
    for (var i = 0; i < data.length; i++) if (norm_(data[i][numCol - 1]) === wantNum) return i + 2;
  }
  var byName = -1;
  for (var j = 0; j < data.length; j++) {
    if (norm_(data[j][nameCol - 1]) !== wantName) continue;
    if (wantAddr && addrCol && norm_(data[j][addrCol - 1]) === wantAddr) return j + 2;
    if (byName === -1) byName = j + 2;
  }
  return byName;
}

function setCells_(sh, h, row, obj) {
  Object.keys(obj).forEach(function (k) {
    if (h[k]) sh.getRange(row, h[k]).setValue(obj[k]);
  });
}
function getRowObj_(sh, h, row) {
  var vals = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
  var o = {};
  Object.keys(h).forEach(function (k) { o[k] = vals[h[k] - 1]; });
  return o;
}
function now_() { return Utilities.formatDate(new Date(), 'America/New_York', 'MMM d, yyyy h:mm a'); }
function today_() { return Utilities.formatDate(new Date(), 'America/New_York', 'MMM d, yyyy'); }

// ------------------------------------------------------------ drive helpers
function parentFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DRIVE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Work & Brew — Café Photos');
  props.setProperty('DRIVE_FOLDER_ID', f.getId());
  return f;
}
function cafeFolder_(cafe) {
  var parent = parentFolder_();
  var name = ((cafe.number ? cafe.number + ' ' : '') + (cafe.name || 'Café')).replace(/[\/\\]/g, '-').trim();
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function fileInfo_(file) {
  var id = file.getId();
  return {
    fileId: id,
    thumbUrl: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w600',
    imageUrl: 'https://lh3.googleusercontent.com/d/' + id + '=w800',
    viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
  };
}

// ------------------------------------------------------------ handlers
function handleUpload_(body, user) {
  if (!body.data) throw new Error('No file data received.');
  var folder = cafeFolder_(body.cafe || {});
  var bytes = Utilities.base64Decode(body.data);
  var blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.filename || 'upload');
  var file = folder.createFile(blob);
  file.setDescription('Uploaded by ' + user.email + ' via scout map');
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  var info = fileInfo_(file);
  info.folderUrl = folder.getUrl();
  return info;
}

function handleRemoveUpload_(body, user) {
  if (!body.fileId) return {};
  try { DriveApp.getFileById(body.fileId).setTrashed(true); } catch (e) {}
  return {};
}

function handleSubmit_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {}, f = body.form || {};
  var row = findRow_(sh, h, cafe);
  if (row === -1) {
    // Café not in the sheet yet: add a row so nothing is lost
    row = sh.getLastRow() + 1;
    setCells_(sh, h, row, { Number: cafe.number || '', Name: cafe.name || '', Address: cafe.address || '', Borough: cafe.borough || '', Zipcode: cafe.zip || '' });
  }
  var folder = cafeFolder_(cafe);
  var photos = body.photos || [];
  var scoutName = body.scoutName || user.name || user.email;
  setCells_(sh, h, row, {
    Status: 'In Review',
    ReviewStatus: 'In Review',
    HoursWeekday: f.hoursWeekday || '',
    HoursWeekend: f.hoursWeekend || '',
    WeekendRestrictions: f.weekendRestrictions || '',
    Environment: f.environment || '',
    WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
    Seats: f.seats || '', SeatsType: f.seatsType || '',
    TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '',
    Notes: f.notes || '',
    ScoutName: scoutName,
    SubmittedBy: user.email,
    DateScouted: today_(),
    PhotoIds: JSON.stringify(photos),
    DriveFolderUrl: folder.getUrl(),
    SendBackNote: '',
  });

  var reviewLink = SITE_URL + '?review=' + encodeURIComponent(cafe.id || '');
  var lines = [
    '*' + (cafe.name || 'Café') + '* · ' + (cafe.borough || '') + '\n' + (cafe.address || ''),
    '*Scout:* ' + scoutName + '   *Hours:* M–F ' + f.hoursWeekday + ' · Sat–Sun ' + f.hoursWeekend,
    '*WiFi* ' + f.wifi + (f.wifi === 'YES' ? ' (secured ' + f.secured + ')' : '') + '  ·  *Outlets* ' + f.outlets + '  ·  *Hot food* ' + f.hotFood + '  ·  *Restroom* ' + f.restroom,
    '*Seats* ' + f.seats + ' · ' + f.seatsType,
    '*Weekend laptop restrictions:* ' + (f.weekendRestrictions === 'TRUE' ? 'Yes' : 'No') + '   *Other restrictions:* ' + (f.anyRestrictions === 'TRUE' ? f.restrictions : 'None'),
    '*Vibe:* ' + f.environment,
    f.notes ? '*Notes:* ' + f.notes : '',
    photos.length + ' photo/video' + (photos.length === 1 ? '' : 's') + ' · <' + folder.getUrl() + '|Drive folder>',
    '<' + reviewLink + '|🔎 Review & approve in the scout map>'
  ].filter(String);
  var images = photos.filter(function (p) { return !p.isVideo; }).slice(0, 4).map(function (p) {
    return { type: 'image', image_url: 'https://lh3.googleusercontent.com/d/' + p.id + '=w800', alt_text: p.name || 'photo' };
  });
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '📬 New café submission: ' + (cafe.name || ''), lines.join('\n'), images);
  return { row: row };
}

function handleFlagAddress_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row !== -1) setCells_(sh, h, row, { AddressFlag: 'reported', AddressFlagNote: (body.note || '') + ' — ' + (body.scoutName || user.email) + ', ' + now_() });
  postSlack_('SLACK_ADDRESS_WEBHOOK', '📍 Address flagged: ' + (cafe.name || ''),
    '*' + (cafe.name || '') + '*\nListed as: ' + (cafe.address || '') + '\n*Scout says:* ' + (body.note || '') + '\n_— ' + (body.scoutName || user.email) + '_\n' +
    'Fix it with the ✏️ button on the café in the scout map, then clear the flag in the sheet (AddressFlag column).', []);
  return {};
}

function handleGetSubmission_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var row = findRow_(sh, h, body.cafe || {});
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var r = getRowObj_(sh, h, row);
  var photos = [];
  try { photos = JSON.parse(r.PhotoIds || '[]'); } catch (e) {}
  photos = photos.map(function (p) { var i = fileInfo_({ getId: function () { return p.id; } }); return { id: p.id, name: p.name, isVideo: !!p.isVideo, thumb: i.thumbUrl, url: i.viewUrl }; });
  var listing = [];
  try { listing = JSON.parse(r.ListingPhotoIds || '[]'); } catch (e) {}
  return { submission: {
    submittedBy: r.ScoutName || r.SubmittedBy, dateScouted: r.DateScouted, website: r.Website,
    hoursWeekday: r.HoursWeekday, hoursWeekend: r.HoursWeekend, weekendRestrictions: String(r.WeekendRestrictions || ''),
    environment: r.Environment, description: r.Description,
    wifi: String(r.WiFi || ''), secured: String(r.Secured || ''), outlets: String(r.Outlets || ''), hotFood: String(r.HotFood || ''), restroom: String(r.Restroom || ''),
    seats: r.Seats, seatsType: r.SeatsType, anyRestrictions: String(r.TimeRestriction || ''), restrictions: r.RestrictionAmount, notes: r.Notes,
    photos: photos, listingPhotoIds: listing, folderUrl: r.DriveFolderUrl,
    addressFlag: r.AddressFlag, addressFlagNote: r.AddressFlagNote
  } };
}

function handleApprove_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {}, f = body.fields || {};
  var row = findRow_(sh, h, cafe);
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  setCells_(sh, h, row, {
    Status: 'Visit Completed', ReviewStatus: 'Approved',
    Website: f.website || '', HoursWeekday: f.hoursWeekday || '', HoursWeekend: f.hoursWeekend || '',
    WeekendRestrictions: f.weekendRestrictions || '', Environment: f.environment || '',
    Description: f.description || f.environment || '',
    WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
    Seats: f.seats || '', SeatsType: f.seatsType || '',
    TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '', Notes: f.notes || '',
    ListingPhotoIds: JSON.stringify(f.listingPhotoIds || []),
    ApprovedBy: user.email, ApprovedAt: now_(),
  });
  CacheService.getScriptCache().remove('markers_csv');
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '✅ Approved: ' + (cafe.name || ''),
    '*' + (cafe.name || '') + '* is live on the public map with ' + (f.listingPhotoIds || []).length + ' photo(s). Approved by ' + user.email + '.', []);
  return {};
}

function handleSendBack_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row !== -1) setCells_(sh, h, row, { Status: 'Needs Revisit', ReviewStatus: 'Sent back', SendBackNote: (body.note || '') + ' — ' + user.email + ', ' + now_() });
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '↩ Sent back: ' + (cafe.name || ''), '*' + (cafe.name || '') + '* was sent back to the scout.\n*Note:* ' + (body.note || '') + '\n_— ' + user.email + '_', []);
  return {};
}

// ------------------------------------------------------------ slack
function postSlack_(propName, title, text, images) {
  var url = PropertiesService.getScriptProperties().getProperty(propName);
  if (!url) return; // Slack not set up yet — the sheet still has everything
  var blocks = [
    { type: 'header', text: { type: 'plain_text', text: title.substring(0, 150) } },
    { type: 'section', text: { type: 'mrkdwn', text: text.substring(0, 2900) } }
  ].concat(images || []);
  var payload = { text: title, blocks: blocks };
  var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200 && images && images.length) {
    // Slack sometimes rejects image blocks it can't fetch — retry without them
    payload.blocks = blocks.slice(0, 2);
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  }
}

// ------------------------------------------------------------ public map feed
function buildMarkersCsv_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('markers_csv');
  if (cached) return cached;
  var sh = sheet_(), h = ensureColumns_(sh);
  var last = sh.getLastRow();
  var cols = ['Name', 'Address', 'Zipcode', 'County', 'Latitude', 'Longitude', 'Description', 'Highlight', 'WiFi', 'Secured', 'Outlets', 'HotFood', 'Restroom', 'Seats', 'TimeRestriction', 'RestrictionAmount', 'ScoutName', 'Website', 'HoursWeekday', 'HoursWeekend', 'WeekendRestrictions', 'SeatsType', 'Notes', 'Photo', 'Photos'];
  var lines = [cols.join(',')];
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
    data.forEach(function (vals) {
      var r = {};
      Object.keys(h).forEach(function (k) { r[k] = vals[h[k] - 1]; });
      if (String(r.Status).trim() !== 'Visit Completed') return;
      if (!r.Latitude || !r.Longitude) return;
      var listing = [];
      try { listing = JSON.parse(r.ListingPhotoIds || '[]'); } catch (e) {}
      var photoUrls = listing.map(function (id) { return 'https://lh3.googleusercontent.com/d/' + id + '=w800'; });
      r.County = r.Borough;
      r.Photo = photoUrls[0] || '';
      r.Photos = photoUrls.join(' ');
      lines.push(cols.map(function (c) { return csvCell_(r[c]); }).join(','));
    });
  }
  var csv = lines.join('\n');
  try { cache.put('markers_csv', csv, 300); } catch (e) {}
  return csv;
}
function csvCell_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
