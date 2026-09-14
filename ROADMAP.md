# Roadmap: Bus Buddy

Timeline: 2-3 weeks. See [PRD.md](PRD.md) for scope and success metrics.

## Week 1 — Research writeup + Setup

- [x] Research SEPTA API, Google Calendar API, Google Directions API, and iOS home-screen options
- [x] Write `PRD.md`
- [x] Write `ROADMAP.md`
- [x] Create Google Cloud project; enable Calendar API + Routes API
- [x] Configure OAuth consent screen (Auth Platform > Branding/Audience/Clients), add self as test user
- [x] Set a Google Cloud budget alert (e.g. $1) as a safety net
- [x] Write a small test script that authenticates and prints the next calendar event + its location

## Week 2 — Core pipeline + widget

- [x] Extend the test script: pass event location into Routes API (transit mode), parse out bus line + next departure/arrival time
- [x] Discovered class schedule lives on a separate "Fall '26 Class Schedule" calendar, not `primary` — test script now targets that calendar ID
- [x] Discovered building codes (e.g. "JMHH F50") don't resolve directly via the Routes API — added `building-codes.js` lookup table as a fallback (see DECISIONS.md)
- [x] Built `get-next-bus.js`: combines calendar read + location resolve + Routes API into one pipeline
- [x] **Scope change** (see DECISIONS.md): pulled part of v2 forward — Routes API now targets the class start time as arrival time to find the "must-take" bus, then queries SEPTA's schedule API for that stop+route to list the 2 scheduled departures before it
- [x] Handle edge cases: no upcoming events, event has no location, no transit route found, non-bus transit line (tram/subway/rail), SEPTA API errors (retry + graceful failure)
- [ ] Build the Scriptable widget: ports `get-next-bus.js` logic into a home-screen widget, rendering the must-take bus + 2 earlier options
- [ ] Remaining edge case to handle in the widget UI specifically: building code not in lookup table

## Week 3 — Polish, document, ship

- [ ] Polish widget layout, refresh behavior, error states
- [ ] Write `README.md` with screenshots and setup steps
- [ ] Write `DECISIONS.md` capturing key tradeoffs made along the way
- [ ] Document the SEPTA real-time v2 plan below

## v2 (remaining, not yet built)

Part of the original v2 plan (using SEPTA for multiple upcoming departures) was pulled forward into Week 2 — see above and DECISIONS.md. Still remaining for a true v2:

1. Geocode the event location (Google Geocoding API) into lat/lng, for cases where Google's returned stop name doesn't match cleanly to a SEPTA stop.
2. Match to the nearest SEPTA bus stop using the [OpenDataPhilly SEPTA stops dataset](https://opendataphilly.org/datasets/septa-routes-stops-locations/), as a fallback when stop-name matching fails.
3. Use SEPTA's live vehicle position data (TransitView), not just scheduled times, so departures reflect real-time delays.
4. Fall back to the v1 Google Directions estimate if SEPTA's API is unavailable (no SLA — see PRD Risks).
