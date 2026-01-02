# Traceability

参照は下流→上流のみを許可する（下流参照禁止の対象はテスト/実装）。

- Spec は QFAI-CONTRACT-REF で契約IDを宣言する（none可、宣言行は必須）
- Scenario は @SPEC-xxxx / @SC-xxxx / @BR-xxxx を持つ（契約ID参照は任意）
- テスト/コードは QFAI:SC-xxxx で SC を参照する
- Spec はテスト/実装（src/tests）を参照しない

違反は CI で検出される前提で運用する。
