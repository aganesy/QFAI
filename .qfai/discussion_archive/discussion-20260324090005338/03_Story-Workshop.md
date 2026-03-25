# 03_Story-Workshop

## User Stories

### US-D001: Design Direction Pack

**As a** QFAI user
**I want** UI-bearing discussion/spec に visual thesis, content plan, interaction thesis, anti-goals を残したい
**So that** downstream agents が雰囲気や hierarchy を推測せず実装できる

### US-D002: Navigation and Screen Flow as SSOT

**As a** QFAI user
**I want** 画面遷移、導線、CTA hierarchy、error/recovery flow を明記したい
**So that** prototype と実装が迷わない導線を持つ

### US-D003: Premium Prototype Loop

**As a** QFAI maintainer
**I want** `/qfai-prototyping` と `/qfai-implement` が render critique を前提に改善する
**So that** generic でダサい UI が残りにくい

### US-D004: Design Fidelity Review

**As a** reviewer
**I want** rendered UI を scorecard で点検したい
**So that** aesthetic / usability / accessibility / responsiveness を再現可能に判定できる

### US-D005: Research-to-Constraint 変換

**As a** QFAI user
**I want** discussion の research summary から contracts/design の BP/AP rule DB へ変換するステップを必須にしたい
**So that** 調査結果が discussion に閉じず downstream の拘束条件として伝播する

### US-D006: 高忠実度テンプレート

**As a** QFAI user
**I want** Story Workshop の Screen Mock テンプレートを高忠実度にしたい
**So that** 上流入力の品質が下流 UI 品質の上限を決める問題を解消する

### US-D007: UI Contract 体験仕様拡張

**As a** QFAI user
**I want** UI Contract に purpose / primary_user_task / primary_cta / states / max_primary_steps / anti_patterns を追加したい
**So that** UI Contract が要素台帳から体験仕様に進化する

### US-D008: taskFidelity 評価

**As a** QFAI user
**I want** uiFidelity を taskFidelity に拡張し、タスク完遂評価（step count, CTA visibility, empty/error state）を追加したい
**So that** 「見た目だけ存在する UI」を通しにくくなる

### US-D009: Warning→Error ゲート昇格

**As a** QFAI user
**I want** UI品質関連の主要 warning を error に昇格したい
**So that** 低品質 UI が本当に止まる

## User Flow

```mermaid
flowchart TD
    A["discussion start"] --> B["Design Direction Pack を定義"]
    B --> B2["Research-to-Constraint 変換"]
    B2 --> C["高忠実度テンプレートで tokens / mock / navigation / flow を定義"]
    C --> C2["UI Contract 体験仕様を定義"]
    C2 --> D["/qfai-sdd で spec 化"]
    D --> E["/qfai-prototyping で first render"]
    E --> F{"desktop/mobile critique<br/>+ anti-pattern detection<br/>+ taskFidelity 評価"}
    F -->|revise| E
    F -->|pass| G["/qfai-implement"]
    G --> H["review scorecard + validate<br/>warning→error gate"]
```

## Screen Flow

```mermaid
stateDiagram-v2
    [*] --> Landing: first visit
    Landing --> Explore: primary CTA
    Landing --> Pricing: compare plan
    Explore --> Detail: select item
    Explore --> Empty: no result
    Explore --> Error: fetch failed
    Detail --> Checkout: continue
    Detail --> Explore: back
    Checkout --> Success: submit ok
    Checkout --> Checkout: validation error
    Error --> Explore: retry
    Empty --> Explore: change filter
    Success --> [*]: complete
```

## HTML+CSS Screen Mock

### Design Direction Pack

- Visual thesis: editorial-tech, calm but assertive, steel-blue surfaces with a single ember accent
- Content plan: identity -> proof -> workflow -> action
- Interaction thesis: soft reveal, depth shift on focus, decisive CTA feedback
- Anti-goals: card mosaic, rainbow accents, vague hero copy, decorative charts without job

