# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the round-7 repairs — v8 of the build classifier with member-level corpus pinning, the
  whole-document `retractedClaims.test.ts` with counted claims, the derived version pin, the last
  `.exec` removed, and the record corrections (the merged duplicate, the seven-round `## Final status`,
  the per-commit P7 derivation, the withdrawn Prettier claim)
- Round: 8 — **stage gates only.** P1d passed at round 7 and that gate is closed.
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: `git rev-parse --short HEAD` at your start. **This request is committed before
  you launch** and HEAD will not move while you run. If it moves, that is a finding.

## Why this round exists

Rounds 1-7 each returned REVISE from the stage gates. Round 7's P1d **passed** at its sixth pass, so
`TDD-0070 -> exception` and `TDD-0069 -> blocked` are both authorised and recorded. The stage gate has
never passed: round 6 gave 10 blocking, round 7 gave 11, and round 7 observed that two of its own
findings were ones a prior round had located precisely and that I had only partly applied.

The countermeasure taken for that is procedural and worth checking: a located finding is now verified
**by grep after the edit** rather than by editing the sites I happen to find. Round 7's claim is that
this leaves zero remaining `N times` phrases, zero `.exec` in the derived-count guard, and zero
unquoted refuted claims. Check it.

## What changed since round 7

1. **v8.** Per-family grammar: a package manager takes a script after its own passthrough verbs; a
   build tool takes a subcommand with **per-tool** passthrough verbs and directory flags; a spaced flag
   consumes its value unless it is a known boolean. That last rule leans toward missing a build rather
   than inventing one, deliberately.
2. **The corpus pins every member of every set.** `GRAMMAR` is exported and the test iterates it,
   because round 7 measured 10 of 23 mutations surviving when each rule was pinned at one member.
3. **`retractedClaims.test.ts`** searches the whole document (so a paragraph break cannot hide a claim)
   while pairing quotes **per paragraph** (so one stray quote cannot invert the rest). Zero-width
   characters become spaces. Counted claims are matched by shape with the number compared to the tree.
4. **The version pin is derived** from the helper's docstring, because the literal was holding the
   record stale at `v6` while the helper was at `v7`.
5. **The record**: the duplicate paragraph merged — it had drifted apart in wording, which is why three
   rounds of exact-match deletion missed it; `## Final status` derives seven rounds, 21 responses and
   one PASS from the packs; the P7 derivation replaced by round 7's per-commit sequence; and the claim
   that Prettier defeated a guard **withdrawn** — `.qfai/evidence/**` is prettier-ignored and
   `proseWrap` is `preserve`, so the line breaks were hand-wrapped by me.

## What I most want challenged

1. **Break v8.** Eighth version, sixth reported clean. You chose the corpora that broke v3 through v7.
   Attack the per-tool tables, the boolean-flag list, and whether the member-level pinning actually
   fails when a member is deleted.
2. **Break `retractedClaims.test.ts` a fourth time**, and say whether any retraction your role
   established in rounds 3-7 is still missing from its list.
3. **Break `stageEvidenceCounts.test.ts` and the matrix test again.** Both have been broken in each of
   the last three rounds.
4. **Verify the procedural claim** above by grep, not by reading.
5. **Re-derive every number**, including the eight pack seals, and say whether `## Final status` now
   says what the packs say.

## Instructions

- **No mutations** except your own findings file. Read-only otherwise. Revert any oracle mutation with
  a byte comparison in the same step. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`, no commits, no pushes.
- `validate` writes the TRACKED `.qfai/report/validate.log`; use a `git archive HEAD` shadow root and
  re-materialise the 83 tracked symlinks **as relative-target symlinks**, not junctions — round 7 found
  junctions rewrite the targets to absolute paths and produce a spurious `QFAI-LINK-001`.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack as `R0N_<role>.md`.
