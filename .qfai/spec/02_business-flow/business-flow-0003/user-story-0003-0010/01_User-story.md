# US-0003-0010: per-skill manifest runtimeDependencies probe

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor --profile <skill>` reads `<paths.skillsDir>/<skill>/manifest.json` and probes `node_modules/.bin/...` / `node_modules/<name>/` for each `runtimeDependencies` entry. A missing dependency is reported with its install command. An empty list is not probed, so it yields no false positive.
- Non-goals: manifest schema 著作 / 配布側 lint、依存の auto-install (それは `--autoremediate` の責務)

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: the Scope section of retired spec-0006
- Story block: `us-0006-0010` of retired spec-0006
