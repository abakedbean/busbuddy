// One-off helper: lists every calendar visible to the authenticated account,
// so we can find the calendarId for calendars other than "primary" (e.g. a class schedule calendar).

const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, 'token.json');

async function loadSavedCredentials() {
  const content = await fs.readFile(TOKEN_PATH);
  const credentials = JSON.parse(content);
  return google.auth.fromJSON(credentials);
}

async function listCalendars(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendarList.list();
  for (const cal of res.data.items) {
    console.log('---');
    console.log('Name:', cal.summary);
    console.log('ID:', cal.id);
  }
}

loadSavedCredentials().then(listCalendars).catch(console.error);
