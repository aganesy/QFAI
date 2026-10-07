# Placeholder Scan

Read when the placeholder scan reports a hit.

## What the placeholder scan does not flag

**`OQ` and `OPEN QUESTION` are exempt only as tracking structure.** Exempt: the `Open Questions` heading, a register
table header, and a question row containing the fields required by its register. Story-tree `open-questions.md` uses
`ID | Content | Approach | Status`; an empty register contains the heading and table header without a question row.
Discussion registers use their own template fields. A register row's Status is structure too: `TODO` in the Status cell of a
`decisions.md` or `open-questions.md` row is the row's state, not a placeholder. Article II and `.qfai/assistant/rule/workflow.md` both end an
unverifiable fact by recording an Open Question, so the tracked record they prescribe must never be reported as an
unresolved placeholder. Everywhere else the two strings are still scanned: a bare `OQ` or `OPEN QUESTION` left as a
value in generated spec prose or a contract field, or a row missing a required field, is a hit like any other token.

**A documented `TBD` is a compliant record.** `.qfai/assistant/rule/constitution.md` Article II and `.qfai/assistant/rule/thinking.md` require writing `TBD` together with a note of what evidence is missing, and `.qfai/assistant/rule/thinking.md` requires raising the matching Open Question for the same fact. Both halves together are the finished form, not an
unfinished one; do not report it and do not delete it — deleting it destroys the record of the missing evidence, which is the whole point of the marker. A `TBD` missing either half — no note, or no Open Question — is a hit.

## What a surviving hit obligates

A hit is **reported, not silently cleared**, and **cleared by a re-scan, not by assertion**. Fix what you can, then run the scan again over the same artifacts: _resolved_ is the verdict for a hit the re-run no longer reports, and that re-run is its evidence. It is not available for a hit still present at that file and line — a token still readable there is unresolved whatever the report
calls it. List every hit the re-scan still finds alongside the completion claim — file, line, token — and state for each one whether it is deferred with rationale or recorded as an Open Question. A completion claim that omits a surviving hit is invalid evidence under the rules above. Completion is blocked while a surviving hit is neither of the two.

**Severity floor on the verdict.** _Deferred with rationale_ and _recorded as an Open Question_ are NOT available for a hit that stands in for a concrete security defect, data loss or corruption, or a correctness defect that would break a released contract. Such a hit is cleared only by a named fix or by dropping the item from scope; recording it and declaring completion anyway is
prohibited, exactly as `.qfai/assistant/rule/shared-skill-delegation-baseline.md` withholds that same exit for that same class. While neither of the two remaining verdicts applies, completion stays blocked.
