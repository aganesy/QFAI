# Business time recipe: deterministic clocks per profile

An optional recipe for a test that depends on business time, such as a business window, a
deadline or a holiday. It sits beside the test runner recipes of this skill and, like them, is a
pattern to adopt: QFAI does not execute it. Copy what fits and prove it in your own suite.

## Deterministic business time

A test that depends on the wall clock waits for a time of day or skips outside it. Control business time instead:

- **Clock adapter.** The application reads business time through an adapter it supplies, with an
  explicit time zone and a fixed date and time per profile. Server-side decisions read the same
  adapter as the browser display; fixing only the browser leaves the server deciding on real time.
- **Production-safe boundary.** Test clock control is enabled only by start-up configuration of a
  non-production build or environment. No ordinary production request can enable it or set it,
  and a test proves that a production configuration ignores the control.
- **Independent cases per profile.** Each profile, such as inside and outside a business window,
  runs its own cases: before, inside and after the window, and holiday and boundary instants where
  the business has them. No case waits for real time and none skips on the time of day.
- **Workers.** A profile's clock is immutable while that profile is active. Workers sharing one
  server and database share its clock, so two profiles never run against one mutable clock at once:
  give each concurrently active profile its own server, or run the profiles one after another.
  Data stays owned per file, as the test runner recipes describe.
- **Reports.** CI shows that every profile ran: one report per profile, each with the actual worker
  count, the cases run, the skips and the flaky results.

```ts
// One definition read by the server start-up and by the browser context of each profile.
export const clockProfiles = {
  "in-window": { timeZone: "Asia/Tokyo", instant: "2030-01-15T10:30:00+09:00" },
  "out-of-window": { timeZone: "Asia/Tokyo", instant: "2030-01-15T22:30:00+09:00" },
} as const;
```

## Adoption check

Each clock profile's report shows its cases ran with zero skips, and a production configuration
ignores the test clock.
