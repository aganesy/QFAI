# R01 — implementation-reviewer (round 9, /qfai-atdd, spec-0017)

**Verdict: REVISE**

- Revision reviewed: `05a97202` at start. `git status --porcelain` was **empty** at start.
- Revision at finish: reported at the end of this file.
- Role standing this round: **conditional, not blocking.** `.qfai/assistant/manifest/agent-routing.yml`
  lists this role under `conditional_agents` for `skill: qfai-atdd` and its `blocking_agents` are
  `[qa-gatekeeper, completion-reviewer]` (lines 202-207). Nothing below gates `done` on its own
  authority; it is input to the two blocking gates.
- Scope: `tests/helpers/buildCommand.ts` (v10/v11), `tests/unit/buildCommand.test.ts`,
  `tests/assets/retractedClaims.test.ts`, `tests/assets/stageEvidenceCounts.test.ts`,
  `tests/assets/coverageDepthMatrix.test.ts`, `scripts/check-atdd-annotation-ledger.mjs`.
- Findings: **4 blocking-severity, 9 major, 12 minor** (25 total, each a heading).

## Baseline established before any finding

| Check | Result |
| --- | --- |
| `vitest run --project unit tests/unit/buildCommand.test.ts` | 20 passed (20), exit 0 |
| `vitest run --project e2e tests/assets` | 64 files, 1314 passed (1314), exit 0 |
| `packages/qfai/scripts/check-no-internal-version-leakage.sh` | OK, exit 0 |
| `eslint` on the four changed TS files | clean, no output |
| bare `as` assertions in the changed files | none (only `as const`) |
| `git diff --stat aab29486~1 HEAD -- packages/qfai/assets` | empty — the distributed surface was not touched this round |
| packs on disk `>= review-20260820200000000` vs packs named in the record | 9 vs 9, exact |

Verified good, and recorded because three of these were open questions in the request:

- **The deletion sweep's property holds, and holds more strongly than it asserts.** Deleting each of
  the 250 members in turn: `undetected: 0`. Restore is behaviourally exact — 250 members after the
  sweep. `deleteMember` throws *before* mutating on every branch (`no such tool`, `no such wrapper`,
  `no such tool field`, `no such manager`, `no such lifecycle hook`, `no such grammar set`), so a bad
  path cannot leave the grammar dirty, and the `finally` restores on a thrown `classifyBuildCommand`.
- **The mutation cannot leak between test files.** `vitest.knobs.ts` sets
  `poolOptions: { forks: { singleFork: false, isolate: true } }`, so the module registry — and with it
  the mutated `GRAMMAR` — is per file. Exporting mutable `Set<string>` handles from a helper is a real
  hazard; isolation is what makes it safe here, and that dependency is undocumented.
- **`Reflect.deleteProperty` + object-spread avoids both the bare `as` and `no-dynamic-delete`**, and
  `matchAll` on the module-level `/g` regex in `check-atdd-annotation-ledger.mjs` is safe (`matchAll`
  clones, so `lastIndex` never carries between calls).

All demonstrations below are reproducible from `tmp/r09-impl/`, which holds an esbuild transpile of the
helper plus a harness that imports the test file's **own** `MEMBER_CASES`, `SYNTHETIC`,
`grammarMembers()` and `deleteMember` (vitest stubbed out), so nothing is a re-implementation.

---

## Blocking-severity findings

### B1 — the INTERPRETERS family still shares the one global rule v11 removed from wrappers, and `bash -c` is the commonest spelling it loses

**Issue.** `command()` handles an interpreter by slicing off its name alone
(`buildCommand.ts:415-417`) — exactly what `stripPrefix` did to wrappers before v11, and the defect the
v11 header describes as "the loop broke on `-n` / `-a` and the wrapper's argument was read as the
command". An interpreter's own flags are not consumed, so the flag lands in the head position.

```
$ node tmp/r09-impl/probe1.cjs   (extract)
none       | bash -c "pnpm build"
none       | bash -lc 'pnpm build'
none       | sh -c 'pnpm build'
none       | pwsh -Command 'pnpm build'
none       | pwsh -File scripts/build.ps1
$ node tmp/r09-impl/probe2.cjs   (extract)
heuristic  | pwsh scripts/build.ps1
none       | pwsh -File scripts/build.ps1
none       | pwsh -NoProfile -File scripts/build.ps1
```

**Why.** This is the risk direction `US-0017-0004` rests on. The shipped-tree assertion
(`buildCommand.test.ts:1060`) is `flagged === []` — it can only be defeated by a **false negative**, and
`bash -c "pnpm build"` is the idiomatic way to put a compound command in a `run:` step. The last two
lines are sharper than a missed form: they are the same command under two spellings with two verdicts
(`heuristic` vs `none`), which is the "one command, one verdict" invariant this file asserts at lines
729-739, 908-920 and 764-796. All five member cases for `INTERPRETERS` are the single shape
`<interp> scripts/build.sh`, so the corpus cannot see this.

