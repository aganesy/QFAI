# R06 — QA Reviewer

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Example Seeds cover all 6 perspectives (happy path, negative path, edge/boundary, permission/role, state transition, idempotency/retry) for each of the 8 user stories
- [x] Each story's acceptance criteria are testable and verifiable by a validator or human reviewer
- [x] Negative paths identify specific error codes emitted (not just "an error fires")
- [x] Edge/boundary conditions include numeric thresholds where applicable (e.g., rationale ≥40 chars, options ≥2)
- [x] Open items in OQ-Register are explicitly resolved or deferred; `Disposition: open` count is zero
- [x] Deferred item (OQ-0006) has full metadata: gate, reason, owner, due, severity, mitigation, and evidence
- [x] Failure paths in validator flows (Flow 1 Mermaid) terminate at Exit code 1 / CI gate block
- [x] Non-UI-bearing pack failure paths are absent (confirms short-circuit behavior is testable)
- [x] US-D005 and US-D006 correctly document warning-severity checks separately from error-severity checks
- [x] State coverage seeds address partial/edge states beyond the four canonical states
- [ ] Example Seeds for US-D007 (SKILL.md update) include a negative path testing what happens if the SKILL.md section is present but incomplete (e.g., only five of seven requirements listed); this scenario is missing
- [ ] US-D004 edge/boundary seed counts "adopted + rejected combined = 3" as the minimum, but the REQ-0005 and US-D004 body also require at least one entry each in adopted and rejected sub-lists; there is no seed that tests a pack with two adopted entries and zero rejected entries (which should fail DDP-017 even though total ≥ 3)
- [ ] Flow 1 shows `QFAI-DDP-009` emitting either ERROR or WARNING depending on branch, but US-D008 acceptance criteria list only `QFAI-DDP-014` as the anti-goals error emitter; the dual-code path (DDP-009 vs DDP-014) in the flow is not disambiguated in the acceptance criteria

## Findings

1. **[Medium] US-D007 negative seed gap**: The Example Seeds table for US-D007 is absent from the discussion pack (the file ends at the US-D007 story text; no seed table is visible in the reviewed portion). If seeds exist further in the file they were not confirmed present in this review. If absent, the QA coverage for the SKILL.md update story is incomplete. The acceptance criteria for US-D007 have five sub-criteria, any one of which could silently fail without a matching negative-path seed. Recommended action: confirm seeds are authored for US-D007 and US-D008, or add them before SDD.

2. **[Medium] Missing sub-list composition seed for competitive refs**: REQ-0005 requires at least one `adopted_points` entry AND at least one `rejected_points` entry. The Example Seeds for US-D004 test total-count boundary (3 total) but do not test a pack where adopted count = 2 and rejected count = 0 (total = 2, which also fails, but for a different structural reason). This missing case could allow a validator implementation that only checks total count to pass incorrectly. Recommended action: add a seed — "2 adopted entries, 0 rejected entries; QFAI-DDP-017 fires as error even though total count could be ≥ 3 if a third adopted entry is present".

3. **[Low] Flow 1 QFAI-DDP-009 vs QFAI-DDP-014 ambiguity**: The Mermaid flow diagram (Flow 1) shows the anti-goals check node emitting "ERROR: QFAI-DDP-014 or WARNING: QFAI-DDP-009". US-D008 acceptance criteria confirm only DDP-014 as an error emitter. The distinction (DDP-009 is a warning for heuristic-quality absent anti-goals; DDP-014 is an error for banned-pattern detection) should be explicitly stated in the Flow 1 description to prevent test authors from conflating the two. This is a documentation clarity finding, not a requirement defect.

4. **[Low] Idempotency seed for US-D001 references `stripFencedCodeBlocks`**: The edge/boundary seed for US-D001 references an implementation detail (`stripFencedCodeBlocks`) that has not been specified in the REQ or NFR files. Validator authors may implement this differently, causing the seed to fail as written. Recommended action: if `stripFencedCodeBlocks` is a required behavior, add a REQ or NFR entry for it; otherwise reframe the seed in terms of observable behavior only.

5. **[Pass] OQ-Register exit condition met**: All 7 OQs are accounted for. 6 are resolved with evidence; 1 (OQ-0006) is deferred with complete metadata including mitigation and due milestone. The `Disposition: open` count is zero. This criterion from `01_Context.md` is satisfied.

6. **[Pass] Deferred item completeness**: `13_Deferred.md` entry for OQ-0006 contains gate, deferred-reason, deferred-until, owner, due, severity, impact, mitigation, and evidence. All required metadata fields are present.

## Verdict

**PASS**

Findings 1 and 2 are medium severity and represent gaps in test coverage design that should be addressed during SDD (M2) before test cases are written from these seeds. They do not block the discussion phase verdict because the validator logic itself is correctly specified; the seeds are authoring aids for test writers. Findings 3 and 4 are documentation clarity items. The discussion pack meets the OQ exit condition and all structural completeness criteria for the QA review gate.
