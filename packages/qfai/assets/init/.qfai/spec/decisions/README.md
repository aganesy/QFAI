# ADR (Architecture Decision Record)

ADR は「なぜその判断をしたか」を記録するための軽量な意思決定ログです。

## いつ書くか

- 仕様の前提や制約が変わるとき
- 技術選定や設計方針を決めたとき
- 重要なトレードオフがあるとき

## 最小例

```md
# ADR-0001: 承認フローは1段階にする

- Status: Proposed
- Context: 承認者を増やすと運用が複雑になる
- Decision: v0.2.6 では1段階の承認に固定する
- Consequences: 多段承認が必要な場合は拡張が必要
- Related: BR-0001, SPEC-0001
```

## CI でチェックされること（抜粋）

- ID 形式（`BR-xxxx` / `SPEC-xxxx` など）
- 参照 ID の整合性（トレーサビリティ）

## 依存関係

- ADR は Spec / BR と一緒に参照される
- Scenario/Contracts から参照されることは少ない

## 良い例 / 悪い例

- 良い例: Context/Decision/Consequences が簡潔に書かれている
- 悪い例: Decision が空のまま放置されている
