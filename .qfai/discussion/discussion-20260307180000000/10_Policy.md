# 10_Policy

## Security Policy

- **パストラバーサル防止**: 設定ファイルのパス解決で root ディレクトリ外への参照を禁止
- **危険 SQL 操作検出**: DB コントラクトに DROP/TRUNCATE 等の危険な SQL 操作が含まれる場合は QFAI-DB-001 エラーを発報
- **双方向テキスト検出**: ソースコード内の Bidi 制御文字を check-bidi.mjs で検出（サプライチェーン攻撃防止）
- **依存関係管理**: npm audit での脆弱性チェック（CI/CD パイプライン内）

## Compliance Policy

- **ライセンス**: MIT ライセンスを遵守。全依存パッケージの互換ライセンスを維持
- **OSS ガバナンス**: GitHub リポジトリでの公開管理。Issue / PR ベースの変更管理
- **CHANGELOG 維持**: 全バージョンの変更内容を CHANGELOG.md に記録（Conventional Commits 準拠）

## Development Policy

- **コード品質**: ESLint + Prettier による統一フォーマット
- **型安全性**: TypeScript strict モード、`pnpm check-types` でゼロエラー
- **テスト**: Vitest でユニット/アセットテスト。`pnpm test` で全パス必須
- **ビルド検証**: `pnpm verify:pack` でパッケージ配布物の完全性検証
- **マークダウン品質**: markdownlint-cli2 による Markdown 形式チェック
- **バージョニング**: セマンティックバージョニング（MAJOR.MINOR.PATCH）
- **破壊的変更**: マイグレーションガイド（`docs/migrations/`）を必ず添付
- **CI ゲート**: `qfai validate --fail-on error` をマージ前ゲートとして推奨

## Operational Policy

- **配布**: npm パッケージとして `npx qfai` で実行可能
- **ランタイム**: Node.js >= 18.0.0 のみ
- **ログ**: `.qfai/report/run-*/` にタイムスタンプ付きランログを保存
- **証跡管理**: `.qfai/evidence/` はローカル成果物（gitignore 推奨）
- **レビュー**: review-pack は append-only。修正時は新規 review-pack を作成
- **ドリフト検出**: スキルファイルにドリフトプロトコルマーカー必須（QFAI-SKILLS-010）
