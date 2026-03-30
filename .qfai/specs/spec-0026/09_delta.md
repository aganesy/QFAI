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

---

- Change ID: DELTA-0026-002
- Date: 2026-03-30
- Primary: v1.7.6 remediation — strategy artifact 5-field requirement
- Tags: CAP-0026, v1.7.6, remediation, REQ-0026-0005
- Summary: REQ-0026-0005 の未達を修正。UI/UX Implementation Strategy アーティファクトに selection_required, candidate_options, chosen_option, verification_expectations, none-as-legitimate-outcome の5フィールドを必須化する。

## Rationale (DELTA-0026-002)

- 元の REQ-0026-0005 は UI-bearing 検出の実装に焦点を当てており、strategy アーティファクトの必須フィールドセットが不完全だった。
- 5フィールドの完全な明示により、qfai validate が意思決定トレースを検証できるようになる。
- none-as-legitimate-outcome を正当な選択肢として扱うことで「選択しない」という意思決定も証跡として残せる。

## Candidates Considered (DELTA-0026-002)

1. strategy アーティファクトの5フィールドを必須化する（採用）
2. 既存フィールドセットをそのまま維持し、追加フィールドを任意とする（却下）

## Adopted (DELTA-0026-002)

- Adopted: 5フィールドを全て必須化
- Why: 完全な意思決定トレーサビリティのために5フィールド全てが必要。none-as-legitimate-outcome の明示により「選ばない」決定も証跡に残せる。

## Rejected (DELTA-0026-002)

- Candidate: 追加フィールドを任意にする
- Reason: 任意フィールドでは qfai validate が完全なトレースを保証できない
- DO NOT: strategy アーティファクトの5フィールドを任意フィールドとして扱わない
- Temptation: 後方互換を優先して既存フィールドセットを変更しないようにしたくなる

## Impact (DELTA-0026-002)

- Affects: `uiux/10_strategy.md` テンプレート、validation ロジック、tests (TC-0026-0029..TC-0026-0034)
- New items: US-0026-0005、AC-0026-0016..0021、BR-0026-0019..0022、EX-0026-0029..0034、TC-0026-0029..0034、DR-LOCAL-003
- Validation: `qfai validate --fail-on error` must pass with `error=0`

## Follow-ups (DELTA-0026-002)

- v1.7.7+: 5フィールドの機械的バリデーション（スキーマ JSON Schema 化）
- Owner: team
- Due: v1.7.6 release

---

- Change ID: DELTA-0026-003
- Date: 2026-03-30
- Primary: v1.7.6 remediation — 3-layer scoring / screen contract schema alignment
- Tags: CAP-0026, v1.7.6, remediation, DR-0080, REQ-0026-0010
- Summary: uiux sidecar の評価モデルを 3-layer canonical model に揃え、screen contract minimum を screen-level obligation 中心に更新する。

## Rationale (DELTA-0026-003)

- master design spec と shared policy では 3-layer model が canonical だが、spec-0026 の一部記述に 4-axis wording が残っていた。
- screen contract も component/field 固定ではなく、screen identity と observable behavior を最小 obligation として持つ必要がある。

## Adopted (DELTA-0026-003)

- Adopted: invariant / trend-derived / product-specific + aggregate scoring rules を spec-0026 の canonical wording とする
- Adopted: screen contract minimum は route, actor, purpose, primary tasks, required states, transitions, observable outcomes を含む

## Rejected (DELTA-0026-003)

- Candidate: 4-axis を spec-0026 の canonical wording として残す
- Reason: DR-0080 と衝突し、spec-0029/spec-0030 との一貫性を壊す
- DO NOT: 4-axis wording を最終アーキテクチャとして再導入しない
- Temptation: 既存テンプレート名に引きずられて 4-axis を残したくなる
