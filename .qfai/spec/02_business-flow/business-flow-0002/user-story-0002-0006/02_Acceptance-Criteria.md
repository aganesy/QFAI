# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 Node / package manager portability

# AC-0002-0006-01
# Parent: US-0002-0006
Scenario: 配布 install 経路の保持
  Given 既存配布 workflow の lockfile 検出 `cache:` 式と lockfile-aware install branch（pnpm / yarn Classic / yarn Berry / npm + no-lockfile）
  When hardening 後の配布 set を検査する
  Then 4 package manager と no-lockfile の全ケースが依然として分岐で扱われ、`cache:` 式は単一 package manager 形式に置換されておらず、新規配布ファイルにも同じ install 分岐が拡張されている

# AC-0002-0006-02
# Parent: US-0002-0006
Scenario: portability の degrade 方向
  Given Node version ファイルを持たない adopter fixture と、`packageManager` field を持たない adopter fixture
  When 配布 setup-install 列をそれぞれの fixture で走らせる
  Then Node version ファイル不在は fail **open**: documented literal が使われ warning annotation が出て lane は継続する。package manager 解決不能は fail **closed**: lane は停止し、`packageManager` manifest field を修正箇所として名指しする actionable annotation を出す（不透明な resolution error ではない）
```
