# 10 Plan

## Implementation Strategy (How-only)

### Phase Order

1. Validator Phase 2 implementation (core logic)
2. Report coverage visualization
3. Template / docs update (init assets, specs README)
4. Assets tests / init tests update
5. Verify-pack update
6. Stale wording cleanup

### Rationale

Logic → Template → Guard — この順序により、まずバリデーションロジックを実装し、次にテンプレートを新しい契約に追従させ、最後にテストでガードレールを固める。

## Implementation Plan

### Step 1: Validator Phase 2 (packages/qfai/src/core/validators/tddList.ts)

**What**: 既存の Phase 1 バリデータに 5 つの新規チェックを追加する。

**How**:

1. `REQUIRED_COLUMNS` に `"DR-ID"` と `"Evidence"` を追加（6→8列）
2. Phase 2 チェック関数を追加:
   - `checkTcCoverage()`: 06_Test-Cases.md の unit/component TC-\* を収集し、test-list.md の TC-Refs に全て存在することを検証
   - `checkExceptionDrId()`: Status=exception の行で DR-ID が空/whitespace でないことを検証
   - `checkTestFileExists()`: Status in {green, refactor, done} の行で Test file が実在することを検証（fs.access、プロジェクトルート相対、Windows パス正規化）
   - `checkDuplicateId()`: TDD-ID の case-insensitive 一意性を検証
   - `checkIdFormat()`: TDD-ID が TDD-NNNN パターンに合致することを検証
3. 全 Phase 2 チェックは error severity
4. 既存 Phase 1 チェック（TDDLIST_MISSING, TDDLIST_TABLE_MISSING 等）は変更しない

**Dependencies**:

- `parseFirstMarkdownTable` (既存ユーティリティ)
- `parseTestCaseIds` (既存ユーティリティ)
- `fs.access` (Node.js built-in)

**Test strategy**:

- Unit tests: 各チェック関数の happy/negative/edge パス
- Test file existence: tmp ディレクトリにテストフィクスチャを配置

### Step 2: Report Coverage Visualization (packages/qfai/src/core/report.ts)

**What**: spec ごとに unit/component TC coverage summary を追加する。

**How**:

1. 既存の report 生成パイプラインに coverage セクションを追加
2. Per-spec output:
   - Unit/Component TC total
   - Done count / Exception count / Open count
   - Missing TC refs list
   - Exception rows list
   - Latest evidence refs
3. Actionable guidance: 各 issue type に "what to edit" hint を付与

**Dependencies**:

- Validator Phase 2 の TC 収集ロジックを再利用
- 既存 report インフラ

### Step 3: Template / Docs Update

**What**: init assets と docs を v1.6.1 契約に追従させる。

**How**:

1. `packages/qfai/assets/init/.qfai/specs/spec-XXXX/tdd/test-list.md`:
   - 8列テンプレート（TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence）
2. `packages/qfai/assets/init/.qfai/specs/README.md`:
   - test-list.md の役割を execution ledger として明記
   - coverage は unit/component TC の収載網羅で計測と明記
   - exception は DR-ID 必須と明記
   - green/refactor/done は Test file 実在が必要と明記

### Step 4: Assets Tests / Init Tests Update

**What**: テストスイートを新しい契約に追従させる。

**How**:

1. Assets tests (`packages/qfai/tests/assets/assets.test.ts`):
   - 8列テンプレート検証
   - exception DR-ID 契約検証
   - old 3 skill 非復活検証
2. Init tests (`packages/qfai/tests/cli/init.test.ts`):
   - 生成された test-list.md の構造検証
   - Phase 2 パス確認

### Step 5: Verify-pack Update

**What**: パッケージに新テンプレ/docs が含まれ、旧参照が混入していないことを検証する。

**How**:

1. `scripts/verify-pack.mjs` を更新
2. 新テンプレ/docs の存在チェック追加
3. old reference 拒否チェック追加

### Step 6: Stale Wording Cleanup

**What**: リポジトリ全体から旧 3 skill 参照を探索し除去する。

**How**:

1. grep で `qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor` を全探索
2. 残存があれば v1.6.1 表現に置換

## Test Strategy

### Unit Tests (Layer: unit)

- 各 Phase 2 チェック関数: TC-0015-0001〜TC-0015-0021
- 入力: フィクスチャ markdown テーブル
- 期待: 正しい Issue[] 返却

### Component Tests (Layer: component)

- Report coverage visualization: TC-0015-0022〜TC-0015-0024
- Init template generation: TC-0015-0025
- Old template detection: TC-0015-0026〜TC-0015-0028

### Test Annotation Schema

- `tests/unit/**` → `QFAI:SPEC-0015:TC-XXXX`
- `tests/integration/**` → `QFAI:SPEC-0015:TC-XXXX` (component level)
