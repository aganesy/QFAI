# 07_NFR — 非機能要件定義

<!-- UX-INTENT: ui_bearing: false — usability / design 評価指標不要 -->

## Requirements Table

| NFR-ID   | Category        | Title                                                   | Target                                                                                                   | Measurement                                                                          | Source             | Priority |
| -------- | --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | -------- |
| NFR-0001 | reliability     | 後方互換性の完全廃棄                                    | 互換エイリアス・旧フィールド参照・深いインポートパス維持のコード 0 件                                      | PR diff 検査: `runMeasurement` / `validatePanelScore` の export が `index.ts` に存在しない | SRC-0001           | must     |
| NFR-0002 | reliability     | fail-closed の徹底                                      | `console.warn`・silent fallback・auto-normalization を行うコードパス 0 件。エラーメッセージはカテゴリと不正値を含む具体的な記述。 | コードレビューおよびネガティブテストの通過確認                                        | SRC-0001, SRC-0002 | must     |
| NFR-0003 | operability     | 単一 PR 原子的完結                                      | WS-1 / WS-2 / WS-3 + README の全変更が 1 つの PR にまとまっている                                       | PR の commit 範囲確認                                                                | SRC-0001           | must     |
| NFR-0004 | maintainability | stale テスト完全排除                                    | `skip` / `todo` / `xit` によるマーク・`as unknown as` キャスト・旧フィールド前提フィクスチャの新規追加 0 件 | コードレビューおよび `pnpm lint` / `pnpm check-types` 通過確認                       | SRC-0001           | must     |
| NFR-0005 | maintainability | predicate consolidation と README 同期義務              | `isSpecDeclarationRef()` ロジックが `refSemantics.ts` のみに実装され重複なし。`README.md` が helper 非公開化・declaredRef 限定形式・specCoverage スキャン制限を反映する。 | コードレビュー（重複ロジック 0 件）+ README 差分確認（同一 PR 内）                   | SRC-0001           | must     |
| NFR-0006 | maintainability | TypeScript 型安全                                       | `any` / `@ts-ignore` / `@ts-expect-error` の新規追加 0 件。`pnpm check-types` エラー 0 件。              | `pnpm check-types` の exit code が 0                                                 | SRC-0001           | must     |

## Categories

- `performance`: Response time, throughput, latency.
- `reliability`: Availability, fault tolerance, recovery.
- `security`: Authentication, authorization, data protection.
- `scalability`: Load handling, horizontal/vertical scaling.
- `usability`: Accessibility, UX standards, i18n.
- `maintainability`: Code quality, documentation, testability.
- `operability`: Monitoring, deployment, logging.

## Rules

- Each NFR must have a measurable target.
- Each NFR must reference at least one Source (SRC-ID).
- NFR-0001〜0006 はすべて CI ゲート（`pnpm format:check && pnpm lint && pnpm check-types && pnpm test`）の通過を前提条件とする。
