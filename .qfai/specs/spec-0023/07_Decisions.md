# 07 Decisions

## Decisions

- 7 decisions referenced from \_policies/08_Decisions.md (DR-0042..DR-0047, DR-0082)

| DR-ID   | Title                                  | Resolution                                                                                                | Source OQ |
| ------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- |
| DR-0042 | UI-bearing detection method            | Artifact/section presence detection (HTML tags, CSS artifacts, Mermaid screen flows). Never keyword alone | OQ-0001   |
| DR-0043 | DDS location                           | Design Direction Summary is placed in 03_Story-Workshop.md                                                | OQ-0002   |
| DR-0044 | Competitive reference mandatory fields | 3 mandatory fields: adopted_points, rejected_points, local_translation                                    | OQ-0003   |
| DR-0045 | Validator severity                     | Immediate error severity for all structural check failures (never warning)                                | OQ-0004   |
| DR-0046 | Validator integration approach         | Extend existing DDP validators in validate.ts (QFAI-DDP-019..025), not separate entry points              | OQ-0005   |
| DR-0047 | qualityProfile handling                | qualityProfile mechanism preserved in codebase but not active for gating new validators in v1.7.0         | OQ-0007   |
| DR-0082 | Explicit surface classification as primary SSOT for UI-bearing detection | Explicit `surface` field in pack metadata is the authoritative source for UI-bearing classification. Content-signal heuristics (HTML tags, Mermaid screen flows per DR-0042) are used only as fallback when no explicit classification exists. Explicit classification always overrides conflicting content signals. | remediation discussion-20260329195516830 REQ-0007 |

## Detailed Decision Record

### DR-0082: Explicit surface classification as primary SSOT

- Date: 2026-03-30
- Resolved by: discussion-20260329195516830 (v1.7.6 remediation, REQ-0007)
- Decision: Enforce a two-tier detection model:
  1. **Primary SSOT**: Explicit `surface` field in pack metadata (`surface: ui | non-ui | unknown`). When present, this field is the sole classification source.
  2. **Fallback heuristics**: Content-signal detection per DR-0042 (artifact presence). Applied only when no explicit `surface` field exists. Ambiguous signals produce `unknown` classification with a warning.
- Rationale: v1.7.6 audit (discussion-20260329195516830) identified inconsistency between documentation (which stated explicit classification takes precedence) and implementation (which allowed content signals to override explicit metadata). This decision unifies both to eliminate the contradiction. Explicit classification is deterministic and maintainer-controlled; content signals are probabilistic and should never supersede a deliberate declaration.
- Alternatives rejected:
  - Content signals as sole detection method: Fragile; susceptible to false positives from non-UI HTML fragments in discussion packs.
  - Equal weight between explicit and content signals: Introduces unpredictable behavior when they conflict; violates SSOT principle.
- Impact: BR-0023-0026, BR-0023-0027, BR-0023-0028, BR-0023-0029, BR-0023-0030, BR-0023-0031; US-0023-0009; AC-0023-0024..AC-0023-0029

## Empty State

- 7 decisions total (DR-0042..DR-0047, DR-0082). All resolved.
