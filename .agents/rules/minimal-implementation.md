# Minimal Implementation

How much code implements a behaviour, once the behaviour is agreed.

This rule does not decide what to build. The spec does that, and an objection
to a requirement goes through a Change Request. What it decides is the amount
of code that answers a requirement already accepted.

## Scope

| Target                        | Applies                                    |
| ----------------------------- | ------------------------------------------ |
| Source, scripts and workflows | Every change                               |
| Tests                         | How a test is built, never how many exist  |
| Requirements and design       | Rung 1 only, before the spec row is agreed |

## 1. The ladder

Try these in order and stop at the first that holds.

1. **Does this need to exist at all?** The cheapest code is the code nobody
   writes.
2. **Is it already in this codebase?** Reuse what the repository already has
   before writing its equivalent.
3. **Does the standard library do it?** Check before writing a helper.
4. **Does a native platform feature cover it?** The runtime, the shell, the
   file system, the database.
5. **Does an already-installed dependency solve it?** Reach for what the
   project already carries before adding anything.
6. **Can it be one line?**
7. **Only then**: the least code that works.

Rung 1 belongs to requirements and design. Once a spec row is agreed, asking
whether it should exist is a Change Request, not a choice made later in the
implementation.

## 2. What the ladder never removes

The ladder trims code, not obligations. These stay whatever rung you stop at.

- Validation of input crossing a trust boundary.
- Error handling that prevents data loss.
- Security.
- Accessibility.
- Anything the spec asks for.
- Unit-level coverage of the failures the code retains.

Tests are in the same position. The ladder shapes how a test is built — reuse a
helper that exists before adding a harness — and never how many obligations are
verified.

### Which failures are handled here

Subject to the safety floor in this section, handle a failure where it occurs
only when both hold: no type or schema excludes it, and the specification, a
contract or an actual observation names it. Other failures propagate to the
caller. Every promise is awaited or returned to a caller that awaits or adopts
it, never dropped.

Subject to the same floor, when a callback runtime ignores returned promises,
use an explicit adapter that adopts the asynchronous result and handles
rejections at that trust boundary. Do not make the callback async and assume
its ignored outer promise is consumed. An ignored return is a dropped promise,
not propagation.

An observation has a test-case row in
`<paths.specsDir>/spec-*/06_Test-Cases.md`. Resolve `paths.specsDir` from
`qfai.config.yaml`; `.qfai/specs` is only the default.
The process entry point is a trust boundary and handles failures that propagate
that far. A dropped rejection remains a correctness defect under
`.qfai/assistant/constitution/drift-protocol.md`.

## 3. Marking a deliberate simplification

A shortcut taken on purpose is written down where it is taken, with two things:
the ceiling it stops at, and the condition that lifts it.

```ts
// SIMPLIFIED: reads one file at a time.
// Lift when: a caller needs a directory and the per-file cost is measured.
```

Both halves are required. A ceiling with no lifting condition cannot be told
from an oversight, and the deferral becomes permanent with nobody deciding it
should.

Do not mark what the ladder simply answered. A helper you did not write because
the standard library has one is not a simplification; it is rung 3.

## 4. What this rule is not

- Not a licence to skip a requirement. The spec is the authority.
- Not a size limit. Shorter code that hides a failure path is worse than longer
  code that handles it.
- Not an argument against marking a shortcut. Marking one costs two lines and
  is always cheaper than the shortcut being found later without them.

## Related

- Writing standard for the comment you leave: `documentation-clarity.md`
- Scope of a single change, and how an expansion is declared:
  Article VII of `.qfai/assistant/constitution/constitution.md`
- The same ladder for a screen's components and layouts:
  `.qfai/assistant/catalog/ui-procurement.md`
