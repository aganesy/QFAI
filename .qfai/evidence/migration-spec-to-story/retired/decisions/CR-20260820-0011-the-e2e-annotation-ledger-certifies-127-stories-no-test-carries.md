# Change Request

- ID: `CR-20260820-0011`
- Title: `The E2E annotation ledger certifies 127 user stories no test carries an annotation for`
- Raised by: `/qfai-atdd orchestrator, spec-0017; raised while making round 1's "the script refuses unless every declared US is covered" claim checkable, and finding the script had never existed`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `2` — wire the guard into ci:lint scoped-only, now
- Applied at: `2026-08-23T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `none for spec-0017 — its 8 claims are all backed, verified by scripts/check-atdd-annotation-ledger.mjs --spec 0017. The open item is repo-wide: 16 other specs.`

## What was measured

`QFAI-ATDD-111` answers "is this user story covered?" by reading `<testsDir>/e2e/qfai-traceability.md`
— a hand-maintained markdown ledger — and **not** the test files. `CR-20260814-0001` already records
that shape. What had never been measured is how far the ledger has drifted from the tests.

`scripts/check-atdd-annotation-ledger.mjs`, added by this stage, compares every claim in the ledger
against the `QFAI:SPEC-NNNN:US-NNNN-NNNN` annotations that E2E test files actually carry:

```text
claimed in the ledger                                     208
backed by an annotation in packages/qfai/tests/e2e/**      81
UNBACKED                                                  127     (61%)
unbacked even across every test directory in the repo      126
```

Two corrections round 2's `qa-gatekeeper` made to these numbers, both against this CR's own case:

- all 81 live under `packages/qfai/tests/e2e/`. **Zero** are in the repo-root `tests/e2e/` tree, which
  holds the ledger and no test files at all — and that asymmetry is the whole defect, since
  `testsDir: tests` is repo-root relative, so the scanner reads only the tree with no tests in it;
- **127 is the correct figure and 126 is the generous one.** The single claim backed outside the
  guard's directories is a validator **fixture literal** at
  `packages/qfai/tests/core/atddCodeTraceability.test.ts:45` — a string in a test about the scanner,
  not coverage of a story. The parenthetical "126 across every test directory" therefore errs in the
  direction that weakens this CR's own argument.

By spec:

```text
0001  9    0002  8    0003  5    0004 10    0005  8    0006  5
0007  3    0008  6    0009  5    0010 10    0011  3    0012 28
0013 10    0014  4    0015  6    0016  7    0017  0
```

`spec-0017` is the only spec at zero, and only because this stage wrote the test before appending
the lines. Every other spec has at least three stories the gate reads as covered with nothing behind
them. `spec-0012` has 28.

## Why this is a defect and not a note

Because it inverts what the gate means. `validate --profile atdd` exiting 0 on `QFAI-ATDD-111` is
read throughout this repository — in stage evidence, in reviewer verdicts, in the required status
context — as "the user stories are covered". For 127 of 208 stories it currently means "somebody
appended a line". The gate is not weak, it is **reporting the wrong proposition**, and no reader of
its output can tell which of the two they are getting.

Round 1's `qa-gatekeeper` demonstrated the same thing from the other side, on this spec: with the
nine ledger lines present and the E2E test file **deleted**, the scoped gate still reported `error=1`
— exactly what it reports with the test in place. The gate cannot see the tests at all.

It is also the specific failure this stage claimed to have avoided. The stage evidence said the
ledger lines were appended by "a script that refuses unless every declared `US` is covered by a
`describe`". That script was not in the repository, `git show --stat 1e806e50` lists five files and
no script, and the test and the ledger lines landed in one atomic commit — so the ordering claim was
not checkable from history either. It is checkable now, for this spec, because the script exists.

## Options

### Option 1 — wire the guard into `ci:lint` repo-wide, after backfilling (recommended)

Add `node scripts/check-atdd-annotation-ledger.mjs` as a twelfth `ci:lint` member, gated on the 127
being resolved first. Resolution per claim is one of two things, and the choice is per story, not
per spec:

- a test exists and its annotation was never added to the file → add the annotation;
- no test exists → **remove the ledger line**, and let `QFAI-ATDD-111` report the story as the
  uncovered story it is.

The second is the one that matters and the one that will hurt: it hands 100-plus `QFAI-ATDD-111`
items back to the specs that own them. That is the correct direction — an uncovered story reported
as uncovered — and it is why this option is staged rather than immediate.

Cost: large, and spread across 16 specs, each its own `/qfai-atdd` run. This CR does not do that
work; it records it and puts the guard in place so no new unbacked claim can be added silently once
the guard is wired.

### Option 2 — wire the guard in scoped-only, now

`ci:lint` runs the guard with no `--spec`, but only over specs whose count is already zero
(`spec-0017` today), and each `/qfai-atdd` run adds its spec to that set as it backfills. Ratchets
forward, blocks nothing today, and never regresses a spec that has been cleaned.

Cheaper and safer than option 1, and strictly weaker: the 127 stay unreported by CI, visible only in
this CR and in the **ratchet** in
`packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts` —
`toBeLessThanOrEqual(127)`, which reddens on a new unbacked claim and stays green as the 127 are
fixed. The first version of that assertion was `> 100`, which round 2 showed was blind to unlimited
regression and **failed on the 27th story backfilled**, i.e. it punished precisely Option 1's work.

### Option 3 — make the scanner read the test files and retire the ledger

Fix the cause rather than guard the symptom: have `QFAI-ATDD-111` scan `<testsDir>/e2e/**` source
files for annotations directly, as `QFAI-ATDD-112` does for TCs, and delete
`qfai-traceability.md` entirely. Then no ledger can drift, because there is no ledger.

This is the right end state and it is a scanner change with a compatibility surface — an adopter
whose annotations live only in the markdown loses coverage the day it lands, which is precisely the
127 above, in every adopting repository rather than only in this one. It also interacts with
`testsDir` being repo-root relative: `packages/qfai/tests/**` annotations are invisible to the
scanner today, so this repository's own tests would need the monorepo case handled first.

### Option 4 — record and do nothing

Leave the ledger as is. Rejected: the measurement is now in the repository as a ratchet, so
"nobody knew" stops being available, and every subsequent reading of a green `QFAI-ATDD-111` would be
made in the knowledge that it means nothing for 61% of the claims.

## Recommendation

**Option 2 now, option 3 as the target, option 1's backfill as the bridge.** Option 2 costs one
`ci:lint` member and cannot regress. Option 3 removes the failure mode instead of policing it, and
should be specced against the `testsDir` monorepo problem rather than bolted on. Option 1's per-story
backfill is unavoidable under either — the 127 claims have to be settled one way or the other by the
specs that own them, and no scanner change decides for them which stories have tests.

## Not this spec's work

`spec-0017` is clean and stays clean under any option. The guard's existence, its tests, and this
record are what this stage owes. The 127 belong to 16 other specs' next `/qfai-atdd` runs, and are
recorded as a cross-spec obligation in `.qfai/evidence/atdd-spec-0017.md`.

## Resolution

ci:lint runs the ledger guard with --spec 0017; the widening procedure is recorded in the guard own docblock so the next backfill adds its spec in the same change
