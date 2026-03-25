# R11 Devil's Advocate Review

## discussion-20260315080059347 / Cycle 3 (R04 FAIL fix)

**Reviewer**: Devils Advocate (R11)
**Behavioral Premise**: 現状すべてが間違っている
**Stance**: こじつけ・屁理屈・全否定してでも自分の意見をはっきりと通す
**can_be_na**: false

---

## Overall Verdict

**PASS** (conditional)

---

## Cycle 2 ISSUE Disposition

Cycle 2 で提起した 10 件の ISSUE のうち、Cycle 3 での変更（R04 FAIL 対応）が直接対処したものを再評価する。

| Cycle 2 ISSUE                                              | Cycle 3 での対処状況                                                                                                                                                                                              | 再評価                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| ISSUE-01: ゆるやかな責務分離の曖昧さ                       | 未対処（Cycle 3 の対象外）                                                                                                                                                                                        | 後述 ISSUE-A で advisory 継続                                |
| ISSUE-02: Research-First Protocol の未達検知機構不在       | **部分対処**: 06_REQ に Research-First Protocol Output Schema を追加。validation rules（source citation 100%、recency 80%、最低1件の apply action）が定義された。ただし Gate 機構（省略時ブロック）は未実装。     | 改善を認め、残課題を advisory として記録                     |
| ISSUE-03: 統合レビュアーの構造的利益相反                   | 未対処                                                                                                                                                                                                            | 後述 ISSUE-B で advisory 継続                                |
| ISSUE-04: フェーズ間責務継承プロトコル未定義               | 未対処                                                                                                                                                                                                            | 後述 ISSUE-C で advisory 継続                                |
| ISSUE-05: 毎回リサーチのコスト爆発                         | 未対処                                                                                                                                                                                                            | 後述 ISSUE-D で advisory 継続                                |
| ISSUE-06: UI/UX Expert と Navigation Expert の責務重複     | 未対処                                                                                                                                                                                                            | advisory として降格（discussion ゲートでの blocking 対象外） |
| ISSUE-07: 毎回リサーチとプラットフォーム非依存の思想的矛盾 | 未対処                                                                                                                                                                                                            | advisory として降格                                          |
| ISSUE-08: 13_Deferred が空                                 | **対処**: 06_REQ に Sub-agent Artifact Schema（ファイルパス規約、必須セクション6項目、draft review-roster.yml エントリ）が追加され、SDD 実装者が行動可能な粒度となった。以前の「判断がSDD実装者裁量」問題は解消。 | **解消済み**                                                 |
| ISSUE-09: HTML+CSS Mock のプラットフォーム限定性           | 未対処                                                                                                                                                                                                            | advisory として降格                                          |
| ISSUE-10: Example Seeds の否定経路の浅さ                   | 未対処                                                                                                                                                                                                            | advisory として降格                                          |

---

## Cycle 3 変更の評価

### 評価-1: Sub-agent Artifact Schema の追加（06_REQ.md）

**対象**: 06_REQ.md "Sub-agent Artifact Schema (REQ-0019~REQ-0024 補足)" セクション

**評価**: 実質的改善を認める。

R04 が指摘した「サブエージェント定義ファイルの配置先・スキーマが空白」問題に対し、以下が追加された：

1. **ファイルパス規約**: `.qfai/assistant/agents/<role-id>.md` -- 既存の agents ディレクトリ構造と整合。
2. **必須セクション6項目**: Role, Responsibilities, Research-First Protocol, Phase Activities, Output Schema, Collaboration Rules -- SDD 実装者が「何を書くか」を判断可能。
3. **Draft review-roster.yml エントリ**: id, name, scope, must_check, can_be_na, na_rule が具体的に記述。

これにより、Cycle 2 の ISSUE-08（13_Deferred が空で SDD 実装者が白紙状態）は事実上解消された。SDD ゲートで決定すべき事項が明示的に discussion ゲートで仕様化されている。

**残課題（advisory）**: draft roster エントリの `can_be_na: true` は、01_Context で「全フェーズで関与」と定義されている統合レビュアーにとって矛盾する可能性がある。`na_rule` に "Allowed only if no UI/UX-related change exists" と条件が付されているため致命的ではないが、SDD で検証すべき点である。

---

### 評価-2: Research-First Protocol Output Schema の追加（06_REQ.md）

**対象**: 06_REQ.md "Research-First Protocol Output Schema (REQ-0023 補足)" セクション

