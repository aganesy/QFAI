# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 workflow 所有権コントラクト

# AC-0002-0007-01
# Parent: US-0002-0007
Scenario: 配布 workflow 所有権コントラクト
  Given adopter の workflows ディレクトリに (a) QFAI が配布する名前と衝突する adopter 作成ファイル、(b) 記録上 QFAI が install した後 adopter が削除したファイル、(c) 手編集された install 済みファイル が存在する fixture
  When `.qfai/contracts/cli/shipped-workflows.md` (`CLI-WFSET`) が定める所有権境界に対して write / prune set 解決経路と provenance reader を検査し、`qfai init` を当該 fixture に対して実行する
  Then `qfai-` prefix は reservation notice として扱われ selector としては使われていない: write set は in-binary `SHIPPED_WORKFLOW_NAMES`、prune set は in-binary `RETIRED_WORKFLOW_NAMES` と等しく、adopter のディスク上の `qfai-*` glob には由来しない。provenance は `.qfai/install-provenance.json`（tracked、`schemaVersion` なし、QFAI が書いた bytes の sha256）から読まれ、あらゆる overwrite / prune の前に参照される。reader は不在 / `workflows` キー不在 / 不正 JSON を empty として扱い throw しない。file state は `absent` / `adopter-owned` / `installed` / `modified` / `declined` の closed 5-state enum に決まり、(a) は byte 単位で無変更のまま `adopter-owned`、(b) は `declined`、(c) は上書きされず `modified` になる。prune は 5 状態すべてで発生しない。write / removal は `copyTemplateTree` / `copyTemplatePaths` / `pruneMatchingEntries` のみを経由し、当該経路に自前の `copyFile` / `writeFile` / `rm` / `unlink` 呼び出しは存在せず、`pruneMatchingEntries` は export されている（module-private のままだと再実装が唯一の代替になる）

# AC-0002-0007-02
# Parent: US-0002-0007
Scenario: declined name の copy 前除外
  Given provenance 記録上 QFAI が install した後 adopter が削除した配布名が 1 件あり、そのファイルはディスク上に存在しない fixture
  When `qfai init` を実行し、copy set の構築経路を観測する
  Then 当該名は copy が実行される**前に** copy set から除外されており、init 後もディスク上に存在しない。create-only 判定だけに依存していない — declined ファイルは absent なので create-only は「新規作成」として書いてしまうため、create-only であることだけを assert するテストは init が復活させても green になる。したがって除外は create-only とは独立に観測できる（copy set の内容そのもの、または copy primitive に渡された名前集合として）
```
