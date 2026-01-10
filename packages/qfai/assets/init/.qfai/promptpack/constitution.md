# PromptPack Constitution

PromptPack はプロジェクト内の SSOT（Single Source of Truth）として扱う。

## 基本原則

- spec/scenario/delta/BR/SC を最優先で読む
- 変更は delta.md に記録し、受入観点と影響範囲を明示する
- validate を通すことを必須とする（通らないなら仕様/運用が破綻している）
- 不確実性（仮説/未確定/TODO）は残し方針を統一する

## 運用

- PromptPack は人が手動で参照する前提とする
- 自動配置は v0.9 の emit/adapter まで行わない
