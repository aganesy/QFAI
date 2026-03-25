# R07: Frontend Reviewer

## Verdict: PASS

## Checklist

- [x] HTML+CSS Mock の自己完結性: Mock は外部依存なし、CSS custom property + fallback 値で直接ブラウザプレビュー可能。SP-02 準拠。
- [x] Design Token の CSS 変数マッピング: `var(--token-name, fallback)` 形式で全 Token が正しくフォールバック値を持つ。ブラウザ互換性を確保。
- [x] レスポンシブ対応の定義: REQ-0006 でレスポンシブバリアント記法を Should として定義。03_Story-Workshop の mock は Desktop 向けだが、枠組みとして十分。
- [x] アクセシビリティ基本要件: NFR-0007 で WCAG 2.2 AA 自動チェックカバー率 80% 以上を目標。CP-01 でアクセシビリティチェック必須化。
- [x] フォーム UX パターン: フォーム mock にバリデーションエラー状態（赤ボーダー + エラーメッセージ）、必須マーカー（赤アスタリスク）が含まれている。
- [x] 状態バリアント定義: REQ-0005 で default/loading/empty/error/disabled の 5 状態。QP-03 で最低 3 状態推奨。mock に empty state の例あり。
- [x] JavaScript 排除ポリシー: SP-01 で `<script>` タグ、イベントハンドラ、`javascript:` URL を禁止。セキュリティ上適切。
- [x] DOM マーカー体系: `data-qfai` 属性による UI Contract との紐付けが定義されている。
- [x] 画面遷移の網羅性: Mermaid stateDiagram で Login/Dashboard/List/Detail/Edit/Create/Settings/PasswordReset の遷移を定義。認証失敗やバリデーションエラーのループも含む。
- [ ] コントラスト比の具体値: Token 定義の色値（例: text #111827 on bg #ffffff）は AA 準拠を満たすが、明示的なコントラスト比チェック値の記載はない。ただし NFR-0007 で自動チェックに委ねる方針のため discussion 段階では許容。

## Findings

### 良好な点

1. **HTML Mock の設計が実装指向**: inline style + CSS custom property + fallback 値の構成は、そのままブラウザで開いて確認できる。prototyping skill が消費する際にも解析しやすい構造。

2. **Design Token 3 層構造**: primitive -> semantic -> component の W3C DTCG 準拠構造は、フロントエンド実装でそのまま CSS custom property 体系に変換可能。

3. **状態バリアント**: empty state の mock が例示されており、フォーム mock ではエラー状態も含まれている。REQ-0005 の 5 状態定義も実装上現実的。

4. **自己完結型制約**: TC-02/SP-02 による外部リソース参照禁止は、CI/CD 環境でのヘッドレス検証やオフライン開発にとって正しい判断。

### 軽微な観察事項

1. **aria 属性の不在**: 03_Story-Workshop の HTML mock に aria-label, role 等のアクセシビリティ属性が含まれていない。discussion 段階の example seed としては許容だが、SDD で mock テンプレートを定義する際には aria 属性のガイドラインを含めるべき。

2. **フォーカス状態の未定義**: 現状の mock は静的な見た目のみで、:focus, :hover 等のインタラクション状態の表現方法が未定義。CSS pseudo-class は inline style では表現できないため、SDD 段階で代替方法（状態別 mock、またはコメントによる注釈）を定義する必要がある。

3. **テーブルの keyboard navigation**: List view mock のテーブル行に `cursor: pointer` があるが、キーボードナビゲーション（tabindex, role="button"）の記述がない。SDD 以降で対応すべき。

## Required Changes (if FAIL)

N/A - PASS verdict.
