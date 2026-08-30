# R03 — qa-gatekeeper — round 14, spec-0017 (ATDD stage gates)

**Revision at start:** `4d737f3a` (working tree clean).
**Role scope this round:** the stage gates and their evidence — sections 4 and 5 of the request in
particular — plus adversarial planting into
`packages/qfai/assets/init/root/.github/workflows/**`, which this round partitions to me.

**Plants made and restored.** Every plant went into the two shipped workflow templates, from a copy
taken before any edit (`tmp/r14/backup/`). Both files are back at their pre-round sha256 —
`581608a7…` (`qfai-tests.yml`) and `08e79f77…` (`qfai-validate.yml`) — and `git status --porcelain`
is empty for `packages/qfai/`. No plant failed to restore.

**Verdict: REVISE.** A gate did pass and is stated below, so the PASS bar in the request is partly
met; it is not met overall, because a workflow-level `defaults.run.working-directory` places
arbitrary adopter-supplied code inside a shipped lane with all four `US-0017-0004` assertions green
and 135 tests across 12 files green.

## Gates that passed, stated per the request's definition

**The scoped ATDD gate reproduces exactly.** Run at `4d737f3a`:

```text
node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  -> counts: info=2 warning=0 error=1      exit 1
     [error] QFAI-ATDD-112  — 8 TCs: TC-0017-0016, -0030, -0032, -0033, -0034, -0035, -0069, -0070
     [info]  QFAI-ATDD-117  — 11 Unit/Component TCs, exempt
     [info]  QFAI-PROFILE-001 — partial profile
     run-log .qfai/report/run-20260822025753172
```

`QFAI-ATDD-112` is the only `error`, on exactly the eight TCs the record lists in that order.
`QFAI-ATDD-111` does not appear. Section 4's first bullet verifies on this half.

**And the artifact half verifies, non-vacuously.** `.qfai/report/validate.spec-0017.json` is tracked
(`git ls-files --error-unmatch` succeeds). I copied it aside, ran the gate, and compared: `cmp`
reports byte-identical and `sha256` is `0ab3bc2b…` on both. The check is not vacuous — the file's
mtime moved from `02:42:24` to `02:57:53`, so the run **did** rewrite it and rewrote the same bytes.
Its contents agree with the run: `profile: atdd`, `counts {info:2, warning:0, error:1}`, issues
`[QFAI-ATDD-112, QFAI-ATDD-117, QFAI-PROFILE-001]`. The unscoped `.qfai/report/validate.json` was
not touched, so the scoped run does not clobber the shared artifact.

**The twelve digests are exactly right, recomputed independently.** I re-derived every shipped
`run:` body's digest from the templates with my own implementation of the normalization
(`tmp/r14/digests.mjs`), not by calling the helper: 12 bodies, 12 distinct digests, and all twelve
match `ALLOWED_STEP_BODIES` — **including the `— NN lines` counts in each comment** (40, 35, 1, 1, 1,
1, 1, 8, 52, 22, 22, 1). No two shipped bodies collide with each other. Baseline
`refusals()` over the shipped set is `[]`, and the pinned invoked-program set matches the sixteen
entries the E2E asserts.

---

### B1 `defaults.run.working-directory` puts arbitrary adopter code in a shipped lane with every gate green

**Demonstrated executing, not argued.** One key added to the shipped `qfai-validate.yml`, at the
workflow level, above `jobs:`:

```yaml
defaults:
  run:
    working-directory: ./ci-primer
```

No new job, no new step, no new `run:` body, no new program, no new action, no new `env:` name.
Measured against the real asset tree with the real suite:

```text
tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts      10 passed (10)
integration shippedWorkflow* + unit + assets + spec0017OwnWorkflowScope
                                                   12 files, 135 passed, 0 failed
```

All four `US-0017-0004` assertions stay green: `refusals()` is `[]`, `refusedUses` is `[]`, the body
scan finds 12 bodies mapping onto the 12 allowed digests, and no digest is dead.

**What it does.** `defaults.run.working-directory` is GitHub's documented spelling for applying a
working directory across every `run:` step, exactly as `defaults.run.shell` is for the shell. It
redirects the shipped, digest-approved *Install dependencies (lockfile-aware)* body into a directory
the planter names. I ran that exact body — extracted from the template, not retyped — with cwd set
to a `ci-primer/` holding a `package.json` whose `preinstall` is `node preinstall.js`:

