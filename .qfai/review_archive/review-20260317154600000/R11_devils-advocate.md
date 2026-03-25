# Review: Devil's Advocate

## Target

- Pack: `.qfai/discussion/discussion-20260317153106326/`
- Scope: discussion
- Version: v1.6.1

## Verdict: PASS

## Checklist

- [x] Every assumption challenged
- [x] Concrete alternative provided for each issue raised

## Findings

1. **Challenge: "All Phase 2 checks as error severity is premature."**
   Premise: REQ-0013 mandates all Phase 2 checks at error severity. For a v1.6.1 release immediately following v1.6.0, this could create adoption friction -- users who just adopted v1.6.0 will immediately face new blocking errors on upgrade.
   Assessment: The pack addresses this directly. POL-Q001 provides the rationale (completion fraud prevention), and the trade-off is explicitly documented in Inception Deck section 8 ("Strictness vs backwards-compat: Strictness wins"). Risk #1 and #3 acknowledge the migration burden with concrete mitigations (clear error messages, DR-ID/Evidence can start empty for non-exception rows). NFR-0001 preserves the graceful path for specs without test-list.md entirely. **Advisory observation only -- the decision is deliberate and well-reasoned.**

2. **Challenge: "The 5 failure modes are not exhaustive -- why stop here?"**
   Premise: There are additional failure modes not covered (selector orphans, evidence contract, watch-it-fail audit). Stopping at 5 is arbitrary.
   Assessment: The pack explicitly names 9 out-of-scope items in 05_Scope.md with deferral to v1.6.2. Inception Deck section 8 documents the trade-off ("Breadth wins: five distinct failure modes at basic level"). NFR-0006 makes scope control measurable. The boundary is not arbitrary -- it is the set of checks that prevent completion fraud, which is the stated purpose in 01_Context.md. **Advisory observation only -- scope is intentionally bounded.**

3. **Challenge: "TC Layer filtering trusts 06_Test-Cases.md blindly -- what if Layer is wrong?"**
   Premise: REQ-0014 filters TCs by Layer=unit|component from 06_Test-Cases.md. If a user mislabels a unit test as "integration", the TC will escape coverage checking entirely.
   Assessment: This is a valid concern. However, the alternative -- checking all layers -- was explicitly considered and rejected (R-003 in 99_delta.md) because integration/E2E TCs are tracked via the ATDD ledger, not test-list.md. The correct fix for mislabeled layers is upstream (ensure Layer accuracy in 06_Test-Cases.md), which is outside the scope of test-list.md validation. A future enhancement could cross-validate Layer consistency, but that is appropriately deferred. **Advisory observation -- the pack acknowledges the dependency and scopes it correctly.**

4. **Challenge: "Case sensitivity for duplicate TDD-ID detection is unresolved."**
   Premise: US-D004 Example Seed #4 raises the question of TDD-0001 vs tdd-0001 and recommends case-insensitive comparison, but this is not codified in any REQ.
   Assessment: This is a genuine gap in the requirements. The seed identifies the issue but REQ-0004 does not specify case sensitivity behavior.
   Concrete alternative: Add a note to REQ-0004 specifying case-insensitive comparison for TDD-ID duplicate detection, consistent with the Example Seed recommendation. This is a minor documentation addition that does not change scope. **Advisory observation -- recommend adding case-sensitivity specification to REQ-0004 during spec phase.**

5. **Challenge: "Single PR policy (POL-V001) creates all-or-nothing risk."**
   Premise: NFR-0005 and CON-O001 mandate a single PR for all changes. If one component (e.g., report coverage visualization) is delayed, the entire release is blocked.
   Assessment: This is a deliberate trade-off for atomic traceability. The scope is small enough (5 checks + report + template + docs + tests) that the single-PR approach is manageable. The alternative -- multi-PR release -- would create half-migrated states that NFR-0005 explicitly forbids. **Advisory observation only -- the trade-off is appropriate for this scope size.**

6. **Challenge: "US-D004 maps to wrong failure mode (F-6103 instead of F-6104)."**
   Premise: In 03_Story-Workshop.md, US-D004 (Duplicate ID Check) references F-6103 (Test File Missing). According to 06_REQ.md, TDDLIST_DUPLICATE_ID is F-6104.
   Assessment: This is a factual inconsistency in the story table. The actual requirements and error codes in 06_REQ.md are correct, so the impact is limited to the story mapping table.
   Concrete alternative: Correct US-D004's Failure Mode column from F-6103 to F-6104 in 03_Story-Workshop.md. **Advisory observation -- minor typo, does not affect spec or implementation.**

## Notes

- This discussion pack is unusually well-structured. The challenge surface is small because most foreseeable objections are already addressed in the pack itself (trade-off tables, rejected options, explicit anti-goals, migration policies).
- The two actionable items (case-sensitivity spec for REQ-0004, US-D004 failure mode typo) are both minor and can be addressed during the spec phase without blocking.
- Overall, the pack demonstrates disciplined scope control, complete OQ resolution (4/4 resolved, 0 open, 0 deferred), and consistent traceability across all 15 documents.
