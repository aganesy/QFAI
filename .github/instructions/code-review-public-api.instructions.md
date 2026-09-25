---
applyTo: "packages/qfai/src/**"
excludeAgent: "coding-agent"
---

# Copilot Code Review: Public API (Repository)

Library/CLI compatibility checks:

- If a public function signature, exported type, or CLI flag changes, confirm the PR documents the breaking change.
- Removing or renaming an export requires a CHANGELOG entry and a major version bump justification.
