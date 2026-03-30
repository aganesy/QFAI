# 06 REQ (Functional Requirements)

## Requirements Table

| REQ-ID   | Title | Description | Source | Priority | Status |
| -------- | ----- | ----------- | ------ | -------- | ------ |
| REQ-0001 | Spec Auto-Discovery Protocol 共通定義 | spec引数省略時に4ソース統合差分検出を起動し、対象specを自動特定するプロトコルを定義する | SRC-0001, SRC-0007 | must | draft |
| REQ-0002 | Source A: git diff検出 | `git diff --name-only origin/main..HEAD` で `.qfai/specs/` 配下の変更ファイルを検出し、変更spec-idを抽出する | SRC-0001, SRC-0006 | must | draft |
| REQ-0003 | Source B: ローカル変更検出 | `git diff --name-only` および `git diff --name-only --staged` でローカルの変更ファイルを検出する | SRC-0001 | must | draft |
| REQ-0004 | Source C: timestamp比較 | evidenceの `last_run_timestamp` とspecファイルの mtime を比較し、stale specを検出する | SRC-0001 | must | draft |
| REQ-0005 | Source D: delta.md パース | `09_delta.md` の変更サマリからコンテキスト情報を取得する | SRC-0001 | must | draft |
| REQ-0006 | 統合判定ロジック | `changed_specs = Source A ∪ Source B ∪ Source C ∪ Source D` で統合し、各specを `implemented / missing / stale / unchanged` に分類する | SRC-0001, SRC-0007 | must | draft |
| REQ-0007 | /qfai-prototyping Spec Auto-Discovery統合 | SKILL.mdに Spec Auto-Discovery Protocol セクションを追加し、spec引数省略時に差分specのみprototyping実行する。変更ゼロ時はフルスキャンフォールバック | SRC-0002, SRC-0007 | must | draft |
| REQ-0008 | /qfai-implement Spec Auto-Discovery統合 | SKILL.mdに Spec Auto-Discovery Protocol セクションを追加し、spec引数省略時に差分specをリスト表示・選択実行する。単一spec時は自動選択（確認付き） | SRC-0003, SRC-0007 | must | draft |
| REQ-0009 | Traceability Integrity Validator | specのBR/AC変更ファイルと実装ファイルの差分有無をチェックし、不整合をvalidation error/warningとして報告する | SRC-0005, SRC-0007 | must | draft |
| REQ-0010 | Evidence Diff Context記録 | evidenceファイルに `Diff Context` セクションを追加し、`last_commit_sha`, `last_run_timestamp`, `changed_specs`, `execution_mode` を記録する | SRC-0001 | must | draft |
| REQ-0011 | --full フラグサポート | 明示的にフルスキャンを強制するフラグを両スキルに追加する | SRC-0001 | should | draft |
| REQ-0012 | Policy変更時の影響波及 | `_policies/` 配下の変更検出時は保守的に全specを対象とし、ユーザー確認を行う | SRC-0001 | should | draft |
| REQ-0013 | フォールバック動作 | git不在時・evidence不在時はフルスキャンにフォールバックする | SRC-0001, SRC-0006 | must | draft |
| REQ-0014 | ベースブランチ設定 | `origin/main` をデフォルトとし、`qfai.config.yaml` でカスタマイズ可能にする | SRC-0007 | should | draft |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