```html
<section
  style="min-height:100vh;background:linear-gradient(135deg,#07111f 0%,#10233b 55%,#f4efe7 100%);color:#f5f7fb;font-family:'Segoe UI',system-ui,sans-serif;"
>
  <div style="max-width:1200px;margin:0 auto;padding:32px 24px 64px;">
    <header
      style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 40px;"
    >
      <div style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;opacity:.78;">
        QFAI Direction Pack
      </div>
      <a
        style="padding:12px 18px;border:1px solid rgba(255,255,255,.28);border-radius:999px;color:#f5f7fb;text-decoration:none;"
        >Open Critique Loop</a
      >
    </header>
    <div style="display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:end;">
      <div>
        <p
          style="margin:0 0 14px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#ff8a5b;"
        >
          Brand first
        </p>
        <h1
          style="margin:0 0 18px;font-size:clamp(48px,9vw,92px);line-height:.94;font-weight:750;max-width:7ch;"
        >
          Design with intent, not vibes.
        </h1>
        <p
          style="max-width:32rem;margin:0 0 24px;font-size:18px;line-height:1.55;color:rgba(245,247,251,.84);"
        >
          Theme, navigation, screen flow, and critique become explicit artifacts before
          implementation starts.
        </p>
        <div style="display:flex;gap:14px;flex-wrap:wrap;">
          <a
            style="padding:14px 20px;background:#ff8a5b;color:#07111f;text-decoration:none;border-radius:999px;font-weight:700;"
            >Generate Spec-Ready Pack</a
          >
          <span style="padding:14px 18px;border-radius:999px;background:rgba(255,255,255,.08);"
            >No card-grid default</span
          >
          <span style="padding:14px 18px;border-radius:999px;background:rgba(255,255,255,.08);"
            >Desktop / Mobile critique</span
          >
        </div>
      </div>
      <aside
        style="background:rgba(7,17,31,.42);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.16);border-radius:28px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.22);"
      >
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;"
        >
          <strong style="font-size:18px;">Fidelity Scorecard</strong>
          <span style="font-size:13px;color:#ffcfbf;">88 / 100</span>
        </div>
        <div style="display:grid;gap:12px;">
          <div style="display:flex;justify-content:space-between;">
            <span>Visual thesis clarity</span><span>PASS</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>CTA hierarchy</span><span>PASS</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Generic pattern violations</span><span>0</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Desktop/mobile render review</span><span>PASS</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>taskFidelity (step count)</span><span>PASS</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Research-to-Constraint 変換</span><span>PASS</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</section>
```

### Raw Mock Snippet

<section data-qfai-screen="direction-pack" data-breakpoint="desktop" style="background:#07111f;color:#f5f7fb;padding:24px;border-radius:24px;">
  <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ff8a5b;">Direction Pack Preview</div>
  <h2 style="margin:12px 0 8px;font-size:40px;line-height:1;">Design with intent, not vibes.</h2>
  <p style="max-width:32rem;color:rgba(245,247,251,.82);">Theme, hierarchy, navigation, and critique are explicit before prototyping starts.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
    <button style="padding:12px 18px;border:none;border-radius:999px;background:#ff8a5b;color:#07111f;font-weight:700;">Generate Spec-Ready Pack</button>
    <span style="padding:12px 16px;border-radius:999px;background:rgba(255,255,255,.08);">Desktop/Mobile Critique</span>
  </div>
</section>

## Example Seeds

### US-D001: Design Direction Pack

| Perspective         | Seed                                                | Notes                      |
| ------------------- | --------------------------------------------------- | -------------------------- |
| Happy path          | visual thesis / anti-goals / CTA hierarchy が埋まる | theme が downstream に渡る |
| Negative path       | visual thesis なしで generic UI が生成される        | validate / review で FAIL  |
| Edge / boundary     | mood は強いが CTA hierarchy が曖昧                  | 変換不能として修正対象     |
| Permission / role   | design-owner が direction を決め reviewer が検証    | 判断責務を分離             |
| State transition    | direction 更新後に mock / flow へ反映される         | traceability 必須          |
| Idempotency / retry | 同じ direction から同じ review 結果が得られる       | 再現性                     |

### US-D002: Navigation and Screen Flow as SSOT

| Perspective         | Seed                                                  | Notes                 |
| ------------------- | ----------------------------------------------------- | --------------------- |
| Happy path          | happy / error / recovery flow が明記される            | 主要導線が迷わない    |
| Negative path       | error/retry flow が欠落                               | OQ または review FAIL |
| Edge / boundary     | mobile では nav collapse、desktop では persistent nav | 両 viewport で検証    |
| Permission / role   | admin 導線のみ追加                                    | role-based flow       |
| State transition    | empty -> explore, error -> retry                      | 状態遷移明示          |
| Idempotency / retry | retry 後も意図した画面へ戻る                          | 外部 I/O 前提         |

### US-D003: Premium Prototype Loop

| Perspective         | Seed                                                  | Notes                         |
| ------------------- | ----------------------------------------------------- | ----------------------------- |
| Happy path          | first render 後に critique して refined render を作る | 2-pass 以上                   |
| Negative path       | code を読んだだけで完了扱い                           | rendered UI review なしは不可 |
| Edge / boundary     | desktop は良いが mobile で崩れる                      | dual viewport gate            |
| Permission / role   | implementer は critic feedback を反映                 | downstream rule               |
| State transition    | prototype -> critique -> revise -> implement          | ループ前提                    |
| Idempotency / retry | 同じ input で critique rubric が同じ                  | scorecard 再現性              |

### US-D004: Design Fidelity Review

| Perspective         | Seed                                             | Notes                 |
| ------------------- | ------------------------------------------------ | --------------------- |
| Happy path          | scorecard >= target で PASS                      | 記録可能              |
| Negative path       | card mosaic / weak hierarchy を検出              | banned pattern        |
| Edge / boundary     | 見た目は良いが contrast 不足                     | aesthetic only を禁止 |
| Permission / role   | frontend/design/integrated UIUX reviewers が協調 | full roster           |
| State transition    | FAIL -> revise -> rerun roster                   | review cycle          |
| Idempotency / retry | 同じ artifact に同じ rubric を適用               | 安定判定              |

