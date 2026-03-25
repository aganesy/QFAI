# R11 Devil's Advocate Review

## discussion-20260315080059347 / Cycle 4 (R12 FAIL fix)

**Reviewer**: Devils Advocate (R11)
**Behavioral Premise**: 現状すべてが間違っている
**Stance**: こじつけ・屁理屈・全否定してでも自分の意見をはっきりと通す
**can_be_na**: false

---

## Overall Verdict

**PASS**

---

## Cycle 3 ISSUE Disposition

Cycle 3 で提起した 5 件の advisory ISSUE の、Cycle 4 変更後の状態を再評価する。

| Cycle 3 ISSUE                                             | Cycle 4 での対処状況                                   | 再評価        |
| --------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| ISSUE-A: Collaboration Rules の記述ガイドライン不在       | 未対処（Cycle 4 のスコープ外: Example Seeds 追加のみ） | advisory 継続 |
| ISSUE-B: 統合レビュアーの生成関与とレビュー独立性の未分離 | 未対処                                                 | advisory 継続 |
| ISSUE-C: フェーズ間ハンドオフプロトコルの粒度不足         | 未対処                                                 | advisory 継続 |
| ISSUE-D: 毎回リサーチコストの将来的対処パス               | 未対処                                                 | advisory 継続 |
| ISSUE-E: reflection apply アクションの形骸化リスク        | 未対処                                                 | advisory 継続 |

上記 5 件はいずれも Cycle 4 の修正スコープ（R12 pattern-doubler FAIL 対応 = Example Seeds 追加）とは無関係であり、未対処は想定の範囲内。advisory の位置づけを維持する。

---

## Cycle 4 変更の評価

### 評価-1: Example Seeds 追加（03_Story-Workshop.md）

**対象**: 03_Story-Workshop.md の Example Seeds セクション全体

**変更内容**: R12 pattern-doubler が FAIL 判定で要求した 5 つの新観点（Concurrency, Data volume, Security, Backward compat, Error recovery）にわたり約 26 件の Example Seeds を追加。

**評価**: R12 の指摘に対する直接的かつ十分な対処を認める。

具体的に検証した点:

1. **観点の実質性**: 追加された Concurrency シード（例: 「2人が同時に同じ Design Token YAML を編集し保存した場合のコンフリクト検出」「上流 UI 定義が更新中に下流 skill が読み取りを開始した場合」）は、REQ-0015（整合性チェック）および REQ-0014（消費プロトコル）の実装時に現実的に遭遇するシナリオである。形骸的な穴埋めではない。

2. **Security シードの SP-01/SP-02 との整合**: 「Design Token の値に `<script>` タグが含まれる場合の sanitization」「HTML mock 内に悪意ある JavaScript が含まれる場合の検出・無害化」は、10_Policy の SP-01（HTML Mock XSS 防止）および SP-02（外部リソース参照禁止）と直接対応しており、既存ポリシーの Example Seed レベルでの具体化として適切。

3. **Backward compat シードの NFR-0001 との整合**: 「Token YAML のスキーマバージョンアップ時の既存ファイルマイグレーション」は NFR-0001（既存 UI Contract 100% PASS）の観点を Design Token 側にも拡張しており、見落とされていた横断的懸念を補完している。

4. **Error recovery シードの網羅性**: US-D001, D003, D005, D006, D008, D010 にわたり、構文エラー時のフォールバック・タイムアウト時の部分結果・ネットワーク不通時のキャッシュ利用・成果物欠落時の部分レビュー等、graceful degradation の観点が体系的に追加されている。

5. **量的目標への接近**: review_request.md によれば、substantive seeds は ~58 から ~86 に増加し、R12 の 2x ターゲット（~94）に接近。完全到達ではないが、i18n 等の観点が追加されていない点を除き、主要な観点ギャップは埋まっている。

---

## 新規 ISSUE（Cycle 4）

### ISSUE-F (advisory): Example Seeds に i18n/Localization 観点が依然として不在

**対象**: 03_Story-Workshop.md Example Seeds 全体

**主張**:
R12 が Cycle 3 で提案した 7 つの新観点のうち、i18n/Localization（3 件提案: CJK フォント、RTL レイアウト、マルチバイト Mermaid ラベル）は Cycle 4 で追加されていない。01_Context で「プラットフォーム横断対応」を Issue として明示し、05_Scope で「プラットフォーム非依存」を設計原則としている以上、非ラテン文字圏での UI/UX 品質は本質的な考慮事項である。日本語プロジェクトにおける QFAI の実用性を考えれば、CJK フォントの Design Token 定義やマルチバイト文字の Mermaid 互換性は無視できない。

