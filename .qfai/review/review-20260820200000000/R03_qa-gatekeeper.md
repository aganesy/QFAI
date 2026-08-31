# REVISE — qa-gatekeeper, /qfai-atdd spec-0017

- Reviewer: `qa-gatekeeper`
- Status (PASS/REVISE/PENDING): **REVISE**
- Revision reviewed: `8fb48002`
- `git status --porcelain` at start: empty. Rechecked at end: `8fb48002`, still empty. HEAD did not move.
- Mutations applied to the tracked tree: **none**. All gate runs used `git archive` shadow roots and `tmp/`
  scratch, so the tracked `.qfai/report/validate.log` was never written.

Every number the stage reported reproduces exactly. The REVISE is not about the measurements; it is about
three claims built on top of them — one of which is a false statement of fact about the ledger.

## Method note (why the first shadow run disagreed, and how it was fixed)

`git archive | tar -x` flattens the 83 tracked symlinks into directories on this platform, which makes
`QFAI-LINK-001` fire in the shadow and not in the real tree. Every number below was taken after
re-materialising all 83 symlinks from the index (`git ls-tree` mode `120000` + `ln -s`). Reported shadow
counts are therefore comparable to a real-tree run. Harness scripts: `tmp/r03-mkshadow.sh`,
`tmp/r03-oracle.mjs`.

## Gate results — all confirmed

| Gate | Stage claim | Measured | Verdict |
| --- | --- | --- | --- |
| `validate --profile atdd --fail-on error --spec 0017`, before | `info=2 warning=0 error=2` (111 on 9 US, 112 on 8 TC) | identical, at `c9c6d2fc` | confirmed |
| same, after | `info=2 warning=0 error=1` (112 only) | identical, exit 1 | confirmed |
| `validate --profile tdd`, `QFAI-ATDD-111` items | 20 -> 11 | 20 -> 11; spec-0017 items 9 -> 0 | confirmed |
| same, counts | `info=5 warning=376 error=2` unchanged | identical on both shadows | confirmed |
| `pnpm -C packages/qfai test:e2e` | 1414 passed, 16 skipped, exit 0 | 81 files passed / 4 skipped; 1414 passed / 16 skipped; exit 0 | confirmed |
| the nine new tests | 9 passed | `spec0017LayeredCiScaffoldE2E.test.ts (9 tests)` all pass | confirmed |
| `pnpm ci:lint` | exit 0, eleven members | exit 0; eleven members counted from the script | confirmed |
| `QFAI-ATDD-112` residual | the 6 `blocked` + 2 `todo` rows | exactly `TC-0017-0016/0030/0032/0033/0034/0035/0069/0070` | confirmed |
| annotation/describe correspondence | no annotation outruns a describe | 9 declared US = 9 describes = 9 in-file annotations = 9 ledger lines | confirmed |
| shipped-tree split | 0 uploads, 0 builds, 5 layer jobs, 0 hygiene invocations, 2 workflow files | all four measurements reproduce | confirmed |

The `ci:lint` baseline was taken at 19:12, before `R02_completion-reviewer.md` was written, so it does not
cover this pack's contents. It does not need to: `.prettierignore` carries `.qfai/review/**` and
`.markdownlint-cli2.jsonc#ignores` carries `.qfai/review/review-*/**`, and I confirmed the exclusion by
running `markdownlint-cli2` against this file directly (`Linting: 0 file(s)`). Populating the pack therefore
cannot move `ci:lint`.

## Finding 1 (blocking) — `## Ledger rows advanced` rests on a false statement of fact

The evidence says:

> All 71 `Integration` rows are already at `refactor`, so none is `todo` and none is selectable here.

Measured from `.qfai/specs/spec-0017/tdd/test-list.md`, cross-tabulating `Layer` against `Status`:

```text
63  Integration  refactor
 6  Integration  blocked
 2  Integration  todo      <- TDD-0069, TDD-0070
11  Unit         refactor
```

Two `Layer = Integration` rows are at `Status = todo`: `TDD-0069` and `TDD-0070`. The skill's Execution
Ledger section puts Integration rows in this stage's authorship ("`Layer = Integration` rows are tracked
there, but their tests are authored here"), so both are ATDD-owned and both are selectable. The premise is
false, and `none is selectable here` is the conclusion the whole section rests on.

