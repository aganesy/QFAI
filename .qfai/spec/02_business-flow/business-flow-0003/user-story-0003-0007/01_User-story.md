# US-0003-0007: doctor 出力 group 分け + skills.integrity downgrade

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor` の summary を "errors blocking the active profile" / "warnings advisory of drift" の 2 group に明示的に分割表示する。`skills.integrity` は既定で `warning` severity として後者の group に表示される (message 文言にかかわらず active profile を block しない)。
- Non-goals: skill 整合性 check 自体のロジック変更

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: the Scope section of retired spec-0006
- Story block: `us-0006-0007` of retired spec-0006
