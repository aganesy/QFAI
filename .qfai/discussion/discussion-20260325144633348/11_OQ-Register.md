# 11_OQ-Register

| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OQ-0001 | viewport の既定値と tablet の扱い | discussion | resolved | agent | desktop/mobile を既定にして、tablet を opt-in にするのが runtime と実用性のバランスがよい。 | A) desktop/mobile のみ, B) desktop/mobile + tablet opt-in, C) すべて固定で標準化 | B) desktop/mobile + tablet opt-in | - | - | SRC-0001 section 5.3 |
| OQ-0002 | renderer 不可時の挙動 | discussion | resolved | agent | capture は失敗でなく退避として扱う方が、pack 生成と validation を止めない。 | A) hard fail, B) skipped + `failOpen: true`, C) silent no-op | B) skipped + `failOpen: true` | - | - | SRC-0001 sections 5.4, 5.8 |
| OQ-0003 | CLI と config の優先順位 | discussion | resolved | agent | 実行時の明示指定は config より優先されるべき。 | A) CLI override, B) config override, C) merge with partial precedence | A) CLI override | - | - | SRC-0001 section 5.6 |
| OQ-0004 | qualityProfile による severity の扱い | discussion | resolved | agent | render evidence の欠落は profile で厳しさを変えつつ、構造破損は error のままにするのが妥当。 | A) fixed severity, B) profile-sensitive severity, C) strict-only gate | B) profile-sensitive severity | - | - | SRC-0001 section 5.5.1 |
| OQ-0005 | browser QA / diff / repair の v1.7.1 取り込み | sdd | deferred | team | browser QA、visual diff、repair loop、外部 critique は v1.7.1 の capture/validation 目的を超える。 | A) v1.7.1 に含める, B) v1.7.4 へ defer, C) 廃止 | B) v1.7.4 へ defer | v1.7.4 scope intake | v1.7.4 planning milestone | SRC-0001 sections 2, 10 |
| OQ-0006 | evidence の保存形式 | discussion | resolved | agent | JSON に raw blob を入れず path-only にする方が軽量で diff しやすい。 | A) inline base64, B) path-only metadata, C) hybrid | B) path-only metadata | - | - | SRC-0001 sections 5.2, 9 |
| OQ-0007 | report の案内文の粒度 | discussion | resolved | agent | 何が欠けているかと次に何をするかを示す方が、skipped / missing の復旧が速い。 | A) terse code-only, B) actionable guidance, C) separate doc only | B) actionable guidance | - | - | SRC-0001 section 5.8 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | worker | OQ first draft | design memo, README 群, existing pack | `11_OQ-Register.md` | PASS |
| 2 | orchestrator | OQ integration | worker draft, mandatory column audit | `11_OQ-Register.md` | PASS |
