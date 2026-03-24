# 04 Business Rules

9 items.

## BR-0021-0001: 下流読取順序

下流スキル（`/qfai-prototyping`、`/qfai-implement` 等）は、UI-bearing artifact の入力を以下の順序で読み取らなければならない：

1. Design Direction Pack（DDP）
2. Design Token
3. UI Contract
4. HTML Mock
5. Flow/Navigation

この順序により、設計意図が最上位入力として確実に反映される。

- AC Refs: AC-0021-0004, AC-0021-0005

## BR-0021-0002: デスクトップ批評必須

クリティークループにおいて、デスクトップビューポート（≥1024px）での批評は必須である。省略した場合、クリティークは未完了として扱う。

- AC Refs: AC-0021-0001, AC-0021-0008

## BR-0021-0003: モバイル批評必須

クリティークループにおいて、モバイルビューポート（≤480px）での批評は必須である。省略した場合、クリティークは未完了として扱う。

- AC Refs: AC-0021-0002, AC-0021-0008

## BR-0021-0004: コードオンリーレビュー禁止

レンダリングされた UI を伴わないコードオンリーレビューは禁止する。レビュー提出時にはレンダリング結果（スクリーンショットまたは rendered HTML）の添付が必須である。

- AC Refs: AC-0021-0003

## BR-0021-0005: 批評エビデンス記録

各クリティークループの結果は以下の項目を含むエビデンスとして記録しなければならない：

- 批評日時
- 対象ビューポート（desktop / mobile）
- 判定結果（PASS / REVISE）
- 指摘事項リスト
- 対象 artifact の参照

- AC Refs: AC-0021-0006, AC-0021-0007

## BR-0021-0006: DDP 未定義時の停止

DDP（Design Direction Pack）が未定義の場合、下流スキルは処理を開始してはならない。DDP の定義を先行させなければならない。

- AC Refs: AC-0021-0005

## BR-0021-0007: 反復改善の完了条件

クリティークループは、デスクトップ・モバイル両ビューポートの全指摘事項が PASS になるまで完了としない。部分的な PASS（片方のビューポートのみ）では完了としない。

- AC Refs: AC-0021-0001, AC-0021-0002, AC-0021-0008

## BR-0021-0008: taskFidelity 評価の必須実施

クリティークループにおいて、以下の taskFidelity 評価項目を必ず実施しなければならない：

1. primary task の step count 計測（max_primary_steps との比較）
2. primary CTA の可視性確認（画面上で視認可能かどうか）
3. empty state・loading state・error state・success state の 4 状態実装確認
4. error recovery path の存在確認
5. 破壊的操作に対する confirmation の実装確認
6. primary flow の click count 計測

- AC Refs: AC-0021-0009, AC-0021-0010

## BR-0021-0009: taskFidelity 未達時の REVISE 義務

以下のいずれかを満たさない場合、クリティークは REVISE を返さなければならない：

- primary task step count > max_primary_steps
- primary CTA が視認不能（画面外または視覚的に埋没）
- 4 状態（empty / loading / error / success）の少なくとも 1 つが未実装

REVISE 判定時は該当の taskFidelity 未達項目を指摘事項として記録し、エビデンスに含める。

- AC Refs: AC-0021-0009, AC-0021-0010