This is not a nit, for three reasons.

1. **The stage read the correct numbers and then wrote the contradictory sentence.** `## Inputs reviewed`
   says "82 rows: 71 `Integration`, 11 `Unit`; 74 `refactor`, 6 `blocked`, 2 `todo`", and
   `## Coverage obligations checklist` says "63 of 71 covered". Both are right. The evidence contradicts
   itself, and the error is in the one section whose obligation the error discharges.
2. **P1b owed a branch choice for each of those two rows.** `references/red-provenance.md#what-each-stage-gate-owes`
   is unconditional: "**P1b — choose, for every row.** A row with no branch chosen is the one that leaves
   P1b with no legal transition out of `todo`." Neither row has a recorded branch.
3. **The consequence is named by the skill itself.** Read Set Contract: "A run that does not enumerate its
   `Layer = E2E` / `Layer = API` / `Layer = Integration` rows produces no `## Ledger rows advanced` entry for
   them, and `/qfai-implement` Phase Red step 3b then stops on a missing handoff." Step 3b confirms it: an
   entry that is absent "leaves the row at `todo` and stops with a handoff note". So `/qfai-implement` cannot
   proceed on `TDD-0069` or `TDD-0070`, and the evidence says the rows do not exist.

The cited authority does not cover the case either. `references/red-provenance.md#a-spec-with-no-atdd-owned-rows`
is scoped to a spec that has **zero `Layer = E2E` / `Layer = API` rows** — "A first run therefore finds
**zero** `Layer = E2E` / `Layer = API` rows, legitimately, and this stage cannot create them". spec-0017 has
71 Integration rows. Invoking a section written for "there are no rows to own" to discharge an obligation on
rows that exist and sit at `todo` is a misapplied citation.

**What I am not asking for.** I am not asking the stage to manufacture provenance, and its instinct there is
right. The ledger's own `Notes` give a strong, specific reason both rows are unsatisfiable now — `TDD-0069`
needs three consecutive green aggregate-verdict runs that do not exist on an unmerged branch; `TDD-0070`
needs at least twenty post-merge default-branch runs and is "not satisfiable on the branch that introduces
the tuning, by construction". That reason is better than the one the evidence gave. Required fix: delete the
false universal, name `TDD-0069` and `TDD-0070`, cite the ledger's own `Notes` as the reason neither was
selected, and record the P1b branch decision for each — branch 3 with a `DR-*` is the fitting branch given
the obligations cannot be observed at all, and `P1d` then routes this gate on that `DR-*`. Leaving them
parked keeps the spec open, which is consistent with the `FAIL` the stage already declares.

The same overstatement appears once more, in `## Test volume estimate`: "Integration | 71 | 71 | ... already
implemented under `/qfai-implement`". Eight of the 71 are not implemented.

## Finding 2 (blocking) — the five oracle rounds: four confirmed, `E4` is narrower than reported

I could not re-run the stage's mutations against the repo without mutating it, so I reproduced the nine
predicates verbatim from `spec0017LayeredCiScaffoldE2E.test.ts` into `tmp/r03-oracle.mjs`, ran
`qfai init` into `tmp/r03-init`, and mutated **copies of the init output** only. The init output is
byte-identical to `packages/qfai/assets/init/root/.github/workflows/*` (verified with `cmp`), so mutating the
copy is equivalent to mutating the asset. The harness reports all nine predicates passing on the pristine
tree, matching the real suite's 9 passed — so it is faithful.

| Round | Mutation | Stage claim | Measured | Verdict |
| --- | --- | --- | --- | --- |
| `E1` | `actions/checkout@<40hex>` -> `@v4` | REDDENS | reddens `US-0002` only | confirmed |
| `E2` | mapping doc loses "does not read" / "not the file the loader" | REDDENS | reddens `US-0009` only | confirmed |
| `E3` | `toJSON(needs)` -> `needs.unit.result` | REDDENS | reddens `US-0001` only | confirmed |
| `E5` | trailing comment in the orchestrator (control) | reddens nothing | reddens nothing | confirmed |
| `E4` | a lane gains its own bundler build | REDDENS | **form-dependent** — see below | partly |

