# 01 Context

## Metadata

| Key           | Value                                                      |
| ------------- | ---------------------------------------------------------- |
| Discussion ID | discussion-20260328120000000                               |
| Date          | 2026-03-28                                                 |
| Owner         | agent                                                      |
| Source        | QFAI v1.7.3 Design Spec + Roadmap Compression Mapping v0.1 |

## Goal and Completion Criteria

### Goal

Evolve `qfai-discussion` to produce scoring-ready UI/UX sidecar artifacts for UI-bearing projects.

### Completion Criteria

1. All 11 `uiux/` sidecar template files are created and integrated into the discussion pack output.
2. `qfai-discussion/SKILL.md` is updated with the UI-bearing project flow, including sidecar generation triggers and authoring guidance.
3. Direct templates (`03`, `04`, `14`) are replaced with their updated equivalents.
4. Batch A and Batch B core templates are augmented with UX intent cross-references.
5. The non-UI init path remains fully functional with no regressions -- projects that do not declare UI-bearing status produce the same 15-file core pack as before.

## Stakeholders

### Primary

- **QFAI package maintainers** -- own the discussion skill implementation and template set.
- **Downstream skill consumers** -- `qfai-sdd`, `qfai-verify`, `qfai-prototyping`, and `qfai-atdd` depend on discussion pack outputs as their primary input.

### Secondary

- **End users of QFAI** -- practitioners who run `qfai-discussion` on UI-bearing projects and expect structured, scorable design artifacts rather than generic HTML/CSS mocks.

## Background

### Business Context

The current `qfai-discussion` skill produces a 15-file core discussion pack. When applied to UI-bearing projects, the output includes generic HTML/CSS mock references that downstream validators and reviewers cannot score or verify against design contracts. This gap forces manual rework and blocks automated quality gates in `qfai-verify` and `qfai-sdd`.

### Technical Context

The existing 15-file core pack structure is maintained and stable. The v1.7.3 change is additive: a `uiux/` sidecar directory is introduced alongside the core pack. Three direct templates (`03`, `04`, `14`) are replaced to integrate sidecar references, and Batch A/B core templates receive UX intent cross-reference annotations. The sidecar family comprises 11 files covering implementation strategy, design evaluation scoring axes, and screen contracts.

## Inputs

| Input                                           | Description                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| QFAI v1.7.3 Design Spec                         | Compressed design specification defining the uiux/ sidecar family, SKILL.md changes, and template replacements.                      |
| Roadmap Compression Mapping v0.1                | Consolidation mapping from the former v1.7.3-v1.7.6 roadmap into the single v1.7.3 release scope.                                    |
| UI/UX Redesign Package v0.2                     | Reference package describing the 11 sidecar artifact structures and their scoring axes.                                              |
| Pre-discussion UIUX Architecture Decisions v0.1 | Architectural decisions made prior to this discussion, including sidecar isolation strategy and core-pack compatibility constraints. |

## Key Issues

### KI-1: Artifact Count Increase and Authoring Friction

Adding 11 sidecar files to the discussion output increases the total artifact count from 15 to 26 for UI-bearing projects. This raises concerns about authoring friction -- both for the AI assistant generating the pack and for human reviewers who must inspect it. Mitigation strategies (batch grouping, progressive disclosure) need to be decided.

### KI-2: SKILL.md Clarity for Sidecar Flow

The updated `SKILL.md` must clearly distinguish the UI-bearing flow from the non-UI flow. Ambiguity in trigger conditions or sidecar generation steps risks producing incomplete packs or generating sidecar files for projects that do not need them.

### KI-3: Core vs Sidecar Responsibility Boundary

The boundary between what belongs in the core 15-file pack and what belongs in the `uiux/` sidecar must be well-defined. Cross-references from core templates to sidecar files create a coupling surface. If the boundary blurs, maintenance cost increases and non-UI projects may be inadvertently affected.
