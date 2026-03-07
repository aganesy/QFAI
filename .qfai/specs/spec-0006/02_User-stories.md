# 02 User Stories

## US Catalog

- US-0006-0001: UI フィデリティ自動生成 - --autogen-ui-fidelity で DOM クローリングによるフィデリティ証跡生成
- US-0006-0002: UI コントラクト期待値抽出 - .qfai/contracts/ui/ YAML からラベル・エレメント抽出
- US-0006-0003: エレメントマーカー検出 - data-qfai 属性による DOM マーカー検出
- US-0006-0004: フィデリティ証跡出力 - .qfai/evidence/prototyping.json への出力
- US-0006-0005: skeleton モード - uiFidelity.screens=[] で L1 evidence 記録

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
