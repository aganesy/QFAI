# R12 — Pattern Doubler

## Scope

- Pack: discussion-20260325120000000
- Layer: discussion
- Cycle: review-20260325121000000

## Checklist

- [x] Count all ID-bearing items (US, REQ, NFR, OQ, SRC) and evaluate coverage
- [x] Evaluate Example Seeds count and perspective coverage in 03_Story-Workshop.md
- [x] Identify missing user story perspectives and propose concrete additions
- [x] Evaluate whether REQ coverage addresses all identified problem dimensions
- [x] Evaluate whether NFR coverage is sufficient for the validator-addition scope
- [x] Evaluate OQ coverage — are there open questions that were not raised?

## Item Count Summary

| Category            | Count                     | Notes                                                                                    |
| ------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| REQ                 | 14 (REQ-0001..REQ-0014)   | Covers detection, DDS sub-fields, competitive refs, severity, templates, backward compat |
| NFR                 | 5 (NFR-0001..NFR-0005)    | Performance, compatibility, usability, maintainability, operability                      |
| OQ                  | 7 (OQ-0001..OQ-0007)      | 6 resolved, 1 deferred                                                                   |
| User Stories        | 8 (US-D001..US-D008)      | See analysis below                                                                       |
| SRC                 | 7 (SRC-0001..SRC-0007)    | Traceability to all REQs and NFRs present                                                |
| Example Seeds       | 0 explicit EX-XXXX items  | See analysis below                                                                       |
| Acceptance Criteria | ~40 across 8 user stories | Average ~5 per story                                                                     |

## Findings

### Finding 1 — SEVERITY: MEDIUM — Example Seeds are absent; perspective coverage relies entirely on user story ACs

The pattern-doubler premise is that the current count of any ID-bearing item category is insufficient. For the discussion phase, the primary evaluation target per the reviewer's brief is Example Seeds (EX-XXXX items). `03_Story-Workshop.md` contains no explicitly ID-bearing Example Seeds. The acceptance criteria within each user story serve as the functional equivalent, but they are attached to stories rather than standing as independent testable seeds that can be doubled.

The absence of standalone Example Seeds is not automatically a gap — discussion-phase packs frequently rely on story-embedded ACs. However, this pack introduces 7 new validator codes and 5 new template sections. Each new check is a distinct behavior boundary that benefits from at least one positive and one negative example seed. Currently, the "examples" exist only as implicit test fixture descriptions within ACs (e.g., "A UI-bearing pack with a DDS section that contains fewer than 2 rows triggers QFAI-DPACK-DDS-002 as an error"). These are not doubling-candidates in isolation because they are not registered as EX-XXXX items.

**Proposed additions**: Register at minimum the following Example Seeds as EX-D001..EX-D014 in `03_Story-Workshop.md` or a dedicated Example Seeds section:

| Seed ID | Description                                                                           | Expected Outcome                                                              |
| ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| EX-D001 | UI-bearing pack with all DDS sub-fields populated and 3 options compared              | All DDS validators pass; no errors                                            |
| EX-D002 | UI-bearing pack with `## Design Direction Summary` heading absent                     | QFAI-DPACK-DDS-001 fires as error                                             |
| EX-D003 | UI-bearing pack with DDS heading present but only 1 option in comparison table        | QFAI-DPACK-DDS-002 fires as error                                             |
| EX-D004 | UI-bearing pack with 2 options but no `### Selected Anchor Screen` heading            | QFAI-DPACK-DDS-003 fires as error                                             |
| EX-D005 | UI-bearing pack with anchor section present but fewer than 40 characters of rationale | QFAI-DPACK-DDS-003 fires as error                                             |
| EX-D006 | UI-bearing pack with competitive refs missing `adopted` sub-field                     | QFAI-DDP-017 fires as error                                                   |
| EX-D007 | UI-bearing pack with competitive refs missing `local_translation` on an adopted entry | QFAI-DDP-017 fires as error                                                   |
| EX-D008 | UI-bearing pack with `cta_hierarchy` block but no `primary` field                     | QFAI-DDP-004 fires as error                                                   |
| EX-D009 | UI-bearing pack with state coverage missing `loading` state                           | QFAI-DDP-013 extended check fires as error                                    |
| EX-D010 | UI-bearing pack with anti_goals list containing only "none" (generic placeholder)     | QFAI-DDP-009 fires as error                                                   |
| EX-D011 | Non-UI-bearing pack with no DDS section                                               | Zero errors from any v1.7.0 validator                                         |
| EX-D012 | Non-UI-bearing pack with no competitive refs                                          | Zero errors from any v1.7.0 validator                                         |
| EX-D013 | UI-bearing pack with all new validators passing; complete DDS section                 | Exit code 0; all DDS checks pass                                              |
| EX-D014 | UI-bearing pack with filler text ("N/A") in `visual_thesis` field                     | QFAI-DDP-009 anti-goal banned-pattern check (if implemented) fires as warning |

These 14 seeds directly double the 7 new validator codes across pass/fail paths, providing the SDD phase with concrete fixture anchors.

---

### Finding 2 — SEVERITY: MEDIUM — User Story perspective gaps: three missing story angles

The current 8 user stories (US-D001..US-D008) cover: UI-bearing detection, option comparison, anchor screen, competitive refs, review request, delta log, SKILL.md update, and error-severity enforcement. This is solid coverage of the "happy path structural additions."