**Suggestion.** Give interpreters the same treatment wrappers just received: an `InterpreterGrammar`
with `values` (`bash`/`sh`/`zsh`: `-c`, `-o`, `--rcfile`; `pwsh`/`powershell`: `-Command`, `-File`,
`-EncodedCommand`, `-ExecutionPolicy`) and a rule that the argument of `-c`/`-Command` is re-entered as
a shell line via `shell()` rather than discarded. Two member cases per interpreter, and the
`heuristic`/`none` split above becomes a pinning case.

- **Severity:** Blocking
- **Traces to:** `defect:correctness`

### B2 — `yarn workspaces foreach … run build` is `none`, and it is the canonical Yarn Berry workspace build

**Issue.** `workspaces` is in `MANAGER_PASS`, but the token after it is `foreach`, which no rule knows.
For a manager the first unrecognised bare token **is** the script (`buildCommand.ts:503`), so `foreach`
is looked up as a script name, misses, and `namesABuild("foreach")` is false.

```
$ node tmp/r09-impl/probe1.cjs   (extract)
none       | yarn workspaces foreach -A run build
none       | yarn workspaces foreach --all run build
none       | yarn workspaces foreach -pt run build
```

**Why.** Same direction and same consequence as B1. `yarn workspaces foreach --all run build` is the
Yarn 2/3/4 documented spelling of "build every workspace"; an adopter's shipped lane can carry it and
the story will report no build. Note that `MANAGER_PASS.workspaces`' own pinning case is
`pnpm workspaces build` (line 169) — a form no package manager actually has — so the member is pinned
by a synthetic command while the real one it exists for is missed.

**Suggestion.** `foreach` belongs in `MANAGER_PASS` (it is a passthrough verb, not a value consumer);
its `-A` / `--all` / `-p` / `-t` / `-R` are booleans handled by the manager default only if they are in
`MANAGER_BOOLEAN` — `-A`, `-p`, `-t`, `-R` are not, so `-A run` would consume `run`. Both edits are
needed together, and the pinning case should be the real command, not `pnpm workspaces build`.

- **Severity:** Blocking
- **Traces to:** `defect:correctness`

### B3 — eight grammar members are unpinned and the sweep cannot reach them, so "every remaining member is pinned" is false

**Issue.** The sweep's reach is exactly `GRAMMAR`, and `GRAMMAR` is not the grammar. `SCRIPT_FILE`
(`buildCommand.ts:310`) and `namesABuild`'s separator class (`buildCommand.ts:316`) are grammar in every
operative sense — deleting a member of either changes verdicts — and neither is exported, so
`grammarMembers()` never names them and `deleteMember` cannot touch them. Measured against **712**
command literals harvested from the whole test file, under all three source configurations
(`SYNTHETIC`, the real manifests, and no map):

```
$ node tmp/r09-impl/probe10.cjs
command-literal candidates harvested from the test file: 712

SCRIPT_FILE member "ps1" deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
SCRIPT_FILE member "bat" deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
SCRIPT_FILE member "cmd" deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
SCRIPT_FILE member "cjs" deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
SCRIPT_FILE member "js"  deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
SCRIPT_FILE member "ts"  deleted   -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
namesABuild separator "_" deleted  -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
namesABuild separator "/" deleted  -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 0
namesABuild separator ":" deleted  -> MEMBER_CASES disagreeing: 0 | literals whose verdict moves: 4
```

and the deletion is not inert on behaviour, only on the corpus:

```
$ node tmp/r09-impl/probe8.cjs
effect  pwsh scripts/build.ps1 : base heuristic | mutated none
effect  ./scripts/build.cmd    : base heuristic | mutated none
MEMBER_CASES disagreeing after deleting those 6 members: 0
GRAMMAR keys the sweep can reach: managers, tools, bundlers, managerPass, managerConsuming,
  managerBoolean, managerDirs, targetFlags, noScripts, managerValues, wrappers, interpreters, lifecycle
```

**Why.** This is the answer to request item 2, and it is the same shape as round 8's headline: an
instrument that reports a property it does not have. `buildCommand.ts:45` states "every remaining member
is pinned: deleting any one reddens the corpus"; the test at line 841 is titled "reddens on the deletion
of any one grammar member". Both are true **of `GRAMMAR`** and false of the grammar, and the gap is not
visible from inside either assertion — precisely the failure mode that made v10 necessary. The helper's
own note at lines 543-545 records that `wrappers`, `interpreters` and `lifecycle` were added to the
export "because they were NOT, and so nothing could see that six wrappers, four interpreters and
`prepublishOnly` had no case at all." The same sentence now applies to `SCRIPT_FILE` and the separator
class.

**Suggestion.** Add both to `GRAMMAR` as enumerable member lists — `scriptExtensions: readonly string[]`
feeding a built regex, and `nameSeparators: readonly string[]` feeding the split — then let
`grammarMembers()`/`deleteMember` handle them like any other set. Eight new hardcoded cases
(`pwsh scripts/build.ps1`, `./scripts/build.cmd`, `node tools/build.cjs`, `make build_all`). That
restores the claim rather than narrowing it.

