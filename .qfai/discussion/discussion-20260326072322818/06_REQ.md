# 06 REQ (Functional Requirements)

## Requirements Table

| REQ-ID   | Title | Description | Source | Priority | Status |
| -------- | ----- | ----------- | ------ | -------- | ------ |
| REQ-0001 | Design Audit Validator | designAudit.ts を新規作成し、UI-bearing artifact に対して 7 audit dimension (tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity) の静的監査を実行する | SRC-0001 | must | draft |
| REQ-0002 | Slop Guardrails Validator | designSlop.ts を新規作成し、designSlopPatterns.json のルール定義に基づいて AI slop パターン（SLP-01〜SLP-06）を検知する | SRC-0001 | must | draft |
| REQ-0003 | Slop Rule Definition File | designSlopPatterns.json を新規作成し、各ルールに id, category, tier, scopes, match, message, guidance を持たせる | SRC-0001 | must | draft |
| REQ-0004 | Stable Rule ID 体系 | Design audit findings は QFAI-AUD-XXX、slop findings は QFAI-SLP-XXX の stable rule ID を使用する | SRC-0001 | must | draft |
| REQ-0005 | Audit Finding 内部構造 | 各 finding は ruleId, dimension, severityTier, message, why, evidence[], guidance を持つ | SRC-0001 | must | draft |
| REQ-0006 | Validator 登録 | validators/index.ts に validateDesignAudit と validateDesignSlop を登録する | SRC-0001, SRC-0003 | must | draft |
| REQ-0007 | Config 拡張 | QfaiUiuxConfig に audit セクション（enabled, slopDetection, requireStatesForUiBearing, maxPrimaryCtas, maxRawTokenLiteralWarnings）を追加する | SRC-0001, SRC-0008 | must | draft |
| REQ-0008 | Quality Profile Mapping | qualityProfile (default/high/strict) に応じて rule tier (structural-blocking/strong-advisory/style-heuristic) を severity (error/warning/info) にマッピングする | SRC-0001 | must | draft |
| REQ-0009 | Report グループ化 | report に "Design Audit Findings" と "Slop Guardrails Findings" の分離セクションを追加する | SRC-0001 | must | draft |
| REQ-0010 | 有効/無効制御 | audit.enabled: false で v1.7.2 全バリデータ無効、slopDetection: false で slop のみ無効、config 省略時はデフォルト有効 | SRC-0001, SRC-0008 | must | draft |
| REQ-0011 | UI-bearing 判定 | 既存の v1.7.0 UI-bearing 判定ロジックを再利用し、非 UI-bearing pack では v1.7.2 バリデータをスキップする | SRC-0001, SRC-0010 | must | draft |
| REQ-0012 | Token Drift 検知 | design tokens 存在時に contracts/mocks の raw 値乱発を検知する（threshold ベース） | SRC-0001, SRC-0004 | should | draft |
| REQ-0013 | DDP 重複ルール移行 | ddpValidation.ts の anti-pattern ルールのうち、shared slop engine に移行するものを整理する（既存 DDP 構造チェックは維持） | SRC-0001, SRC-0003, SRC-0009 | should | draft |
| REQ-0014 | テスト追加 | designAudit.test.ts と designSlop.test.ts を新規作成し、fixture 10 種を網羅する | SRC-0001 | must | draft |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
