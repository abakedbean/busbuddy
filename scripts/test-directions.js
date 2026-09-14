// Proves the Google Routes API (transit mode) can turn a calendar-event location string
// into a bus line + departure time. See scripts/README.md for setup steps.

const { resolveLocation } = require('./building-codes');
const { getTransitDirections } = require('./directions');

const ORIGIN = 'Shake Shack, 105 South 12th Street, Philadelphia, PA 19107';
const DESTINATION = resolveLocation('JMHH F50'); // raw calendar location, resolved via building-codes lookup

async function main() {
  const result = await getTransitDirections(ORIGIN, DESTINATION);
  if (!result) {
    console.log('No transit route found from', ORIGIN, 'to', DESTINATION);
    return;
  }

  console.log('Total duration:', result.duration);
  console.log('Total distance (m):', result.distanceMeters);
  for (const step of result.steps) {
    console.log('---');
    if (step.type === 'transit') {
      console.log('Line:', step.line);
      console.log('Departure stop:', step.departureStop);
      console.log('Departure time:', step.departureTime);
      console.log('Arrival stop:', step.arrivalStop);
      console.log('Arrival time:', step.arrivalTime);
    } else {
      console.log('Walk:', step.instructions);
    }
  }
}

main().catch(console.error);
