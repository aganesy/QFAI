# 02 User Stories

4 items.

## US-0021-0001: デスクトップ/モバイル両批評

- As a: AI エージェント開発者
- I want: プロトタイプのレンダリング結果をデスクトップ/モバイル両方で批評したい
- So that: 片方だけの評価では見逃しが発生するため、両ビューポートでの品質を保証できる
- Parent: CAP-0021
- Source: REQ-0008

## US-0021-0002: 下流読取順序の遵守

- As a: AI エージェント開発者
- I want: DDP→token→contract→mock→flow の順序で下流入力を読み取りたい
- So that: 設計意図が正しく伝達され、上流の direction が実装に反映される
- Parent: CAP-0021
- Source: REQ-0007

## US-0021-0003: 批評エビデンス記録

- As a: QA エンジニア
- I want: 批評結果がエビデンスとして記録されていることを確認したい
- So that: レビューの再現性を保証し、過去の判断を追跡できる
- Parent: CAP-0021
- Source: NFR-0007

## US-0021-0004: taskFidelity 評価のクリティークループ統合

- As a: AI エージェント開発者
- I want: クリティークループにおいて taskFidelity を評価したい（step count・CTA 可視性・状態実装を含む）
- So that: UI の美的品質だけでなく、primary task の完了効率と操作品質を保証できる
- Parent: CAP-0021
- Source: REQ-0016, NFR-0009
