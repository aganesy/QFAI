# 05_Scope

## In Scope

1. `qfai prototyping` に render evidence capture を追加する。
2. `--render-evidence`, `--viewports`, `--render-out`, `--base-url` の CLI 振る舞いを定義する。
3. Playwright を optional dependency として扱い、利用不可時は `skipped` で継続する。
4. `uiFidelity.screens[].renders[]` に screenshot / HTML snapshot の参照情報を残す。
5. render evidence の保存先と命名規則を定義する。
6. `prototypingEvidence.ts` で shape / file existence / coverage を検証する。
7. `renderCritique.ts` が render evidence を一次情報として読めるようにする。
8. `designFidelity.ts` と `navigationFlow.ts` が render evidence の有無を補助情報として扱えるようにする。
9. `packages/qfai/src/core/config.ts` に `uiux.renderEvidence` を追加する。
10. `.qfai/evidence/README.md` と report guidance を更新する。
11. init assets の evidence README に render bundle の説明を入れる。
12. 既存の markdown-only projects を壊さない backward compatibility を維持する。
13. `qualityProfile` に応じて missing render evidence の扱いを調整できるようにする。

## Out of Scope

1. browser QA の full audit
2. screenshot diff / visual regression baseline 管理
3. external AI critique adapter
4. 自動修復 / fix-layout / polish pass
5. 新しい top-level command の追加
6. Figma / Genspark 依存の導入
7. render evidence を UI-bearing pack 以外へ強制すること
8. 画像を JSON に base64 埋め込みする実装

## Success Criteria

| Criterion                 | Measurable Target                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Render capture の基本動作 | `qfai prototyping --autogen-ui-fidelity --render-evidence` が `renders[]` を出力できる |
| Degraded mode             | Playwright 不可でも `skippedReason` が残り、command が不必要に abort しない            |
| Validation                | captured entry の file missing が検出される                                            |
| Coverage policy           | required viewport の欠落が判定できる                                                   |
| Reporting                 | missing / skipped / failed の次アクションが report から辿れる                          |
| Compatibility             | 既存 markdown-only project の挙動が壊れない                                            |
| Documentation             | evidence README と init asset が render evidence を説明する                            |
| Testability               | CLI / core / config の failure path を unit test で検証できる                          |

## Constraints and Assumptions

- 変更は既存 `qfai prototyping` の拡張で完結させる。
- render capture は lazy import で行い、導入障壁を上げない。
- render evidence は JSON を正本とし、markdown は補助に留める。
- capture できない環境では `skipped` をエラー化しない。
- v1.7.1 は capture と validation に限定し、browser QA の本格運用は後続 release に送る。

## Work Orders Summary

| Step | Role (sub-agent) | Task title        | Input (refs)                    | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ----------------- | ------------------------------- | ------------- | -------------------- |
| 1    | worker           | Scope first draft | 01-04, design memo              | `05_Scope.md` | PASS                 |
| 2    | orchestrator     | Scope integration | worker draft, skill constraints | `05_Scope.md` | PASS                 |