- **Severity:** Blocking
- **Traces to:** `defect:correctness`

### B4 — `gradle -x build` is reported as a build, and `-x` is the flag that excludes it

**Issue.** `-x` / `--exclude-task` takes a value in gradle and is absent from gradle's `values`. For a
tool an unlisted flag consumes nothing (`buildFlags.has` fails, then `continue` at line 485), so the
excluded task name lands in the subcommand position and `namesABuild` fires.

```
$ node tmp/r09-impl/probe2.cjs   (extract)
build      | gradle test -x build
build      | gradle -x build test
build      | ./gradlew assemble -x build
build      | gradle --exclude-task build test
build      | make -o build all
build      | dotnet -a build test
```

**Why.** The verdict is not merely wrong, it is inverted: the command says "run `test`, **excluding**
`build`". This is the identical shape to `cmake --install build`, the single case the whole `dirs`
mechanism was built for (`buildCommand.test.ts:677, 725`), and `-x` is far commoner in CI than
`--install`. `make -o` (old-file) and `dotnet -a` (short of `--arch`, whose long form *is* listed) are
the same omission. Direction matters here too: this is the false-positive direction, which is what the
own-tree pinned set at `buildCommand.test.ts:1098-1103` exists to hold.

**Suggestion.** Add `-x`/`--exclude-task` to `gradle` and `gradlew` `values`, `-o`/`--old-file`/`-W`
to `make`, `-a` to `dotnet`. Each takes a `<tool> <flag> build clean` -> `none` pinning case, the shape
already used 100+ times. The residual — that a tool's `values` list is a guess about a closed set — is
worth stating in the header rather than leaving implied by "closed and declared here" (line 65).

- **Severity:** Blocking
- **Traces to:** `defect:correctness`

---

## Major findings

### M1 — `ionice` is the one wrapper whose sibling long forms were all forgotten

**Issue.** Attacking the guesses, as requested. Auditing every wrapper for the short/long pairing that
round 8's `-w` lesson is about, exactly one wrapper is missing all of them: `ionice` lists `-c`, `-n`,
`-p` and none of `--class`, `--classdata`, `--pid`.

```
$ node tmp/r09-impl/probe1.cjs   (extract)
none       | ionice --class 3 pnpm build
none       | ionice --classdata 4 pnpm build
none       | ionice --pid 1234 pnpm build
build      | ionice -c 3 pnpm build
```

Every other wrapper is paired correctly: `time` (-o/--output, -f/--format), `sudo` (-u/--user,
-g/--group), `nice` (-n/--adjustment), `xvfb-run` (-s/--server-args, -n/--server-num, -f/--auth-file),
`stdbuf` (-i/--input, -o/--output, -e/--error), `env` (-u/--unset, -C/--chdir), `timeout`
(-s/--signal, -k/--kill-after). Inline long forms such as `--signal=KILL` fall through correctly because
the attached-short-flag regex cannot match a double dash — that is right, and worth keeping.

**Why.** "One spelling, two meanings, and no global list can hold both" (line 251) generalises to "one
flag, two spellings, and a list holding one of them is a list that does not hold it". The wrapper
grammars were written from six measured forms plus guesses about siblings; this is where the guess
missed.

**Suggestion.** Add the three long forms, each with the `<wrapper> <flag> <value> pnpm build` -> `build`
case already used for the other 33 wrapper flags.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M2 — three value-taking `xvfb-run` flags and two `sudo` flags are absent, and each swallows the build

**Issue.** `xvfb-run` also has `-e`/`--error-file`, `-w`/`--wait` and `-p`/`--xauth-protocol`, all
value-taking; `sudo` has `-p` (prompt) and `-C` (close-from).

```
$ node tmp/r09-impl/probe1.cjs   (extract)
none       | xvfb-run -e /tmp/err.log pnpm build
none       | xvfb-run --error-file /tmp/err.log pnpm build
none       | xvfb-run -w 5 pnpm build
none       | xvfb-run --wait 5 pnpm build
none       | xvfb-run -p MIT-MAGIC-COOKIE-1 pnpm build
none       | sudo -p prompt pnpm build
none       | sudo -C 3 pnpm build
build      | sudo -E pnpm build
```

**Why.** `xvfb-run` was added this round *because* `xvfb-run -a` was one of round 8's eleven planted
builds. Half its value flags are missing, and the failure mode is the same one that let ten of eleven
through: the loop breaks on the unrecognised value and the wrapper's argument becomes the command.

**Suggestion.** As M1. The safe-default argument in the header (line 277) is sound in the abstract, but
it makes the completeness of `values` load-bearing, which is worth saying where the default is justified.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M3 — the `.each` / `.for` precondition does not cover chained modifiers, which `countCases` explicitly does

**Issue.** `stageEvidenceCounts.test.ts:55` counts an *arbitrary* modifier chain via `(?:\.\w+)*`. The
precondition added this round (line 251) requires `each`/`for` to be the **first** modifier. Everything
in between is counted as one callsite and not caught.

