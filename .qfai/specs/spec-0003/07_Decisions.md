# 07 Decisions

## Decisions

5 items.

### DR-0001: symlink ベースの統合方式

- 旧 commands/prompts のファイルコピー方式を廃止し、symlink ベースに移行した
- Why: skill 更新時にラッパー更新が不要（NFR-S0001）
- See also: ../_policies/08_Decisions.md

### DR-0002: instructions の create-only 保護

- `--force` を付けても `.github/instructions/` ファイルは上書きしない
- Why: ユーザーがカスタマイズした instructions を保護するため
- Source: 旧 spec-0017 DR-0022 through DR-0026

### DR-0003: Codex サブエージェントは静的配置

- `.codex/agents/*.toml` は init.ts の自動生成ロジックには含めず、リポジトリに静的配置する
- Why: Codex TOML は手動管理とし、init.ts の複雑性を抑制する
- Source: 旧 spec-0018 DR-0030

### DR-0004: Agent symlink の自動 prune 非対応

- Agent symlink は自動 prune 対象外とする（suffix が統合先ごとに異なるため stale 検出が困難）
- Why: 誤削除リスク回避のため手動削除を要求する

### DR-0005: README.md は通常ファイル維持

- 統合ディレクトリの README.md は symlink 化せず通常ファイルとして配置する
- Why: README は統合先ごとに内容が異なるため
