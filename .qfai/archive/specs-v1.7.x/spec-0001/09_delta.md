# 09 Delta

> **注**: アーカイブ内の DELTA-ID は作成当時の命名規則に従っています。spec 番号をプレフィックスに含むフォーマット（例: `DELTA-0005-0001`）は後発の spec で導入されたもので、既存アーカイブの ID は遡及変更しない方針です。

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0001 初回作成
- Tags: init, layered-spec, v1.5.3
- Summary: spec-0001（qfai init）のレイヤードスペック形式での初回作成

## Rationale

- QFAI v1.5.3 でレガシーな spec-pack 形式（単一18ファイルバンドル）からレイヤードスペック形式（`_policies/` + `spec-XXXX/`）へ移行した
- init コマンドのスペックを新形式で定義し、実装・テストの基盤とする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: CAP 単位での独立したスペック管理、複数 CAP のスケーラビリティ、ポリシーの共有・再利用が可能
- Evidence: `_policies/08_Decisions.md`, v1.5.3 マイグレーションガイド

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: 複数 CAP を扱う場合にスケーラビリティが損なわれ、ポリシーの重複管理が発生する
- DO NOT: spec-pack 形式（単一18ファイルバンドルに全スペックを格納する方式）に戻さないこと
- Temptation: 単一ファイルの方がシンプルに見えるが、CAP が増えるにつれてファイル肥大化・ポリシー重複・トレーサビリティの複雑化が発生し、複数 CAP のスケーラビリティが損なわれる

## Impact

- Affects: `.qfai/specs/spec-0001/` 配下の全ファイル（01_Spec ~ 10_Plan）
- Validation: `qfai validate` でレイヤードスペック形式の必須ファイル検証（E_SPEC_MISSING_FILESET）が通過すること

## Follow-ups

- spec-0001 の実装着手（10_Plan.md に基づく）
- Owner: 実装担当者
- Due: TBD

---

## Change Summary (DELTA-0002)

- Change ID: DELTA-0002
- Date: 2026-03-12
- Primary: spec-0001 symlink アーキテクチャ移行
- Tags: init, symlink, v1.5.4
- Summary: spec-0001（qfai init）に symlink ベースのラッパー配布機能を追加

## Rationale (DELTA-0002)

- discussion-20260312143000000 で承認された symlink アーキテクチャ移行
- `.claude/commands/` と `.github/prompts/` を廃止し、全ツール統合ディレクトリを symlink で統一
- ラッパーファイルの二重管理を排除し、カノニカルスキル/エージェントの更新が即座に反映される

## Candidates Considered (DELTA-0002)

1. Symlink ベースの配布（`fs.symlink()` + `git config core.symlinks true`）
2. レガシーのファイルコピーベース配布（`writeFile()` + thin wrapper テキスト）
3. Junction（Windows）+ テキストファイル（ファイル用）の混合 fallback

## Adopted (DELTA-0002)

- Adopted: Symlink ベースの配布
- Why: 保守コスト排除、SSOT の自動反映、Git ネイティブサポート（mode 120000）
- Evidence: discussion-20260312143000000/99_delta.md

## Rejected (DELTA-0002)

- Candidate: レガシーのファイルコピーベース配布
- Reason: スキル更新時にラッパー再生成が必要で、二重管理コストが高い
- DO NOT: writeFile() によるラッパーファイル生成に戻さないこと
- Temptation: symlink はクロスプラットフォーム問題があるからファイルコピーの方がシンプルに見えるが、保守コストと一貫性の観点で劣る

- Candidate: Junction + テキストファイル fallback
- Reason: 二重の互換性レイヤーが複雑性を増し、テスト面積が拡大する
- DO NOT: junction やテキストファイルの fallback を実装しないこと
- Temptation: Windows 互換性を最大化したいが、Developer Mode + git config で十分対応可能

## Impact (DELTA-0002)

- Affects: `packages/qfai/src/cli/commands/init.ts` の `syncIntegrationWrappers()` 全体
- New functions (in init.ts): `configureGitSymlinks()`, `createSkillSymlinks()`, `createAgentSymlinks()`, `ensureSymlink()`, `pruneStaleQfaiWrappers()`, `buildCopilotInstructions()`
- Note: 当初計画では init/symlinks.ts 等に分割予定だったが、init.ts 内に集約して実装した
- Validation: `qfai validate` で symlink 関連のバリデーションが通過すること

## Follow-ups (DELTA-0002)

- spec-0001 の symlink 実装着手（10_Plan.md に基づく）
- Owner: 実装担当者
- Due: v1.5.4 リリース

---

## Change Summary (DELTA-0003)

- Change ID: DELTA-0003
- Date: 2026-03-30
- Primary: spec-0001 v1.7.6 remediaton pass — migration and doc normalization
- Tags: remediation, migration, version-normalization, v1.7.6
- Summary: v1.7.6 静的監査（discussion-20260329195516830）に基づく spec-0001 リメディエーションパス。US-012（マイグレーションとアップグレードサポート）、US-010（バージョン表記正規化）、US-011（内部モジュールワークフロードキュメント）を spec-0001 に追加。対応 REQ-0018/REQ-0019、US-0001-0011/0012/0013、AC-0001-0026〜0037、BR-0001-0031〜0040、EX-0001-0032〜0042、TC-0001-0039〜0051 を新規追加

