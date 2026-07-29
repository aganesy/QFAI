# Round Evidence

Per-round fields of the `qfai-implement` evidence contract. The skill's
`### Per-item evidence contract` section carries the summary.

## Round block

One block per RED/GREEN cycle. Round 1 is the original cycle; each blocking
reviewer `REVISE` that requires new production behaviour adds a round.

- `Round N: RED command` — the exact command executed to observe failure
- `Round N: RED result` — the failure output (result completeness is
  best-effort; truncated output is acceptable)
- `Round N: GREEN command` — the exact command executed to observe success
- `Round N: GREEN result` — the success output
- `Round N: reviewer verdict` — the verdict that closed the round (`PASS`, or
  `REVISE` plus the finding that opened round N+1). Absent on round 1 when no
  review has run yet.

## Single-round items

A single-round item satisfies the contract with `Round 1: ...` and no
reviewer-verdict line, which is the same content the previous one-pair
contract required. Nothing existing becomes non-conformant.

## Where the rounds happen

An item at `review-fix` may re-enter the RED/GREEN cycle as many times as the
rework needs. Each pass is its own round block. Returning to `refactor`
re-submits the item to the reviewer that opened the round.
