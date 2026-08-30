# R01 — implementation-reviewer (round 10, /qfai-atdd, spec-0017)

```text
Round: 10
Result: REVISE
Reviewed revision: a66be5c6
Audited evidence hash: 7023936c33fde300770b409432a7c231a0f87882b59a8d7ef253bdb2647ac2e2
Authored/edited under review: none
```

- `git rev-parse --short HEAD` at start: **`a66be5c6`**. `git status --porcelain` at start: **empty**.
  At finish: **`a66be5c6`**, `git stash list` empty. HEAD did not move.
- **Role standing this round: conditional, not blocking.** `.qfai/assistant/manifest/agent-routing.yml`
  lines 139-207, `skill: qfai-atdd`, phase `review`: `mandatory_agents: [completion-reviewer,
  qa-gatekeeper]`, `conditional_agents: [implementation-reviewer]`, `blocking_agents:
  [qa-gatekeeper, completion-reviewer]`. Nothing below gates `done` on its own authority; it is input
  to those two.
- **Findings: 6 blocking, 9 major, 11 minor — 26 total, each a heading.** The count is mechanically
  the number of `###` finding headings in the three sections; verified at the end of this file.
- Scope: `packages/qfai/tests/helpers/buildCommand.ts` (v12),
  `packages/qfai/tests/unit/buildCommand.test.ts`, `packages/qfai/tests/assets/retractedClaims.test.ts`,
  `packages/qfai/tests/assets/stageEvidenceCounts.test.ts`,
  `packages/qfai/tests/assets/coverageDepthMatrix.test.ts`, `scripts/check-atdd-annotation-ledger.mjs`.
- Round 7's P1d gate is closed and nothing here re-opens it.

## Audited evidence hash — subject, computed rather than assumed

Stage-review subject per `.qfai/assistant/constitution/shared-skill-delegation-baseline.md:365-372`
and steps 2-4 at lines 409-425: `.qfai/evidence/atdd-spec-0017.md` whole **minus** its
`## Final status` section, plus `.qfai/evidence/coverage-depth-spec-0017.md` whole; each normalized by
step 2, serialized as `path + NUL + sha256`, sorted by path, joined with newlines, then SHA-256 of the
record list.

Excluded extent, computed with fence tracking (`tmp/rev10/hash.mjs`): lines **1334-1565** of 1565,
heading `## Final status (PASS/FAIL) + who confirmed`, running to EOF — no `#`/`##` heading follows it
outside a fence, and the fence state at EOF is clean. Per-artifact digests:
`.qfai/evidence/atdd-spec-0017.md` = `19ffc990a0ac4c6c20e3f2b2923c7baaf5e1d36a20313f2a140be8440cda2062`
(95276 normalized bytes); `.qfai/evidence/coverage-depth-spec-0017.md` =
`b7fecf2d935e6fa2a439fa3c321d782550b1fdf6cacfb3132a770218d486837a` (31362 bytes). Computed by this
reviewer on the bytes it read.

## Baseline, established before any finding

| Check | Result |
| --- | --- |
| `vitest run` on the four test files under review | 43 passed (43), exit 0 |
| `eslint` on the six changed files | clean, no output |
| `packages/qfai/scripts/check-no-internal-version-leakage.sh` | `OK: no internal spec ids…`, exit 0 |
| `git diff --stat 05a97202~1 HEAD -- packages/qfai/assets` | **empty** — the distributed surface was not touched |
| packs on disk `>= review-20260820200000000` vs `Review pack:` lines in the record | 10 vs 10 |
| flag-branch overlap audit across all 33 tool entries | **no overlaps** — see "Negative results" |
| `deleteMember` restore exactness (object identity + key order) | exact, verified empirically |

## A note on the working tree, recorded because it is material

`git status --porcelain` was empty at 08:33. Between 08:35:09 and roughly 08:40 a **concurrent
process** — not this reviewer — held
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml` modified, replacing the shipped
`unit lane placeholder` step's body with `npx --package=tsup -- tsup --config tsup.config.ts`. I did
not revert it: it was not mine, and reverting would have destroyed an in-flight measurement. It was
restored by its owner; the tree is clean at finish. I ran the shipped-lane guard while it stood and it
was **green** (08:36:00, `1 passed`), which corroborates `B1` — but `B1` below rests on my own
measurement in a shadow tree, not on that. My own two source mutations were reverted byte-identically
in the same step (`sha256` before = after = `429b2fef…2609f1`, twice).

---

# Blocking

### B1 — Six real builds ship into the guarded lane unnoticed, and the story's own guard stays green

`Severity: blocking` · `Traces to: defect:correctness` (the predicate `US-0017-0004` rests on)

**Issue.** The request asked me to plant builds in forms nobody here has written, and to report the
negative result if it came back clean. It did not come back clean. I planted **six** real build
invocations into the shipped `unit lane placeholder` step of
`packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, in a shadow copy under `tmp/`, and
ran the guard's own `commandLines` + `classifyBuildCommand` pipeline over it:

```text
$ node tmp/rev10/shipped.mjs tmp/rev10/shadow/workflows
planted 6 real build invocations into the shipped `unit lane placeholder` step
lines read: 143 (guard floor is >50)
flagged   : []
GUARD "no shipped lane may run or appear to run its own build": GREEN
```

The six:

```yaml
- name: unit lane placeholder
  run: npm exec -- tsup --config tsup.config.ts
  run: bash -eo pipefail -c "pnpm -C packages/qfai build"
  run: time -v make all
  run: sudo "make" build
  run: run-s clean build
  run: env pnpm build -v
```

**Why.** Each is a *declared* family reached by a spelling the corpus does not contain, so this is not
the undeclared-tool class. Five mechanisms are involved — `B1` (this), `B2`, `B3`, `B4` and `M2`. This
heading owns the first:

