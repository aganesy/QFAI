# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-2 repairs and the round-2 advisories — the ledger guard and its 19 tests, the
  membership-checked Coverage Depth Matrix test, the behavioural `US-0017-0003` row, the v3 build
  predicate, `DR-0017-0010` as revised, and `CR-20260820-0012`
- Round: 3
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Round 2 (`.qfai/review/review-20260820220000000/`) returned three REVISE verdicts —
`implementation-reviewer` 4 blocking, `completion-reviewer` 4 blocking, `qa-gatekeeper` 3 blocking —
plus a fourth REVISE from the P1d gate on `DR-0017-0010`. Every finding was verified independently and
applied. **A stage does not review its own repairs.**

The record so far, which is the reason for this round's framing: rounds 1, 2 and 3 of `/qfai-implement`
and rounds 1 and 2 of this stage each found a vacuous or false claim **inside the previous round's
repairs**. Twice the new defect was written while applying a finding about that exact class of defect.
Assume the same has happened again.

## What changed since round 2

1. **`DR-0017-0010` revised, `CR-20260820-0012` filed.** P1d found `TDD-0069`'s exit condition
   unreachable: a green `ci-pass` needs `error=0`, which needs `QFAI-ATDD-112` clear, which needs
   `TC-0017-0069` annotated, which needs the green runs. `TDD-0069` is re-classified `blocked` on that
   CR; `TDD-0070` stays `exception` against the DR.
2. **The ledger guard**: annotation regex aligned to `atddTraceability.ts:27`; root from
   `import.meta.url`; unknown-argument rejection and `--spec=NNNN`; exit 3 for internal failure;
   symlinked directories followed with a loop guard. 19 tests, including six over `main()`.
3. **The repo-wide assertion is now a ratchet** — `toBeLessThanOrEqual(127)`.
4. **The matrix partition is a machine-readable table** and the test checks membership: complete,
   disjoint, no non-`❌` member, sizes derived.
5. **The build predicate is v3**: `build` as a standalone shell word, plus a build-script arm, minus
   bare `tsc`, with trailing comments stripped.
6. **`US-0017-0003`** asserts the documented fallback verbatim, both probe candidates and their
   precedence, under `bash -e -o pipefail`.

## What I most want challenged

1. **Break the new claims.** Specifically: does the matrix test's membership check survive a mutation
   that preserves both the table and the partition but changes what they mean? Does the ratchet have a
   direction it is still blind to? Does `US-0017-0003` survive a mutation to the resolver that changes
   behaviour without changing any of `E6`-`E11`'s targets?
2. **The v3 predicate, both directions.** I measured 21 caught / 14 rejected / 0 misclassified against
   a corpus **I chose**. Round 2 established that a self-chosen form set does not establish the
   property. Find a build form it misses, or a non-build it catches.
3. **The `blocked` re-classification of `TDD-0069`.** Is `CR-20260820-0012` a real "unresolved Change
   Request" for the purpose of `execution-ledger.md`'s `todo -> blocked` grounds, or is it a CR the
   stage opened on itself to convert an `exception` into a `blocked`? Say so if it is the latter.
4. **`CR-20260820-0012`'s option 1.** It proposes reading "aggregate-verdict runs" as the layered lane
   set rather than the required context. Is that a genuine reading of `BR-0017-0053`, or a
   reinterpretation that makes the obligation satisfiable by weakening it?
5. **Whether anything in the two governance records is still false.** Round 2 found `spec-0015 (2)`,
   a two-space seal manifest, a non-existent `Notes` column and "four rows presented as successes"
   when three are `✅`. Those were all numbers restated without re-derivation. Re-derive everything.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks from the index first — `git archive` flattens them and
  `QFAI-LINK-001` fires spuriously otherwise.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
