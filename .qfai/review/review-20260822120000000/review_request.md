# Review request — round 17, spec-0017, stage gates only

**Revision under review:** the commit that adds this file. Record `git rev-parse --short HEAD` at start and
finish; if it moves while you work, say so.

**Routing:** `implementation-reviewer`, `completion-reviewer`, `qa-gatekeeper` (stage). **P1d is closed** —
it passed at round 7, revision `9a37421c`, on `DR-0017-0010`. Do not re-open it. If you find a stale
supporting measurement inside that file, correct the measurement and say so; do not re-open the decision.

## What this round is for

Round 16's repairs, and two things the stage did without being asked, which no reviewer has seen.

Four rounds found four execution channels the same way — a key is enumerated, and until something reads
its VALUE, appearing is all that is checked. Rather than wait for the fifth, the stage pinned the whole
shape: a workflow minus its jobs, a job minus its steps, and every step with its `run:` body as a digest.
That subsumed three earlier pins, which are deleted. **It is one commit old and it is the boundary.**

## Two rules about who may write

- **Plants are partitioned by role.** `qa-gatekeeper` owns
  `packages/qfai/assets/init/root/.github/workflows/` and is the only role that may write there. Both
  siblings should report a plant they see rather than measure through it, and re-take tree readings from
  `git show HEAD:<path>` — that worked in rounds 15 and 16.
- **The stage does not edit the subject while this round runs.**

**Two documented traps.** Running the validate command OR `vitest run` rewrites `.qfai/report/validate.log`,
which is tracked; restore it with `git show HEAD:<path> > <path>`, never `git checkout`. And
`tests/e2e/spec0017RunnerParallelismE2E.test.ts` only passes under `pnpm -C packages/qfai exec vitest`:
invoked through `node node_modules/vitest/vitest.mjs` it fails to resolve `vitest/config` in its fixture,
which looks exactly like a regression and is not one.

### 1. The shape pins, which are the boundary now

`ALLOWED_WORKFLOW_SHAPE`, `ALLOWED_JOB_SHAPE`, `ALLOWED_STEP_SHAPE`.

- **What executes that is outside all three?** They cover `.github/workflows/**`. `qfai init` ships more
  than workflows. A composite action, a `package.json` script, an `.npmrc`, a git hook, a devcontainer —
  anything the shipped tree carries that CI or a developer runs is out of scope of every pin in this file,
  and the previous four channels were each found by asking a smaller version of this question.
- The step shape reduces `run:` to a digest and compares the rest as canonical JSON. Is `JSON.stringify`
  over a parsed YAML node stable enough to be a boundary — anchors, aliases, merge keys, a key order the
  parser normalizes, a number that round-trips differently?
- Three pins collapsed into one across three rounds because each was a projection of the document. Is
  this one a projection too?

### 2. The lexer, after round 16

`commandsOf` now takes three decisions from `codeMask` rather than the raw text — the noclobber `>|`, the
redirection `&`, and where a comment may start. Seven spellings ran a real build past the previous rules.

- Find an eighth. The mask itself is a flat quote tracker with no model of `$( … )`; `commandsOf` handles
  substitutions separately. Do the two disagree anywhere?
- The here-document was rewritten twice in two rounds: the data is skipped at the newline now, and the
  closer's character class was escaping nothing. Nested here-documents on one line, a here-document inside
  a substitution, a delimiter that appears in its own body, `<<-` with tabs.
- `withoutRedirections` removes by offset, right to left, after `String.replace` was found taking the
  first occurrence. Overlapping spans, a redirection inside a substitution.

### 3. The three guards that could not fail, repaired twice

Round 15 repaired them; round 16 found all three still failing in the direction they were repaired for.
They are repaired again: the corpus count strips emphasis and reads its site count from a sentence the
record now carries, the Delta tie excludes fences and requires a table row, class C's roster is checked
both ways, `GOVERNANCE` covers every file this stage wrote except the guard's own list.

- Break each one. A wrong number that passes, or a legitimate edit that fails.
- The `GOVERNANCE` self-exclusion: is there a claim it now hides?
- The depth-score pin was defeated by `\*\*` being an escaped backslash and a quantifier. **Two doubled
  escapes were found this round by extracting a regex from the file's own bytes and evaluating it.** Do
  that to the others: a pattern that reads correctly can escape nothing.

### 4. The record

- Every count. `## P7 quality gates` claims e2e 1445, integration+unit 1219, callsites 881;
  `--profile full` is `error=49` with 44 `QFAI-REVIEW-007`.
- Two corrections this stage made to its own round-15 corrections are recorded rather than quietly fixed:
  a figure measured before the repair that changed it, and an in-place CR edit that withdrew the premise
  of a bullet two files cite. Are both accounts accurate, and is the ground option 2 now rests on sound?
- `revision_form` is recorded as an open question rather than a fix, because the repair relabelled a
  commit sha rather than correcting it. Is that the honest reading?
- The scoped gate: `info=2 warning=0 error=1`, `QFAI-ATDD-112` on eight TCs, each with a recorded reason.

## Definition of the verdict

`PASS` only if you can state a gate that passed. `REVISE` otherwise, with findings as `B*` / `M*` / `m*` /
`A*` level-3 headings so `summary.json` derives from them by the pack's rule: distinct finding identifiers
appearing as a heading at level two to four, optionally backtick-wrapped.

Write to `.qfai/review/review-20260822120000000/R0N_<role>.md`, in small appends rather than one large
heredoc — a spawn limit killed a report mid-write in round 11.

**Do not modify the subject.** Plant, measure, restore what you planted from a copy you made first, and
report. If a plant cannot be restored, say which file and stop.
