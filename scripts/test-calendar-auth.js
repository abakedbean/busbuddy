// Proves the Google Calendar OAuth + read path works, before wiring it into the widget.
// See scripts/README.md for setup steps.

const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const CLASS_SCHEDULE_CALENDAR_ID =
  'c_842413513ecf24746048bbed42ce29172fe334c9e40bbd1f949fd64d2a60df0d@group.calendar.google.com';

async function printNextEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: CLASS_SCHEDULE_CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 15,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  for (const event of events) {
    const start = event.start.dateTime || event.start.date;
    console.log('---');
    console.log('Event:', event.summary);
    console.log('Starts:', start);
    console.log('Location:', event.location || '(none set)');
  }
}

authorize().then(printNextEvents).catch(console.error);
