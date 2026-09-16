# widget/

The actual iPhone home screen widget, built for [Scriptable](https://scriptable.app) (free on the App Store). This ports the logic proven out in `/scripts` into Scriptable's JS runtime, which differs from Node in a few important ways - see [DECISIONS.md](../DECISIONS.md).

**Not yet tested on-device** - this was written and reasoned through carefully, but there's no iPhone/Scriptable available in this dev environment to run it. Treat first real runs as a debugging pass, not a guaranteed match to the Node prototype's behavior.

## Setup (on your iPhone)

1. Install **Scriptable** from the App Store.
2. In Scriptable, tap **+** to create a new script, name it `bus-buddy-setup`, and paste in the contents of `bus-buddy-setup.js`.
3. Run it (tap the play button, not "add to home screen"). It'll prompt you one field at a time for:
   - **Google Client ID** and **Google Client Secret** - from `scripts/credentials.json` on your computer (the `client_id`/`client_secret` fields under `installed`).
   - **Google Refresh Token** - from `scripts/token.json` on your computer, after you've run `npm run test-calendar-auth` there at least once (the `refresh_token` field).
   - **Google Maps API Key** - the key you created for the Routes API (same one in `scripts/.env`).
   - **Home Address** - your home address, for the "go home" widget.

   You'll need to transfer these values to your phone yourself (e.g. AirDrop the files to view, or type them in manually) - don't paste them into any AI chat, since they're the same secrets we've been keeping out of git.
4. Create a second new script, name it `bus-buddy`, and paste in the contents of `bus-buddy.js`.
5. Long-press your home screen → **+** → search **Scriptable** → add a widget (Medium size recommended).
6. Tap the widget → **Edit Widget** → set **Script** to `bus-buddy`. Leave **Parameter** blank for the "next class" widget.
7. Optional: add a second Scriptable widget the same way, but set its **Parameter** to `home` - this is the "go home" button/widget from anywhere, independent of your calendar.

## Notes

- iOS refreshes widgets roughly every 15-60 minutes in the background, not live-to-the-second - this is a platform limit, not a bug (see PRD Risks).
- The first time either widget runs, iOS will prompt for location permission (needed for "current location" as the origin). Approve "While Using the App" at minimum; background widget refreshes may be more limited in how often they can get a location fix, which is a known open question until tested on-device.
- If you ever need to update a credential, just re-run `bus-buddy-setup.js` - it only overwrites the fields you fill in and leaves the rest untouched.
