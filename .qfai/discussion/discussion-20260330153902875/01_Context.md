# 01_Context

## Metadata

| Key           | Value                                           |
| ------------- | ----------------------------------------------- |
| Discussion ID | discussion-20260330153902875                    |
| Date          | 2026-03-30                                      |
| Owner         | user                                            |
| Source        | v1.7.9 convergence design spec / issue register |

## Goal and Completion Criteria

- Goal: QFAI パッケージ v1.7.9 を convergence / correction / integration release として定義し、discussion から `/qfai-sdd` へ曖昧さなく引き渡せる状態にする。
- Measurable completion criteria:
  1. discussion / templates / validators / prototyping / evidence / docs が同一の canonical v1.7 model を参照すること。
  2. production validation path が新 UIX validators を実行すること。
  3. `qfai-discussion` が UI-bearing 向けに taste interview + trend scan + 3-layer rubric を必須化すること。
  4. generated UI/UX template family が legacy 4-axis ではなく 3-layer canonical set を前提にすること。
  5. `qfai-prototyping` が static-first / mode-aware contract を公開仕様として採用すること。
  6. `/qfai-prototyping-full-harness` が実在する user-facing path として定義されること。
  7. render evidence / browser QA が fail-open を含む honest runtime reporting を行うこと。
  8. docs / steering / changelog の成熟度表現が実装実態と矛盾しないこと。

## Stakeholders

- Primary stakeholders: QFAI maintainer、QFAI CLI/validator 利用プロジェクト
- Secondary stakeholders: discussion から SDD/ATDD/TDD へ接続する下流エージェント、CI/CD、レビュー担当者

## Background

- Business context: v1.7.9 は新機能探索ではなく、既に定まっている canonical architecture へ repo と user-facing workflow を収束させる release。
- Technical context: 現状の問題は architecture の不在ではなく、discussion / templates / validators / prototyping / docs が別々のアーキテクチャを語っている点にある。
- Historical context: v1.7.8 までの correction で基盤は整ったが、production validate path、discussion completion model、prototyping contract、evidence/QA wiring、docs state claims に split が残っている。

## Inputs

- Primary sources:
  - `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.9_convergence_design_spec_v0.1.md`
  - `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.9_issue_register_and_execution_plan_v0.1.md`
- Repository rules:
  - `.qfai/discussion/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/review-roster.yml`
  - `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`

## Surface Classification

| Key                        | Value                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Product Surface            | non-ui                                                                                                                             |
| UI-bearing discussion pack | No                                                                                                                                 |
| Reason                     | QFAI は CLI/validator/package であり、今回の discussion は UI product 自体ではなく UI-bearing project 向け機能の収束仕様を扱うため |

## Key Issues

- Issue 1: discussion / template / validator 間の canonical field 名と completion logic を統一する必要がある。
- Issue 2: runtime-heavy prototyping contract を static-first に是正しつつ、premium full-harness path を明確化する必要がある。
- Issue 3: render evidence / browser QA を「未実装なのに成功扱い」させず、skipped/failed/captured を honest に区別する必要がある。
- Issue 4: docs / steering / changelog が実装状況を過大表現しないように成熟度 vocabulary を揃える必要がある。
