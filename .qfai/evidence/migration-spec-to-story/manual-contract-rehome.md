# Manual contract placement corrections

Step 4 fixed `plan.yaml` and `id-map.json`. These files retain the planned
destinations below. The current contract rules were placed through SDD under
the single owner that states their behavior. The migration owner and delivery
owner accepted the corrected destinations after comparing the archived rule
text, current story examples and contract index. The old rule sections may be
removed only after archive SHA-256 and new BR-to-EX references match
`tmp/p7-region-a-br-audit.csv`.

| Old rule | New rule | Planned destination | Accepted destination | Reason | New example |
| --- | --- | --- | --- | --- | --- |
| BR-0004-0029 | BR-0127 | `cli/qfai-validate.md` | `cli/qfai-prototyping.md` | `qfai prototyping certify` consumes the profile-specific validation pointer; its command contract owns certification. | EX-0001-0049-03, EX-0001-0049-04 |
| BR-0008-0003 | BR-0212 | `cli/qfai-validate.md` | `cli/delivery-workflow.md` | Test volume guides ATDD planning; BF and AC coverage is the delivery completion gate. | EX-0001-0069-03 |
| BR-0008-0004 | BR-0213 | `cli/assistant-routing.md` | `cli/delivery-workflow.md` | ATDD implementation and independent reviewer approval are a delivery handoff. | EX-0001-0073-03 |
| BR-0012-0029 | BR-0269 | `cli/qfai-prototyping-iterate.md` | `cli/qfai-prototyping.md` | The ten-cycle budget is a shared core, validation and skill rule. | EX-0001-0127-01, EX-0001-0127-02, EX-0001-0127-03, EX-0001-0127-04 |
| BR-0012-0036 | BR-0276 | `cli/qfai-prototyping-iterate.md` | `cli/qfai-prototyping.md` | `certify` consumes the frozen UI contract scope and accepted review payloads. | EX-0001-0124-04 |
| BR-0012-0040 | BR-0280 | `cli/qfai-prototyping-iterate.md` | `cli/qfai-prototyping.md` | Cycle-0 frozen UI contract and license data is shared by iteration, certification and license validation. | EX-0001-0125-05, EX-0001-0126-01 |

Both accepted contract files have exactly one entry in
`03_contract/contracts.md`. Each new BR occurs once in the CLI contract tree,
and each listed EX exists under a live AC. The full old source files remain
preserved under `retired/spec-0004/04_Business-Rules.md` and
`retired/spec-0008/04_Business-Rules.md`; the audit CSV records their hashes,
old section lines and exact source-section equality. No old plan or ID mapping
was changed to hide the correction.