```text
$ node tmp/rev10/probe4.mjs
  none      npx --package=tsup -- tsup --config tsup.config.ts
  build     npx --package=tsup -- tsup
  none      npm exec -- tsup --config tsup.config.ts
  none      pnpm exec -- tsup --config x.ts
  build     npx --package=tsup tsup --config tsup.config.ts
```

The `MANAGER_PASS` comment at `buildCommand.ts:279-280` states: no `--`, because the rule that a
manager flag consumes only when a later bare token exists already leaves the script readable, so
listing it changed no verdict. That measurement is wrong. `--` reaches the `isManager` consume branch
at lines 612-616, and `laterBare` is satisfied by the bundler own flag argument (`tsup.config.ts`), so
`--` **eats the bundler name**. Drop the trailing flag and the same command is `build`; add it and it
is `none`. One command, two verdicts, decided by whether the bundler was given a config path — the
invariant that killed v5 and v7.

The deletion argument is the one the request flagged as weakest: an argument from absence, over
commands this stage enumerated. Here the absence is exactly load-bearing — no command in any of the
ten corpora contains a bare `--`.

**Suggestion.** Put `--` back in `MANAGER_PASS` (one token), and add
`["MANAGER_PASS.--", "build", "pnpm exec -- tsup --config x.ts"]` to `MEMBER_CASES`, so the deletion
argument cannot be re-made without a probe contradicting it.

### B2 — The sh-family cluster rule cannot see the cluster GitHub Actions itself writes

`Severity: blocking` · `Traces to: defect:correctness`

**Issue.** The `interpreterTail` cluster rule is `/^-[a-z]*c[a-z]*$/` (line 513), matched against the
**whole token**. A cluster that also contains a *value-taking* letter is neither matched as inline nor
consumed as a value, so the loop breaks on the value and reads it as the command:

```text
$ node tmp/rev10/probe3.mjs      # with a resolving script map
  build     bash -c 'pnpm build'
  none      bash -eo pipefail -c 'pnpm build'
  none      bash --noprofile --norc -eo pipefail -c 'pnpm build'
  none      bash -euo pipefail -c 'pnpm build'
  build     bash -e -o pipefail -c 'pnpm build'
```

`bash --noprofile --norc -eo pipefail` is the *documented default* GitHub Actions uses for
`shell: bash`, and `-euo pipefail` is the commonest hand-written form. `bash -eo pipefail -c X` and
`bash -e -o pipefail -c X` are the same command with different verdicts — the one-command-one-verdict
invariant, on the axis this round did not assert. `zsh -euo pipefail -c X` is `none` while
`sh -eu -o pipefail -c X` is `build`, which is the same defect seen from the other side.

To the direct question in the request — is the regex safe against `-ic`, `-xc`, or a long flag
containing `c`? Yes on all three, and for a sound reason: no lowercase sh short option other than `c`
is a `c`, and a long flag second character is `-`, which `[a-z]*` cannot match. The rule is not
*unsafe*; it is *incomplete*, and the incompleteness is total for the sh family, because
`INTERPRETERS.bash.inline` is deliberately empty and the cluster rule is therefore the **only** path
to `-c`.

**Suggestion.** Walk the cluster letter by letter instead of matching the token: for each letter, if
it is `c` re-enter the remainder as a shell line; if it is in a per-shell `clusterValues` set (`o` for
all three) consume the next token; otherwise continue. Roughly six lines, and it removes the
which-spellings-did-someone-think-of axis entirely — the same move that replaced the wrapper `values`
lists. Add `bash -eo pipefail -c "pnpm build"` to the planted corpus.

### B3 — `EXISTENCE_PROBE` zeroes any wrapped command carrying `-v` anywhere: a one-token evasion

`Severity: blocking` · `Traces to: defect:correctness`

**Issue.** `stripPrefix` line 482:
`if (tokens.slice(1).some((token) => EXISTENCE_PROBE.has(token))) return [];`
The docstring on the set scopes it to one command — `command -v x` reports whether `x` exists, and
runs nothing — but the check applies to **every** wrapper and **every** position in the tail:

```text
$ node tmp/rev10/probe2.mjs   (### EXISTENCE_PROBE scope)
  none      command -v tsup
  none      time -v make all
  none      env pnpm build -v
  none      sudo make -V install
  none      timeout 600 pnpm build -v
  none      nice -n 19 make all -v
```

**Why.** Two independent over-reaches in one line. `-v` means *verbose* for `time`, `sudo`, `ionice`,
`stdbuf`, `flock` and most of the other eighteen wrappers, and `/usr/bin/time -v make` is a standard CI
timing idiom. Worse, because the scan ignores position, **appending a trailing `-v` to any wrapped
build turns it into `none`** — a deliberate one-token route past the guard `US-0017-0004` rests on.
That is the same shape as the laundering routes rounds 6-9 closed in `retractedClaims.test.ts`, in the
classifier instead of the record.

**Suggestion.** Scope it to the wrapper and the position it belongs to:
`if (bare === "command" && EXISTENCE_PROBE.has(tokens[1] ?? "")) return [];`. `MEMBER_CASES` already
spells both probes as `command -v tsup` and `command -V tsup`, so no case changes; add
`time -v make all` to the planted list.

### B4 — `stripPrefix` picks a head `command()` cannot read, so quoting the command name returns `none`

`Severity: blocking` · `Traces to: defect:correctness`

**Issue.** `namesACommand` unquotes its token (line 452: `unquote(token).split("/").pop()`).
`command()` does not (line 526 for `head`, line 543 for `first`). So the wrapper tail can *begin* at a
quoted token the next stage then fails to recognise:

```text
$ node tmp/rev10/probe2.mjs   (### quoted head chosen by stripPrefix)
  heuristic concurrently pnpm build
  none      concurrently "pnpm build" "pnpm test"
  none      script -qec 'pnpm build' /dev/null
  none      sudo "pnpm" build
  none      time "make" build
  none      env "pnpm" build
```

