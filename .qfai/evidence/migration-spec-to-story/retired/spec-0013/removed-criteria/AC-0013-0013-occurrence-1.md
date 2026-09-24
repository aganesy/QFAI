## AC-0013-0013: Spec Auto-Discovery Returns Diff Result Across Sources

Given a repository with spec / policy / contract / evidence files, when `detectSpecChanges` and `detectPolicyChanges` run against a base ref, then a `SpecDiffResult` is returned whose `entries` / `allSpecs` / `fullScan` fields are populated, `_policies/` modifications are detected separately, the configured `baseBranch` is honored, and old-style evidence files (predating the Diff Context section) parse without error. Consolidated from spec-0038 (Spec Auto-Discovery Protocol — 4-source unified diff detection); see 01_Spec.md In-scope bullet "Spec Auto-Discovery Protocol".

