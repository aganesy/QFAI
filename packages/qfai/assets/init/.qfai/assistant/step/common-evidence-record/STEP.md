---
name: common-evidence-record
owner: common
purpose: "Open and keep the stage's evidence file: the gate commands and their results, the reviewer verdicts and the Work Orders Summary a reviewer reads to check the stage."
requires: []
roles: []
---

# common-evidence-record

A stage's evidence is the record its reviewer checks. A completion claim that
the evidence does not carry is not evidence: a command without its result, a
result without its revision, or a status with nothing behind it.

## Where it goes

Evidence lives under `.qfai/evidence/`, stays local and is never committed
(`.qfai/assistant/rule/drift-protocol.md#evidence-stays-local`). Reviewers read
it in the working tree.

| Owner              | File                                         | Keyed by                              | Template                                                                     |
| ------------------ | -------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `qfai-discussion`  | `discussion-<YYYYMMDDhhmmssSSS>.md`          | the run's stamp, shared with its pack | —                                                                            |
| `qfai-sdd`         | `sdd-BF-NNNN.md`, one per affected flow      | business flow                         | `.qfai/assistant/skill/qfai-sdd/templates/evidence/sdd-flow.md`              |
| `qfai-sdd` import  | `import-lite-<YYYYMMDDhhmmssSSS>.md`         | a fresh stamp, never reused           | `.qfai/assistant/skill/qfai-sdd/templates/evidence/import-lite.md`           |
| `qfai-atdd`        | `atdd-BF-NNNN.md`                            | business flow                         | —                                                                            |
| `qfai-implement`   | `implement-BF-NNNN.md`                       | business flow, then example           | `.qfai/assistant/skill/qfai-implement/references/round-evidence.md`          |
| `qfai-verify`      | `verify-<run-id>.md`                         | run                                   | `.qfai/assistant/skill/qfai-verify/templates/verify-evidence.md`             |
| `qfai-prototyping` | `prototyping/**`                             | loop and iteration                    | `.qfai/assistant/skill/qfai-prototyping/references/evidence-requirements.md` |
| `qfai-maintain`    | none — the stage result carries its receipts | —                                     | —                                                                            |

**Open the file before the stage writes anything else.** A record with nowhere
to go until the artifact exists can only be written afterwards, and some
records — a research summary, a grilling session's end — must be written first.

A flow-keyed file is updated in place across invocations and across the stages
that share it. Keep each invocation's entries distinguishable by its run start,
and never relabel an earlier entry as current.

## What every file carries

Sections a template names are required in its order. A section with nothing to
record says `none` with the reason; deleting the heading is a gap, not a pass.

- **Objective and inputs.** The target — flow, story slot, pack or run — and the
  sources read, as paths precise enough to open.
- **Decisions and open questions.** The `decisions.md` and `open-questions.md`
  IDs the stage appended or relied on, or `none`.
- **Grilling.** The section `common-grilling-record` writes, where the stage ran
  or skipped a session.
- **Work Orders Summary.** The shared schema,
  `.qfai/assistant/rule/shared-skill-delegation-baseline.md#work-orders-summary`:
  one row per delegated task, naming the agent instance, with
  `Status (PASS/REVISE/PENDING)`. `PENDING` never counts as a pass.
- **Gate results.** For each gate: the exact command, exit code, the counts or
  outcome, the revision it ran against, and the run log location. A validate
  run records `<paths.outDir>/validate.log` and the `run-*/` directory its
  `run_log:` line names. `common-gate-run` produces these.
- **Reviewer results.** One line per reviewer: role, verdict, reviewed revision,
  and the pack path where the stage writes a pack
  (`common-review-cycle`).
- **Open risks.** Every finding left unresolved, with its owner.
- **Final status.** `PASS` or `REVISE`, with the evidence-based reason.

## Rules

- **A command and its result, or nothing.** "Seems fine" is not a result.
  Evidence without a command and result pair does not prove a gate.
- **Every run of a gate is recorded, in order.** Reporting only the run that
  passed is selective reporting
  (`.qfai/assistant/rule/shared-skill-operating-baseline.md#nondeterministic-gates`).
- **Multi-line output goes in a fenced block** longer than any fence the output
  itself prints, so a heading in the output cannot end the section. Keep the
  command and output verbatim.
- **Revisions name commits, not times.** Use the git revision of a clean tree,
  and commit before observing: an uncommitted tree has no revision.
- **A record defect is repaired in a new entry.** It never edits a finished review
  pack. The queue that drains such defects is
  `.qfai/assistant/rule/drift-protocol.md#the-record-defect-queue`.
- **What must outlast the work goes elsewhere**: the story tree, the
  `decisions.md` and `open-questions.md` rows, and the tests.

## Gate

The file exists at its path, every required section is present and filled or
justified as `none`, and every gate result pairs a command with its result and
revision. The completion reviewer reads this before any verdict.
