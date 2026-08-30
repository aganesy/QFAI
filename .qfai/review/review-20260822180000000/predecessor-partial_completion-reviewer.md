# R02 — completion-reviewer, round 19, spec-0017 (stage gates only)

- Revision at start: `19b751ca` (`git rev-parse --short HEAD`)
- **Subject under review: `7fbac2d3`.** Every artifact judged below was read with
  `git show 7fbac2d3:<path>`, not from the working tree. Where a measurement had to be *executed*
  (the guards read the tree, not a git object), I say which revision's bytes were on disk.
- Emphasis per the request: **§3 (the four guards, fifth attempt)** and **§4 (the record)**
- Verdict: **REVISE**

## Gate that passed

`pnpm -C packages/qfai exec vitest run --project e2e tests/assets/stageEvidenceCounts.test.ts
tests/assets/coverageDepthMatrix.test.ts tests/assets/retractedClaims.test.ts` — **3 files, 28 tests,
exit 0**, working tree clean at `19b751ca`. That is the baseline every plant below was measured
against, and every plant was restored from a copy taken before it.

### Why the executed baseline is `19b751ca` and not `7fbac2d3`, and what that itself shows

I first ran the same three files with `7fbac2d3`'s `.qfai/evidence/atdd-spec-0017.md` written into the
tree. **Three tests fail**:

```text
× ... > derives the round and response counts `## Final status` certifies with
    a count in `## Final status` that the packs on disk do not support: expected [ …(3) ] to deeply equal []
× ... > names every pack on disk, with a recomputing seal for each closed one
    expected [ 'review-20260820200000000', …(17) ] to deeply equal [ …(18) ]
× ... > keeps a counted claim's number equal to what the tree holds
    a counted claim whose number the tree does not hold: expected [ Array(1) ] to deeply equal []
```

All three are the round-19 pack directory existing on disk while `7fbac2d3`'s record still says
**eighteen**. `19b751ca` — the pack-opening commit, one commit later — moves them to nineteen/50 and
they go green. So this is a property of pinning, not a defect in the subject, and I did not file it.
It is worth stating plainly, because it is the same asymmetry the subject commit was written about:
**the record's counts are a function of the tree at the moment of measurement, and the subject is a
revision at which three of them are already false.** The guards for those three are doing their job.

`git diff --stat 7fbac2d3 19b751ca -- packages/qfai/` is **empty** — the four guards, the lexer and the
init surface are byte-identical at the two revisions, so nothing in §1-§3 is affected by the choice.
Only the record's own pack counts are, and those I read at `7fbac2d3` and report against `7fbac2d3`.
