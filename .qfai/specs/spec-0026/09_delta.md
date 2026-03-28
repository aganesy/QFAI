# 09 Delta

## Change Summary

- Change ID: DELTA-0026-001
- Date: 2026-03-28
- Primary: CAP-0026 Discussion/UIUX Authoring Foundation SDD 作成
- Tags: @uiux @discussion @sidecar @template @skill
- Summary: v1.7.3 の SDD spec-0026 を新規作成。uiux/ サイドカー11ファイルテンプレート、SKILL.md UI-bearing フロー、ダイレクトテンプレート置換、バッチテンプレート UX intent 拡張の仕様を定義。

## Rationale

- QFAI の qfai-discussion スキルは UI-bearing プロジェクトに対して構造化されたスコアリング可能なアーティファクトを生成できない。
- 既存の HTML/CSS mock は下流のバリデータやレビュアーが機械的にスコアリングできないため、手動のやり直しが発生する。
- v1.7.3 で uiux/ サイドカー（11ファイル）と SKILL.md UI-bearing フローを導入し、構造化された YAML/MD アーティファクトで下流の品質ゲートを自動化可能にする。

## Candidates Considered

1. 既存テンプレートに UI/UX セクションを直接埋め込む
2. アディティブ uiux/ サイドカー + テンプレート置換/拡張（採用）
3. 完全に独立した UI/UX スキルを新設する

## Adopted

- Adopted: 候補 2 — アディティブ uiux/ サイドカー + ダイレクトテンプレート置換 + バッチテンプレート拡張
- Why: 既存15ファイルコアパック構造を維持しつつ、UI-bearing プロジェクトのみに追加アーティファクトを提供。非 UI プロジェクトへの影響ゼロ。ダウンタイムなし
- Evidence: DR-0056 (verbosity), DR-0057 (classification), discussion-20260328120000000

## Rejected

### 候補 1: 既存テンプレートに UI/UX セクションを直接埋め込む

- Candidate: 03_Story-Workshop.md 等に UI/UX セクションを直接追加
- Reason: コアパック15ファイルの肥大化、非 UI プロジェクトにも空セクションが残る、責務境界の曖昧化
- DO NOT: コアパックテンプレートに UI/UX 固有の大量コンテンツを埋め込まない
- Temptation: 既存ファイルに追記するだけなら簡単だと思うが、コア/サイドカーの責務分離が崩れる

### 候補 3: 完全に独立した UI/UX スキルを新設する

- Candidate: qfai-uiux-discussion として独立スキルを作成
- Reason: discussion フローの統一性が失われる、ユーザーがどちらのスキルを使うか迷う、重複コードの増加
- DO NOT: ディスカッション UI/UX オーサリングを独立スキルにしない
- Temptation: 独立スキルの方がスコープが明確と思うが、ユーザー体験が分断される

### Verbose サイドカー (OQ-0001 rejected)

- Candidate: 全アーティファクトに全パターンの例を含める
- Reason: オーサリング摩擦が過大（NFR-0026-0003 に違反するリスク）
- DO NOT: 冗長な例をサイドカーテンプレートに含めない
- Temptation: 完全性を追求して全パターンを例示したい

### Interaction complexity ベース分類 (OQ-0002 rejected)

- Candidate: interaction complexity で UI-bearing を判定
- Reason: 主観的で自動化困難、一貫性のある判定が不可能
- DO NOT: interaction complexity を UI-bearing 判定基準にしない
- Temptation: インタラクションの複雑さで UI を検出したい

## Impact

- Affects: templates/, SKILL.md, init assets (packages/qfai/assets/init/), tests, docs, CHANGELOG
- Validation: qfai validate --fail-on error must pass with error=0, verify-pack must pass

## Follow-ups

- 実装: `/qfai-prototyping` or `/qfai-atdd` で下流実装に進む
- Deferred OQ-0026-0001: screen contracts vs CON-UI bridging (due 2026-04-15)
- Deferred OQ-0026-0002: reviewer output schema (due 2026-04-30)
- Owner: agent
- Due: v1.7.3 release
