# R11 Devil's Advocate

## Verdict: PASS

## Checklist

- [x] Challenge every assumption, conclusion, and design decision as if it were fundamentally wrong.
- [x] Provide a concrete alternative ("あるべき姿") for every issue raised; bare negation without an alternative is invalid.
- [x] Persist with objections using any rhetorical means to surface hidden risks.

## Findings

### Challenge 1: 「39 エージェントで十分」は怠慢ではないか？

**主張:** 44 canonical エージェントのうち 5 つ（design-expert, integrated-uiux-reviewer, navigation-expert, screen-transition-expert, uiux-expert）を除外しているのは不完全であり、Codex ユーザーだけがこれらにアクセスできない不公平が生じる。

**代替案:** 44 全エージェントを TOML 化し、真のプラットフォームパリティを実現すべき。

**反論への評価:** 05_Scope の OS-01 で明確に除外理由が記載されており（Claude/Copilot セットに含まれていない）、OQ-0001 でオプション B（44 agents）が検討・却下されている。99_delta にも Rejected Decision として記録済み。3 プラットフォーム間のパリティという目標に照らせば 39 が正しい。**この異議は棄却する。**

### Challenge 2: 手動同期は運用破綻する

**主張:** canonical MD と 39 TOML ファイルの手動同期は必ず乖離を生む。「将来の init.ts 対応」は空手形であり、リリース時点で同期手段がないのは設計欠陥だ。

**代替案:** v1.6.4 のスコープ内に簡易な差分検出スクリプト（canonical MD と TOML の developer_instructions を比較して差分を警告する CI チェック）を含めるべき。

**反論への評価:** OQ-0002 と OQ-0007 で init.ts の自動化を明示的にスコープ外とし、OC-1/OC-2 で運用制約として認識している。ただし差分検出は init.ts より遥かに低コストで実現可能。とはいえ、本 discussion パックの目的は要件定義であり、CI の具体策は SDD/実装フェーズで設計すべき事項。NFR-0002（Content parity verification）と NFR-0004（Single-source alignment）で検証の必要性は要件として捕捉済み。**懸念は妥当だが、discussion フェーズとしては NFR で捕捉されており、FAIL に至るレベルではない。**

### Challenge 3: sandbox_mode の 2 分類は粗すぎる

**主張:** 「read-only」か「制限なし」の 2 択は粗すぎる。たとえば `architect` は設計文書を書くが本番コードには触れるべきでない。`doc-steward` はドキュメントのみ書き込み可能であるべき。より細かい権限モデルが必要。

**代替案:** ファイルパスベースの書き込み許可リスト（allowlist）を sandbox_mode に追加するか、「write-docs-only」のような中間モードを定義すべき。

**反論への評価:** OQ-0004 で 3 つのオプション（A: Role-based / B: All read-only / C: All inherit）が検討され、Role-based が採用されている。Codex の現行 TOML 仕様では `sandbox_mode` は `"read-only"` の有無のみをサポートしており（SRC-0002）、プラットフォーム側がより細かい権限モデルを提供していない以上、ファイルパスベース制御は実現不可能。AS-02 でこのリスクも認識済み。**Codex プラットフォーム制約の範囲内では最善の設計であり、異議は棄却する。**

### Challenge 4: description フィールドが "should" 優先度は甘い

**主張:** REQ-0010（description field content）が `should` 優先度であるのは甘い。description はエージェント選択時にユーザーが見る唯一のメタデータであり、これが不正確・不十分だとユーザーが誤ったエージェントを選択する。`must` であるべき。

**代替案:** REQ-0010 を `must` に昇格し、description の品質基準（一行・50 文字以内・ミッションを要約）を明確化すべき。

**反論への評価:** description は確かにユーザーにとって重要な情報だが、Codex がサブエージェント一覧を description で表示するかどうかはプラットフォーム依存。REQ-0002 で `description` フィールド自体の必須化は `must` で担保されており、内容の品質基準を `should` とするのは過度に厳格ではない判断。ただし SDD フェーズで品質基準をもう少し具体化する価値はある。**改善の余地はあるが FAIL には至らない。**

### Challenge 5: 「TOML 形式は安定」という前提は楽観的

**主張:** AS-01「Codex TOML agent format is stable」は根拠のない楽観。Codex は公式リリース直後であり、フォーマット変更の可能性は高い。39 ファイルの一括修正リスクを過小評価している。

**代替案:** TOML スキーマバージョンを各ファイルにコメントとして記録し、フォーマット変更時の影響範囲を即座に特定できるようにすべき。

**反論への評価:** AS-01 は仮定として明示されており、「Risk if Wrong」に「全 39 ファイルの更新が必要」と影響も記載済み。02_Inception-Deck のリスク表でも「Codex sub-agent API changes」が Low likelihood / High impact で記録され、ミティゲーション（Pin to current spec; monitor Codex changelog）も定義済み。**リスク認識は十分であり、異議は棄却する。**

### Challenge 6: テスト方針が「TOML パース検証」だけでは不十分

**主張:** SC-001 の「TOML パーサーで全ファイルをパース」は構文検証に過ぎない。developer_instructions の内容が canonical MD と実質的に一致していることの自動検証手段がない。

**代替案:** canonical MD から自動抽出した主要セクション（Mission, Stop conditions）のキーフレーズが TOML 内に存在することを確認するスモークテストを追加すべき。

**反論への評価:** SC-002 で「Spot-check comparison」、NFR-0002 で「Diff comparison with canonical source」が要件として定義されている。自動化の具体策は実装フェーズの責務。discussion としては検証の必要性を捕捉している。**改善の余地はあるが FAIL ではない。**

### 総合判定

6 件の挑戦すべてに対し、discussion パックは以下を備えている:

1. **選択肢の明示と却下理由の記録**（OQ Register + 99_delta Rejected Decisions）
2. **リスクの認識と緩和策**（Inception Deck リスク表 + Assumptions）
3. **制約の文書化**（09_Constraints で技術・運用制約を網羅）
4. **検証要件の定義**（NFR + Success Criteria）

異議の多くは「SDD/実装フェーズでより具体化すべき事項」であり、discussion フェーズの責務範囲を超える要求である。discussion パックとしては十分な品質を備えており、**PASS** と判定する。

## Required Changes

None

## Confidence

High — 全 15 ファイルを精査し、各挑戦に対して具体的なファイル・セクションでの反論根拠を確認した。Discussion パックは系統的に意思決定を記録しており、Devil's Advocate の挑戦に耐える構造になっている。
