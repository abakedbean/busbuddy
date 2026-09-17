// Bus Buddy widget (Scriptable).
// Run bus-buddy-setup.js once first to store credentials in Keychain.
//
// Two modes, chosen by the widget's "Parameter" field (long-press widget > Edit Widget):
// - (empty/default): next class from the Fall '26 Class Schedule calendar -> the bus that
//   gets there on time, plus the 2 scheduled buses before it.
// - "home": current location -> home address -> the next few upcoming buses, no calendar.
// Add two separate widget instances to see both at once.
//
// Ported from the Node prototype in /scripts (see DECISIONS.md for why things work this way).

const CLASS_SCHEDULE_CALENDAR_ID =
  'c_842413513ecf24746048bbed42ce29172fe334c9e40bbd1f949fd64d2a60df0d@group.calendar.google.com';

const BUILDING_ADDRESSES = {
  JMHH: 'Jon M. Huntsman Hall, 3730 Walnut St, Philadelphia, PA 19104',
  SHDH: 'Steinberg Hall-Dietrich Hall, 3620 Locust Walk, Philadelphia, PA 19104',
};

const EARLIER_OPTIONS = 2; // for the "next class" widget
const UPCOMING_COUNT = 3; // for the "home" widget

// ---------- Keychain / config ----------

function getSecret(key) {
  return Keychain.contains(key) ? Keychain.get(key) : null;
}

const CLIENT_ID = getSecret('bb_client_id');
const CLIENT_SECRET = getSecret('bb_client_secret');
const REFRESH_TOKEN = getSecret('bb_refresh_token');
const MAPS_API_KEY = getSecret('bb_maps_api_key');
const HOME_ADDRESS = getSecret('bb_home_address');

// ---------- Location + building codes ----------

function resolveLocation(rawLocation) {
  if (!rawLocation) return rawLocation;
  const buildingCode = rawLocation.trim().split(/\s+/)[0].toUpperCase();
  return BUILDING_ADDRESSES[buildingCode] || rawLocation;
}

async function getCurrentOrigin() {
  const loc = await Location.current();
  return { latitude: loc.latitude, longitude: loc.longitude };
}

// ---------- Google Calendar + Routes ----------

async function getAccessToken() {
  const req = new Request('https://oauth2.googleapis.com/token');
  req.method = 'POST';
  req.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  req.body = `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&grant_type=refresh_token`;
  const json = await req.loadJSON();
  if (!json.access_token) {
    throw new Error(`Google auth failed: ${json.error || 'unknown'} - ${json.error_description || JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function getNextEvent(accessToken) {
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CLASS_SCHEDULE_CALENDAR_ID)}/events` +
    `?timeMin=${encodeURIComponent(new Date().toISOString())}&maxResults=1&singleEvents=true&orderBy=startTime`;
  const req = new Request(url);
  req.headers = { Authorization: `Bearer ${accessToken}` };
  const json = await req.loadJSON();
  return json.items && json.items[0] ? json.items[0] : null;
}

async function getTransitDirections(origin, destination, arrivalTime) {
  const body = {
    origin:
      typeof origin === 'string'
        ? { address: origin }
        : { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
    destination: { address: destination },
    travelMode: 'TRANSIT',
    transitPreferences: { allowedTravelModes: ['BUS'] },
  };
  if (arrivalTime) {
    body.arrivalTime = arrivalTime.toISOString();
  }

  const req = new Request('https://routes.googleapis.com/directions/v2:computeRoutes');
  req.method = 'POST';
  req.headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': MAPS_API_KEY,
    'X-Goog-FieldMask':
      'routes.duration,routes.distanceMeters,routes.legs.steps.transitDetails,routes.legs.steps.navigationInstruction',
  };
  req.body = JSON.stringify(body);
  const data = await req.loadJSON();

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
          vehicleType: td.transitLine?.vehicle?.type,
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
  return { steps };
}

// ---------- SEPTA ----------

async function septaFetch(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const req = new Request(url);
      const text = await req.loadString();
      const cleaned = text.replace(/[\u0000-\u001F]+/g, ' ');
      const data = JSON.parse(cleaned);
      if (!data.error) {
        return data;
      }
      lastError = new Error(data.error);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`SEPTA request failed: ${lastError.message}`);
}

async function findStopId(route, stopName) {
  const data = await septaFetch(`https://www3.septa.org/api/Stops/index.php?req1=${encodeURIComponent(route)}`);
  const stops = Array.isArray(data) ? data : [];
  const match = stops.find((s) => s.stopname?.toLowerCase() === stopName.toLowerCase());
  return match ? match.stopid : null;
}

async function getSchedule(stopId, route) {
  const data = await septaFetch(`https://www3.septa.org/api/BusSchedules/index.php?stop_id=${stopId}&route=${route}`);
  const entries = data[route] || [];
  return entries.map((entry) => ({
    time: new Date(entry.DateCalender),
    label: entry.date,
    direction: entry.DirectionDesc,
  }));
}

// ---------- Widget UI ----------

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function buildWidget(title, lines) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color('#1c1c1e');

  const titleText = widget.addText(title);
  titleText.font = Font.boldSystemFont(14);
  titleText.textColor = Color.white();
  widget.addSpacer(6);

  for (const line of lines) {
    const lineText = widget.addText(line);
    lineText.font = Font.systemFont(13);
    lineText.textColor = Color.white();
    lineText.lineLimit = 2;
    widget.addSpacer(2);
  }

  widget.refreshAfterDate = new Date(Date.now() + 20 * 60 * 1000);
  return widget;
}

