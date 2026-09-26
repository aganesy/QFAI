# Retired design sidecar criteria

These two old criteria are preserved from
`spec-0013/03_Acceptance-Criteria.md` before the P7 retirement. Their
provenance is the old spec-pack source; they are not active obligations.
The active design-contract reduction is AC-0013-0016 and AC-0013-0017.

## AC-0013-0010: Design Contract Normalization

Given a UI-bearing discussion pack with exploration-first UIUX sidecar files, when `/qfai-sdd` completes, then `.qfai/contracts/design/exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, and `.qfai/contracts/ui/*.yaml` are generated or refreshed for downstream use.

## AC-0013-0011: Downstream Design Contracts Exist Before Prototyping

Given a UI-bearing discussion pack, when `/qfai-sdd` completes, then `selected-direction.yaml` と `design-system.yaml` も downstream validate readiness の required design contracts として生成または維持され、prototyping winner selection 後に必要なら更新される。
