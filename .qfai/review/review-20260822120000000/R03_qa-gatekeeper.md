# R03 — qa-gatekeeper, round 17, spec-0017 (stage gates)

**Revision at start:** `1d7c0c3f`. **Revision at finish:** recorded at the end of this file.

**Verdict: REVISE.** Two gates passed and are stated below; three findings, one of them an
execution channel in the shipped tree that the whole suite ships green.

## Gates that passed

| gate | recorded | measured at `1d7c0c3f` | verdict |
| --- | --- | --- | --- |
| `pnpm -C packages/qfai test:e2e` | 1445 passed / 16 skipped, exit 0 | **1445 passed / 16 skipped, exit 0** | PASS |
| `vitest --project integration --project unit` | 1219 passed / 19 skipped, exit 0 | **1219 passed / 19 skipped, exit 0** | PASS |
| `e2e callsites at this tree: 881` | 881 | **881** (re-derived independently of `stageEvidenceCounts.test.ts`, from the `e2e` project's own two includes) | PASS |
| scoped `validate --profile atdd --spec 0017` | `info=2 warning=0 error=1`, `QFAI-ATDD-112` alone | **`info=2 warning=0 error=1`, `QFAI-ATDD-112` alone, on the same eight TCs** | PASS |
| `validate --profile full` | `error=49` | **`error=50`** | see `M1` |

The callsite figure was re-derived rather than taken from the guard that pins it: the guard lives in
`tests/assets/**`, which runs in the `e2e` project, so a green e2e run and the guard's own verdict are
the same observation. A separate walk over `tests/e2e/**` and `tests/assets/**` with the same callsite
rule returns 881.

The scoped gate's single error names `TC-0017-0016`, `-0030`, `-0032`, `-0033`, `-0034`, `-0035`,
`-0069`, `-0070` — eight TCs, matching the record.

## Plant disclosure

I planted in `packages/qfai/assets/init/root/`, which is outside the directory the pack partitions to
me (`.../root/.github/workflows/`) and which I therefore say plainly here: two **new** files,
`package.json` and `.npmrc`, plus for one measurement a third, `.ci-primer.cjs`. Nothing tracked was
edited, so restoration was deletion rather than a copy-back. The workflow directory I own was **not**
touched this round — a sibling seeing a diff there is seeing something other than my plant. Both plants
are removed; the final `git status` is at the end of this file.

`.qfai/report/validate.log` is rewritten by both `vitest run` and the validate command; it is restored
from `git show HEAD:<path>`, as the request's trap note requires.

## Findings

### `B1` — an execution channel in the shipped tree, outside every pin, green through the whole suite

`ALLOWED_WORKFLOW_SHAPE` / `ALLOWED_JOB_SHAPE` / `ALLOWED_STEP_SHAPE` pin `.github/workflows/**`
completely: I could find no way to move a workflow key, a job key, a step, its `if:`, its `id:`, its
action, its inputs or its body digest without reddening
`tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`. That is the boundary working. It is also the whole
boundary, and `qfai init` copies `assets/init/root/**` wholesale
(`runInit` -> `copyTemplateTree(rootAssets, destRoot, …)`, create-only, no allowlist).

**The plant.** Two files added to `packages/qfai/assets/init/root/`:

- `package.json` with `"scripts": { "preinstall": "node -e \"…\"" }`
- `.npmrc` with `ignore-scripts=false`

**The chain, measured rather than argued.** `qfai init` into an empty directory puts all of it in the
adopter's tree. I then extracted the `run:` body of the shipped step
`qfai-validate.yml#validate` / "Install dependencies (lockfile-aware)" — the body whose digest
`ALLOWED_STEP_SHAPE` pins as `d7f6e8d3b5456c962a0062859324f37b2ffc1c3c2b136b180b3ed8b54bee3ea1` — and ran
it under `bash -e -o pipefail` in that directory, exactly as the file's own `runStep` helper does. Its
no-lockfile branch is `npm install --no-audit --no-fund`. Output:

```text
> qfai-project@0.0.0 preinstall
> node -e "import('node:fs').then(fs=>fs.writeFileSync('QFAI_PLANT_EXECUTED.txt', …))"

up to date in 482ms
MARKER PRESENT: true
```

The step body did not change and its digest did not move. What changed is what the shipped tree hands
it. This is the same shape as the four channels rounds 12-15 found — a surface that executes, and
nothing reads it — one level further out than the pins reach.

**What the suite said.** Every vitest project, all seven:

```text
Test Files  462 passed | 8 skipped (470)
     Tests  5412 passed | 51 skipped (5463)
EXIT=0
```

and `pnpm ci:lint` exit 0, all eleven members, including `prettier -c .`, `eslint . --max-warnings 0`,
`lint:shipping` and `lint:workflow-shape`.

**One near-catch, and why it does not count.** The first version put the payload in a shipped
`.ci-primer.cjs`, and `eslint` reddened it — `@typescript-eslint/no-require-imports` and `no-undef` on
the word `require`. That is a catch on a *style rule about how the file is written*, which is the exact
class this record has now rejected eleven times, and it costs one edit to evade: inlining the same
payload into the `preinstall` string removes the file, and `ci:lint` returns to exit 0 with the channel
intact. The evaded version is the one measured above.

**Why no existing guard sees it.** `shippedWorkflowFiles()` reads `.github/workflows/*.y?ml` and
nothing else; `initAssetsRootMirror.test.ts` mirrors `assets/init/.qfai/**` to the repository root and
ignores root-only files by design; `assets.test.ts`'s "free of wrapper directories" case names
`.claude`, `.codex` and five `.github/` subdirectories, none of them this; and
`distributedSurfaceLeakage.test.ts` greps the init output for internal identifiers, which a plant has
no reason to carry. The shipped tree has an unread surface, and it is every file in it that is not a
workflow.

**Scope of the repair, which is a design question rather than a line.** Adding `package.json` and
`.npmrc` to a denylist reproduces the mistake the step-shape pin was built to stop making: the previous
four repairs each named the key just used. The decidable form is the one this file already reached
twice — enumerate what the shipped tree contains and refuse the rest. `assets/init/root/**` is four
files; a pinned manifest of them, with content digests for the non-workflow ones, is the same
instrument as `ALLOWED_STEP_SHAPE` applied one directory up. `assets/init/.qfai/**` is larger and is
already mirror-checked against the repository root, which is a weaker claim than a pin but not nothing.

### `M1` — `--profile full` is `error=50` at the revision under review, and the table's `QFAI-REVIEW-005` row is wrong

`## P7 quality gates` and § "The full profile" both record `error=49`. Measured at `1d7c0c3f` with
`node packages/qfai/dist/cli/index.mjs validate --profile full`:

```text
counts: info=4 warning=403 error=50

QFAI-REVIEW-007   44
QFAI-REVIEW-004    2
QFAI-REVIEW-005    2      <- the record says 1
QFAI-ATDD-111      1
QFAI-ATDD-112      1
```

Three of the five rows verify exactly, and the two that matter most verify on their detail as well as
their count: unscoped `QFAI-ATDD-112` names **15** TCs across `spec-0003`, `-0008`, `-0015`, `-0017`,
of which this spec owns the **8** the scoped gate reports, and unscoped `QFAI-ATDD-111` names **11** US
across `spec-0003`, `-0006`, `-0008`, `-0015` and **none** of this spec's. Those are the two figures
option 2's surviving ground rests on, and they are sound.

**The `-005` row is not a stale re-measurement of the same state — it is a measurement of a state that
was never committed.** Two packs are incomplete at `1d7c0c3f`:

```text
QFAI-REVIEW-004  review pack に summary.json がありません。  (.qfai/review/review-20260822120000000)
QFAI-REVIEW-005  review pack に Rxx_*.md が1件もありません。 (.qfai/review/review-20260822120000000)
QFAI-REVIEW-004  review pack に summary.json がありません。  (.qfai/review/review-20260821200000000)
QFAI-REVIEW-005  review pack に Rxx_*.md が1件もありません。 (.qfai/review/review-20260821200000000)
```

Both packs fail both rules, so `-004` and `-005` are equal at any revision where those two are the
incomplete set. `-004 = 2, -005 = 1` requires a third state: one pack missing only its seal. That is
what round 16's own pack looked like **mid-round**, after its reports landed and before
`summary.json` did — a state that exists in a working tree for an hour and in no commit. At the parent
of `1d7c0c3f` the incomplete set was `{review-20260821200000000}` alone and the total was 48; at
`1d7c0c3f` it is 50. The recorded 49 is neither.

This is § "The full profile"'s own diagnosis, recurring in the paragraph that states it: *"Measuring
before repairing and recording after is a sequence that produces a true measurement of a tree that no
longer exists."* Round 16 caught the sequence version of it; this is the mid-round version.

**And the prose attributing it is wrong independently of the arithmetic.** The record says
`QFAI-REVIEW-004` / `-005` "are against **this stage's own in-flight review pack**", singular. Two packs
carry them, and `review-20260821200000000` is **round 13's**, opened at `b62adfa1`, holding a
`review_request.md` and nothing else while five later packs have opened, been reported into and been
sealed. It is not in flight; it is abandoned. The record's explanation — "a pack cannot satisfy the
layout contract until its last reviewer has landed and it has been sealed" — is true of one of the two
and false of the other, and the false half is a permanent `error=2` in the profile `build` runs, owned
by nobody because the sentence says it clears itself.

### `M2` — a claim this record retracts in one section is still asserted in another, and its citation points at the retraction

§ "Gaps / Open risks", item 3:

> The eight are NOT "the 6 `blocked` and 2 `todo` rows here", which is how this item read for several
> rounds: § "Ledger rows advanced" measures that false in both directions — four of the eight are
> `refactor` in the ledger while `CR-20260820-0007` holds them, and `TDD-0070` is named in no blocked
> set at all.

§ "Ledger rows advanced" says the opposite, in bold:

> **The four middle rows of that table said `refactor` for two rounds and they are `blocked`.** …
> `TDD-0032`-`-0035` carry `blocked` with `Blocked-By: CR-20260820-0007`, and have carried it since
> `bc36f08c`, 285 commits before this one … the six `blocked` rows are exactly `TDD-0016`, `-0030`,
> `-0032`, `-0033`, `-0034`, `-0035`.

Derived from `tdd/test-list.md` at `1d7c0c3f` rather than from either section:

```text
82 rows: refactor 74, blocked 6, todo 2
blocked -> TDD-0016 TDD-0030 TDD-0032 TDD-0033 TDD-0034 TDD-0035
todo    -> TDD-0069 TDD-0070
```

The eight TCs `QFAI-ATDD-112` reports are `TC-0017-0016`, `-0030`, `-0032`, `-0035`, `-0069`, `-0070`
and the two between — one per row above. **So the eight ARE the 6 `blocked` and 2 `todo` rows**, and
item 3 asserts the negation of that, supported by a clause that is false against the ledger, citing the
section that establishes the true version. A reader following the citation lands on the refutation of
the sentence that sent them.

The second clause, "`TDD-0070` is named in no blocked set at all", is true and does not rescue the
first: membership in a CR's `Blocked set:` is a different predicate from the ledger's `Status` column,
and item 3's claim is about the latter.

This is the P1d pass-4 and pass-5 shape — "a refuted claim still asserted in the DR's split paragraph",
"a refuted claim asserted in `CR-20260820-0012`" — recurring for the third time, and item 3's own last
sentence describes the recurrence about a *different* sentence in the same item ("surviving here in
different words") without noticing that its own does the same thing.

**The guard that exists for exactly this did not fire.** `tests/assets/retractedClaims.test.ts` carries
21 entries and none of them is this retraction; the nearest, `"All 71 Integration rows are already at
refactor"`, is a round-1 claim whose `why:` still reads "the ledger holds 63 refactor, 6 blocked and 2
todo" against a ledger now holding **74** refactor. The needle is unaffected — `why:` is prose — but a
registry whose stated grounds have gone stale is one edit away from someone re-deriving the wrong
needle from them. Registering the `TDD-0032`-`-0035` retraction is the fix that makes `M2` unable to
recur.

### `m1` — `revision_form` is recorded as an open question the contract already closes

The record and round 16's `summary.json` both say the repair "moved the pack from a value the schema
rejects to a value the schema accepts and the content does not support", and file the residue as an
open question: "Either the field's `content-hash` is meant to cover a commit sha … or the whole
repository mislabels it — and this stage cannot settle which, because the contract is not this spec's."

The contract settles it in one sentence, in a reference this stage already reads. From
`.qfai/assistant/skills/qfai-implement/references/review-artifact-layout.md`:

> **`revision_form: "content-hash"`** and **`revision`** — the state these verdicts describe, **as a git
> rev or `working-tree+<content hash>`** by the procedure in `evidence-revision.md`.

`revision_form` is a **contract marker** — `evidence-revision.md` says so directly: "That marker is how
a pack says which contract produced it", with `legacy` as the only other admissible value and its own
manifest to corroborate it. It is not a claim about the shape of `revision`, which the same sentence
says may be a git rev. The validator agrees and is explicit that the git-rev form is the one it can
check: `packages/qfai/src/core/validators/reviewArtifacts.ts` resolves a `revision` matching
`GIT_REV_FORM` against the repository's commits and reports `QFAI-REVIEW-009` when it does not, while
noting that "recomputing the uncommitted-tree hash would mean reimplementing the producer's four-step
procedure in the validator".

So the honest reading is the one the record ruled out: a short git sha under
`revision_form: "content-hash"` is what the contract prescribes, the round-16 edit was a fix rather than
a relabel, and nothing further is owed. The open question should be withdrawn rather than carried — the
caution is the right instinct applied to a question that is answerable from the inputs this role and
this stage both list.

Not blocking: the field is correct either way, and the cost of the entry is a reader believing the
repository mislabels 44 packs when it does not.

### `m2` — "the parking exists in the decision records and not in the artifact that indexes it" is false for both rows it describes

§ "Ledger rows advanced", on `TDD-0069` and `TDD-0070`:

> And for the last **two** the LEDGER — which is where a reader looks — records `-`, so the parking
> exists in the decision records and not in the artifact that indexes it.

`Blocked-By` records `-` for both, which is accurate. The conclusion drawn from it is not: the ledger's
`Notes` column carries a full reason for each, in the artifact that indexes them —

- `TDD-0069`: "NOT BLOCKED by a CR - waiting on data that does not exist yet. EX-0017-0053 requires
  three consecutive green aggregate-verdict runs … Recorded rather than left blank so the next agent
  does not look for a CR"
- `TDD-0070`: "NOT BLOCKED by a CR - waiting on data that does not exist yet. EX-0017-0054 is about
  DEFAULT-BRANCH verdict runs after a tuning change has merged … not satisfiable on the branch that
  introduces the tuning, by construction"

and for `TDD-0070` the other half is wrong too: the same section says it is "NAMED IN NO BLOCKED SET",
so its reason does not live "in the decision records" either, except as the anomaly `DR-0017-0010`.

The very next sentence is right — "every uncovered TC has a recorded reason somewhere, and for two of
the eight that reason is not where the ledger says to look" — and it is the one to keep. The sentence
before it overstates the same fact into a claim the ledger refutes.

The gate itself passes: all eight TCs the scoped `QFAI-ATDD-112` names have a recorded reason, verified
row by row against `tdd/test-list.md`.

### `A1` — the step/job/workflow pins fix `yaml`'s reading, and GitHub's is a second reading nobody compares

Advisory, not a defect: I could not turn it into execution, and I am recording it because the request
asks whether `JSON.stringify` over a parsed YAML node is stable enough to be a boundary.

What I probed, with the same `yaml` version the test imports:

```text
duplicate top-level key   -> THREW ("Map keys must be unique")     caught, loudly
anchor + alias            -> expanded; JSON identical to the value it names
merge key `<<:`           -> NOT resolved; appears as a literal `<<` key
`persist-credentials: no` -> the STRING "no", so `!== false` fires
`timeout-minutes: 0x0A`   -> 10
`timeout-minutes: 0o12`   -> 10
```

Three of those are the pin working, and one is a small design consequence worth writing down: the pin
is over the **parsed value**, so several source spellings collapse onto one pinned string.
`timeout-minutes: 0x0A`, `0o12` and `10` are the same pin entry and three different bytes on disk. That
is only a hole if GitHub's parser disagrees with `yaml`'s about which value a spelling denotes — two
parsers, one of them pinned. Nothing I found makes it reachable (a numeric `timeout-minutes` runs no
code, and `<<:`, duplicate keys and 1.1 booleans are all caught), so this is a note for whoever extends
the pin rather than a finding against it.

The other direction is real and is the cost of the design: the pin is order-sensitive, because
`JSON.stringify` preserves the parser's insertion order. Swapping `name:` and `runs-on:` in a shipped
job reddens the suite for no semantic change. That is the correct trade for a shipped surface — the
same trade `refusals()` makes — but it should be stated where the pin is defined, so the next person to
hit it reads it as intended rather than as a bug.

### The three shape pins, tested rather than read

Recorded because a `PASS` on a boundary should say what was tried against it. I could not move any of:
a workflow-level key, a job-level key, a step key, a step's `if:` or `id:`, an action reference, an
action input, a step `shell:`, a step `env:` name or value, a `defaults:` block at any of the three
levels, a body byte, a step's position in its job, or the number of times a reviewed body appears —
without reddening `US-0017-0004`'s second case. The list comparison also closes the two directions the
previous three pins left open: an entry with no body left, and a body replicated into extra steps.

`B1` is not a weakness in those pins. It is the observation that they are the only pins, and that
`.github/workflows/**` is one of four things `qfai init` writes into an adopter's root.

### The round-16 here-document repair holds, verified the way the request asks

`commandsOf`'s delimiter escaper at `shippedLaneCommands.ts:168` was the doubled-escape defect round 16
found. I extracted the character class from the file's own bytes and evaluated it rather than reading
it:

```text
extracted class: [.*+?^${}()|[\]\]
"E+F" -> "E\+F"    closes on its own text: true
"E$F" -> "E\$F"    closes on its own text: true
"E]F" -> "E\]F"    closes on its own text: true
"E\F" -> "E\F"    closes on its own text: true
"E{2}" -> "E\{2\}" closes on its own text: true
```

I then scanned every regex literal containing a doubled escape across
`shippedLaneCommands.ts`, `stageEvidenceCounts.test.ts`, `retractedClaims.test.ts` and
`coverageDepthMatrix.test.ts`. There is exactly one, it is this one, and it is correct. No third
instance of the class.

### Coverage Depth Matrix

`.qfai/evidence/coverage-depth-spec-0017.md` exists at the committed path, carries 45 `❌`, and
partitions the 34 depth cells into named classes A/B/C with `coverageDepthMatrix.test.ts` checking
completeness, disjointness and no non-`❌` member against the matrix's own table. Both normal and
error/boundary depth are scored per story, and every `❌` has a justification section. This gate
**passes**; nothing in `B1`, `M1`, `M2`, `m1` or `m2` touches it.

## Verdict

**REVISE.** Gates that passed, stated as the request requires: the e2e project at
**1445 passed / 16 skipped, exit 0**; `--project integration --project unit` at
**1219 passed / 19 skipped, exit 0**; the scoped `validate --profile atdd --spec 0017` at
**`info=2 warning=0 error=1`**, `QFAI-ATDD-112` alone on the eight TCs the record names, each with a
recorded reason in `tdd/test-list.md`; `e2e callsites at this tree: 881`, re-derived independently; and
the Coverage Depth Matrix, present, committed and machine-partitioned. Four of the five rows of the
full-profile breakdown verify, including both `QFAI-ATDD-*` rows on their detail.

What blocks: `B1`. An adopter who runs `qfai init` receives a tree, and every pin this stage owns reads
one directory of it. The channel is real, demonstrated end-to-end through a digest-approved step body,
and invisible to 5412 tests and eleven lint members.

| id | class | subject |
| --- | --- | --- |
| `B1` | blocking | execution channel in the shipped tree outside `.github/workflows/**` |
| `M1` | material | `--profile full` is `error=50`; the `QFAI-REVIEW-005` row and the "in-flight pack" attribution are wrong |
| `M2` | material | a retracted claim still asserted in Gaps item 3, citing the section that retracts it |
| `m1` | minor | `revision_form` filed as an open question the contract closes |
| `m2` | minor | "the parking exists in the decision records and not in the artifact that indexes it" is false for both rows |
| `A1` | advisory | the shape pins fix `yaml`'s reading; GitHub's is a second reading nobody compares |

## Revision

Start `1d7c0c3f`, finish `1d7c0c3f` — it did not move. `git status --porcelain` is empty at finish: the
plant is deleted, and `.qfai/report/validate.log` and `.qfai/report/validate.spec-0017.json`, both
rewritten by the runs above, are restored from `git show HEAD:<path>`.

## Addendum, written after the verdict — `M1` sharpened, and why a sibling may report `49`

While I was writing, a sibling ran the full profile and `.qfai/report/validate.log` came back reading
`errors: 49, warnings: 403`. That is not a contradiction of `M1`; it is the proof of it, and it is worth
the paragraph because otherwise two reviewers report two numbers this round and one of us looks wrong.

The timeline is recoverable from the run-log directories:

```text
run-20260822083741598   08:37:41   my run       error=50   pack held review_request.md only
R02_completion-reviewer.md         08:51:08     first reviewer report lands in the pack
run-20260822085146473   08:51:46   sibling run  error=49
```

Both are correct. With no report in the round-17 pack it fails `QFAI-REVIEW-004` **and** `-005`, giving
`-004=2, -005=2` and a total of 50. The moment any reviewer writes one report, `-005` stops firing for
that pack and only the abandoned `review-20260821200000000` carries it — `-004=2, -005=1`, total **49**,
which is the record's table exactly.

**So `error=49` with that breakdown is not a property of a revision. It is the signature of a review
round between its first report and its seal**, and it is the state the record measured in round 16 and
wrote down as HEAD's. The same figure has three values across one round with no commit between them:

```text
48   pack sealed, only review-20260821200000000 outstanding
50   a round opens: request committed, no reports yet   <- the revision under review, 1d7c0c3f
49   first report lands, pack not yet sealed            <- what the record says, and what a sibling sees now
```

Nothing in the record says which of the three it means, and the `P7` block's own rule — "re-run after
the last artifact changed" — cannot disambiguate it, because the artifact that moves the number is the
review of the record itself. `44` is the only row of that table that is stable, and it and the two
`QFAI-ATDD-*` rows are the ones `build` needs cleared. The fix is not a better number: it is to record
the figure **with the pack state it was measured at**, or to record only the three rows that do not
depend on it.

This also demonstrates the hazard my own role definition names: `.qfai/report/validate.log` and the
run-log pointer are shared by every run and nothing serializes them. I restored the file from
`git show HEAD:<path>` at the end of my work; a sibling running the profile after me will overwrite it
again, and that is the file's normal behaviour rather than an edit by anyone.