**Why.** Three consequences. First, quoting the command name after any wrapper is a one-character
evasion: `sudo "pnpm" build` is `none`. Second, `concurrently` and `script` are *only* ever written
with quoted commands, because that is how they take a multi-word command; `MEMBER_CASES:375` pins
`WRAPPERS.concurrently` with `concurrently pnpm build`, which runs two commands named `pnpm` and
`build`. That is precisely the class round 9 found for `mvn build` and `cmake build` — eleven of
thirty tool cases were commands the tool does not have — recurring in the wrapper family one round
later. Third, it breaks one-command-one-verdict on the spelling axis this round added a test for.

**Suggestion.** Unquote once, at one boundary. Cleanest: in `command()`, derive `head` and `first`
from `unquote(tokens[0] ?? "")`, so `namesACommand` and `command()` read the same token. Then re-pin
`WRAPPERS.concurrently` and `WRAPPERS.script` with the quoted forms those tools actually take, and put
`concurrently "pnpm build" "pnpm test"` in the planted corpus.

### B5 — `shownSpans` reopens the laundering route round 9 closed, and falsely accuses correct fences

`Severity: blocking` · `Traces to: defect:correctness` (a required CI leg: `tests/assets/**` runs in the `e2e` project)

**Issue.** Three separate faults in the new line-scoped mapping.

**(a) The coordinate model is wrong whenever a line carries leading or trailing whitespace, or is a
fence marker.** `shownSpans` assumes a paragraph flattened text is its lines flattened texts joined by
single spaces. It is not: `flattenings` collapses `\s+` to one space, so a line **own** leading or
trailing whitespace already becomes a space and the join adds a second; and a triple-backtick line
flattens to the **empty string**, because `flattenings` strips backticks, while still consuming a
separator. Measured against the real corpus:

```text
$ node tmp/rev10/spans2.mjs   (=== D ===)
   50 of 456 paragraphs have drifting coordinates (worst |drift| = 34)

$ node tmp/rev10/spans.mjs
  no whitespace        modelled=16 real=16 drift=0
  indented fence       modelled=26 real=21 drift=5
  indented blockquote  modelled=26 real=25 drift=1
  trailing space       modelled=11 real=10 drift=1
  tab indent           modelled=21 real=20 drift=1
```

**(b) A laundering route.** `inFence` is re-initialised to `false` for every paragraph, but a fenced
block containing a blank line **is** split by `raw.split(/\r?\n[ \t]*\r?\n/)`. In the second paragraph
the *closing* fence marker therefore toggles `inFence` to **true**, exempting everything after it:

```text
$ node tmp/rev10/spans2.mjs   (=== A ===)
   exempt?  [ true ]   (true = the guard treats it as shown/fenced and lets it stand)
```

The document is a fenced sample with one blank line in it, followed — in the same paragraph as the
closing fence — by a sentence asserting `P1d has returned REVISE three times` as plain prose. That
claim is a `RETRACTED` entry, refuted by round 7 (six passes: five REVISE and a PASS at pass 6), and
the guard permits it. This is the route round 9 measured for blockquotes, where putting one blockquote
line under a reasserted claim laundered it and two reviewers found it independently — reopened for
fences one round later.

**(c) The mirror-image false accusation.** A **correctly** fenced sample that carries a retracted claim
and contains a blank line is reported as an unquoted assertion:

```text
$ node tmp/rev10/spans2.mjs   (=== C ===)
   exempt?  [ false ]   (false = the guard reports a correctly fenced sample as an assertion)
```

That reddens a required CI leg on content which obeys the rule — the failure mode round 9 named for
the two-pairing quote scheme, in the fence path.

The odd-parity guard shares the fault, because it calls the same `shownSpans`: a stray `"` placed after
a closing fence is excluded from the count and the paragraph reads as balanced — third block of
`tmp/rev10/spans.mjs`, `counted 0`.

**Why.** The `[offset + start - 1, offset + end]` arithmetic itself is sound: at a line first
character `offset + start - 1 < index` holds exactly, and `to <= offset + end` bounds the line. The
defect is upstream of it — `start` and `end` are computed in a coordinate system that does not agree
with `joined`. Fixing the plus-or-minus-one would not help.

**Suggestion.** Stop modelling the mapping and *build* it. Flatten line by line, push each line
flattened text onto an array, record the running offset as you concatenate, and join **that** array
with single spaces to form the paragraph flattened text — so the paragraph flattening and the line
offsets are by construction the same string. Take each line flattened form trimmed, so the separator
is not double-counted, and treat a marker line as length 0 with no separator. Track `inFence` **across
paragraphs**, at the document level, since paragraph splitting cuts fences. Add three tests: the split
fence with prose after the closing marker (must be reported), the split fence with the claim inside it
(must be exempt), and an indented fence.

### B6 — `SH_FAMILY` decides verdicts and `GRAMMAR` does not export it, so the sweep cannot reach it

`Severity: blocking` · `Traces to: defect:correctness` (the file own stated invariant is false as written)

**Issue.** The `GRAMMAR` docstring (lines 693-701) asserts that the sweep reach is exactly that object,
so anything which decides a verdict and is not there is unpinned by construction. `SH_FAMILY`
(line 363) decides verdicts — it gates the entire `-c` cluster path in `interpreterTail` — and it is
**not** in `GRAMMAR`. Its members are therefore unreachable by `deleteMember`, and one of them is
already free:

```text
$ bash tmp/rev10/mutate.sh ... "M3: delete zsh from SH_FAMILY (a live set GRAMMAR does not export)"
--- M3 : running suite ---
 OK |unit| tests/unit/buildCommand.test.ts (23 tests)
 Test Files  1 passed (1)
      Tests  23 passed (23)
revert: before=429b2fef...2609f1 restored=429b2fef...2609f1  BYTE-IDENTICAL
```

