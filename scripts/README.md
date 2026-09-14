# scripts/

Node.js prototyping scripts used to prove out the Calendar + Directions API pipeline before porting the logic into the Scriptable widget (see [DECISIONS.md](../DECISIONS.md)).

## Setup

1. Download your OAuth client credentials from Google Cloud Console (Credentials → your Desktop app client → Download JSON) and save them here as `credentials.json`. This file is gitignored — never commit it.
2. Create a Google Maps API key (restricted to the Routes API) in Google Cloud Console, and save it here in a file named `.env` (plain text, no `.txt` extension) containing:
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   ```
   This file is also gitignored — never commit it.
3. Install dependencies:
   ```
   npm install
   ```
4. Run the first test script:
   ```
   npm run test-calendar-auth
   ```
   On first run, it opens a browser window for you to log into your Google account and approve access (you'll see an "unverified app" warning — click "Continue" since this is expected for a personal test-user app). After approving, a `token.json` is saved locally (also gitignored) so you won't need to log in again on future runs.
5. If successful, it prints your next upcoming calendar event's title, time, and location.

## Scripts

- `test-calendar-auth.js` — proves the Calendar OAuth + read path works; lists the next several events on the "Fall '26 Class Schedule" calendar.
- `test-directions.js` — proves the Routes API (transit mode) works for a hardcoded location.
- `list-calendars.js` — one-off helper to find a calendar's ID (used to find the class schedule calendar, since it isn't the account's `primary` calendar).
- `get-next-bus.js` — the full v1 pipeline: next class event → resolved location → the bus that gets there on time (via Google) → the 2 scheduled buses before it (via SEPTA). This is the logic the Scriptable widget is built from.
- `google-auth.js`, `directions.js`, `septa.js`, `building-codes.js` — shared modules used by the scripts above.
