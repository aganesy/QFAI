# PromptPack 運用ガイド

PromptPack は **AI に渡す入力束の SSOT** をプロジェクト内に固定するためのセットです。自動配置は行わず、人が必要な場所へ手動で反映します。

## 目的

- 仕様/差分/トレーサビリティの読み順を固定する
- 役割/観点/モードを明文化し、レビュー品質を安定させる
- エージェント差分は v0.9 の emit/adapter に寄せる

## ディレクトリ構成（最小）

```
.qfai/promptpack/
  constitution.md
  steering/
    compatibility-vs-change.md
    traceability.md
    naming.md
  commands/
    plan.md
    implement.md
    review.md
    release.md
  roles/
    qa.md
    spec.md
    test.md
  modes/
    compatibility.md
    change.md
```

## 手動配置（例）

- Copilot: `.github/copilot-instructions.md`
- Claude: `CLAUDE.md`
- Codex: `AGENTS.md`

配置先では、必要な章だけを抜粋してまとめます。プロジェクトの運用に合わせてカスタマイズして構いません。

## 既存 assets との関係

- `.qfai/prompts/` は **手動で使うプロンプト資産**（require-to-spec など）として維持します
- PromptPack は **運用ルール/観点の正本** として扱い、プロンプト本文とは分離します

## 注意

- PromptPack は現時点で自動読取しません（v0.9 の emit/adapter で自動化予定）
- 変更時は `delta.md` に区分と理由を記録してください
