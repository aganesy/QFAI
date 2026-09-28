# Completion

What the run checks, reports and declares once the steps are done.

## Checkpoints

- [ ] Repository analysis completed (frameworks, test layout, naming rules).
- [ ] Project-owned policy and contract files updated with evidence or `TBD`.
- [ ] Standard commands recorded only in `03_contract/tech.md`.
- [ ] Proposed include/exclude globs with rationale.
- [ ] `qfai.config.yaml` updated (minimal diff).
- [ ] BF, AC, and EX test layers inspected.
- [ ] Evidence: sample matched files listed.

## Output

Provide:

1. Updated `qfai.config.yaml` (diff or full file, as appropriate).
2. Updated project-owned policy and contract files (diff or summary).
3. A short summary of changes and rationale.
4. Validation checklist with sampled files.
5. If routing or review profiles changed, list each whole-entry override and its reason.
6. Open questions (blocking vs non-blocking).

Suggest next step: `/qfai-discussion` (or rerun `/qfai-configure` if configuration is not ready).

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions, project context, `decisions.md`, and any applicable story.
- DEC IDs referenced (or "none" when no decision applies).
- Confirmation that no rejected option was reintroduced.

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not modify the config.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `.qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations`; questions about this skill's own inputs or settings stay in its own output for the user to answer. This skill does not write `open-questions.md`.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-discussion`.
  Action: run it to formalize requirements from the configured project context.
- Discussion needs more input: rerun `/qfai-discussion`.
  Action: collect missing scope, constraints, and assumptions first.
- Configuration needs refinement: rerun `/qfai-configure`.
  Action: provide additional include/exclude evidence and update `qfai.config.yaml`.
