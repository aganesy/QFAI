# Acceptance Criteria

## Criteria

```gherkin
Feature: layer 分離された credential-free 配布 workflow set

# AC-0002-0003-01
# Parent: US-0002-0003
Scenario: 配布 set の命名と topology
  Given 配布 `.github/` ツリー
  When 直下の entry と workflows ディレクトリの各 entry、および各配布ファイルの相互参照を検査する
  Then `.github/` の直下 child は `workflows` のみであり（`actions/` を planted すると pack 検証が throw する）、workflows 配下の全 entry が `^qfai-[a-z0-9-]+\.yml$` に一致し、set は 2 つ以上のファイルから成り、どの配布ファイルも他の配布ファイルを参照せず、layer 分離は orchestrator ファイル内の job / matrix leg として表現されている。この命名パターンは reservation notice（衝突を adopter が文書から予見できるようにするもの）であり、write / removal の selector としては使われない

# AC-0002-0003-02
# Parent: US-0002-0003
Scenario: 配布 set の inertness と無 secret
  Given optional な layer 名テストスクリプトを 1 つも宣言していない新規 adopter プロジェクト
  When `qfai init` を temp ディレクトリに実行し、配布された workflow set を静的に評価する
  Then no test lane executes: each is declared, and each skips on the false condition of an absent script. Exactly three shipped jobs declare a dependency install — the document-check job, the test lane and the validation job. Every other job installs nothing: change detection, the document scope and each file's aggregate. Counted as job instances after matrix expansion, with the test lane at its bound of five layer legs, the installs run nine times on a pull request and eight times on a push. Across the whole set there is no secret declaration, no secret-context reference and no `secrets: inherit`

# AC-0002-0003-03
# Parent: US-0002-0003
Scenario: Independent shipped checks and a complete aggregate verdict
  Given the workflow set `qfai init` delivers into a fresh adopter project
  When the delivered document and validation workflows are evaluated statically for a pull request and for a push, and each aggregate job's body is evaluated against every result its dependency can conclude with
  Then the independent checks of each file are declared as matrix legs of one job carrying `fail-fast: false`, so a failing leg cancels no other leg. Each checker command and each validation profile is unchanged and appears in exactly one leg, and the drift profile is selected on pull requests only. Each file's existing external check name belongs to a job that runs whatever its dependency concluded and succeeds only when that dependency's rolled-up result is `success`; a failed, cancelled, skipped or missing result fails it
```
