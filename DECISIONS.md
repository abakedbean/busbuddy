# Decisions Log: Bus Buddy

Short entries on key tradeoffs made during the build and why. See [PRD.md](PRD.md) for full scope/context.

## Scriptable over Apple Shortcuts for the home-screen widget

Both can call external APIs and render on the home screen, but Shortcuts widgets are geared toward on-demand runs (tap → runs → shows result) and have weaker support for OAuth-style token storage/refresh. Scriptable supports Keychain-based token storage and full JS, needed for the Google OAuth flow. Both are subject to the same iOS WidgetKit refresh ceiling (~15-60 min), so this choice is about API/auth flexibility, not refresh speed.

## Google-only v1, SEPTA real-time deferred to v2

Google Directions API (transit mode) gives bus line + ETA directly from an address string, no separate stop-matching step. SEPTA's real-time API is free and more precise but requires geocoding the event location and matching it to a specific stop ID via a separate dataset — more moving parts for a first working version. Phasing it lets v1 ship faster with lower risk, and turns v2 into a documented "iteration" for the portfolio narrative rather than a blocker to shipping anything.

## Prototype in Node.js before porting logic into Scriptable

Scriptable's JS runtime has no npm/package manager and a more limited debugging loop (test only by running on-device or in the Scriptable app). Node.js locally has the `googleapis` library, better error messages, and a normal terminal-based dev loop — much easier for learning the Calendar/Directions API auth flow for the first time. Once the calendar-read + transit-lookup logic is proven working in Node, it gets rewritten (not just copy-pasted, since Scriptable uses `fetch`-style requests, not the `googleapis` SDK) into the Scriptable widget script.

## Query a specific calendar ID, not `primary`

The class schedule lives in a separate "Fall '26 Class Schedule" calendar under the Wharton account, not the account's main `primary` calendar. Discovered this by listing all calendars visible to the account (`calendarList.list`) after the test script kept returning unrelated personal events. The widget needs to query that specific calendar ID (or eventually merge multiple calendar IDs) rather than assuming `primary` covers everything relevant.

## Hardcoded building-code lookup table over raw geocoding

Class locations in the calendar are Penn building codes plus room numbers (e.g. "JMHH F50"), not street addresses. Tried passing the raw string straight to the Routes API first — it failed to resolve a transit route. Rather than building geocoding/fuzzy-matching logic for this in v1, added a small hardcoded map (`building-codes.js`) from known building codes to real addresses, since the set of buildings in any one semester's schedule is small and static. Noted as a candidate for a smarter (e.g. LLM-based) abbreviation-resolving approach in a future iteration, once the v1 pipeline is proven end-to-end.

## Pulled part of v2 (SEPTA) forward into v1, for "earlier bus" options

User wants to see the 2 scheduled buses before the one that's actually needed to arrive on time, so there's room to catch an earlier one. Google's Routes API can only answer "best single route for one arrival time" — it can't list multiple upcoming departures on a line. SEPTA's API is built for exactly that, so real-time SEPTA integration (originally scoped as v2) got pulled forward. Approach: use Routes API with the class start time as `arrivalTime` to find the "must-take" bus, then query SEPTA directly for that stop+route to get the surrounding schedule.

Two things learned building this (`scripts/septa.js`):
- SEPTA's `BusSchedules` endpoint needs a numeric `stop_id`, not a stop name — requires a first call to `/api/Stops` (by route number) to resolve the name Google returns (e.g. "Walnut St & 12th St") into an ID.
- SEPTA's API occasionally returns malformed JSON (raw control characters inside strings) and intermittently 400s/501s from its load balancer — added text sanitization before `JSON.parse` and a 3-attempt retry wrapper.

Also added a vehicle-type check (bus vs. tram/subway/rail) on Google's result, since not every route Google picks for a given trip/time is actually a bus (e.g. it chose the Subway-Surface trolley T5 over a bus for one tested class). SEPTA's bus API doesn't apply to those trips, so the widget falls back to showing just Google's single time in that case.

## Restrict Google Routes results to buses only

User wants only bus options shown, not trolley/subway/rail, even when Google would otherwise pick a faster non-bus route (it picked the Subway-Surface trolley T5 over a bus for multiple tested trips). Rather than relying on the vehicle-type check to just skip non-bus results, added `transitPreferences.allowedTravelModes: ['BUS']` to the Routes API request itself, so Google only considers bus routes when computing the trip. The vehicle-type check stays in the code as a defensive fallback in case a request ever omits this preference.

## Graceful fallback when SEPTA's own stop data is inconsistent

Found a real case where SEPTA's `Stops` API lists a stop under a route ("Chestnut St & 37th St" under Route 21), but the `BusSchedules` endpoint rejects that same stop_id as invalid - a data inconsistency on SEPTA's side, not a bug in our code (consistent with the "no SLA" risk noted in the PRD). Wrapped the schedule fetch in both `get-next-bus.js` and `get-bus-home.js` so this kind of failure degrades to showing just Google's single estimate, instead of crashing the whole script.

## Separate "go home" pipeline instead of folding it into the calendar one

User wants a way to check buses home from wherever they currently are, even when that trip isn't a scheduled calendar event. This is a genuinely different query shape from the calendar pipeline: no event, no arrival deadline, current location instead of a fixed origin — so it's a separate script (`get-bus-home.js`) rather than branching logic inside `get-next-bus.js`. Both reuse the same `directions.js`/`septa.js`/`building-codes.js` modules, so the duplication is just the top-level orchestration, not the underlying logic. For Node prototyping, "current location" is stood in with a fixed test address (Huntsman Hall); the real widget swaps this for Scriptable's device Location API.

