# 99_delta

## Adopted

| Date       | Change Type | Affected        | Summary                                                        | Reason                                                       |
| ---------- | ----------- | --------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 2026-03-25 | Add         | 06_REQ / 07_NFR | render evidence を既存 `qfai prototyping` に統合する方針を採用 | 新コマンドを増やさず、既存 surface を拡張できるため          |
| 2026-03-25 | Add         | core config     | `uiux.renderEvidence` config block を採用                      | CLI と config の両方で制御でき、既存設定体系に自然に乗るため |
| 2026-03-25 | Add         | validators      | `captured / skipped / failed` の typed outcome を採用          | 退避と失敗を分けて扱え、部分成功を失わないため               |
| 2026-03-25 | Add         | report / docs   | report guidance と evidence README の更新を採用                | skipped / missing の復旧手順を利用者が追えるため             |
| 2026-03-25 | Add         | storage         | path-only evidence storage を採用                              | JSON の肥大化と diff churn を避けるため                      |

## Rejected

| Date       | OQ-ID   | Option                                        | Reason                                                    | Recurrence Prevention                                      |
| ---------- | ------- | --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| 2026-03-25 | OQ-0002 | renderer 不可で hard fail する                | capture は補助証跡であり、pack 生成自体を止める必要がない | `failOpen: true` と skipped 状態を既定にする               |
| 2026-03-25 | OQ-0005 | browser QA / diff / repair を v1.7.1 に含める | capture / validation という本題から逸脱する               | v1.7.4 への defer を固定し、v1.7.1 では scope 外と明記する |
| 2026-03-25 | OQ-0006 | 画像や HTML を JSON に inline する            | diff が大きくなり、証跡が扱いにくくなる                   | path-only ルールを evidence policy と REQ に固定する       |
| 2026-03-25 | OQ-0001 | tablet を既定 viewport に含める               | 初版で runtime と失敗面を増やしすぎる                     | tablet は opt-in とし、必要時のみ拡張する                  |
| 2026-03-25 | OQ-0007 | report を terse code-only にする              | 復旧手順が分からず、skipped / missing の解消が遅れる      | action-oriented な案内文を report policy に固定する        |

## Design Direction

| Date       | Status   | Direction                                   | Reason                                                                             |
| ---------- | -------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2026-03-25 | adopted  | Option B - renderEvidence helper extraction | CLI 責務を薄く保ち、capture logic を将来の browser QA へ再利用できるため           |
| 2026-03-25 | rejected | Option A - CLI 直書き                       | 初回は早く見えても command の責務が膨らみ、validator/report との接続点が増えるため |
| 2026-03-25 | rejected | Option C - 新トップレベル command           | v1.7.1 の非目標に反し、導入面の friction を増やすため                              |
| 2026-03-25 | locked   | Anti-goals                                  | prose-only evidence、理由不明の degraded mode、inline binary evidence を禁止する   |

## Drift

| Date       | Change Type | Summary                             | Impact | Resolution         |
| ---------- | ----------- | ----------------------------------- | ------ | ------------------ |
| 2026-03-25 | None        | 追加の scope drift は発生しなかった | none   | 初期方針を維持した |

## Recurrence Prevention

| Guardrail                                   | Why it exists                                 | Trigger if violated                                     |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| 新しいトップレベル CLI コマンドを増やさない | surface の拡散を防ぐため                      | `qfai render` のような別コマンド案が出たら却下する      |
| evidence は path-only で保存する            | JSON の肥大化と秘匿情報の混入を防ぐため       | base64 / raw HTML / raw screenshot 文面が出たら差し戻す |
| renderer 不可は skipped で表す              | optional 依存のまま進めるため                 | Playwright 未導入で hard fail を提案したら却下する      |
| browser QA は v1.7.4 に分離する             | v1.7.1 の目的を capture/validation に絞るため | diff / repair / external critique の混入を止める        |
| CLI は config を override する              | 実行時の意図を優先するため                    | config precedence を逆転させる案を出さない              |

## Work Orders Summary

| Step | Role (sub-agent) | Task title        | Input (refs)                             | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ----------------- | ---------------------------------------- | ------------- | -------------------- |
| 1    | worker           | Delta first draft | OQ register, resolution log, design memo | `99_delta.md` | PASS                 |
| 2    | orchestrator     | Delta integration | worker draft, drift protocol audit       | `99_delta.md` | PASS                 |
