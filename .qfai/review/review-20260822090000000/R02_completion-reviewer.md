# R02 — completion-reviewer — round 16, spec-0017 (stage gates)

**Verdict: REVISE**

**Reviewed revision:** `0132370d` at start, `0132370d` at finish. The subject did not move while this
round ran. `.qfai/report/validate.log` was modified and restored twice during the round by a sibling
running `validate`; the tree was clean at both my start and my finish.

**A gate that passed.** Three, actually, all re-measured by me at `0132370d`:

- `pnpm -C packages/qfai vitest run --project e2e` — **1445 passed / 16 skipped**, exit 0. Matches
  `## P7 quality gates` exactly.
- `vitest run --project integration --project unit` — **1219 passed / 19 skipped**, exit 0. Matches.
- `node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017` —
  `info=2 warning=0 error=1`, `QFAI-ATDD-112` on exactly the **eight** TCs the record names
  (`TC-0017-0016/0030/0032/0033/0034/0035/0069/0070`). Matches.

Also verified green and correct: `ci:lint`'s **eleven** members (counted from `package.json#scripts`,
not from the record); the callsite guard's root derivation from the `e2e` project's own include list
(`tests/e2e`, `tests/assets`); the mechanism corpus at **29** entries with the comment lines correctly
excluded from the count; all six `07_Decisions.md` rejected-alternative line numbers (`:133 :137 :203
:206 :242 :249`) and all three `09_delta.md § Rejected` candidates resolving to real text.

**Method.** Every plant below was made from a copy taken while the tree was clean, measured, and
restored from that copy; `git diff --quiet` confirms each target byte-identical at finish. I wrote
nothing under `packages/qfai/assets/init/root/.github/workflows/`. Scratch under `tmp/r16-completion/`.

---

## Blocking

### B1 — the repaired corpus count passes over a wrong number in the record's own emphasis style, and reddens on a true sentence

**The repaired corpus count passes over two wrong numbers written in the record's own emphasis style,
and reddens on one true sentence.** Both directions measured.

`Severity: blocking` `Traces to: defect:correctness`

`packages/qfai/tests/assets/stageEvidenceCounts.test.ts:228-246` says it "reads EVERY numeral adjacent
to the word". It reads four whitespace-delimited shapes. A numeral adjacent to `mechanisms` through
**any** non-space character is invisible, and two of those characters are this record's two dominant
numeral styles.

Plant, into `.qfai/evidence/atdd-spec-0017.md` after line 1030:

```text
The corpus stands at **31** mechanisms today, and `31` mechanisms were pinned in round 16.
```

Result: `tests/assets/stageEvidenceCounts.test.ts (12 tests) — 12 passed`. **Green over two stated
corpus sizes that are wrong by two.** The record writes numerals as `**29** reviewer responses`,
`**74 \`refactor\`**`, `**ten** rounds` throughout, so this is not an exotic shape — it is the house
style. Probed directly, these all escape both patterns while stating a size:

```text
"**31** mechanisms"                NO MATCH
"`31` mechanisms"                  NO MATCH
"a 31-mechanism corpus"            NO MATCH
"the mechanism corpus (31 entries)" NO MATCH
"mechanisms: 31"                   NO MATCH
```

The opposite direction, same file, one plant:

```text
Round 16 re-read the corpus and confirmed it still holds 29 mechanisms.
```

Result: **red** — `expected 5 to be 4`. A true sentence stating the true number reddens a required CI
leg.

Two more things about `SITES`. The comment says the check "requires the number of sites to be the
number **the record commits to**". The record commits to no such number: `grep` for `four times` /
`four sites` / `cites this number` over the whole record returns one unrelated hit. `SITES = 4` is a
literal that exists only in the test. And the nearest thing the record does say — line 1032, "**The
three numerals in that block are derived**" — says **three**, so a reader reconciling the two
instruments gets 3 against 4.

