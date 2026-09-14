// The combined v1 pipeline: next class event -> resolved location -> the bus that gets
// there on time, plus the 2 scheduled buses before it (so there's room to catch an earlier one).
// This is the logic that gets ported into the Scriptable widget. See scripts/README.md for setup.

const { google } = require('googleapis');
const { authorize } = require('./google-auth');
const { resolveLocation } = require('./building-codes');
const { getTransitDirections } = require('./directions');
const septa = require('./septa');

const CLASS_SCHEDULE_CALENDAR_ID =
  'c_842413513ecf24746048bbed42ce29172fe334c9e40bbd1f949fd64d2a60df0d@group.calendar.google.com';

// Placeholder "home base" origin until the widget can use the device's real location.
const ORIGIN = 'Shake Shack, 105 South 12th Street, Philadelphia, PA 19107';

// How many buses before the must-take one to also show.
const EARLIER_OPTIONS = 2;

async function getNextEvent(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: CLASS_SCHEDULE_CALENDAR_ID,
    timeMin: new Date().toISOString(),
    maxResults: 1,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items?.[0] || null;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function main() {
  const auth = await authorize();
  const event = await getNextEvent(auth);

  if (!event) {
    console.log('No upcoming events found.');
    return;
  }

  const classStart = new Date(event.start.dateTime || event.start.date);
  console.log('Next event:', event.summary, '-', classStart.toString());

  if (!event.location) {
    console.log('Event has no location set - nothing to route to.');
    return;
  }

  const destination = resolveLocation(event.location);
  const directions = await getTransitDirections(ORIGIN, destination, classStart);

  if (!directions) {
    console.log(`No transit route found from ${ORIGIN} to ${destination}.`);
    return;
  }

  const mustTakeStep = directions.steps.find((step) => step.type === 'transit');
  if (!mustTakeStep) {
    console.log('Route found, but it has no transit leg - walking only?');
    return;
  }

  console.log(
    `Must-take ${mustTakeStep.vehicleType || 'transit'}: ${mustTakeStep.line} from ${mustTakeStep.departureStop} at ${formatTime(new Date(mustTakeStep.departureTime))}`
  );

  if (mustTakeStep.vehicleType !== 'BUS') {
    console.log(`This trip uses a ${mustTakeStep.vehicleType} line, not a bus - SEPTA bus lookup doesn't apply here.`);
    return;
  }

  let stopId;
  try {
    stopId = await septa.findStopId(mustTakeStep.line, mustTakeStep.departureStop);
  } catch (err) {
    console.log('Could not reach SEPTA for earlier bus options:', err.message);
    return;
  }

  if (!stopId) {
    console.log(`Could not match "${mustTakeStep.departureStop}" to a SEPTA stop for route ${mustTakeStep.line}.`);
    return;
  }

  const schedule = await septa.getSchedule(stopId, mustTakeStep.line);
  const mustTakeTime = new Date(mustTakeStep.departureTime);

  // Find the scheduled departure closest to (but not after) the must-take bus's time,
  // then walk backwards from there for the earlier options.
  const sorted = schedule.filter((s) => !isNaN(s.time)).sort((a, b) => a.time - b.time);
  let mustTakeIndex = sorted.findIndex((s) => s.time >= mustTakeTime);
  if (mustTakeIndex === -1) mustTakeIndex = sorted.length - 1;

  const earlierBuses = sorted.slice(Math.max(0, mustTakeIndex - EARLIER_OPTIONS), mustTakeIndex);

  if (earlierBuses.length === 0) {
    console.log('No earlier scheduled buses found before the must-take one.');
  } else {
    console.log('Earlier options:');
    for (const bus of earlierBuses) {
      console.log(`  - ${bus.label} (${bus.direction})`);
    }
  }
}

main().catch(console.error);
