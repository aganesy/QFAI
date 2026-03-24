# 07 Decisions

## Decisions

- 6 decisions referenced from _policies/08_Decisions.md

| DR-ID  | Title                                  | Resolution                                                                                                  | Source OQ |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| DR-0042 | UI-bearing detection method            | Artifact/section presence detection (HTML tags, CSS artifacts, Mermaid screen flows). Never keyword alone   | OQ-0001   |
| DR-0043 | DDS location                           | Design Direction Summary is placed in 03_Story-Workshop.md                                                  | OQ-0002   |
| DR-0044 | Competitive reference mandatory fields | 3 mandatory fields: adopted_points, rejected_points, local_translation                                     | OQ-0003   |
| DR-0045 | Validator severity                     | Immediate error severity for all structural check failures (never warning)                                  | OQ-0004   |
| DR-0046 | Validator integration approach          | Extend existing DDP validators in validate.ts (QFAI-DDP-019..025), not separate entry points               | OQ-0005   |
| DR-0047 | qualityProfile handling                | qualityProfile mechanism preserved in codebase but not active for gating new validators in v1.7.0           | OQ-0007   |

## Empty State

- All decisions are resolved. No pending decisions in this spec.
