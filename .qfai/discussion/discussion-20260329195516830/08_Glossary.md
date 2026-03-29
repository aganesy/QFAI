# 08 Glossary

## Term Definitions

| Term | Definition | Context | Source |
| ---- | ---------- | ------- | ------ |
| Static-first prototyping | Prototyping mode that requires no runtime environment; validation is based on static analysis of code and artifacts only | Prototyping phase | SRC-0001 |
| Full-harness prototyping | Premium prototyping mode that includes runtime-heavy checks (UI route reachability, API non-404, DB object presence) | Prototyping phase | SRC-0001 |
| Low-cost mode | Minimal prototyping mode with lightest validation requirements | Prototyping CLI | SRC-0001, SRC-0005 |
| Standard mode | Default prototyping mode with static-first validation | Prototyping CLI | SRC-0001, SRC-0005 |
| 3-layer evaluation model | Evaluation architecture with invariant, trend-derived, and product-specific layers | UI/UX evaluation | SRC-0001 |
| 4-axis evaluation model | Current implementation with usability, consistency, accessibility, and delight axes | UI/UX evaluation (legacy) | SRC-0004 |
| Invariant layer | Evaluation criteria that are universal and do not change across products or trends | 3-layer model | SRC-0001 |
| Trend-derived layer | Evaluation criteria derived from current design/UX trends | 3-layer model | SRC-0001 |
| Product-specific layer | Evaluation criteria unique to the specific product being developed | 3-layer model | SRC-0001 |
| Surface type classification | Method for determining whether a project is UI-bearing based on its surface type (web-ui, mobile-ui, desktop-ui, mixed, non-ui) | Validation | SRC-0006 |
| Render evidence | Evidence artifacts capturing visual rendering output from prototyping | Evidence system | SRC-0009 |
| Browser QA | Automated quality assurance checks run in a browser environment | Full-harness mode | SRC-0007 |
| Mode resolver | Internal module that determines which prototyping mode to apply based on config and flags | CLI internals | SRC-0005 |

## Abbreviations

| Abbreviation | Full Form | Notes |
| ------------ | --------- | ----- |
| QFAI | Quality-First AI | Project name |
| CLI | Command Line Interface | User-facing tool interface |
| QA | Quality Assurance | Testing and verification |
| SSOT | Single Source of Truth | Authoritative data location |
| UI | User Interface | Visual user interaction layer |
| UX | User Experience | Overall user interaction quality |
| DDS | Design Direction Summary | Discussion artifact section |
| RCP | Review Cycle Protocol | Review process rules |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
