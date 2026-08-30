# R03 — qa-gatekeeper, round 18, spec-0017 (stage gates)

**Revision at start:** `0f61ad2f`. **Revision at finish:** recorded in the closing section.
**Emphasis:** section 2 (what `qfai init` writes) and section 5 (the record).
**Verdict:** REVISE. Gates that passed are stated in § "Gates that passed", and they are real —
every count in the record's P7 block reproduced exactly, and the full-profile RULE holds at this
revision. The verdict turns on § `B1`.

## Method, and what I planted

My partition is `packages/qfai/assets/init/root/**` — the whole shipped tree. Everything below was
measured by planting into it, running the pins, and restoring from a copy taken first. No
`git checkout` was used on any path. Plant and restore windows:

| window (UTC)        | planted                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| 00:49:35 - 00:50:05 | `.claude/settings.json`, `.github/prompts/qfai-bootstrap.py`, `Makefile`, one appended line in `DESIGN.md`      |
| 00:51:33 - 00:53:01 | `.agents/bootstrap.py`, `.agents/hooks/post-checkout`, the same `DESIGN.md` line                              |

`git status --porcelain` and `git diff HEAD -- packages/qfai/assets/init/root` are both empty as of
00:53:01 UTC. `.qfai/report/validate.log` was rewritten by my own runs and restored from
`git show HEAD:` each time; it is clean.

### Two subject movements I did not make

`.qfai/evidence/atdd-spec-0017.md` was modified in the working tree at **09:47:00 +0900**, between my
clean-tree check and my first measurement: a duplicated copy of the rejected-options table with the
original wrapped in a `~~~text` fence. It was reverted by 09:49:35. `.qfai/evidence/coverage-depth-spec-0017.md`
was modified at about 09:53 and likewise reverted. Both look like a sibling reviewer's partitioned plant
rather than the stage editing the subject, and I report rather than measure through them: every reading
of those two files below is taken from `git show HEAD:<path>`.

## Section 2 — what `qfai init` writes

### B1

**An executable kind the rule does not name, in a prefix the path pin excludes: measured, and the
whole adjacent suite stayed green.**

`INIT_MUST_NOT_SHIP` is an **extension list plus a filename list**. Its extension alternation is
`.cjs .js .mjs .sh .bash .ps1 .bat .cmd`, and its filename alternation is the npm/pnpm/yarn manifest
and lockfile set. Two things follow that the pin's own docstring denies when it says the claim is
"a kind rather than a list of paths":

1. **A shell script with no extension is not a named kind.** `#!/bin/sh` is what makes a file a
   script; `.sh` is a convention.
2. **Every other interpreter is missing.** `.py`, `.rb`, `.pl`, `.zsh`, `.psm1`, `.vbs`, `Makefile`,
   `Justfile`, `Taskfile.yml`, `.envrc`, `.pre-commit-config.yaml`, `.husky/*`, `docker-compose.yml`,
   `.vscode/tasks.json` (`runOn: folderOpen`), `.devcontainer/devcontainer.json` (`postCreateCommand`),
   `.mcp.json`, `.claude/settings.json` (`hooks`), `bunfig.toml`, `deno.json`.

Outside the instruction trees that gap is covered, because `ALLOWED_INIT_PATHS` catches anything whose
path is not one of the six. **Inside the eight excluded prefixes the kind rule is the only defence, and
it is an extension list.** I planted, into my own partition:

```text
packages/qfai/assets/init/root/.agents/bootstrap.py          import os; os.system("...")
packages/qfai/assets/init/root/.agents/hooks/post-checkout   #!/bin/sh, mode 0755
```

Both arrive in an adopter's tree. `.agents/hooks/post-checkout` arrives **with its executable bit
intact** (`-rwxr-xr-x`), which neither pin reads:

```text
$ node packages/qfai/dist/cli/index.mjs init --dir . --yes   (into an empty temp tree)
-rw-r--r--  50 .agents/bootstrap.py
-rwxr-xr-x  37 .agents/hooks/post-checkout
```

With both in place:

```text
$ pnpm exec vitest run tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts tests/assets \
    tests/cli/init.test.ts tests/integration/distributedSurfaceLeakage.test.ts
Test Files  67 passed (67)
     Tests  1398 passed (1398)
```

Neither the `executable` assertion nor the `outsideTrees` assertion fired. Round 17's finding was that
the gate ran arbitrary code through the digest-approved install step with the suite green; the surface
added in answer to it ships an executable shell script into every adopter's tree with the suite green.