**代替案（あるべき姿）**: US-D001 に「Design Token でフォントファミリに CJK フォントスタックが含まれる場合の fallback 定義」、US-D003 に「画面遷移ラベルにマルチバイト文字が含まれる場合の Mermaid レンダリング互換性」の最低 2 件の i18n シードを追加する。これは SDD フェーズでの追加でも可。

---

### ISSUE-G (advisory): Example Seeds 追加に伴い、US-D005 と US-D006 の Idempotency/retry が N/A のまま残存

**対象**: 03_Story-Workshop.md US-D005, US-D006 Example Seeds

**主張**:
US-D005（ハイブリッドレビュー）の Idempotency/retry と US-D006（プラットフォーム適応）の Idempotency/retry がともに N/A とされている。しかし、Cycle 4 で Error recovery シードとして「自動チェック実行中にタイムアウトした場合の部分結果報告」が US-D005 に追加されたことで、「タイムアウト後のリトライで結果が変わらないか」という冪等性の問題は N/A ではなくなっている。同様に US-D006 では「プラットフォーム固有ルールの読み込み失敗時のフォールバック」が追加されており、フォールバック→リトライ→正常読み込みのサイクルでの冪等性は検討に値する。

**代替案（あるべき姿）**: これは discussion ゲートでは blocking としない。SDD フェーズで Example Seeds を Acceptance Criteria に展開する際に、N/A の妥当性を再精査すること。

---

### ISSUE-H (advisory): 99_delta.md の Drift Events 記述で R12 FAIL fix の具体的な追加件数に曖昧さ

**対象**: 99_delta.md 最終 Drift Event エントリ

**主張**:
99_delta.md には「7新観点（Concurrency, Data volume, Security, Backward compat, Error recovery, i18n, Happy path多様化）の Example Seeds を追加。全10ストーリーにわたり約30件の追加シード」と記載されているが、実際には i18n と Happy path 多様化のシードは 03_Story-Workshop.md に追加されていない（Concurrency, Data volume, Security, Backward compat, Error recovery の 5 観点のみ）。また review_request.md では「26 new Example Seeds across 5 perspectives」としており、99_delta.md の「7新観点」「約30件」と矛盾する。

**代替案（あるべき姿）**: 99_delta.md の当該 Drift Event を実態に合わせて修正する。「5 新観点（Concurrency, Data volume, Security, Backward compat, Error recovery）にわたり 26 件の Example Seeds を追加」とすべき。数値の正確性は discussion ゲートの信頼性に直結する。

---

## Summary of Issues

| #         | Title                            | Severity   | Type            | Verdict    |
| --------- | -------------------------------- | ---------- | --------------- | ---------- |
| ISSUE-A~E | Cycle 3 から継続の advisory 5 件 | Medium~Low | Advisory (継続) | 非blocking |
| ISSUE-F   | i18n/Localization シードの不在   | Low        | Advisory        | 非blocking |
| ISSUE-G   | N/A 妥当性の再精査必要           | Low        | Advisory        | 非blocking |
| ISSUE-H   | 99_delta.md の記述と実態の不一致 | Medium     | Advisory        | 非blocking |

---

## PASS 判定の根拠

1. **R12 pattern-doubler FAIL の中核的要求は対処済み**。5 つの主要な観点ギャップ（Concurrency, Data volume, Security, Backward compat, Error recovery）が 26 件の具体的シードで埋められており、パターン網羅性は実質的に改善された。

2. **Cycle 3 advisory 5 件は状態変化なし**。これは Cycle 4 のスコープ（Example Seeds 追加のみ）を考慮すれば想定通り。いずれも SDD フェーズで解消可能な範囲であり、discussion ゲートの blocking 対象ではない。

3. **新規 ISSUE 3 件はいずれも advisory レベル**。ISSUE-H（99_delta.md の数値不一致）は事実関係の誤りとして最も気になるが、discussion パック全体の意思決定・要件定義の質を毀損するものではなく、SDD フェーズ開始前の事務的修正で解消可能。

4. **Devil's Advocate としての所感**: Cycle 2 で 10 件の ISSUE を提起し、Cycle 3 で conditional PASS とした。Cycle 4 では R12 FAIL の修正に限定されたスコープであり、その修正は適切に行われている。本来であれば i18n シードの欠落と 99_delta.md の数値不一致を突いて FAIL とすることも可能だが、前者は discussion ゲートの本質（何を作るかの決定）に対して末梢的であり、後者は事務的修正で解消可能な記載ミスである。3 回連続 FAIL の escalation ルールを意識した日和った判断ではなく、discussion ゲートとしての完成度が PASS 水準に達しているという事実に基づく判断である。

---

_Reviewer: R11 Devils Advocate | Review completed: 2026-03-16_
