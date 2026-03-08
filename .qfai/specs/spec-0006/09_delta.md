# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0006 初回作成
- Tags: prototyping, ui-fidelity, dom-crawling, jsdom
- Summary: qfai prototyping コマンドのスペック一式を新規作成

## Rationale

- UI コントラクトとプロトタイプ実装の整合性を自動検証する機能が必要
- フロントエンドの UI フィデリティ証跡を CI/CD パイプラインで継続的に検証可能にする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）
3. jsdom による DOM クローリング方式
4. Puppeteer/Playwright 等のブラウザ自動化ツール

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: 各 spec が独立したディレクトリとして管理され、prototyping 固有の UI コントラクト連携を明確にスコープ化できる
- Evidence: specs/\_policies/ + specs/spec-0006/ ディレクトリ構造

---

- Adopted: jsdom による DOM クローリング方式
- Why: Node.js ネイティブで動作し、ブラウザバイナリのインストールが不要。CI 環境での依存最小化とパフォーマンス確保が可能
- Evidence: REQ-0050 で jsdom 使用が明示的に要件定義されている

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: UI コントラクト連携やエビデンス出力の複雑な構造が単一ファイル内で管理困難になる
- DO NOT: spec-pack 形式に戻さないこと。prototyping の成果物を単一バンドルファイルにまとめてはならない
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれ、UI コントラクトとの連携定義が埋没する

---

- Candidate: Puppeteer/Playwright 等のブラウザ自動化ツール
- Reason: ブラウザバイナリ（Chromium 等）のダウンロードが必要で、CI 環境での依存サイズが数百 MB 増大する。起動時間もかかりパフォーマンスが低下する
- DO NOT: ブラウザ自動化ツールへの依存を導入しないこと。Puppeteer, Playwright, Selenium 等を dependencies/devDependencies に追加してはならない
- Temptation: 実ブラウザの方が SPA/CSR コンテンツの解析精度が高く正確だが、CI 環境での依存増大（Chromium ~400MB）とパフォーマンス低下（ブラウザ起動 2-5 秒）が課題。初期スコープは SSR/静的 HTML に限定することで jsdom で十分対応可能

## Impact

- Affects: `.qfai/specs/spec-0006/` 配下の全ファイル、`package.json`（jsdom 依存追加）
- Validation: 全テストケース（TC-0006-0001..TC-0006-0008）が pass すること

## Follow-ups

- Phase 5 実装開始
- Owner: Implementer
- Due: TBD
