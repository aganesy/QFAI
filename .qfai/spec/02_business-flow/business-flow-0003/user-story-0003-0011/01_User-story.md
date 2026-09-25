# US-0003-0011: shipped workflow drift detection (detection half)

## User Story

- Parent: CAP-0006
- Goal: adopter が「修正済みの template が自分の repository に届いていない」ことを気づける route を持つ。`qfai doctor` は adopter tree の `.github/workflows/` に install 済みの shipped workflow を install 済み package 同梱の copy と比較し (既存 `skills.integrity` と同型の比較)、乖離を dotted-lowercase check id `workflows.integrity` の advisory finding として通知する。finding は stale file の path と、その時点で利用可能な repair — 「install 済み package 内の copy で当該ファイルを置き換える」手動手順 — を名指しする。shipped tree は create-only (force off) で copy されるため `qfai init --force` でも refresh されない、という前提に対する非破壊の通知 channel である。
- Non-goals: shipped workflow の上書き / refresh / prune (OQ-0021 に blocked; 本 spec の out of scope)、advisory 内での refresh command / CLI verb / flag の名指し、shipped workflow の所有権契約と provenance record の**作成・書き込み・schema 定義** (spec-0003 / REQ-0020 owned — 本 spec は provenance record を**読む**が、書かない・所有しない。読まなければ adopter 自作ファイルと QFAI 由来の stale ファイルを区別できず、所有していないファイルを drift 報告してしまう)、`qfai validate` 側への finding 追加、exit code の変更

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0011`
