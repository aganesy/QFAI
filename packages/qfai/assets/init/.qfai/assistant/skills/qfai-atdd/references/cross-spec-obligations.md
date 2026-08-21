# Cross-spec Obligations

What a `/qfai-atdd` run does with the findings its own gate reports and its own
spec cannot close — and what state the run ends in once it has.

## Why this needs a rule at all

`/qfai-atdd` runs one spec per invocation and gates on
`npx qfai validate --profile atdd --fail-on error --spec <spec-id>`. `--spec`
narrows every rule whose finding names a spec. It cannot narrow the ones filed
against paths no spec owns, and those still exit 1.

So on a repository with two specs, each declaring one `CON-API-*`, the first
run covers its own contract and `QFAI-ATDD-113` still reports the sibling's.
CRITICAL CONSTRAINTS forbids all four ways out of that — claiming the gate
passed, weakening the profile, lowering `--fail-on`, waiving — and the remedy
it names, the owning spec's next run, hits the identical block from the other
side. Without a terminal state for the compliant path, every spec waits for
every other one, the stage closes only in one final repo-wide pass, and the
per-spec completion `--spec` exists to enable is unreachable. A state the skill
does not name is the state an agent invents, out of the four forbidden moves.

## What the scope flag cannot narrow

- `QFAI-ATDD-113` (`CON-API`) and `QFAI-ATDD-115` (`CON-DB`) are attributed to
  `.qfai/contracts/**`, which has no spec owner in the model.
- A reference, or a scaffold directory, naming a spec number no spec pack has,
  **and sitting where no spec owns it either**: `--spec` on that number is
  itself rejected, so nothing would report it otherwise. A file under the
  canonical `tests/<layer>/spec-NNNN/**` layout is owned by _that_ spec whatever
  its annotation says, so the same broken reference inside
  `tests/integration/spec-0002/**` belongs to `--spec 0002` and to no other run
  — reading it as a repo-wide blocker in a sibling run reports something that
  run cannot see.
- Anything else reported against a repo-level path.

## The terminal state

A run that has discharged everything its spec owns, and has attributed every
residual finding to a named sibling spec, completes as
**`PASS with cross-spec obligations`**. It is a completion, not a deferral of
one: the Definition of Done reads as two parts — no finding this spec owns
remains, and every residual finding is recorded — and the Not-done criterion
about failing validation is about part 1 only.

What it does not license:

- A residual finding you cannot attribute to a named sibling spec is **this**
  spec's own. It FAILs, as it did before.
- The recorded obligation is not closed by recording it. It blocks the **owning**
  spec's completion until that spec's next `/qfai-atdd` run covers the contract.
- The repo-wide run — every spec's contracts at once, unscoped — belongs to
  `/qfai-verify` at the end of the stage. That is where the residue is settled,
  and no `/qfai-atdd` run may report the stage clean on its behalf.

## The evidence entry

In `.qfai/evidence/atdd-<spec-id>.md`, under `## Cross-spec obligations`, one
row per residual finding. Write `None` when the scoped run exited 0 — an absent
section after a run that exited 1 is unrecorded residue, not a clean run.

| Field                       | Meaning                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `Finding`                   | the rule code the scoped run reported — `QFAI-ATDD-113` or `QFAI-ATDD-115`                    |
| `Contract ID`               | the `CON-API-*` / `CON-DB-*` the finding names                                                |
| `Owning spec`               | the sibling spec that declares that contract — never this spec, and never blank               |
| `Why not this stage's work` | one sentence tying the contract to that spec's scope, not to this run's convenience           |
| `Closed by`                 | the owning spec's next `/qfai-atdd` run, or `/qfai-verify` for the repo-wide run at stage end |

`Owning spec` is the load-bearing field. "A contract elsewhere is uncovered" is
not a record; "`CON-API-0004-002` is declared by spec-0004, whose ATDD stage has
not run" is. An entry that names no owning spec, names this spec, or omits the
contract ID is not a hand-off, and the run is not done.

Example:

```md
## Cross-spec obligations

| Finding       | Contract ID      | Owning spec | Why not this stage's work                                                           | Closed by                    |
| ------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| QFAI-ATDD-113 | CON-API-0004-002 | spec-0004   | The endpoint is in spec-0004's slice; this spec declares no US or TC exercising it. | spec-0004's `/qfai-atdd` run |
```

## Not the same as cross-spec code ownership

`../qfai-implement/references/cross-spec-ownership.md` defines a different
entry that lands in this same section for an `E2E` / `API` row: a file another
spec's ledger names in `Test file`, changed by this spec's work. That kind
**blocks** completion while it is open, because this run changed something and
left another spec's assertion unverified. This kind does not, because this run
changed nothing and the obligation was never its own. Keep the two kinds' rows
apart, and label them.
