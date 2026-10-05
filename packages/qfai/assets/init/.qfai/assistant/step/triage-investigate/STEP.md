---
name: triage-investigate
owner: qfai-triage
purpose: "Investigate a question the documents do not answer by reading internals, history and outside facts, without changing any tracked file."
requires: []
roles: [discovery-analyst, frontend-engineer, backend-engineer]
routing-profile: default
---

# triage-investigate

Finds the facts an answer needs when the documents do not state them: why the
code behaves as it does, when it changed, or what an outside source says.

## Passes when

Read first: the request and the documents it cites. The step passes when those
documents already answer the question, so `triage-answer` needs no
investigation. The pass names the documents read.

## Reads

- The question.
- The code and its history in version control.
- Outside sources the question names, such as a standard or a dependency's
  documentation.

## Procedure

1. List what has to be known to answer the question.
2. Establish each fact by reading, and note where it was read. Running a
   command that only reads is allowed; editing, installing or committing is
   not.
3. Hand the facts, with their sources, to `triage-answer`.
4. Where the facts show a defect rather than an answer, report the outcome
   `defect-found` with an extraction of the request as a defect report, so the
   decision rules route it again. The stage ends there: `triage-answer` and
   `triage-close` do not run, and the result carries no `closure`.

## What it writes

- No file git tracks. A record it writes that git ignores is named in
  `artifactRefs`, not in `changedFiles`.
- The facts and their sources. A found defect carries `branch` as
  `{ outcome: defect-found, extraction }`.

## Gate

The reviewer, or the stage worker where the work order names none, confirms each fact names where it was read, nothing was changed
to learn it, and a defect found is reported rather than fixed.
