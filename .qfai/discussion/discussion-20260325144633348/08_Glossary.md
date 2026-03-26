# 08_Glossary

Discussion pack: discussion-20260325144633348
Version context: QFAI v1.7.1 `Render Evidence Automation`
Last updated: 2026-03-25

## Terms

| Term                        | Definition                                                                                                      | Context                | Source             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------ |
| render evidence             | `qfai prototyping` が収集する、rendered UI の証跡一式。画像、HTML snapshot、viewport metadata、取得状態を含む。 | v1.7.1 の中心概念      | SRC-0001           |
| render bundle               | 1 画面ぶんの render evidence のまとまり。`uiFidelity.screens[].renders[]` に対応する。                          | schema / validation    | SRC-0001           |
| render entry                | `renders[]` の 1 要素。`captured` / `skipped` / `failed` のいずれかを持つ。                                     | schema / report        | SRC-0001           |
| captured                    | 画像と HTML が正常に取得できた状態。`imagePath` と `htmlPath` が必須。                                          | render status          | SRC-0001           |
| skipped                     | 取得は要求されたが、Playwright 不可や起動不可などの理由で収集を見送った状態。`skippedReason` が必須。           | degraded mode          | SRC-0001           |
| failed                      | 取得処理は実行したが、途中でエラーになった状態。`error` が必須。                                                | partial failure        | SRC-0001           |
| viewport                    | capture 時の表示領域。`desktop`、`mobile`、`tablet`、`custom` を想定する。                                      | capture policy         | SRC-0001           |
| route slug                  | `orders`、`orders-detail` のような、URL パスをファイル名向けに正規化した文字列。                                | storage convention     | SRC-0001           |
| `failOpen`                  | renderer が使えないときに、pack 全体を止めず skipped として続行する方針。                                       | degraded mode          | SRC-0001           |
| `uiux.renderEvidence`       | config の render evidence 設定ブロック。enabled / viewports / outputDir / baseUrl / failOpen を含む。           | config surface         | SRC-0001           |
| lazy dependency resolution  | Playwright を import 時点で必須にせず、必要時に dynamic import する方針。                                       | runtime design         | SRC-0001           |
| markdown-only compatibility | render evidence がなくても、従来の markdown critique / design feedback が壊れない互換性。                       | backward compatibility | SRC-0001, SRC-0008 |

## Abbreviations

| Abbreviation | Expansion                  |
| ------------ | -------------------------- |
| UI           | User Interface             |
| UX           | User Experience            |
| REQ          | Functional Requirement     |
| NFR          | Non-Functional Requirement |
| OQ           | Open Question              |
| RCP          | Review Checkpoint          |
| SSOT         | Single Source of Truth     |

## Work Orders Summary

| Step | Role (sub-agent) | Task title           | Input (refs)                          | Output (refs)    | Status (PASS/REVISE) |
| ---- | ---------------- | -------------------- | ------------------------------------- | ---------------- | -------------------- |
| 1    | worker           | Glossary first draft | design memo, README 群, existing pack | `08_Glossary.md` | PASS                 |
| 2    | orchestrator     | Glossary integration | worker draft, source normalization    | `08_Glossary.md` | PASS                 |
