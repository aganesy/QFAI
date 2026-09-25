# 03 Acceptance Criteria

## AC-0010-0001

Given a UI-bearing discussion pack, when sidecar generation completes, then `uiux/40_screen_contracts.md` and `uiux/50_review_input_bundle.md` exist, and none of the legacy sidecars AC-0010-0008 forbids is written. Brand-level inputs are in root `DESIGN.md`, which `/qfai-sdd` Phase 0 authors from the direction AC-0010-0007 records, not in a sidecar.

## AC-0010-0005

Given `50_review_input_bundle.md`, when validated, then it documents best-of-history handling.

## AC-0010-0006

Given a UI-bearing discussion pack, when inspected, then its screen explorations are carried unranked, it declares no final design system, and the only direction it records is the brand direction the user chose.

## AC-0010-0007: Design direction recorded for `/qfai-sdd` Phase 0

- Given a `/qfai-discussion` run whose classified surfaces, primary or secondary, include `web`, `mobile`, `desktop` or `mixed`,
- When the discussion pack is finalized,
- Then `01_Context.md#Design Direction` names the adopted theme and who chose it, and discussion writes no root `DESIGN.md`: `/qfai-sdd` Phase 0 authors that file from the recorded direction.

## AC-0010-0008: legacy sidecars not emitted

- Given a fresh `/qfai-discussion` UI-bearing run,
- When the produced sidecars are listed,
- Then `33_exploration_rubric.md`, `34_evaluator_calibration.md`, `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md` are NOT created. Producing them is a regression and triggers the skill validator under this spec.

## AC-0010-0009: Mock template default + strict validator (anchor-form)

- US-Refs: US-0010-0011
- Given the shipped `qfai-discussion` mock template and SKILL.md authoring guidance,
- When an HTML mock is authored in `03_Story-Workshop.md`,
- Then the template-emitted links are anchor-form (`<a href="#<name>">`) and SKILL.md instructs anchor-form authoring; `QFAI-MOCK-010` continues to PASS anchor hrefs (`#name`) and external `http(s)://` hrefs, and same-origin absolute hrefs (`/path/`) are NOT emitted by the template.

## AC-0010-0010: Mock template ↔ validator SSOT-sync (`R-MOCK-HREF-DRIFT`)

- US-Refs: US-0010-0011
- Given the template ↔ `QFAI-MOCK-010` validator SSOT-sync pair (Pair V),
- When one side is edited without the matching update to the other,
- Then the Reviewer-Gate finding `R-MOCK-HREF-DRIFT` (severity error) fires naming the asymmetric edit.

## AC-0010-0011: `/qfai-discussion` writes the active session pointer

- US-Refs: US-0010-0012
- Given a `/qfai-discussion` run finalizing a pack,
- When the pack is finalized,
- Then `.qfai/state.json#discussion.currentId` is set to the just-authored pack ID (the single SSOT for the active session); `qfai discussion list --active` reads this value rather than inferring from filesystem timestamps.

## AC-0010-0012: Multiple-active ambiguity rejected with recovery guidance

- US-Refs: US-0010-0012
- Given `.qfai/state.json#discussion.currentId` is absent OR resolves to a missing/duplicate pack,
- When the active pointer is resolved,
- Then an error is raised naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`); the active session is NOT inferred from mtime.

## AC-0010-0013: An orchestrated discussion asks only what the run has not settled

- US-Refs: US-0010-0013

```gherkin
# AC-0010-0013
# Source: discussion-20260923171450572#REQ-0055
Scenario: A discussion stage does not re-ask a settled decision
  Given a discussion work order whose settled field lists the checked route proposal and the answered questions
  When the discussion stage runs
  Then it covers only the scope that settled leaves unresolved
  And it asks no question settled already answers
```

## AC-0010-0014: The discussion skill hands over or works its order

- US-Refs: US-0010-0013

```gherkin
# AC-0010-0014
# Source: discussion-20260923171450572#REQ-0051
Scenario: The entry check of qfai-discussion
  Given workflow mode active
  When qfai-discussion starts with no name invocation and no work order
  Then it edits nothing and passes the request to qfai-run
  And with a valid work order it does only that work
  And its SKILL.md cites references/orchestrated-mode.md with one line
```

## AC-0010-0015: The discussion skill declares its operations

- US-Refs: US-0010-0013

```gherkin
# AC-0010-0015
# Source: discussion-20260923171450572#REQ-0052
Scenario: The Operations table of qfai-discussion
  Given references/orchestrated-mode.md of qfai-discussion
  When its Operations table is read
  Then it lists exactly the operations the workflow vocabulary assigns to qfai-discussion
```