```text
npm exit=0
> ci-primer@0.0.0 preinstall
> node preinstall.js
ci-primer/PWNED.txt: "arbitrary code ran inside a shipped qfai lane"
```

That is the whole distance from "a lane an adopter received" to arbitrary code, through a key no
assertion in this stage reads.

**Why this is the sharpest form of the class the record already names.** The record's own summary of
round 13 says `defaults.run.shell` was "the same channel three rounds have closed at three levels,
each time **one level from where the last repair looked** — so every level now reads through one
function." The repair opens `holder["defaults"]["run"]` and reads exactly one key out of that map:

```ts
if (isRecord(run) && run["shell"] !== undefined) out.push(run["shell"]);
```

`working-directory` is the *sibling key in the map the repair already opened*. The generalisation
was made over levels and not over keys, so the fourth level the record asks about ("Is there a
fourth level, or a fifth spelling of 'run this instead'?") is not a level at all — it is the other
half of the same two-key map.

**Ships at step level too.** The step-level spelling (`working-directory:` on a step) also ships;
see `M1`, where it additionally defeats the twelve-bodies claim.

**Scope note, stated because it changes the severity and not the class.** A *separate* install-shaped
plant (a second step re-using the same install body) is caught — but by `TC-0003-0037`
("exactly one installing job") and `TC-0003-0044`, both `spec-0003` rows annotated for something
else. The `defaults.run` form above evades those too, because it adds no step and no job: the
install count is still one. So the fence that would have contained the cruder plant is not this
spec's, and does not contain this one.

### B2 The stage's own derived-count guards are RED at the revision under review

Measured at `4d737f3a`, with my own report file **parked outside the pack** so it could not be the
cause. Three failures, all in files this stage authored, all about this stage's own record:

```text
retractedClaims.test.ts     keeps a counted claim's number equal to what the tree holds
  -> ".qfai/evidence/atdd-spec-0017.md: states Thirteen where the tree holds 14"

stageEvidenceCounts.test.ts derives the round and response counts `## Final status` certifies with
  -> "rounds: record says thirteen, 14 packs on disk"
  -> "responses: record says 35, disk holds 36"
  -> "the verdict split sums to 35 against 36 responses"

stageEvidenceCounts.test.ts names every pack on disk, with a recomputing seal for each closed one
  -> the record names 13 packs; disk holds 14. `review-20260822030000000` is named nowhere in
     `.qfai/evidence/atdd-spec-0017.md` (grep: zero occurrences).
```

`pnpm -C packages/qfai test` is a member of the root `ci:gate` chain, so these are gate failures.
The full suite at `4d737f3a` is **470 files, 5407 passed, 54 failed**; 51 of the 54 belong to other
specs' declared test-first `CHG-006` rows and to `integrationSurface` / `surfaceShortCircuitScope` /
`playwrightCliLauncher` / `initRepairRollback`. **Exactly three are spec-0017's, and all three are
this stage's guards failing over this stage's record.**

**Two of the three are caused by the revision under review itself, not by any reviewer.** Creating
the round-14 pack directory is what moves `packsOnDisk()` from 13 to 14, and the request file was
committed into that directory by the commit under review. The `responses` half additionally moved
when `R02_completion-reviewer.md` landed while I worked — that one is a concurrent-writer effect and
I am not counting it against the revision.

The record predicted this exactly one round ago and did not act on it:

> Creating this round's pack directory moved the round count from ten to eleven and the guard failed
> the same commit, before any reviewer had read anything.

Knowing that the commit that opens a round reddens the guard, the record was still committed with
`thirteen` in three places. Either the record discloses the in-flight pack in the same commit that
creates it — which is what `stageEvidenceCounts.test.ts`'s own docstring says the design is ("The
newest pack is in flight: it must be DISCLOSED and cannot carry a seal yet") — or the guard is
knowingly shipped red at every round boundary, which makes it a signal nobody can act on.

### B3 The `error=2` correction the request asks me to verify was applied at one site and left standing at four

Section 4's first bullet says the stale `error=2` paragraph was "re-derived by running the gate". The
re-derivation is real and correct — see the passing gate above. **The correction is not.** `grep -n
"error=2"` over `.qfai/evidence/atdd-spec-0017.md` returns four live present-tense claims that the
current scoped gate is `error=2`:

```text
1214  "It does not clear completion: `US-0017-0007` is uncovered, the scoped gate is `error=2`, …"
1883  "…the scoped gate at `error=2` with the right content, its `validate.spec-0017.json`
       byte-identical…"
2190  "…masked in CI only because the `tdd` step fails first on `error=2`."
2218  "- **`US-0017-0007` is uncovered**, so `QFAI-ATDD-111` reports it and the scoped gate is
       `error=2`;"
```

(Lines 7, 235, 367, 368 are legitimately historical — "before this stage", "after round 1" — and I am
not counting them.)

**Line 2218 is the serious one.** It sits under `## Final status` → "What is not satisfied:", the
section that certifies the stage's outcome, and it asserts **both** halves of a state this record
elsewhere says it left: that `US-0017-0007` is uncovered, and that the gate is `error=2`. Measured:
`QFAI-ATDD-111` does not appear in the gate output at all, and the gate is `error=1`. The same file's
`## Objective` says "All nine are covered" and `coverage-depth-spec-0017.md` heads that row "⚠️ and
COVERED". A reader who starts at `## Final status` — where a reader looks for the outcome — is told
the opposite of what was measured.

**And the record names the exact countermeasure it did not use.** `## Final status` says the
countermeasure adopted is "to apply a located finding by **grep after the edit** rather than by
editing the sites I happen to find". Line 912 says "This paragraph said `error=2` for eleven rounds
and was **stale from round 1** … the file disagreed with itself in three places about its own
headline number." The repair moved one site. A grep after the edit would have returned the other
four; the file now disagrees with itself in five places rather than three.

Gaps item 3 carries the same defect in its other half: "four of the eight are `refactor` in the
ledger while `CR-20260820-0007` holds them" — see `M3`.

### M1 "Twelve bodies exactly covered by twelve digests" is a set equality over digests, and admits any number of bodies

The request asks me to attack this claim. It does not hold as stated, and the reason is one line of
the E2E:

```ts
bodies.set(bodyDigest(run), `${id} [${name}]`);
```

`bodies` is a `Map` **keyed by digest**. Both assertions then compare `[...bodies]` against
`ALLOWED_STEP_BODIES` — one direction for an unlisted digest, the other for a listed digest with no
body. That is a **set equality between two digest sets**, not a bijection between bodies and digests.
Nothing anywhere asserts how many `run:` bodies the shipped tree has.

Measured, against the real asset tree with the real suite: I copied the shipped *Install dependencies
(lockfile-aware)* body verbatim into a new step of `qfai-tests.yml#unit`, with a step-level
`working-directory: ./ci-primer`.

```text
shipped bodies: 13      distinct digests: 12      unreviewed: []      dead: []
tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts   10 passed (10)
tests/unit/shippedLaneCommands.test.ts + buildCommand.test.ts   39 passed (39)
```

Thirteen bodies, twelve digests, both directions green. The bound is not thirteen: any number of
steps whose bodies duplicate an already-listed one is invisible to this gate, in any shipped job.

**Why that matters beyond arithmetic.** The record's argument for moving the boundary is that
"enumerating our own twelve bodies converges at twelve and fails closed". What converges at twelve is
the set of *distinct texts*; the set of *places those texts execute* is unbounded, and a body's
behaviour is not a function of its text alone — `B1` is the demonstration. So the gate's honest
statement is "no shipped step runs a text nobody reviewed", which is weaker than "the twelve bodies
this tree ships were reviewed" and much weaker than what a reader takes from it.

**On the "no dead entry" half.** It does create the pressure the request asks about, and the `Map`
makes it worse in a specific way: if two steps ever share a digest, deleting one of them leaves the
digest live, so the half that exists to notice a vanished body cannot notice that one. The half is
still worth keeping — it is what makes a digest edit visible — but it is not a check that every
reviewed body is still present.

### M2 Nothing pins the action VERSION, at any level, in any test

`readUses` splits `uses:` at `@` and checks the **name** against `ALLOWED_ACTIONS`. `US-0017-0002`
checks the **shape** of the suffix (`@[0-9a-f]{40}`). `shippedWorkflowPins.test.ts` checks the same
shape (`SHA_PIN_RE = /^[0-9a-f]{40}$/`) plus that the step's *name* carries a readable version.

So the 40 hex characters that decide **which code the action runs** are asserted by nobody. Measured:
I replaced `actions/checkout@11d5960a…` with `actions/checkout@0000…0000` in the shipped
`qfai-tests.yml` and ran the E2E, the shipped-workflow integration set, the unit guards and the
assets set together:

```text
75 files, 1434 passed, 3 failed
```

and the three failures are `B2`'s derived-count guards, which fail identically without the plant.
`grep -rn` for the three pinned SHAs across `packages/qfai/` returns the two workflow templates and
**no test**. An action reference is a `run:`-free execution channel by the same argument the guard's
own comment uses for `uses:`; the digest boundary does not cover it and neither does anything else.

### M3 The per-row table for the eight uncovered TCs is stale on four rows, and the count derived from it is wrong

The record's per-row table under § "Ledger rows advanced" states, and Gaps item 3 repeats:

```text
TC-0017-0032   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0033   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0034   CR-20260820-0007  in blocked set    ledger row: refactor
TC-0017-0035   CR-20260820-0007  in blocked set    ledger row: refactor
```

Read from `tdd/test-list.md` at `4d737f3a`, per row, by column
(`… | Status | DR-ID | Blocked-By | Evidence`):

```text
TDD-0016  Status=blocked  DR-ID=-  Blocked-By=CR-20260818-0007
TDD-0030  Status=blocked  DR-ID=-  Blocked-By=CR-20260820-0001
TDD-0032  Status=blocked  DR-ID=-  Blocked-By=CR-20260820-0007
TDD-0033  Status=blocked  DR-ID=-  Blocked-By=CR-20260820-0007
TDD-0034  Status=blocked  DR-ID=-  Blocked-By=CR-20260820-0007
TDD-0035  Status=blocked  DR-ID=-  Blocked-By=CR-20260820-0007
TDD-0069  Status=todo     DR-ID=-  Blocked-By=-
TDD-0070  Status=todo     DR-ID=-  Blocked-By=-
```

All four are `blocked` with the CR named in `Blocked-By`. The record's "four more are `refactor` in
the ledger while their CR holds them, which is the same disagreement in the other direction" is
false at this revision, in two places, and it is quoted as evidence for the conclusion that follows
it.

**The conclusion is therefore wrong by one.** The record says "for **three** of the eight that reason
is not where the ledger says to look." Measured: for six of the eight the `Blocked-By` cell names the
CR — which is exactly where a reader looks — and for **two** (`TDD-0069`, `TDD-0070`) it records `-`.
Two, not three.

**The headline claim itself does verify**, and I want that on the record separately, because the
request asked for it per row. Every one of the eight has a recorded reason: six by `Blocked-By`;
`TDD-0069` by `CR-20260820-0012` (`Blocked set: spec-0017 TDD-0069`); `TDD-0070` by `DR-0017-0010`
(`Rows: TDD-0069, TDD-0070`, `Status: PASS at P1d pass 6`). `TDD-0070`'s `DR-ID` cell is `-`, which
is `/qfai-implement`'s to write and is disclosed as such.

This is a **derived** number in the record's own sense — it is computed from a table — and the table
went stale under it. That is the class the record's `A3` says it fixed by deriving; this one is
derived from prose by a human and nothing recomputes it.

### M4 The Coverage Depth Matrix's class partition is split across two markdown tables, and the second does not render as one

`.qfai/evidence/coverage-depth-spec-0017.md:129-142`. There is a blank line at `:134`, between the
`A / US-0017-0006` row and the `A / US-0017-0008` row. Raw bytes, `cat -A`:

```text
| A     | US-0017-0006 | Normal path, Error path, … |$
$
| A     | US-0017-0008 | Error path, Boundary values, … |$
```

The second block has no header row and no `| --- |` separator, so it is not a table. GitHub, and any
CommonMark+GFM renderer, renders eight of the eleven class rows as a paragraph of pipe characters.
The committed governance record — the artifact whose whole purpose is that "one justification per
cell" is checkable **by a reader** — is unreadable for eight of its eleven partition rows.

Three things make this more than cosmetic:

- **The guard cannot see it.** `coverageDepthMatrix.test.ts` parses the rows by regex over the
  file's text, so the partition arithmetic is green — I re-derived it independently and it is
  correct: `A 23 (6+6+6+5) / B 9 (2+1+2+2+2) / C 1 / D 1 = 34`, matching the 34 `❌` depth cells in
  the matrix exactly, with `Status` totals `✅ 3 / ⚠️ 2 / ❌ 4` summing to 9. **Every number in
  section 5's matrix bullet verifies.** What does not survive is the document.
- **This file is outside both formatters.** `.qfai/evidence/**` is ignored by prettier and by
  markdownlint, so `pnpm ci:lint` cannot catch a malformed table here the way it would in
  `.qfai/steering/**`.
- **The record's own recurring class 17 is exactly this.** "Reading text standing in for running it":
  a partition that a regex can read and a reader cannot is a claim about how the record is written
  standing in for the record.

### m1 Class C still calls itself "the one ❌ that no future work would turn green"; class D calls itself "the second"

`coverage-depth-spec-0017.md:184` (class C): "…flagged here because it is **the one** `❌` in the
table that no future work would turn green."
`:177` (class D): "This is **the second** `❌` in the table that no future work on the story itself
would turn green."

D's arrival falsified C's uniqueness sentence and C was not updated. On the request's question — *is
class D a real class or a bucket invented to keep a total tidy?* — my answer is that **D is a real
class**: its reason (a design with no failure to observe) is distinct from C's (a single-valued
output with no edge), and both are inapplicability rather than absence, which is a different kind of
`❌` from A and B. But both are singleton classes whose stated *property* is their own membership
("the column is `Error path` on `US-0017-0007`"), so neither property can classify a cell that does
not yet exist — and the one sentence that connected them to each other is now false. The guard checks
completeness, disjointness and non-`❌` membership; it does not read either sentence.

