# 11 Slice Policy

spec ディレクトリのスライスと、Stage 1 Triage における 8 種オペレーションの
判定基準を定義する。

## 原則 (read first)

既定の操作は **既存 active spec への UPDATE (APPEND / MODIFY / REMOVE)**。
CREATE は「明らかなスコープ逸脱で、かつ新しい capability を
`_policies/03_Capabilities.md` に追加する場合」のみ。
バリデータ `QFAI-TRIAGE-006` がこれを構造的に強制する: CREATE 行は
Rationale 列に新 `CAP-NNNN` を必ず記載し、その CAP は capability
カタログに登録済みでなければならない。

classifier (`src/core/sddTriage.ts::classifyTriage`) は append-first
fallback を実装する: capability が完全一致しない場合でも、subject
token (title / scope / capability text) に最も多く重なる active spec
への UPDATE:APPEND を提案する。CREATE は active spec のいずれとも
**1 つも token が重ならない** ときだけ提案される。

1 つの REQ は複数の spec に影響することが多い。primary spec を決めた
後、必ず他の active spec を全走査し、関連する AC/BR を持つ spec には
companion 行 (UPDATE:MODIFY / UPDATE:REMOVE) を Triage table に追加
する (impact cascade)。同じ `Source` ID が複数行に登場するのは正規
パターン。

## スライスカテゴリ

| Category   | Slice Rule                        | ID Range                   |
| ---------- | --------------------------------- | -------------------------- |
| structural | 1 pack-type = 1 spec              | spec-0001..0002            |
| cli        | 1 command = 1 spec                | spec-0003..0007            |
| skill      | 1 skill = 1 spec                  | spec-0008..0014, spec-0016 |
| agent      | all agents = 1 collective spec    | spec-0015                  |
| toolchain  | all repository toolchain = 1 spec | spec-0017                  |

### カテゴリ定義

- **structural**: QFAI フレームワーク自体の構造定義（spec-pack, discussion-pack）。
- **cli**: `packages/qfai/src/cli/commands/` に実装される CLI コマンド。1 コマンド = 1 spec。
- **skill**: `packages/qfai/assets/init/.qfai/assistant/skills/` に定義される SKILL.md。1 skill = 1 spec。
- **agent**: `packages/qfai/assets/init/.qfai/assistant/agents/` に定義されるサブエージェント。全エージェントで 1 spec。
- **toolchain**: リポジトリ自身のツールチェーン。`.github/workflows/`、リポジトリ内部の
  composite action (`.github/actions/**`)、リポジトリ root `scripts/`、
  `packages/qfai/scripts/`、テストランナー構成 (`vitest.config.ts` / `vitest.workspace.ts`) を
  1 spec で集約所有する。他 4 カテゴリが「配布される製品面」を扱うのに対し、本カテゴリは
  「製品を作る側の道具」を扱う。
  - `.github/actions/**` を明示列挙するのは、`scripts/verify-pack.mjs` の composite-action 禁止が
    **配布される** `.github` tree (`assets/init/root/.github`) にしか掛からないため。
    リポジトリ内部の composite action は合法であり、列挙から漏らすと本リポジトリ唯一の
    composite action が無所有になる。
  - **所有するのは lane の配線・実行トポロジ・runner 構成であって、個々の guard が
    検査する規則ではない。** ある script の検査規則が別 spec の surface に属する場合、
    規則はその spec が持ち続け、toolchain spec は「どの lane で、どの順で、どの
    権限で走らせるか」だけを所有する (例: pack-location lane と SSOT-sync pair lane の
    規則は CAP-0004 が保持し、本カテゴリはその CI 配線のみを見る)。無条件の
    collective 所有と読むと既存 spec の所有権と衝突する。
  - 配布される workflow テンプレート (`assets/init/root/.github/workflows/**`) は
    **本カテゴリではなく CAP-0003 (`qfai init`) の所有**。配布物か否かが境界。
  - agent カテゴリと同じ collective 型: ツールチェーン構成要素ごとに spec を増やさない
    (`10_delta.md:212` 「異なる機能を1つのスペックに詰め込まない」の裏返しとして、
    同一関心の道具群を分散させないことを優先する)。

## Triage オペレーション (8 種)

UPDATE は APPEND / MODIFY / REMOVE に細分化する。SPLIT / MERGE / SUPERSEDE
は構造変更の 1st-class オペレーション。

