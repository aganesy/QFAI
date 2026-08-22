# Screen Contracts

## Purpose

Draft interaction contracts for key screens using the strong screen contract schema (11 required fields).

`route:` is required on every surface — `validators/uix/screenContract.ts` demands a
non-empty string, not a URL — but what it names is surface-specific. Record the real
navigation identifier for the surface you are on; never invent a URL for a product that
has none:

| Surface            | `route:` names                                                         | Example                  |
| ------------------ | ---------------------------------------------------------------------- | ------------------------ |
| `web`              | URL path                                                               | `/orders/:id`            |
| `mobile` (native)  | navigation destination, or the deep link when one exists               | `OrderDetail`            |
| `desktop` (native) | window / view identifier, or the app-scheme deep link                  | `main:order-detail`      |
| `cli`              | command invocation                                                     | `myapp deploy --dry-run` |
| `mixed`            | the identifier of the surface that owns the screen, per the rows above | `/orders/:id`            |

Use one convention per surface consistently across the whole file so downstream
`.qfai/contracts/ui/*.yaml` normalization stays deterministic.

### Screen: [Screen Name]

- screen_id: SCR-001
- route: /path-to-screen
- purpose: [what the user accomplishes on this screen]
- actor: [primary user role]
- primary_tasks:
  - [task 1: trigger → success criteria]
  - [task 2: trigger → success criteria]
- secondary_tasks:
  - [secondary task 1: trigger → success criteria]
  - [secondary task 2: trigger → success criteria]
- required_states:
  - default: [default/empty state description]
  - loading: [loading indicator description]
  - empty: [empty state description]
  - error: [error message + retry CTA description]
- transitions:
  - empty → loading: [data fetch initiated]
  - loading → default: [data received and primary content is ready]
  - loading → error: [fetch failure]
  - error → loading: [retry action]
- observable_outcomes:
  - [expected user outcome → verification method]
  - [expected system behavior → verification method]
- notes_for_verify: [notes for verification/testing]
- notes_for_reviewer: [any additional context for the reviewer]

<!-- Nested list format is canonical for primary_tasks, secondary_tasks, required_states, transitions, observable_outcomes. -->

> **Note:** `required_states` primary truth lives in this file. Each screen's state set is authoritative here.
> **Note:** `secondary_tasks` documents non-primary user workflows available on the screen.
> Layout specification is optional and should be added as notes only.

## Cross-references

- Brand SSOT (product intent, brand signals, anti-goals): root `DESIGN.md` — visual-prototyping surfaces only; a cli-only pack has none
- Sidecar manifest: `00_index.md`
- Review handoff: `50_review_input_bundle.md`