**Which prefixes are abusable, precisely.** `INIT_INSTRUCTION_TREES` holds eight prefixes. Two of them
are already covered by an older, unrelated guard — `tests/assets/assets.test.ts:846` ("keeps root init
assets free of wrapper directories") forbids `.claude` / `.codex` in the template outright and forbids
`.github/{instructions,agents,skills,commands,prompts}` under it. That guard, not either new pin, is
what caught my first-window `.claude/settings.json` and `.github/prompts/qfai-bootstrap.py`:

```text
FAIL tests/assets/assets.test.ts > assets guardrails > keeps root init assets free of wrapper directories
AssertionError: expected true to be false
  at tests/assets/assets.test.ts:849:66
```

That leaves **`.qfai/` and `.agents/` guarded by nothing but the kind rule**, which is the pair I then
used. Note also that the `.claude` assertion at :848 is a plain `expect` inside a loop, so it throws
before the `.github` block at :851 runs — my two first-window plants produced one failure between them,
and the `.github/prompts` one was never reported.

**The third reader.** The docstring's premise is "a package manager reads a manifest and a shell reads
a script, and neither asks where it came from." This project ships a third reader and excludes exactly
its eight directories: `.qfai/`, `.claude/`, `.codex/`, `.agents/`, `.github/agents|instructions|prompts|skills/`
are agent-instruction trees, and an agent acts on what it reads there. `.claude/settings.json` with a
`hooks` block is a command an adopter's agent runs; so is a rule file under `.agents/rules/`. The
exclusion is drawn around precisely the surface whose whole function is to cause execution, and the
kind rule that is supposed to make the exclusion safe cannot see any of it — `.json` and `.md` are not
executable kinds by extension, and they are the two kinds those trees are made of.

**Suggested direction** (not a required design): invert the kind rule the way `shippedLaneCommands.ts`
inverted the build question. An allowlist of kinds init MAY write into the instruction trees (`.md`,
`.yml`, `.yaml`, `.json` under named filenames, `.gitkeep`) fails closed; an extension denylist over an
open world does not, and this is the second round in which an open denylist over the shipped tree has
been beaten by something nobody had listed.

### M1

**The new pin over the adopter-facing files is a PATH pin, and round 17's own lesson was that a path is
not an identity either.** `ALLOWED_WORKFLOW_FILES` digests two files. `ALLOWED_INIT_PATHS` names six.
Four of those six — `.github/copilot-instructions.md`, `.gitignore`, `DESIGN.md`, `qfai.config.yaml` —
have **no content pin anywhere in this spec's surface**. Measured: one appended line in the shipped
`DESIGN.md`

```text
<!-- GATE18 content plant: this path is pinned, its bytes are not. -->
```

arrives verbatim in an adopter's `DESIGN.md` and is invisible to every assertion in the round-17
addition, and to the 67 files / 1398 tests run beside it.

The docstring for `ALLOWED_WORKFLOW_FILES` argues the case itself — "the bytes are the identity, exactly
as they are for a `run:` body" — and then the file next to it pins four adopter-facing files by name
only. `qfai.config.yaml` is the one that carries the most: it sets `paths.outDir`,
`output.validateJsonPath` and every traceability severity an adopter's gate runs at, so its bytes decide
what an adopter's `qfai validate` checks and where it writes. A pin that says the file arrived says
nothing about that.

### M2

**Three counts inside the one-commit-old code are wrong, and one of them has already propagated into
this round's own review request.**

- `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts:522` — "WHICH files arrive, outside the four
  agent-instruction trees, is a **nine-entry list** and is pinned." `ALLOWED_INIT_PATHS` has **six**
  entries, and I measured six arriving.
- `tests/helpers/shippedLaneCommands.ts:962` — "The **four** trees excluded from the path pin, and
  excluded from nothing else." The array beneath it holds **eight** prefixes.
- `tests/helpers/shippedLaneCommands.ts:949` — the `ALLOWED_INIT_PATHS` docstring names
  "`.qfai/`, `.claude/`, `.codex/` and `.agents/`" as what is excluded by path, omitting
  `.github/agents/`, `.github/instructions/`, `.github/prompts/` and `.github/skills/`.

The exclusion is twice as wide as the record of it, which is why "the four instruction trees are
excluded from the path pin by prefix" in `review_request.md:50` understates the surface a reviewer is
being asked to attack. This is the same class the record keeps finding — a number nothing derives,
stale on arrival — and here the count and the thing it counts are eleven lines apart in one file.

### m1

**The walk that feeds both pins does not descend a symlinked directory, and `qfai init` creates 71 of
them.** The walk recurses on `entry.isDirectory()`, which is false for a symlink, so a link is pushed
as a leaf path and its contents are never read. Today that is harmless — every link init creates points
inside `.qfai/`, which the walk reaches directly — so this is a latent gap, not a live one. But
`INIT_MUST_NOT_SHIP`'s docstring says "ANYWHERE in an adopter's tree", and the walk is not that. One
directory link whose target is outside the walked set would take an arbitrary subtree out of both pins.

### m2

**`INIT_MUST_NOT_SHIP` carries no `i` flag, and two of the three platforms adopters run on have
case-insensitive filesystems.** `Package.json`, `.NPMRC`, `Setup.SH` and `SCRIPT.PS1` are the same
files to npm, to pnpm and to PowerShell on macOS and Windows, and none of them matches. Outside the
instruction trees the path pin still catches them, so the exposure is again confined to the eight
excluded prefixes — but inside those prefixes a `.SH` file is exactly as executable as a `.sh` one and
only one of the two is named. Adding `i` costs one character and closes it; it does not close `B1`.

### A1

**`qfai init` is not the only thing that writes into an adopter's tree, and the pin's scope is one
command.** Both assertions run against `runInit({force: false})` alone. `qfai init --force` (which
regenerates `assistant/skills`, `assistant/agents` and every symlink target) and
`--upgrade-assistant-tree` write into the same tree through different code paths, and
`syncIntegrationWrappers` writes into `.claude/`, `.codex/`, `.agents/` and `.github/` after
`copyTemplateTree` has run. Nothing in this spec's surface reads what those produce. Advisory rather
than a finding: the user story is about what an adopter receives from `init`, and widening it is a
scope decision `delivery-planner` owns, not this gate.

## Section 5 — the record

### Gates that passed

Everything in this subsection I ran myself at `0f61ad2f`, in this working tree, after restoring my
plants. Every one reproduced exactly.

```text
node ... validate --profile atdd --spec 0017     info=2 warning=0 error=1      MATCHES
  QFAI-ATDD-112 names exactly EIGHT TCs: 0016, 0030, 0032, 0033, 0034, 0035, 0069, 0070
  the run left .qfai/report/validate.spec-0017.json BYTE-IDENTICAL to the committed one
pnpm -C packages/qfai test:e2e                   1446 passed / 16 skipped, exit 0   MATCHES
vitest --project integration --project unit      1219 passed / 19 skipped, exit 0   MATCHES
e2e callsites at this tree                       882                                MATCHES
node ... validate --profile full                 info=4 warning=403 error=50
```

The callsite figure I derived with my own walk over the two globs the `e2e` project declares, not with
the guard's regex, because `stageEvidenceCounts.test.ts` reading the record it certifies is exactly the
self-referential shape this record keeps finding. 89 files, 882 callsites. (My first attempt returned
880 and was wrong: the shell had eaten one backslash out of my probe's regex. Recording it because a
probe that is silently weakened is the failure mode this record has now met three times.)

**The full-profile RULE holds, and this revision is the state that tests it.** The record states
"48 with the current round sealed, 50 at a revision that has just opened a pack, 49 once reports land
in it and before a `summary.json` does". `0f61ad2f` is exactly a revision that has just opened a pack —
`.qfai/review/review-20260822150000000/` holds `review_request.md` and nothing else — and the profile
returns **`error=50`**. The two extra errors are the new pack's own, by file:

```text
QFAI-REVIEW-004  reviewArtifacts.summary        .qfai/review/review-20260822150000000   <- this round
QFAI-REVIEW-005  reviewArtifacts.reviewerFiles  .qfai/review/review-20260822150000000   <- this round
QFAI-REVIEW-004  reviewArtifacts.summary        .qfai/review/review-20260821200000000
QFAI-REVIEW-005  reviewArtifacts.reviewerFiles  .qfai/review/review-20260821200000000
```

Remove this round's two and the sealed value is 44 + 1 + 1 + 1 + 1 = **48**. The rule is right, the
sealed value is right, and both were checked at the state that discriminates rather than at the state
that agrees. That is the gate I can state as passed.

### M3

**The table that shows the forty-eight sums to forty-nine, and one of its rows is wrong.** The record
prints, under "The forty-eight, by rule, with the round sealed":

```text
QFAI-REVIEW-007   44
QFAI-REVIEW-004    2
QFAI-REVIEW-005    1
QFAI-ATDD-111      1
QFAI-ATDD-112      1
```

44 + 2 + 1 + 1 + 1 = **49**. The measured sealed composition is `004 = 1`, `005 = 1` — the four rows
above show that at the open-pack state each is 2, one per unsealed pack, and sealing this round's
removes one of each. So the table has `004` one too high and `005` correct, and the total it is
labelled with is not the total it adds to.

This matters more than an arithmetic slip because the sentence above the table is "what is recorded here
is the rule and the sealed value", and the table is the only place a reader can check either. It also
sits three paragraphs below the round-17 finding that the previous figure "was measured before the
repair that changed it" — the correction landed on the value and not on the decomposition that
supports it, which is the cost this same section names twice ("correcting a record in place costs
following the correction to whatever cites it").

Note the value 48 is NOT wrong. Only the table is. I verified 48 by measuring 50 and subtracting the
two errors this round's own pack raises, each identified by filename.

### B2

**The rejected-options confirmation rests on a fact the same file says has not happened, and that
`git log` says has never happened.**

`.qfai/evidence/atdd-spec-0017.md:129-132`:

> Option 1 (narrow the signal to the affected lanes), option 2 (exempt a spec's in-flight TCs from the
> fatal gate), option 3 (waive the row) and option 4 (merge first, then satisfy it) all stay rejected:
> **`TDD-0069` is `blocked` with a `Blocked-By`**, no gate was narrowed, no waiver was requested, and
> nothing was merged.

`.qfai/evidence/atdd-spec-0017.md:1148-1150`, § "Ledger rows advanced", in the same file:

> **Neither ledger cell has been written, and this table is the handover, not the ledger.**
> `tdd/test-list.md:107-108` has both rows `todo` with `DR-ID: -` and `Blocked-By: -`

The ledger agrees with the second and refutes the first:

```text
.qfai/specs/spec-0017/tdd/test-list.md:107
| TDD-0069 | TC-0017-0069 | Integration | ... | todo | - | - | NOT BLOCKED by a CR - waiting on data ...

census of the Blocked-By column: 6 rows carry one (TDD-0016, -0030, -0032..-0035); TDD-0069 is not among them
status census: 74 refactor, 6 blocked, 2 todo  (the two todo are TDD-0069 and TDD-0070)
```

And it has never been otherwise:

```text
$ git log --oneline -S "CR-20260820-0012" -- .qfai/specs/spec-0017/tdd/test-list.md
(no output)
```

So the clause is not stale — no commit ever made it true. It is load-bearing twice over: it is the
stated evidence in the mandatory rejected-options confirmation, and that confirmation is what
`**No RE-OPEN is required.**` eighteen lines later rests on. A confirmation whose supporting fact is
contradicted by its own document four hundred lines down is the exact defect this record has now
recorded against itself in rounds 1, 4, 5, 6, 7, 10, 15 and 17.

**Required fix.** Either state the row's actual state — `todo`, no `Blocked-By`, with the handover
recorded in § "Ledger rows advanced" and in the CR — or, if the point is that this stage did not take
options 3 and 4, say that without asserting a ledger state it does not own and has not written.

### M4

**"Option 2 has lost every stated ground it had" is a universal claim measured over one section.**

The record enumerates three withdrawn grounds: the second reason withdrawn during the CR's own review,
the first (`QFAI-ATDD-111` has no ledger rows to exempt) withdrawn by round 15, and the third (the
unscoped strand) refuted by round 17. All three are bullets from the CR's **`## Recommendation`**
section. The CR's **`## Options`** section states its own rejection, with two grounds, and neither is
mentioned by the record or withdrawn anywhere:

```text
.qfai/decisions/CR-20260820-0012-...md:92-94
Rejected as a first move because it weakens a gate globally to unblock one row, and because
`QFAI-ATDD-112` at `error` is what stops a spec being declared done with uncovered TCs -- the
failure mode it exists for.
```

Round 17's measurement — that the exemption "clears the rule outright rather than leaving other specs
behind" — is if anything *support* for the first of those two, not a refutation. So the honest state is
narrower than the record's: option 2's rejection has lost the three grounds the CR's Recommendation
gave it and retains the two its Options section gave it.

This is the round's own recurring shape with the sign flipped. Round 17 found four guards each reading
a **wider** region than the claim it makes; this claim reads a **narrower** region than the claim it
makes, and both produce a verdict the evidence does not support.

**On disposition, though, the stage is right and owes nothing further.** The handover is not recorded
only in an evidence file: `CR-20260820-0012:184-193` carries an "Open as of 2026-08-22, after round 17"
block naming what is owed ("either a ground that survives the two corrections or a re-opening"), in the
document its owner reads. That is the correct place and the correct addressee. What is owed is the
scope correction above, not a different disposition.

### m3

**`**No RE-OPEN is required.**` stands unqualified eighteen lines after the record forbids leaving it
standing.** `:143` reads "this stage ... may not leave a `No RE-OPEN is required` standing on three
grounds that are gone"; `:150` is `**No RE-OPEN is required.**`, with no qualifier.

There is a defensible reading — the line is the ATDD skill's mandatory confirmation that no rejected
option was **reintroduced**, which is true, and separate from whether a rejection's grounds survive. If
that is the intent, the sentence at `:143` is the one that is wrong and should say so. As it stands the
document instructs against its own next-but-one line, and a reader cannot tell which of the two is the
stage's position.

### A2

**I re-grepped the retracted claims myself, and two are standing — but their standing is disclosed and
justified, so this is an advisory and not a finding against the guard.**

Method: extracted all 33 `claim:` needles and the `GOVERNANCE` list from
`packages/qfai/tests/assets/retractedClaims.test.ts` by parsing the file, collapsed whitespace in both
needle and haystack the way the guard does, and searched **every tracked file** (`git ls-files`,
excluding `.qfai/review/**` and the guard's own source) rather than the seventeen the guard scans.
Result: 24 occurrences inside `GOVERNANCE`, and **two outside**, both in
`.qfai/specs/spec-0017/tdd/test-list.md`:

```text
:107  "NOT BLOCKED by a CR"                                            (TDD-0069, and again in TDD-0070 at :108)
:107  "becomes implementable once the pull request has three green"    (TDD-0069)
```

`atdd-spec-0017.md:1190-1197` discloses this and gives a reason I accept: `/qfai-implement` owns that
cell under the Drift Protocol carve-out, so a guard that reddens on a file this stage may not touch is
a guard that cannot be satisfied. The exclusion is deliberate, stated, and the record carries an
explicit instruction to replace the text in the same edit that writes `Blocked-By`.

What I record is the residual: the ledger, which is the artifact a downstream reader consults first,
currently carries two sentences this stage has formally refuted, and the instruction to fix them is
addressed to a writer who has not run. Combined with `B2` that is the whole shape — the record asserts
the write happened, and the ledger still carries both the un-written cell and the refuted reason.

Nothing else outside `GOVERNANCE` matched. `.qfai/specs/spec-0017/09_delta.md`, `07_Decisions.md`,
`16_Traceability-ledger.md`, `.qfai/contracts/**` and the remaining `.qfai/decisions/**` are clean.

### Depth matrix

`.qfai/evidence/coverage-depth-spec-0017.md` exists, is tracked, and is 518 lines. It carries 45
`❌` cells with per-cell justification and the cross-reference to the five unsatisfied stories.
It is scanned by the retracted-claims guard and pinned by
`tests/assets/coverageDepthMatrix.test.ts`. No finding.

## RED/GREEN observation gate

**No observation is under review this round, and that is the correct state — with one residual.**

Cross-tabulated from the ledger myself rather than from the record:

```text
Integration/refactor  63     past `todo`, outside Phase Red step 3b's reach
Integration/blocked    6     carry a Blocked-By value, skipped by Phase Red's selection
Integration/todo       2     TDD-0069, TDD-0070
Unit/refactor         11
```

`TDD-0070` is branch 3 on `DR-0017-0010`, which records what could not be observed (post-merge
default-branch history) and why each of branches 1 and 2 was unavailable. That is the third form of
evidence my role admits, and **P1d passed it at `9a37421c`**; the request says P1d is closed and I do
not re-open it. `TDD-0069` is routed to `blocked`, which takes no RED-provenance branch at all.

**Zero `Layer = E2E` rows is legitimate here and I checked it rather than assuming.**
`references/red-provenance.md:315-336` says a first run finds zero such rows because `/qfai-sdd`
Phase 2b seeds one row per coverage-target `TC-*` and `US-*` is not row-producing, that this stage may
not create them, and that the US obligation is discharged by the tests and their annotations. So the
nine `US-*` annotations in `tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` and
`tests/e2e/spec0017RunnerParallelismE2E.test.ts` — neither of which any ledger row names — owe no
observation. No finding.

**The residual, and it is `B2` seen from this gate.** Phase Red's selection skips a row on its
`Blocked-By` **value**. `TDD-0069` carries `todo` and `Blocked-By: -`. On the tree as it actually
stands at `0f61ad2f`, therefore, Phase Red selects a `todo` `Integration` row for which none of the
three branches has been recorded — the "never neither" case. The handover in § "Ledger rows advanced"
is the right instrument and is adequate as a handover; what is not adequate is the rejected-options
bullet asserting the write as already done, because that is the sentence a completion gate would read
to conclude the row is parked. Fix `B2` and this residual is a handover awaiting its writer, which is
a normal state.

**Verdict scope.** This section is a PASS on the observation question for this round and nothing else.
It does not ratify item scope — `delivery-planner` owns that — and it does not clear the completion
gate, which the record itself reports as FAIL.

## The full-profile rule, verified in all three of its states

Round 17's finding was that `--profile full` has no single number because three of its rules watch the
review pack. The rule is now recorded, and I checked it by moving the pack through its states rather
than by reading the sentence:

```text
pack holds review_request.md only          error=50    measured at 0f61ad2f, before I wrote anything
pack holds review_request.md + Rxx reports error=49    measured after this report and R02 landed
pack sealed (summary.json present, valid)  error=48    = 49 minus the QFAI-REVIEW-004 the pack raises
```

The 50 and the 49 are live measurements four minutes apart with no change to the subject between them
except reviewer reports landing — which is the rule's own claim, demonstrated. The 48 follows from the
49 by removing the single `QFAI-REVIEW-004` whose `file` field is this pack. I did not fabricate a
`summary.json` to measure the third state directly: writing one into a live pack while two siblings are
measuring is the collision this round's own rules exist to prevent.

**So: rule verified, sealed value verified, and only the decomposition table is wrong (`M3`).**

## Sign-off

- [x] **Verdict is explicit: REVISE.** The gate I can state as passed is the full-profile rule and
      sealed value, plus every count in the P7 block — all six reproduced exactly, several at the state
      that discriminates rather than the state that agrees. The verdict turns on `B1`.
- [x] Findings cite concrete artifacts: file and line for every claim; every measurement is a command
      whose output is quoted.
- [x] Required gates and residual risks recorded below.

### Required before completion

- `B1` — an executable kind the kind rule does not name, inside a prefix the path pin excludes. Measured
  live: a mode-0755 `#!/bin/sh` script ships into every adopter's tree with the adjacent suite green.
- `B2` — the rejected-options confirmation asserts a ledger state that the same file says is unwritten
  and that `git log -S` shows was never written.

### Should be fixed this round

- `M1` — four of the six pinned adopter-facing paths have no content pin; a planted line in shipped
  `DESIGN.md` is invisible to everything.
- `M2` — three counts inside the one-commit-old code are wrong (nine vs six, four vs eight, twice).
- `M3` — the "forty-eight, by rule" table sums to forty-nine and has `QFAI-REVIEW-004` one too high.
- `M4` — "option 2 has lost every stated ground it had" is measured over the CR's Recommendation
  section only; its Options section states two grounds that survive.

### Minor and advisory

- `m1` — the walk feeding both pins does not descend symlinked directories; latent, not live.
- `m2` — `INIT_MUST_NOT_SHIP` has no `i` flag.
- `m3` — `**No RE-OPEN is required.**` stands unqualified eighteen lines after the record forbids it.
- `A1` — the pins' scope is `runInit({force: false})`; three other write paths reach the same tree.
- `A2` — two formally retracted claims stand in `tdd/test-list.md`; disclosed and justified, recorded
  as a residual rather than as a finding against the guard.

### Residual risks

- The two subject movements at 09:47 and 09:53 (+0900) mean at least one sibling was planting into
  `.qfai/evidence/**` while I measured. My section-5 readings are all from `git show HEAD:`, so they
  are unaffected; a sibling measuring `tests/assets/**` between 00:49:35 and 00:53:01 UTC may have seen
  my init-tree plants and should re-take those readings.
- `.qfai/report/validate.log` was rewritten by my runs four times and restored from `git show HEAD:`
  each time. It is byte-clean at finish. Any sibling that read it during those windows read my run.

## Revisions

**Start:** `0f61ad2f`. **Finish:** `0f61ad2f`. HEAD did not move while I worked.
