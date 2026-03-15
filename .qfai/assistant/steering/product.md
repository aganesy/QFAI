# Product Steering

## What are we building?

- Summary: QFAI - Quality-First Development Kit (CLI) for AI coding agents. Enforces SDD/ATDD/TDD workflows with validation gates via six commands (init, validate, report, doctor, guardrails, prototyping).
- Evidence: README.md, packages/qfai/package.json, packages/qfai/src/cli/index.ts

## Who is the user?

- Personas / roles:
  - AI coding agents (Claude Code, GitHub Copilot, Codex, Anthropic Agents)
  - QA engineers (quality assurance via validation gates)
  - Project leads (centralized spec management and traceability)
  - CI/CD engineers (validation integration into pipelines)
- Evidence: 02_Inception-Deck.md (Stakeholders)

## What is "success"?

- Success metrics / acceptance definition:
  - All CLI command requirements are defined as REQs
  - All validation rules (50+) are specified
  - All traceability edges (US->AC->BR->EX->TC) are defined
  - Zero errors with qfai validate --fail-on error
- Evidence: 05_Scope.md (Success Criteria)

## Non-goals

- IDE plugin / GUI development
- Code quality analysis (not a replacement for ESLint/SonarQube)
- Automated generation of tests themselves
- Semantic analysis of natural language
- Evidence: 02_Inception-Deck.md (NOT List), 05_Scope.md (Out of Scope)

## Release posture

- Compatibility policy: semver. Maintain backward compatibility of the CLI command system.
- Breaking change policy: Breaking changes deferred until v2.0. Migration guide (docs/migrations/) required.
- Evidence: CHANGELOG.md, 09_Constraints.md (DL-02)

## Milestones

| Version | Description                                                   |
| ------- | ------------------------------------------------------------- |
| v1.5.5  | Spec Diff Protocol (SDP) - Incremental execution support      |
| next    | Review Agent Enhancement - Devil's Advocate + Pattern Doubler |

## Open questions

- Blocking: none
- Non-blocking:
  - OQ-0003: validate.json external API stability (deferred to v2.0)
  - OQ-0004: Legacy spec-pack deprecation schedule (deferred to v2.0)
