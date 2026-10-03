# OQ and Deferred Rules

Use this file for canonical field definitions in `/qfai-discussion`.

## OQ Register Fields

- `OQ-ID`
- `Title`
- `Gate`
- `Disposition`
- `Owner`
- `Rationale`
- `Options`
- `Recommendation`
- `Resolution`
- `Next-Decision-Point`
- `Due`
- `Evidence`

## Gate Enum

`discussion|sdd|atdd|tdd|ops`

## A Deferred Question

A deferred question stays in `11_OQ-Register.md` as a row with
`Disposition: deferred`. Its fields carry the deferral:

| Field                 | Holds                                              |
| --------------------- | -------------------------------------------------- |
| `Rationale`           | Why it is deferred                                 |
| `Resolution`          | What is decided now, and why the rest waits        |
| `Next-Decision-Point` | When, and by what signal, the question is reopened |
| `Owner`               | Who reopens it                                     |
| `Due`                 | The latest date it is looked at again              |
| `Evidence`            | Where the deferral was agreed                      |

## Guardrails

- Do not leave recommendations implicit.
- Do not defer without a next decision point.
- Do not close the pack while `Disposition: open` remains.

## Where a grilling session's outcome goes

A session produces decisions and open questions, and both have a home already.
No new file: the pack's nine carry them, and another artifact would hold
nothing they do not.

| Outcome                                     | Home                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A decision the session settled              | The pack file it shapes: `05_Scope.md`, `06_REQ.md`, `07_NFR.md`, `09_Constraints.md` or `01_Context.md` |
| A theme or visual direction it turned down  | `04_Sources.md`, under `## Design Anti-Goals`, with its reason and the cue that stops it recurring       |
| A decision the session did not settle       | `11_OQ-Register.md`, `Disposition: open`                                                                 |
| A decision the user closed the questions on | `01_Context.md`, under `## Inputs`, as an assumption labelled one. No register row                       |
| An open question answered later             | The register row moved to `Disposition: resolved`, with the answer in `Resolution`                       |
| A question deliberately put off             | The register row moved to `Disposition: deferred`, with its `Resolution` and `Next-Decision-Point`       |
| A question that turned out not to be one    | The register row moved to `Disposition: rejected`, with the reason in `Resolution`                       |
| A question that turns out to be live again  | The register row moved back to `Disposition: open`                                                       |

**The register is what readiness reads.** Each row holds a question's current
state, and a disposition change edits that row. An answer written anywhere else
leaves the row `open`, so the pack stays blocked on a question that has been
answered.

**A closure the user asked for is not an open question.** Where the user ends
the asking with `proceed`, `done`, or an answer to that effect, each decision
still open becomes a labelled assumption and no register row. The user saw the
question and closed it; leaving it `open` would block the pack on a closure they
asked for. Two kinds are never assumed and stay open whatever closes the
asking — a decision some document requires the user to make and record, and an
input declared undefaultable, which stops the run rather than being invented.

`--auto` is the other case and behaves the other way: nobody saw the question,
so the assumption is recorded **and** a register row opened against it. An
assumption with no open question behind it is what that mode must not produce.

Record what was chosen and why, not how the session went. A rejected option
belongs in the record only where knowing it was rejected changes a later
reader's decision — the rest is in the history.

The open half is what makes a session's result checkable: completion requires
`Disposition: open` to reach zero, so a decision nobody took cannot close the
pack.