| Operation | Sub-op | トリガー                                                              | AskUserQuestion |
| --------- | ------ | --------------------------------------------------------------------- | --------------- |
| CREATE    | -      | 新 subject、active spec が capability を保持していない                | 必須            |
| UPDATE    | APPEND | 既存 active spec に新 US/AC/BR/EX/TC を追加（既存項目の意味変更なし） | 不要            |
| UPDATE    | MODIFY | 既存 US/AC/BR/EX/TC の意味を変更                                      | 不要            |
| UPDATE    | REMOVE | 既存 US/AC/BR/EX/TC を削除（downstream 参照を切断）                   | 必須            |
| DELETE    | -      | spec の subject ごとリポジトリから消失                                | 必須            |
| SPLIT     | -      | 1 spec が複数 capability を保持しており責務分離が必要                 | 必須            |
| MERGE     | -      | 複数 spec が同一 capability に収斂                                    | 必須            |
| SUPERSEDE | -      | spec の責務が新 spec に置換、履歴は status: superseded で保持         | 必須            |

## APPEND vs CREATE 判定アルゴリズム (append-first)

各 REQ/NFR に対して上から順に判定:

1. REQ の capability を `_policies/03_Capabilities.md` から特定
2. 単一 active spec が capability を保持し、`acCount <= 30 && tcCount <= 50` → **UPDATE:APPEND**
3. 複数 active spec が capability を共有 → **MERGE**
4. 単一 active spec が capability を保持するが size 閾値超 → **SPLIT**
5. capability 不一致だが、いずれかの active spec の title / scope / capability text と subject token が **1 つでも重なる** → 最近接 active spec に対して **UPDATE:APPEND** (subject overlap fallback)。閾値超なら **SPLIT** に格上げ。Rationale に cascade 検証済みである旨を記載する。
   - subject token の正規化規則は `src/core/sddTriage.ts::tokenize` 準拠 (`STOP_TOKENS` 除外、2 文字以上、Unicode property `\p{L}\p{N}`)。`the new flag` のように STOP_TOKENS だけで構成される subject はトークン集合が空になり「重なるトークン無し」と評価される。AI driver は subject を意味のある名詞句で記述すること。
6. active spec のいずれとも **token が 1 つも重ならない** かつ capability 自体も新規 → **CREATE**。新 `CAP-NNNN` を `_policies/03_Capabilities.md` に追記してから Triage 行に記載 (`QFAI-TRIAGE-006` で構造強制)。
7. REQ が既存項目の削除を要求 → **UPDATE:REMOVE**
8. spec の subject 自体が消失 → **DELETE**
9. 責務を新 spec に移し旧 ID は履歴として残す → **SUPERSEDE**

## Impact cascade

primary spec の判定後、他の active spec を全走査し、ノックオン影響を
持つものに companion 行を追加する:

- 既存 US/AC/BR/EX/TC が変更概念を参照 → **UPDATE:MODIFY**
- 既存 US/AC/BR/EX/TC が陳腐化 → **UPDATE:REMOVE** (承認必須)
- glossary / contract への波及 → `_policies/10_delta.md` に記録

同じ `Source` (REQ ID) が複数行に登場するのは正規パターン。

## Decision procedure

1. `_policies/03_Capabilities.md` と active spec summary を読む（status: active のみ対象）。
2. 全変更要望に対する Triage table を spec 編集前に構築する。
3. CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE 行は AskUserQuestion で承認を取得。
4. Triage table を以下に永続化:
   - 単一 spec を触る行 → `<spec>/09_delta.md`
   - 複数 spec をまたぐ行（SPLIT / MERGE / SUPERSEDE）または policy のみの変更 → `_policies/10_delta.md`
5. 承認確定後に Phase 0 (Contracts-first) へ進む。

## Status field

各 spec の `01_Spec.md` は `Status: active | superseded | deprecated | removed` を必ず宣言する。

- SUPERSEDE 時は移行元 spec を `Status: superseded` にし `Superseded-by: spec-NNNN` を設定。
- DELETE は spec ディレクトリごと削除し、理由を delta に記録。
- deprecated / removed は `Deprecated-at: YYYY-MM-DD` 必須。
- Triage 判定では非 active spec は対象外。

## AskUserQuestion テンプレート

**CREATE / SPLIT / MERGE / SUPERSEDE 時:**

```text
${operation} を実行します。
対象: ${subject}
影響 spec: ${spec_ids_or_none}
理由: ${rationale}
承認しますか？
```

**DELETE / UPDATE:REMOVE 時:**

