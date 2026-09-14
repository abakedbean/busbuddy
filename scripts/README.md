# scripts/

Node.js prototyping scripts used to prove out the Calendar + Directions API pipeline before porting the logic into the Scriptable widget (see [DECISIONS.md](../DECISIONS.md)).

## Setup

1. Download your OAuth client credentials from Google Cloud Console (Credentials → your Desktop app client → Download JSON) and save them here as `credentials.json`. This file is gitignored — never commit it.
2. Install dependencies:
   ```
   npm install
   ```
3. Run the first test script:
   ```
   npm run test-calendar-auth
   ```
   On first run, it opens a browser window for you to log into your Google account and approve access (you'll see an "unverified app" warning — click "Continue" since this is expected for a personal test-user app). After approving, a `token.json` is saved locally (also gitignored) so you won't need to log in again on future runs.
4. If successful, it prints your next upcoming calendar event's title, time, and location.