## One Scriptable script, two widget instances via a Parameter, instead of two scripts

Both the "next class" and "go home" views are one file (`widget/bus-buddy.js`), branching on the widget's configurable `Parameter` field (`args.widgetParameter`), rather than two separate Scriptable scripts. Scriptable widgets can only run one script per instance and can't show interactive in-widget buttons for arbitrary custom actions (no App Intents support), so a literal "button that switches modes" isn't possible within a single passive widget — the practical equivalent is adding two widget instances to the home screen, each pointed at the same script with a different Parameter (blank vs. "home"). Keeping one file avoids duplicating the Google auth/Directions/SEPTA logic across two Scriptable scripts, which would otherwise need Scriptable's `importModule` and multi-file management.

## Refresh-token exchange in Scriptable, instead of a fresh OAuth consent flow on-device

The Node scripts already completed Google's OAuth consent flow once (via `@google-cloud/local-auth`) and hold a long-lived refresh token in `scripts/token.json`. Rather than reimplementing the browser-based consent flow inside Scriptable (which has no equivalent library and would mean re-approving "unverified app" warnings on-device), the widget reuses that same refresh token: a one-time setup script (`bus-buddy-setup.js`) stores it (plus the client ID/secret and Maps API key) in Scriptable's Keychain, and the widget exchanges it for a fresh access token via a direct POST to Google's token endpoint on every run. Access tokens expire hourly, but since the widget only refreshes every 15-60 minutes anyway, refreshing on every run is simple and sufficient - no caching needed.

## Widget confirmed working on-device

First real run on an iPhone succeeded end-to-end: Keychain auth, calendar read, current-location lookup, Routes API, and SEPTA all worked together and rendered correctly in the widget preview. Two on-device-only bugs surfaced and got fixed:
- The initial `invalid_grant` auth error was very likely a copy-paste artifact (stray whitespace/quotes) from manually transcribing the refresh token out of a Files app JSON preview - `bus-buddy-setup.js` now trims and strips surrounding quotes from every pasted value, and shows a masked preview (length + first/last 4 chars) for the user to confirm before saving, so this class of mistake is visible immediately instead of failing silently at auth time.
- Google's OAuth "unverified app" warning and the Google Auth Platform's Testing/consent-screen quirks only show up in a real browser-based sign-in - none of that applies here, since the widget reuses an already-issued refresh token rather than doing its own consent flow (see the refresh-token decision above), so this wasn't actually a concern in practice.

## SEPTA's schedule API is a near-term countdown board, not a full timetable

On-device testing surfaced a real bug: for a class the next morning, "earlier options" showed the last two buses of *tonight's* service instead of buses before the actual class time. Root cause: SEPTA's `BusSchedules` endpoint only returns the next handful of upcoming departures from right now (confirmed empirically - a call returns ~4 entries within the next hour), not a queryable timetable for an arbitrary future time. The original code treated "target time not found in the returned window" the same as "target time is the last entry," which silently produced wrong data instead of failing loudly.

The first fix simply showed a "not available yet" message with no bus times at all in that case. Revisited this after feedback that showing nothing felt worse than showing something - now falls back to displaying the current near-term buses on that route (the same data the "go home" widget shows), but explicitly labeled "Current buses (class schedule not available yet)" rather than "Earlier options," so it's still useful without being mislabeled as tied to the actual class.

## Home Screen only - no Lock Screen widget

Tried adding a Lock Screen widget too, since it'd be visible without unlocking the phone. It's not viable: iOS forces every app's Lock Screen widgets into a fixed transparent, monochrome, no-background style - there is no API, setting, or workaround (in Scriptable or otherwise) to draw a background box or overlay behind the text there, regardless of what the widget code sets. This made the widget's text nearly unreadable against a busy photo wallpaper. Tried a shorter, compact-formatted version for that size too, but the actual problem (no background) is a hard platform restriction, not something a shorter layout fixes. Decided to drop Lock Screen support entirely and rely on the Home Screen widget, which has no such restriction and already looks as designed.

## Raw control-byte encoding cleanup in `septa.js` / `bus-buddy.js`

Noticed the JSON-sanitizing regex (`/[ -]+/g`, used to strip malformed control characters from SEPTA's responses) had somehow been written to disk as literal raw control bytes instead of the escaped ` `-`` text, in both the Node script and the ported widget code. Functionally identical (same character range either way, which is why it worked correctly in both Node and on-device testing), but it made both files look like binary files to `git`/`grep`, which is a bad look for files meant to be readable in a portfolio repo. Fixed by rewriting the regex as proper escaped text in both places.

Fixed by explicitly checking for that case: if the class's target time is further out than what SEPTA's near-term window covers, the widget now says "Earlier options not available yet - check back closer to departure time" instead of guessing. Chose this over switching to SEPTA's full static GTFS schedule data (a real fix for the underlying limitation, but a much bigger lift - parsing/hosting a full timetable dataset isn't a good fit for a lightweight phone widget) since the near-term case (the actual moment you'd check the widget before catching a bus) is unaffected - this only limits the earlier-options list when checking a whole day or more ahead of time, which is a reasonable v1 limitation. Documented as a real, known gap rather than silently working around it.
