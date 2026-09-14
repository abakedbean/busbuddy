// Proves the Google Routes API (transit mode) can turn a calendar-event location string
// into a bus line + departure time. See scripts/README.md for setup steps.

require('dotenv').config();
const { resolveLocation } = require('./building-codes');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const ORIGIN = 'Shake Shack, 105 South 12th Street, Philadelphia, PA 19107';
const DESTINATION = resolveLocation('JMHH F50'); // raw calendar location, resolved via building-codes lookup

async function getTransitDirections(origin, destination) {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.legs.steps.transitDetails,routes.legs.steps.navigationInstruction',
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: 'TRANSIT',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Request failed:', res.status, JSON.stringify(data, null, 2));
    return;
  }

  if (!data.routes || data.routes.length === 0) {
    console.log('No transit route found from', origin, 'to', destination);
    return;
  }

  const route = data.routes[0];
  console.log('Total duration:', route.duration);
  console.log('Total distance (m):', route.distanceMeters);

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      if (step.transitDetails) {
        const td = step.transitDetails;
        console.log('---');
        console.log('Line:', td.transitLine?.nameShort || td.transitLine?.name);
        console.log('Departure stop:', td.stopDetails?.departureStop?.name);
        console.log('Departure time:', td.stopDetails?.departureTime);
        console.log('Arrival stop:', td.stopDetails?.arrivalStop?.name);
        console.log('Arrival time:', td.stopDetails?.arrivalTime);
      } else if (step.navigationInstruction) {
        console.log('Walk:', step.navigationInstruction.instructions);
      }
    }
  }
}

getTransitDirections(ORIGIN, DESTINATION).catch(console.error);
