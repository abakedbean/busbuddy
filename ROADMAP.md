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
- [ ] Build the Scriptable widget: runs the pipeline, renders "Next: [Event] — Bus [X] departs in [Y] min"
- [ ] Handle edge cases: no upcoming events, event has no location, no transit route found, building code not in lookup table

## Week 3 — Polish, document, ship

- [ ] Polish widget layout, refresh behavior, error states
- [ ] Write `README.md` with screenshots and setup steps
- [ ] Write `DECISIONS.md` capturing key tradeoffs made along the way
- [ ] Document the SEPTA real-time v2 plan below

## v2 (planned, not yet built)

Replace/augment the Google Directions ETA with SEPTA's real-time data for live GPS-based predictions:

1. Geocode the event location (Google Geocoding API) into lat/lng.
2. Match to the nearest SEPTA bus stop using the [OpenDataPhilly SEPTA stops dataset](https://opendataphilly.org/datasets/septa-routes-stops-locations/).
3. Call SEPTA's TransitView/arrivals API for that stop to get a live-position-based ETA instead of a schedule-based one.
4. Fall back to the v1 Google Directions estimate if SEPTA's API is unavailable (no SLA — see PRD Risks).
