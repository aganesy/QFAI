# 01 Context

## UI-bearing Classification

Classification determines whether UI/UX sidecar artifacts are required.

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces:
- classification_rationale: The change is to the document layout QFAI defines, to its skills and to its validator rules. No screen is added, and no command is added: migration is a skill with bundled scripts, not a CLI command (05_Scope.md#Out of Scope). The existing `qfai validate` output gains findings but no new surface.

## Design Direction

Not applicable. The pack is `non-ui`, so no theme is chosen and `/qfai-sdd` Phase 0 authors no root `DESIGN.md` from it.

## Metadata

| Key           | Value                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Discussion ID | discussion-20260923063306456                                                                                            |
| Date          | 2026-09-23                                                                                                              |
| Owner         | requirements-analyst (framing); decisions by the user                                                                   |
| Source        | User request in the conversation; decisions Q1–Q20 in `.qfai/evidence/discussion-20260923063306456.md#Grilling Session` |

## Goal and Completion Criteria

- Goal: replace the capability-based spec packs QFAI defines for adopters with a story-based `.qfai/spec/` tree of three layers — policy, business flow, contract — and ship it as a breaking major release together with a skill that migrates an existing project.
- Measurable completion criteria:
  - `qfai init` on an empty directory writes the tree in 05_Scope.md#In Scope and nothing under `.qfai/specs/`.
  - `qfai validate` reports each coverage rule in DSC-002 (REQ-0007, REQ-0008, REQ-0010) as an error on a fixture that breaks it, and reports nothing on the sample tree `qfai init` writes.
  - After `/qfai-migration-spec-to-story` runs on a project on the old layout, validate reports 0 layout errors and 0 chain errors, and the migration report lists every test case turned into an example (NFR-0003) and every BF, AC and EX left without a test at its layer (DSC-003).
  - The success criteria in 05_Scope.md#Success Criteria are met.

## Stakeholders

- Primary stakeholders:
  - Adopter product owners and business analysts, who write business flows, stories, acceptance criteria and examples.
  - AI agents running the qfai skills (`qfai-sdd`, `qfai-atdd`, `qfai-implement`, `qfai-verify`), which read and write the tree.
  - Test authors, human or agent, who annotate tests against the three test layers.
  - Existing adopters, who must move a project from `.qfai/specs/` to `.qfai/spec/`.
- Secondary stakeholders:
  - QFAI maintainers, who own the package, its validators, templates and the mdschema lane.
  - This repository's CI, which validates the repository's own `.qfai/specs/` (SRC-0106) and so has to move with the cutover.

## Background

- Business context: QFAI's spec-driven workflow is what adopters install. A spec pack groups work by capability, so the concrete behaviour a user sees (stories, criteria, examples) and the abstract rules that govern it (business rules, test cases, plans) share one directory per capability.
- Technical context:
  - A spec pack requires ten files, `01_Spec.md` to `10_Plan.md` (SRC-0101: `packages/qfai/src/core/specLayout.ts`, `REQUIRED_LAYERED_SPEC_FILES_V1421`), plus `16_Traceability-ledger.md` and `tdd/test-list.md` from the templates (SRC-0101: `qfai-sdd/templates/specs/spec/`).
  - `_policies/` requires eleven files, among them `03_Capabilities.md`, `08_Decisions.md`, `09_Open-questions.md`, `10_delta.md` and `11_Slice-Policy.md` (SRC-0101: `specLayout.ts`, `REQUIRED_LAYERED_SHARED_FILES_V1421`).
  - `qfai-sdd` runs `Phase 0 Contracts-first` before `Phase 1 Outline` and the per-spec slices, and its Critical Constraints item 3 reads "Contracts-first is mandatory" (SRC-0104).
  - The assistant tree mixes content QFAI ships and regenerates with content a project owns: four catalog files are adopter-owned (SRC-0102: `assistantAssetProvenance.ts`, `ADOPTER_OWNED_CATALOG_FILES`), and `manifest/agent-catalog.yml` holds fields that "live nowhere else" beside a `developer_instructions` body that mirrors the agent card (SRC-0109).
- Historical context: change requests live one file each under `.qfai/decisions/` (SRC-0111), and every spec pack and `_policies/` keeps its own decisions, open questions and delta, so a project's decisions sit in as many places as it has packs plus two.

## Inputs

- Existing repository facts: SRC-0101 to SRC-0121 in 04_Sources.md#Source Registry, each read at the branch head on 2026-09-23.
- External references: SRC-0001 to SRC-0016 in 04_Sources.md#Research Summary.
- Assumptions:
  - The major version number and the pinned integration branch are not chosen yet. They are a user decision under `.agents/rules/version-discipline.local.md` (SRC-0117) and are deferred (13_Deferred.md, OQ-0022).
  - The performance target in NFR-0005 has no measured baseline yet (05_Scope.md#Assumptions).

## Key Issues

- Issue 1: A capability pack mixes the concrete layer (stories, criteria, examples) with the abstract one (business rules, contracts), and `qfai-sdd` asks for the abstract layer first (SRC-0104), before the concrete behaviour it abstracts is clear.
- Issue 2: Test cases duplicate examples. A normal-path TC restates an EX, while error and boundary TCs cite only an AC (`06_Test-Cases.md#Test Case Table (required)`, rows TC-0002 and TC-0003, EX-Ref `—`; SRC-0105), so some cases exist only as tests.
- Issue 3: Decisions and open questions are scattered: `07_Decisions.md`, `08_Open-questions.md` and `09_delta.md` in every pack, three more files in `_policies/`, and one CR file per change under `.qfai/decisions/` (SRC-0101, SRC-0111).
- Issue 4: The assistant tree mixes fixed distributed content with project-owned files, so the project's own settings sit inside a tree `qfai init --force` regenerates (SRC-0102, SRC-0109).
- Issue 5: Three test ledgers — `06_Test-Cases.md`, `tdd/test-list.md`, `16_Traceability-ledger.md` — record the same obligations the examples and the test annotations already carry (SRC-0101, SRC-0108).
