# Evidence Requirements: `taskFidelity` section

Prototyping evidence files MUST include a `taskFidelity` section so the
`QFAI-CRIT-009` gate passes. Below is the required keyword set and
the canonical markdown shape consumed by the validator and the
`npx qfai prototyping iterate --capture` template emitter.

## Required keywords

Every evidence file that records a critique iteration MUST surface
these `taskFidelity` keys with concrete values:

- `cta_visibility` — does the primary call-to-action stay on-screen and
  visually distinct at both desktop (>= 1024px) and mobile (<= 480px)
  viewports?
- `four_state_check` — has the interactive flow been checked in all
  four reachable states (default / hover / focused / disabled), with a
  pass/fail observation per state?

The SSOT for this list is the `TASK_FIDELITY_REQUIRED_KEYWORDS`
constant shipped inside the QFAI package. The validator (`QFAI-CRIT-009`),
the `--capture` template emitter, and this document all read from
that constant so the keyword set cannot silently drift between the
three surfaces. This page mirrors it and does not define it: adding a
keyword here changes the guidance but not what `npx qfai validate`
accepts, so report a disagreement between this page and the validator's
error text as a QFAI bug rather than treating the list as a local
customization point.

## Canonical markdown structure

The validator detects the section via the literal heading
`## taskFidelity`. The minimal accepted shape is:

```markdown
## taskFidelity

- step_count: 3
- max_primary_steps: 5
- cta_visibility: PASS — primary CTA stays anchored at the viewport bottom on
  desktop (1440px) and remains tappable on mobile (375px).
- four_state_check: PASS — default / hover / focused / disabled states each
  render the expected variant; disabled is non-interactive.
```

Authors may add free-form prose between the bullets so long as each
required keyword appears at least once. The `--capture` template emits
a stub with TODO placeholders for every required keyword so the
operator never silently forgets one.
