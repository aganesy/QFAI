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

## Resolving the owning spec

`Owning spec` cannot be read off the finding. An ordinary contract ID is
`CON-API-NNNN` / `CON-DB-NNNN` — it carries no spec number — and the contract
file declares only its own `QFAI-CONTRACT-ID`, never an owner. Ownership lives
on the spec side, which the Read Set Contract's Default Mode does not cover, so
resolve it in this order and say in the row's `Why not this stage's work` which
source answered.

1. **The generated Contract → Spec map.** `npx qfai report --in <scoped-json>`,
   pointed at the artifact the scoped gate just wrote. **Derive `<scoped-json>`
   from `output.validateJsonPath`, not from `paths.outDir`**: the scoped run
   writes its result beside the configured validate JSON, inserting
   `.spec-<id>` before that path's extension — so it is
   `.qfai/report/validate.spec-<id>.json` only while that key is still its
   `.qfai/report/validate.json` default. A repository that sets
   `output.validateJsonPath` and `paths.outDir` to different places gets an
   ENOENT from a path built out of the latter, which leaves this step with no
   input at all.
   **Not `--run-validate`, and not a bare `npx qfai report`.** `--run-validate`
   is not a report-only flag: with no `--profile` it re-runs the full profile
   **unscoped**, which re-runs the ATDD validators over every spec, and the
   scaffold-placeholder rule advances a persistent per-`TC` validate-cycle
   counter on each one. Resolving an owner would then escalate this spec's and
   its siblings' scaffold placeholders from warning to error ahead of their
   grace window — a read that changes the verdict it is being consulted for.
   A bare `npx qfai report` reads the configured `validate.json`, which a
   `--spec` run never writes, so it exits 2 in a fresh environment and reports a
   stale unscoped run in an older one. `--in` reads the JSON it is given and
   runs no validator, so it moves no counter.
   The run writes `<report>/report.md` — where `<report>` is `paths.outDir`
   from `qfai.config.yaml`, `.qfai/report` only by default, and `--out`
   overrides even that — with a
   `### Contract → Spec` section — one line per contract ID listing every spec
   that declares it — a `### Spec → Contracts` table beside it, and
   `--format json` puts the same maps at
   `traceability.contracts.idToSpecs`. Open the path the run just printed as
   `wrote report: <path>`; do not read a fixed `.qfai/report/…` on the
   assumption it is still the configured one. On a repository that points
   `paths.outDir` elsewhere, that assumption reads no report at all — and
   reports every residual contract as unattributable — or reads an older report
   still sitting at the former default and names the owner it recorded then,
   which is a wrong owner in the one field that has to be right. It is a
   generated report artifact, not a
   sibling spec pack, so reading it widens no read set.
   Two things drop a real owner off that ID's line, and both of them look
   exactly like `(none)`. It is built from the `QFAI-CONTRACT-REF:` lines in
   each spec's `01_Spec.md`, so a spec that binds its contracts only in the rule
   table is missing from that line — that is what step 2 recovers. And the line
   is keyed by the **full** declared `CON-API-NNNN` / `CON-DB-NNNN` while a
   `QFAI-CONTRACT-REF:` may legally be written in the short `API-NNNN` /
   `DB-NNNN` / `UI-NNNN` form; the short ref is matched verbatim against those
   keys, matches none, and is silently dropped. **Normalize the short form
   before you read an owner off that line** — `API-NNNN` _is_ `CON-API-NNNN`,
   `DB-NNNN` _is_ `CON-DB-NNNN`, the same contract — and read the
   `### Spec → Contracts` table beside it, which prints each spec's refs as
   written and is therefore where a short ref survives: merge in every spec
   whose row names this contract in **either** form. Skipping that reads a
   declared contract as an orphan, and FAILs a run whose residue was
   attributable all along. The map is therefore incomplete per ID, not merely
   empty per ID — which is why step 2 is not a fallback.
2. **The rule tables' `Contract-Refs` column — always, not only when step 1 is
   unavailable or answers `(none)`.** Read the `Contract-Refs` column of
   `.qfai/specs/*/04_Business-Rules.md` — the documented per-spec contract
   binding — and **merge** its owners into the map's answer for that ID. That
   column takes the short form too, so normalize it the same way before you
   compare: a row reading `API-0001` binds `CON-API-0001`. A
   non-empty map line proves one owner; it never proves it found them all, so a
   partly-filled map is exactly the case this step exists for. **Your own
   spec's rule table is inside that merge**: if it binds the ID, the contract is
   this run's own however many siblings the map names beside you, and it FAILs
   here rather than becoming residue. This is the one narrow exception to
   Default Mode: that column only, no other content of a sibling pack, and
   nothing is written back.

