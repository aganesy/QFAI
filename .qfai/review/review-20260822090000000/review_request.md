# Review request — round 16, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it. Round 15's gatekeeper
found a stale supporting measurement inside that file and correctly did not re-open the decision; do the
same if you find another.

## What this round is for

**Everything named below is round 15's repair work**, and round 15 found that three of round 14's repairs
could not fail. That is now the pattern rather than an anomaly: every round since 12 has found defects in
the previous round's repairs, and the defects are usually in the repair rather than in what it repaired.

Round 15 returned eleven blocking findings across three reviewers. Two of its most valuable came from
attacking a NEW guard rather than an old one, and two more came from asking whether a check could fail at
all. Both are cheaper than reading code.

## Two rules about who may write

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/.github/workflows/` and is the only role that may write there. Round 15's
  siblings both reported the gatekeeper's transient plant rather than measuring through it, and re-took
  every tree-reading measurement against `git show HEAD:<path>`. That worked; do the same.
- **The stage does not edit the subject while this round runs.** If you see the subject move, say so.

**A documented trap:** running
`node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017` rewrites
`.qfai/report/validate.log`, which is tracked. Restore it with `git show HEAD:<path> > <path>`, never with
`git checkout`, and cite `.qfai/report/validate.spec-0017.json` or the per-run directory instead.

### 1. The redirection lexer, rewritten again

`redirectionsOf` now reads the whole operator rather than its first character (`<>` opens for reading AND
writing — round 15 ran a `preinstall` hook through the old reading), reports the text it consumed so
`withoutRedirections` can remove exactly that, flags a descriptor duplication instead of dropping it,
folds `${VAR}` to `$VAR`, and treats `>|` as one operator. `commandsOf` no longer splits an `&` that
belongs to a redirection, and a here-document's body is data.

- **Find an eighth spelling.** Seven have been found by seven separate measurements. `exec 3>file`,
  `{ …; } > f`, `while …; done > f`, a descriptor above 9, `${var}>f`, `>&$fd`, a here-document whose
  delimiter appears in its own body, `<<<` with an expansion.
- `withoutRedirections` removes each `source` by `String.replace`, which replaces the FIRST occurrence.
  Two identical redirections in one command, or a `source` that also occurs earlier as ordinary text —
  does that remove the wrong span?
- The duplication rule is `duplicates && /^[0-9]+-?$|^-$/`. Break it.

### 2. The digest boundary, now bound to a location

`ALLOWED_STEP_BODIES` is twelve `[digest, "file#job [step name]"]` pairs compared as a sorted list, so
replication and permutation both redden. `ALLOWED_ACTION_STEPS` does the same for steps that have no
`run:` at all — round 15 shipped a `uses:`-only `pnpm/action-setup` into a placeholder lane through the
entire suite. Neither digest normalizes anything: three collisions, one per attempt.

- **Find a fourth collision**, or a way to move what a lane executes while both lists stay green.
- A step's NAME is part of the pin. Is that right, or does it make a cosmetic rename look like a security
  event and train people to paste?
- What else in a workflow executes that neither list covers? Round 15 found two such channels.

### 3. `bodyDigest` and `payloadDigest` normalize nothing

The `\r\n` fold was removed after round 15 showed a quoted flow scalar delivers a live CR — round 14 had
recorded that branch as unreachable on a measurement of block scalars only.

- Is "the bytes are the identity" now costing false alarms the tree will actually hit? A re-indent, a
  `|` to `|-` change, a trailing newline.
- The two enumerated `node -e` payload digests were regenerated. Verify both against the shipped tree.

### 4. The token readers, unified

`invocationOf`, `bareArgumentsOf` and the refusal walk all read `withoutRedirections(command)`.
`headIndexOf` skips assignments only. `select` is a word list like `for`; only `case` puts a command after
its `in` in the same segment.

- Do the readers still disagree anywhere? A nested `case`, an arm whose pattern is `in`, a function whose
  body opens a `case`, a `select` inside a `case` arm.
- `ALLOWED_ACTION_INPUTS` is per action now. Is the per-action split right, or does it refuse an input the
  shipped tree could legitimately gain?

### 5. Three guards that could not fail, and their repairs

This is the highest-value section, because it is where round 15's own repairs are most likely to have the
defect they were repairing.

- **the corpus count** now reads every numeral adjacent to the word and requires four sites. Can it still
  pass over a wrong number, or does it now fail on a legitimate rewording?
- **class C** is a roster of two cells, each named with its own reason in the record. Is the roster
  checkable in both directions — a member with no reason, a reason with no member?
- **the retracted-claims guard** reads this stage's source files as well as `.qfai/**`, with the
  quote-balance rule scoped to prose. Re-grep for the retracted claims yourself. `RETRACTED` has thirteen
  needles more than it had two rounds ago; is any of them inert, and is any refuted claim standing where
  none of them matches?
- **the Delta Rejected Guard tie** took two vacuous attempts before it worked: the first sliced to the end
  of the file, the second read prose where every file is also named. It reads the table's first column
  now. Is the third version sound?
- **the callsite guard** derives its walk roots from the `e2e` project's include list. Verify.

### 6. The record

- Every count. `## P7 quality gates` claims e2e 1445, integration+unit 1219, callsites 881;
  `validate --profile full` is re-measured at `error=50` with 45 `QFAI-REVIEW-007`.
- The verdict table that stopped at round 12 is deleted rather than extended. Is anything lost that
  `### Findings per round` does not carry?
- `CR-20260820-0012` and `DR-0017-0010` both had stale measurements corrected in place, dated rather than
  deleted. Is the dating honest, and did the correction change any decision either file records?
- The scoped gate: `info=2 warning=0 error=1`, `QFAI-ATDD-112` on eight TCs.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260822090000000/R0N_<role>.md`, in small appends rather than one large
heredoc — a spawn limit killed a report mid-write in round 11.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop.
