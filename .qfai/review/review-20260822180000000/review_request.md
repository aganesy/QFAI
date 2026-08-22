# Review request — round 19, spec-0017, stage gates only

**Revision under review: `7fbac2d3`.** Read the subject with `git show 7fbac2d3:<path>` rather than from
the working tree, and say so in your report. Record `git rev-parse --short HEAD` at start and finish.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it.

## A second writer is on this branch

`b0f9d443` was pushed by another session while round 18 was closing: provenance, doctor and
workflow-hygiene work, and it changed the shipped workflow templates. Two consequences for this round:

- **"the subject does not move" is no longer a promise this stage can make.** It applies to the stage —
  which broke it once, in round 17, and will not again — but not to the branch. Pin every measurement to
  `7fbac2d3` explicitly. Two of you already do this by habit; this round it is the rule.

  **Amended after the first attempt at this round, which its `completion-reviewer` found incoherent** 
  before dying on a session limit: three of the record's count guards read the WORKING TREE, and this
  round's pack directory now exists on disk while `7fbac2d3`'s record still says eighteen. Pinning
  those three to the subject makes them fail for a reason that is not a defect. So: **pin CODE to
  `7fbac2d3`, and measure the record's pack and response counts at `19b751ca`**, the commit that
  opened this pack — because opening it is what moves them. `git diff 7fbac2d3 19b751ca -- packages/qfai/`
  is empty, so nothing else is affected by the choice. That observation is kept in the pack as
  `predecessor-partial_completion-reviewer.md`.
- **If you find something that belongs to `b0f9d443` rather than to this stage's work, report it anyway**
  and say whose it is. It ships to the same adopters.

## What this round is for

Round 18's repairs, and the structural change the stage made after them.

**The differential test.** Eighteen rounds found one class six times: two walks in this file answer one
question and the one nobody is looking at is wrong. The property behind every escape in rounds 15 to 18
is now a test — if `codeMask` says a build is at a code position, `refusals()` must refuse it — generated
over twenty-one live decorations and five inert ones. It found a seventh divergence on its first run
(`codeMask` had no model of here-documents) and the reader is now one shared function.

- **Is the differential test itself sound, and is it falsifiable?** It is one commit old, it is the
  stage's answer to the most-repeated finding on this spec, and nobody has reviewed it.
- Its `live` list is twenty-one decorations chosen by the stage. What is missing from it? A decoration
  that runs in bash and is absent from that list is exactly the gap the test was built to stop.
- The `inert` list asserts the MASK agrees with bash. If bash disagrees with the mask anywhere, the mask
  is what is wrong, and this test will say so about the wrong instrument.

### 1. The lexer after five root causes

`matchingParen` has a backslash model, `codeMask`'s comment rule has the guard `commandsOf`'s carries, an
unquoted here-document expands its data, the delimiter scan breaks on `<`/`>`/`(`, and `lastCode` is
deleted because it was nearly the question its three callers were asking.

- An eleventh spelling. Nine were found in rounds 15 to 17, five root causes in round 18.
- `hereDocAt` is now read by two walks. Is it right for both?

### 2. The init surface, third attempt

`initMustNotShip` asks three questions — shebang, executable bit, name — after the extension list was
beaten by a hook script. `ALLOWED_INIT_CONTENT` pins the four non-workflow files by content, and the walk
resolves symlinks because `qfai init` ships seventy of them.

- A fourth way to ship something that runs. A symlink whose target is outside the tree, a file whose
  first bytes are a BOM before the shebang, a `.command`, a Windows association.
- `b0f9d443` changed `init.ts`. Does anything it now writes fall outside these pins?

### 3. The four guards, fifth attempt

- Break each in both directions.
- Extract every regex from the file's own bytes and evaluate it.

### 4. The record

- Every count. The integration+unit total moved because the OTHER session committed, which is recorded.
- `--profile full` is a rule plus a sealed value. Verify both against `7fbac2d3`.
- Option 2 of `CR-20260820-0012` is recorded as having lost every stated ground and handed to that CR's
  owner. Is that still the right disposition?
- Re-grep for retracted claims yourself.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule.

Write to `.qfai/review/review-20260822180000000/R0N_<role>.md`, in small appends.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop.

## Amended a second time, after round 19's reports landed

The predecessor's partial was filed as `R02_completion-reviewer.partial-first-attempt.md`, which matches
`/^R0\d+_.*\.md$/` — the pattern `stageEvidenceCounts.test.ts` counts reviewer responses with. Three
reviewers, four matches: at the next round-open the record would have had to certify one more response
than there were reviewers, and attribute a verdict to a file that reached none. It is renamed
`predecessor-partial_completion-reviewer.md`, which the counter does not match and the recursive seal
still covers. Found by this round's `completion-reviewer` as `M2`.