```
$ node tmp/r09-impl/probe7.cjs
line                                                     countCases sees precondition catches
it.each([1, 2, 3])("x", () => {});                       true            true
it.for([1, 2, 3])("x", () => {});                        true            true
it.concurrent.each([1, 2, 3])("x", () => {});            true            false
it.concurrent.for([1, 2, 3])("x", () => {});             true            false
test.skip.each([1, 2, 3])("x", () => {});                true            false
test.concurrent.for([1, 2, 3])("x", () => {});           true            false
describe.concurrent.each([1, 2, 3])("x", () => {});      false           false
```

**Why.** This is round 8's `.for` finding one modifier deeper, and the comment written this round names
the standard it fails: "A precondition naming one of two equivalent constructs is a precondition that
does not hold" (line 239). `it.concurrent.each` is not exotic — this repository's knobs set
`maxConcurrency`, which is what `.concurrent` exists for. Live consequence: one
`it(` changed to `it.concurrent.each([1,2,3])(` in a counted file makes vitest report N+2 where the
record says N, with `countCases`, the recorded-output test and the precondition all green — the exact
three-green state round 8 measured.

**Suggestion.** One change: allow the chain, matching `CALLSITE`'s own tolerance, which is the invariant
the pair needs.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M4 — both exemptions added to `retractedClaims.test.ts` this round exempt nothing, and both are exploitable

**Issue.** Isolating each widening against the five governance files as they stand:

```
$ node tmp/r09-impl/probe4.cjs
total occurrences        : 56
unquoted under current   : 0
rely on fence/blockquote wholesale exemption: 0
rely on the odd-parity ALTERNATE pairing     : 0
```

Every one of the 56 occurrences is quoted under strict even-parity pairing with no fence or blockquote
exemption at all. Both widenings are dead weight — and both work as laundering routes, demonstrated with
the guard's own exported functions:

```
$ node tmp/r09-impl/probe6.cjs
--- 1. blockquote makes a whole paragraph exempt ---
treated as QUOTED (passes)
   control, same prose without the blockquote line:
   reported as ASSERTED (fails)

--- 2. one stray quote mark buys an alternate pairing ---
treated as QUOTED (passes)
   control, the same sentence with the stray mark removed:
   reported as ASSERTED (fails)
```

Case 1 is a paragraph whose first line is a one-line blockquote and whose second line asserts
`there is no run history to mutate` as plain prose. Case 2 is one sentence carrying a stray quote mark,
a plain assertion, and an unrelated real quotation.

**Why.** The comment at line 296 concedes the widening and argues the trade is worth it because
"accusing a correct edit in a required CI leg is the worse failure of the two". That trade is only worth
making if the accusation is real; the measurement says no occurrence needs either mechanism today, so
the cost is being paid for nothing. The fence/blockquote exemption is also coarser than the comment
admits: `shownSpans` marks the whole paragraph, and paragraphs here are blank-line separated, so one
blockquote line anywhere in a block exempts every assertion in that block.

**Suggestion.** Keep the fence/blockquote exemption but make it **line-scoped** rather than
paragraph-scoped — map line ranges into joined coordinates the way quote spans already are, using the
offsets `shownSpans` already computes and discards (see M9). Drop the odd-parity alternate pairing and
instead **report** an odd mark count as its own failure: a stray quote mark in a governance file is a
defect to fix, not a licence to widen. Either way, add a case asserting each exemption is needed by
something, or it will drift back to dead.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M5 — `defeated by` binds no subject, so it accuses true statements about anything being defeated

**Issue.** The needle for the formatter retraction was shortened to the two words `defeated by`
(`retractedClaims.test.ts:133`). The retraction is about *the formatter* defeating the guard; the needle
drops the subject and now forbids the English phrase in unquoted prose across all five files.

```
$ node tmp/r09-impl/probe6.cjs   (extract)
--- 3. the "defeated by" needle accuses a TRUE unrelated statement ---
reported as ASSERTED (fails)   <- "Round 8 found the member-pinning test was defeated by generating
                                   its probes from the very set it pinned."
reported as ASSERTED (fails)   <- "The zero-width guard was defeated by a soft hyphen placed inside
                                   a word."
```

It has 8 live occurrences today, more than any other entry.

**Why.** Both accused sentences are findings this stage recorded as true. `tests/assets/**` runs in the
`e2e` project, a required CI leg, so the guard now reddens the required leg for writing a correct
sentence — the failure the same file calls the worse of the two (line 297). The header already identifies
the residual ("What this list actually tracks is WORDINGS, not claims", line 40) and states the rule that
was broken: "Shorter needles help and are used where a subject can be bound safely" (line 46).
`defeated by` binds no subject.

**Suggestion.** Bind the subject: `formatter defeated`, or keep two entries
(`defeated by running the formatter` and `defeated by the formatter`). If the shorter form is wanted for
drift resistance, pair it with a negative case in this file asserting that a true statement about
something else defeating something else passes — the guard has positive cases for its needles and none
for its non-needles.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M6 — the sweep asserts the weak property while the table claims the strong one, and the strong one currently holds for free