**Why.** This is the round 9 finding verbatim — six of eight extensions and two of five separators
deletable with nothing noticing, because `GRAMMAR` exported neither and the sweep reach is exactly
`GRAMMAR` — recurring at a set v12 introduced in the same commit that closed it for
`SCRIPT_EXTENSIONS`, `NAME_SEPARATORS` and `RULES`. The request asked me to break the sweep again;
this is the answer, and it is the fourth wrong instrument it asked me to look for. The sweep reach is
still narrower than its claim, because the claim is about `GRAMMAR` and nothing enforces that a new
grammar set gets into `GRAMMAR`.

**Suggestion.** Add `shFamily: SH_FAMILY` to `GRAMMAR`, to `SETS`, and to the `sets` list in
`grammarMembers()`, with three member cases: `bash -lc 'pnpm build'`, `sh -c 'npm run build'`, and a
zsh cluster case — there is currently **no** zsh `-c` case anywhere, which is why `zsh` is free.
Structurally, the recurrence is the interesting part: consider making `GRAMMAR` the only place these
sets are declared, so that a set which is not exported cannot exist, rather than relying on a reviewer
to notice the next one.

---

# Major

### M1 — Two bare `as` type assertions, against an explicit project rule, where `.find` narrows for free

`Severity: major` · `Traces to: defect:quality-gate` (CLAUDE.md: avoid bare `as` type assertions; prefer type narrowing)

**Issue.** In `packages/qfai/tests/unit/buildCommand.test.ts`:

```text
551:    const list = original[field as (typeof TOOL_LISTS)[number]] ?? [];
572:    const list = original[field as (typeof INTERPRETER_LISTS)[number]];
```

Both are new this round. `eslint` is clean on the file, so nothing mechanical catches them.

**Why.** The narrowing is already being attempted two lines above —
`if (!TOOL_LISTS.some((known) => known === field)) throw ...` — but `.some()` returns `boolean` and
narrows nothing, so the assertion is compensating for the wrong choice of array method.

**Suggestion.** Use `.find`, which returns the union member type:

```text
const known = TOOL_LISTS.find((candidate) => candidate === field);
if (known === undefined) throw new Error("no such tool field: " + field);
const list = original[known] ?? [];
```

Same fail-fast behaviour, no assertion, one fewer line. Identical shape at line 572.

### M2 — The manager path returns on the FIRST bare token, so a multi-script runner loses all but one

`Severity: major` · `Traces to: defect:correctness`

**Issue.** Line 658, `return script(whole, ...)`, fires on the first bare token and abandons the rest.
The three JS script runners were added to `MANAGERS` **this round**, with the comment that their bare
tokens are script names — plural — and every one of their member cases is a single script:

```text
$ node tmp/rev10/probe2.mjs   (### multi-script runners)
  heuristic run-s build
  none      run-s clean build
  none      npm-run-all clean build
  none      npm-run-all lint build
  heuristic run-p build:esm build:cjs
  none      run-s lint test build
```

`run-s clean build` is the example in the npm-run-all README.

**Why.** `script()` returns a `BuildVerdict`, and `strongest` already exists for exactly this: the
verdict of a manager invocation naming several scripts is the strongest of them.

**Suggestion.** For a manager, collect rather than return — push `script(whole, ...)` into a local
list and `continue`, then fold with `strongest` at the end alongside `guessed`. Pin it with cases in
the shape `["MANAGERS.run-s", "build", "run-s clean hello"]` against `SYNTHETIC`, where the *second*
name is the build.

### M3 — `EXECUTABLE_EXTENSIONS` is applied after the interpreter lookup, so `powershell.exe` is invisible

`Severity: major` · `Traces to: defect:correctness`

**Issue.** `stripExecutableExtension` runs at line 543, *after* the `INTERPRETERS[head]` lookup at
line 531. So an interpreter wearing its Windows extension is not an interpreter:

```text
$ node tmp/rev10/probe5.mjs
  build     bash -c "pnpm build"
  none      bash.exe -c "pnpm build"
  build     pwsh -Command "pnpm build"
  none      pwsh.exe -Command "pnpm build"
  none      powershell.exe -NoProfile -Command "pnpm build"
```

**Why.** `powershell.exe -NoProfile -Command ...` is *the* Windows spelling, and the one a
`windows-latest` job writes. This is the exact defect this round closed for managers: a manager
wearing its Windows extension was read as a script file and returned `none`, one command with two
verdicts decided by which platform wrote the lane. The interpreter family was left out, and the round
own spelling-parity test lists `pnpm`/`pnpm.cmd` and `node`/`node.exe` with no interpreter pair.

**Suggestion.** Compute `stripExecutableExtension` once on the head, before the `node` and
`INTERPRETERS` branches, and use it for all three lookups. Add the `pwsh`/`pwsh.exe` and the
`powershell.exe` pairs to the spellings test.

### M4 — Gradle task paths are not read, and `gradle build` / `gradle :app:build` disagree

`Severity: major` · `Traces to: defect:correctness`

**Issue.** `buildPrefixes` is matched with `whole.startsWith(prefix)` and `builds` with set equality,
both against the raw token, so a project-qualified task path matches neither:

```text
$ node tmp/rev10/probe2.mjs   (### gradle task paths)
  build     gradle build
  heuristic gradle :app:build
  none      ./gradlew :app:assembleRelease
  none      gradle :core:jar
  none      gradle app:assembleRelease
```

**Why.** `:project:task` is the standard form in any multi-project Gradle build, and
`./gradlew :app:assembleRelease` is the canonical Android CI line — the round 9 planted list already
contains `./gradlew assembleRelease`, one colon away. And `gradle build` being `build` while
`gradle :app:build` is `heuristic` is a one-command-two-verdicts break: the split-only match at line
655 catches the second, so the strength depends on the spelling.

**Suggestion.** The tool path already has the right token for this. Take the **last** colon-separated
segment of a bare token before testing `builds`, `buildPrefixes` and the literal `build`.
`RULES.isPathLike` does not fire on colon forms, so nothing else moves. Add
`./gradlew :app:assembleRelease` and `gradle :core:jar` to the planted list.