Three perspectives are absent:

**Missing US-A: Migration / pre-existing pack behavior**

No story covers what happens when an existing (pre-v1.7.0) UI-bearing pack is validated against the new validators. `01_Context.md` and `09_Constraints.md` TC-1 assert backward compatibility, but this is stated as a constraint, not as a user-observable behavior with acceptance criteria. There is no story for "As a QFAI user with an existing v1.6.5 UI-bearing pack, I want running `qfai validate` against my old pack to not produce new errors, so that I am not broken by the upgrade."

**Proposed**: Add US-D009 with AC: existing packs validated against v1.7.0 that do not contain the new DDS section produce zero DDS-related errors (because the backward-compatibility gate in TC-1 and NFR-0002 applies to packs created before the requirement existed). Clarify whether "existing packs" means packs with no UI artifacts, or packs with UI artifacts authored before v1.7.0.

**Missing US-B: Error message usability**

NFR-0003 requires that every error message include (1) the failed field, (2) the one-sentence rationale, and (3) the fix instruction. There is no user story for "As a QFAI user reading a DDS error, I want the error message to tell me exactly what to fix, so I don't need to read the documentation." This story drives the acceptance test for NFR-0003 and ensures the error message format is independently verifiable.

**Proposed**: Add US-D010 with AC that checks the three-part message structure for each of the seven new validator codes (using fixture packs to trigger each).

**Missing US-C: qualityProfile infrastructure preservation**

OQ-0007 resolved that `qualityProfile` is preserved but not used as an active gate. There is no story for "As a QFAI validator maintainer, I want the qualityProfile infrastructure to remain callable and non-destructive after v1.7.0, so that v1.7.1 can activate profile-sensitive gating without code changes." This story would verify that the profile infrastructure is regression-tested in v1.7.0.

**Proposed**: Add US-D011 with AC that confirms: running `qfai validate --profile strict` on a UI-bearing pack with a complete DDS does not produce additional errors beyond those produced by `--profile standard`; and that `qualityProfile` is still parseable from pack config.

---

### Finding 3 — SEVERITY: LOW — NFR perspective gap: security/resilience of new YAML parsing

`09_Constraints.md` TC-5 states that no new runtime dependencies may be introduced, and that YAML parsing for the competitive reference registry must use existing dependencies or standard Node APIs. If YAML is parsed using Node built-ins (e.g., a regex-based extractor) rather than a proper YAML library, there is a class of malformed-input edge cases (deeply nested YAML, YAML bombs, multiline block scalars) that could cause the validator to produce incorrect results or crash.

There is no NFR covering resilience of the YAML parsing path, and no OQ raised about parsing strategy. Given that `04_Sources.md` competitive reference entries are specified as "YAML block (or Markdown table row)" in REQ-0005, the implementation has two code paths, neither of which has a resilience NFR.

**Proposed**: Add NFR-0006 (operability/resilience): "The competitive reference field validator must handle malformed YAML blocks and non-YAML table-format entries without throwing an unhandled exception. Malformed competitive reference entries must emit a structured error (not a process crash) with a message identifying the malformed entry."

---

### Finding 4 — SEVERITY: LOW — OQ perspective gap: no OQ raised for "what counts as a distinct option"

REQ-0003 requires 2–3 design options, each with `pros`, `cons`, and `avoided_antipatterns`. There is no OQ covering what constitutes a "substantively distinct" option vs. two options that are superficially named differently but propose the same underlying layout approach. This is a known failure mode cited in `02_Inception-Deck.md` Q7 Risk 2: "Option comparison is done but only superficially (both options identical)."

The mitigation proposed in Q7 is "DDP-019 requires structurally distinct options; review roster escalates if options are substantively same." But there is no REQ that defines "structurally distinct," and no OQ that addresses the definition problem. The SDD phase will need to define the validation logic for this boundary, and that definition should have been surfaced as an open question or deferred item.

**Proposed**: Either (a) add an OQ-0008 entry: "What is the minimum structural distinction required between two screen options to satisfy REQ-0003? Options for resolution: (A) Two options must differ in at least one dimension from the option comparison table — layout pattern, CTA placement, or mobile viability; (B) Reviewer-only judgment (no validator check); (C) Banned-similarity pattern (options with identical layout pattern are rejected)." Or (b) extend REQ-0003 to include the definition of structural distinctness.

## Verdict

**N/A** — with qualified observations

**na_rule**: This is a discussion-phase pack. ID-bearing items (US/AC/BR/EX/TC) are sparse by design; pattern-doubling of sparse items is not the appropriate evaluation mode at this layer. The user story coverage (8 stories, ~40 ACs) is substantively complete for the defined scope.

**Qualified observations requiring attention before SDD**:

The absence of registered Example Seeds (Finding 1) is the most material gap. While not a pattern-doubling FAIL at discussion phase, the SDD phase will need these seed anchors to write validator unit tests conforming to NFR-0004. The proposed EX-D001..EX-D014 list should be added to the pack or explicitly deferred to the SDD phase with a work order.

The three missing user story perspectives (Finding 2) — migration behavior, error message usability, and qualityProfile preservation — are each backed by existing REQs or NFRs that currently lack story-level traceability. These are low-risk gaps given the explicit NFR coverage, but they create a verification blind spot if the SDD phase generates acceptance criteria only from existing stories.

Findings 3 and 4 are low-severity but should be considered as SDD input rather than being silently inherited.
