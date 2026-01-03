# Traceability

参照は下流→上流のみを許可する（下流参照禁止の対象はテスト/実装）。

- Spec は QFAI-CONTRACT-REF で契約IDを宣言する（none可、宣言行は必須）
- Scenario は @SPEC-xxxx / @SC-xxxx / @BR-xxxx を持つ（契約ID参照は任意）
- テスト/コードは QFAI:SC-xxxx で SC を参照する
- Spec はテスト/実装（src/tests）を参照しない

## CIで検出する範囲

- BR→SC のトレーサビリティ
- Spec→Contract の参照（QFAI-CONTRACT-REF/ID形式）
- SC→Test の参照（QFAI:SC-xxxx/ID形式）
- 参照IDの形式などの整合

## CIで検出しないため運用で担保する範囲

- Spec→下流参照禁止（Spec がテスト/実装を参照しないこと）
