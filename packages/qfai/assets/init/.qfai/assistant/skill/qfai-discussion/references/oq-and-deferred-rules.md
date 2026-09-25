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
- `Next-Decision-Point`
- `Due`
- `Evidence`

## Gate Enum

`discussion|sdd|atdd|tdd|ops`

## Deferred Fields

- `OQ-ID`
- `Title`
- `Gate`
- `Deferred-Reason`
- `Deferred-Until`
- `Owner`
- `Due`
- `Severity`
- `Impact`
- `Mitigation`
- `Evidence`

## Guardrails

- Do not leave recommendations implicit.
- Do not defer without a next decision point.
- Do not close the pack while `Disposition: open` remains.

## Where a grilling session's outcome goes

A session produces decisions and open questions, and both have a home already.
No new file: the pack's fifteen carry them, and a third artifact would hold
nothing they do not.

| Outcome                                     | Home                                                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A decision the session settled              | `99_delta.md`, under `## Change History`, with any option it turned down under `## Rejected Decisions`                                                   |
| A theme or visual direction it turned down  | `99_delta.md`, under `## Rejected Visual Directions`, which the template requires of a UI-bearing pack and which the generic table's columns cannot hold |
| A decision the session did not settle       | `11_OQ-Register.md`, `Disposition: open`, **and** a `created` row in `12_OQ-Resolution-Log.md`                                                           |
| A decision the user closed the questions on | `99_delta.md`, as an assumption labelled one. No register row                                                                                            |
| An open question answered later             | `12_OQ-Resolution-Log.md` as `resolved`, **and** the register row moved to `Disposition: resolved`                                                       |
| A question deliberately put off             | `13_Deferred.md`, `12_OQ-Resolution-Log.md` as `deferred`, and the register row moved to `Disposition: deferred`                                         |
| A question that turned out not to be one    | `12_OQ-Resolution-Log.md` as `rejected`, and the register row moved to `Disposition: rejected`                                                           |
| A question that turns out to be live again  | `12_OQ-Resolution-Log.md` as `reopened`, and the register row moved back to `Disposition: open`                                                          |

**The register is what readiness reads.** Writing an answer only into the
resolution log leaves the row `open`, so the pack stays blocked on a question
that has been answered. Every row a disposition change touches is moved in the
register in the same edit.

**The log carries every event, the register only the current state.** That is
why a new question is logged as `created` and not only registered: without it,
the first event in a question's history is missing while every later one is
there, and the log is append-only precisely so the sequence can be read.

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
