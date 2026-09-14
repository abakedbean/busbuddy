// Calls the Google Routes API (transit mode) and returns structured transit steps.
// See scripts/README.md for setup steps.

require('dotenv').config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Returns { duration, distanceMeters, steps } where steps is a list of
// { type: 'walk', instructions } or { type: 'transit', line, departureStop, departureTime, arrivalStop, arrivalTime }.
// Returns null if no transit route was found.
// `arrivalTime`, if given, is a Date - the route is calculated to arrive by that time
// (e.g. a class start time) instead of departing "now".
async function getTransitDirections(origin, destination, arrivalTime) {
  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: 'TRANSIT',
  };
  if (arrivalTime) {
    body.arrivalTime = arrivalTime.toISOString();
  }

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.legs.steps.transitDetails,routes.legs.steps.navigationInstruction',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Routes API request failed: ${res.status} ${JSON.stringify(data)}`);
  }

  if (!data.routes || data.routes.length === 0) {
    return null;
  }

  const route = data.routes[0];
  const steps = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      if (step.transitDetails) {
        const td = step.transitDetails;
        steps.push({
          type: 'transit',
          vehicleType: td.transitLine?.vehicle?.type, // e.g. BUS, TRAM, SUBWAY, COMMUTER_TRAIN
          line: td.transitLine?.nameShort || td.transitLine?.name,
          departureStop: td.stopDetails?.departureStop?.name,
          departureTime: td.stopDetails?.departureTime,
          arrivalStop: td.stopDetails?.arrivalStop?.name,
          arrivalTime: td.stopDetails?.arrivalTime,
        });
      } else if (step.navigationInstruction) {
        steps.push({ type: 'walk', instructions: step.navigationInstruction.instructions });
      }
    }
  }

  return { duration: route.duration, distanceMeters: route.distanceMeters, steps };
}

module.exports = { getTransitDirections };
