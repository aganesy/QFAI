# 02 User Stories

## US Catalog

- US-0006-0001: UI フィデリティ自動生成 - --autogen-ui-fidelity で DOM クローリングによるフィデリティ証跡生成
- US-0006-0002: UI コントラクト期待値抽出 - .qfai/contracts/ui/ YAML からラベル・エレメント抽出
- US-0006-0003: エレメントマーカー検出 - data-qfai 属性による DOM マーカー検出
- US-0006-0004: フィデリティ証跡出力 - .qfai/evidence/prototyping.json への出力
- US-0006-0005: skeleton モード - uiFidelity.screens=[] で L1 evidence 記録
- US-0006-0006: [v1.7.7 Remediation] Static-first default — default prototyping mode requires no runtime checks
- US-0006-0007: [v1.7.7 Remediation] Prototyping mode definitions — low-cost, standard, full-harness modes with per-mode completion criteria
- US-0006-0008: [v1.7.7 Remediation] CLI mode flags — explicit --mode flag exposing all three modes with descriptions and per-mode evidence expectations
- US-0006-0009: [v1.7.7 Remediation] Mode-aware error guidance — invalid mode flag produces actionable error listing valid modes

## US-0006-0001: UI フィデリティ自動生成

- Parent: CAP-0006
- Goal: フロントエンドエンジニアとして、`qfai prototyping --autogen-ui-fidelity --base-url <url>` で jsdom による DOM クローリングを実行し、UI フィデリティ証跡を自動生成できること
- Non-goals: ブラウザベースの E2E テスト実行
- Notes: jsdom を使用したサーバーサイドクローリング。`--base-url` でクローリング対象を指定する

## US-0006-0002: UI コントラクト期待値抽出

- Parent: CAP-0006
- Goal: フロントエンドエンジニアとして、`.qfai/contracts/ui/` 配下の YAML ファイルから期待されるラベル・エレメントを抽出し、DOM クローリング結果と照合できること
- Non-goals: YAML スキーマの自動生成
- Notes: YAML の `screens[].elements[]` 構造から label, selector, data-qfai を抽出する

## US-0006-0003: エレメントマーカー検出

- Parent: CAP-0006
- Goal: フロントエンドエンジニアとして、DOM 内の `data-qfai` 属性を検出し、UI コントラクトとの対応関係を自動マッピングできること
- Non-goals: data-qfai 属性の自動付与
- Notes: `data-qfai="<contract-element-id>"` 形式のマーカーを検出する

## US-0006-0004: フィデリティ証跡出力

- Parent: CAP-0006
- Goal: フロントエンドエンジニアとして、クローリング結果を `.qfai/evidence/prototyping.json` に構造化出力し、CI/CD で検証可能な証跡を残せること
- Non-goals: HTML レポート生成
- Notes: JSON スキーマは uiFidelity オブジェクトを含む構造

## US-0006-0005: skeleton モード

- Parent: CAP-0006
- Goal: フロントエンドエンジニアとして、UI コントラクトは定義済みだがプロトタイプ未実装の段階で skeleton モードによる L1 evidence を記録し、段階的な検証を開始できること
- Non-goals: skeleton から実装への自動遷移
- Notes: `uiFidelity.screens=[]` で出力し、level="L1" を記録する

---

## [v1.7.7 Remediation] User Stories

## US-0006-0006: Static-first default

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0001, discussion story 1
- Goal: As a QFAI user, I want the default prototyping mode to be static-first (no runtime checks required), so that I can start prototyping without environment setup overhead.
- Non-goals: Disabling runtime checks entirely when explicitly requested; changes to full-harness mode behavior
- Notes: Running `qfai prototype` with no mode flag must complete purely through static analysis (spec parsing, contract extraction, schema validation). No process launch, no HTTP fetch, no browser dependency. Addresses P0-01 from discussion-20260329195516830.

### Example Seeds

