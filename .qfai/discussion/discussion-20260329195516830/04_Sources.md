# 04 Sources

## Source Registry

| SRC-ID   | Title | Type    | URL / Path | Retrieved  | Notes |
| -------- | ----- | ------- | ---------- | ---------- | ----- |
| SRC-0001 | QFAI v1.7.6 Issue Register and Remediation Plan | primary | qfai_v1.7.6_issue_register_and_remediation_plan.md | 2026-03-29 | Static audit of QFAI-2-v1.7.6.zip |
| SRC-0002 | QFAI Repository Source Code | primary | packages/qfai/src/ | 2026-03-29 | Implementation source |
| SRC-0003 | qfai-prototyping Skill Definition | primary | .qfai/assistant/skills/qfai-prototyping/SKILL.md | 2026-03-29 | Current prototyping skill |
| SRC-0004 | UX Evaluation Axis Templates | primary | .qfai/assistant/skills/qfai-discussion/templates/uiux/ | 2026-03-29 | Current 4-axis implementation |
| SRC-0005 | Prototyping Mode Resolver | primary | packages/qfai/src/core/prototyping/modeResolver.ts | 2026-03-29 | Internal mode logic |
| SRC-0006 | Discussion Design Hardening Validator | primary | packages/qfai/src/core/validators/discussionDesignHardening.ts | 2026-03-29 | UI-bearing detection logic |
| SRC-0007 | Browser QA Runner | primary | packages/qfai/src/core/browserQa/runner.ts | 2026-03-29 | Scaffold-level QA runner |
| SRC-0008 | CLI Prototyping Command | primary | packages/qfai/src/cli/commands/prototyping.ts | 2026-03-29 | CLI command with placeholder logic |
| SRC-0009 | Evidence Handler | primary | packages/qfai/src/core/evidence/evidenceHandler.ts | 2026-03-29 | Partial render evidence |
| SRC-0010 | Real Project Feedback | secondary | (verbal/session) | 2026-03-29 | User feedback on environment dependence and phase overlap |

## Source Types

- `primary`: First-hand evidence (interviews, documents, code).
- `secondary`: Derived information (summaries, analyses).
- `external`: Third-party references (specs, RFCs, vendor docs).

## Competitive Reference Registry

Not applicable — this is a non-ui CLI tool remediation.

## Traceability

- Each REQ/NFR references at least one SRC-ID from this registry.
- Sources without REQ/NFR links should be reviewed for relevance.
