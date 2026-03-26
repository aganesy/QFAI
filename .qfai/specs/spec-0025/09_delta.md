# 09 Delta

## Change Summary

- Change ID: DELTA-0025-001
- Date: 2026-03-26
- Primary: CAP-0025 Design Audit & Slop Guardrails SDD 作成
- Tags: @uiux @validator @config @report @test
- Summary: v1.7.2 の SDD spec-0025 を新規作成。7 audit dimension + 6 SLP category による静的 design quality 監査と AI slop guardrails の仕様を定義。

## Rationale

- QFAI の UI/UX 品質評価に静的な design audit と AI slop guardrails が欠けている。
- 既存バリデータは構造チェックに長けるが、設計判断の質を横断的に監査する仕組みがない。
- v1.7.2 で designAudit.ts（構造的監査）と designSlop.ts（AI slop 検知）を導入し、rule tier × quality profile で severity を制御する。

## Candidates Considered

1. 既存バリデータに audit ロジックを分散追加する
2. 専用バリデータ (designAudit.ts + designSlop.ts) に集約する
3. 1 ファイルに audit + slop を統合する

## Adopted

- Adopted: 候補 2 — designAudit.ts + designSlop.ts に分離集約
- Why: 責務分離（構造的監査 vs AI slop 検知）が明確。独立した有効/無効制御が可能。既存バリデータの DDP 構造チェックを維持しつつ、新機能を追加
- Evidence: DR-0049, DR-0050, DR-0055 (_policies/08_Decisions.md)

## Rejected

### 候補 1: 既存バリデータに audit ロジックを分散追加

- Candidate: ddpValidation.ts, designFidelity.ts, designToken.ts 等に audit ロジックを追加
- Reason: バリデータ間の findings 重複、責務境界の曖昧化、独立テストの困難化
- DO NOT: 既存バリデータに audit dimension を埋め込まない
- Temptation: 既存ファイルに 1-2 行追加するだけなら楽だと思うが、横断的な監査が必要な dimension は専用ファイルに集約すべき

### 候補 3: 1 ファイルに audit + slop を統合

- Candidate: designAuditAndSlop.ts として 1 ファイルに統合
- Reason: ファイル肥大化、責務混在、audit のみ / slop のみの制御が困難
- DO NOT: audit と slop を 1 ファイルに混ぜない
- Temptation: ファイル数を減らしたいが、config.slopDetection=false の制御が複雑になる

### 全ルール error

- Candidate: 全 tier を error にする（strict 相当をデフォルト化）
- Reason: style-heuristic は false-positive リスクが高く、全 error は信頼性を損なう
- DO NOT: style-heuristic (Tier 3) を error にしない
- Temptation: 厳格にした方が品質が上がると思うが、導入障壁が上がり無効化される

### 全ルール warning/info

- Candidate: structural-blocking も含め全て warning/info にする
- Reason: 壊れた設計（primary CTA なし、全 state 欠落）が通過してしまう
- DO NOT: structural-blocking (Tier 1) を warning に下げない
- Temptation: ユーザーを驚かせたくないが、構造的不備は error であるべき

## Impact

- Affects: validators/, config.ts, report.ts, index.ts, tests, docs
- Validation: qfai validate --fail-on error must pass with error=0

## Follow-ups

- 実装: `/qfai-prototyping` or `/qfai-atdd` で下流実装に進む
- Owner: agent
- Due: v1.7.2 release
