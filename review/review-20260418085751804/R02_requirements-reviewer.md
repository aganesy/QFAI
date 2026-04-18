# R02 Requirements Review

- Discussion: `discussion-20260417195912880`
- Review pack: `review-20260418085751804`
- Reviewer: `requirements-reviewer`
- Date: `2026-04-18`
- Scope: `REQ-0088`, `REQ-0064/0065/0066`, `REQ-0040/0041`

## Verdict

**FAIL**

前回 FAIL 指摘のうち **REQ-0065 / REQ-0040 / REQ-0041 は解消済み**です。  
ただし **REQ-0066 の契約リンクは未だ整合しておらず**、加えて **REQ-0040 の API 契約が要件に追随していません**。

## 前回 FAIL 指摘の確認

| # | 前回指摘 | 判定 | 根拠 |
|---|---|---|---|
| 1 | REQ-0065 の RBAC 不整合（Story Workshop に admin 欠落） | **RESOLVED** | `03_Story-Workshop.md:112` は `admin/manager/coordinator` を明記し、`06_REQ.md:93` と整合。 |
| 2 | REQ-0066 の UI contract 参照欠落 | **NOT FULLY RESOLVED** | `06_REQ.md:166` に参照は追加されたが `CON-UI-0006` を指しており、契約索引は依然 `CON-UI-0016` を「シフト一括入力」として保持している（`.qfai/specs/_policies/05_Contracts.md:91`, `.qfai/contracts/ui/ui-0016-shift-bulk.yaml:1-11`）。 |
| 3 | REQ-0040 の TC セクション欠落 | **RESOLVED** | `06_REQ.md:184-194` に TC が追加済み。 |
| 4 | REQ-0041 の RBAC TC 欠落 | **RESOLVED** | `06_REQ.md:212-220` に RBAC を含む TC が追加済み。 |

## Findings

### F-001 【FAIL】REQ-0066 の UI/API contract linkage がまだ不整合

- `05_Scope.md:27` と `06_REQ.md:166` は REQ-0066 を `CON-UI-0006` の既存拡張として扱っています。
- しかし契約索引は `CON-UI-0016` を専用の「シフト一括入力」契約として保持しており（`.qfai/specs/_policies/05_Contracts.md:91`）、実体ファイルも `ui-0016-shift-bulk.yaml:1-33` に存在します。
- さらに API 側では `CON-API-0011` の `/api/shifts/assignments` が単票アサイン作成しか定義しておらず、REQ-0066 AC#4-5 の「複数日一括割当」「重複スキップ」の正式契約がありません（`.qfai/contracts/api/api-0011-shift.yaml:245-261`）。

**影響**: 実装者が REQ-0066 の正しい UI SSOT と API SSOT を一意に判断できません。前回の「参照欠落」は解消されたものの、**誤った/競合した参照状態**のため未クローズです。

**必要修正**:
1. REQ-0066 の UI SSOT を `CON-UI-0006` か `CON-UI-0016` のどちらかに統一する。  
2. REQ-0066 の一括割当 API（複数日、部分成功、重複スキップ）を明示契約化する。  

### F-002 【FAIL】REQ-0040 → CON-API-0016 のリンク先が要件を表現できていない

- `06_REQ.md:179-194` と `uiux/40_screen_contracts.md:202-232` は、本日の勤務画面で **連絡先電話番号・緊急連絡先** を表示し、非管理者には見せないことを要求しています。
- `10_Policy.md:58-61` でも、非管理者への API レスポンスには本人情報フィールドを含めないと明記されています。
- しかし `CON-API-0016` の `/api/operations/today` と `TodayWork` スキーマには、`staff_id / staff_name / role / status` しかなく、電話番号・緊急連絡先・権限制御の契約表現がありません（`.qfai/contracts/api/api-0016-operations.yaml:46-66`, `.qfai/contracts/api/api-0016-operations.yaml:115-126`）。

**影響**: REQ-0040 は `CON-API-0016` にリンクされたものの、API 契約からは AC#1 / AC#4 と `POL-SHIFT-0005` を実装・検証できません。

**必要修正**:
1. `CON-API-0016` に管理者向け本人情報フィールド（電話番号・緊急連絡先）を追加する。  
2. 非管理者時の 403 またはフィールド抑止ルールを API 契約へ明示する。  

## Pass 確認

- **REQ-0065**: Story / REQ / Policy 間の RBAC は整合しました。  
- **REQ-0064**: 確認ダイアログ、BR/TC、`CON-UI-0027` ⇄ `CON-API-0029` のリンクは整合しています。  
- **REQ-0041**: TC と RBAC カバレッジは補完され、今回の確認範囲では追加の requirements-level blocker はありません。  
- **REQ-0088**: Story / REQ / Policy / UI の AC・RBAC 整合に問題はありません。  

## Conclusion

**FAIL**  
前回 FAIL の **#1 / #3 / #4 は解消済み**ですが、**#2 は未だ fully resolved ではなく**、加えて **REQ-0040 の API 契約不足**が残っています。
