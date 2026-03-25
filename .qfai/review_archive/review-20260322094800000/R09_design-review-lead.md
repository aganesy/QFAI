# R09: design-review-lead

## Reviewer

- ID: design-review-lead
- Name: Design Review Lead

## Scope

spec-0017 (Copilot Review Instructions Distribution) — SDD review: design patterns, architecture alignment with existing QFAI conventions

## Verdict

PASS

## Findings

1. **create-only pattern consistency**: The spec correctly adopts the established create-only pattern used by `copyTemplateTree` (root assets) and `copilot-instructions.md`. BR-0017-0001 defines file-existence-based skip, and BR-0017-0010 explicitly handles the 0-byte edge case. This is consistent with existing QFAI conventions where presence (not content) determines skip behavior.

2. **syncIntegrationWrappers integration (DR-0022)**: Placing instructions distribution inside `syncIntegrationWrappers` maintains the architectural invariant that all `.github/` mutations are consolidated in one function. This aligns with DR-0022's rationale and avoids splitting `.github/` generation across `copyTemplateTree` (rootAssets) and `syncIntegrationWrappers`. The delta document (09_delta.md) clearly documents the adoption rationale and rejected alternative.

3. **Asset management pattern (DR-0023)**: Using `packages/qfai/assets/init/.github/instructions/` for template storage follows the established pattern where `getInitAssetsDir()` resolves the asset root. The plan correctly notes that `package.json` `"files": ["assets"]` already covers the new directory. TC-0017-0009 validates asset discoverability.

4. **Force-disabled divergence (BR-0017-0002)**: The spec explicitly diverges from `copilot-instructions.md` (which respects `--force`) by making instructions always skip on existence. This is well-justified: instructions are team-customized review policies. The constraint TC-25 and the decision rationale in DR-0022 adequately document this divergence.

5. **SDD insertion marker (DR-0024, BR-0017-0007)**: The `<!-- qfai:language-rules -->` marker establishes a forward-compatible integration point for the deferred SDD language-rules feature. This follows a clean separation: spec-0017 handles placement, a future spec handles insertion. AC-0017-0012 and TC-0017-0009 validate marker presence.

6. **Report integration (BR-0017-0009)**: Instructions files are integrated into the existing `copied`/`skipped` arrays, ensuring the standard report mechanism displays them alongside other init artifacts. This is additive and non-breaking.

7. **Activation guidance (BR-0017-0008)**: The conditional stdout message (only when files are created, not when skipped) follows UX best practice of avoiding noise on idempotent re-runs. This was flagged as a gap in the discussion-phase devil's advocate review and has been addressed in the SDD.

8. **Traceability completeness**: All 14 ACs trace to USs, all 10 BRs trace to ACs and REQs, all 12 TCs trace to ACs and EXs, and all 5 DRs trace to OQs. The traceability chain is complete and consistent.

## Conclusion

The spec demonstrates strong alignment with existing QFAI design patterns (create-only protection, asset-based template management, syncIntegrationWrappers consolidation). Design decisions are well-documented with adoption rationale and rejected alternatives. The force-disabled divergence is explicitly justified. Forward-compatibility is ensured via the SDD insertion marker. No design concerns identified.
