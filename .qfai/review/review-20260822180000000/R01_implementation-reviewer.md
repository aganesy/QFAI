# R01 — implementation-reviewer, round 19, spec-0017 (ATDD stage)

**Verdict: pending (see the verdict section at the end of this file).**

## Provenance of this review

- Subject pinned to **`7fbac2d3`**. Every artifact quoted below was read with
  `git show 7fbac2d3:<path>`, not from the working tree.
- `git rev-parse --short HEAD` at start: **`1ecbeb07`**. (Recorded again at the end.)
- `git diff --stat 7fbac2d3 1ecbeb07 -- packages/qfai/` is empty, and so is
  `git diff --stat 7fbac2d3 19b751ca -- packages/qfai/`. The code under review is byte-identical
  at all three revisions, so running the working tree measures the subject. I read `7fbac2d3`
  anyway, and executed from a copy of `7fbac2d3`'s bytes at `tmp/r19/helper.ts`
  (`git show 7fbac2d3:packages/qfai/tests/helpers/shippedLaneCommands.ts`).
- Method: an execution oracle, as in rounds 15-18. A fake `tsup`/`npx`/`pnpm`/... on `PATH`
  appends to `$MARKER`; each candidate body is written to a file and run with
  `bash --noprofile --norc case.sh` in a fresh temp dir, stdin `/dev/null`, 8s timeout. A case
  "ran" iff the marker mentions `tsup`. Every case was composed from char codes or extracted from
  the subject's own bytes, never typed into a shell heredoc — the heredoc-drops-a-backslash hazard
  bit me once in setup (`cat -A` caught it) before any case was generated.
- The `live` and `inert` lists in the differential test were not transcribed: they are extracted
  from `7fbac2d3`'s own test source by brace-matching the array literal and evaluating it, so what
  I ran through bash is exactly what the test runs through `maskOf`.

I modified nothing under `packages/qfai/`. Two plants are described below; each was made on a
**copy** under `tmp/r19/`, never on the tracked file, so there was nothing to restore.

## What passed

#### Gate: the `inert` half of the differential test is true of bash

Brief section: "The `inert` list asserts the MASK agrees with bash. If bash disagrees with the mask
anywhere, the mask is what is wrong."

All five `inert` shapes were executed. None ran the build; `maskOf(body)[at]` is `false` for all
five. bash and the mask agree, so this half of the test is not measuring the wrong instrument.

#### Gate: the `live` half runs in bash, is masked as code, and is refused

All 21 `live` shapes were executed. Nineteen ran the build under bash; all nineteen have
`maskOf(body)[at] === true` and all nineteen are refused by `refusals()`. The two that did not run
are `if [ -f package.json ]; then %s; fi` (no `package.json` in the sandbox) and
`build_once() { %s; }` (a definition nobody calls) — both are code positions in bash by
construction, so the mask is right about them and the non-run is the harness, not a divergence.

## Findings

### B1 — `codeMask` walks *through* a here-document's data, so one quote character in that data disarms `refusals()` for the rest of the body (eleventh spelling, executed)

**Issue.** `codeMask` marks a here-document's data region as non-code and then keeps scanning it
character by character. The data therefore still drives the quote state machine. One `"` or `'` in
here-document data — *including a quoted (`<<'EOF'`) here-document, where bash guarantees the data is
literal* — inverts `codeMask`'s quote parity for everything after the here-document. `commandsOf` does
not have this bug: it defers the skip and jumps `i = heredocEnd` at the newline. So the two walks
disagree again, in the function the stage shared this round to stop them disagreeing.

Subject, `git show 7fbac2d3:packages/qfai/tests/helpers/shippedLaneCommands.ts`:

```ts
// codeMask, lines 444-452 — marks the data, then falls back into the ordinary walk
if (quote === "") {
  const here = hereDocAt(body, i);
  if (here !== undefined) {
    for (let j = i; j < here.afterDelimiter; j += 1) mask[j] = false;
    for (let j = here.dataStart; j < here.dataEnd && j < body.length; j += 1) mask[j] = false;
    // The rest of the operator's LINE is still code; only the data is not.
    i = here.afterDelimiter - 1;
    continue;
  }
}
```

versus `commandsOf`, lines 384-387, which does skip:

```ts
if (ch === "\n" && heredocEnd !== undefined) {
  i = heredocEnd;
  heredocEnd = undefined;
}
```

**Demonstration — a build that runs under bash with `refusals()` returning `[]`.** Executed with the
fake-bundler oracle described above; the marker file is the proof the build ran.