**Issue.** `MEMBER_CASES`' header says "One case per grammar member… Each command was checked to change
verdict when its member is deleted" (lines 131-134). The sweep asserts something weaker: **some** case
disagrees (`MEMBER_CASES.some(...)`, line 854). Nothing ties a member to its own case, so a case could go
inert while another case covers for it, with the coverage assertion (names match) and the verdict
assertion (each case holds) both green.

Measured, and the good news is that the strong property holds today:

```
$ node tmp/r09-impl/sweep.cjs
members swept: 250
undetected: 0 []
own labelled case does NOT detect its own deletion: 0
after sweep, members: 250 cases: 250
members with exactly one detecting case: 228
```

**Why.** 228 of 250 members have exactly one detecting case, so for most members the weak and strong
properties coincide and the label is load-bearing. For the other 22 the label is currently decoration
that happens to be accurate. Given that this stage's recurring defect is an instrument claiming more than
it has, asserting the property that is actually true is free and closes the gap.

**Suggestion.** Inside the existing loop, collect the disagreeing members and require the swept member to
be among them: two arrays (`undetected`, `mislabelled`) and two `toEqual([])`. No new cases needed — it
passes as written.

- **Severity:** Major
- **Traces to:** `defect:code-quality`

### M7 — the comment that certifies the sweep states 208 members; the tree holds 250, and its other three numbers cannot be reconciled

**Issue.** `buildCommand.test.ts:812-813` reads "a sweep deleting each of the 208 members one at a time
reddens the corpus 208 times. Before v10 dropped the forty-five unobservable members, 162 of 207
survived." — repeated at lines 847-848, with `buildCommand.ts:31` saying "for all 207 of them".

```
$ node -e "const t=require('./testInternals.cjs'); ..."   (tmp/r09-impl)
members 250 cases 250
```

208 was the v10 count; v11 added exactly 42 members (33 wrapper `values` + `WRAPPERS.timeout` +
`WRAPPERS.timeout.args` + `MANAGER_VALUES.npm.-w` + 2 x `builds.bake` + 4 `MANAGER_BOOLEAN`), so
208 + 42 = 250 and the number is stale by precisely this round's own additions. Separately, the three
figures in that one sentence do not compose: 207 - 45 = 162, which contradicts "208 members" in the
preceding clause, and 208 + 45 = 253, not 207. Whatever enumeration produced 207 and 162 is not the one
that produces 208 or 250, and it is not recorded anywhere.

**Why.** This is request item 4 applied to a number that was typed rather than derived, sitting in the
one comment that certifies the sweep, in a file whose sibling guards exist because "a number typed into
the record that the tree did not hold" recurred in every round (`stageEvidenceCounts.test.ts:4-6`).

**Suggestion.** Do not restate the count in prose. The number is available at runtime, and line 824
already asserts the equivalent fact; delete the 208 / 207 / 162 sentences or move them into the evidence
record where a derivation can accompany them.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M8 — the same evidence yields two verdict strengths across the manager/tool boundary

**Issue.** A name that merely contains `build` is a `heuristic` through a manager and a hard `build`
through a tool.

```
$ node tmp/r09-impl/probe3.cjs
no script map: same evidence (a name containing 'build'), two verdict strengths
 manager: heuristic  npm run clean-build-cache
 tool:    build      make clean-build-cache
 manager: heuristic  npm run restore-build-artifact
 tool:    build      turbo run restore-build-artifact
 manager: heuristic  pnpm lint-build-cache
 tool:    build      cargo lint-build-cache
```

**Why.** `buildCommand.test.ts:672-674` pins the manager side as a deliberate design point — "Names that
merely contain `build` are guesses, not builds" — and the tool side contradicts it with the strongest
verdict the type has. `BuildVerdict` has three values precisely to keep a guess distinguishable from an
analysis ("the verdict says so rather than passing a guess off as an analysis", line 627). For a tool
subcommand there is no script body to resolve, so the evidence is *only* the name; `build` claims more
than that. The nearest false positive is `docker run --rm alpine echo build-info` -> `build` (m12).

**Suggestion.** In the tool branch (line 500), return `build` for an exact-token match and `heuristic`
when `namesABuild` fires only after splitting. That preserves every `MEMBER_CASES` expectation of `build`
on a bare `build` token. Worth measuring against the own-tree pinned set before adopting.

- **Severity:** Major
- **Traces to:** `defect:correctness`

### M9 — `shownSpans` computes offsets its only caller throws away, and its JSDoc says otherwise

**Issue.** `shownSpans` (`retractedClaims.test.ts:309-330`) is 22 lines of offset arithmetic returning
`Array<[number, number]>`. Its only call site is at line 371 and reads `.length > 0` — every computed
offset is discarded and only emptiness is used. Its JSDoc says the spans are "Computed over the raw
document before flattening, then **mapped by paragraph** in `occurrences`". They are not mapped; they are
thresholded, and the header two lines above the call site frames the design as "Two coordinate systems
and one mapping between them" (line 341).

