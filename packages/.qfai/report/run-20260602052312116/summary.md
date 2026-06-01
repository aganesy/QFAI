# Validate Run Summary

- run_id: run-20260602052312116
- started_at: 2026-06-01T20:23:12.116Z
- status: fail
- report_dir: .qfai/report/run-20260602052312116
- errors: 4
- warnings: 13

## Top Errors

- QFAI-ASSETS-001 (.qfai/assistant/constitution/drift-protocol.md): 必須ファイル .qfai/assistant/constitution/drift-protocol.md (legacy fallback: .qfai/assistant/instructions/drift-protocol.md) が見つかりません。
- QFAI-ASSETS-002 (.qfai/assistant/catalog/test-layers.md): 必須ファイル .qfai/assistant/catalog/test-layers.md (legacy fallback: .qfai/assistant/steering/test-layers.md) が見つかりません。
- QFAI-DPACK-001 (.qfai/discussion): discussion-pack が見つかりません。`.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/` を作成してください。
- QFAI-REVIEW-001 (.gitignore): ルート `.gitignore` に QFAI 管理ブロック（`qfai init` が自動生成）用のエントリがありません。

## Top Warnings

- QFAI-REVIEW-002 (.qfai/review): review 成果物が見つかりません。`review-YYYYMMDDhhmmssSSS/` が未生成のため、このチェックは warning 扱いです。
- QFAI-CFG-LINK-002 (qfai.config.yaml): qfai.config.yaml: paths.skillsDir=".qfai/assistant/skills" but the directory does not exist.
- QFAI-CFG-LINK-002 (qfai.config.yaml): qfai.config.yaml: paths.srcDir="src" but the directory does not exist.
- QFAI-CFG-LINK-002 (qfai.config.yaml): qfai.config.yaml: paths.testsDir="tests" but the directory does not exist.
- QFAI-TRACE-002 (.qfai/specs/spec-0004/16_Traceability-ledger.md): Traceability ledger not found for spec-0004. Skipping integrity check.
