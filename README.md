# Meeting Room Booking

A single-room booking application with a daily timeline and a mock HTTP API.

Live demo: **[URL to be added after deployment]**

## Features

- Daily timeline from 09:00 to 18:00 with proportional booking blocks and past-time shading.
- Date selection in the creation form, synchronized with the timeline.
- Unavailable starts are hidden; submitted unavailable values remain visible after conflicts; changing start selects the earliest valid end (normally +30 minutes). End options respect duration and overlap rules.
- Editing and read-only past-booking details open in a centered modal on all screen sizes.
- Successful creation scrolls to the new booking by its returned ID, respecting reduced motion.
- Inline validation, loading and error states, deletion confirmation, and unsaved-change warnings.
- HTTP 409 recovery that preserves the draft and refreshes the schedule.
- Desktop side-panel creation and modal editing; all forms use a modal on mobile.

## Tech Stack

| Area | Tools |
| --- | --- |
| Application | Vue 3 Composition API, strict TypeScript, Pinia |
| Build and styling | Vite, SCSS, Lucide Vue icons |
| Mock API | MSW, browser localStorage |
| Testing | Vitest, Vue Test Utils, jsdom, Playwright |

## Getting Started

Use a current Node.js LTS release (22.22.2+ or 24.15+ recommended) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. No backend or environment configuration is required.

```sh
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`. For static hosting, upload its contents, including `mockServiceWorker.js`, to an HTTPS origin. The relative Vite base supports a repository subdirectory. Serve the worker with a JavaScript MIME type. Service workers require HTTPS or localhost.

## Testing

| Command | Purpose |
| --- | --- |
| `npm test` | Business validation, API, component, and integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npx playwright install chromium` | Install the E2E browser once |
| `npm run test:e2e` | CRUD scenario in desktop and mobile Chromium |

Playwright starts the development server automatically. Tests use a fixed clock and isolated storage. The integration suite covers stale GET responses, submission state, server errors, unsaved changes, and a deterministic server-side conflict followed by a successful retry.

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/components/` | Timeline, booking cards, shared booking form, confirmation dialog |
| `src/App.vue` | Date navigation, responsive composition, unsaved-change flow |
| `src/stores/bookings.ts` | Single Pinia store for bookings, draft, validation and request state |
| `src/api/` | Fetch-based API client and typed `ApiError` |
| `src/mocks/` | MSW handlers, initial data, isolated persistence |
| `src/utils/` | Pure time helpers and validation shared by client and mock server |
| `src/types/booking.ts` | Booking contract |

Components do not access MSW or localStorage directly. Successful mutations refresh bookings; request sequencing prevents stale GET responses from replacing the selected day. To use a real backend, build with `VITE_USE_MOCKS=false` and provide the same API under the application base path, or update the API client's URL prefix.

## Booking Rules

| Rule | Behavior |
| --- | --- |
| Working hours | Both endpoints within 09:00–18:00; start before end |
| Duration | 30–120 minutes inclusive |
| Overlap | Rejected when `startA < endB && endA > startB`; touching boundaries allowed |
| Editing | Current booking excluded from overlap checks |
| Past times | New starts must be in the future; started bookings cannot be edited or deleted |
| Time selection | 15-minute UI steps; the server does not impose this step |
| Title | Optional, up to 120 characters |

Past bookings remain visible. POST/PATCH recheck current storage, and PATCH/DELETE also check the original booking's start time.

## API and Conflict Handling

| Endpoint | Success response |
| --- | --- |
| `GET /api/bookings?date=YYYY-MM-DD` | 200: `Booking[]` |
| `POST /api/bookings` | 201: created booking |
| `PATCH /api/bookings/:id` | 200: updated booking |
| `DELETE /api/bookings/:id` | 200: `{ success: true }` |

POST and PATCH accept `{ date, start, end, title? }`; PATCH replaces the editable fields. Bookings add an `id`. Dates use `YYYY-MM-DD`, times use `HH:mm`.

Errors use `{ error: { code, message } }`: 400 for invalid input, 404 for missing bookings, 409 for overlap, and 500 for storage failures.

When the server returns 409, the form stays open and all entered values remain unchanged. A conflict message is shown and bookings are refetched so the competing reservation appears on the timeline. The user can change the interval and retry. No time is automatically changed and no success is reported.

## Limitations

- The application and mock server use browser-local date/time and the browser's clock; there is no room-specific timezone.
- Demo bookings persist in localStorage under `roomly-bookings-v1`. The first visit seeds 26 bookings across yesterday, today, tomorrow, and two dates within the next two weeks. Existing storage is retained. Clear that key to reset.
- Persistence is per browser and origin. There is no shared backend, authentication, cross-device sync, or atomic multi-user concurrency. localStorage is not a transactional database.
- Automated browser coverage targets Chromium at desktop and mobile sizes.

## Development Notes

- Actual development time: **[to be filled in]**.
- No known unfinished application features within the requested scope. Live deployment and its URL remain pending.
- Production use would require a shared backend with transactional overlap checks and a defined room timezone.

Availability choices are withheld until the selected date loads successfully. Failed refreshes retain the last schedule for that date and offer retry. Successful mutations remain reported as successful if the schedule refresh fails. Pending creation scrolls are canceled when navigating to another date.