The offset arithmetic that *is* used is correct — I checked it. `[offset - 1, offset + flat.length + 1]`
against the test `start < index && to <= end` exempts every position inside the paragraph including the
first (`offset - 1` is -1 for paragraph 0) and correctly declines to exempt an occurrence straddling
either boundary. But it is a wholesale exemption, which is the coarseness M4 is about.

**Why.** A function whose stated contract is precise spans, whose caller uses a boolean, and whose doc
describes a mapping that does not exist, is the least-astonishment failure in the file that exists to
stop prose claiming more than it does. It also hides M4's fix: the precise spans are already computed.

**Suggestion.** Either use the spans (map them into joined coordinates like the quote spans, which
resolves M4's exploit and this finding together) or replace the function with a boolean predicate and
correct the JSDoc. Do not keep a precise return value that nothing reads.

- **Severity:** Major
- **Traces to:** `defect:code-quality`

---

## Minor findings

### m1 — the helper's header says "Ten versions" at v11

`buildCommand.ts:3-4`: "Ten versions. Each of the first nine was measured, reported clean by the party
that wrote it, and then broken by a corpus someone else chose." Line 47 then says "**v11 is the same
lesson twice more.**" The review request itself has it right ("Eleventh version, tenth reported clean").
The counts in the opening sentence should read eleven and ten.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m2 — `deleteMember`'s doc claims an exact restore including order; two of its branches do not restore order

`buildCommand.test.ts:417-421`: "the returned function puts it back **exactly**… A set is restored by
clearing and re-adding in the original order — appending would be enough for behaviour… but not for the
two tests that compare member lists." True of the `SETS` branch. The `TOOLS`/`WRAPPERS` whole-key
branches use `Reflect.deleteProperty` then reassign, which re-adds the key at the **end** of the object,
so `Object.entries` order changes and `grammarMembers()` returns a different order afterwards. Harmless
today — the sweep captures `grammarMembers()` once, and both list-comparing assertions are
order-independent — so the stated *reason* for the careful set restore is not one the object branches
honour. Either restore order there too, or narrow the comment.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m3 — the `WRAPPERS` branch of `deleteMember` validates no field while the `TOOLS` branch throws

`buildCommand.test.ts:449-451` throws `no such tool field` for an unrecognised tool field. The wrapper
branch (lines 470-478) checks only for `args` and otherwise filters `values`, so a future wrapper field
would silently filter nothing and be reported as an undetected member — a confusing failure instead of a
clear one. Unreachable today because `grammarMembers()` emits only `values` and `args` paths. Mirror the
`TOOLS` guard for fail-fast symmetry.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m4 — `buildFlags: []` is repeated on 30 tools while `builds` is optional

`ToolGrammar` makes `builds` optional (used by 2 tools) and `buildFlags` required (empty on 29 of 30).
Under `exactOptionalPropertyTypes: true` both type-check, and `grammarMembers()` handles the optional
correctly. But two conventions in one interface cost 29 empty literals and make the reader ask why one is
optional. Make both optional or both required. The optionality itself is fine: `deleteMember`'s spread
leaves an empty array rather than removing the key, which is behaviourally identical since only `.has` is
called.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m5 — the inline `buildFlags` branch is dead code with no case

`buildCommand.ts:456` handles the inline form where the flag is a `buildFlags` member. The only member is
cmake's `--build`, and cmake has no inline `--build=<dir>` syntax; no literal in the test file uses that
form. Deleting `TOOLS.cmake.buildFlags.--build` is caught by the *spaced* branch at line 474 via
`cmake --build .`, so the sweep reports the member pinned while this branch never executes. Drop the
branch or add the case that justifies it.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m6 — `stripPrefix`'s guard limit of 8 is an undocumented magic number with a silent failure past it

```
$ node tmp/r09-impl/probe9.cjs   (extract)
stripPrefix guard limit (8 iterations):
  8 assignments : heuristic
  9 assignments : none
```

Nine leading `VAR=value` assignments (or nine stacked wrappers) leave a token at the head and the line
returns `none`. The constant has no name, no comment and no case. Either state why 8 is enough, or bound
the loop by `tokens.length` — it already terminates, since every iteration either consumes a token or
breaks.

- **Severity:** Minor
- **Traces to:** `defect:correctness`

### m7 — `EMPTY` is a shared mutable `Set` presented as a `ReadonlySet`

`buildCommand.ts:312` declares one `new Set()` typed `ReadonlySet<string>` and hands it to `pass`,
`buildFlags` and `builds` on the manager path. The type forbids mutation but the object is a live `Set`
with three aliases; one stray `.add` through a widened reference would change all three. Nothing does
today. `Object.freeze` does not help a `Set`, so the cheap fix is a `has`-only helper or dropping the
sharing — the function already allocates three sets per call. The sharing buys nothing measurable that
would justify the aliasing.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m8 — seven common CI wrappers are absent from the family

```
$ node tmp/r09-impl/probe1.cjs   (extract)
none       | taskset -c 0-3 pnpm build
none       | chrt -f 1 pnpm build
none       | flock /tmp/lock pnpm build
none       | setsid pnpm build
none       | unbuffer pnpm build
none       | retry -t 3 pnpm build
none       | script -qec 'pnpm build' /dev/null
```

`setsid` and `unbuffer` need only a name (no value flags); `taskset`, `chrt` and `flock` need one value
flag each. `WRAPPERS` is presented as a closed declared set (line 277) and that closure is a guess about
which wrappers exist. This is the family-completeness residual, not a defect in the mechanism v11 added.

- **Severity:** Minor
- **Traces to:** `defect:correctness`

### m9 — a lowercase `var=value` prefix is not stripped

`buildCommand.ts:369` requires an uppercase-initial name, so `npm_config_target=x pnpm build` is `none`
while `CI=true pnpm build` is `build`. Lowercase assignment prefixes are legal shell and the
`npm_config_*` family is the common case in Node CI. Widening the character class costs nothing here,
because a bare token carrying an equals sign is already treated as a setting everywhere else
(`isSetting`, line 322).

- **Severity:** Minor
- **Traces to:** `defect:correctness`

### m10 — `main()` in `check-atdd-annotation-ledger.mjs` is 83 lines

Lines 204-286, against `CLAUDE.md`'s "Keep functions focused; extract when a function exceeds ~50
lines." Three separable concerns: argument parsing (208-237), collection (246-267), reporting (269-285).
Pre-existing — the file is unchanged since round 4 — so this is not a regression of this round, and the
argument parser is the clearest extraction boundary. Otherwise this file reads well: every `await` is in
a `try`/`catch` or deliberately propagating, `main().catch` is present, and the exit-3 separation from
exit-1 is correct and well argued.

- **Severity:** Minor
- **Traces to:** `CLAUDE.md` Project Rules (function size)

### m11 — the anchored version pin derives "the version the helper is at" from the helper's own prose

`coverageDepthMatrix.test.ts` takes `current` as the largest `vN` token anywhere in the helper and
requires the record's naming sentence to state it. The record does
(`coverage-depth-spec-0017.md:242`) and the helper's tokens are `v4 v6 v7 v8 v9 v10 v11`, so the pin
holds — and the anchoring is a real improvement over the file-wide `toContain`. The residual: a version
bump whose comment forgets to say `v12` leaves `current` at 11 and the pin satisfied, because the helper
has no version constant and both sides of the comparison are prose. m1 is an instance of that prose
already being behind. One exported constant read by both the pin and the header would close it.

- **Severity:** Minor
- **Traces to:** `defect:code-quality`

### m12 — the tool branch's every-bare-token rule invents a build from a container argument

```
$ node tmp/r09-impl/probe1.cjs   (extract)
build      | docker run --rm alpine echo build-info
none       | docker run --rm alpine cat /etc/build-id
```

The v9 rule "for a tool, EVERY bare token is a candidate subcommand" (line 27) is what `make -j 4 build`
needs, and it also reads an arbitrary in-container command argument as a subcommand once `namesABuild`
splits it on a hyphen. The near miss is saved only by `isPathLike`. Round 7's
`docker run --name build-agent alpine` is pinned (`buildCommand.test.ts:780, 980`) because `--name` is now
a declared value flag — i.e. the fix was per-flag rather than per-position. Bounding the candidate window
for `docker`/`podman` (stop at the image argument of `run`/`exec`) would close the class rather than the
instance. M8's `heuristic` proposal would also reduce the cost of being wrong here.

- **Severity:** Minor
- **Traces to:** `defect:correctness`

---

## Answers to the request's five challenges

1. **Break v11.** Broken in four places, all in the story's own risk direction (a false negative in a
   shipped lane): B1 (`bash -c`, `pwsh -File`), B2 (`yarn workspaces foreach`), M1 (`ionice` long forms),
   M2 (`xvfb-run -e/-w/-p`, `sudo -p/-C`). The guesses about siblings held everywhere except `ionice`,
   where all three long forms are missing. The wrapper *mechanism* v11 added is sound: `stripPrefix`'s
   per-wrapper consumption is correct for every form it lists, the attached-short-flag regex correctly
   declines to fire on a long inline form, and `args` is consumed after flags in either order — both
   `timeout -s KILL 600 pnpm build` and `timeout 600 -s KILL pnpm build` resolve. What is wrong is which
   flags are listed, and that one family (interpreters) never got the treatment.