### US-D005: Research-to-Constraint 変換

| Perspective         | Seed                                                                  | Notes                           |
| ------------------- | --------------------------------------------------------------------- | ------------------------------- |
| Happy path          | research summary の BP/AP が contracts/design の rule DB に変換される | downstream に拘束条件として伝播 |
| Negative path       | research summary が存在するが rule DB への変換が行われない            | 変換ステップ未実施として FAIL   |
| Edge / boundary     | research で矛盾する BP/AP が抽出される                                | 優先度判定ルールで解消          |
| Permission / role   | researcher が抽出、orchestrator が変換を実行                          | 責務分離                        |
| State transition    | research 完了 → 変換ステップ → rule DB 登録 → downstream 参照可能     | パイプライン                    |
| Idempotency / retry | 同じ research summary から同じ rule DB が生成される                   | 決定論的変換                    |

### US-D006: 高忠実度テンプレート

| Perspective         | Seed                                                                            | Notes                        |
| ------------------- | ------------------------------------------------------------------------------- | ---------------------------- |
| Happy path          | 一覧画面テンプレートで必須項目（filter, sort, pagination, empty state）が埋まる | 上流品質保証                 |
| Negative path       | generic テンプレートのまま必須項目が欠落                                        | validator で error           |
| Edge / boundary     | フォーム画面で入力項目が 30 超                                                  | 段階的開示テンプレートを適用 |
| Permission / role   | orchestrator がテンプレート選択、user が内容充填                                | テンプレート強制             |
| State transition    | テンプレート選択 → 必須項目充填 → validator 通過 → downstream 参照              | 段階的品質ゲート             |
| Idempotency / retry | 同じ画面種別に同じテンプレートが適用される                                      | テンプレート選択の再現性     |

### US-D007: UI Contract 体験仕様拡張

| Perspective         | Seed                                                                                 | Notes                      |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| Happy path          | UI Contract に purpose / primary_user_task / states / max_primary_steps が定義される | 体験仕様として機能         |
| Negative path       | purpose が空欄のまま UI Contract を作成                                              | 必須フィールド不足で error |
| Edge / boundary     | primary_user_task が複数あり max_primary_steps の定義が困難                          | タスク分割を要求           |
| Permission / role   | discussion owner が体験仕様を定義、reviewer が検証                                   | 責務分離                   |
| State transition    | 要素台帳 → 体験仕様追加 → validator 通過 → downstream 利用                           | 段階的拡張                 |
| Idempotency / retry | 同じ画面定義から同じ体験仕様が生成される                                             | 再現性                     |

### US-D008: taskFidelity 評価

| Perspective         | Seed                                                                             | Notes                           |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| Happy path          | step count <= max_primary_steps かつ CTA visible かつ empty/error state 実装済み | taskFidelity PASS               |
| Negative path       | DOM 要素は揃っているが CTA が below fold で不可視                                | taskFidelity FAIL               |
| Edge / boundary     | mobile で step count が desktop より多い                                         | viewport 別の taskFidelity 評価 |
| Permission / role   | prototyping/implement agent が実装、reviewer が taskFidelity を判定              | 判定責務分離                    |
| State transition    | uiFidelity PASS → taskFidelity 評価 → 総合判定                                   | 二段階ゲート                    |
| Idempotency / retry | 同じ実装に同じ taskFidelity 基準を適用                                           | 安定判定                        |

### US-D009: Warning→Error ゲート昇格

| Perspective         | Seed                                                                   | Notes                             |
| ------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| Happy path          | UI 品質 warning が error に昇格し、低品質 UI がビルドを止める          | 品質強制                          |
| Negative path       | warning のままで低品質 UI が通過してしまう                             | 現状の問題を再現                  |
| Edge / boundary     | 既存プロジェクトで昇格により大量 error 発生                            | migration period 設定で段階的昇格 |
| Permission / role   | validator maintainer が昇格対象を決定、user が config で override 可能 | 制御可能性                        |
| State transition    | warning → config 更新 → error 昇格 → validation 実行 → 不合格時 FAIL   | 昇格フロー                        |
| Idempotency / retry | 同じ config で同じ validation 結果                                     | 再現性                            |

## Work Orders Summary

| Step | Role (sub-agent) | Task title                 | Input (refs)                                | Output (refs)            | Status (PASS/REVISE) |
| ---- | ---------------- | -------------------------- | ------------------------------------------- | ------------------------ | -------------------- |
| 1    | researcher       | Design principle harvest   | `SRC-0001`..`SRC-0008`                      | Story and mock direction | PASS                 |
| 2    | orchestrator     | Story workshop integration | Research memo, repo rules, ChatGPT analysis | `03_Story-Workshop.md`   | PASS                 |
