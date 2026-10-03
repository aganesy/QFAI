---
name: triage-answer
owner: qfai-triage
purpose: "Answer the request's question, citing the documents, code or diagnosis evidence that shows the answer, without changing any tracked file."
requires: []
roles: [discovery-analyst, completion-reviewer]
routing-profile: default
---

# triage-answer

Answers a question about the project from what the project already says.

## Reads

- The question.
- The documents, code and tests that bear on it.
- The findings of `triage-investigate` or the diagnosis record, where one ran.

## Procedure

1. State the answer in the operator's terms.
2. Cite each source it rests on: a document section, a file and line, or an
   evidence record. An answer with no source is a guess, and is not given.
3. Where a source is missing or wrong, such as an option the documentation
   never mentions, record it as a follow-up for `triage-close`. Do not fix it
   here.

## What it writes

- No file git tracks. A record it writes that git ignores is named in
  `artifactRefs`, not in `changedFiles`.
- The answer with its citations, and each follow-up found, in the result and
  the report.

## Gate

The reviewer, or the stage worker where the work order names none, confirms every claim in the answer has a citation that says it,
each gap found is listed as a follow-up, and no tracked file changed.
