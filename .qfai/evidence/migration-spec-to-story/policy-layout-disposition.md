# Policy layout disposition

The P7 source archive preserves the complete former policy text at
`retired/_policies/06_Glossary.md` and `retired/_policies/07_Constraints.md`.
The source authorization is `discussion-20260923063306456/06_REQ.md` REQ-0017
and REQ-0018, its `05_Scope.md` relocation table, and the approved policy
REMOVE rows in `retired/_policies/10_delta.md#What the policy REMOVE rows retire at landing`.
DEC-0722 records the current policy disposition.

| Former ID | P7 disposition | Current authority or reason |
| --- | --- | --- |
| OC-04 | Retired | Old per-spec `07_Decisions.md` and `09_delta.md` historical-layer restriction. Current decisions are in `.qfai/spec/decisions.md`; archived source is under `retired/`. |
| TC-03 | Updated | Downstream skills read `.qfai/spec/` after `/qfai-sdd`, while discussion packs remain upstream discovery input. |
| TC-04 | Retired | Mandatory normalization of the former discussion UIUX sidecars to the obsolete design contract family conflicts with the later CHG-001 decision. DEC-0279 and AC-0013-0016 govern their absence. |
| TC-08 | Retired | The former exploration, rubric, calibration and selected-direction files are not the current canonical design set. DEC-0279 and AC-0013-0016 govern their absence. |
| TC-09 | Updated | UI contract files are under `.qfai/spec/03_contract/ui/` for a UI-bearing project. |
| TC-65 | Updated | `assistantPaths.ts#ASSISTANT_LAYERS` names `rule/`, `skill/`, `agent/`, `prompt/`; REQ-0017/0018 replace the former six top-level directories. |
| TC-67 | Updated | Keep the assistant-path SSOT, using its typed four-layer helpers instead of the former literal-regex list. |
| TC-68 | Retired | The 1.9.x `instructions/` and `steering/` recut window does not define the 2.0 assistant layout. |
| TC-69 | Updated | A trailing `project_memory:` block now declares remembered work-log context. `skillDocReferences.ts` emits a warning; it does not enforce reads from the former layer set. |
| TC-70 | Updated | Manual work-log decision promotion now targets `.qfai/spec/decisions.md`; `W-PENDING-PROMOTION` checks the DEC row, archived entry and `promoted-to` back reference. |
| OC-50 | Retired | One-time 2026-05 assistant recut implementation order; P7 defines its own cutover. |
| OC-53 | Retired | The `process/migrations/` memo home is abolished by REQ-0017. |
| OC-61 | Retired | The prototyping memo under abolished `process/migrations/` remains in the archive only. |
| OC-63 | Updated | The `surface_type`-absent spec-pack clause is retired at P7 with `validateSurfaceTypeDrift`; the separate handoff, `primary_tasks`, mutation-log and cycle-0 dispositions remain stated. |
| OC-64 | Retired | The second-wave memo under abolished `process/migrations/` remains in the archive only. |
| OC-70 | Updated | Shipped assistant assets and root links follow the current four directories. Project context has moved to `.qfai/spec/`; `ADOPTER_OWNED_ASSETS` is empty. |
| OC-71 | Retired | The positional CAP-to-spec-pack gate and `11_Slice-Policy.md` are not story-tree rules. |
| OC-76 | Updated | The shared test-layer and CI-lane mapping now lives in `rule/test-layers.md`. The former sibling and catalog placement are retired; the closed vocabulary is retained. |

The glossary's approved REMOVE row retires exactly these seven terms:
`contract-first downstream`, `historical layer`, `assistant-layer recut`,
`Constitution layer`, `Manifest layer`, `Catalog layer` and `Process partition`.
Its `project_memory block` definition now states the current warning-only
contract, and its runtime-dependency manifest path uses singular `skill/`.
Four obsolete design-sidecar terms were also retired under DEC-0279. The
design-system and UI contract terms now point to `03_contract/`; work-log
promotion and rejected-option terms now point to project decisions.
The `D-SURFACE-TYPE-MISSING` glossary entry is retired with the spec-pack
validator. No story-tree criterion uses `surface_type` frontmatter. OC-63 keeps
the unrelated second-wave compatibility dispositions without that finding.

The P7 working tree still contains four former `assistant/catalog/` seed
files (`manifest.md`, `product.md`, `structure.md`, `tech.md`). Their physical
disposition belongs to the remaining cutover work. Their presence is not a
current policy requirement and does not authorize recreating that layer.
