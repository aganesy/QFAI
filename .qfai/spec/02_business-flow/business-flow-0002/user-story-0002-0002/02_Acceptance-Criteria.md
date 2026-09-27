# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 action pin ポリシーと trailer 解決

# AC-0002-0002-01
# Parent: US-0002-0002
Scenario: 配布 action SHA pin + 可読 name
  Given 配布 workflow set の全 `uses:` 参照
  When 各参照とそれを含む step の `name:` を検査する
  Then 全参照が 40-hex commit SHA 形式に pin されており、可読 version は step `name:` 内に leading `v` を付けずに記載され、comment trailer には version が現れない。third-party 参照は closed sanctioned set（package-manager availability の最小限、現在 1 件 = pnpm setup action）のみで、allow-list として assert される（count-of-zero では assert されない）

# AC-0002-0002-02
# Parent: US-0002-0002
Scenario: leakage guard breadth 維持
  Given the SHA-pinned shipped workflow set and `packages/qfai/scripts/check-no-internal-version-leakage.sh`
  When the guard runs over the tree, and runs again after a conventional `# v<X.Y.Z>` pin trailer is planted in a shipped file
  Then the first run exits 0 and the second exits 1. The resolution comes from the shipped spelling: the guard has lost no pattern and narrowed none, and has gained no pragma handling, no allowed path and no allow-list entry. A pattern is only ever added, and only in the lockstep NFR-C0005 sets: the three guard implementations and `.agents/rules/distributed-surface.local.md` in one change that edits no template
```