| body | bash | `refusals()` | `maskOf(body)[at]` |
| --- | --- | --- | --- |
| `read v <<E\n"\nE\necho a \| npx tsup ")"` | **ran** (`MARKER: npx tsup )`) | `[]` | `false` |
| `read v <<E\n"\nE\necho a \| npx tsup "x)y"` | **ran** (`MARKER: npx tsup x)y`) | `[]` | `false` |
| `read v <<'E'\n"\nE\necho a \| npx tsup "x)y"` | **ran** | `[]` | `false` |
| `read v <<'E'\n'\nE\necho a \| npx tsup 'x)y'` | **ran** | `[]` | `false` |
| `read v <<E\nd\nE\necho a \| npx tsup "x)y"` (control) | ran | `["npx tsup"]` | `true` |

The control differs from the escape by one character in the here-document's *data*.

**Why it escapes, end to end.** The stray `"` in the data leaves `codeMask` inside a quote. Every
character of the following line is masked non-code until the line's own first `"`, which `codeMask`
reads as the *closing* quote — so `x)y` lands on code positions and the second `"` re-opens. In
`commandsOf`, `isAlternation()` skips masked positions, so its forward scan from the `|` never sees the
masked `;`/newline it would stop at, reaches the `)` in `x)y`, and concludes the `|` is a `case`
alternation rather than a pipe. The line is not split, the whole thing reads as one command headed by
`echo`, `echo` is in `HARMLESS_PROGRAMS`, and the build is gone from the scan. The same mechanism
hides `npm install left-pad` (verified separately, marker `npm install left-pad x)y`), so it is not
specific to build spellings.

**Why nothing catches it.** I re-ran every assertion in
`git show 7fbac2d3:packages/qfai/tests/unit/shippedLaneCommands.test.ts` against the unmodified helper
using arrays extracted from the test's own bytes (`PLANTED`, `WRAPS`, `ROOT_CAUSES`, `MECHANISMS`,
`SHIPPED`, the install pair, and the differential `live`/`inert`): all pass. This body is refused by
none of them. It is a live fail-open in the instrument whose stated purpose is to fail closed.

**Not currently active on the shipped tree.** The only `<<` in
`packages/qfai/assets/init/root/.github/workflows/**` at `7fbac2d3` is `done <<< "$changed"`
(`qfai-tests.yml:116`), a here-*string*, which `hereDocAt` correctly declines. So no shipped body is
disarmed today — but a here-document writing JSON or YAML into `$GITHUB_OUTPUT` is the commonest
reason a lane grows one, and every such body will contain a quote.

**Suggestion.** In `codeMask`, mirror `commandsOf`: after marking `[dataStart, dataEnd)`, advance the
cursor past `dataEnd` instead of walking it, and re-enter *only* substitutions, and only when
`!here.quoted` (see M1, which is the other half of the same omission). A single skip fixes both
directions; the `live[20]` shape `read v <<EOF\n$(%s)\nEOF` pins the substitution re-entry, so the
differential test already constrains the fix — it just does not constrain the bug.

**Severity:** Blocking
**Traces to:** `defect:correctness` — evidence above: the escape bodies, their markers, and the
one-character control, all executed against `7fbac2d3`'s bytes.

### M1 — `hereDocAt` is shared, but only one of its two callers reads `quoted`: `codeMask` calls a quoted here-document's data code

