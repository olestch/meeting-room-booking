# Meeting Room Booking

A responsive meeting room booking application built with Vue 3 and TypeScript.

Users can view room availability on a daily timeline, create and manage bookings, and select available time slots. The application uses a mock HTTP API with server-side validation and conflict handling.

**[Live Demo](https://md-meeting-room.netlify.app/)** · **[GitHub Repository](https://github.com/olestch/meeting-room-booking)**

## Features

- Interactive daily timeline (09:00–18:00).
- Booking creation, editing, and deletion.
- Date navigation and availability-based time selection.
- Automatic end-time suggestions with 15-minute selection steps.
- Validation of working hours, booking duration, and overlapping intervals.
- HTTP 409 conflict handling without losing entered data.
- Loading, error, empty, and confirmation states.
- Responsive layout with modal editing.
- Persistent demo data across multiple dates.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | Vue 3, TypeScript, Composition API |
| State management | Pinia |
| Build & styling | Vite, SCSS, Lucide |
| Mock API | MSW, localStorage |
| Testing | Vitest, Vue Test Utils, Playwright |
| Deployment | Netlify |

## Getting Started

**Requirements:** Node.js 22.22.2+ or 24.15+ and npm.

```bash
git clone https://github.com/olestch/meeting-room-booking.git
cd meeting-room-booking
npm ci
npm run dev
```

Open the local URL displayed by Vite.

To build and preview the production version:

```bash
npm run build
npm run preview
```

No external backend or environment configuration is required for the demo.

## Booking Rules

| Rule | Constraint |
| --- | --- |
| Working hours | 09:00–18:00 |
| Duration | Minimum 30 minutes, maximum 2 hours |
| Time selection | 15-minute increments |
| Overlapping bookings | Not allowed |
| Adjacent bookings | Allowed |
| Past dates and times | New bookings cannot start in the past |
| Editing | Existing booking is excluded from its own overlap check |
| Started bookings | Read-only |
| Title | Optional, maximum 120 characters |

All booking rules are checked by both the client and mock API. The 15-minute increment applies to UI selection only.

## Architecture

The application uses a small, layered structure:

- **Components** — timeline, booking cards, shared booking form, and confirmation dialogs.
- **Pinia store** — selected date, bookings, form draft, and asynchronous operation states.
- **API client** — typed HTTP requests and error handling, independent of Vue components.
- **MSW handlers** — mock API endpoints with validation and persistent browser storage.
- **Utilities** — shared pure functions for time calculations and booking validation.

The API layer can be replaced with a real backend without rewriting the UI.

### API

| Method | Endpoint |
| --- | --- |
| GET | `/api/bookings?date=YYYY-MM-DD` |
| POST | `/api/bookings` |
| PATCH | `/api/bookings/:id` |
| DELETE | `/api/bookings/:id` |

### Conflict handling

The mock API validates booking intervals against its current stored data.

If a request returns **HTTP 409 Conflict**, the application:

1. Keeps the booking form open.
2. Preserves all entered values.
3. Displays a conflict message.
4. Refreshes the schedule.
5. Allows the user to select another interval and retry.

If refreshing the schedule fails, the existing draft and previously loaded bookings are preserved, and a retry option is provided.

## Testing

```bash
npm run typecheck
npm test
npm run build
```

For browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The automated tests cover:

- Booking validation and time boundaries.
- Overlap detection and adjacent intervals.
- CRUD operations and API error handling.
- Server-side conflicts and draft preservation.
- Failed schedule refreshes and asynchronous state.
- Date selection and synchronization.
- Modal confirmation and keyboard focus restoration.
- Desktop and mobile booking workflows.

Browser tests use Chromium with desktop and mobile viewport configurations.

## Demo Data

The application includes 26 initial bookings across several past, current, and future dates.

Bookings are persisted in browser localStorage. Existing data is preserved between visits.

To restore the initial dataset, remove the `roomly-bookings-v1` key from localStorage and reload the application.

## Limitations

- The demo uses the browser's local date, time, and timezone.
- Data is stored locally and is not shared between browsers or devices.
- MSW simulates a backend but does not provide transactional multi-user concurrency.
- Authentication and multiple meeting rooms are outside the assignment scope.

A production implementation would require a shared backend with transactional booking validation and a defined room timezone.

## Development Notes

**Development time:** Approximately 2.5 hours, including implementation, testing, code review, and refinements.

The application covers the requested functionality. Additional production infrastructure is intentionally outside the scope of this assignment.