| Perspective       | Example                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Happy path        | User runs `qfai prototype`; static analysis completes without any runtime dependency           |
| Negative path     | User's project has no parseable spec files; clear error with guidance to create specs          |
| Edge/boundary     | Project has 0 source files but valid specs; static-first completes with empty-source warning   |
| Permission/role   | Read-only filesystem; static-first still produces stdout output without writing temp files      |
| State transition  | User starts static-first, then upgrades mid-session to full-harness; transition is seamless    |
| Idempotency/retry | Running `qfai prototype` twice on unchanged input produces identical output                    |

## US-0006-0007: Prototyping mode definitions

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0003, discussion story 9
- Goal: As a QFAI user, I want the skill contract and CLI help to define low-cost, standard, and full-harness modes explicitly with completion criteria per mode, so that I understand exactly what each mode requires and produces.
- Non-goals: Implementing the full-harness runtime loop (belongs to spec-0031); auto-selecting mode based on project configuration
- Notes: Three modes must be explicitly documented: low-cost (static-only, no runtime), standard (static + lightweight runtime, e.g., skeleton-mode evidence), full-harness (delegates to /qfai-prototyping-full-harness). Skill contract must state completion criteria per mode.

### Example Seeds

| Perspective       | Example                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Happy path        | `qfai prototype --help` shows three modes with distinct completion criteria and evidence levels     |
| Negative path     | Skill contract missing mode definitions; qfai validate flags incomplete skill documentation         |
| Edge/boundary     | User requests full-harness mode from this skill; routed to /qfai-prototyping-full-harness with guidance |
| Permission/role   | Contributor reads skill SKILL.md; mode definitions are self-contained and require no maintainer assistance |
| State transition  | Skill contract updated from undifferentiated to three-mode structure; existing invocations still work |
| Idempotency/retry | Fetching mode definitions from skill contract twice produces identical output                       |

## US-0006-0008: CLI mode flags

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0010, discussion story 9
- Goal: As a QFAI user, I want explicit `--mode` flag on the CLI command surface listing low-cost, standard, and full-harness options with per-mode evidence and reviewer expectations, so that I can choose the appropriate prototyping depth.
- Non-goals: Inferring mode from project contents automatically; mode aliases or shorthand flags
- Notes: `qfai prototype --mode low-cost | standard | full-harness`. The `--mode` flag must appear in `--help` output with a description of each value. Full-harness directs user to /qfai-prototyping-full-harness. Evidence level and reviewer expectations must be documented per mode.

### Example Seeds

| Perspective       | Example                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Happy path        | `qfai prototype --help` lists --mode with low-cost, standard, full-harness and descriptions     |
| Negative path     | User passes `--mode=unknown`; CLI rejects with list of valid modes                              |
| Edge/boundary     | User passes no mode flag; defaults to low-cost (static-first) per US-0006-0006                  |
| Permission/role   | Full-harness mode listed in help but annotated as requiring dedicated skill invocation           |
| State transition  | User switches from `--mode=standard` to `--mode=full-harness` between runs; no stale state      |
| Idempotency/retry | Running `--help` multiple times produces identical output                                        |

## US-0006-0009: Mode-aware error guidance

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0010
- Goal: As a QFAI user, I want an invalid --mode value to produce an actionable error listing valid modes, so that I can correct my invocation without consulting documentation.
- Non-goals: Auto-correcting an invalid mode guess; fuzzy-matching mode names
- Notes: Error must include code (QFAI-PROTO-010), message, suggested_action listing valid modes, and must exit with code 1.

### Example Seeds

| Perspective       | Example                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Happy path        | `qfai prototype --mode low-cost` executes low-cost static analysis successfully                  |
| Negative path     | `qfai prototype --mode fast` produces QFAI-PROTO-010 error listing valid modes                  |
| Edge/boundary     | `qfai prototype --mode LOW-COST` (uppercase); error shows valid lowercase forms                  |
| Permission/role   | N/A (no role differentiation for mode selection)                                                 |
| State transition  | Error on invalid mode; no partial artifacts generated before error is emitted                    |
| Idempotency/retry | Same invalid mode flag produces same error output on every invocation                            |
