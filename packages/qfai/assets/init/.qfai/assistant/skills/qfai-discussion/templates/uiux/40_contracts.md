# Screen Contracts

## Purpose

Draft interaction contracts for the anchor screen and key screens.

## Anchor Screen Contract

### Screen: [Screen name]

- Route: [/path-to-screen]
- Actor: [primary user role]
- Purpose: [what the user accomplishes on this screen]

#### Primary Tasks

| Task             | Trigger       | Success Criteria     |
| ---------------- | ------------- | -------------------- |
| [primary task]   | [user action] | [observable outcome] |
| [secondary task] | [user action] | [observable outcome] |

#### Required States

| State     | Trigger                | Display                     |
| --------- | ---------------------- | --------------------------- |
| empty     | Initial load, no data  | [empty state description]   |
| loading   | Data fetch in progress | [loading indicator]         |
| error     | Fetch failure          | [error message + retry CTA] |
| populated | Data available         | [primary content layout]    |

#### Transitions

| From      | To        | Trigger              |
| --------- | --------- | -------------------- |
| empty     | loading   | Data fetch initiated |
| loading   | populated | Data received        |
| loading   | error     | Fetch failure        |
| error     | loading   | Retry action         |
| populated | empty     | Clear action         |

#### Observable Outcomes

| Outcome                    | Verification Method |
| -------------------------- | ------------------- |
| [expected user outcome]    | [how to verify]     |
| [expected system behavior] | [how to verify]     |

## Cross-references

- Anchor selection: `31_anchor.md`
- State coverage: see `../03_Story-Workshop.md` Design Direction Summary
