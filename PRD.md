# PRD: Bus Buddy

## Problem

Checking the bus schedule for an upcoming appointment requires opening Google Calendar to see where you're going, then opening Google Maps to figure out which bus to take and when it leaves. That's two apps and several taps for information that's fully derivable from data you already have. There's no glanceable, passive way to see "here's your next bus" without manually looking it up each time.

## User

Primary user: Ravena, a student in Philadelphia who takes SEPTA buses to calendar-scheduled events (classes, appointments, meetings). Framed as a persona for this PRD: **"Commuter Chris"** — a student/young professional who relies on public transit, keeps their schedule in Google Calendar, and wants transit info surfaced automatically rather than looked up on demand.

## Goals

- Automatically surface the next calendar event's required bus (line + departure/arrival time) without the user opening Calendar or Maps.
- Make it glanceable: visible on the iPhone home screen, no app-opening required to see the latest known info.
- Ship a working, demoable v1 within 2-3 weeks.

## Non-goals (v1)

- True real-time, second-by-second bus position tracking (deferred to v2 via SEPTA's live API).
- Multi-event / full-day itinerary view (v1 shows only the next upcoming event).
- Support for other transit modes (rail, trolley, walking-only routes) beyond whatever Google's transit directions return.
- Multi-user support / account sharing (this is a single-user personal tool).

## Success metrics

- **Functional**: Widget correctly identifies the next event and displays a bus line + time that matches what Google Maps would show for the same trip, verified across at least 5 real test events.
- **Usability**: Ravena can glance at her home screen and get bus info without opening any app, at least once per real commute during the testing week.
- **Portfolio**: Repo contains a coherent PRD → roadmap → decisions → shipped artifact trail suitable for showing to internship reviewers.

## Scope

### v1 (this build)
- Read next Google Calendar event (time + location) via Calendar API.
- Convert event location to transit directions via Google Directions/Routes API (transit mode).
- Display bus line + next departure/arrival time on an iOS home screen widget (via Scriptable).
- Handle empty/error states (no upcoming event, no location, no transit route found).

### v2 (documented, not built now)
- Replace/augment Google's transit ETA with SEPTA's real-time TransitView/arrivals API for live GPS-based predictions.
- Geocode event location → nearest SEPTA stop via OpenDataPhilly stop dataset.
- Possibly widen to show multiple upcoming events, not just the next one.

## Cost

Target: **$0/month** at expected personal-use volume.

| Service | Pricing model | Expected cost |
|---|---|---|
| Google Calendar API | Free, no billing tier | $0 |
| Google Directions/Routes API (transit mode) | ~$5 per 1,000 requests; Google Maps Platform includes a **$200/month free credit** | $0 — even at a widget refresh every 15-30 min all day, monthly call volume stays in the low hundreds, well under the free credit |
| SEPTA TransitView/arrivals API (v2) | Free, unauthenticated, no published rate limit | $0 |
| Scriptable (iOS app) | Free on the App Store | $0 |

Setup note: enabling the Directions/Routes API requires attaching a billing card to the Google Cloud project even though usage is expected to stay free. A **budget alert** (e.g. at $1) should be configured during Week 1 setup so any unexpected usage spike is caught immediately rather than silently billed.

## Risks

- **iOS widget refresh limits**: WidgetKit throttles background refresh to roughly every 15-60 minutes. This is a platform constraint, not a bug — the PRD explicitly treats "glanceable, periodically fresh" as the target, not live-to-the-second updates.
- **SEPTA API has no formal SLA** (relevant for v2): it's a free hobbyist-friendly API with no documented uptime guarantee, so v2 needs a fallback if it's down.
- **OAuth friction**: Google's OAuth flow will show an "unverified app" warning for personal test-user access. This is expected and does not block functionality, but is worth noting in the README so it doesn't look like a bug.
- **Google Directions transit accuracy**: for some routes, Google's transit ETA may reflect the published schedule rather than live position — v1 accepts this as a known limitation, addressed in v2.
- **Cost creep**: mitigated by the $200/month free credit plus a budget alert (see Cost section), but worth monitoring if refresh frequency or usage patterns change.