### M5 — Two live call sites no probe distinguishes, both green under mutation

`Severity: major` · `Traces to: defect:quality-gate` (the file own standard: a rule no probe can distinguish is not grammar)

**Issue.** The sweep neutralises `RULES` *entries*; it cannot reach *call sites*. Two are free, and
both mutations left the whole corpus green:

```text
$ bash tmp/rev10/mutate.sh ... "M1: delete the manager-path isSetting call site (line 645)"
 OK (23 tests)  Tests 23 passed (23)
revert: ... BYTE-IDENTICAL

$ bash tmp/rev10/mutate.sh ... "M2: a TOOL dirs flag no longer moves the manifest lookup"
 OK (23 tests)  Tests 23 passed (23)
revert: ... BYTE-IDENTICAL
```

- **Line 645, `if (RULES.isSetting(token)) continue;`** — the manager-path call site. Line 641 already
  handles the tool path, and the only member case for `RULES.isSetting` (`make build_dir=out clean`) is
  a *tool*. Deleting line 645 changes no corpus verdict. It is not strictly dead: `pnpm build.prod=1`
  moves from `none` to `heuristic` without it, and nothing pins that verdict either way.
- **Line 603, `if (dirs.has(token)) cwd = normalise(value);`** on the tool path. The `ToolGrammar`
  docstring says the dirs/values split is load-bearing only for `MANAGER_DIRS` — but the tool branch
  still assigns `cwd`, and that `cwd` is passed to the nested `command(tokens.slice(i), ...)` at line
  647, so `make -C sub pnpm build` resolves in `sub`. Gating the assignment on `isManager` leaves the
  whole corpus green: a live rule with no probe, which the file itself identifies as the state
  forty-five deleted members were in.

**Suggestion.** Either delete both — line 645 outright, and fold every tool `dirs` into its `values`
and drop the tool-path `cwd` assignment, which the docstring already says is inert — or pin them, with
a `SYNTHETIC` case for `make -C sub hello` reaching `tsup` and a manager case that turns on
`isSetting`. Deleting is smaller and matches what v10 through v12 did with the other eight sets. More
generally, scope the claim at lines 693-701 to what the sweep measures: it reaches `GRAMMAR` members,
not call sites, and the docstring reads as though it reaches everything that decides a verdict.

### M6 — `mvnw` is undeclared while `gradlew` is declared

`Severity: major` · `Traces to: defect:correctness`

**Issue.** `mvnw package` is `none`; `./mvnw -B package` is `none`; `gradlew build` is `build`.

**Why.** The Maven wrapper is to `mvn` exactly what `gradlew` is to `gradle`, and `./mvnw -B package`
is the dominant Maven CI line in any repository that vendors the wrapper — which is the layout Maven
itself recommends. `gradle` and `gradlew` were given a shared object *this round*, on the reasoning
that a flag added to gradle cannot then be forgotten for the wrapper. The same reasoning was not
carried to `mvn`.

**Suggestion.** `const MAVEN: ToolGrammar = { ... }` shared by `mvn` and `mvnw`, mirroring `GRADLE`.
One member case (`TOOLS.mvnw`, `mvnw package`) is enough, given the identity canonicalisation.

### M7 — A wrapper flag value that names a bundler is a false positive

`Severity: major` · `Traces to: defect:correctness`

**Issue.** The request asked what `stripPrefix` does when a wrapper flag *value* names a command.
`env -u make pnpm build` survives, because the nested-command recursion rescues it. The bundler case
does not, because `BUNDLERS.has(verb)` returns `build` before any recursion:

```text
$ node tmp/rev10/probe3.mjs
  build     env -u swc pnpm test
  build     env -u vite pnpm test
  build     sudo -u parcel pnpm test
  build     env -u esbuild pnpm test
```

And the false-negative direction, where the tail starts at the flag value and the real command is read
as the tool argument:

```text
$ node tmp/rev10/probe2.mjs   (### wrapper flag VALUE names a command)
  none      env -u make pnpm test
  none      sudo -u make pnpm test
  none      taskset -c make pnpm test
  none      nice -n make pnpm test
```

**Why.** A wrapper command beginning at the first token that names a command is a good rule, and it is
what finally saw through `xvfb-run -a -s "-screen 0 1024x768x24"`. I would not replace it. But it is
*not* incapable of being wrong in the way the docstring claims — it needs no per-flag knowledge, so it
cannot be incomplete the way a list can. It is complete and sometimes **wrong**, which is a different
failure mode needing a different repair. `sudo -u <user>` and `env -u <VAR>` are the two forms where a
one-word value routinely collides with a command name, and `env -u swc pnpm test` reporting `build` is
a false positive on the guarded side of the predicate.

**Suggestion.** Keep the rule and add one bound: a token immediately preceded by a token starting with
`-` is a flag argument, so skip it as a *candidate* while still scanning past it. Three lines, no
per-wrapper list, and all eight lines above become right. Then record the residual honestly in the
docstring — the rule is complete, not infallible.

### M8 — `&` is not treated as a command separator

`Severity: major` · `Traces to: defect:correctness`

**Issue.** `shell()` splits on `&&`, `||`, `;` and a single `|`, but not on a single `&`:

```text
$ node tmp/rev10/probe2.mjs   (### background separator)
  build     make -j4
  none      make -j4 &
  none      pnpm test & pnpm build
  heuristic pnpm build & wait
```

**Why.** `&` is a command terminator in POSIX shell, and `cmd1 & cmd2 & wait` is the ordinary way to
parallelise two steps in a `run: |` block. `make -j4 &` losing its verdict is worse than a miss: the
trailing `&` becomes a bare token, sets `sawBare`, and therefore *suppresses* `bareIsBuild`.

**Suggestion.** Add `&` to the split with the same negative lookaround the `|` case uses:
`/&&|\|\||;|(?<!&)&(?!&)|(?<!\|)\|(?!\|)/`. Order already puts `&&` first. Add
`pnpm test & pnpm build` to the compound-line test.

