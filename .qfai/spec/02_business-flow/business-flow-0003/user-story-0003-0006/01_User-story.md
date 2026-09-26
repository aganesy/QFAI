# US-0003-0006: playwright primary probe

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor --profile prototyping` が `node_modules/.bin/playwright` を primary launcher 候補として probe し、`npx --no-install playwright --version` を fallback として扱う。`playwright-cli` still resolves as a launcher, but past its `1.10.0` sunset it surfaces `D-DEPRECATED-PROBE` at severity `error`.fresh `qfai init` + `npm i -D playwright` の状態で `[error]` line を 1 つも出さないことが acceptance signal (NFR-0112)。
- Non-goals: playwright 自体の auto-install、prototyping iterate の実行

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: the Scope section of retired spec-0006
- Story block: `us-0006-0006` of retired spec-0006