`E1`, `E2`, `E3` each redden exactly one row, and it is the right row: the mutation violates the property
that row's assertion names, an assertion inside that row's own describe raised the failure, and no sibling
row moved. The `E5` control holds. These are real oracles and I accept them.

`E4` is the one you flagged, and you were right to. The predicate is

```text
/\b(pnpm|npm|yarn)\s+(-\S+\s+\S+\s+)?build\b/
```

Planting a build step in the `unit` lane, one form at a time:

```text
pnpm build                      -> reddens US-0004
pnpm -C packages/qfai build     -> reddens US-0004
yarn build                      -> reddens US-0004
pnpm run build                  -> reddens NOTHING
npm run build                   -> reddens NOTHING
yarn run build                  -> reddens NOTHING
pnpm exec tsup                  -> reddens NOTHING
npx tsup                        -> reddens NOTHING
```

So `E4` does violate the property it targets, for the form the stage evidently planted, and it is not the
false "reddens nothing" you were worried about. But the optional group `(-\S+\s+\S+\s+)?` admits exactly one
flag-and-value pair and nothing else, so the `run` sub-command form — the most common way a JS project
invokes its build in CI, and the form this repo itself ships in `release.yml` (`prepack` runs
`npm run build`) — passes straight through. So does any direct bundler invocation. The oracle proves the
assertion is not vacuous; it does not support "no shipped lane may run its own build", which is what the
assertion message claims. `pnpm -C packages/qfai build` is this repo's own idiom (`package.json#scripts.build`,
`ci.yml:326`), so the coverage is not accidental — it is just much thinner than one round implies. Record the
five forms that escape, or widen the predicate.

## Finding 3 (blocking) — the five shipped layer lanes are `echo` placeholders, and this is nowhere recorded

Measured in `assets/init/root/.github/workflows/qfai-tests.yml`. Each of `unit`, `component`, `integration`,
`api`, `e2e` has exactly one step:

```yaml
      - name: unit lane placeholder
        run: echo "unit lane placeholder - opted in, but the test-lane body ships in a later revision of this file"
```

`detection` and `verdict` have real bodies — `verdict` genuinely reads `toJSON(needs)` through
`QFAI_NEEDS_JSON`, which is why `E3` is a real oracle. The five layer lanes run no tests at all.

Neither the evidence nor the matrix says this. The evidence records `US-0017-0005` as "5 separate JOBS, not
matrix legs" and the matrix justification argues five jobs versus matrix legs, "Both satisfy 'one workflow
file'". That framing treats the divergence as a shape question. The material fact is that an adopter receives
a CI scaffold whose five test lanes execute `echo`. That is a stronger version of the stage's own headline
finding, and the stage's summary — "the 'and ship it to adopters' half of `spec-0017` is roughly half done" —
understates it.

It also changes how two assertions read:

- **`US-0017-0004`** asserts `rebuilding == []`. It passes because no lane runs anything, not because reuse
  discipline holds. `E4` shows the assertion can fail, so it is not vacuous — but the reason it currently
  passes is unrelated to the obligation. This is the weak-oracle shape: the asserted clause ("no lane runs a
  build") is genuinely weaker than the obligation ("measurement-gated build reuse and artifact-upload
  hygiene"), and the matrix scores `Oracle strength` **✅** on a row whose `Normal path` is **❌**. A strong
  oracle over a case the same table says does not exist is internally inconsistent. Per
  `oracle-strength.md`, the weakness is upstream, not the implementer's to fix by strengthening past the
  contract — so route it as an advisory, but do not leave `Oracle strength` at ✅.
- **`US-0017-0005`** asserts `lanes.length >= 5`. Five placeholder jobs satisfy it. The assertion certifies
  "every test layer is a job of the one orchestrator" over five stubs.

Required fix: record the placeholder state in the evidence and the matrix, and re-score `US-0017-0004`'s
`Oracle strength`.

## Finding 4 (blocking) — the annotations are not "verified by" the gate; the gate cannot see the tests

You asked whether the nine annotations are earned. The invariant-substitution question is the second-order
one. The first-order fact is that the gate never reads the tests at all.

`qfai.config.yaml` sets `paths.testsDir: tests`, and `atddTraceability.ts` resolves
`e2eRoot = path.join(testsRoot, "e2e")` and glob-scopes the scan to it. So `QFAI-ATDD-111` scans the
repository-root `tests/e2e/**`, whose only member is `qfai-traceability.md`. The actual tests live in
`packages/qfai/tests/e2e/**`, which is not in the scan set. `.md` is an accepted annotation carrier
(`STRUCTURAL_ANNOTATION_EXTENSIONS`).

Two shadow experiments, both scoped `--spec 0017`:

```text
EXP A  nine ledger lines removed, test file PRESENT   -> QFAI-ATDD-111 fires on all 9;  error=2
EXP B  ledger lines PRESENT, test file DELETED        -> QFAI-ATDD-111 silent;          error=1
```

`EXP B` is the decisive one: deleting `spec0017LayeredCiScaffoldE2E.test.ts` outright leaves the gate reading
`error=1`, exactly as it reads today. The nine-line append to `tests/e2e/qfai-traceability.md` is the entire
mechanism that moved `error=2` to `error=1`. The test file is invisible to the gate, and the nine
`// QFAI:SPEC-0017:US-0017-NNNN` comments inside it count for nothing.

This mechanism is **not this stage's defect**. It is `CR-20260814-0001`, whose title says it in as many
words — "reads a hand-maintained annotation file that nothing couples to the test markers it stands for, so
it certifies coverage in both false directions" — `Status: approved`, `Approved option: A`, `Applied at: -`.
Every spec in this repo clears `QFAI-ATDD-111` the same way. I reproduced it here for `-111`; the CR
documents it for `-112`.

What **is** this stage's to fix is the claim built on it. `## Coverage obligations checklist` reads:

> `US-0017-0001` … `US-0017-0009` — **covered**, `tests/e2e/**`, verified by
> `validate --profile atdd --spec 0017` no longer reporting `QFAI-ATDD-111`

That gate verified the presence of nine markdown list items. It is the false-direction certification the CR
names, cited as verification. The stage knows this — Decision 4 cites the CR and says appending the lines
"would have cleared the gate at any point in the last six rounds". Then the checklist cites the cleared gate
anyway. Required fix: state that the nine US are covered by the nine describes, that the gate does not
corroborate that, and cite `CR-20260814-0001` at the point of the claim.

The mitigation the evidence offers does not survive either. Decision 4:

> The script that appended them refuses unless every declared `US` is covered by a `describe` in the E2E
> file, so the ledger cannot outrun the tests.

**That script is not in the tree.** `git show --stat 1e806e50` lists five files: the two evidence files,
`validate.log`, the test file, and the nine ledger lines. No script. Searching the repo for anything coupling
the ledger to describes returns only `src/core/atddTraceability.ts`, `tests/core/atddTestFileGlobs.test.ts`
and `tests/integration/shippedWorkflowShapeGate.test.ts` — none of which enforces it. So the coupling is an
uncommitted local process, described in prose by the party that ran it, unverifiable and unenforced. Nothing
stops the next stage from appending a line with no describe. That is self-attestation standing in for a
check, which is the one substitution this gate exists to refuse. I did verify the correspondence holds
**today** by inspection — 9 declared US, 9 describes, 9 in-file annotations, 9 ledger lines, no overrun — but
that is my measurement, not the script's guarantee. Required fix: drop the claim, or commit the script and
wire it into `ci:lint`.

**On the invariant substitution itself, I side with the stage.** Asserting "no hygiene lane is invoked" would
fail the day someone correctly adds one, and a test that punishes its own fix is worse than a thin one. Given
a shipped tree that does not satisfy five of nine stories, asserting the surviving invariant plus a `❌` cell
is the honest available move, and I would not ask for absence-pinning. But an invariant assertion is not
coverage of the story, so the annotation does certify more than the test establishes — and because of the
mechanism above, it would certify it with no test at all. The answer to your question is: adequate as *test
design*, not adequate as the *coverage claim* the evidence makes from it.

## Finding 5 (blocking) — Coverage Depth Matrix: the stated totals are wrong, and six ❌ cells are unjustified

The matrix exists at the committed path `.qfai/evidence/coverage-depth-spec-0017.md`, which is what this gate
requires, and it carries a narrative justification per ❌ `Status` row. Two defects.

**The totals are miscounted, in the direction that understates the gap.** Both the matrix ("Totals: **✅ 3 /
⚠️ 2 / ❌ 4**") and the evidence ("Totals by `Status`: ✅ 3 / ⚠️ 2 / ❌ 4") state four ❌. Tallying the
`Status` column:

```text
US-0017-0001 ⚠️   US-0017-0002 ✅   US-0017-0003 ⚠️
US-0017-0004 ❌   US-0017-0005 ❌   US-0017-0006 ❌
US-0017-0007 ❌   US-0017-0008 ❌   US-0017-0009 ✅

actual: ✅ 2 / ⚠️ 2 / ❌ 5
```

The matrix's own prose agrees with my count, not with its total: it carries **five** `### US-0017-NNNN ... ❌`
justification sections (0004, 0005, 0006, 0007, 0008). Both figures sum to 9, so the error is in the
distribution — one row scored ❌ is reported as ✅.

**Six ❌ cells carry no justification.** `references/test-case-depth-checklist.md` is explicit: "**REVISE**:
Any cell is ❌ without an explicit justification", and a justification must name "the cell". There are 37
non-`Status` ❌ cells. The five per-row sections cover the rows scored ❌ overall, and the "Rows scored ⚠️
rather than ❌" section names `US-0017-0001`'s `State transitions` and `Combinatorial` explicitly. Unaccounted
for, all on the four rows the stage presents as its successes:

```text
US-0017-0001  Boundary values
US-0017-0002  State transitions
US-0017-0003  State transitions, Combinatorial
US-0017-0009  State transitions, Combinatorial
```

`US-0017-0003`'s note explains why the row is ⚠️ but names neither ❌ cell. Required fix: justify those six by
name, or re-score them.

## Rulings on your five questions

**1. The five oracle rounds.** `E1`, `E2`, `E3` confirmed — each reddens exactly the right row, for the
property it targets. `E5` control confirmed. `E4` does violate its property and is not the vacuous case you
feared, but it is form-fragile: five common build idioms escape the predicate, and the assertion passes today
because the lanes are empty. See Findings 2 and 3.

**2. Whether the nine annotations are earned.** The invariant-substitution design is defensible and I would
not ask you to pin the absences. But the annotations are not earned *as a coverage claim*, and for a reason
larger than the substitution: `EXP B` shows the gate certifies all nine with the test file deleted. This is
`CR-20260814-0001` in the direction it predicts, approved and unapplied. Not your defect; the "verified by
the gate" sentence and the uncommitted-script mitigation are. See Finding 4.

**3. `QFAI-ATDD-112`'s residual.** Your mapping is exactly right — the 8 named TCs are precisely the 6
`blocked` and 2 `todo` rows, and I confirmed the `Blocked-By` values (4 on `CR-20260820-0007`, 1 on
`CR-20260818-0007`, 1 on `CR-20260820-0001`). Your normative claim is half right. It is correct that they have
no test because they are not implemented, and correct that this stage cannot close the four blocked on a CR
requiring `07_Decisions.md` edits. It is **not** correct that this is "not a not-done condition this stage
should have closed": the skill's Not-done criteria say "Any required `US` / `TC` / `CON-API` remains
uncovered", and Success Criteria require the scoped gate to pass. These are spec-0017's **own** TCs, so the
CRITICAL CONSTRAINTS cross-spec escape hatch — which covers findings owned by *other* specs — does not reach
them. The residual is a genuine not-done condition. It happens to be one this stage could not have closed,
which is why it supports the `FAIL` rather than excusing it.

**4. The stage's own status.** `FAIL` is correct and the stage is **not** closeable. Three independent
grounds, any one sufficient: the scoped gate exits 1 on this spec's own uncovered TCs; the Stage Minimum
Roles were not used and the `completion-reviewer` gate was undelegated, so "Completion is approved by a
reviewer who did not implement tests" is unmet; and there is no P8 `Audited evidence hash`, because no P8
reviewer ran. Recording the deviation plainly in `## Work Orders Summary` rather than glossing it is the right
call and I am not penalising it — the deviation is unrepairable retroactively, as your request says, and this
round repairs the gate rather than the history. This verdict does not clear the completion gate.

**5. The `Review pack seal`.** The evidence currently reads `Review pack:` none opened for this stage /
`Review pack seal:` not applicable. That was true at `1e806e50` and is false at `8fb48002`: this pack exists.
The stage owes, per Success Criteria — after the last reviewer response lands and **before** it writes its
verdict — a hash of `.qfai/review/review-20260820200000000/` whole, recorded **outside** the pack in
`## Final status` as `Review pack:` (the path) and `Review pack seal:` (the hash), then a **separate**
recomputation at completion compared against the **recorded** value. The two moments are the whole point: a
value computed at completion always matches itself, so recording and recomputing in one pass verifies
nothing. Note also that this pack is gitignored, so the seal recorded in the evidence is the only durable
record that these reviews existed and said what they said. Delete the stale "none opened" text.

## RED/GREEN observation gate

**Not applicable this round, and correctly so.** This gate adjudicates per-ledger-row RED/GREEN observation
evidence, and no ledger row was advanced — `Status` cells are unchanged and this stage is not the ledger's
writer. There is therefore no RED to accept or refuse, and no `Oracle proof` owed in the per-row sense.

Two consequences worth stating explicitly, so a later round does not read this section as broader than it is:

- The five oracle rounds `E1`-`E5` are **stage-level** mutation evidence for acceptance assertions, not
  per-row RED provenance. Accepting `E1`-`E3` and `E5` above does not discharge any row's obligation.
- `TDD-0069` and `TDD-0070` remain at `todo` with no branch chosen (Finding 1). When a branch is recorded for
  them, that evidence comes back to this gate — branch 3 needs a `qa-gatekeeper` PASS on the `DR-*` at P1d
  before `/qfai-implement` may write `todo -> exception`.

## Required fixes

1. Delete the false claim that no `Integration` row is at `todo`. Name `TDD-0069` and `TDD-0070`, cite the
   ledger's own `Notes` as the reason neither was selected, and record a P1b branch decision for each.
2. Correct the `## Test volume estimate` note that all 71 Integration rows are "already implemented".
3. Record the five build idioms `E4` does not catch, or widen the predicate in `US-0017-0004`.
4. Record that the five shipped layer lanes are `echo` placeholders, in both the evidence and the matrix, and
   re-score `US-0017-0004`'s `Oracle strength` from ✅.
5. Stop citing the cleared `QFAI-ATDD-111` as verification of the nine US. Cite `CR-20260814-0001` at the
   claim.
6. Drop the "the script refuses unless every declared US is covered by a describe" mitigation, or commit the
   script and wire it into `ci:lint`.
7. Fix the matrix `Status` totals to ✅ 2 / ⚠️ 2 / ❌ 5, in both the matrix and the evidence.
8. Justify by name, or re-score, the six unjustified ❌ cells listed in Finding 5.
9. Replace the `Review pack:` / `Review pack seal:` lines per question 5.

## Residual risks recorded

- `CR-20260814-0001` is approved and unapplied, so `QFAI-ATDD-111` / `-112` remain satisfiable by editing a
  markdown list. Every spec in this repo currently clears `-111` through that path, not this one only.
- The adopter-facing half of spec-0017 is materially less complete than "roughly half done": five of nine
  stories unsatisfied **and** the five shipped test lanes are stubs.
- `QFAI-ATDD-111` stays at 11 items repo-wide (`spec-0003` 8, `spec-0006` 1, `spec-0008` 1, `spec-0015` 2).
  Correctly recorded by the stage as a cross-spec obligation; not this stage's work.
- `TDD-0069` / `TDD-0070` are unsatisfiable until CI history exists, so they will keep the scoped gate at
  `error=1` regardless of this stage's work.

## Sign-off

- [x] Review verdict is explicit: **REVISE**
- [x] Findings cite concrete artifacts, measured commands and reproducible harnesses
- [x] Required gates and residual risks are recorded
- [x] No mutation applied to the tracked tree; HEAD `8fb48002` unchanged, `git status --porcelain` empty
