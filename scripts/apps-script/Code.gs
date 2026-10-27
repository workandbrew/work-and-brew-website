/**
 * Work & Brew: Scout Workflow backend
 * ------------------------------------------------------------
 * Apps Script project (standalone or bound to the sheet, either works; it opens the
 * spreadsheet by SPREADSHEET_ID). Deployed as a Web App: Execute as "Me", access "Anyone".
 *
 * What it does
 *   POST upload        → saves a photo/video into the café's Drive folder
 *   POST submit        → writes the scout's answers to the sheet, pings #cafe-submissions
 *   POST flagAddress   → marks the address as reported, pings #address-corrections
 *   POST resolveMaps   → opens a Google Maps share link and returns the full address of the place
 *   POST lookupZip     → finds the zip code for a street address (US Census address finder)
 *   POST getSubmission → returns a submission for the review screen
 *   POST saveReview    → approver saves edits without approving (status unchanged)
 *   POST assign / assignmentList / editCafe → assignments with due dates, café name/address fixes
 *   POST leadList/leadSave/leadReset → Scout Lead assignment (approvers only)
 *   POST approve       → finalizes the row (Status = Visit Completed), pings Slack
 *   POST sendBack      → Status = Incomplete, pings Slack with the note
 *   POST removeUpload  → trashes a file the scout removed before submitting
 *   POST setStatus     → approver moves a café (e.g. Visit Completed → Official Cafe Listing)
 *   GET  ?action=markers → CSV of Official Cafe Listing cafés for the public map (60s cache)
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
  'AssignedTo', 'AssignedAt', 'DueAt', 'LeadLink', 'LeadAddr', 'AddressFlag', 'AddressFlagNote', 'AddressFlagName', 'AddressFlagAddr', 'ApprovedBy', 'ApprovedAt', 'SendBackNote', 'ChainFlag', 'SubmittedAt', 'VideosTexted', 'HoursByDay', 'PrevStatus', 'AfterHours'
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
      case 'suggestCafe':   out = handleSuggestCafe_(body, user); break;
      case 'resolveMaps':   out = handleResolveMaps_(body, user); break;
      case 'lookupZip':     out = handleLookupZip_(body, user); break;
      case 'readWebsite':   out = handleReadWebsite_(body, user); break;
      case 'listSuggestions':   out = handleListSuggestions_(body, user); break;
      case 'approveSuggestion': out = handleApproveSuggestion_(body, user); break;
      case 'rejectSuggestion':  out = handleRejectSuggestion_(body, user); break;
      case 'listCorrections':   out = handleListCorrections_(body, user); break;
      case 'resolveCorrection': out = handleResolveCorrection_(body, user); break;
      case 'getSubmission': out = handleGetSubmission_(body, user); break;
      case 'approve':       out = handleApprove_(body, user); break;
      case 'assign':        out = handleAssign_(body, user); break;
      case 'assignmentList': out = handleAssignmentList_(body, user); break;
      case 'editCafe':      out = handleEditCafe_(body, user); break;
      case 'leadList':      out = handleLeadList_(body, user); break;
      case 'leadSave':      out = handleLeadSave_(body, user); break;
      case 'leadReset':     out = handleLeadReset_(body, user); break;
      case 'saveReview':    out = handleSaveReview_(body, user); break;
      case 'sendBack':      out = handleSendBack_(body, user); break;
      case 'setStatus':     out = handleSetStatus_(body, user); break;
      case 'listCafes':     out = handleListCafes_(body, user); break;
      case 'syncCafes':     out = handleSyncCafes_(body, user); break;
      case 'deleteCafe':    out = handleDeleteCafe_(body, user); break;
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
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'workandbrew-scout-api', version: 'v22 two-step hours + after hours' })).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------ auth
var TEAM_ACCESS_URL = 'https://workandbrew.app/api/hub?access=1';

function verifyUser_(token) {
  if (!token) throw new Error('Please log in to the scout map first.');
  var cache = CacheService.getScriptCache();
  var ck = 'u_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).substring(0, 40);
  var cached = cache.get(ck);
  if (cached) return JSON.parse(cached);
  var res = UrlFetchApp.fetch(SUPABASE_URL + '/auth/v1/user', {
    method: 'get', muteHttpExceptions: true,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (res.getResponseCode() !== 200) throw new Error('Your login expired. Refresh the map and log in again.');
  var u = JSON.parse(res.getContentText());
  var user = { email: (u.email || '').toLowerCase(), name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '' };
  // Team members only: the website checks the email against its team_access list.
  var team = UrlFetchApp.fetch(TEAM_ACCESS_URL, { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + token } });
  var access = {};
  try { access = JSON.parse(team.getContentText()); } catch (e) {}
  if (!access.map) throw new Error('The café map is for Work & Brew team members only.');
  try { cache.put(ck, JSON.stringify(user), 600); } catch (e) {}
  return user;
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
  var nums = numCol ? sh.getRange(2, numCol, last - 1, 1).getValues() : [];
  var wantNum = norm_(cafe.number), wantName = norm_(cafe.name), wantAddr = norm_(cafe.address);
  if (wantNum && numCol) {
    for (var i = 0; i < nums.length; i++) if (norm_(nums[i][0]) === wantNum) return i + 2;
  }
  var names = sh.getRange(2, nameCol, last - 1, 1).getValues();
  var addrs = addrCol ? sh.getRange(2, addrCol, last - 1, 1).getValues() : [];
  var byName = -1;
  for (var j = 0; j < names.length; j++) {
    if (norm_(names[j][0]) !== wantName) continue;
    if (wantAddr && addrCol && norm_(addrs[j][0]) === wantAddr) return j + 2;
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
function statusLabel_(st) {
  st = String(st || '');
  if (st === 'Official Cafe Listing') return 'Official Cafe Listing (live on the public map)';
  if (st === 'Visit Completed') return 'Complete (scouted, not on the official map yet)';
  if (st === 'In Review') return 'In Review (still waiting for approval)';
  if (st === 'Needs Revisit' || st === 'Incomplete') return 'Incomplete (sent back to the scout)';
  if (st === 'New Cafe Added') return 'New Cafe Added (location being checked)';
  if (st === 'Assigned' || st === 'Unvisited' || st === 'Ready To Be Assigned' || st === '') return 'Not scouted yet (' + (st === 'Assigned' ? st : 'Ready To Be Assigned') + ')';
  return st;
}
function now_() { return Utilities.formatDate(new Date(), 'America/New_York', 'MMM d, yyyy h:mm a'); }
function today_() { return Utilities.formatDate(new Date(), 'America/New_York', 'MMM d, yyyy'); }

// ------------------------------------------------------------ drive helpers
function parentFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DRIVE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('Work & Brew Café Photos');
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
  var isCorrection = !!body.correction;
  var isEdit = !!body.editRequest;
  var before = getRowObj_(sh, h, row);
  var prevStatus = String(before.Status || '');
  // An edit to a live or completed café remembers where it came from so Approve can put it back
  var keepPrev = isEdit && (prevStatus === 'Official Cafe Listing' || prevStatus === 'Visit Completed');
  setCells_(sh, h, row, {
    Status: 'In Review',
    PrevStatus: keepPrev ? prevStatus : '',
    ReviewStatus: isEdit ? 'Edits' : isCorrection ? 'Correction' : 'In Review',
    HoursWeekday: f.hoursWeekday || '',
    HoursWeekend: f.hoursWeekend || '',
    HoursByDay: f.hoursByDay || '',
    AfterHours: f.afterHours || '',
    WeekendRestrictions: f.weekendRestrictions || '',
    Environment: f.environment || '',
    Highlight: f.highlight || '',
    WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
    Seats: f.seats || '', SeatsType: f.seatsType || '',
    TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '',
    Notes: f.notes || '',
    ChainFlag: f.chainFlag === 'TRUE' ? 'reported' : '',
    ScoutName: scoutName,
    SubmittedBy: user.email,
    DateScouted: today_(),
    SubmittedAt: now_(),
    VideosTexted: f.videosTexted === 'TRUE' ? 'TRUE' : 'FALSE',
    PhotoIds: JSON.stringify(photos),
    DriveFolderUrl: folder.getUrl(),
    SendBackNote: '',
  });

  var reviewLink = SITE_URL + '?review=' + encodeURIComponent(cafe.id || '');
  if (body.manual) {
    postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '⚠️ Marked complete without the form: ' + (cafe.name || ''),
      '*' + (cafe.name || '') + '* · ' + (cafe.borough || '') + '\n' + (cafe.address || '') + '\n*Scout:* ' + scoutName +
      ' set this café to Visit Completed from the status menu, so there are no form answers or photos yet.\n' +
      (f.notes ? '*Notes:* ' + f.notes + '\n' : '') +
      'Ask them to open it and use 📝 Scout this café, or fill it in yourself on review.\n<' + reviewLink + '|🔎 Open in the scout map>', [], true);
    return { row: row, manual: true };
  }
  if (isEdit || isCorrection) {
    postSlack_('SLACK_SUBMISSIONS_WEBHOOK', 'CAFE EDITS/CORRECTION NEED REVIEW: ' + (cafe.name || ''),
      'A scout has submitted an edit/correction to the listed cafe that needs to be reviewed, details provided in form.\n' +
      '*' + (cafe.name || 'Café') + '* · ' + (cafe.borough || '') + '\n' + (cafe.address || '') + '\n_Sent by ' + scoutName + '_\n' +
      '*Status:* ' + statusLabel_(prevStatus) + '\n<' + reviewLink + '|Review & approve changes in the scout map>', [], true);
    return { row: row };
  }
  var lines = [
    '*' + (cafe.name || 'Café') + '* · ' + (cafe.borough || '') + '\n' + (cafe.address || ''),
    '*Scout:* ' + scoutName + '\n*Hours:* ' + f.hoursWeekday + '; ' + f.hoursWeekend + '\n*After hours:* ' + (f.afterHours || 'None'),
    '*WiFi* ' + f.wifi + (f.wifi === 'YES' ? ' (secured ' + f.secured + ')' : '') + '  ·  *Outlets* ' + f.outlets + '  ·  *Hot food* ' + f.hotFood + '  ·  *Restroom* ' + f.restroom,
    '*Seats* ' + f.seats + ' · ' + f.seatsType,
    '*Weekend laptop restrictions:* ' + (f.weekendRestrictions === 'TRUE' ? 'Yes' : 'No') + '   *Other restrictions:* ' + (f.anyRestrictions === 'TRUE' ? f.restrictions : 'None'),
    '*Vibe:* ' + f.environment,
    '*Highlight:* ' + (f.highlight || ''),
    f.notes ? '*Notes:* ' + f.notes : '',
    f.chainFlag === 'TRUE' ? '⛓ *Scout says this is a chain café* (confirm on review)' : '',
    f.videosTexted === 'TRUE' ? '📱 *Scout texted videos to the work phone*' : '',
    photos.length + ' photo/video' + (photos.length === 1 ? '' : 's') + ' · <' + folder.getUrl() + '|Drive folder>',
    '<' + reviewLink + '|🔎 Review & approve in the scout map>'
  ].filter(String);
  var images = photos.filter(function (p) { return !p.isVideo; }).slice(0, 4).map(function (p) {
    return { type: 'image', image_url: 'https://lh3.googleusercontent.com/d/' + p.id + '=w800', alt_text: p.name || 'photo' };
  });
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', (isEdit ? '✏️ CAFÉ EDITS NEED REVIEW: ' : isCorrection ? '🔁 RESUBMIT CORRECTION: ' : '📬 New café submission: ') + (cafe.name || ''),
    (isEdit ? '_A scout says something changed at this café (was: ' + (prevStatus || 'n/a') + '). Approve to update the listing' + (keepPrev ? ' and it goes back to ' + prevStatus : '') + '._\n'
      : isCorrection ? '_The scout edited and resubmitted this café. Latest version below._\n' : '') + lines.join('\n'), images, true);
  return { row: row };
}

function handleFlagAddress_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row !== -1) setCells_(sh, h, row, { AddressFlag: 'reported', AddressFlagNote: (body.note || '') + ' (' + (body.scoutName || user.email) + ', ' + now_() + ')', AddressFlagName: body.newName || '', AddressFlagAddr: body.newAddress || '' });
  var cLink = SITE_URL + '?corrections=1&cafe=' + encodeURIComponent(cafe.number || '');
  postSlack_('SLACK_ADDRESS_WEBHOOK', 'Address or name flagged: ' + (cafe.name || ''),
    'A scout has submitted a cafe name/address correction for review.\n' +
    '*Listed as:* ' + (cafe.name || '') + ', ' + (cafe.address || '') + '\n' +
    (body.newName || body.newAddress ? '*Corrected to:* ' + (body.newName || cafe.name || '') + ', ' + (body.newAddress || cafe.address || '') + '\n' : '') +
    (body.note ? '*Scout says:* ' + body.note + '\n' : '') +
    '_From: ' + (body.scoutName || user.email) + '_\n<' + cLink + '|Click here to approve or reject corrections>', [], true);
  return {};
}

// ------------------------------------------------------------ café suggestions
// A scout found a café that is not on the map. Two kinds:
//   Full  = a complete café form (photos, hours, everything) for a café that is not in the database yet
//   Quick = only the location ("in a rush"), for someone else to scout later
// Both wait on the "Café Suggestions" tab until an approver accepts them from the Review tab. Only then
// do they join the main sheet and the map. A Full one lands in In Review so the usual review and
// publish step follows; a Quick one lands as New Cafe Added until David checks its location.
var SUGGEST_SHEET = 'Café Suggestions';
var SUGGEST_COLS = ['SuggestedAt', 'SuggestedBy', 'Name', 'Address', 'Borough', 'Type', 'Latitude', 'Longitude', 'Decision', 'DecidedBy', 'DecidedAt', 'Note', 'Kind', 'MapsLink', 'FormJson', 'PhotoIds'];
function suggestSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SUGGEST_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SUGGEST_SHEET);
    sh.getRange(1, 1, 1, SUGGEST_COLS.length).setValues([SUGGEST_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  // an older version of this tab may have fewer columns: add the missing headers
  var have = sh.getLastColumn();
  if (have < SUGGEST_COLS.length) {
    sh.getRange(1, have + 1, 1, SUGGEST_COLS.length - have).setValues([SUGGEST_COLS.slice(have)]).setFontWeight('bold');
  }
  return sh;
}
function handleSuggestCafe_(body, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return suggestCafeLocked_(body, user); } finally { lock.releaseLock(); }
}
function suggestCafeLocked_(body, user) {
  var c = body.cafe || {}, f = body.form || {};
  if (!c.name) throw new Error('Café name is required.');
  var full = !!body.full;
  var who = body.scoutName || user.email;
  var photos = body.photos || [];
  var sh = suggestSheet_();
  // Same café sent twice (double tap, bad signal): keep only the first one waiting for approval
  var wantKey = norm_(c.name) + '|' + norm_(c.address);
  var lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    var existing = sh.getRange(2, 1, lastRow - 1, 9).getValues();
    for (var q = 0; q < existing.length; q++) {
      if (String(existing[q][8]) === 'Pending' && (norm_(existing[q][2]) + '|' + norm_(existing[q][3])) === wantKey) return { duplicate: true };
    }
  }
  sh.appendRow([now_(), who, c.name, c.address || '', c.borough || '', c.type || '', c.lat || '', c.lng || '', 'Pending', '', '', '',
    full ? 'Full' : 'Quick', body.mapsLink || '', full ? JSON.stringify(f) : '', full ? JSON.stringify(photos) : '']);
  var link = '<' + SITE_URL + '?suggestions=1&row=' + sh.getLastRow() + '|Open it in the scout map to approve or reject>';
  if (full) {
    var folder = cafeFolder_({ name: c.name });
    var lines = [
      '*' + c.name + '* · ' + (c.borough || '') + '\n' + (c.address || '') + (c.type ? '\nType: ' + c.type : '') + (body.mapsLink ? '\n<' + body.mapsLink + '|Link used to find it>' : ''),
      '*Scout:* ' + who + '\n*Hours:* ' + (f.hoursWeekday || '') + '; ' + (f.hoursWeekend || ''),
      '*WiFi* ' + f.wifi + (f.wifi === 'YES' ? ' (secured ' + f.secured + ')' : '') + '  ·  *Outlets* ' + f.outlets + '  ·  *Hot food* ' + f.hotFood + '  ·  *Restroom* ' + f.restroom,
      '*Seats* ' + f.seats + ' · ' + f.seatsType,
      '*Weekend laptop restrictions:* ' + (f.weekendRestrictions === 'TRUE' ? 'Yes' : 'No') + '   *Other restrictions:* ' + (f.anyRestrictions === 'TRUE' ? f.restrictions : 'None'),
      '*Vibe:* ' + (f.environment || ''),
      '*Highlight:* ' + (f.highlight || ''),
      f.notes ? '*Notes:* ' + f.notes : '',
      photos.length + ' photo/video' + (photos.length === 1 ? '' : 's') + ' · <' + folder.getUrl() + '|Drive folder>',
      link
    ].filter(String);
    var images = photos.filter(function (p) { return !p.isVideo; }).slice(0, 4).map(function (p) {
      return { type: 'image', image_url: 'https://lh3.googleusercontent.com/d/' + p.id + '=w800', alt_text: p.name || 'photo' };
    });
    postSlack_('SLACK_SUBMISSIONS_WEBHOOK', 'NEW CAFE SCOUTED (not on the map yet): ' + c.name,
      'A scout has completed scouting a café and submitted their form, ready for review. Approve it to add it to the map and the database.\n' + lines.join('\n'), images, true);
  } else {
    postSlack_('SLACK_SUBMISSIONS_WEBHOOK', 'NEW CAFE ALERT (Not scouted yet): ' + c.name,
      'A scout has found an eligible cafe and was unable to scout the area properly, location has been submitted. It is confirmed NOT on the map yet.\n*' + c.name + '*\n' +
      (c.address || '') + (c.borough ? ', ' + c.borough : '') + (c.type ? '\nType: ' + c.type : '') +
      (body.mapsLink ? '\n<' + body.mapsLink + '|Link used to find it>' : '') + '\n_Found by ' + who + '_\n' + link, [], true);
  }
  return {};
}
// A phone "share" link (maps.app.goo.gl/...) hides the café details behind redirects the browser cannot follow.
// Follow them here and hand back the final Google Maps address, which holds the name and the coordinates.
function handleResolveMaps_(body, user) {
  var url = String(body.url || '');
  var ok = function (u) { return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|www\.google\.com\/maps|maps\.google\.com|google\.com\/maps)/i.test(u); };
  if (!ok(url)) throw new Error('That is not a Google Maps link.');
  for (var i = 0; i < 6; i++) {
    var res = UrlFetchApp.fetch(url, { followRedirects: false, muteHttpExceptions: true });
    var code = res.getResponseCode();
    if (code < 300 || code >= 400) break;
    var h = res.getHeaders();
    var loc = h['Location'] || h['location'];
    if (!loc || !ok(loc)) break;
    url = loc;
  }
  return { url: url };
}
// A café's own website: read the page and pull out its name and street address (schema.org data first, then plain text)
function handleReadWebsite_(body, user) {
  var url = String(body.url || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('That is not a website link.');
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/i.test(url)) throw new Error('That is not a public website.');
  var res = UrlFetchApp.fetch(url, { followRedirects: true, muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkAndBrewBot/1.0)' } });
  if (res.getResponseCode() >= 400) throw new Error('Could not open that website.');
  var html = res.getContentText().substring(0, 600000);
  var out = { name: '', address: '', locality: '', zip: '', lat: '', lng: '' };
  var pickAddr = function (a) {
    if (!a) return;
    if (typeof a === 'string') { if (!out.address) out.address = a; return; }
    if (a.streetAddress && !out.address) out.address = String(a.streetAddress);
    if (a.addressLocality && !out.locality) out.locality = String(a.addressLocality);
    if (a.postalCode && !out.zip) out.zip = String(a.postalCode).substring(0, 5);
  };
  var walk = function (n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n['@graph']) walk(n['@graph']);
    if (n.address) { pickAddr(n.address); if (!out.name && n.name) out.name = String(n.name); }
    if (n.geo && n.geo.latitude && !out.lat) { out.lat = Number(n.geo.latitude); out.lng = Number(n.geo.longitude); }
  };
  var re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(html))) { try { walk(JSON.parse(m[1])); } catch (e) {} }
  var text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  if (!out.address || !out.locality) {
    var am = text.match(/(\d{1,5}[A-Za-z]?\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9 .'-]{2,40}?(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Place|Pl|Drive|Dr|Lane|Ln|Court|Ct|Broadway|Parkway|Pkwy|Way|Square|Sq)\.?)(?:,?\s*(?:Suite|Ste|Unit|Fl|Floor)\.?\s*[A-Za-z0-9-]+)?,?\s*(Bronx|Brooklyn|Queens|New York|Manhattan|Staten Island|Astoria|Long Island City|Flushing|Jamaica|Ridgewood|Harlem)\b[^0-9]{0,15}(1[0-4]\d{3})?/i);
    if (am) { if (!out.address) out.address = am[1]; if (!out.locality) out.locality = am[2]; if (!out.zip && am[3]) out.zip = am[3]; }
  }
  if (!out.name) {
    var og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
    var tt = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    out.name = og ? og[1] : (tt ? tt[1].split(/\s[|\u2013\u2014-]\s/)[0] : '');
  }
  out.name = out.name.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
  if (!out.address && !out.name) throw new Error('Could not find a name or address on that website.');
  return out;
}
// Zip code from the US Census address finder (more reliable than map data, and a browser is not allowed to call it)
function handleLookupZip_(body, user) {
  if (!String(body.address || '').trim()) return { zip: '' };
  return geocode_(body.address, body.borough);
}
// Address -> zip and coordinates: the US Census finder first, Google Maps if it has no match
function geocode_(address, borough) {
  var addr = String(address || '').replace(/\s+/g, ' ').trim();
  if (!addr) return { zip: '', lat: '', lng: '' };
  var boro = String(borough || '').trim();
  var q = /new york|, ny\b|bronx|brooklyn|queens|manhattan|staten island/i.test(addr) ? addr : addr + ', ' + boro + ', NY';
  var zip = '', lat = '', lng = '';
  try {
    var res = UrlFetchApp.fetch('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(q), { muteHttpExceptions: true });
    var m = JSON.parse(res.getContentText()).result.addressMatches;
    if (m && m.length) { zip = String((m[0].addressComponents || {}).zip || ''); lat = (m[0].coordinates || {}).y || ''; lng = (m[0].coordinates || {}).x || ''; }
  } catch (e) {}
  if (!lat || !lng) {
    try {
      var g = Maps.newGeocoder().geocode(q);
      if (g.status === 'OK' && g.results.length) { lat = g.results[0].geometry.location.lat; lng = g.results[0].geometry.location.lng; }
    } catch (e) {}
  }
  return { zip: zip, lat: lat, lng: lng };
}
function handleListSuggestions_(body, user) {
  requireApprover_(user);
  var sh = suggestSheet_(), last = sh.getLastRow(), out = [];
  if (last < 2) return { suggestions: out };
  var vals = sh.getRange(2, 1, last - 1, SUGGEST_COLS.length).getValues();
  vals.forEach(function (v, i) {
    if (String(v[8]) !== 'Pending') return;
    var pc = 0, ph = [];
    try {
      var pl = JSON.parse(v[15] || '[]'); pc = pl.length;
      ph = pl.map(function (p) { var fi = fileInfo_({ getId: function () { return p.id; } }); return { id: p.id, name: p.name, isVideo: !!p.isVideo, thumb: fi.thumbUrl, url: fi.viewUrl }; });
    } catch (e) {}
    out.push({ row: i + 2, at: v[0], by: v[1], name: v[2], address: v[3], borough: v[4], type: v[5], lat: v[6], lng: v[7], kind: v[12] || 'Quick', mapsLink: v[13] || '', photoCount: pc, photos: ph });
  });
  return { suggestions: out };
}
function handleApproveSuggestion_(body, user) {
  requireApprover_(user);
  // Two taps in a row must not add the same café twice: the second waits for the first, then sees it is handled
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return approveSuggestionLocked_(body, user); } finally { lock.releaseLock(); }
}
function approveSuggestionLocked_(body, user) {
  var ssh = suggestSheet_(), r = Number(body.row);
  if (!r || r < 2) throw new Error('Bad suggestion row');
  var v = ssh.getRange(r, 1, 1, SUGGEST_COLS.length).getValues()[0];
  if (String(v[8]) !== 'Pending') throw new Error('This suggestion was already handled.');
  var full = String(v[12]) === 'Full';
  var c = { name: v[2], address: v[3], borough: v[4], type: v[5], lat: v[6], lng: v[7], kind: full ? 'Full' : 'Quick', status: full ? 'In Review' : 'New Cafe Added' };
  var sh = sheet_(), h = ensureColumns_(sh);
  var last = sh.getLastRow(), maxNum = 0;
  // Already on the map? Stop here so approving a repeat cannot add the café twice.
  if (last >= 2 && h.Name) {
    var nm = norm_(c.name), ad = norm_(c.address);
    var nms = sh.getRange(2, h.Name, last - 1, 1).getValues();
    var ads = h.Address ? sh.getRange(2, h.Address, last - 1, 1).getValues() : [];
    var nums0 = h.Number ? sh.getRange(2, h.Number, last - 1, 1).getValues() : [];
    for (var z = 0; z < nms.length; z++) {
      if (norm_(nms[z][0]) === nm && (!ad || !ads.length || norm_(ads[z][0]) === ad)) {
        ssh.getRange(r, 9, 1, 4).setValues([['Rejected', user.email, now_(), 'Duplicate of ' + (nums0.length ? nums0[z][0] : 'a café already on the map')]]);
        throw new Error('This café is already on the map' + (nums0.length ? ' (' + nums0[z][0] + ')' : '') + '. I marked this repeat as rejected so you only keep one.');
      }
    }
  }
  if (last >= 2 && h.Number) {
    sh.getRange(2, h.Number, last - 1, 1).getValues().forEach(function (x) {
      var n = parseInt(String(x[0]).replace(/[^0-9]/g, ''), 10);
      if (n > maxNum) maxNum = n;
    });
  }
  c.number = '#' + (maxNum + 1);
  var zipM = String(c.address || '').match(/\b(1[0-9]{4})\b/);
  c.zip = zipM ? zipM[1] : '';
  var row = last + 1;
  var cells = {
    Number: c.number, Name: c.name, isChain: 'FALSE', Address: c.address, Borough: c.borough,
    Zipcode: c.zip, Latitude: c.lat || '', Longitude: c.lng || '', Status: c.status,
    AssignedTo: '', ConfirmedQualifies: '', Source: 'Scout suggestion: ' + (c.type || '') + ' (by ' + v[1] + ')',
    SubmittedBy: v[1], SubmittedAt: v[0]
  };
  if (full) {
    var f = {}, photos = [];
    try { f = JSON.parse(v[14] || '{}'); } catch (e) {}
    try { photos = JSON.parse(v[15] || '[]'); } catch (e) {}
    var folder = cafeFolder_({ name: c.name });
    var form = {
      ReviewStatus: 'New cafe', HoursWeekday: f.hoursWeekday || '', HoursWeekend: f.hoursWeekend || '', HoursByDay: f.hoursByDay || '', AfterHours: f.afterHours || '',
      WeekendRestrictions: f.weekendRestrictions || '', Environment: f.environment || '', Highlight: f.highlight || '',
      WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
      Seats: f.seats || '', SeatsType: f.seatsType || '', TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '',
      Notes: f.notes || '', ChainFlag: f.chainFlag === 'TRUE' ? 'reported' : '', ScoutName: v[1],
      DateScouted: today_(), VideosTexted: f.videosTexted === 'TRUE' ? 'TRUE' : 'FALSE',
      PhotoIds: JSON.stringify(photos), DriveFolderUrl: folder.getUrl()
    };
    Object.keys(form).forEach(function (k) { cells[k] = form[k]; });
    // Rename the photos you named in Drive, and keep the ones you picked for the listing
    var names = body.photoNames || {};
    Object.keys(names).forEach(function (id) {
      try {
        var file = DriveApp.getFileById(id), oldName = file.getName();
        var em = oldName.match(/\.[A-Za-z0-9]{2,5}$/), ext = em ? em[0] : '';
        var label = String(names[id]).replace(/[\/\\:*?"<>|]/g, '').trim();
        if (!label) return;
        var pre = String(c.name || '').trim();
        var nn = (pre && label.toLowerCase().indexOf(pre.toLowerCase()) !== 0 ? pre + ' - ' : '') + label + ext;
        if (nn !== oldName) file.setName(nn);
        photos.forEach(function (p) { if (p.id === id) p.name = nn; });
      } catch (e) {}
    });
    var ids = photos.map(function (p) { return p.id; });
    var picked = (body.listingPhotoIds || []).filter(function (id) { return ids.indexOf(id) !== -1; });
    if (!picked.length) picked = photos.filter(function (p) { return !p.isVideo; }).map(function (p) { return p.id; });
    cells.PhotoIds = JSON.stringify(photos);
    cells.ListingPhotoIds = JSON.stringify(picked);
    var complete = !!((f.hoursWeekday || f.hoursByDay) && f.environment && f.highlight && f.wifi && f.outlets && f.hotFood && f.restroom && f.seats && photos.length && picked.length >= 3);
    c.status = complete ? 'Visit Completed' : 'In Review';
    cells.Status = c.status;
    cells.ReviewStatus = complete ? 'Approved' : 'New cafe';
    if (complete) { cells.ApprovedBy = user.email; cells.ApprovedAt = now_(); }
  }
  // No pin yet? Look the address up so the café lands on the map.
  if (!c.lat || !c.lng) {
    var geo = geocode_(c.address, c.borough);
    if (geo.lat && geo.lng) { c.lat = geo.lat; c.lng = geo.lng; cells.Latitude = geo.lat; cells.Longitude = geo.lng; }
    if (!c.zip && geo.zip) { c.zip = geo.zip; cells.Zipcode = geo.zip; }
  }
  setCells_(sh, h, row, cells);
  SpreadsheetApp.flush();
  ssh.getRange(r, 9, 1, 3).setValues([['Approved', user.email, now_()]]);
  CacheService.getScriptCache().remove('markers_csv');
  var where = !full ? 'the main map as New Cafe Added (David checks the location, then it is Ready To Be Assigned)'
    : c.status === 'Visit Completed' ? 'the Complete list, ready to be pushed to the official map'
    : 'the Review tab (some info is still missing)';
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', 'Cafe added: ' + c.name,
    '*' + c.name + '* has successfully been added to ' + where + '. (' + c.number + '. Approved by ' + user.email + '.)', []);
  c.row = row;
  return { cafe: c };
}
// ---- name/address corrections a scout flagged
function handleListCorrections_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow(), out = [];
  if (last < 2) return { corrections: out };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  vals.forEach(function (v) {
    if (String(v[h.AddressFlag - 1]) !== 'reported') return;
    out.push({
      number: String(v[h.Number - 1] || ''), name: v[h.Name - 1], address: v[h.Address - 1], borough: v[h.Borough - 1],
      newName: String(v[h.AddressFlagName - 1] || ''), newAddress: String(v[h.AddressFlagAddr - 1] || ''),
      note: String(v[h.AddressFlagNote - 1] || '')
    });
  });
  return { corrections: out };
}
function handleResolveCorrection_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var cells = { AddressFlag: '', AddressFlagNote: '', AddressFlagName: '', AddressFlagAddr: '' };
  if (body.approve) {
    if (body.name) cells.Name = String(body.name);
    if (body.address) cells.Address = String(body.address);
    if (body.lat !== undefined && body.lat !== '') { cells.Latitude = body.lat; cells.Longitude = body.lng; }
  }
  setCells_(sh, h, row, cells);
  CacheService.getScriptCache().remove('markers_csv');
  postSlack_('SLACK_ADDRESS_WEBHOOK', (body.approve ? 'Correction approved: ' : 'Correction rejected: ') + (cafe.name || ''),
    body.approve ? '*' + (body.name || cafe.name) + '* now shows ' + (body.address || cafe.address) + '. Approved by ' + user.email + '.'
                 : 'The correction for *' + (cafe.name || '') + '* was not applied. Closed by ' + user.email + '.', []);
  return {};
}
function handleRejectSuggestion_(body, user) {
  requireApprover_(user);
  var ssh = suggestSheet_(), r = Number(body.row);
  if (!r || r < 2) throw new Error('Bad suggestion row');
  var v = ssh.getRange(r, 1, 1, SUGGEST_COLS.length).getValues()[0];
  ssh.getRange(r, 9, 1, 4).setValues([['Rejected', user.email, now_(), body.note || '']]);
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', 'Café suggestion not added: ' + v[2],
    '*' + v[2] + '* (' + (v[3] || '') + ') was not added by ' + user.email + '.' + (body.note ? '\n_' + body.note + '_' : ''), []);
  return {};
}

function handleGetSubmission_(body, user) {
  // Any logged-in scout may read a submission (the map shows non-approvers a read-only view)
  var sh = sheet_(), h = headers_(sh);
  var row = findRow_(sh, h, body.cafe || {});
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var r = getRowObj_(sh, h, row);
  var photos = [];
  try { photos = JSON.parse(r.PhotoIds || '[]'); } catch (e) {}
  photos = photos.map(function (p) { var i = fileInfo_({ getId: function () { return p.id; } }); return { id: p.id, name: p.name, isVideo: !!p.isVideo, thumb: i.thumbUrl, url: i.viewUrl }; });
  var listing = [];
  try { listing = JSON.parse(r.ListingPhotoIds || '[]'); } catch (e) {}
  return { submission: {
    submittedBy: r.ScoutName || r.SubmittedBy, dateScouted: r.DateScouted, submittedAt: r.SubmittedAt, reviewStatus: r.ReviewStatus, videosTexted: String(r.VideosTexted || ''), website: r.Website,
    hoursWeekday: r.HoursWeekday, hoursWeekend: r.HoursWeekend, hoursByDay: r.HoursByDay, afterHours: r.AfterHours, weekendRestrictions: String(r.WeekendRestrictions || ''),
    environment: r.Environment, highlight: r.Highlight, description: r.Description,
    chainFlag: String(r.ChainFlag || '') === 'reported' ? 'TRUE' : 'FALSE', isChain: String(r.isChain || '').toUpperCase(),
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
  if ((f.listingPhotoIds || []).length < 3) throw new Error('Pick at least 3 photos for the listing.');
  // Rename photos in Drive to the names chosen on review: "<Café> - <name>.<ext>"
  var names = f.photoNames || {};
  var current = getRowObj_(sh, h, row);
  var photoList = [];
  try { photoList = JSON.parse(current.PhotoIds || '[]'); } catch (e) {}
  Object.keys(names).forEach(function (id) {
    try {
      var file = DriveApp.getFileById(id);
      var oldName = file.getName();
      var extMatch = oldName.match(/\.[A-Za-z0-9]{2,5}$/);
      var ext = extMatch ? extMatch[0] : '';
      var label = String(names[id]).replace(/[\/\\:*?"<>|]/g, '').trim();
      if (!label) return;
      var prefix = (cafe.name || '').trim();
      var newName = (prefix && label.toLowerCase().indexOf(prefix.toLowerCase()) !== 0 ? prefix + ' - ' : '') + label + ext;
      if (newName !== oldName) file.setName(newName);
      photoList.forEach(function (p) { if (p.id === id) p.name = newName; });
    } catch (e) {}
  });
  var backTo = String(current.PrevStatus || '') === 'Official Cafe Listing' ? 'Official Cafe Listing' : 'Visit Completed';
  setCells_(sh, h, row, {
    PhotoIds: JSON.stringify(photoList),
    Status: backTo, ReviewStatus: 'Approved', PrevStatus: '',
    Website: f.website || '', HoursWeekday: f.hoursWeekday || '', HoursWeekend: f.hoursWeekend || '',
    WeekendRestrictions: f.weekendRestrictions || '', Environment: f.environment || '', Highlight: f.highlight || '',
    Description: f.description || f.environment || '',
    WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
    Seats: f.seats || '', SeatsType: f.seatsType || '',
    TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '', Notes: f.notes || '',
    ListingPhotoIds: JSON.stringify(f.listingPhotoIds || []),
    isChain: f.isChain ? 'TRUE' : 'FALSE', ChainFlag: '',
    ApprovedBy: user.email, ApprovedAt: now_(),
  });
  CacheService.getScriptCache().remove('markers_csv');
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '✅ Approved: ' + (cafe.name || ''),
    '*' + (cafe.name || '') + '* approved with ' + (f.listingPhotoIds || []).length + ' photo(s), now ' + backTo + '. Approved by ' + user.email + '.', []);
  return { status: backTo };
}

// Approvers save edits to a café's details (e.g. adding the website) without approving it or changing its status
function handleSaveReview_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {}, f = body.fields || {};
  var row = findRow_(sh, h, cafe);
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var names = f.photoNames || {};
  var current = getRowObj_(sh, h, row);
  var photoList = [];
  try { photoList = JSON.parse(current.PhotoIds || '[]'); } catch (e) {}
  Object.keys(names).forEach(function (id) {
    try {
      var file = DriveApp.getFileById(id);
      var oldName = file.getName();
      var extMatch = oldName.match(/\.[A-Za-z0-9]{2,5}$/);
      var ext = extMatch ? extMatch[0] : '';
      var label = String(names[id]).replace(/[\/\\:*?"<>|]/g, '').trim();
      if (!label) return;
      var prefix = (cafe.name || '').trim();
      var newName = (prefix && label.toLowerCase().indexOf(prefix.toLowerCase()) !== 0 ? prefix + ' - ' : '') + label + ext;
      if (newName !== oldName) file.setName(newName);
      photoList.forEach(function (p) { if (p.id === id) p.name = newName; });
    } catch (e) {}
  });
  setCells_(sh, h, row, {
    PhotoIds: JSON.stringify(photoList),
    Website: f.website || '', HoursWeekday: f.hoursWeekday || '', HoursWeekend: f.hoursWeekend || '',
    WeekendRestrictions: f.weekendRestrictions || '', Environment: f.environment || '', Highlight: f.highlight || '',
    Description: f.description || f.environment || '',
    WiFi: f.wifi || '', Secured: f.secured || '', Outlets: f.outlets || '', HotFood: f.hotFood || '', Restroom: f.restroom || '',
    Seats: f.seats || '', SeatsType: f.seatsType || '',
    TimeRestriction: f.anyRestrictions || '', RestrictionAmount: f.restrictions || '', Notes: f.notes || '',
    ListingPhotoIds: JSON.stringify(f.listingPhotoIds || []),
    isChain: f.isChain ? 'TRUE' : 'FALSE'
  });
  CacheService.getScriptCache().remove('markers_csv');
  return {};
}

// ------------------------------------------------------------ assignments
function ymdCell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/New_York', 'yyyy-MM-dd');
  return String(v || '');
}
// Approver assigns (or unassigns when scout is empty) a batch of cafés, with an assigned date and a due date.
function handleAssign_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow();
  if (last < 2) return {};
  var n = last - 1;
  var numCol = h.Number;
  var nums = numCol ? sh.getRange(2, numCol, n, 1).getValues() : [];
  var rowByNum = {};
  nums.forEach(function (v, i) { var k = norm_(v[0]); if (k) rowByNum[k] = i; });
  var cAssigned = sh.getRange(2, h.AssignedTo, n, 1).getValues();
  var cStatus = sh.getRange(2, h.Status, n, 1).getValues();
  var cAt = sh.getRange(2, h.AssignedAt, n, 1).getValues();
  var cDue = sh.getRange(2, h.DueAt, n, 1).getValues();
  var scout = String(body.scout || '');
  var done = 0;
  (body.cafes || []).forEach(function (c) {
    var i = rowByNum[norm_(c.number)];
    if (i === undefined) { var r = findRow_(sh, h, c); if (r === -1) return; i = r - 2; }
    cAssigned[i][0] = scout;
    var st = String(cStatus[i][0] || '');
    if (scout) {
      if (st === '' || st === 'Unvisited' || st === 'Ready To Be Assigned') cStatus[i][0] = 'Assigned';
      cAt[i][0] = String(body.assignedAt || '');
      cDue[i][0] = String(body.dueAt || '');
    } else {
      if (st === 'Assigned') cStatus[i][0] = 'Ready To Be Assigned';
      cAt[i][0] = ''; cDue[i][0] = '';
    }
    done++;
  });
  sh.getRange(2, h.AssignedAt, n, 1).setNumberFormat('@');
  sh.getRange(2, h.DueAt, n, 1).setNumberFormat('@');
  sh.getRange(2, h.AssignedTo, n, 1).setValues(cAssigned);
  sh.getRange(2, h.Status, n, 1).setValues(cStatus);
  sh.getRange(2, h.AssignedAt, n, 1).setValues(cAt);
  sh.getRange(2, h.DueAt, n, 1).setValues(cDue);
  return { updated: done };
}
// Any logged-in user: when each assigned café was assigned and when it is due (scouts see this in fine print)
function handleAssignmentList_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow(), items = [];
  if (last < 2 || !h.Number) return { items: items };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  vals.forEach(function (v) {
    var num = String(v[h.Number - 1] || '').trim();
    var at = ymdCell_(v[h.AssignedAt - 1]), due = ymdCell_(v[h.DueAt - 1]);
    if (num && (at || due)) items.push({ number: num, assignedAt: at, dueAt: due });
  });
  return { items: items };
}
// Approver fixes a café's name or address on the map: keep the sheet in step
function handleEditCafe_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var row = findRow_(sh, h, body.cafe || {});
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var f = body.fields || {}, cells = {};
  if (f.name) cells.Name = String(f.name);
  if (f.address !== undefined) cells.Address = String(f.address || '');
  if (f.borough) cells.Borough = String(f.borough);
  if (f.lat !== undefined && f.lat !== null && f.lat !== '') cells.Latitude = f.lat;
  if (f.lng !== undefined && f.lng !== null && f.lng !== '') cells.Longitude = f.lng;
  setCells_(sh, h, row, cells);
  CacheService.getScriptCache().remove('markers_csv');
  return {};
}

// ------------------------------------------------------------ Scout Lead (confirm address/name, save website)
// A café is finished when LeadLink and LeadAddr are both TRUE. Websites go in the Website column and stay forever.
function handleLeadList_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow(), items = [];
  if (last < 2 || !h.Number) return { items: items };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  vals.forEach(function (v) {
    var num = String(v[h.Number - 1] || '').trim();
    if (!num) return;
    items.push({
      number: num,
      website: h.Website ? String(v[h.Website - 1] || '') : '',
      link: String(v[h.LeadLink - 1]).toUpperCase() === 'TRUE',
      addr: String(v[h.LeadAddr - 1]).toUpperCase() === 'TRUE'
    });
  });
  return { items: items };
}
function handleLeadSave_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var row = findRow_(sh, h, body.cafe || {});
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var f = body.fields || {}, cells = {};
  if (f.website !== undefined) cells.Website = String(f.website || '');
  if (f.link !== undefined) cells.LeadLink = f.link ? 'TRUE' : 'FALSE';
  if (f.addr !== undefined) cells.LeadAddr = f.addr ? 'TRUE' : 'FALSE';
  setCells_(sh, h, row, cells);
  CacheService.getScriptCache().remove('markers_csv');
  return {};
}
// Everything is finished: clear the two check columns so the list starts fresh. Websites stay.
function handleLeadReset_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow();
  if (last >= 2) {
    [h.LeadLink, h.LeadAddr].forEach(function (col) {
      var blank = []; for (var i = 0; i < last - 1; i++) blank.push(['FALSE']);
      sh.getRange(2, col, last - 1, 1).setValues(blank);
    });
  }
  return {};
}

function handleSendBack_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row !== -1) setCells_(sh, h, row, { Status: 'Incomplete', ReviewStatus: 'Sent back', SendBackNote: (body.note || '') + ' (' + user.email + ', ' + now_() + ')' });
  postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '↩ Sent back: ' + (cafe.name || ''), '*' + (cafe.name || '') + '* was sent back to the scout.\n*Note:* ' + (body.note || '') + '\n_From: ' + user.email + '_', []);
  return {};
}

var ALLOWED_STATUSES = ['New Cafe Added', 'Ready To Be Assigned', 'Incomplete', 'Unvisited', 'Assigned', 'In Progress', 'Pending Visit', 'In Review', 'Visit Completed', 'Official Cafe Listing', 'Needs Revisit', 'Backlogged Cafe', 'Temporarily Unavailable', 'Permanently Closed', 'Ineligible Cafe'];

// Approver moves a café between statuses (mainly Visit Completed <-> Official Cafe Listing)
function handleSetStatus_(body, user) {
  requireApprover_(user);
  var status = String(body.status || '');
  if (ALLOWED_STATUSES.indexOf(status) === -1) throw new Error('Unknown status: ' + status);
  var sh = sheet_(), h = ensureColumns_(sh);
  var cafe = body.cafe || {};
  var row = findRow_(sh, h, cafe);
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  var fields = { Status: status };
  if (status === 'Official Cafe Listing') { fields.ReviewStatus = 'Official'; fields.ApprovedBy = user.email; fields.ApprovedAt = now_(); }
  else if (status === 'Visit Completed') { fields.ReviewStatus = 'Approved'; }
  setCells_(sh, h, row, fields);
  CacheService.getScriptCache().remove('markers_csv');
  if (status === 'Official Cafe Listing') {
    postSlack_('SLACK_SUBMISSIONS_WEBHOOK', '⭐ Now official: ' + (cafe.name || ''), '*' + (cafe.name || '') + '* is live on the public Work & Brew map. Published by ' + user.email + '.', []);
  }
  return { status: status };
}

// ------------------------------------------------------------ the sheet is the source of truth for the ops map
function yesNoCell_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
// Any logged-in user: every café in the sheet, in the shape the map uses
function handleListCafes_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow(), cafes = [];
  if (last < 2) return { cafes: cafes };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var g = function (v, k) { return h[k] ? v[h[k] - 1] : ''; };
  var looked = 0;
  vals.forEach(function (v, i) {
    var name = String(g(v, 'Name') || '').trim();
    var lat = parseFloat(g(v, 'Latitude')), lng = parseFloat(g(v, 'Longitude'));
    // A café typed into the sheet without coordinates: look them up once and save them
    if (name && (isNaN(lat) || isNaN(lng)) && g(v, 'Address') && h.Latitude && h.Longitude && looked < 10) {
      looked++;
      var geo = geocode_(g(v, 'Address'), g(v, 'Borough'));
      if (geo.lat && geo.lng) {
        lat = Number(geo.lat); lng = Number(geo.lng);
        sh.getRange(i + 2, h.Latitude).setValue(lat);
        sh.getRange(i + 2, h.Longitude).setValue(lng);
      }
    }
    if (!name || isNaN(lat) || isNaN(lng)) return;
    cafes.push({
      id: i + 2, number: String(g(v, 'Number') || ''), name: name, address: String(g(v, 'Address') || ''),
      borough: String(g(v, 'Borough') || ''), zipcode: String(g(v, 'Zipcode') || ''), latitude: lat, longitude: lng,
      status: String(g(v, 'Status') || '') || 'Ready To Be Assigned', assigned_to: String(g(v, 'AssignedTo') || '') || null,
      description: String(g(v, 'Description') || ''),
      wifi: yesNoCell_(g(v, 'WiFi')), secured: yesNoCell_(g(v, 'Secured')), outlets: yesNoCell_(g(v, 'Outlets')),
      hot_food: yesNoCell_(g(v, 'HotFood')), restroom: yesNoCell_(g(v, 'Restroom')),
      seats: String(g(v, 'Seats') || ''), time_restrict: String(g(v, 'TimeRestriction')).toUpperCase() === 'TRUE',
      restrict_note: String(g(v, 'RestrictionAmount') || ''), scout_name: String(g(v, 'ScoutName') || ''),
      notes: String(g(v, 'Notes') || ''),
      new_cafe: String(g(v, 'ReviewStatus') || '') === 'New cafe'
    });
  });
  return { cafes: cafes };
}
// Any logged-in user: status, notes and assigned scout changes made on the map go straight into the sheet
function handleSyncCafes_(body, user) {
  var sh = sheet_(), h = ensureColumns_(sh), last = sh.getLastRow();
  if (last < 2) return { updated: 0 };
  var n = last - 1;
  var nums = sh.getRange(2, h.Number, n, 1).getValues();
  var rowByNum = {};
  nums.forEach(function (v, i) { var k = norm_(v[0]); if (k) rowByNum[k] = i; });
  var cS = sh.getRange(2, h.Status, n, 1).getValues();
  var cN = sh.getRange(2, h.Notes, n, 1).getValues();
  var cA = sh.getRange(2, h.AssignedTo, n, 1).getValues();
  var done = 0;
  (body.rows || []).forEach(function (r) {
    var i = rowByNum[norm_(r.number)];
    if (i === undefined) return;
    if (r.status !== undefined && ALLOWED_STATUSES.indexOf(String(r.status)) !== -1) cS[i][0] = String(r.status) === 'Unvisited' ? 'Ready To Be Assigned' : String(r.status);
    if (r.notes !== undefined) cN[i][0] = String(r.notes || '');
    if (r.assigned_to !== undefined) cA[i][0] = String(r.assigned_to || '');
    done++;
  });
  sh.getRange(2, h.Status, n, 1).setValues(cS);
  sh.getRange(2, h.Notes, n, 1).setValues(cN);
  sh.getRange(2, h.AssignedTo, n, 1).setValues(cA);
  CacheService.getScriptCache().remove('markers_csv');
  return { updated: done };
}
// Approver removes a café: its row leaves the sheet
function handleDeleteCafe_(body, user) {
  requireApprover_(user);
  var sh = sheet_(), h = ensureColumns_(sh);
  var row = findRow_(sh, h, body.cafe || {});
  if (row === -1) throw new Error('This café is not in the spreadsheet.');
  sh.deleteRow(row);
  CacheService.getScriptCache().remove('markers_csv');
  return {};
}

// ------------------------------------------------------------ slack
// ping = true adds @channel so everyone in the channel gets a notification
function postSlack_(propName, title, text, images, ping) {
  var url = PropertiesService.getScriptProperties().getProperty(propName);
  if (!url) return; // Slack not set up yet; the sheet still has everything
  var blocks = [
    { type: 'header', text: { type: 'plain_text', text: title.substring(0, 150) } },
    { type: 'section', text: { type: 'mrkdwn', text: (ping ? '<!channel> ' : '') + text.substring(0, 2900) } }
  ].concat(images || []);
  var payload = { text: (ping ? '<!channel> ' : '') + title, blocks: blocks };
  var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200 && images && images.length) {
    // Slack sometimes rejects image blocks it can't fetch, so retry without them
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
  var cols = ['Name', 'Address', 'Zipcode', 'County', 'Latitude', 'Longitude', 'Description', 'Highlight', 'WiFi', 'Secured', 'Outlets', 'HotFood', 'Restroom', 'Seats', 'TimeRestriction', 'RestrictionAmount', 'ScoutName', 'Website', 'HoursWeekday', 'HoursWeekend', 'HoursByDay', 'Special Hours', 'AfterHours', 'WeekendRestrictions', 'SeatsType', 'Notes', 'Photo', 'Photos'];
  var lines = [cols.join(',')];
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
    data.forEach(function (vals) {
      var r = {};
      Object.keys(h).forEach(function (k) { r[k] = vals[h[k] - 1]; });
      if (String(r.Status).trim() !== 'Official Cafe Listing') return;
      if (String(r.isChain || '').toUpperCase() === 'TRUE') return; // public map is independents only
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
  try { cache.put('markers_csv', csv, 60); } catch (e) {}
  return csv;
}
function csvCell_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