### M9 — The `make` builds list holds only `all`, so ordinary make build targets are `none`

`Severity: major` · `Traces to: defect:correctness`

**Issue.**

```text
$ node tmp/rev10/probe2.mjs   (### make real targets)
  build     make all
  none      make dist
  none      make release
  none      make image
  none      make install
  none      make bin/app
  none      make DESTDIR=/tmp install
```

**Why.** This is item 4 of the request — each deletion rests on no command distinguishing the member,
which is an argument from absence. `make dist`, `make release` and `make image` are the three targets
a GNU Makefile most often uses for the artifact-producing rule after `all`; they are usually what `all`
is aliased *to*. `make bin/app` and `make DESTDIR=... install` are more arguable and I would leave them
out: `make ./build/report.txt` is pinned as *not* a build, and a file target is a defensible line to
draw.

**Suggestion.** `MAKE.builds: ["all", "dist", "release", "image"]`, one member case each, and state in
the docstring that this list is a *convention* list rather than a closed grammar — unlike a flag list
it cannot be complete, and saying so is the honest version of the claim. I would leave `make install`
as `none` and record why (it installs an already-built tree), because that is a judgement rather than
an omission.

---

# Minor

### m1 — `deleteMember` de-aliases: a tool sub-member deletion replaces one alias only

`Severity: minor` · `Traces to: defect:quality-gate`

`deleteMember("TOOLS.make.dirs.-C")` does `GRAMMAR.tools["make"] = { ...original, dirs: filtered }`,
which leaves `GRAMMAR.tools["gmake"]` pointing at the *original* object:

```text
$ node tmp/rev10/alias.mjs
make === gmake (identity): true
after deleting make.dirs.-C: gmake still has -C? true
  -> the sweep tests a DE-ALIASED grammar for every tool sub-member
```

So during the sweep the grammar under test is not the grammar that ships: the invariant the sharing
exists for — a flag added to gradle cannot be forgotten for gradlew — is suspended exactly while the
sweep measures. No current case exploits it, because every make, gradle, docker and python sub-member
case uses the owning spelling, but that is a convention nothing enforces; a case written against the
alias spelling would silently stop pinning its member. **Suggestion:** replace the object for every key
sharing the identity and restore all of them, which makes the restore snapshot a map rather than a
single value.

### m2 — A `TOOLS.<name>` delete-and-restore moves the canonical owner of the shared object

`Severity: minor` · `Traces to: defect:quality-gate`

`Reflect.deleteProperty` followed by reassignment re-inserts the key at the **end** of the key order,
so the identity canonicalisation first-name-owns rule flips:

```text
$ node tmp/rev10/alias.mjs
key order after a delete+restore of `make`:
  before: ... rush, make, gmake, cmake, ninja ... last: rake
  after : ... rush, gmake, cmake, ninja, bazel ... last: make
  owner of the MAKE object by first-entry order is now: gmake (was `make`)
```

Latent, not live: `grammarMembers()` is evaluated **once** at line 1008, the sweep processes every tool
key in that order, and the order is restored by the end —

```text
$ node tmp/rev10/alias2.mjs
full pass in original order restores key order: true
window: TOOLS.make is deleted+restored at step 4; TOOLS.gmake at step 5;
  between them the sweep processes make's 12 sub-members with `gmake` as canonical owner.
```

— so the length assertion at line 1034 holds. It becomes live the moment anything recomputes
`grammarMembers()` mid-sweep, or the sweep iterates in any other order. **Suggestion:** canonicalise on
a stable key (the alphabetically first name owning the object) rather than on insertion order, and
compare the *set of labels* at line 1034 rather than only the count — one line, and it catches this
whole class.

### m3 — The `ARRAYS` docstring says two lists over three entries

`Severity: minor` · `Traces to: defect:quality-gate`

`packages/qfai/tests/unit/buildCommand.test.ts:511-516` is documented as *the two lists that build a
regex and a split*, and holds three entries. `EXECUTABLE_EXTENSIONS` builds neither: it is read by
`stripExecutableExtension`. The stated reason for splicing in place — a regex is built from this array
on every call — is true of two of the three. **Suggestion:** say three, and say which one is read by
`stripExecutableExtension` rather than by a regex builder.

### m4 — `deleteMember` silently no-ops on a two-part path, and `LIFECYCLE` keys are not members

`Severity: minor` · `Traces to: defect:quality-gate` (fail-fast)

`deleteMember("LIFECYCLE.pack")` computes an empty `dropped`, filters nothing, and returns a restore —
no mutation and no error. Same for `deleteMember("MANAGERS")` (`set.delete("")`) and
`deleteMember("SCRIPT_EXTENSIONS")` (`indexOf("")` is -1). The sweep would report such a member as
`undetected` rather than as a fault in the harness. It is unreachable today only because
`grammarMembers()` pushes `TOOLS.<name>` and `INTERPRETERS.<name>` keys but **not**
`LIFECYCLE.<hook>` keys — an asymmetry with no stated reason, since deleting the `pack` hook is a
meaningful mutation that happens to be equivalent to deleting its one member. **Suggestion:** throw on
an empty `dropped`, the way the other branches throw on an unknown field, and either add the hook keys
as members with cases or record why they are excluded.

### m5 — The inline `flag=value` branch never consults `buildFlags`

`Severity: minor` · `Traces to: defect:correctness`

Lines 578-586 test `dirs` and `TARGET_FLAGS` and then `continue`, so a build flag written inline falls
through: `cmake --build=.` is `none` while `cmake --build .` is `build`. I could not find a real
command that exercises it — cmake requires the spaced form, and `tsc --outDir=dist` gets the right
answer through `bareIsBuild` rather than through the flag — so this is a reachability gap rather than a
demonstrated miss, recorded because the branch ordering everywhere else is exhaustive.
**Suggestion:** one line, `if (buildFlags.has(flag)) return "build";` inside the inline branch, or a
comment recording that no declared tool accepts a build flag inline.

