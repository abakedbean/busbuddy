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