```text
${operation} を実行します。
対象 spec: ${spec_id}
削除内容: ${what_will_be_removed}
理由: ${rationale}
承認しますか？
```

## ID 安定性ルール

1. structural specs (0001-0002) は固定。
2. CLI specs は `03_Capabilities.md` 記載順で spec-0003 から付番。
3. skill specs はアルファベット順で CLI specs の次から付番。late-added skill (spec-0016 等) はカテゴリ末尾に追加して既存 ID を保つ。
4. agent collective spec (`spec-0015`) は新規追加時点では skill range の末尾に置かれた歴史的経緯から `0015` を保持する。後続 skill が追加されても renumber しない。
5. SUPERSEDE / DELETE 後の ID は**一時的に**空けてよい（gap を残す）。ただし
   **恒久予約はできない。gap 番号 `spec-000M` は、CAP 件数が M に達した時点で
   必ず再採番する。**

   `validateSpecSplitByCapability` は CAP 件数 N から `spec-0001..spec-000N` の
   連番を **positional に**導出する
   (`packages/qfai/src/core/validators/specSplitByCapability.ts:75` — CAP の
   *番号*は読まず、リスト内の位置だけを使う)。したがって予約 ID `spec-000M` は
   N が M に達した瞬間に充足不能になる: gap 位置の ID を使えば予約違反、
   次番を使えば `QFAI-SPLIT-103` (不足) と `QFAI-SPLIT-104` (余剰) が同時に error。
   N は単調増加するので、**すべての恒久予約は「いつか必ず爆発する」**。
   gap が予約時点で range の内側にあったか末尾にあったかは無関係 — 決めるのは
   「CAP 件数がその番号に到達するか」だけであり、到達しない保証は存在しない。

   実例: `spec-0017` は予約時点では末尾 gap (CAP 16 件 / spec-0001..0016) だったが、
   次の capability 追加 (CHG-007) でちょうど detonate した。末尾だから安全、という
   読みは誤りである。

   この構造的制約自体の解消 (gate を番号照合に変更) は `OQ-0023` で追跡する。
   それが入るまでは、本ルールが唯一の運用回避策。

## ギャップポリシー

- 削除時はギャップを一時的に残してよい（即時リナンバリングは不要）。ただし
  §ID 安定性ルール 5 のとおり恒久予約はできず、CAP 件数がその番号に達した時点で
  必ず再採番する。gap が内側か末尾かは判断材料にならない。
- **新規 spec の付番は gap を最優先で埋める。** カテゴリ末尾に足すのは gap が
  無いときだけ — positional gate が要求するのは `spec-0001..spec-000N` の連番で
  あり、カテゴリごとの ID Range 表はその連番制約の下位にある。両者が衝突した
  場合は連番を優先し、ID Range 表を実態に合わせて更新する。
- 順序変更は Change Request + delta.md 記録必須。

## Current Slicing Notes

- `spec-0015` は agent collective spec として維持し、renumber は行わない。
- `spec-0016` は late-added skill spec として active range に含める (CAP-0016 = Web Research Enhancement)。
- contract-first downstream への収束は既存 slice model に閉じており、追加の reslicing は不要。
- `spec-0017` は 2026-05-06 に CAP-0012 へ統合され、当時 `spec-0017` / `CAP-0017` は
  恒久 gap として再利用禁止に指定された。**2026-08-05 にこの恒久予約を撤廃した**
  (ユーザ承認)。撤廃理由は §ID 安定性ルール 5 に記載の機械的制約 — この予約は
  取った時点では **末尾** gap (CAP 16 件 / `spec-0001..0016`) だったが、positional gate の
  期待集合は CAP 件数 N から `spec-0001..spec-000N` を導出するため、N が 17 に達した
  時点で予約を保持したままでは 17 件目の capability をどう命名しても validate が
  error になる。末尾 gap だから安全という読みが誤りであることの実例。
  `spec-0017` / `CAP-0017` は再採番可能な通常 ID に戻る。
- `spec-0017` は 2026-08-05 に **CAP-0017 = Repository Toolchain** として再採番された
  (toolchain カテゴリの初 spec)。過去の `spec-0017` = Prototyping v2.0 という
  参照は歴史記録であり、現行 ID Range とは一致しない。
- 現行の active range は `spec-0001..spec-0017` の連番（gap なし）。
  positional validator (`QFAI-SPLIT-102..105`) が要求する連番条件を満たす。