### m6 — `flattenings` strips backtick fences but not tilde fences

`Severity: minor` · `Traces to: defect:correctness`

`flattenings` does `text.replace(/[*_`]/g, "")`, so a triple-backtick marker line flattens to length 0
while a triple-tilde marker line keeps its three characters — and `shownSpans` treats them identically
via `/^\s*(?:```|~~~)/`. The drift in `B5(a)` therefore differs by fence syntax, so the repair for `B5`
will behave differently on the two spellings unless it is written against the *flattened* text rather
than the raw line. **Suggestion:** derive the marker flattened length from `flattenings(line)` rather
than assuming it, and add a tilde-fence case.

### m7 — `parseArguments` accepts a repeated `--spec` silently

`Severity: minor` · `Traces to: defect:quality-gate`

`scripts/check-atdd-annotation-ledger.mjs:218-246`. The stated contract is that every argument is
accounted for and anything unrecognised is a usage error; `--spec 0017 --spec 0018` is accounted for by
last-wins with no message — the same *a scoped invocation could quietly widen* shape the function
exists to close, one turn further in. The extraction itself is right: it is the clearest boundary in
the old 83-line `main`, the `{ spec } | { error }` return keeps I/O out of it, `index += 1` plus the
loop update correctly skips the value, and it is covered by the 22 CLI tests in
`packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts`, including `["--spec"]`,
`["--spec", "17"]`, `["--spec", "abcd"]`, `["--spec="]` and `["--spec", "0017", "extra"]`.
**Suggestion:** `if (sawSpecFlag) return { error: ... repeated --spec ... }` before the second
assignment.

### m8 — The variant-1 exempt set is never used by the odd-parity guard

`Severity: minor` · `Traces to: defect:quality-gate`

`occurrences()` computes exempt spans for both flattenings (`for (const variant of [0, 1] as const)`),
but the odd-parity test at line 498 hardcodes `shownSpans(paragraph, 0)`. A zero-width character placed
inside a fence or blockquote marker therefore changes which spans exist in one guard and not the other.
Small, but the two guards are meant to agree on what *shown* means, and the zero-width axis is the one
rounds 7 and 8 both laundered through. **Suggestion:** count marks per variant and report a paragraph
odd in *either*, or state why variant 0 suffices here.

### m9 — A scoped package name collapses to its last path segment

`Severity: minor` · `Traces to: defect:correctness`

`whole.split("/").pop()` at line 624 turns `@swc/cli` into `cli` and `@scope/tsup` into `tsup`. The
first is a miss — `npx --yes @swc/cli src -d dist` is `none`, and it is a real build. The second is a
right answer for the wrong reason: any `@anything/tsup` reads as the bundler. The basename rule is
correct for `./node_modules/.bin/tsup` and wrong for a scoped name, and nothing distinguishes them.
**Suggestion:** do not take the basename of a token starting with `@`; match the scoped name whole, and
add `@swc/cli` to `BUNDLERS` alongside `swc` if that form is in scope.

### m10 — `namesACommand` tests the regex on the raw token but the sets on the unquoted basename

`Severity: minor` · `Traces to: defect:quality-gate`

Lines 452-460: `bare` is `unquote(token).split("/").pop()` for the four set lookups, but
`scriptFileRe().test(token)` uses the **raw** token. So `sudo "scripts/build.sh"` is not recognised as
wrapping a script, while `sudo "pnpm" build` *is* recognised as wrapping a manager and then mishandled
downstream (`B4`). Two coordinate systems in one five-line function. **Suggestion:** compute
`unquote(token)` once and test both against it; the basename is needed only for the set lookups.

### m11 — Eighteen of the forty-four planted misses are undeclared build front-ends

`Severity: minor` · `Traces to: defect:correctness` (advisory: scope, not a rule error)

Of 170 planted forms, 44 came back `none`. `B1` through `B4`, `M2`, `M3`, `M4`, `M6`, `M8` and `M9`
account for 26 of them. The remaining 18 are tools the grammar does not declare at all:
`bundle exec` (the Ruby equivalent of `pnpm exec`), `corepack`, `deno compile` and `deno task`,
`pip wheel`, `uv build`, `hatch build`, `flit build`, `tox -e build`, `mix compile` and `mix release`,
`cabal build`, `lein uberjar`, `ant dist`, `buildah bud`, `pants package`, `buck2 build`, `nix build`,
`pack build`. I am **not** raising these as blocking: the grammar declares what it declares, and the
shipped tree it guards is Node-only. But two deserve a decision rather than an omission —
`bundle exec <tool>` is a wrapper in exactly the sense `WRAPPERS` means, and `corepack <manager>` is a
shim in front of managers already declared, so both are one-line additions that widen the reach of
everything already there. **Suggestion:** add `bundle` and `corepack` to `WRAPPERS` with member cases,
and record the remaining sixteen in the *what no command-line scan can see* docstring as a **declared**
scope boundary. That docstring currently names only the spawn-inside-a-helper class, so a reader takes
the tool list for complete.

---

# Negative results, recorded because the request asked for them

- **The flag-branch ordering is fully reachable and no branch is dead.** Mechanically audited across
  all 33 tool entries for overlaps between `TARGET_FLAGS`, `optional`, `dirs`/`values` and
  `buildFlags`:

  ```text
  $ node tmp/rev10/probe5.mjs
  no overlaps: TARGET_FLAGS -> optional -> dirs/values -> buildFlags is fully reachable for every tool
  ```

  `MAKE.optional` shares nothing with `MAKE.values`, and `--target` and `-m` are in no tool list any
  more, so the two shadowing removals the docstrings claim (`tsc --target`, and the cargo and flutter
  entries) are real. The one gap is `m5`, inside the inline branch.
- **The `deleteMember` restores are exact, including on a thrown error.** Every branch validates before
  it mutates (`no such tool`, `no such interpreter`, `no such tool field`, `no such interpreter field`,
  `no such rule`, `no such lifecycle hook`, `no such grammar set`), so a bad path cannot leave the
  grammar dirty; `try`/`finally` restores on a throw from `classifyBuildCommand`; sets restore by
  clear-and-re-add in order; arrays by `length = 0` plus `push`; tools, interpreters, lifecycle and
  rules by reassigning the captured value, which preserves **object identity**. Verified empirically:
  `every object identity restored: true`, and key order restored after a full pass. The two problems I
  found here (`m1`, `m2`) are about *which* object the mutation reaches, not about exactness.
- **The identity canonicalisation does not currently hide a member.** All five shared objects (`MAKE`,
  `GRADLE`, `DOCKER`, `PYTHON`, `POWERSHELL`) are genuine aliases; `docker-compose` is a separate
  object and gets its own sub-members; every key is a member under every name. The hazard is `m1` and
  `m2`, not a hidden member.
- **The `shownSpans` containment arithmetic is right.** `[offset + start - 1, offset + end]` against
  `spanStart < index && to <= spanEnd` is exactly correct at a line first character, and correctly
  excludes an occurrence straddling the line end. `B5` is about the coordinate system the offsets are
  computed in, not about the plus-or-minus-one.
- **`stripPrefix` terminates.** Every iteration slices at least one token or breaks, and the
  `guard <= input.length` bound is sound. The `env -u make pnpm build` case the request named survives,
  because the nested-command recursion at line 647 rescues it; `M7` is where that stops being true.
- **`parseArguments` did not lose coverage in the extraction.** 22 tests drive it through the CLI,
  including all four malformed forms, the inline form, output equality between the two forms, and an
  unknown trailing argument.
- **The distributed surface is clean.** `check-no-internal-version-leakage.sh` exits 0, and
  `git diff --stat 05a97202~1 HEAD -- packages/qfai/assets` is empty: nothing this round touched
  `packages/qfai/assets/**`.
- **`eslint` is clean on all six changed files**, which is why `M1` needs a human rule rather than a
  lane.
- **The record derived numbers hold where a guard derives them.** 10 packs on disk against 10
  `Review pack:` lines; every recorded seal recomputes; every stated test count equals `countCases`;
  the annotated-describe count and the ledger guard backed-claims figure both match a live run. I did
  not re-derive the prose counts listed under item 5 of the request — nine rounds, 26 responses, 25
  REVISE, the 26 findings slots, the P7 columns, the ten corpora — because they are the
  `completion-reviewer` subject this round and I would only be duplicating it; the guards that
  mechanise the derivable ones are green.

# Verdict

**REVISE.**

The instrument is better than v11 by a wide margin, and two of this round structural moves are right.
Replacing the wrapper `values` and `args` lists with *the tail is found, not counted* is a real
reduction in what can be incomplete, and asserting the *strong* attribution property in the sweep is
the correct reading of what the label table claims.

But the sentence the request asked me to attack is still true, and true for the same reason: **the
knowledge lives in the corpus, and the corpus is the one this stage chose.** Every one of `B1` through
`B4` is a *declared* family reached by a spelling nobody wrote down — a bare `--` after a manager verb,
a shell cluster containing `-o`, a `-v` after a wrapper, a quoted command name — and each was argued
closed by a measurement over commands this stage enumerated. The `B1` comment says listing `--` changed
no verdict. The `B3` set is scoped by its own docstring to `command` and applied to nineteen wrappers.
The `B4` member case pins `concurrently` with a form `concurrently` cannot use for its actual purpose,
which is the round 9 `mvn build` finding in a new family. Six real builds now stand in the shipped lane
with the guard green, measured in a shadow tree.

`B6` is the sharper one. The invariant *the sweep reach is exactly this object, so anything that decides
a verdict and is not here is unpinned by construction* was written in the same commit that closed the
round 9 instance of it — and a new set, `SH_FAMILY`, was added to the file without going into
`GRAMMAR`. Nothing structurally prevents the next one. Until the exported object is the only place
these sets can be declared, this finding recurs every round a set is added; `M5` is the same reach
problem one level down, at the call sites.

`B5` is independent of all of that and is the one I would fix first, because it is a one-line
laundering route in the guard whose entire premise is that prose cannot be trusted to say whether prose
was deleted — and 50 of the corpus 456 paragraphs already sit in the coordinate system that makes it
possible.

## Residual risks

1. **The undeclared-tool boundary is not stated.** The docstring names one unseeable class — a build
   inside a helper — and lets the tool list read as complete. Sixteen of my misses are outside the Node
   ecosystem the shipped tree targets, which is defensible, but only if it is written down. See `m11`.
2. **`VERSION` is still a hand-typed literal.** The pin now compares a number to a number, which closes
   the round 7 and round 9 defects, but a v13 that forgets to bump the constant leaves both sides
   agreeing on 12. That is inherent to a single source of truth and I would not change it; it is a
   residual, not a finding.
3. **The sweep runs against a de-aliased grammar** (`m1`). Not exploited today; a case written against
   an alias spelling would be inert and nothing would say so.
4. **The `tests/assets` directory runs in the `e2e` project, a required CI leg.** The `B5`
   false-accusation direction can redden it on content that obeys the rule, which is the failure mode
   that has already cost this stage three rounds.

## Reviewer-originated obligations

None. Every finding above is demonstrable from the artifacts under review as a correctness defect, or
as a violation of a repository rule the project has already written down — the CLAUDE.md assertion rule
for `M1`, and the classifier own stated invariants for `B6` and `M5`. No Change Request is proposed.

---

`git rev-parse --short HEAD` at finish: **`a66be5c6`**. `git status --porcelain` at finish: empty apart
from this file. `git stash list`: empty. Both source mutations were reverted byte-identically in the
same step; every other experiment ran against in-memory copies or a shadow tree under `tmp/rev10/`,
which is gitignored.