2. **Break the deletion sweep.** The property it asserts holds — 0 of 250 undetected, restore exact, and
   the stronger per-member property holds too (M6). It is nonetheless simultaneously green and wrong,
   because its reach is `GRAMMAR` and `GRAMMAR` is not the grammar: eight members outside the export can
   be deleted with zero movement across 712 command literals (B3). The `MANAGER_CONSUMING.--filter`
   falsification you performed is the weaker of the two — it shows the sweep *can* see a restored member;
   B3 shows a class it structurally cannot see.
3. **Break `retractedClaims.test.ts` a fifth time.** Both widenings are exploitable and neither is needed
   by anything today (M4), and the `defeated by` needle accuses true statements (M5). The counted-claim
   needle is sound; the RETIRED bookkeeping is exactly consistent (all three retired entries dormant,
   none of the 16 live entries dormant, no retired entry absent from `RETRACTED`). And yes — one
   retraction this role established is missing: round 3's `M1` refuted
   `"pinned so the number cannot drift silently in either direction"`. The record quotes it correctly
   today (`atdd-spec-0017.md:960-961`, across a line break, which the flattening handles), but no entry
   enforces that it stays quoted, so it sits in exactly the state the list exists to prevent. Add it.
   Round 4's `M4`, `M2` and `B1` retractions were corrected in place in source comments rather than
   restated in the records, so no entry is owed for those.