**Rework.** Either (a) make adjacency character-class-based rather than whitespace-based — capture the
numeral through `[\s*\`_(\[-]*` on both sides, which catches all five shapes above — or (b) stop
pinning a total and pin the *sites* by anchor instead (each of the four sentences named by a
distinguishing phrase, each required present and correct), so that adding a fifth true sentence is
free and rewording a pinned one still reddens. Either way, state the site count in the record if the
test is going to enforce it, and reconcile it with line 1032.

### B2 — `error=50` / `QFAI-REVIEW-007 45` is the measurement of the tree before the commit that wrote it; the tree produces 49 / 44

**`## P7 quality gates` and § "The full profile" certify `error=50` with `QFAI-REVIEW-007 45`. The tree
at `0132370d` produces `error=49` with `QFAI-REVIEW-007 44` — and the one that went away is the one the
same commit removed.**

`Severity: blocking` `Traces to: defect:correctness`

Measured, `node packages/qfai/dist/cli/index.mjs validate --profile full`, run directory
`.qfai/report/run-20260822073618797` (`validate.log` restored from a pre-run copy afterwards):

```text
counts: info=4 warning=403 error=49

QFAI-REVIEW-007   44
QFAI-REVIEW-004    2
QFAI-REVIEW-005    1
QFAI-ATDD-111      1
QFAI-ATDD-112      1
```

The record states 50 and 45 at `atdd-spec-0017.md:2056`, `:2365` and `:2374`, and then says at `:2384`:
"exactly one of its forty-five belongs to this stage: round 14's `summary.json` carried
`revision_form: "commit"` … **It is corrected** and the pack re-sealed." Both statements landed in the
**same commit**, `683f16ab`: it wrote the `45`/`50` figures *and* edited
`.qfai/review/review-20260822030000000/summary.json` from `"commit"` to `"content-hash"`. So the number
certified is the measurement taken of the tree *before* that commit, in the block whose own first
sentence is "**Re-run after the last artifact changed, twice, because this block was wrong about its own
currency both times**". This is round 15's finding reproduced by round 15's repair: re-measured, then
invalidated by the same edit, and never re-taken.

I confirmed the residual 44 are all other stages' packs — every path is `review-20260818*` or earlier;
none is a `review-2026082*` pack of this stage. (One file, `review-20260805082718000/summary.json`,
carries two of the 44, so it is 44 findings over 43 files, not 44 files.)

**Rework.** Re-run `--profile full` at the revision that carries the fix and write 49 / 44; or state the
figure with the revision it was taken at, as § "P7 quality gates" already does for the two suite totals.

### B3 — three refuted sentences about `bodyDigest` normalization stand as assertions, and no needle reaches any of them

**Three sentences describing `bodyDigest`'s normalization stand as live assertions in § "Commands
executed + key outputs", and all three are refuted by the code round 15 shipped.**

`Severity: blocking` `Traces to: defect:correctness`

`packages/qfai/tests/helpers/shippedLaneCommands.ts:842-859` is now:

```ts
export function bodyDigest(body: string): string {
  // **Nothing is normalized.** …
  return createHash("sha256").update(body).digest("hex");
}
```

`git log -L` confirms the `\r\n` fold was deleted at `03aa4d5c` (round 15's code repair). The record at
`atdd-spec-0017.md`:

- **:1044** — "It is `bodyDigest` now — **line endings and trailing whitespace normalized, nothing
  else**". False twice over: trailing-whitespace stripping was removed at round 14 (the paragraph
  immediately below, :1050-1056, says so), and line-ending folding was removed at round 15. This
  sentence contradicts its own next paragraph *and* the current code.
- **:1058** — "**Line endings are the only normalization left**". There is none left.
- **:1060-1062** — "The remaining `\r\n` rule is unreachable from the gate … and is kept for a caller
  that reads raw text, **commented as unreachable and exercised by a test**, so it is a branch someone
  can break rather than one nobody can observe." The branch does not exist. And "unreachable" is the
  exact reading round 15 refuted with a quoted flow scalar — the record still gives it, unquoted, as
  the reason the rule is safe.

