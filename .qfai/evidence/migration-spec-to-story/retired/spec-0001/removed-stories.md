# Retired user stories

Source: `.qfai/specs/spec-0001/02_User-stories.md`

## US-0001-0001

Catalog line (verbatim):

- US-0001-0001: v1421 Layered Spec 必須ファイルセット定義

Section (verbatim):

## US-0001-0001: v1421 Layered Spec 必須ファイルセット定義

- Parent: CAP-0001
- Goal: spec-XXXX/ に 9 必須ファイル（01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md）+ 10_Plan.md を定義し、\_policies/ に 10 ファイル（01_Objective ~ 10_delta）を定義する
- Non-goals: spec-pack（v1.4 形式）や legacy 形式の詳細仕様
- Notes: REQ-0001 準拠。REQUIRED_LAYERED_SPEC_FILES_V1421 および REQUIRED_LAYERED_SHARED_FILES_V1421 として specLayout.ts に実装済み


## US-0001-0002

Catalog line (verbatim):

- US-0001-0002: レイアウト検出ロジック定義

Section (verbatim):

## US-0001-0002: レイアウト検出ロジック定義

- Parent: CAP-0001
- Goal: spec ディレクトリ内のファイル構成から spec-pack / layered(v1416, v1417, v1421) / legacy を自動判別するロジックを定義する
- Non-goals: レイアウト変換ツールの実装
- Notes: REQ-0002 準拠。collectSpecEntries() で実装済み。v1421 判定は 01_Spec.md + 02_User-stories.md + v1421 マーカー（05_Examples.md / 03_Acceptance-Criteria.md / 04_Business-Rules.md / 06_Test-Cases.md）の存在で判定


## US-0001-0003

Catalog line (verbatim):

- US-0001-0003: ID フォーマットルール定義

Section (verbatim):

## US-0001-0003: ID フォーマットルール定義

- Parent: CAP-0001
- Goal: US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY の ID 形式ルールを定義し、spec 間での ID 衝突を禁止する
- Non-goals: ID の自動採番ツール
- Notes: REQ-0003 準拠。specPackIds.ts で実装済み


## US-0001-0005

Catalog line (verbatim):

- US-0001-0005: 参照方向ルール定義

Section (verbatim):

## US-0001-0005: 参照方向ルール定義

- Parent: CAP-0001
- Goal: \_policies → spec-XXXX 参照を禁止（upper-to-lower）、spec-XXXX → \_policies/CAP/NFR 参照を許可（lower-to-upper）するルールを定義する
- Non-goals: 参照方向の自動修正
- Notes: REQ-0005 準拠。統合元由来


## US-0001-0006

Catalog line (verbatim):

- US-0001-0006: Escalation Hook 定義

Section (verbatim):

## US-0001-0006: Escalation Hook 定義

- Parent: CAP-0001
- Goal: spec-XXXX/01_Spec.md に配置する Escalation Hook（Ambiguous, Conflict, Missing, Trade-off）とエスカレーション先（\_policies/ の特定ファイル）を定義する
- Non-goals: エスカレーションの自動判定ロジック
- Notes: REQ-0006 準拠。統合元由来


