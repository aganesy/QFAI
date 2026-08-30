# 09 Delta (Migration Record)

## Origin

- New spec (no old equivalent)
- CAP-0009: qfai-configure skill specification

## Adopted

- AD-0009-0001: New spec creation -- `/qfai-configure` skill was previously undocumented; now formalized as spec-0009

## Rejected

No rejected options.

## ID Renumbering

N/A -- new spec with no prior IDs to renumber.

## Triage

| Source                                            | Subject                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discussion-20260804173914356#REQ-0023` (CHG-007) | per-layer tool-selection rationale gains a cross-reference to the layer-to-CI-lane map | spec-0009     | UPDATE    | MODIFY | -           | Cascade from CHG-007. spec-0009 scopes adopter-repository config discovery, not QFAI's own workspace; the mapping document is authored under the asset catalog tree and owned by spec-0017. Cross-reference only — the layer vocabulary must not grow, so no new layer token, heading or annotation form is introduced here. |
