# 01 Context

## UI-bearing Classification

Classification determines whether UI/UX sidecar artifacts are required.

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces:
- classification_rationale: The change removes a file surface (`.qfai/steering/`), the validator findings that read it, and the skill text that asks for it. It adds no screen and no command. The only terminal-output change is findings and `qfai init` report lines that stop appearing, so there is no surface to design.

## Design Direction

Not applicable: the pack is non-ui, so no theme is chosen and nothing downstream reads one.

## Metadata

| Key           | Value                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| Discussion ID | discussion-20260923060900824                                                        |
| Date          | 2026-09-23                                                                          |
| Owner         | user (decisions); requirements-analyst (authoring)                                  |
| Source        | User request to explain, then decide whether to remove, QFAI's "steering" mechanism |

## Goal and Completion Criteria

- Goal: remove the AI work-log surface at `.qfai/steering/` from QFAI, and send each
  kind of record it held to a home that already exists.
- Measurable completion criteria:
  - `qfai init` on an empty directory creates no `.qfai/steering/` (REQ-0001).
  - `qfai validate` on a tree that holds `.qfai/steering/*.md` emits none of the
    removed codes (REQ-0002, REQ-0003, REQ-0004).
  - An adopter's existing `.qfai/steering/**` is byte-identical after
    `qfai init` and `qfai init --force` (NFR-0003).
  - This repository has no `.qfai/steering/` directory, and each pointer REQ-0014
    lists names the new location (REQ-0013, REQ-0014). Dated evidence
    observations, `*_delta.md` change-history rows, the tracked report OQ-0013
    defers and the upstream rows OQ-0010 defers stay as history.
  - CI is green on the one change that does all of this (REQ-0015).

## Stakeholders

- Primary stakeholders:
  - The user, who took the nine decisions registered as OQ-0001 to OQ-0009 in
    `11_OQ-Register.md` and logged in `12_OQ-Resolution-Log.md`.
  - Adopters: projects that ran `qfai init` and may hold a `.qfai/steering/`
    directory.
  - Agents running the QFAI stage skills, whose instructions change.
- Secondary stakeholders:
  - QFAI maintainers, who carry the validator and its tests (SRC-0001, SRC-0008).
  - `/qfai-sdd`, which must raise the Change Request for the upstream rows this
    removal contradicts (REQ-0016).

## Background

- Business context: the user gave four reasons, all adopted (round 2 in the stage
  evidence `## Grilling Session`):
  1. The records it holds already have homes: Change Requests, stage evidence,
     a spec's `08_Open-questions.md` and `07_Decisions.md`.
  2. It is poorly used. `.qfai/report/validate.spec-0017.json` records 13
     `W-WORKLOG-BROKEN-LINK` and 1 `W-WORKLOG-SCHEMA` against this repository's
     own entries, and none of the seven entries sets `promote-to` (SRC-0014,
     SRC-0015; stage evidence `### Observations`).
  3. Keeping the validator costs more than it returns (SRC-0001, SRC-0008).
  4. The name "steering" collides with two other things, listed below.
- Technical context: "steering" names three different things in this repository
  (stage evidence `### Finding: "steering" names three different things`):

  | Label | Thing                   | Where                                                          | This change |
  | ----- | ----------------------- | -------------------------------------------------------------- | ----------- |
  | A     | Legacy assistant layout | `.qfai/assistant/steering/`, `LEGACY_ASSISTANT_STEERING_DIR`   | Unchanged   |
  | B     | Catalog steering files  | `.qfai/assistant/catalog/{manifest,product,structure,tech}.md` | Unchanged   |
  | C     | AI work-log surface     | `.qfai/steering/*.md`                                          | Removed     |

  A is in `packages/qfai/src/core/paths/assistantPaths.ts:16`. C's constants
  are in the same file at lines 18-20 and 100-145 (SRC-0003). B's four files are
  `ADOPTER_OWNED_CATALOG_FILES` in `packages/qfai/src/core/assistantAssetProvenance.ts:55-65`.

- Historical context: C shipped in 1.9.0 (`CHANGELOG.md`, `## [1.9.0] - 2026-05-23`,
  heading `### Added (assistant-layer recut + steering work-log surface — CHG-003)`,
  SRC-0021). Its decisions are DR-0250..0260 in
  `.qfai/specs/_policies/08_Decisions.md:1531` (SRC-0010).

## Inputs

- Existing repository facts: the `research_summary` in `04_Sources.md#Research Summary`,
  SRC-0001 to SRC-0023. Facts checked again while authoring are registered as
  SRC-0024 to SRC-0028.
- External references: none. The run had no web tool, and the subject is this
  repository's own code.
- Assumptions:
  - Nothing outside QFAI reads an adopter's `.qfai/steering/`. The pack does not
    depend on this: OQ-0005 leaves those files where they are (REQ-0010).

## Key Issues

- Issue 1: the removal contradicts settled upstream obligations: spec-0003,
  spec-0004, DR rows, `_policies` constraints and `.qfai/contracts/cli/*`
  (SRC-0009, SRC-0010, SRC-0011). This pack records them as the Change Request
  `/qfai-sdd` must raise (REQ-0016). It does not edit them.
- Issue 2: `QFAI-TDDLIST-015` depends on the surface. spec-0003's `TDD-0058..0063`
  are `blocked` on `CR-20260923-0003` (SRC-0025), so deleting the entries before
  the check turns those rows red (AP-0003). The test removals and the ledger-row
  removals are coupled the same way. All of it lands in one change (REQ-0015).
- Issue 3: removal goes by symbol, not by word. "steering" also names A and B, and
  "handoff" also names the live `.qfai/handoff.yaml` feature (AP-0001).
