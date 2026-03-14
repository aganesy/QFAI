# 14_Review-Request

## レビュー依頼

### 対象パック

- Path: `.qfai/discussion/discussion-20260315033313220/`
- ファイル数: 15（01_Context ～ 14_Review-Request, 99_delta）

### ロースター

- SSOT: `.qfai/assistant/steering/review-roster.yml`
- レビュアー数: 10（現行ロースター）
- 実行ルール: `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`

### プリフライトチェック

- [ ] 全15ファイルが存在する
- [ ] `11_OQ-Register.md` の `Disposition: open` が 0 件
- [ ] `13_Deferred.md` のdeferred項目が全カラム記載済み
- [ ] `02_Inception-Deck.md` に Mermaid 図が含まれる
- [ ] `03_Story-Workshop.md` に Mermaid 図が含まれる
- [ ] `03_Story-Workshop.md` に Example Seeds セクションが含まれる

### バリデーション

- `qfai validate --fail-on error --format github` を実行すること
- 結果を `.qfai/report/validate.log` に保存すること

### レビュー出力先

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_qa-lead.md` ～ `R10_runtime-gatekeeper.md`
- `.qfai/review/review-<timestamp>/summary.json`