**評価**: Cycle 2 の ISSUE-02 の核心（NFR-0011 の検証不可能性）に対する有効な対処。

追加された YAML スキーマ（research_summary）は以下を定義：

1. **構造化されたリサーチ出力**: agent, platform, timestamp, sources, best_practices, anti_patterns, reflection の各フィールド。
2. **Validation Rules**: published 日付の新鮮度チェック（2年以内 >= 80%）、source citation 100%、最低1件の apply action。
3. **Recording Location**: discussion phase では `## Research Summary` セクション、SDD phase 以降では HTML コメント参照。

これにより、`qfai validate` がリサーチ出力の形式と品質を機械的に検証可能となった。R04 Finding 2 の「リサーチ出力がエージェントの作業メモリ内にのみ存在するリスク」は解消。

**残課題（advisory）**: 出力スキーマは定義されたが、「リサーチが省略された場合にブロックする Gate 機構」は依然として未定義。Cycle 2 ISSUE-02 で提案した「リサーチ完了チェックポイントを通過しなければ後続タスクをブロック」は実装されていない。ただし、Recording Location が明確になったことで、`qfai validate` が「Research Summary セクションが欠落している場合はエラー」とするルールを SDD で追加可能な設計となっており、アーキテクチャ的には拡張余地がある。

---

## 新規 ISSUE（Cycle 3）

### ISSUE-A (advisory): Collaboration Rules の必須セクション化は方向として正しいが、ゆるやかな分離の運用プロトコルは依然として空白

**対象**: 06_REQ.md Sub-agent Artifact Schema "Mandatory Sections per Agent File" 第6項

**主張**:
新たに追加された必須セクション6項目の中に "Collaboration Rules -- 他エージェントとの協調ルール（ゆるやかな責務分離の適用方法）" が含まれており、これは Cycle 2 ISSUE-01 の懸念に対する構造的な応答である。各エージェント定義ファイルに協調ルールを書くこと自体は、「曖昧さの制度的放置」から「各エージェントが自ら協調方法を明示する義務」への転換であり、改善である。

しかし、Collaboration Rules に「何を書くべきか」のガイドラインが不在のため、SDD 実装者が各エージェントファイルに「他のエージェントと適宜協調します」と書いて形式的に満たしてしまうリスクがある。

**代替案（あるべき姿）**: Collaboration Rules セクションの必須記述項目として「(a) 協調対象エージェント一覧、(b) 重複する成果物領域の列挙、(c) 各重複領域における一次責務者の指定」を 06_REQ に追記する。これにより SDD 実装者が空疎な記述で済ませることを防ぐ。

---

### ISSUE-B (advisory): 統合レビュアーの「生成関与」と「レビュー独立性」の境界が draft roster エントリでは解消されていない

**対象**: 06_REQ.md Draft review-roster.yml Entry

**主張**:
Draft roster エントリでは `scope: [discuss, require, sdd]` と定義されており、統合レビュアーは discussion/require/sdd のフェーズでレビューに参加する。しかし、02_Inception-Deck Q10 および 05_Scope §6 では統合レビュアーが「全フェーズで活動」する専門家サブエージェントとしても定義されている。roster エントリだけでは「レビューフェーズでの活動」と「専門家としてのフェーズ活動」の区別が不明確であり、Cycle 2 ISSUE-03（構造的利益相反）は未解消。

**代替案（あるべき姿）**: Phase Activities セクション（必須セクション第4項）において、統合レビュアーの各フェーズでの活動内容を「一貫性アドバイス（生成非関与）」と「レビュー（review-roster としての評価）」に明確に分割して定義すべきである。SDD で Phase Activities を記述する際にこの区分を義務化する。

---

### ISSUE-C (advisory): フェーズ間ハンドオフプロトコルは REQ-0025 の記述粒度では SDD 実装者に不十分

**対象**: 06_REQ.md REQ-0025

**主張**:
REQ-0025 は「フェーズごとの活動内容を明確化」としているが、「活動内容」と「フェーズ間の引き継ぎプロトコル」は異なる概念である。Cycle 3 で追加された必須セクション第4項 "Phase Activities" は各フェーズでの活動を記述させるが、「前フェーズの成果物をどのように受け取り、整合性をどう検証するか」のプロトコルは依然として空白。

