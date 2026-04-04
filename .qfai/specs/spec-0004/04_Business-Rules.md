# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                    | Rule                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0004-0001 | バリデータ順次実行                 | AC-0004-0001               | validate は登録された全バリデータ（33+）を順次実行し、各バリデータの Issue[] を統合する                                                                                                                                                                                   |
| BR-0004-0002 | デフォルトフェーズ full            | AC-0004-0002               | --phase 未指定時はデフォルト full として全バリデータを実行する                                                                                                                                                                                                            |
| BR-0004-0003 | failOn 解決順序                    | AC-0004-0003, AC-0004-0004 | CLI --fail-on > --strict(=warning) > config validation.failOn の順で解決する                                                                                                                                                                                              |
| BR-0004-0004 | GitHub 出力上限100件               | AC-0004-0005               | --format github は重複排除後に最大100件のアノテーションを出力し、超過分は summary に件数表示する                                                                                                                                                                          |
| BR-0004-0005 | validate.json 必須出力             | AC-0004-0006               | validate.json は --format に関わらず常に出力する。出力パスは config.output.validateJsonPath で決定する                                                                                                                                                                    |
| BR-0004-0006 | ランログ自動生成                   | AC-0004-0007               | バリデーション完了後、.qfai/report/run-\*/ にランログを自動保存する                                                                                                                                                                                                       |
| BR-0004-0007 | ウェイバー suppress/downgrade      | AC-0004-0008               | waivers.yml に基づき suppress（suppressed=true）または downgrade（severity 低下）を適用する                                                                                                                                                                               |
| BR-0004-0008 | 必須ファイルセット                 | AC-0004-0009               | 各 spec-XXXX/ は 01_Spec..09_delta の必須ファイルを含む必要がある                                                                                                                                                                                                         |
| BR-0004-0009 | ID 形式規約                        | AC-0004-0010               | ID は `XX-XXXX-YYYY` 形式（XX=CAP/US/AC/BR/EX/TC、XXXX=spec番号、YYYY=連番）に準拠する必要がある                                                                                                                                                                          |
| BR-0004-0010 | トレーサビリティ最小エッジ         | AC-0004-0011               | AC->TC, BR->EX, EX->TC のエッジが全て存在する必要がある                                                                                                                                                                                                                   |
| BR-0004-0011 | GitHub annotation escape           | AC-0004-0005               | GitHub annotation の value は `%`, `\r`, `\n` をエスケープする                                                                                                                                                                                                            |
| BR-0004-0012 | phase guard refinement ブロック    | AC-0004-0015               | `buildCiRefinementIssue()` が refinement phase で blocking issue を生成し、バリデーションをスキップする                                                                                                                                                                   |
| BR-0004-0013 | 3-layer テンプレートファイル名期待 | AC-0004-0016, AC-0004-0017 | UIX バリデータは新 3-layer テンプレートファミリー（11_design_taste_interview.md, 20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md）のみを検証対象とする |
| BR-0004-0014 | 存在しないファイル期待の禁止       | AC-0004-0017, AC-0004-0019 | バリデータは実際に生成されるファイルのみを期待し、存在しないファイルに対してエラーを発生させてはならない。Non-UI パックでは UIX バリデータをスキップする                                                                                                                  |
| BR-0004-0015 | Evidence state の truthful 性      | AC-0004-0020, AC-0004-0021 | render-evidence および Browser QA バリデータは captured \| skipped \| failed のいずれかの truthful state のみ返却し、プレースホルダーや fake-complete 状態を使用しない                                                                                                    |
| BR-0004-0016 | canonical aggregator 義務          | AC-0004-0016               | `runAllUixValidators()` は canonical aggregator として動作し、レガシー 4-axis 集約パスを経由しない。validate.ts は直接 canonical パスにルーティングする                                                                                                                   |
| BR-0004-0017 | 旧 4-axis ファイル検出 error       | AC-0004-0018               | 旧 4-axis テンプレートファイル（20_eval_axis_usability 等）が検出された場合、UIX-VAL-3LAYER-FORBIDDEN-FILE error を発行し削除と新 3-layer ファイルへの移行を促す。D-004 に基づき旧テンプレートのバリデーションは行わない                                                  |

## BR-0004-0018: Canonical Production Path

- AC-Refs: AC-0004-0022

- validate.ts pipeline は runCanonicalUixValidators() のみを UIX entrypoint として登録する
- validateDdpFields は production path から削除され、legacy/ddpCompatibility.ts に移動
- legacy validators は migration tooling（`legacy/` namespace）でのみ利用可能

## BR-0004-0019: IssueCategory Discrimination

- AC-Refs: AC-0004-0023

- IssueCategory type: "canonical" | "compatibility" | "change"
- 全新規 canonical validator は category: "canonical" を emit
- legacy/compatibility validator は category: "compatibility" を emit

## BR-0004-0020: prototypingRecommendation Validator

- AC-Refs: AC-0004-0024

- prototyping.yaml の schema validation を validate pipeline に登録
- 必須フィールド: recommended_mode, rationale, allowed_modes, surface
- allowed_modes に recommended_mode が含まれない場合は QFAI-PROT-154
- deprecated top-level schema は QFAI-PROT-231 (warning)
- namespaced vs top-level conflict は QFAI-PROT-232 (warning)
