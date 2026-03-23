# 09 Delta

## Change Summary

- Change ID: DELTA-0019-0001
- Date: 2026-03-24
- Primary: CAP-0019 Design Direction Pack（デザインディレクションパック）新規作成
- Tags: v1.6.5, DDP, visual-thesis, content-plan, interaction-thesis, anti-goals, CTA-hierarchy
- Summary: UI 仕様に DDP（ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層）を必須入力として定義する spec を新規作成

## Rationale

- discussion-20260324054332396 で DDP の必須化が採択
- US-0019-0001（Design Direction Pack）をソースユーザーストーリーとする
- 関連 REQ 5 件（REQ-0001, REQ-0002, REQ-0003, REQ-0006, REQ-0010）、関連 NFR 4 件（NFR-0001, NFR-0002, NFR-0005, NFR-0006）をカバー

## Candidates Considered

1. DDP の必須化レベル — MUST（全 UI-bearing artifact 必須）vs SHOULD（推奨）vs オプション
2. テーマフィールドの項目数 — 6 項目（theme, mood, taste, material, energy, visual anchor）vs 3 項目（theme, mood, energy）vs 自由記述
3. CTA 階層の段階数 — 3 段階（primary/secondary/tertiary）vs 2 段階（primary/secondary）vs 無制限
4. 禁止パターンの管理方式 — 明示リスト化 vs レビュアー裁量 vs 自動検出
5. Figma 統合の要否 — 非依存（テキストベース完結）vs オプション統合 vs 必須統合

## Adopted

- Adopted: DDP 必須化（MUST レベル）
- Why: テーマ未定義のまま UI 実装に進むことを防止。DR-0031 に基づく。
- Evidence: discussion-20260324054332396 OQ-0001, US-0019-0001

- Adopted: テーマフィールド 6 項目（theme, mood, taste, material, energy, visual anchor）
- Why: 6 項目でデザイン方向性を多面的に捕捉。REQ-0002 に基づく。
- Evidence: discussion-20260324054332396 REQ-0002

- Adopted: CTA 階層 3 段階（primary / secondary / tertiary）
- Why: ユーザーアクションの優先順位を明確化し、配置意図を記録する。REQ-0003 に基づく。
- Evidence: discussion-20260324054332396 REQ-0003

- Adopted: 禁止ジェネリックパターンリスト（量産型カードグリッド、弱いヒーロー、無意味なグラデーション、過剰アクセント）
- Why: 汎用 UI の混入をレビュー FAIL で防止。DR-0032 に基づく。
- Evidence: discussion-20260324054332396 REQ-0006, 99_delta Rejected "generic SaaS card-grid default"

- Adopted: ツール非依存設計（Figma 非依存、テキストベース完結）
- Why: Claude Code / Codex / GitHub Copilot の 3 ターゲットで自己完結性を維持。REQ-0010、NFR-0006 に基づく。
- Evidence: discussion-20260324054332396 REQ-0010, 99_delta Rejected "Figma 必須化"

## Rejected

- Candidate: Figma 必須統合
- Reason: 3 ターゲット自己完結性を損なう。Figma MCP は便利だが、Codex / GitHub Copilot 環境で利用できない場合がある。
- DO NOT: 特定外部デザインツールへのハード依存を追加しない。
- Temptation: Figma MCP で視覚的なデザインフィードバックを自動化したい。

- Candidate: ジェネリックパターンをデフォルトとして許容
- Reason: ユーザー要求と OpenAI ガイダンスに反する。量産型カードグリッドや弱いヒーローは意図的なデザインとは言えない。
- DO NOT: カードグリッド・弱いヒーロー・過剰アクセントをデフォルトとして受け入れない。
- Temptation: 汎用テンプレートの方が実装が速く、すぐに見栄えが整う。

- Candidate: テーマフィールドを 3 項目に削減（theme, mood, energy のみ）
- Reason: taste, material, visual anchor を省略すると、デザイン方向性の解像度が不足し、下流エージェントが「なんとなく」で実装する余地が生まれる。
- DO NOT: テーマフィールドを 3 項目未満に削減しない。
- Temptation: 項目数を減らして記入負荷を下げたい。

- Candidate: CTA 階層を 2 段階（primary / secondary のみ）に簡略化
- Reason: tertiary CTA を省略すると、フッターやサイドバーの低優先度アクションの配置意図が失われる。
- DO NOT: CTA 階層を 2 段階に簡略化しない。
- Temptation: 2 段階の方がシンプルで管理しやすい。

## Impact

- Affects: .qfai/assistant/skills/ (SKILL.md 更新), .qfai/specs/_policies/ (DR-0031, DR-0032 参照), discussion-pack テンプレート, spec-pack テンプレート
- Validation: qfai validate --fail-on error must pass

## Follow-ups

- spec-0019 全ファイルの実装完了確認
- SKILL.md への DDP 読み取り順序反映
- Owner: aganesy
- Due: v1.6.5 release