// Returns { lines, fallback } - fallback is true when the entries shown are "current buses
// on this route" rather than genuine options before the must-take one (see below).
async function getEarlierOrUpcomingBuses(mustTakeStep, { beforeTime, count }) {
  const stopId = await findStopId(mustTakeStep.line, mustTakeStep.departureStop);
  if (!stopId) {
    return { lines: [`Couldn't match "${mustTakeStep.departureStop}" to a SEPTA stop.`] };
  }
  const schedule = await getSchedule(stopId, mustTakeStep.line);
  const sorted = schedule.filter((s) => !isNaN(s.time)).sort((a, b) => a.time - b.time);
  const now = new Date();

  let entries;
  let fallback = false;
  if (beforeTime) {
    const idx = sorted.findIndex((s) => s.time >= beforeTime);
    if (idx === -1) {
      // SEPTA's schedule API only returns near-term upcoming departures (like a live
      // countdown board), not a full timetable - if the target time is further out than
      // that window, we don't have real "earlier options" for that specific class yet.
      // Fall back to showing current buses on the route instead of nothing, but flag it
      // so the caller labels these clearly as "current," not "earlier options."
      entries = sorted.filter((s) => s.time >= now).slice(0, count);
      fallback = true;
    } else {
      entries = sorted.slice(Math.max(0, idx - count), idx);
    }
  } else {
    entries = sorted.filter((s) => s.time >= now).slice(0, count);
  }

  return { lines: entries.map((bus) => `  ${bus.label} - ${bus.direction}`), fallback };
}

async function buildNextClassWidget() {
  const missing = [CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, MAPS_API_KEY].some((v) => !v);
  if (missing) {
    return buildWidget('Bus Buddy', ['Run bus-buddy-setup.js first.']);
  }

  const accessToken = await getAccessToken();
  const event = await getNextEvent(accessToken);
  if (!event) {
    return buildWidget('Bus Buddy - Next Class', ['No upcoming events.']);
  }

  const classStart = new Date(event.start.dateTime || event.start.date);
  if (!event.location) {
    return buildWidget('Bus Buddy - Next Class', [event.summary, 'No location set on this event.']);
  }

  const destination = resolveLocation(event.location);
  const origin = await getCurrentOrigin();
  const directions = await getTransitDirections(origin, destination, classStart);
  if (!directions) {
    return buildWidget('Bus Buddy - Next Class', [event.summary, 'No transit route found.']);
  }

  const mustTakeStep = directions.steps.find((s) => s.type === 'transit');
  if (!mustTakeStep) {
    return buildWidget('Bus Buddy - Next Class', [event.summary, 'Walking only - no bus needed.']);
  }

  const lines = [event.summary, `Bus ${mustTakeStep.line}: ${formatTime(new Date(mustTakeStep.departureTime))} @ ${mustTakeStep.departureStop}`];

  try {
    const { lines: earlierLines, fallback } = await getEarlierOrUpcomingBuses(mustTakeStep, {
      beforeTime: new Date(mustTakeStep.departureTime),
      count: EARLIER_OPTIONS,
    });
    if (earlierLines.length > 0) {
      lines.push(fallback ? 'Current buses (class schedule not available yet):' : 'Earlier options:');
      lines.push(...earlierLines);
    }
  } catch (err) {
    // SEPTA unavailable - the Google estimate above still stands, just skip earlier options.
  }

  return buildWidget('Bus Buddy - Next Class', lines);
}

async function buildHomeWidget() {
  const missing = [MAPS_API_KEY, HOME_ADDRESS].some((v) => !v);
  if (missing) {
    return buildWidget('Bus Buddy - Home', ['Run bus-buddy-setup.js first.']);
  }

  const origin = await getCurrentOrigin();
  const directions = await getTransitDirections(origin, HOME_ADDRESS);
  if (!directions) {
    return buildWidget('Bus Buddy - Home', ['No transit route found to home.']);
  }

  const nextStep = directions.steps.find((s) => s.type === 'transit');
  if (!nextStep) {
    return buildWidget('Bus Buddy - Home', ['Walking only - no bus needed.']);
  }

  const lines = [`Bus ${nextStep.line}: ${formatTime(new Date(nextStep.departureTime))} @ ${nextStep.departureStop}`];

  try {
    const { lines: upcomingLines } = await getEarlierOrUpcomingBuses(nextStep, { count: UPCOMING_COUNT });
    if (upcomingLines.length > 0) {
      lines.push('Upcoming:');
      lines.push(...upcomingLines);
    }
  } catch (err) {
    // SEPTA unavailable - the Google estimate above still stands.
  }

  return buildWidget('Bus Buddy - Home', lines);
}

// ---------- Entry point ----------

async function main() {
  const mode = (args.widgetParameter || '').toLowerCase() === 'home' ? 'home' : 'next-class';
  let widget;
  try {
    widget = mode === 'home' ? await buildHomeWidget() : await buildNextClassWidget();
  } catch (err) {
    widget = buildWidget('Bus Buddy - Error', [String(err.message || err)]);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium();
  }
  Script.complete();
}

await main();