`.qfai/specs/_policies/05_Contracts.md` does **not** answer this. It is the
contract index — short ID, file, purpose — and has no spec column at all.

What the answer means:

- **One spec** — that spec is `Owning spec`, unless it is this spec: then the
  contract is this run's own and it FAILs, with no row here.
- **Several specs** — every one of them owns it. Name them all; the contract is
  closed by whichever of those runs covers it first, and none of them may record
  it as another's. This spec being one of the several is the same FAIL as above:
  a co-owner discharges its own contracts, it does not hand them to a co-owner.
- **No spec** — the contract is an orphan, declared under `.qfai/contracts/**`
  and referenced by no spec. Only after the normalization and the merge above:
  a real owner that declared the contract in the short form reaches this branch
  otherwise, and a permanent FAIL against a run whose residue was attributable
  is the most expensive way to be wrong here. A true orphan is not attributable
  residue: it is this run's finding to carry, it FAILs, and the fix is a
  `/qfai-sdd` triage of the orphan, not a row here.

## The evidence entry

In `.qfai/evidence/atdd-<spec-id>.md`, under `## Cross-spec obligations`, **one
row per uncovered contract ID** — not one per finding. `QFAI-ATDD-113` and
`QFAI-ATDD-115` are emitted once per family, with every uncovered contract
aggregated into that single finding's `refs`, so two contracts owned by two
different sibling specs arrive as one finding whose single `Contract ID` and
`Owning spec` cell could record only one of them. Split the finding's `refs`
into one row each. Write `None` when the scoped run exited 0 — an absent
section after a run that exited 1 is unrecorded residue, not a clean run.

| Field                       | Meaning                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Finding`                   | the rule code that reported this contract — `QFAI-ATDD-113` or `QFAI-ATDD-115`; the same code repeats across rows when one finding aggregated several contracts |
| `Contract ID`               | exactly one `CON-API-*` / `CON-DB-*` from that finding's `refs` — one ID per row, never a list                                                                  |
| `Owning spec`               | every sibling spec that declares that contract, resolved above — never this spec, and never blank                                                               |
| `Why not this stage's work` | one sentence tying the contract to that spec's scope, not to this run's convenience                                                                             |
| `Closed by`                 | the owning spec's next `/qfai-atdd` run, or `/qfai-verify` for the repo-wide run at stage end                                                                   |

`Owning spec` is the load-bearing field. "A contract elsewhere is uncovered" is
not a record; "`CON-API-0004` is declared by spec-0004, whose ATDD stage has not
run" is. An entry that names no owning spec, names this spec, omits the contract
ID, or leaves any ID from the finding's `refs` without a row of its own is not a
hand-off, and the run is not done.

Example — one `QFAI-ATDD-113` naming two contracts, split into a row each, plus
the `QFAI-ATDD-115` beside it:

```md
## Cross-spec obligations

| Finding       | Contract ID  | Owning spec | Why not this stage's work                                                           | Closed by                    |
| ------------- | ------------ | ----------- | ----------------------------------------------------------------------------------- | ---------------------------- |
| QFAI-ATDD-113 | CON-API-0004 | spec-0004   | The endpoint is in spec-0004's slice; this spec declares no US or TC exercising it. | spec-0004's `/qfai-atdd` run |
| QFAI-ATDD-113 | CON-API-0005 | spec-0005   | Same finding, different contract: spec-0005 binds it in its rule table.             | spec-0005's `/qfai-atdd` run |
| QFAI-ATDD-115 | CON-DB-0007  | spec-0004   | The table is spec-0004's; this spec reads no row of it in any TC.                   | spec-0004's `/qfai-atdd` run |
```

## Not the same as cross-spec code ownership

`../../qfai-implement/references/cross-spec-ownership.md` defines a different
entry that lands in this same section for an `E2E` / `API` row: a file another
spec's ledger names in `Test file`, changed by this spec's work. That kind
**blocks** completion while it is open, because this run changed something and
left another spec's assertion unverified. This kind does not, because this run
changed nothing and the obligation was never its own. Keep the two kinds' rows
apart, and label them.

The distinction has to hold in `/qfai-implement`, not only here. That skill is
the normal next stage, its `E2E` / `API` / `Integration` rows keep their
evidence in this same `.qfai/evidence/atdd-<spec-id>.md`, and its completion
prohibition reads an open `## Cross-spec obligations` entry as a blocker. Left
undifferentiated, it would re-block on the rows this run recorded, and
`PASS with cross-spec obligations` would move the deadlock one stage down
instead of ending it — so `../../qfai-implement/SKILL.md` narrows that condition
to the code-ownership kind. What keeps that carve-out honest is the same floor
as here: a row naming no owning spec, or naming the spec whose run is reading
it, is not attributed residue and blocks on both sides.
