# Screen Contracts

## Purpose

Draft interaction contracts for the anchor screen and key screens.

## Anchor Screen Contract

### Screen: [Screen name]

#### States

| State     | Trigger                | Display                     | Transitions            |
| --------- | ---------------------- | --------------------------- | ---------------------- |
| empty     | Initial load, no data  | [empty state description]   | -> loading (on fetch)  |
| loading   | Data fetch in progress | [loading indicator]         | -> populated, -> error |
| error     | Fetch failure          | [error message + retry CTA] | -> loading (on retry)  |
| populated | Data available         | [primary content layout]    | -> empty (on clear)    |

#### Interactions

| Element     | Action    | Result    | Feedback                 |
| ----------- | --------- | --------- | ------------------------ |
| Primary CTA | Click/tap | [outcome] | [visual/haptic feedback] |
| [element]   | [action]  | [result]  | [feedback]               |

## Cross-references

- Anchor selection: `31_anchor.md`
- State coverage: see `03_Story-Workshop.md` Design Direction Summary
