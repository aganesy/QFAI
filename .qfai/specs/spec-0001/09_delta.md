# 09 Delta

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