### m2 The eslint file list and `tsconfig.tests.json` are declared identical and differ by one member

`eslint.config.js:73` — "The list here is the set `tsconfig.tests.json` includes, where the count is
zero." Measured: the eslint block lists **12** files; `tsconfig.tests.json` includes **13**. The extra
member is `packages/qfai/vitest.knobs.ts`, which is *also* named in the preceding
`disableTypeChecked` block at `eslint.config.js:60`. So `vitest.knobs.ts` is type-checked by
`tsc -p tsconfig.tests.json` and has `no-floating-promises`, `await-thenable`, `require-await` and
`no-misused-promises` **off**.

That is the one file in the set whose docstring the record cites as the proof that "a declaration can
be declared and do nothing", and it is the carrier's subject for `US-0017-0007`. It is also precisely
the shape `A7` fixed elsewhere in this stage — "three literals naming the same six files with nothing
tying them together" — reintroduced one artifact over, with a comment asserting the tie.

**Both halves of section 5's tsconfig/eslint bullet otherwise verify, non-vacuously.** The eslint
block is not a `files:` list that matches nothing:

```text
eslint --print-config packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
  @typescript-eslint/no-floating-promises  [2]   await-thenable      [2]
  @typescript-eslint/require-await         [2]   no-misused-promises [2]

eslint --print-config packages/qfai/tests/scripts/workflowHygiene.test.ts   (outside the list)
  @typescript-eslint/no-floating-promises  [0]   await-thenable      [0]
```

