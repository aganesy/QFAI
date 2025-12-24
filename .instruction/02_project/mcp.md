---
category: project
update-frequency: frequent
dependencies:
  - 02_project/spec-driven-development.md
  - 02_project/development.md
  - 03_ai-agents/codex/best-practices.md
  - 03_ai-agents/copilot/best-practices.md
version: 1.0.0
---

> **言語指示（厳守）**
>
> - 報告・出力: 日本語（Plan も含む）

# MCP（Model Context Protocol）運用ガイド

本プロジェクトで利用する MCP（Model Context Protocol）サーバーの一覧と、コーディングエージェント/サブエージェントが迷わず活用するための「使いどころ」「呼び出し例」「注意点」をまとめる。

> ここでいう「導入済み」は、**導入手順（`.github/prompts/install-*.prompt.md`）が整備されている**ことを指す。  
> 実際のインストール状態は各環境（Copilot / Codex）で `list/get` で確認すること。

---

## 0. 最重要（最初に確認）

### VS Code（Copilot MCP）

- MCP 自動起動を有効化（推奨）: `.vscode/settings.json` に `"chat.mcp.autostart": "always"`
  - 詳細は各 `install-*.prompt.md` の冒頭を参照。
- サーバ確認: コマンドパレットで `MCP: List Servers`（必要なら `Start/Restart`）
- ツールが出ない: `MCP: Reset Cached Tools` → `Restart` → `Developer: Reload Window`

### Codex CLI

```powershell
codex mcp list
codex mcp get <server-name>
```

> `codex mcp add/remove` は **ユーザー環境のグローバル設定**を変更する（リポジトリには基本的に影響しない）。

### 重要な運用注意

- `.vscode/*` は `gitignore` されているため、`.vscode/mcp.json` は基本的にコミットされない（勝手に `.gitignore` を変更しない）。
- MCP サーバはローカルで任意コードを実行できる。**信頼できる配布元のみ**使う。
- 顧客情報/秘密情報を MCP 入力に含めない（特に Context7 / Chrome DevTools / OCR 周り）。

---

## 1. MCP サーバ一覧（本プロジェクト）

### `serena`（セマンティック検索/安全編集）

- 目的: LSP ベースのシンボル検索・参照追跡・安全な編集で、調査精度と改修安全性を上げる。
- 代表ツール:
  - `activate_project`, `check_onboarding_performed`, `onboarding`
  - `find_symbol`, `find_referencing_symbols`, `search_for_pattern`
  - `replace_symbol_body`, `rename_symbol`, `insert_before_symbol`, `insert_after_symbol`
- 典型ユースケース:
  - 既存パターン探索（「同じことをしている箇所」を確実に見つける）
  - 影響範囲調査（参照元列挙）
  - リネームや関数差し替え等の安全な変更
- 導入/確認: `.github/prompts/install-serena.prompt.md`

### `context7`（公式ドキュメント参照）

- 目的: ライブラリの最新ドキュメントを根拠にして、推測実装/幻覚を避ける。
- 代表ツール:
  - `resolve-library-id`（ライブラリID解決）
  - `get-library-docs`（トピック指定で取得）
- 典型ユースケース:
  - `urql`, `gql.tada`, `react-hook-form`, `zod`, `playwright` 等の API/ベストプラクティス確認
- 注意:
  - 外部サービスを利用するため、**社内コード/顧客情報/秘密情報を入力しない**
- 導入/確認: `.github/prompts/install-context7.prompt.md`

### `markitdown`（PDF/Office → Markdown 変換）

- 目的: 要件資料（PDF 等）を Markdown に変換して、仕様化のインプットを作る。
- 代表ツール: `convert_to_markdown(uri)`
- 典型ユースケース:
  - テキスト PDF の要件抽出（`.professional/require` の入力準備）
- 注意:
  - スキャン PDF（画像 PDF）は文字抽出が弱いことがある → `vibe-pdf-read` + `ocr` へ切替
- 導入/確認: `.github/prompts/install-markitdown-mcp.prompt.md`

### `vibe-pdf-read`（PDF → PNG 画像化）

- 目的: PDF をページ画像に変換し、LLM が「画像として」読める状態にする（スキャン PDF 対応の要）。
- 代表ツール:
  - `get_pdf_page_count(pdfPath)`
  - `convert_pdf_to_images(pdfPath, page?, density?, quality?)`
- 典型ユースケース:
  - スキャン PDF をページ指定で画像化 → `ocr` で文字起こし
- 注意:
  - 画像は重いので最初は `page=1` で 1 ページだけ試す
  - Windows は ImageMagick/Ghostscript/PATH 等で躓きやすい（導入プロンプトの切り分け手順に従う）
- 導入/確認: `.github/prompts/install-vibe-pdf-read-mcp.prompt.md`

### `ocr`（画像 → OCR）

- 目的: 画像から文字を抽出する（PDF 直ではなく、画像入力）。
- 代表ツール:
  - `get_supported_languages()`
  - `perform_ocr(input_data, language?, config?)`
- 典型ユースケース:
  - `vibe-pdf-read` で PDF→画像 → `ocr` で文字起こし → 仕様化
- 推奨言語:
  - `jpn+eng`（日本語ベース + 英数字/システム名補完）
- 導入/確認: `.github/prompts/install-mcp-ocr.prompt.md`

### `chrome-devtools`（ブラウザ実行時情報）

- 目的: UI の実挙動の確認（スクショ/Console/Network/Performance 等）。
- 典型ユースケース:
  - 画面崩れやエラーの再現、パフォーマンスの初期切り分け
- 注意:
  - 機密ページを扱わない（ブラウザ内容にアクセスできる）
- 導入/確認: `.github/prompts/install-chrome-devtools-mcp.prompt.md`

---

## 2. “まずこれ” レシピ

### レシピA: 要件 PDF → 仕様書/チケット（SDD）

1. PDF がテキスト抽出できるなら:
   - `markitdown.convert_to_markdown(uri)` で Markdown 化
2. スキャン PDF なら:
   - `vibe-pdf-read.get_pdf_page_count(pdfPath)` → `convert_pdf_to_images(..., page=1)`（まず1ページ）
   - `ocr.perform_ocr(input_data, language="jpn+eng")`
3. 抽出結果を `.professional/require/` に配置（必要なら整理して md 化）
4. 仕様書/チケット生成:
   - `/requirements-to-tickets`

> 注意: 取り消し線が要件ソースに含まれていた場合は運用ルール違反として停止（プロンプト準拠）。

### レシピB: コード調査は Serena を起点にする

- “grep の前に”:
  - `find_symbol`（定義の特定）
  - `find_referencing_symbols`（影響範囲）
  - `search_for_pattern`（非コード/設定含む広域検索）

### レシピC: ライブラリ API が怪しいときは Context7

- 例: 「urql の auth exchange の推奨実装が分からない」  
  → `resolve-library-id("urql")` → `get-library-docs(..., topic="exchange-auth")`

---

## 3. トラブルシュート（最短手順）

- VS Code でツールが出ない:
  - `MCP: Reset Cached Tools` → `Restart` → `Developer: Reload Window` → `Show Output`
- Windows で PATH が効かない（ImageMagick / tesseract 等）:
  - 各 `install-*.prompt.md` の `env.PATH` 明示設定を適用し、VS Code を再起動
- Codex でサーバが見えない:
  - `codex mcp list` / `codex mcp get <name>` を確認（設定不整合なら `remove` → `add`）
