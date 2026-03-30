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
- US-0006-0010: Discussion artifact mode recommendation — discussion pack includes prototyping_mode_recommendation field with rationale
- US-0006-0011: Mode precedence resolution — CLI override > discussion recommendation > system default (standard)
- US-0006-0012: Effective mode logging — every prototyping run logs mode source, recommended mode, effective mode, rationale, and evidence expectations
- US-0006-0013: Non-visual surface mode behavior — visual-review evidence abstraction for CLI/API/library surfaces

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

| Perspective       | Example                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Happy path        | User runs `qfai prototype`; static analysis completes without any runtime dependency         |
| Negative path     | User's project has no parseable spec files; clear error with guidance to create specs        |
| Edge/boundary     | Project has 0 source files but valid specs; static-first completes with empty-source warning |
| Permission/role   | Read-only filesystem; static-first still produces stdout output without writing temp files   |
| State transition  | User starts static-first, then upgrades mid-session to full-harness; transition is seamless  |
| Idempotency/retry | Running `qfai prototype` twice on unchanged input produces identical output                  |

## US-0006-0007: Prototyping mode definitions

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0003, discussion story 9
- Goal: As a QFAI user, I want the skill contract and CLI help to define low-cost, standard, and full-harness modes explicitly with completion criteria per mode, so that I understand exactly what each mode requires and produces.
- Non-goals: Implementing the full-harness runtime loop (belongs to spec-0031); auto-selecting mode based on project configuration
- Notes: Three modes must be explicitly documented: low-cost (static-only, no runtime), standard (static + lightweight runtime, e.g., skeleton-mode evidence), full-harness (delegates to /qfai-prototyping-full-harness). Skill contract must state completion criteria per mode.

### Example Seeds

| Perspective       | Example                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Happy path        | `qfai prototype --help` shows three modes with distinct completion criteria and evidence levels            |
| Negative path     | Skill contract missing mode definitions; qfai validate flags incomplete skill documentation                |
| Edge/boundary     | User requests full-harness mode from this skill; routed to /qfai-prototyping-full-harness with guidance    |
| Permission/role   | Contributor reads skill SKILL.md; mode definitions are self-contained and require no maintainer assistance |
| State transition  | Skill contract updated from undifferentiated to three-mode structure; existing invocations still work      |
| Idempotency/retry | Fetching mode definitions from skill contract twice produces identical output                              |

## US-0006-0008: CLI mode flags

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0010, discussion story 9
- Goal: As a QFAI user, I want explicit `--mode` flag on the CLI command surface listing low-cost, standard, and full-harness options with per-mode evidence and reviewer expectations, so that I can choose the appropriate prototyping depth.
- Non-goals: Inferring mode from project contents automatically; mode aliases or shorthand flags
- Notes: `qfai prototype --mode low-cost | standard | full-harness`. The `--mode` flag must appear in `--help` output with a description of each value. Full-harness directs user to /qfai-prototyping-full-harness. Evidence level and reviewer expectations must be documented per mode.

### Example Seeds

| Perspective       | Example                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Happy path        | `qfai prototype --help` lists --mode with low-cost, standard, full-harness and descriptions |
| Negative path     | User passes `--mode=unknown`; CLI rejects with list of valid modes                          |
| Edge/boundary     | User passes no mode flag; defaults to low-cost (static-first) per US-0006-0006              |
| Permission/role   | Full-harness mode listed in help but annotated as requiring dedicated skill invocation      |
| State transition  | User switches from `--mode=standard` to `--mode=full-harness` between runs; no stale state  |
| Idempotency/retry | Running `--help` multiple times produces identical output                                   |

## US-0006-0009: Mode-aware error guidance

- Parent: CAP-0006
- Source: discussion-20260329195516830, REQ-0010
- Goal: As a QFAI user, I want an invalid --mode value to produce an actionable error listing valid modes, so that I can correct my invocation without consulting documentation.
- Non-goals: Auto-correcting an invalid mode guess; fuzzy-matching mode names
- Notes: Error must include code (QFAI-PROTO-010), message, suggested_action listing valid modes, and must exit with code 1.

### Example Seeds

| Perspective       | Example                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| Happy path        | `qfai prototype --mode low-cost` executes low-cost static analysis successfully |
| Negative path     | `qfai prototype --mode fast` produces QFAI-PROTO-010 error listing valid modes  |
| Edge/boundary     | `qfai prototype --mode LOW-COST` (uppercase); error shows valid lowercase forms |
| Permission/role   | N/A (no role differentiation for mode selection)                                |
| State transition  | Error on invalid mode; no partial artifacts generated before error is emitted   |
| Idempotency/retry | Same invalid mode flag produces same error output on every invocation           |

---

## [Prototyping Mode Switch UX] User Stories

## US-0006-0010: Discussion artifact mode recommendation

- Parent: CAP-0006
- Source: qfai_prototyping_mode_switch_ux_proposal.md §5, REQ-0003
- Goal: As a QFAI user, I want the discussion pack to include a `prototyping_mode_recommendation` field with rationale, so that the recommended prototyping mode is captured as part of project decisions and consumed by the prototyping command.
- Non-goals: Auto-selecting mode without user awareness; storing allowed_modes governance constraints (deferred)
- Notes: The discussion artifact (YAML sidecar or embedded field) must contain `prototyping.recommended_mode` and `prototyping.rationale`. This field is optional; absence does not cause errors. DR-0084 establishes this as the second-priority source in the mode precedence chain.

