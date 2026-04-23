# 01 Spec

- Spec: spec-0004
- Parent: CAP-0004
- Consolidates: old spec-0002

## Consumer View

- Primary SSOT for execution: `spec-0004/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `qfai validate` command
  - layered spec / traceability / contract / discussion validators
  - contract-first design/ui validators
  - direct discussion-pack canonical UIX validators
  - prototyping skill content validator
  - prototyping evidence validator
  - breakthrough evidence validator
  - UI evidence artifact validator
  - design contract readiness validator
  - non-UI safe skip behavior
  - waiver handling
- Out:
  - report rendering details
  - prototyping runtime execution
  - deleted prototyping recommendation validator surface
  - legacy compatibility namespaces removed from package surface

## Applicable NFR

- NFR-0001: Medium-size project validation completes within existing validate budget
- NFR-0002: Same input yields same validate result
- NFR-0003: Non-UI packs do not over-fire UI-bearing validators
- NFR-0004: Actionable issues include concrete file/rule guidance

## Applicable Policy

- Policy: validate is the mechanical truth gate
- Policy: new UI validators must stay deterministic

## Evidence Summary

- Evidence: `packages/qfai/src/core/validate.ts`
- Evidence: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`
- Evidence: `packages/qfai/src/core/validators/skill/prototypingSkill.ts`
- Evidence: `packages/qfai/src/core/validators/prototypingEvidence.ts`

## Relevant Requirements

- REQ-0010: `qfai validate` aggregates validator issues and writes structured output
- REQ-0011: `--phase`, `--format`, and `--fail-on` continue to control validate behavior
- REQ-0012: contract-first validators remain the repo-root downstream production path
- REQ-0013: validate no longer depends on a dedicated prototyping recommendation validator or `prototyping.yaml` schema gate
- REQ-0014: prototyping skill validator checks current `/qfai-prototyping` documentation contract
- REQ-0015: UI evidence artifact validator checks declared screen evidence paths
- REQ-0016: `QFAI-UIE-001` reports missing screenshot evidence
- REQ-0017: `QFAI-UIE-002` reports missing HTML snapshot evidence
- REQ-0018: absence of screen contracts skips UI evidence artifact validation safely
- REQ-0019: validate no longer treats full runtime-scoring integrity as its primary prototyping responsibility
- REQ-0020: deterministic validators retained from v1.7.16 stay under validate when still present in code
- REQ-0021: `validateDesignContractReadiness` checks `exploration-brief.yaml`, `evaluation-rubric.yaml`, `selected-direction.yaml`, `design-system.yaml`, and UI contract presence using `QFAI-DCON-*`
- REQ-0022: `runCanonicalUixValidators` is limited to direct discussion-pack validation and is not the repo-root downstream primary path
- REQ-0023: `validateBreakthroughEvidence` checks `.qfai/evidence/breakthrough.json` and branch execution evidence when trigger=true
- REQ-0024: downstream skill prompt checks use read order `spec -> exploration-brief -> reference-pool -> evaluation-rubric -> evaluator-calibration -> selected-direction -> design-system -> ui contracts`

## Entry points

- US range in this spec: US-0004-0001..US-0004-0027
- Primary actors: QA engineer, AI agent, CI pipeline
- Notes: validate is the machine gate for current skill-first, contract-first downstream