Enabled inside the list, disabled outside it — so the block applies and is scoped. And the root
`check-types` really does run it (`"check-types": "tsc -b && tsc -p packages/qfai/tsconfig.tests.json"`),
which I ran: **exit 0, zero diagnostics**.

### m3 Recurring class 17 is a real entry, and its stated countermeasure is entry 18

The request asks whether entry 17 restates entry 12. It does not: the record itself draws the
distinction ("12 says an allowlist that concedes on confusion is not an allowlist, and 17 says that
repairing the concessions does not converge"), and two instances of one class are what a list of
instances is for.

What does not survive is entry 17's closing sentence: "The countermeasure here is not a better
parser: it is that the GATE stopped being a reading. `ALLOWED_STEP_BODIES` enumerates the twelve
bodies this tree ships by digest, which is a claim about identity rather than about wording."

By `B1` the gate is still a reading — it reads the `run:` scalars and nothing else in a document that
executes through at least `uses:`, `with:`, `shell:`, `defaults.run.shell`, `env:`, `container:`,
`services:`, `working-directory:`, `defaults.run.working-directory:` and `runs-on:`. By `M1` it is
not a claim about the twelve bodies but about twelve strings. So the sentence is a claim about what
the gate *is* rather than about what it *does*, written into the entry whose class is exactly that —
which is the same shape entry 15 is called "the purest instance in the list" for.

### B4 A second `bodyDigest` collision, demonstrated defeating a fail-closed guard, invisible to the boundary AND to the instrument

The request asks for a second collision. Here is one, in the same family as the first: the first was
`payloadDigest` collapsing whitespace; this is `bodyDigest` **stripping trailing whitespace per
line**.

```ts
.map((line) => line.replace(/[ \t]+$/, ""))
```

A trailing space is not always inert in bash. After a line-continuation backslash it is the
difference between "this line continues" and "this line ends, having escaped a space" — so a
trailing space one character wide converts an argument into a command. Built with `String.fromCharCode(92)`
so no shell or editor escape can be blamed:

```text
A = echo "qfai validate: preflight" \        <- reviewed form
      exit 0
    if [ ! -f pnpm-lock.yaml ]; then echo "::error::no lockfile"; exit 1; fi
    echo "guard passed"

B = A, with ONE trailing space after the backslash

bodyDigest(A) === bodyDigest(B)  ->  true   (edab2d7d9ab89f25…)

bash -e -o pipefail A  ->  "qfai validate: preflight exit 0\nguard passed\n"
bash -e -o pipefail B  ->  "qfai validate: preflight  \n"          <- exit 0 RAN; the guard never did

refusals(A) -> []      refusals(B) -> []
```

**Both instruments are silent.** The digest is equal by construction. `refusals()` is empty for both
because `echo` and `exit` are `HARMLESS_PROGRAMS`, allowed by name. And the E2E's invoked-program pin
does not separate them either, because it pins `invocation.split(" ")[0]` — `echo` in both cases. I
checked the simpler pair too: `invocationsOf` returns three entries for B against two for A, and
nothing asserts over that list.

**Why the shape matters here specifically.** `qfai-validate.yml#validate`'s *Resolve the package
manager* step is documented as failing **closed** — "Continuing without an install is not an option:
the lane would report a validate result it never computed." A one-character edit that inserts an
early `exit 0` past a line continuation is exactly the mutation this collision hides, and it is the
kind of edit that survives review because a trailing space is invisible in a diff.

The record's own defence of the normalization is where this lands:

> Deliberately not `payloadDigest`. Collapsing every whitespace run to one space … erases the
> difference between a space and a NEWLINE. … So only line endings and trailing whitespace are
> normalized. … **Two bodies that behave differently must not share a digest.**

The last sentence is the stated invariant of the boundary, and it is false as written. The reasoning
that produced it identified one whitespace class that changes behaviour (the newline) and treated the
remainder as safe; trailing whitespace is a second, and the argument that missed it is the same
argument in the same paragraph.

The repair direction that follows the record's own logic is to normalize **nothing** — digest the
parsed scalar as YAML produced it. The tolerance bought by stripping trailing whitespace is that a
whitespace-only edit does not move the digest; on a shipped surface, a whitespace-only edit that
changes what runs is precisely the edit the boundary exists to make someone look at.

### A1 The record's stated reason for dropping the `specs-coverage` citation is false at this revision

`.qfai/evidence/atdd-spec-0017.md:377-383` states:

> **`.qfai/report/specs-coverage/spec-0017.md` does not exist** … That directory holds `spec-0001.md`
> through `spec-0007.md` on disk, last written 2026-08-20 … The citation is dropped rather than the
> file committed.

Measured at `4d737f3a`: the directory holds **seventeen** files, `spec-0001.md` through
`spec-0017.md`, all written `2026-08-21 16:35:35`. `spec-0017.md` exists and is 4475 bytes. Only
`spec-0012.md` is tracked, which the record has right.

This matters because `.qfai/report/specs-coverage/spec-*.md` is a named input for this role, and the
record tells a reviewer it is not there. I read it: every `AC-0017-*` carries 2 or 3 `TC`, which
matches the substantive claim the record makes about it, so the conclusion survives — but the reason
given for dropping the citation is a statement of fact about the tree that the tree contradicts, in a
record whose recurring class is exactly that.

### A2 Running the record's own documented command rewrites a tracked artifact

`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017` rewrote
`.qfai/report/validate.log`, which is tracked (`git ls-files` lists it). It moved from
`run-20260821160310691` to my run id. The record already names this hazard —
"nothing serializes them — a concurrent stage can leave that pointer naming its run rather than this
one" — and declines to cite it as evidence, correctly. The residual is that any reviewer who runs the
documented command dirties the working tree, which on this stage's own rule ("the stage does not edit
the subject while the round runs") is a trap for the reviewer rather than the stage.

I restored it from `git show HEAD:<path>` rather than `git checkout`, per this round's constraint;
`git status --porcelain` is empty.

### A3 Gaps item 9's scope statement is honest, and one clause overstates what the repair bought

The request asks whether item 9 is an honest scope statement or an excuse. **Honest**, and it is the
right disclosure: `npm ci` runs an adopter's `preinstall` / `postinstall` / `prepare`, so
`US-0017-0004`'s claim is about the shipped text and not about what an adopter's tree executes, and
saying so is better than a claim nobody could support.

The one clause that overstates is: "The lane's own writes onto a manifest are refused now, **so the
lane cannot supply that code itself**". `B1` is a counter-example that needs no write: the lane
supplies the code by *choosing which directory* the allowed install runs in. No manifest is written;
the manifest that gets executed is selected. So the correct form is "the lane cannot supply that code
**by writing a manifest**" — the narrower claim the repair actually established.

## What I could not do, and why

- **I did not mutate anything outside `packages/qfai/assets/init/root/.github/workflows/`.** Round
  11's `A5` and round 12's finding are both about concurrent writers, and `R02_completion-reviewer.md`
  appeared in this pack while I worked. So the request's "is the matrix guard vacuous for the row it
  was written for" question is answered only by reading: `coverageDepthMatrix.test.ts:449-570` requires
  the section to say restored/COVERED, to name its carrier, to find the annotation in
  `tests/e2e/qfai-traceability.md`, to find it in the carrier file, and to find `peakConcurrency(` and
  `spawnSync(` in the carrier. That is not the empty-filter shape entry 16 describes. Whether it can
  express the state where the record is wrong needs a mutation of the carrier, which is not my
  partition this round.
- **The deletion audit** (section 5's "refute one") is `implementation-reviewer`'s surface — the
  classifier and its helpers — and mutating those files while a sibling reviews them is the collision
  this round's rules exist to stop.

## Restoration statement

| file                                                          | sha256 before | sha256 after | restored |
| ------------------------------------------------------------- | ------------- | ------------ | -------- |
| `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`    | `581608a7…` | `581608a7…` | yes, from `tmp/r14/backup/` |
| `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` | `08e79f77…` | `08e79f77…` | yes, from `tmp/r14/backup/` |
| `.qfai/report/validate.log` (dirtied by running the gate)      | HEAD blob     | HEAD blob    | yes, from `git show HEAD:…` |
| `.qfai/report/validate.spec-0017.json`                         | `0ab3bc2b…` | `0ab3bc2b…` | not needed — the re-run wrote the same bytes |

Untracked additions I left on disk: one new `.qfai/report/run-2026…` directory, which the record
itself describes as regenerable and untracked, and everything else under repository-root `tmp/r14/`.

**Revision at finish: `4d737f3a`** — unchanged from the start. The stage did not edit the subject
while this round ran, on my measurement. `R02_completion-reviewer.md` landed in the pack during my
work; that is a sibling reviewer's report, not the subject, and I have flagged where it affected a
count in `B2`.

## Verdict

**REVISE.** Blocking: `B1`, `B2`, `B3`, `B4`. Non-blocking but material: `M1`, `M2`, `M3`, `M4`.
Minor: `m1`, `m2`, `m3`. Advisory: `A1`, `A2`, `A3`.

The gates that passed, restated so the PASS bar is on the record: the scoped gate reproduces at
`info=2 warning=0 error=1` with `QFAI-ATDD-112` alone on the eight named TCs; the tracked
`validate.spec-0017.json` is byte-identical after a re-run that provably rewrote it; the twelve
digests and their line counts are exactly right when recomputed independently; the Coverage Depth
Matrix's arithmetic (34 cells, `A 23 / B 9 / C 1 / D 1`, `✅ 3 / ⚠️ 2 / ❌ 4`) is exactly right; the
`tsconfig.tests.json` / eslint pair applies and is clean; and every one of the eight uncovered TCs
does have a recorded reason.

What blocks is not any of those numbers. It is that the boundary this round was built around does not
hold a build out of a shipped lane (`B1`, `B4`), that it claims a scope it does not have (`M1`), and
that the record certifying all of it is red on its own guards (`B2`) and still tells a reader, in the
section where outcomes live, that the gate is `error=2` and `US-0017-0007` is uncovered (`B3`).