The correction exists at :2327 ("The third `bodyDigest` collision retired the practice of normalizing at
all") — in the round-15 narrative section, three hundred lines away, while the design section still
asserts the old state. That is retraction entry `"US-0017-0007 is uncovered"` verbatim: *"the correction
moved one paragraph and left five sites"*. Here it moved one paragraph and left three.

No needle in `RETRACTED` reaches any of the three; see M3 for why the guard cannot be relied on to have
found them.

**Rework.** Rewrite :1044, :1058 and :1060-1062 to the current rule, and add a needle for the refuted
`\r\n`-is-unreachable wording so the next round cannot restore it.

### B4 — the `revision_form` repair relabelled rather than corrected: every pack declares `content-hash` over a commit sha

**Round 15's `revision_form` "correction" relabelled the field rather than correcting it: every pack
this stage wrote now declares `revision_form: "content-hash"` over a value that is a short commit sha,
and the pack's own `notes` says so.**

`Severity: blocking` `Traces to: defect:code-quality` (regression against
`.qfai/assistant/skills/qfai-implement/references/evidence-revision.md`, the named contract for this
field, enforced by `QFAI-REVIEW-007` / `-009`)

`git log -p .qfai/review/review-20260822030000000/summary.json` shows `683f16ab` changing
`"revision_form": "commit"` to `"content-hash"` while leaving `"revision": "4d737f3a"`. `git cat-file -t
4d737f3a` → `commit`. The same commit added a `notes` field that states the substitution outright:

> `revision` is the commit the round reviewed, recorded under **the only admissible current
> `revision_form`**

`evidence-revision.md:70-108` defines a content hash as a SHA-256 over a constructed path/mode/blob
record set excluding `.qfai/specs/*/tdd/test-list.md` and `.qfai/evidence/**`, and says explicitly that
a cheaper substitute "is not sufficient, which is what this field used to specify". `:153` says the
marker "is how a pack says which contract produced it". A commit sha under a `content-hash` marker is a
pack claiming a provenance it does not have, and it defeats what the field exists for: gate item 10
recomputes a verdict against its own subject, and a recomputed content hash can never equal a commit
sha, so the freshness check fails silently instead of loudly.

This is not confined to round 14's pack. I read all sixteen `summary.json` files: **every one** declares
`revision_form: "content-hash"` and carries a short commit sha (`8fb48002`, `56daee8d`, `1473897a`,
`54d8d325`, `3f815725`, `cb91e089`, `9a37421c`, `dbe00247`, `05a97202`, `a66be5c6`, `4b58eadd`,
`45e6f041`, `4d737f3a`, `21e2cdc6` — all `git cat-file -t` → `commit`). The validator never flagged the
other fifteen because it checks the marker's *value*, not the value's *form*. Round 15 found the one
pack that was honestly mislabelled; the repair made it dishonestly well-labelled and left the record
saying "**It is corrected**" (`:2386`), which it is not.

**Rework.** Three admissible routes, and the disclosure in `notes` is not one of them because no
validator or gate reads it: (a) compute the content hash per `evidence-revision.md` and write it, for
this pack and retroactively; (b) list the packs under `.qfai/review/.legacy-packs` and mark them
`legacy`, if their trees are genuinely not reconstructible — the contract's own escape hatch; or (c)
file a Change Request against the contract if a commit sha is the right address for a review pack on a
committed branch, and say so in `## Gaps / Open risks` until it is adjudicated. Whichever is chosen,
`:2384-2386` must stop saying the defect is corrected.

### B5 — the `CR-20260820-0012` correction deleted the reason that CR and the record give for keeping option 2 rejected

**Round 15's in-place correction to `CR-20260820-0012` deleted the reason that CR gives for keeping
option 2 rejected, and both the CR and the stage record still point at it.** The brief asks whether
either correction changed a decision the file records. This one did.

`Severity: blocking` `Traces to: .qfai/assistant/constitution/drift-protocol.md` (rejected options and
RE-OPEN)

Before `683f16ab`, `CR-20260820-0012`'s first "cycle is over-determined" bullet read: *"clearing
`QFAI-ATDD-112` still leaves `error=1` from `QFAI-ATDD-111`, which stands **deliberately** because this
stage withdrew `US-0017-0007`'s unearned annotation"*. It now reads: *"clearing `QFAI-ATDD-112` leaves
the scoped gate at `error=0` … `QFAI-ATDD-111` is clear for this spec"*.

Twenty-five lines below, unedited, the CR still says:

> Option 2 still fails, by the **first** reason given above: `QFAI-ATDD-111` has no ledger rows to
> exempt, so nothing about in-flight rows reaches it.

The first reason given above no longer says that. It now says the opposite — that `QFAI-ATDD-111` does
not fire for this spec at all — so the sentence that keeps option 2 rejected cites a bullet that
withdraws its own premise.

And `.qfai/evidence/atdd-spec-0017.md:129-134`, inside § "Delta Rejected Guard", certifies on exactly
that ground:

> Option 2's second stated reason was withdrawn during that CR's own review and **the option remains
> rejected on its first**.

So the completion record's "**No RE-OPEN is required**" (`:136`) rests on a rejection ground the CR no
longer states. Option 2 is not *reintroduced* — the unscoped strand ("`build` needs all fifteen, not
eight") still rejects it — but the record and the CR now disagree about why, and a reviewer following
the citation lands on a bullet that supports the option rather than rejecting it.

**Rework.** Restate option 2's rejection on the ground that survives the correction (the unscoped
fifteen), in the CR and in `atdd-spec-0017.md:132-134`, and remove the "by the first reason given
above" back-reference. If the surviving ground is judged insufficient, that is a RE-OPEN, not an edit.

## Major

### M1 — the Delta Rejected Guard tie is satisfied by a fenced sample, with the artifact's real row deleted

**The Delta Rejected Guard tie is a third version of the same vacuity: it reads any line in the section
that starts with a pipe and a backticked token, so a fenced sample satisfies it while the real row is
gone.**

`Severity: major` `Traces to: defect:correctness`

`stageEvidenceCounts.test.ts:187-189` extracts `/^\|\s*\`([^\`]+)\`/gm` from the whole section slice.
The comment says it reads "The TABLE's first column, not the section's text" — but the slice is
`### Delta Rejected Guard` to the next `## `, roughly a hundred lines, and `^\|` matches inside a fenced
block just as happily as inside a table.

Two plants, both into `.qfai/evidence/atdd-spec-0017.md`:

1. Delete the table row `| \`tests/assets/retractedClaims.test.ts\` | same | measured |` — **red**,
   `a file this stage added that the Delta Rejected Guard table does not reason about`. So the third
   version is not wholly vacuous, and that is worth saying.
2. Delete the same row **and** add, still inside the section, before `**No RE-OPEN is required.**`:

   ~~~text
   An illustration of the row shape a future artifact would need:

   ```text
   | `tests/assets/retractedClaims.test.ts` | ... | ... |
   ```
   ~~~

   Result: **12 passed.** Green with the artifact's actual row deleted and nothing but a code sample in
   its place. This record contains dozens of `text` fences and several of them list file paths, so this
   is a shape the section can reach by ordinary editing rather than by sabotage.

Two smaller residuals in the same tie, worth fixing in the same edit:

- The tie's subject is `TRACKED ∪ HELPERS`, and the section promises "**Re-run against every artifact
  added since**". `scripts/check-atdd-annotation-ledger.mjs` is an artifact this stage added; it is
  reasoned about in the section's prose (`:50-54`) but has **no row**, and the tie does not ask for one.
  `packages/qfai/vitest.knobs.ts` has neither. So the promise still exceeds the check by exactly the
  class round 15 faulted it for — non-test-file artifacts — one round later.
- A row satisfies the tie with an empty second and third cell. Nothing requires a verdict.

**Rework.** Bound the extraction to the contiguous table: find the header/separator pair, then read
consecutive `^|` lines until the first non-`|` line, and read the first cell of those. And either widen
the tie's subject to every artifact this stage added, or delete the sentence claiming it covers them.

### M2 — class C's roster is checked in one direction while the test and the record both claim two

**Class C's roster is checked in one direction. The test's own comment and the record both claim two.**

`Severity: major` `Traces to: defect:correctness`

`coverageDepthMatrix.test.ts:366-381` comments: "a member the prose does not name is a cell reclassified
without a reason, **and a name with no member is a reason for a cell that moved**." Only the first is
asserted (`classC.filter(cell => !namedInProse.has(cell))`). Nothing walks `namedInProse` or
`CLASS_C_ROSTER` back the other way.

Measured, both directions:

- Delete `` `US-0017-0007` × `Error path` `` from the class C prose → **red**, `a class C cell the record
  does not name with its own reason`. Forward half works.
- Add a bullet `` - `US-0017-0003` × `Boundary values` — **inapplicable by the design.** … `` to the class
  C paragraph, changing nothing else → **5 passed, green.** A reason standing for a cell that is not in
  class C, which is exactly what the comment says is caught.

`CLASS_C_ROSTER` itself is consulted only by `PROPERTIES.C`, so a stale entry there is unreferenced and
equally invisible. The class therefore has three lists — table members, test roster, prose reasons — with
one arrow drawn between two of them.

**Rework.** Assert set equality across all three: `CLASS_C_ROSTER` == class-C members in the partition
table == cells named in the class C prose block. Scope `namedInProse` to the class C paragraph rather
than to the whole file, or a `× `-shaped mention anywhere in the record will satisfy the naming rule.

### M3 — the widened `GOVERNANCE` list is still short by four stage-authored files

**The widened `GOVERNANCE` list is still short by the class it was widened for: three stage-authored
test files and the stage's own script are outside it.**

`Severity: major` `Traces to: defect:correctness`

`retractedClaims.test.ts:71-84` lists twelve files. `stageEvidenceCounts.test.ts`'s `TRACKED ∪ HELPERS`
lists eleven artifacts this stage added, and the intersection leaves out:

```text
packages/qfai/tests/unit/shippedLaneCommands.test.ts          (28 KB, the corpus file)
packages/qfai/tests/unit/buildCommand.test.ts                 (the twelve-version predicate history)
packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts
scripts/check-atdd-annotation-ledger.mjs
packages/qfai/vitest.knobs.ts
```

(`retractedClaims.test.ts` itself is correctly excluded — it holds the needles literally.)

Measured. Plant, at the head of `MECHANISMS` in `tests/unit/shippedLaneCommands.test.ts`:

```ts
// US-0017-0007 is uncovered, and trailing whitespace is not a behaviour.
```

Result: **11 passed, green** over two refuted claims asserted in a comment in a file this stage wrote.
That is round 15's `B` finding reproduced verbatim, one directory over, by round 15's repair.

I also re-grepped independently rather than trusting the list, reimplementing the guard's two
flattenings and its exempt/quote model against a wider file set. Over the five files above plus
`tests/e2e/qfai-traceability.md`, `.qfai/evidence/implement-spec-0017.md` and
`.qfai/evidence/timing-workers-spec-0017.md`, the only hits are in
`.qfai/specs/spec-0017/tdd/test-list.md` — `"becomes implementable once the pull request has three
green"` ×1 and `"NOT BLOCKED by a CR"` ×2, in both flattenings. That file is deliberately excluded and
the exclusion is argued in the docstring, so those are the disclosed handover items rather than new
findings. No needle is inert: all 29 are live in `GOVERNANCE` or listed in `RETIRED`, and the three
`RETIRED` entries match nowhere.

What that scan cannot find is a refuted claim in a wording no needle holds, and **B3 is one**: three
sentences about `bodyDigest` normalization, refuted by round 15, standing unquoted in the record with no
needle within reach. So the answer to the brief's question is yes, twice — one class outside the file
list, one outside the needle list.

**Rework.** Add the four stage-authored source files (and `vitest.knobs.ts` if the stage claims it), and
add a needle for the refuted `\r\n`/"unreachable" wording. Derive `GOVERNANCE`'s source-file members from
`TRACKED ∪ HELPERS` rather than retyping them, which is the move `stageEvidenceCounts.test.ts` already
made for its own three lists and for the same reason.

### M4 — the deleted verdict table carried a `revision` column `### Findings per round` does not, and the sentence saying otherwise is false

**The deleted per-round verdict table carried a column `### Findings per round` does not have, and the
sentence certifying otherwise is false.**

`Severity: major` `Traces to: defect:correctness`

`atdd-spec-0017.md:2473-2478`: "§ \"Findings per round\" holds the same information **with one more
column** and its rule is stated; **nothing was lost** by deleting it."

The deleted table's columns (from `git diff 045c1dc1 HEAD`): `round | reviewers | revision | verdict`.
`### Findings per round`'s columns (`:2220`): `round | reviewer | verdict | findings | id families |
summary`. The `revision` column has **no counterpart**. It is not "the same information with one more
column"; it is different information, with one column dropped and three added. Everything else the
deleted table carried does survive — round 3's missing stage gatekeeper (`:2231`), round 7's P1d PASS
(`:2244`) — so `revision` is the whole of the loss, and the claim as written is exactly the kind of
statement-about-its-own-structure this record catalogues.

The follow-on sentence is sound and I verified it: fourteen of the fifteen closed packs carry
`"revision"` in `summary.json`, and the one that does not is round 13's, which the deleted table never
covered (it stopped at 12). So the *information* is recoverable; the *claim about the record* is not
true. Note also that B4 applies to every one of those `revision` values.

**Rework.** Replace the sentence with what is actually true — that `### Findings per round` carries the
verdicts and the finding counts, and that the revision each round ruled on now lives only in each pack's
`summary.json` — or add a `revision` column to `### Findings per round` and make the claim true.

### M5 — the depth-score pin has optional `**` markers and reads the first match, so prose masks a contradicting bullet

**`coverageDepthMatrix.test.ts:533` builds a regex in which the `**` bold markers are optional, and
reads the first match, so an earlier prose mention masks a bullet that contradicts the table.**

`Severity: major` `Traces to: defect:correctness`

The literal is `` new RegExp(`\\*\\*${column} \`([^\`]+)\`\\*\\*`) ``. Extracted verbatim from
the file and evaluated:

```text
source: \*\*Normal path `([^`]+)`\*\*
```

`\*` is "zero or more literal backslashes", not `**`. Probed: it matches
``Normal path `WRONG` in prose; later - **Normal path `OK`**`` and returns `WRONG`. The comment two
lines above says "The section states a score per column, as `- **<Column> \`<score>\`** — …`, so the pin
is the PAIR" — the pin is neither bolded nor bullet-anchored, and `exec` takes the first hit anywhere in
the section, which the same file names four separate times as the defect rounds 6 and 7 required fixed.

Measured, in `.qfai/evidence/coverage-depth-spec-0017.md`:

1. Change the bullet `- **Normal path \`✅\`**` to `- **Normal path \`❌\`**` (table unchanged) → **red**,
   `every depth column's score must agree between the table and the row's justification`.
2. Keep that, and add ahead of `Scores, and the reason for every remaining ❌:` the line
   `Round 12 scored Normal path \`✅\` here, and that is unchanged.` → **5 passed, green.**

An unbolded, entirely plausible historical sentence launders a bullet that over-claims by two grades, in
the one check written to stop raising a cell without rewriting its sentence.

**Rework.** Escape the markers correctly (`\*\*` in the template literal, giving `\*\*` in the
pattern), anchor to the bullet (`^\s*-\s*`), and use `matchAll` with a requirement of exactly one match
per column.

## Minor

### m1 — the prose describing the deleted per-commit sequence survives it, including a claim that it is still there

**The prose that described the deleted per-commit e2e sequence survives it, and one sentence asserts the
sequence is still there.**

`Severity: minor` `Traces to: defect:correctness`

`atdd-spec-0017.md:2073` records the deletion. `:2094-2121` then continues:

- ":2094-2097 — "**Method, because three derivations of this sequence were wrong**… **The right column**
  is `it`/`test` callsites… **The left column** is the total those deltas imply". There are no columns.
- ":2107 — "**The sequence stopped at `ac4700d1 1431`** for one round".
- ":2111 — "**Round 7 measured that sequence and it is the one to trust**".
- ":2123 — "…which is why they name the revision they were measured at and **why the sequence above
  reaches it**". The sequence above does not exist, and this is a claim about the record's own structure
  inside the block whose subject is claims of that kind.

`git log -S` puts the deletion at `f829b95e`, so this has stood for four rounds. It is minor because
nothing downstream depends on it, and it is worth fixing because it is four rounds of dangling reference
in the section this record has repaired six times for staleness.

### m2 — the callsite guard silently drops an include glob it cannot parse

**The callsite guard's root derivation drops an include it cannot parse, and the floor cannot see it.**

`Severity: minor` `Traces to: defect:correctness`

`stageEvidenceCounts.test.ts:504-508` reads `/"(tests\/[^"*]+)\/\*/g` over the `e2e` block. Today it
yields `tests/e2e` and `tests/assets`, which I verified against `vitest.workspace.ts` — the derivation
is real and the repair works. But the only floor is `globs.length > 0`. An include of the shape
`"tests/**/*.test.ts"` matches nothing (`[^"*]+` cannot cross the `**`), so a third include added in
that form would be silently dropped while the project ran its files, and the measurement would go back
to being narrower than the project — the exact defect the comment at :492-494 says was false for three
rounds.

**Rework.** Count the string literals in the block and require `globs.length` to equal that count, so an
unparsed include reddens instead of vanishing.

## Advisory / Change Request proposals

### A1 — class B's property is coordinates-only, which is the argument that retired class C's

**Class B's property is coordinates-only, which is the argument the record just used to retire class C's.**

`Severity: advisory` `Traces to: none`

`PROPERTIES.B` is `Status ≠ ❌ ∧ column ∈ {State transitions, Combinatorial}`. The record's own reasoning
at `coverage-depth-spec-0017.md:206-208` is that "'Inapplicable by the design' is a claim about the thing
the story describes, not about a table of scores, so no predicate over a row and a column can decide it".
Class B's stated reason — "the E2E surface reads files and cannot run a workflow" — is likewise a claim
about the harness, and no predicate over a row and a column decides it either. A cell in those two
columns that is simply untested lands in class B and is accepted, which is round 15's finding one class
over. B has nine members against C's two, so the exposure is larger.

I am recording this as advisory rather than blocking because I cannot demonstrate a currently
misclassified cell — all nine B members are on rows whose surface genuinely does not run — and closing it
means either a roster for B (nine entries, each needing a reason) or accepting the coordinate property
with the residual stated. That is a scope judgement for the stage, not a defect I can show from the
artifacts.

**Proposal.** State the residual in class B's paragraph in one sentence — that the property is
coordinates and the harness claim is not derivable from it — rather than changing the instrument. That
costs nothing and stops the next round finding the asymmetry as a defect.

## Open risks and gates

- **Verified passing at `0132370d`:** `e2e` 1445/16, `integration`+`unit` 1219/19, the scoped `atdd` gate
  at `info=2 warning=0 error=1` on eight TCs, `ci:lint`'s eleven members, the three guard files' own 28
  tests, all six `07_Decisions.md` rejected-alternative citations, all three `09_delta.md` candidates.
- **Verified failing:** `--profile full` at 49/44 against a certified 50/45 (B2).
- **Not re-opened:** P1d's PASS on `DR-0017-0010` stands. Its round-15 in-place correction is dated
  ("**Dated 2026-08-22, after round 15**"), the dating is honest against the pack timestamps, it moved
  only a supporting measurement, and P1d's decision is untouched. `CR-20260820-0012`'s correction is
  dated the same way and is likewise honest — but it *did* move a decision's stated ground, which is B5.
- **Residual I could not close:** the `revision` values in every `summary.json` (B4) are commit shas. If
  the stage takes route (a) and computes real content hashes, every pack seal recorded in
  § "Review packs and their seals" moves, and `stageEvidenceCounts.test.ts`'s seal rule will redden until
  the record follows. Sequence that edit deliberately.
- **Sequencing note, not a gap:** this round's pack carries no `summary.json` and no seal, and
  § "Final status" certifies fifteen closed rounds' responses. Both are correct for a round in flight and
  neither is a finding.

## Plants: made, measured, restored

Every plant was restored from a copy taken while the tree was clean, never with `git checkout`. Copies
live in `tmp/r16-completion/`. `git diff --quiet` at finish confirms each target byte-identical to
`0132370d`.

```text
.qfai/evidence/atdd-spec-0017.md                        4 plants   restored, CLEAN
.qfai/evidence/coverage-depth-spec-0017.md              4 plants   restored, CLEAN
packages/qfai/tests/unit/shippedLaneCommands.test.ts    1 plant    restored, CLEAN
.qfai/report/validate.log                               2 runs     restored from a pre-run copy
```

I wrote nothing under `packages/qfai/assets/init/root/.github/workflows/` — `qa-gatekeeper`'s partition.
I observed transient modifications there (`qfai-validate.yml`, then `qfai-tests.yml`) during the round
and measured through neither: every measurement I report reads `.qfai/**`, `packages/qfai/tests/**`,
`packages/qfai/vitest.workspace.ts` or `package.json`, none of which the gatekeeper touched. The two
suite totals in the header were taken while the tree was clean at `0132370d`.

## Completion Contract and Drift Protocol

- **Completion Contract** (`shared-skill-operating-baseline.md:172`) is not yet in play: the record
  declares **FAIL** and enumerates five unsatisfied items, so nothing is being certified complete. The
  contract's four obligations are not asserted met and I am not judging them.
- **Drift Protocol.** No rejected option is reintroduced. I checked the substance rather than the tie:
  all three `09_delta.md § Rejected` candidates and all six `07_Decisions.md` rejected alternatives at
  `:133 :137 :203 :206 :242 :249` resolve to real text and none is contradicted by what this stage
  built. The one problem is B5 — a rejected option whose *stated* rejection ground was deleted in place.
  "**No RE-OPEN is required**" is still the right conclusion; the sentence supporting it is not.
- **Reviewer-originated obligations.** Every blocking finding above is demonstrable from the changed
  artifacts and traces to a `defect:*` class or a named contract. The one finding that would add an
  obligation the stage was never given — a roster for class B — is filed as `A1`, advisory, with
  `Traces to: none`, and is not blocking.
- **No self-approval.** Nothing in this report was written by the party that wrote the subject, and I
  measured every number I report rather than reading it.

## Revision at finish

`git rev-parse --short HEAD` → `0132370d`. Unchanged. `git status --porcelain` clean.

## Verdict

**REVISE.** Five blocking, five major, two minor, one advisory.

The three repairs the brief pointed at all still fail in the direction they were repaired for, and two
of them fail in the *other* direction as well — the corpus count now reddens on a true sentence, and the
class C roster is one arrow where its own comment claims two. The most expensive finding is not in
section 5 at all: § "The full profile" certifies a measurement invalidated by the commit that recorded
it, and the item that invalidated it is a `revision_form` "correction" that made a false declaration out
of an honest one. Both are the same shape as everything else here — the repair carrying the defect it
repaired.
