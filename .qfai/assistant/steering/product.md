# Product Steering

## What are we building?

- Summary: QFAI - Quality-First Development Kit (CLI) for AI coding agents.
  Enforces SDD/ATDD/TDD workflows with validation gates via six commands
  (init, validate, report, doctor, guardrails, prototyping),
  and uses `qfai prototyping` as the entry point for v1.7.1 render evidence capture.
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
- browser QA full audit / screenshot diff / repair loop / external critique adapter (OUT for v1.7.1)
- Evidence: 02_Inception-Deck.md (NOT List), 05_Scope.md (Out of Scope)

## Release posture

- Compatibility policy: semver. Maintain backward compatibility of the CLI command system.
- Breaking change policy: Breaking changes deferred until v2.0. Migration guide (docs/migrations/) required.
- Evidence: CHANGELOG.md, 09_Constraints.md (DL-02)

## Milestones

| Version             | Description                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.5.5              | Spec Diff Protocol (SDP) - Incremental execution support                                                                                                                                                             |
| v1.5.6              | Review Agent Enhancement - Devil's Advocate + Pattern Doubler                                                                                                                                                        |
| v1.5.7              | UI/UX Definition & Review Framework - Design Token, HTML Mock, Expert Sub-agents                                                                                                                                     |
| v1.6.0              | Implementation Phase Unification - qfai-implement, test-list.md, Phase 1 Validator                                                                                                                                   |
| v1.6.1              | Guardrail Hardening - Phase 2 Validator, Report Coverage, Template/Docs Update (完了)                                                                                                                                |
| v1.6.2 (完了)       | 開発ツールキット堅牢化 — Sub-agent Roster + Completion/Evidence/Parallel Contracts + Docs/Wrappers/Assets Sync                                                                                                       |
| v1.6.3 (完了)       | Copilot レビューインストラクション配布 — qfai init に Copilot レビュー指示テンプレートを統合                                                                                                                         |
| v1.6.4 (完了)       | Codex サブエージェント実装 — 39 TOML エージェント + config.toml                                                                                                                                                      |
| v1.6.5 (完了)       | デザインディレクション＆UI品質強化 — DDP + Navigation/Screen Flow + Render Critique Loop + Fidelity Evaluation                                                                                                       |
| v1.7.0 (進行中)     | ディスカッション設計強化 — UI-bearing detection + DDS enforcement + competitive reference registry + error-severity validators                                                                                       |
| v1.7.1 (完了)       | Render Evidence Automation — `qfai prototyping` に render evidence capture / skipped / failed を追加し、validate/report が structured evidence を理解できるようにする                                                |
| v1.7.2 (完了)       | Design Audit & Slop Guardrails — 静的 design audit 7 dimension + AI slop guardrails SLP-01〜SLP-06 + quality profile severity 制御                                                                                   |
| v1.7.3 (完了)       | Discussion/UIUX Authoring Foundation — qfai-discussion に uiux/ サイドカーアーティファクト生成、SKILL.md UI-bearing フロー、テンプレート置換・拡張を追加                                                             |
| v1.7.4 (SDD 完了)   | Validation, Review, and Migration Stabilization — UIX-VAL deterministic validators + UIX-REV semantic reviewers + verify-pack tests + migration support                                                              |
| v1.7.5 (完了)       | Runtime & Evidence Foundation — prototyping static-first default recovery + optional render evidence capture + backend provider abstraction + browser QA structured outputs                                          |
| v1.7.6 (SDD 進行中) | Critique, Calibration & Full-Harness Expansion — external critique adapter + calibration pack + `/qfai-prototyping-full-harness` premium mode + cost/time observability + handoff artifacts + display/stub detection |

## Open questions

- Blocking: none
- Non-blocking:
  - OQ-0003: validate.json external API stability (deferred to v2.0)
  - OQ-0004: Legacy spec-pack deprecation schedule (deferred to v2.0)