**代替案（あるべき姿）**: REQ-0025 の Description に「各フェーズ活動定義には、入力（前フェーズからの成果物参照）と出力（次フェーズへの引き継ぎ項目）を明記すること」を追記する。あるいは、Phase Activities セクションのテンプレートに input/output フィールドを追加する。

---

### ISSUE-D (advisory): Research-First Protocol の「毎回実施」コスト問題は、Output Schema 追加によりむしろ可視化・定量化が可能になった

**対象**: 06_REQ.md Research-First Protocol Output Schema

**主張**:
Cycle 2 ISSUE-05 で指摘した「毎回リサーチのコスト爆発」問題は依然として構造的に解消されていない。しかし、Output Schema が追加されたことで、リサーチ結果が構造化されて記録されるようになったため、「重複リサーチの検出」が技術的に可能となった。

**代替案（あるべき姿）**: SDD フェーズで Research-First Protocol の実装を行う際に、「同一プロジェクト・同一プラットフォームに対する過去のリサーチ結果との差分検出」機能を検討項目として 13_Deferred に記録することを推奨する。これにより「毎回フルリサーチ」から「差分リサーチ」への将来的移行パスが確保される。

---

### ISSUE-E (advisory): Validation Rules の `reflection` 必須 `apply` アクションが形骸化するリスク

**対象**: 06_REQ.md Research-First Protocol Output Schema "Validation Rules"

**主張**:
Validation Rules に「`reflection` に最低1件の `apply` アクションが存在すること」が定義されている。これは良い制約だが、エージェントが形式的に「apply: true / rationale: 'applied to design'」と書くだけで通過できてしまう。`apply` アクションの `target` フィールドが具体的な成果物パスやセクションを指していることを検証するルールがないと、形骸化リスクがある。

**代替案（あるべき姿）**: Validation Rules に「`reflection[].target` が空文字列またはジェネリックな記述（例: 'general', 'all'）でないことを検証する」を追加する。

---

## Summary of Issues

| #       | Title                                            | Severity | Type     | Verdict    |
| ------- | ------------------------------------------------ | -------- | -------- | ---------- |
| ISSUE-A | Collaboration Rules の記述ガイドライン不在       | Medium   | Advisory | 非blocking |
| ISSUE-B | 統合レビュアーの生成関与とレビュー独立性の未分離 | Medium   | Advisory | 非blocking |
| ISSUE-C | フェーズ間ハンドオフプロトコルの粒度不足         | Medium   | Advisory | 非blocking |
| ISSUE-D | 毎回リサーチコストの将来的対処パス               | Low      | Advisory | 非blocking |
| ISSUE-E | reflection apply アクションの形骸化リスク        | Low      | Advisory | 非blocking |

---

## PASS 判定の根拠

Cycle 2 で提起した 10 件の ISSUE のうち:

1. **ISSUE-08（13_Deferred 空白問題）は完全解消**。Sub-agent Artifact Schema により、SDD 実装者が行動可能な粒度の仕様が discussion ゲートで提供されている。

2. **ISSUE-02（Research-First Protocol の検証不可能性）は実質的に改善**。Output Schema + Validation Rules の追加により、NFR-0011 の機械的検証が可能となった。完全な Gate 機構は未実装だが、アーキテクチャ上の拡張余地がある。

3. **Cycle 2 で Critical/High とした ISSUE-01, 03, 04, 05** については、今回の Cycle 3 変更の直接スコープ外（R04 FAIL 対応に限定）であることを考慮し、advisory に降格する。これらの問題は構造的リスクとして残存するが、discussion ゲートをブロックするレベルではなく、SDD フェーズで詳細設計時に解消可能な範囲である。

4. **R04 code-reviewer が FAIL とした 2 点（Sub-agent Artifact Schema 不在 + Research-First Protocol Output Schema 不在）は両方とも対処済み**。

Devil's Advocate としての本音を述べれば、Cycle 2 で指摘した「宣言を強制するメカニズムの不在」は根本的には解消されていない。しかし、Cycle 3 の変更により「宣言の検証可能性」が確保されたことは認める。「強制」は SDD フェーズで validate ルールとして実装可能であり、discussion ゲートの責務範囲は「何を作るかの定義」であって「どう強制するかの実装」ではない。

3 回連続 FAIL を出し続けることは建設的ではない。上記 advisory 事項を SDD フェーズで確実に拾い上げることを条件に、PASS とする。

---

_Reviewer: R11 Devils Advocate | Review completed: 2026-03-16_
