# 01 Context

## Metadata

| Key           | Value                                 |
| ------------- | ------------------------------------- |
| Discussion ID | discussion-20260329103000000          |
| Date          | 2026-03-29                            |
| Owner         | agent                                 |
| Source        | qfai_v1.7.5_design_spec_renumbered.md |
| Surface Type  | non-ui                                |

## Goal and Completion Criteria

### Goal

v1.7.5 では `/qfai-prototyping` の default 完了条件を static-first に戻しつつ、render evidence、visual-review/browser backend abstraction、browser QA を optional capability として整備する。browser/web を universal hard dependency にしないことが中心目的である。

### Completion Criteria

1. prototyping default path が runtime-heavy check なしで成立する方針が明文化されている
2. render evidence の対象、status、optional semantics が定義されている
3. visual-review / browser backend abstraction が capability registration 前提で定義されている
4. browser QA が structured findings と repair suggestions を返す方針になっている
5. non-web / non-visual project で不要な obligation が発生しない
6. open OQ が 0 件で discussion を閉じられる

## Stakeholders

- Primary: QFAI コア開発者、`/qfai-prototyping` 利用者
- Secondary: UI/UX review を扱う downstream 利用者、CI/運用担当
- Indirect: non-web / non-visual project の利用者

## Background

### Business Context

現場フィードバックにより、現状の prototyping が default で runtime-heavy な obligations を背負い、ATDD と責務重複していることが問題化した。v1.7 系で整備した上流 artifact を維持しつつ、軽量な標準経路を回復する必要がある。

### Technical Context

- 対象は monorepo の `packages/qfai` CLI / validator / report / evidence schema
- 変更は `/qfai-prototyping`、evidence schema、mode handling、backend registration、tests、docs にまたがる
- surface は CLI/toolkit であり non-ui。UI sidecar 追加は不要

## Inputs

- Design specification: `C:\Users\YusukeSenaga\Downloads\qfai_v1.7.5_design_spec_renumbered.md`
- Discussion SSOT: `.qfai/discussion/README.md`
- Specs SSOT: `.qfai/specs/README.md`
- Evidence SSOT: `.qfai/evidence/README.md`
- Review roster: `.qfai/assistant/steering/review-roster.yml`
- RCP footer: `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`

## Assumptions

1. v1.7.x upstream artifacts は安定しており、本件は foundation correction と capability addition が主である
2. browser/backend capability は optional registration ベースで、default install を前提にしない
3. render evidence の quality 自体は hard gate にしない
4. unresolved naming/versioning detail は deferred で管理し、discussion 完了を妨げない

## Issues and Risks

- static/runtime boundary correction と evidence/backends/browser QA を同一リリースに載せるため scope 膨張リスクが高い
- backend abstraction を誤ると web 固定設計が残る
- browser QA が optional ではなく implicit dependency と誤読される
- schema versioning と output normalization を急ぎすぎると v1.7.5 スコープを超える
