# 14_Review-Request

## Review Scope

| Key         | Value                                            |
| ----------- | ------------------------------------------------ |
| Target      | `.qfai/discussion/discussion-20260307180000000/` |
| Layer       | discussion                                       |
| Review Pack | `.qfai/review/review-20260307180000000/`         |

## Target Files

1. `01_Context.md`
2. `02_Inception-Deck.md`
3. `03_Story-Workshop.md`
4. `04_Sources.md`
5. `05_Scope.md`
6. `06_REQ.md`
7. `07_NFR.md`
8. `08_Glossary.md`
9. `09_Constraints.md`
10. `10_Policy.md`
11. `11_OQ-Register.md`
12. `12_OQ-Resolution-Log.md`
13. `13_Deferred.md`
14. `14_Review-Request.md`
15. `99_delta.md`

## Review Focus

- [ ] ソースの正確性: REQ/NFR がソースコード実装と整合しているか
- [ ] 一貫性: 用語・ID・参照が全ファイルで一貫しているか
- [ ] テスト可能性: REQ/NFR が検証可能な形で記述されているか
- [ ] リスク: 見落としたリスクや制約がないか
- [ ] 図の品質: Mermaid 図が正しい構文で記述されているか
- [ ] 画面モック: CLIツールのため対象外（ただし report 出力例を確認）
- [ ] OQ Register: Disposition=open がゼロであるか
- [ ] Deferred: 全 deferred 項目に必須メタデータが揃っているか

## Required Reviewers

Roster は `.qfai/assistant/steering/review-roster.yml` を参照。

## RCP Rules

- Review Completion Process は `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` に従う
- 各レビューは PASS / FAIL / N/A を返す
- N/A は na_rule の条件を満たす理由が必須
- FAIL が1つでも出たら即修正へ戻る
- 修正後は review cycle を新規作成し roster を先頭から再実行