## Rationale (DELTA-0003)

- v1.7.6 静的監査で P2 カテゴリの問題として、マイグレーションサポートの不足（P2-03）、内部ドキュメントの欠如（P2-02）、リポジトリ状態指標の不整合（P2-01）が識別された
- これらは既存の US/AC/BR 範囲では対応されていなかったため、spec-0001 に追加スライスとして組み込む
- qfai init はプロジェクトのアップグレードエントリポイントとして機能するため、マイグレーションロジックは spec-0001 の scope に含まれる

## Candidates Considered (DELTA-0003)

1. spec-0001 への追加（マイグレーション機能を init コマンドの延長として実装）
2. 独立した spec-0004 の新規作成（マイグレーション専用スペック）
3. 実装のみ追加（スペック更新なし）

## Adopted (DELTA-0003)

- Adopted: spec-0001 への追加（候補1）
- Why: qfai init がプロジェクトセットアップ・アップグレードの主エントリポイントであり、マイグレーションロジックは既存の init フロー（REQ-0001〜REQ-0017）と自然に統合できる。新規 spec を作成するほどの独立したドメインではない
- Evidence: discussion-20260329195516830/03_Story-Workshop.md の US-012 および 06_REQ.md の REQ-0013

## Rejected (DELTA-0003)

- Candidate: 独立した spec-0004 の新規作成
- Reason: マイグレーション機能の scope が小さく、独立 CAP を正当化できない。既存 init フローとの統合が自然である
- DO NOT: マイグレーションロジックを init コマンドから完全に分離した独立 CLI コマンドとして実装しないこと
- Temptation: マイグレーションは独立機能に見えるが、実態は `qfai init` のアップグレードフローの一部である

- Candidate: 実装のみ追加（スペック更新なし）
- Reason: CLAUDE.md のトレーサビリティチェーン要件（REQ -> Spec -> Code -> Test）に違反する
- DO NOT: スペックなしで実装を追加しないこと

## Impact (DELTA-0003)

- Affects: spec-0001/01_Spec.md（REQ-0018, REQ-0019 追加、US range 更新）
- Affects: spec-0001/02_User-stories.md（US-0001-0011, 0012, 0013 追加）
- Affects: spec-0001/03_Acceptance-Criteria.md（AC-0001-0026〜0037 追加）
- Affects: spec-0001/04_Business-Rules.md（BR-0001-0031〜0040 追加）
- Affects: spec-0001/05_Examples.md（EX-0001-0032〜0042 追加）
- Affects: spec-0001/06_Test-Cases.md（TC-0001-0039〜0051 追加）
- Affects: spec-0001/10_Plan.md（新規 US の実装計画・テストファイル追加）
- New modules planned: `packages/qfai/src/cli/commands/init.ts` に `detectStaleAssets()`, `runMigration()`, `checkVersionConsistency()` 関数追加
- Validation: `qfai validate` でトレーサビリティチェーン検証が通過すること

## Follow-ups (DELTA-0003)

- spec-0001 の migration 機能実装着手（10_Plan.md 更新後）
- Owner: 実装担当者
- Due: v1.7.7 リリース

---

## Change Summary (DELTA-0004)

- Change ID: DELTA-0004
- Date: 2026-03-31
- Primary: v1.7.11 WS-B — canonical template generation in init assets
- Tags: init, canonical-templates, 3-layer, v1.7.11
- Summary: v1.7.11 WS-B — canonical template generation in init assets (US-0001-0014, AC-0001-0038..0039, BR-0001-0041..0043, EX-0001-0043..0045, TC-0001-0052..0054)

## Rationale (DELTA-0004)

- v1.7.11 で 3-layer canonical テンプレートを init アセットに追加し、4-axis テンプレートを deprecated とする
- init コマンドが生成するテンプレートを canonical model に揃える

## Candidates Considered (DELTA-0004)

1. 3-layer canonical templates added to init, 4-axis deprecated (adopted)
2. Immediate 4-axis deletion (rejected)

## Adopted (DELTA-0004)

- Adopted: 3-layer canonical templates added to init, 4-axis deprecated (DR-0102)
- Why: Canonical model への収束を進めつつ、既存ユーザーのマイグレーションウィンドウを確保する

## Rejected (DELTA-0004)

- Candidate: Immediate 4-axis deletion
- Reason: Breaks migration — 既存プロジェクトが 4-axis テンプレートに依存しており、即時削除はマイグレーションパスなしで破壊的変更となる
- DO NOT: delete deprecated templates without migration window
- Temptation: clean up by removing old files

## Impact (DELTA-0004)

- Affects: packages/qfai/assets/init/ テンプレート、spec-0001/02〜06 (US-0001-0014, AC-0001-0038..0039, BR-0001-0041..0043, EX-0001-0043..0045, TC-0001-0052..0054)
- Validation: qfai validate でトレーサビリティチェーン検証が通過すること

## Follow-ups (DELTA-0004)

- 4-axis テンプレートのマイグレーションウィンドウ終了後に削除
- Owner: 実装担当者
- Due: TBD