**Issue.** The brief asks whether the newly shared `hereDocAt` is right for both callers. The *reader*
is shared; the *use* is not. `HereDoc.quoted` (subject line 88, set at lines 120 and 126) is read in
exactly one place — `commandsOf` line 224, `if (!here.quoted)`. `codeMask` never reads it
(`grep -n "here.quoted"` over `7fbac2d3`'s bytes returns one hit). So `codeMask` gives the same verdict
to data bash expands and data bash guarantees literal.

**Demonstration.** Executed; `maskOf(body)[at]` is the mask's verdict on `npx tsup`:

| body | bash | mask says |
| --- | --- | --- |
| `read v <<EOF\n$(npx tsup)\nEOF` | **ran** | code (correct — this is `live[20]`) |
| `read v <<'EOF'\n$(npx tsup)\nEOF` | did not run | **code** (wrong) |
| `read v <<\EOF\n$(npx tsup)\nEOF` | did not run | **code** (wrong) |
| ``read v <<'EOF'\n`npx tsup`\nEOF`` | did not run | **code** (wrong) |

All three wrong rows are `inert but code` under the differential test's own predicate. Adding any of
them to `inert` fails the test today; I confirmed that against `7fbac2d3`'s bytes.

**Second-order.** `live[20]`'s correct answer is produced by the *bug* in B1, not by a rule: the
here-document branch masks the data non-code, then the walk falls back into the data and the `$( … )`
branch at line 454 re-marks the substitution's interior as code. Fix B1 with a plain skip and
`live[20]` starts failing. The right shape is one skip that re-enters substitutions only when
`!here.quoted` — which makes B1 and M1 one repair with one condition, and makes `quoted` mean the same
thing in both walks.

**Suggestion.** Read `here.quoted` in `codeMask`. Add the three rows above to `inert` so the asymmetry
cannot come back silently.

**Severity:** Major
**Traces to:** `defect:correctness` — the three executed rows above, against `7fbac2d3`.

### M2 — the `live` list has no decoration for round 18's fourth root cause, and reverting that fix passes the entire test file

**Issue.** The `live` list is documented as "one per construct this file has been wrong about"
(subject test, the comment above `const live`). Round 18's five root causes are enumerated in the
brief; four of them have a `live` entry and the fourth — *the here-document delimiter scan breaking on
`<`, `>` and `(`* (`hereDocAt` line 132) — has none. No entry in `live`, `inert`, `ROOT_CAUSES` or
`MECHANISMS` combines a here-document with anything else on the operator's own line.

**Demonstration by mutation.** I reverted that one fix on a *copy* of the helper
(`/[\s;&|)<>(]/` -> `/[\s;&|)]/`, one character class, nothing else) and re-ran every assertion in the
test file against the mutant, using arrays extracted from the test's own bytes. **The whole file
passes.** The reverted behaviour is a real divergence: for
`read v <<EOF>/dev/null\ndata\nEOF\nnpx tsup`, bash runs the build, and the mutant's mask says the
build is not code — the exact `live but masked` signature the differential test exists to catch. The
body survives only because an unrelated rule (`unterminated-here-document`) happens to fire, so
`refusals()` is non-empty by accident rather than because anything saw the build.

For calibration, the same mutation harness kills six of nine mutants, and two of those six are killed
**only** by the differential test (`codeMask`'s comment guard, and `codeMask`'s here-document model
removed entirely). The instrument is sound and it earns its place; this is a gap in its corpus, not in
its design.

**Suggestion.** Add `"read v <<EOF>/dev/null\ndata\nEOF\n%s"` to `live`. Verified: it passes on
`7fbac2d3` unmodified and fails on the mutant.

**Severity:** Major
**Traces to:** `defect:code-quality` — a fix landed in `19c33aa1`/`636a4e69` with no assertion that
can observe it; demonstrated by the surviving mutant above.

### M3 — the `inert` list is an unverified oracle, and it is the half that can lock an escape in

**Issue.** For `live` entries the test asserts two things (`mask` says code, `refusals()` refuses), and
a misclassification there costs at most a spurious refusal. For `inert` entries it asserts exactly one
thing — that the mask says *not* code — and nothing in the repository checks the premise that bash
does not run them. The classification is a human claim about bash, made in a TypeScript array.

**Why it matters concretely.** A wrong `inert` entry passes precisely when the mask is *also* wrong,
which is the only case anyone cares about. B1's escape body is the example: had
`"read v <<'E'\n\"\nE\necho a | %s"` been filed under `inert` — a plausible reading, since the quote
is "inside a here-document" — the test would go green while asserting that a position bash executes is
not code, and the round's headline instrument would be certifying the escape.

I executed all five current `inert` entries and all twenty-one `live` entries under bash; today the
classification is correct in both directions (recorded under "What passed"). The finding is that
nothing keeps it correct.

**Suggestion.** Cheapest durable form: state the obligation in the block comment — every `inert` entry
must have been confirmed non-executing by running it — and record the confirming marker output in the
evidence file, as the reviewers who found rounds 15-18's escapes already do by hand. A stronger form
(a bash-backed generator) is not portable to this repository's Windows CI and I am not asking for it.

**Severity:** Major
**Traces to:** `defect:code-quality` — the assertion asymmetry is visible in the loop at the subject
test's `for (const shape of inert)`, which checks the mask and nothing else.

### m1 — reverting `<<\EOF`'s quoted-ness also passes the entire test file

**Issue.** Same mutation harness: dropping `quoted = true` from the backslash branch of `hereDocAt`
(subject line 126) leaves every assertion in the file green. The behaviour does change — with the
mutation, `read v <<\EOF\n$(npx tsup)\nEOF` gains a refusal it should not have.

It is a fail-*closed* regression, which is why it ranks below M1 and M2. But `<<\EOF` is documented in
the subject as "bash's THIRD spelling of a quoted delimiter", and nothing asserts the claim.

**Suggestion.** The `inert` row M1 already proposes (`read v <<\EOF\n$(%s)\nEOF`) kills this mutant
too, once `codeMask` reads `quoted`. One row closes both.

**Severity:** minor
**Traces to:** `defect:code-quality` — surviving mutant, demonstrated above.

### m2 — both walks perform process substitution inside double quotes, where bash performs none

**Issue.** `commandsOf` line 245 and `codeMask` line 454 both guard the `<(` / `>(` branch with
`quote !== "'"`, so both enter a process substitution found inside a *double*-quoted string. bash does
not: `"<(cmd)"` is a literal eight-plus characters.

Executed against `7fbac2d3`:

| body | bash | `maskOf(...)[at]` | `refusals()` |
| --- | --- | --- | --- |
| `echo "<(npx tsup)"` | did not run | **code** (wrong) | `["npx tsup"]` |
| `echo ">(npx tsup)"` | did not run | **code** (wrong) | `["npx tsup"]` |
| `echo '<(npx tsup)'` (control) | did not run | not code (correct) | `[]` |
| `cat <(npx tsup)` (control) | ran | code (correct) | refused |

This is the fail-*closed* direction, which is why it is `m` and not `M`. It is listed because it is a
direct answer to the brief's question about what is missing from `inert`: `"echo \"<(%s)\""` belongs
there and fails today.

It also has a fail-open cousin that stays refused only by luck: `echo "<((x)" | npx tsup` runs the
build in bash while `maskOf` says the build is not code, because `matchingParen` cannot find a close,
returns `body.length`, and `codeMask` then re-masks the whole remainder of the body from a fresh parse
starting inside the string. `refusals()` still refuses it, as the unreadable `"(x) | npx tsup"`.

**Suggestion.** Guard the `<(` / `>(` branch with `quote === ""` in both walks, and add
`"echo \"<(%s)\""` to `inert`.

**Severity:** minor
**Traces to:** `defect:correctness` — executed rows above.

### m3 — the differential test samples one character of the build token, and only its first occurrence

**Issue.** Two mechanical points in the loop:

```ts
const at = body.indexOf(BUILD);
if (maskOf(body)[at] !== true) { … }
```

`maskOf(body)[at]` is the mask's verdict on the `n` of `npx`. A divergence that starts one character
later — and `codeMask` changes state mid-token in several of the branches this file has been wrong
about — is invisible to the test. And `indexOf` takes the *first* occurrence, so a future decoration
that mentions the build twice (a natural way to write "here it is dead, here it is live") is measured
at the wrong one, silently and with no assertion that there is only one.

**Suggestion.** Assert `body.indexOf(BUILD) === body.lastIndexOf(BUILD)` and require every position in
`[at, at + BUILD.length)` to agree. Both are one line each and neither changes today's verdict — I
checked: all 21 `live` and 5 `inert` shapes still pass under the stricter form.

**Severity:** minor
**Traces to:** `defect:code-quality` — the loop body quoted above, in the subject test.

## Audited evidence hash

```text
Round: 19
Result: REVISE
Reviewed revision: 7fbac2d3 (code); record read at 19b751ca per the brief's amendment
Audited evidence hash: 540510cd93ce5f59e7dac0199c8fae331c258382c11f4e10d8836e566ec287eb
Authored/edited under review: none
```

Subject per `.qfai/assistant/constitution/shared-skill-delegation-baseline.md` "Stage review", and the
same construction round 10's `R01` used: `.qfai/evidence/atdd-spec-0017.md` whole **minus** its
`## Final status` section, plus `.qfai/evidence/coverage-depth-spec-0017.md` whole; each normalized by
step 2; serialized as `path + NUL + sha256(normalized)`, sorted by path, joined with newlines; SHA-256
of that record list. Computed by me, on the bytes I read, with `tmp/r19/hash.mjs`.

Excluded extent, with fence tracking: lines **2582-2878** of 2878 at `7fbac2d3` (2582-2880 of 2880 at
`19b751ca`), heading `## Final status (PASS/FAIL) + who confirmed`, running to EOF — no `#`/`##`
heading follows it outside a fence. Per-artifact digests (identical at both revisions):

- `.qfai/evidence/atdd-spec-0017.md` = `160c44fc477e2f3379ae66e4ccc5ffbf1fd25dc2e669bc974c1fd8841e53dc7e` (197710 normalized bytes)
- `.qfai/evidence/coverage-depth-spec-0017.md` = `7f7d83b13ee63d9142191cd0a3d6e7a67cf3ad5affd2d4891e7d9fb13ef74b5a` (39643 bytes)

I computed the hash at `7fbac2d3`, `19b751ca` and HEAD `1ecbeb07`. **All three are the same value.**

### A1 — the brief's `7fbac2d3`-vs-`19b751ca` split makes no difference to the audit hash, and that is worth knowing

The amendment splits the pinning because three of the record's count guards read the working tree.
Every line the split concerns — `**nineteen** rounds, **50** reviewer responses`, `**Nineteen** packs`,
and the `Review pack: … review-20260822180000000/` seal line, i.e. the whole delta
`git diff 7fbac2d3 19b751ca -- .qfai/evidence/` reports — sits at lines 2621, 2683 and 2762, which are
**inside** the excluded `## Final status` section. So the audited evidence hash cannot move when those
counts move, at either revision.

That is not a defect in the amendment, which is about the *count guards* in the test tree rather than
about the hash. It is worth recording because it says something the record does not: the pack and
response counts, the pack-seal ledger and the stage verdict are the parts of this evidence file that no
audit hash covers, while the ~2580 lines above them are covered twice over. If a future round wants
those counts pinned, the hash is not the instrument that will do it.

**Severity:** advisory
**Traces to:** none — this adds no obligation and asks for no change. Recorded under
`Advisory / Change Request proposals` per `drift-protocol.md#reviewer-originated-obligations`; no
Change Request is proposed, because nothing already approved changes.

## Reachability of B1 in the shipped story

`refusals()` is the *only* gate over shipped `run` bodies for `US-0017-0004`:
`git show 7fbac2d3:packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`, line 704,
`for (const invocation of refusals(run)) refused.push(…)`, over every step of every shipped job. So
B1 is not a property of a unit-test helper in isolation — it is a hole in the instrument that carries
the story's central claim, and it opens the first time a shipped lane writes a here-document
containing a quote, which is what a here-document into `$GITHUB_OUTPUT` is for.

## Verdict

**REVISE.**

Gates that passed, stated explicitly because the brief requires a passed gate to be nameable:

- The `inert` half of the differential test agrees with bash on all five of its current entries
  (executed).
- The `live` half agrees with bash and with `refusals()` on all twenty-one (executed).
- The differential test is **falsifiable**, and it is not redundant: six of nine hand-planted
  mutations of the round-15..18 repairs kill it, and two of those six are killed by **no other
  assertion in the file**. As an instrument it is the right answer to the most-repeated finding on
  this spec.
- `packages/qfai/tests/unit/shippedLaneCommands.test.ts` is green at the subject's bytes
  (13 passed).

What blocks: **B1**, an executed escape — a build that runs under bash with `refusals()` returning
`[]`, caused by `codeMask` walking through a here-document's data instead of past it. It is the
seventh "two walks, one question" divergence, in the function this round shared to end that class, and
no assertion in the file sees it. M1 is the other half of the same omission (`codeMask` never reads
`hereDocAt`'s `quoted`), and one skip written with one condition closes both.

Findings: **B1** blocking; **M1**, **M2**, **M3** major; **m1**, **m2**, **m3** minor; **A1** advisory.
Eight `###` headings, which is what `summary.json` should derive from.

`git rev-parse --short HEAD` at finish: **`1ecbeb07`** — unchanged from start.
`git status --porcelain packages/` at finish: **empty**. Nothing under `packages/qfai/` was modified;
every mutation was applied to `tmp/r19/helper_*.ts`, copies taken from `git show 7fbac2d3:` before any
edit, so there was nothing in the tree to restore. Nothing was written under
`packages/qfai/assets/init/root/`. Nothing was committed.

### Reproduction kit

Left in place under the repository-root `tmp/r19/` (gitignored) so B1 and M2 can be re-run rather
than re-derived; delete it once the stage has acted on them.

- `helper.ts` — `git show 7fbac2d3:packages/qfai/tests/helpers/shippedLaneCommands.ts`, unmodified.
- `helper_M1.ts` … `helper_M9.ts` — the nine mutants, each one edit off `helper.ts`.
- `mkfake.mjs` / `fakebin/` — the fake bundler PATH used as the execution oracle.
- `oracle.mjs`, `fuzz.mjs`, `fuzz2.mjs`, `fuzz3.mjs` — bash-vs-scanner runners (2 096 bodies executed
  in total across the three sweeps; every escape found belongs to B1's mechanism).
- `differential.mjs`, `fullsuite.mjs` — the subject test's assertions replayed against any helper
  path, with the arrays extracted from `subject_test.ts`'s own bytes.
- `hash.mjs` — the audited-evidence-hash computation.
