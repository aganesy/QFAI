# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-3 repairs — the v4 build classifier and its two committed corpora, the `realpath`
  loop guard, the membership-and-assignment-checked Coverage Depth Matrix test, the ratchet's floor,
  `DR-0017-0010` as twice-revised, `CR-20260820-0012` with option 5, and the restructured
  `## Final status`
- Round: 4
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Round 3 (`.qfai/review/review-20260821000000000/`) returned three REVISE verdicts —
`implementation-reviewer` 4 blocking, `completion-reviewer` 7 blocking, P1d 3 blocking — and its
**general `qa-gatekeeper` slot was spent on the P1d re-route**, so the stage-level gate did not run at
all. That gap is one reason for this round.

The other is the record. Five rounds of `/qfai-implement` and three of this stage have each found a
vacuous or false claim inside the previous round's repairs. Three times the new defect was written
while applying a finding about that exact class of defect — most recently the clause-1 falsifiability
claim in `DR-0017-0010`, which was an equivalent mutant written while fixing a finding about that same
clause. **Assume it has happened again.**

## What changed since round 3

1. **The build predicate is v4**, and the corpus problem is meant to be fixed rather than repeated.
   Verb-allowlist plus first-target, replacing three versions of path-shape blacklisting. Two corpora
   are now committed, neither invented by this stage: round 3's own named cases, and a scan of every
   `run:` command line in both real workflow trees (451 lines), which flags exactly two builds.
2. **The loop guard uses `realpath`**, not lexical `path.resolve`, and `ELOOP` is skipped rather than
   fatal. The comment citing 83 symlinks is corrected — none is under either scanned tree.
3. **The matrix test checks class ASSIGNMENT**, not just membership: exact size equality, the total
   parsed, and a defining property per class. Nine falsification rounds.
4. **The ratchet has a floor** (`checked >= 208`) instead of equality, because equality punished a
   legitimate new backed story. The delete-and-add swap blind spot is stated, not papered over.
5. **`CR-20260820-0012` gained option 5** — split the conjunction upstream — recommended ahead of
   option 1, whose warrant was corrected: it is a narrowing of the flake budget's signal, not a reading.
6. **`## Final status` is the last section** and the three pack seals are inside it.

## What I most want challenged

1. **Break the v4 classifier, both directions.** It is the fourth version and the third to be reported
   as clean. Find a build form it misses or a non-build it catches. The two committed corpora are the
   claim; attack them, and attack the real-tree scan's premise that flagging exactly two is correct.
2. **Break the matrix test again.** Rounds 2 and 3 each found a mutation it could not see. Find a
   third: something that preserves the table, the partition, the sizes and the assignment properties
   yet changes what the record means.
3. **The loop guard.** Does `realpath` dedupe actually terminate a cycle, and does the `ELOOP` skip
   lose a tree it should have measured? Round 3 showed the previous guard was unreachable in every
   scenario; is this one reachable, and is it right?
4. **`CR-20260820-0012` option 5.** Splitting `EX-0017-0053` is now the recommendation. Is that a
   legitimate Drift Protocol change, or does it dissolve an obligation by rewriting the artifact that
   states it? And does the split actually help, given clause 1 is degenerate against this runner?
5. **Re-derive every number again.** Round 3 found four restated without re-derivation, after round 2
   found four. Assume more. Specifically: the guard's 19 tests, the suite totals 1420 / 1174, the six
   rejected-alternative bullets, the three pack seals, and the classifier's "451 lines, exactly two".

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks from the index first, or `QFAI-LINK-001` fires spuriously.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
