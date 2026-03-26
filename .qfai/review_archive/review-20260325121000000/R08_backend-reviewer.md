# R08 — Backend Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] New validators are integrated into the existing `validate.ts` orchestrator (TC-3); no parallel pipeline introduced
- [x] Validator module placement is specified: extend `ddpValidation.ts` or add `discussionDesignHardening.ts` / `discussionDds.ts`; follows existing `issue()` helper pattern
- [x] Performance budget is defined: NFR-0001 ≤500ms delta over the full 15-file pack validation run
- [x] Performance measurement method is specified: `qfai validate --timing` benchmark with/without v1.7.0 validators
- [x] TypeScript 5.6.3 compatibility required (TC-4); no new language features beyond 5.6.3
- [x] No new runtime dependencies allowed (TC-5); YAML parsing for competitive ref registry must use existing deps or Node built-ins
- [x] Backward compatibility: non-UI packs produce zero new issues (NFR-0002, REQ-0014); all new validators short-circuit on `isUiBearing === false`
- [x] 100% branch coverage required for new validator logic (NFR-0004)
- [x] Error message quality requirement specified: each error must contain what failed, why required, and what to fix (NFR-0003)
- [x] Single-PR delivery constraint (OC-1): validators, tests, templates, and docs in one changeset
- [ ] The competitive reference registry in `04_Sources.md` is currently a free-form Markdown table, not a YAML block; the DDS section in `03_Story-Workshop.md` embeds competitive refs as a YAML fenced block; the parsing strategy for detecting `adopted_points`, `rejected_points`, and `local_translation` across these two different structural locations (Markdown table in `04_Sources.md` vs YAML in `03_Story-Workshop.md`) is not specified; a validator implementation must target one of these locations consistently
- [ ] The 500ms performance budget (NFR-0001) has no fallback or escalation path if implementation cannot achieve it; the NFR states only "must not add more than 500ms" with no contingency

## Findings

1. **[High] Competitive reference parsing location ambiguity**: `04_Sources.md` is the designated "competitive reference registry" per REQ-0005, but the actual `competitive_refs` block with `adopted`, `rejected`, and `local_translation` sub-fields is authored in the YAML fenced block inside `03_Story-Workshop.md` DDS section. REQ-0005 states: "`04_Sources.md` must include a `## Competitive Reference Registry` section." The validator QFAI-DDP-021 (per `01_Context.md` code numbering) or QFAI-DDP-017 (per the acceptance criteria in US-D004) must scan a specific file. These files serve different roles: `04_Sources.md` is the source traceability log; `03_Story-Workshop.md` DDS section is the design decision anchor. The current discussion pack authors both, but the validator target is underdetermined. Implementation authors targeting the wrong file will produce false negatives. Recommended fix: clarify in REQ-0005 whether the competitive ref validator targets `04_Sources.md`, `03_Story-Workshop.md`, or both, and update the Flow 1 description accordingly.

2. **[Medium] YAML parsing without a YAML library**: TC-5 forbids new runtime dependencies. The competitive ref fields (`adopted`, `rejected`, `local_translation`) are structured as YAML fenced blocks in `03_Story-Workshop.md`. Parsing YAML in a validator without a YAML library means the implementation must use regex or line-by-line string matching. This is feasible for simple key-presence checks but fragile for nested structures (e.g., `adopted` is a list of objects, each with `source`, `point`, `local_translation`). The discussion pack does not define the detection contract at this level of detail. If the validator uses regex matching on the raw text (e.g., `/^  local_translation:/m`), it may produce false positives from prose that happens to contain the word "local_translation". Recommended action: document the parsing contract in the REQ or the Flow descriptions, specifying whether the validator checks for heading/key presence by regex on raw text or requires a structured parse.

3. **[Medium] 500ms budget has no contingency or measurement baseline**: NFR-0001 requires ≤500ms total delta but does not specify the baseline pack size, machine specs, or what "representative 15-file discussion pack" means in terms of file sizes. A 15-file pack could range from minimal stubs to large packs with HTML mocks and YAML blocks. Without a defined baseline fixture, the 500ms budget is unverifiable. Additionally, if the budget is exceeded, the NFR provides no guidance on acceptable trade-offs (e.g., lazy evaluation, caching, parallelism). Recommended action: define the benchmark fixture and a reference machine spec in NFR-0001, or add a note that the budget will be validated against the reference pack provided in the test suite.

4. **[Low] `validate.ts` orchestrator modification requirement is implicit**: TC-3 states that new validators must be registered with `validate.ts` without modification to its dispatch logic. This implies the validator interface contract (input type, output type) is fully compatible. However, if the new validators require reading multiple files (e.g., both `03_Story-Workshop.md` and `04_Sources.md` in a single validator function), the existing orchestrator's file-passing pattern may need an extension. This is noted as a potential implementation friction point that the validator author should verify against the actual `validate.ts` interface before coding.

5. **[Pass] Error severity uniformity is correctly specified**: REQ-0009, NFR-0003, and the policy document (10_Policy.md) are all consistent: all new structural validators emit `error` severity unconditionally, not gated by `qualityProfile`. The `issue()` helper call convention is referenced. The 100% branch coverage requirement (NFR-0004) is a strong operational safeguard for the severity enforcement path.

6. **[Pass] Backward compatibility mechanism is correctly designed**: The short-circuit on `isUiBearing === false` approach is sound and testable. The OQ-0001 resolution (artifact/section presence detection over keyword-only matching) reduces false positive risk. The non-UI fixture regression test requirement (NFR-0002) provides the operational verification gate.

## Verdict

**FAIL**

Finding 1 is a high-severity ambiguity in the validator target file specification. If the implementation team targets `04_Sources.md` for the competitive refs validator but the actual competitive refs are authored in `03_Story-Workshop.md` DDS YAML blocks (as demonstrated by the current pack), the validator will never fire on non-conformant packs — a silent false negative. This must be resolved before SDD proceeds.

**Required fix**: Add a clarification to REQ-0005 (or a new REQ) specifying that QFAI-DDP-017/QFAI-DDP-021 validates the `competitive_refs` block within the DDS YAML in `03_Story-Workshop.md` as the primary check, and that `04_Sources.md` hosts the source traceability log (SRC-IDs) which is a separate concern. If both files must be checked, specify the check for each file with distinct validator codes.