4. **The numbers.** The nine packs on disk are all named in the record (9/9 including the in-flight one);
   the assets suite recomputes every recorded seal and passes; `buildCommand.test.ts` holds 20 tests,
   which is what the runner reported. The one number I can falsify is not in the record but in the code:
   **208 members against 250**, with two companion figures that do not compose (M7).
5. **The two calls.** (a) Leaving five packs' `summary.json` counts as written, with the rule stated,
   rather than re-sealing five packs to move a bookkeeping figure, is outside this domain — it is a
   record-consistency question for the `completion-reviewer`. I note only that the round-8 diagnosis
   behind it (counts disagreeing because advisories were enumerated inline) is why every finding here is a
   heading. (b) is **consistent with the repository's convention and I would not change it**:
   `.qfai/report/*` is ignored wholesale (`.gitignore:57`), `git status --porcelain --ignored` shows every
   `run-*` directory ignored with none tracked, and `git ls-files .qfai/report` shows exactly the curated
   set force-added (`validate.log`, `validate.spec-0017.json`, `README.md`, `preflight_summary.md`,
   `specs-coverage/`). Force-adding `validate.spec-0017.json` beside the already tracked `validate.log`
   follows that pattern; committing a 445 KB per-run directory would be the first exception to it.

## Required fixes (this domain)

1. B1 — give interpreters their own flag grammar and re-enter `-c` / `-Command` arguments through
   `shell()`. Two cases per interpreter.
2. B2 — `foreach` as a passthrough verb plus its boolean flags, pinned by the real Yarn command.
3. B3 — export `SCRIPT_FILE`'s extensions and `namesABuild`'s separators as enumerable members so the
   sweep reaches them; eight cases.
4. B4 — `-x`/`--exclude-task` for gradle and gradlew, `-o` for make, `-a` for dotnet.
5. M1, M2 — the missing wrapper value flags, with the standard pinning case each.
6. M3 — allow a modifier chain in the `.each`/`.for` precondition.
7. M4, M5 — line-scope the shown-span exemption, drop or justify the odd-parity pairing, and bind a
   subject to the `defeated by` needle.
8. M7 — delete the typed member counts; the assertion at line 824 already carries the fact.
9. M6, M8, M9 — the free strengthening of the sweep, the verdict-strength decision, and `shownSpans`'
   contract.

## Residual risks recorded

- **The helper's completeness is unfalsifiable from inside it.** B1, B2, B4, M1, M2, m8 and m9 are each a
  missing member of a declared-closed set, and no test in the repository can find the next one — the
  corpora contain only forms someone thought of. Eleven versions have each been reported clean and then
  broken by an outside corpus; nothing here changes that, and the fixes above will not either. The
  standing mitigation is the one the stage has been using: an adversarial corpus chosen by someone who did
  not write the predicate.
- **The story's assertion is one-sided.** `US-0017-0004` needs `flagged === []` over the shipped tree, so
  every false negative is invisible to it by construction while every false positive is loud. That
  asymmetry makes B1/B2 the dangerous class and B4/m12 the safe one, and it is worth stating in the test
  rather than leaving to a reader to notice.
- **`GRAMMAR` exports mutable handles into the live grammar.** Safe only because
  `poolOptions.forks.isolate` is `true` in `vitest.knobs.ts`. If that is ever tuned — and the file is
  where the tunables live — the sweep becomes order-dependent across files. Worth a comment at the export.
- **Advisory / Change Request proposals:** none. Every finding above is demonstrated from the changed
  artifacts and traces to a `defect:*` class or a named repository rule; none adds a product obligation
  upstream never asked for.

## Sign-off

- [x] Review verdict is explicit — **REVISE**, advisory (conditional role for `qfai-atdd`).
- [x] Findings cite concrete artifacts, commands and outputs.
- [x] Every finding declares `Severity:` and `Traces to:`; no finding carries `Traces to: none`.
- [x] Required gates and residual risks recorded.
- [x] Read-only apart from this file. No `git checkout` / `stash` / `reset` / `commit` / `push`. No
      tracked file was mutated: every mutation experiment ran against esbuild transpiles under
      `tmp/r09-impl/`, never against the source.

**Revision at finish:** `05a97202` — unchanged from start, as the request required.
