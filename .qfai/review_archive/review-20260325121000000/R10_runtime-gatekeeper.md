# R10 — Runtime Gatekeeper

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Backward compatibility guarantee is stated as a hard requirement (REQ-0014, NFR-0002): non-UI packs produce zero new issues
- [x] New validators short-circuit on `isUiBearing === false`; no risk of false activation on non-UI packs
- [x] Old packs (pre-v1.7.0) are explicitly excluded from retroactive validation; the short-circuit also covers historical packs
- [x] Single-PR delivery constraint (OC-1) prevents partial state in production: either all validators ship together or none do
- [x] npm publish path is described: merge to `main` → `npm publish`; version bump and CHANGELOG in same changeset
- [x] Operational policy states no manual post-merge steps beyond `npm publish`
- [x] No new runtime dependencies (TC-5); no additional packages to audit or pin before publish
- [x] No new CLI commands (OC-3); no surface area expansion for the publish artifact
- [x] Unit test requirement with 100% branch coverage (NFR-0004) ensures validator logic correctness before publish
- [x] Regression test requirement against existing v1.6.5 fixtures (10_Policy.md) provides a rollback signal
- [ ] No rollback strategy is defined for the case where v1.7.0 is published to npm and a post-publish defect is discovered in the new validators (e.g., false positives on non-UI packs that pass CI but fail in the field)
- [ ] The `npm publish` step has no pre-publish verification gate specified (e.g., running `qfai validate` on the reference discussion pack as a publish pre-condition)
- [ ] The single-PR constraint (OC-1) means a defect discovered in any component (validators, templates, docs, tests) blocks the entire release; there is no partial-ship contingency for critical-path items

## Findings

1. **[High] No rollback strategy defined**: The discussion pack specifies a forward-only release path: single PR to main, npm publish. No document addresses what happens if v1.7.0 is published and a defect is found post-publish — specifically a defect that causes false positive errors on packs that were previously valid. For an open-source CLI tool with external consumers, a false positive that blocks previously-valid packs is a breaking change. The operational policy (10_Policy.md) describes deployment but contains no rollback, hotfix, or yanking procedure. Recommended action: add a rollback clause to `10_Policy.md` specifying at minimum: (a) conditions that warrant an `npm unpublish` or `npm deprecate` of v1.7.0, and (b) the hotfix branch strategy (e.g., `hotfix/v1.7.1` from `main` with expedited review).

2. **[Medium] No pre-publish validation gate**: The v1.7.0 release process specifies merge → `npm publish` with no intermediate validation step. A CI gate on the PR (tests passing) is implied but not explicitly stated as the only condition for merge eligibility beyond the review roster PASS. If the CI definition does not include running `qfai validate` against a reference pack (including a UI-bearing fixture that exercises all new validators), a publish could proceed with validators that pass unit tests but fail on real-world pack structures. Recommended action: add a `pre-publish` verification step to the deployment procedure in `10_Policy.md`: run `qfai validate` on the reference v1.7.0 discussion pack as a publish gate; if errors are found, block publish.

3. **[Medium] Single-PR constraint creates all-or-nothing release risk**: OC-1 mandates that validators, templates, docs, and tests all ship in one PR. This reduces partial-state risk (the primary benefit) but also means any component failure blocks the entire release. If, for example, NFR-0004 (100% branch coverage) cannot be achieved for one of the seven new validators near the target date, the entire release is blocked. There is no defined procedure for granting an exception or narrowing scope under time pressure. Given that v1.7.1+ have a sequential dependency on v1.7.0 (as stated in `09_Constraints.md` Timeline section), an indefinite block on v1.7.0 cascades. Recommended action: document in `10_Policy.md` that scope reduction (moving a non-critical validator to v1.7.1) is the approved response to a blocking component failure, and define which validators are critical-path vs. deferrable.

4. **[Low] UI-bearing detection change from keyword-only to artifact/section presence has no migration guidance for pack authors**: OQ-0001 resolved to artifact/section presence detection (Option B). The current v1.6.5 implementation uses keyword matching (per `01_Context.md` line: "UI-bearing detection: presence of keywords `screen|ui|interface|mock|layout|design` in `03_Story-Workshop.md`"). If v1.7.0 changes the detection mechanism, packs that rely on keyword matching to trigger or avoid UI-bearing classification will behave differently under v1.7.0. TC-1 guarantees backward compatibility for packs that were valid under v1.6.5, but packs that were borderline (keyword match but no actual DDP artifacts) could change classification. No communication or migration note is provided for this behavioral change. This is operational risk for existing users upgrading from v1.6.5 to v1.7.0.

5. **[Low] CHANGELOG update is required in same changeset (OC-2) but format is unspecified**: OC-2 and the deployment policy both require a CHANGELOG update in the v1.7.0 PR. The CHANGELOG format (Keep a Changelog, conventional commits, custom) is not specified. This creates variability in what "CHANGELOG updated" means as a review criterion. Consistent with the spirit of NFR-0005 (documentation in same PR), the CHANGELOG entry should cover all new validator codes, template changes, and behavior changes affecting existing users. A missing or minimal CHANGELOG entry after publish is an operational risk for users consuming the package.

6. **[Pass] No new runtime dependencies confirmed**: TC-5 is explicitly stated and the technical implementation guidance (YAML parsing via existing deps or Node built-ins) is consistent. npm publish artifact will not introduce new transitive dependency audit requirements.

7. **[Pass] Error severity gates CI correctly by design**: The decision to use `error` severity (not `warning`) for all new structural checks means CI exit code 1 is guaranteed on any UI-bearing pack missing structural requirements. This is the correct runtime gating mechanism. The `qualityProfile` infrastructure being preserved but not active as a gate (OQ-0007 resolution) means no configuration path can silently downgrade structural errors in production.

## Verdict

**FAIL**

Finding 1 (no rollback strategy) is a high-severity operational gap that is standard practice for any npm package release and must be addressed before publish. Finding 2 (no pre-publish validation gate) is a medium-severity process gap. Finding 3 (single-PR all-or-nothing risk) requires a contingency clause.

**Required fixes**:

1. Add a rollback clause to `10_Policy.md` covering npm deprecate/unpublish conditions and the hotfix branch strategy for post-publish defects.
2. Add a pre-publish validation step to the deployment procedure: `qfai validate` must pass on a reference UI-bearing pack before `npm publish` is executed.
3. Add a scope-reduction contingency clause to `10_Policy.md`: define which validators are critical-path (must ship in v1.7.0) and which are deferrable to v1.7.1 if a blocking component failure occurs near the release target.
