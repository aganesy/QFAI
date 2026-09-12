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

| Outcome                               | Home                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A decision the session settled        | `99_delta.md`, under `## Change History`, with any option it turned down under `## Rejected Decisions` |
| A decision the session did not settle | `11_OQ-Register.md`, `Disposition: open`                                                               |
| An open question answered later       | `12_OQ-Resolution-Log.md`, **and** the register row moved to `Disposition: resolved`                   |
| A question deliberately put off       | `13_Deferred.md`, and the register row moved to `Disposition: deferred`                                |

**The register is what readiness reads.** Writing an answer only into the
resolution log leaves the row `open`, so the pack stays blocked on a question
that has been answered. Every row the last two outcomes touch is moved in the
register in the same edit.

Record what was chosen and why, not how the session went. A rejected option
belongs in the record only where knowing it was rejected changes a later
reader's decision — the rest is in the history.

The open half is what makes a session's result checkable: completion requires
`Disposition: open` to reach zero, so a decision nobody took cannot close the
pack.
