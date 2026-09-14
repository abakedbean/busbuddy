// The "go home" pipeline: current location -> home -> the next few scheduled buses,
// independent of the calendar. No arrival deadline here, so it just lists upcoming
// departures from now, unlike get-next-bus.js which works backward from a class start time.
// See scripts/README.md for setup.

const { resolveLocation } = require('./building-codes');
const { getTransitDirections } = require('./directions');
const septa = require('./septa');

// Placeholder "current location" for Node testing - the widget swaps this for the
// iPhone's real GPS location via Scriptable's Location API.
const CURRENT_LOCATION = resolveLocation('JMHH F50');
const HOME = 'Shake Shack, 105 South 12th Street, Philadelphia, PA 19107';

// How many upcoming buses to list.
const UPCOMING_COUNT = 3;

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function main() {
  const directions = await getTransitDirections(CURRENT_LOCATION, HOME);

  if (!directions) {
    console.log(`No transit route found from ${CURRENT_LOCATION} to ${HOME}.`);
    return;
  }

  const transitStep = directions.steps.find((step) => step.type === 'transit');
  if (!transitStep) {
    console.log('Route found, but it has no transit leg - walking only?');
    return;
  }

  console.log(
    `Next ${transitStep.vehicleType || 'transit'}: ${transitStep.line} from ${transitStep.departureStop} at ${formatTime(new Date(transitStep.departureTime))}`
  );

  if (transitStep.vehicleType !== 'BUS') {
    console.log(`This trip uses a ${transitStep.vehicleType} line, not a bus - SEPTA bus lookup doesn't apply here.`);
    return;
  }

  let stopId;
  try {
    stopId = await septa.findStopId(transitStep.line, transitStep.departureStop);
  } catch (err) {
    console.log('Could not reach SEPTA for upcoming bus times:', err.message);
    return;
  }

  if (!stopId) {
    console.log(`Could not match "${transitStep.departureStop}" to a SEPTA stop for route ${transitStep.line}.`);
    return;
  }

  let schedule;
  try {
    schedule = await septa.getSchedule(stopId, transitStep.line);
  } catch (err) {
    console.log('Could not reach SEPTA for upcoming bus times (Google estimate above still stands):', err.message);
    return;
  }

  const now = new Date();
  const upcoming = schedule
    .filter((s) => !isNaN(s.time) && s.time >= now)
    .sort((a, b) => a.time - b.time)
    .slice(0, UPCOMING_COUNT);

  if (upcoming.length === 0) {
    console.log('No upcoming scheduled buses found.');
  } else {
    console.log('Upcoming buses:');
    for (const bus of upcoming) {
      console.log(`  - ${bus.label} (${bus.direction})`);
    }
  }
}

main().catch(console.error);
