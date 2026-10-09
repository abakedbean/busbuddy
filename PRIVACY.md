# Privacy Policy: Bus Buddy

Bus Buddy is a personal, single-user project (see [PRD.md](PRD.md)) built by Ravena Rao. It is not a public product or service - this policy exists only because Google's OAuth setup requires a privacy policy URL for apps using Calendar access, even for personal use.

## What data Bus Buddy accesses

- **Google Calendar (read-only)**: the next upcoming event's title, time, and location, to determine which bus to catch.
- **Approximate device location**: used only to calculate a transit route from your current location (via Google's Routes API).

## How that data is used

- Calendar and location data are used only to compute a bus route and display it on a home screen widget, in real time, on the user's own device.
- No data is stored on any server. Credentials and tokens are stored locally in the user's own Google Cloud project and the Scriptable app's on-device Keychain - never transmitted to or held by any third party controlled by this project.
- No data is shared with, sold to, or used by anyone other than the single user running their own copy of this code.

## Who this applies to

Bus Buddy's Google Cloud project is configured for a single authorized user. It is not published or distributed as a public app.
