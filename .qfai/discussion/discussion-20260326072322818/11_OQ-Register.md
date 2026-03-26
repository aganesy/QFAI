# 11 OQ Register

## OQ Table

| OQ-ID   | Title | Gate       | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
| ------- | ----- | ---------- | ----------- | ----- | --------- | ------- | -------------- | ------------------- | --- | -------- |
| OQ-0001 | designSlopPatterns.json match type 仕様 | discussion | resolved | agent | 設計文書で category ベースの概念設計は完了。match type の詳細仕様は実装レベル | A: discussion で match type 一覧を確定 / B: SDD で詳細設計 (recommended: B) | B: SDD フェーズで match type を詳細設計 | SDD 開始時 | v1.7.2 SDD | 設計文書 Section 8.3, designSlopPatterns.json 構造例 |
| OQ-0002 | ddpBannedPatterns.txt 統合方針 | discussion | resolved | agent | 設計文書に「retain ddpBannedPatterns.txt for simple textual bans, move richer rules into JSON」と明記 | A: 全面 JSON 移行 / B: 併存（recommended: B） | B: 併存（simple text bans は txt 維持、rich rules は JSON） | - | v1.7.2 | 設計文書 Section 5 Shared rule source |
| OQ-0003 | HTML mock パース深度 | discussion | resolved | agent | 設計文書に「lightweight text heuristics only in v1.7.2, No DOM rendering」と明記 | A: DOM パーサー導入 / B: text heuristics のみ (recommended: B) | B: text heuristics のみ | - | v1.7.2 | 設計文書 Section 11.3 |
| OQ-0004 | Finding 重複制御の閾値 | discussion | deferred | agent | 設計文書に方針記載あり（cap duplicate, aggregate into count summary）だが具体的閾値は実装レベル | A: 固定閾値 (e.g. 3/file/rule) / B: config 可変閾値 (recommended: B) | B: config 可変閾値 | SDD/実装フェーズ開始時 | v1.7.2 SDD | 設計文書 Section 17 Risk D |
| OQ-0005 | Tier 3 default profile の info/warning 使い分け | discussion | deferred | agent | 設計文書に「info/warning in default」と記載あるが分岐条件は未定義。実装詳細 | A: 全て warning / B: category で info/warning 分岐 (recommended: B) | B: category ベースで分岐 | SDD フェーズ開始時 | v1.7.2 SDD | 設計文書 Section 7.2 Quality profile mapping |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
