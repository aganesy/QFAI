# 01 Spec

- Spec: spec-0011
- Parent: CAP-0011

## Consumer View

- Primary SSOT for execution: `spec-0011/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: Preflight Diff Protocol 共通定義、/qfai-atdd SKILL.md インクリメンタルモード、/qfai-prototyping SKILL.md インクリメンタルモード、Evidence スキーマ拡張（Diff Context セクション）、--full フラグ、Policy 変更時の影響波及
- Out: TypeScript コード変更、/qfai-verify のインクリメンタル対応、qfai validate コマンド自体の改修、delta.md パーサーの改修、CI/CD パイプラインの変更

## Applicable NFR

- NFR-0001: 差分検出の漏れ防止 - 3ソース合成による変更検出で漏れゼロを保証（reliability, must）
- NFR-0002: SKILL.md のみの改修 - TypeScript コード変更を伴わず SKILL.md プロンプト改修のみで実現（maintainability, must）
- NFR-0003: フォールバック動作 - evidence 不在・git 不可時はフルスキャンにフォールバック（reliability, must）
- NFR-0004: 後方互換性 - 既存 evidence ファイルに Diff Context セクションがなくても正常動作（maintainability, must）
- NFR-0005: Diff Summary の可読性 - 変更 spec 一覧を人間が一目で把握できる形式で提示（usability, should）

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: SKILL.md diff, evidence ファイルの Diff Context セクション

## Relevant Requirements

- REQ-0001: Preflight Diff Protocol 共通定義 - 3ソース統合差分検出プロトコルの共通手順を定義する
- REQ-0002: Source A: git diff 検出 - git diff --name-only で spec ファイルの変更を検出する
- REQ-0003: Source B: timestamp 比較 - evidence の last_run_timestamp と spec ファイルの mtime を比較する
- REQ-0004: Source C: delta.md パース - 09_delta.md の変更サマリからコンテキスト情報を取得する
- REQ-0005: 統合判定ロジック - changed_specs = union(A,B), change_context = C で統合判定する
- REQ-0006: Implementation State Analysis - 各 spec を implemented/missing/stale/unchanged に分類する
- REQ-0007: /qfai-atdd インクリメンタルモード - missing はテスト新規生成、stale はテスト更新、unchanged はスキップ
- REQ-0008: /qfai-prototyping インクリメンタルモード - changed_specs のみスケルトン更新、unchanged は Runtime Gate のみ
- REQ-0009: Evidence Diff Context セクション - last_commit_sha, last_run_timestamp, changed_specs, execution_mode を記録
- REQ-0010: フルモードフォールバック - evidence 不在時はフルスキャンにフォールバックする
- REQ-0011: --full フラグ - 明示的にフルスキャンを強制するオプション
- REQ-0012: Policy 変更時の影響波及 - \_policies 配下の変更検出時は保守的に全 spec を対象 + ユーザー確認
- REQ-0013: /qfai-verify フルスキャン維持 - verify は常にフルスキャンを行い、インクリメンタル対象外とする

## Entry points

- US range in this spec: US-0011-0001..US-0011-0004
- Primary actors: QFAI 利用開発者 / AI コーディングエージェント
- Notes: SKILL.md プロンプト改修による下流スキルの差分検出・インクリメンタル処理の定義

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