### Example Seeds

| Perspective       | Example                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Happy path        | Discussion pack output includes `prototyping.recommended_mode: standard` with rationale explaining choice            |
| Negative path     | Discussion pack has malformed `prototyping.recommended_mode` value (e.g., "fast"); validation flags error            |
| Edge/boundary     | Discussion pack omits `prototyping` section entirely; no error, field treated as absent                              |
| Permission/role   | Read-only user can view recommendation in discussion artifact; no special role required                              |
| State transition  | Discussion re-run updates recommendation from `low-cost` to `standard`; new value takes effect on next prototype run |
| Idempotency/retry | Running discussion twice with same inputs produces identical `prototyping.recommended_mode`                          |

## US-0006-0011: Mode precedence resolution

- Parent: CAP-0006
- Source: qfai_prototyping_mode_switch_ux_proposal.md §6, REQ-0010
- Goal: As a QFAI user, I want mode selection to follow a clear precedence chain (1. explicit CLI `--mode` override, 2. discussion artifact `recommended_mode`, 3. system default `standard`) so that mode resolution is deterministic and auditable.
- Non-goals: Auto-correcting invalid modes; inferring mode from project contents
- Notes: DR-0084 overrides DR-0080: the system default is `standard`, not `low-cost`. The precedence chain is strict and the resolved source must be logged.

### Example Seeds

| Perspective       | Example                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Happy path        | Discussion recommends `low-cost`; user runs `qfai prototype`; effective mode is `low-cost` from discussion               |
| Negative path     | Discussion recommends invalid mode `turbo`; system ignores invalid recommendation with warning, falls back to `standard` |
| Edge/boundary     | No discussion artifact and no --mode flag; system default `standard` is used                                             |
| Permission/role   | CLI --mode flag always wins regardless of discussion artifact content or user role                                       |
| State transition  | User adds discussion artifact between runs; second run picks up recommendation instead of system default                 |
| Idempotency/retry | Same inputs (same discussion artifact, same CLI flags) always resolve to same effective mode                             |

## US-0006-0012: Effective mode logging

- Parent: CAP-0006
- Source: qfai_prototyping_mode_switch_ux_proposal.md §10, REQ-0010
- Goal: As a QFAI user, I want every prototyping run to log the selected mode source (`cli-override` / `discussion-recommendation` / `default`), recommended mode, effective mode, rationale, and evidence expectations so that mode decisions are traceable for debugging and audit.
- Non-goals: Cost tracking per mode; persisting mode history across runs
- Notes: The log output must be structured (JSON or structured text) and must appear in both stdout and the evidence artifact. Evidence expectations describe what level of evidence the effective mode produces.

### Example Seeds

| Perspective       | Example                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Happy path        | Run with `--mode standard`; log shows `mode_source: cli-override, effective_mode: standard, evidence_expectations: L2/L3`      |
| Negative path     | Log output is missing required fields; `qfai validate` flags incomplete mode logging                                           |
| Edge/boundary     | No discussion artifact, no CLI flag; log shows `mode_source: default, recommended_mode: null, effective_mode: standard`        |
| Permission/role   | Log output is visible in stdout regardless of verbosity setting (mode resolution is always shown)                              |
| State transition  | First run logs `mode_source: default`; user adds discussion artifact; second run logs `mode_source: discussion-recommendation` |
| Idempotency/retry | Two identical runs produce identical mode log entries (timestamps excepted)                                                    |

## US-0006-0013: Non-visual surface mode behavior

- Parent: CAP-0006
- Source: qfai_prototyping_mode_switch_ux_proposal.md §9, REQ-0003
- Goal: As a QFAI user with a non-visual surface (CLI, API, library), I want mode definitions to use `visual-review evidence` abstraction instead of `browser evidence`,
  so that mode semantics apply correctly to all surface types and visual-review evidence is marked `n/a` when the surface is not visually reviewable.
- Non-goals: Auto-detecting surface type from project; different mode names per surface
- Notes: Non-visual surfaces (CLI-only, API, library) cannot produce browser screenshots or visual review evidence. In these contexts, visual-review evidence fields are set to `n/a` rather than causing failures. The mode name and static analysis behavior remain identical across all surfaces.

### Example Seeds

| Perspective       | Example                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Happy path        | CLI-only project runs `qfai prototype --mode standard`; visual-review evidence marked `n/a`; static evidence normal |
| Negative path     | Mode definition references browser evidence on non-visual surface; validation warns about inapplicable evidence     |
| Edge/boundary     | Project has both visual and non-visual surfaces; evidence is surface-specific per target                            |
| Permission/role   | Library consumer invokes prototyping via API; same n/a treatment applies without special configuration              |
| State transition  | Project transitions from CLI-only to visual surface; visual-review evidence changes from `n/a` to actual evidence   |
| Idempotency/retry | Running prototype twice on non-visual surface produces identical `n/a` visual-review evidence                       |
