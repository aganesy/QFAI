# Retired user stories

Source: `.qfai/specs/spec-0003/02_User-stories.md`

## US-0003-0018

Catalog line (verbatim):

- US-0003-0018: migration memo authoring (v1.9.0) - migration 実行時に `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` を生成

Section (verbatim):

## US-0003-0018: migration memo authoring

- Parent: CAP-0003
- Goal: `qfai init --upgrade-assistant-tree` が成功した時点で `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` を author し、移行内容の audit trail を残す
- Non-goals: memo 内容のユーザー編集を許す (memo は OC-53 により commit 後 immutable)
- Notes: REQ-0021 を実装する。memo は commit に含まれることで初めて confirmed 状態となる


