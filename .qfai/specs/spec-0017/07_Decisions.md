# 07 Decisions

## D-0017-0001: 4 軸固定 (Design Quality / Originality / Craft / Functionality)

評価軸を per-project に変えない。全プロジェクトで 4 軸固定。理由: per-project 軸の研究は LLM judge を中央寄りに誘導し、breakthrough を抑制する（central tendency bias）。Anthropic 美術館事例と同じ 4 軸構成。

却下案: v1.x の 6 軸 (DQ/Origin/Craft/Func + accessibility-risk + implementation-plausibility) に trend-derived axes を加える方式。conformity 軸が増えるほど breakthrough は抑制される。

## D-0017-0002: Ordinal scale 4 段階 (weak / acceptable / strong / exceptional)

採点を 0..100 数値ではなく 4 段階 ordinal で行う。理由: LLM judge は 1..100 範囲で central tendency に陥り 100/100 完了条件は事実上到達不能。4 段階は behavioral anchor が付けやすく inflation を構造的に抑制。

## D-0017-0003: 最大反復数 15 を code constants で固定

`MAX_ITERATIONS = 15` を `packages/qfai/src/core/prototyping/iteration.ts` で定義。config 可変にしない。理由: mode 概念ごと削除する方針なので「短くする」選択肢を作らない。Anthropic 記事の「5–15 iterations」上限値に合わせる。

## D-0017-0004: best-of-history 廃止、最新 iter 常に accepted

`acceptedIterationIndex === iterations.length - 1` を不変条件にする。一時退行を許す。理由: leap regression（pivot 直後の craft 一時低下など）は creative breakthrough の正規パスであり、これを罰すると AI は pivot を選ばなくなる。

## D-0017-0005: anti-slop で originality に上限 cap

`slopPatternsDetected.length > 0` のとき `originality ≤ acceptable` を強制。理由: AI default パターン（shadcn / dashboard / hero+CTA 等）が exceptional に到達できると collective diversity が失われる。global pattern list を `reviewer-prompt.md` に常駐させ PR で更新する。

却下案: per-project anti-slop curation を `/qfai-discussion` で行い `/qfai-sdd` で `anti-slop.yaml` contract に正規化する。ワークフローが複雑化し、AI default は global なので per-project 化のメリットが薄い。

## D-0017-0006: design-system は出力契約

`design-system.yaml` を prototyping の **入力**（採点軸）から **出力**（handoff artifact）に格下げ。final iter HTML から deterministic に抽出。理由: 入力扱いだと「事前定義された design system に compliance する」スコア圧力が発生し、creative leap を抑制する。

## D-0017-0007: concept anchor 事前宣言廃止

`concept.json` の `designThesis / noveltyBet / anchors / nonGoals / pivotFromPrior` を全廃。理由: Dutch museum 事例の iter-10 の「3D 空間体験」は事前宣言できない。concept-fit を pre-gate にすると pivot が contract violation 扱いになる。

## D-0017-0008: 完了は決定論 CLI exit code

`qfai prototyping iterate --cycle <n>` の exit code (0/64/65/2) で完了判定。LLM 主観 DONE 禁止。理由: 100/100 ゲートは LLM judge の central tendency で到達不能、結果として AI が早期離脱する症状が観測されていた。決定論ゲートで物理的に防止。

## D-0017-0009: Generator と Evaluator は別 sub-agent

`product-experience-architect` (generator) と `product-surface-reviewer` (evaluator) を別 sub-agent として delegation する。理由: LLM-as-judge の self-preference bias を排除（同一 LLM が自分の出力を有利に評価する傾向）。

## D-0017-0010: per-iter evidence は 2 種のみ

`<screen>.png` と `<screen>.html` のみ。a11y snapshot / command log の per-screen 必須を廃止。理由: iter コストを下げて scrap & redo を気軽に許す。a11y は実装段階で `/qfai-verify` ゲートで拾う。

## D-0017-0011: cross-skill 改修は削除のみ、新規追加ゼロ

`/qfai-discussion` と `/qfai-sdd` の改修は **削除のみ**。anti-slop は global なので新 sidecar / 新 contract は作らない。理由: ワークフロー複雑化を避け、SKILL.md size を肥大化させない。

## D-0017-0012: error code は QFAI-PROT2-NNN プリフィックス

旧 `QFAI-PROT-NNN` と物理分離した v2.0 専用 prefix。理由: 旧 error code を再利用すると意味的ドリフトが発生し validator のバグ温床になる。grep で混入検出可能。

## D-0017-0013: SKILL.md ≤ 130 行

prototyping SKILL.md を 229 行 → ≤ 130 行に圧縮。本体は「フロー要約 + 必読 reference 列挙 + 完了条件 + 失敗時の振る舞い」のみ、詳細は references/ に逃がす。理由: ユーザの size 上限要請、長すぎる SKILL.md は AI が指示を読み飛ばすリスクが上がる。

## D-0017-0014: 互換 layer は作らない、再実行強要

旧 v1.x prototyping run は再実行を強要し、auto migration ツールは提供しない。理由: ユーザの破壊的変更推進方針、後方互換のための if 分岐は実装複雑化と将来負債の温床。

## D-0017-0015: 17 phase 分割、phase ごと commit

P0..P16 の 17 phase（うち P16 は手動検証）。各 phase = 1 PR / 1 commit、build green を維持。理由: ユーザの "実装作業をフェーズ分けし、各フェーズが完了するごとにコミット" 要請、レビュー粒度の確保、巻き戻しの容易さ。

## D-0017-0016: DESIGN.md (root) を brand SSOT に採用 (UX-loop redesign)

repo root の `DESIGN.md` を brand vision / visual identity の単一情報源として採用する。`/qfai-discussion` で draft を著者し、`/qfai-sdd` Phase 0 で sha256 凍結 (`.qfai/contracts/design/DESIGN.md.lock.yaml`)。理由: 既存の `brand-design.yaml` / `exploration-brief.yaml` / `reference-pool.yaml` の 3 contract 体制は brand intent を散逸させ、reviewer は "deviate from reference-pool" framing で逆向きの誘因を与えていた。markdown SSOT + sha256 lock は (a) 著者しやすさ (b) hash 凍結による drift 検出 (c) downstream `design-system.yaml` の deterministic mirror 化、の 3 利点を満たす。

却下案: brand-design.yaml の YAML schema を強化して compliance gate を追加する。schema の保守コストが高く、ユーザの編集体験 (markdown 直接編集) を壊す。

## D-0017-0017: 評価軸を UX 中心 4 軸に置換 (UX-loop redesign)

旧 4 軸 (Design quality / Originality / Craft / Functionality) を UX 中心 4 軸 (informationArchitecture / navigationFlow / usability / functionality) に置換する。理由: brand 視覚要素は DESIGN.md 単独で固定されるため、reviewer の評価軸は "見た目の良さ" ではなく "ユーザがどこにいて、どこに行けて、何ができるか" を主眼にすべき。Originality / Craft は subjective かつ DESIGN.md compliance gate と二重評価になる。

却下案: 6 軸 (UX 4 + brand-compliance + craft) にする。reviewer の cognitive load が増え、central tendency bias を悪化させる。compliance は別 gate (designMdViolations) に分離した方が決定論的。

## D-0017-0018: anti-pattern を visual slop から layout 構造に置換 (UX-loop redesign)

旧 `slop-001..010` (visual aesthetic anti-slop: shadcn-zinc / glass-card 等) を `lap-001..008` (layout anti-pattern: orphan-page / deadend-flow / hidden-primary-action 等) に置換する。理由: visual slop は DESIGN.md compliance gate で代替可能 (DESIGN.md にない token は逸脱として検出)。layout 構造の失敗 (orphan / deadend) は DESIGN.md では検出できない直交軸であり、別カテゴリで明示すべき。lap-007 / lap-008 は state-not-represented / no-back-affordance のような semantic 判定を残し、reviewer 知能を活用する。

却下案: slop と lap を併存させる。anti-pattern 種類が増えると reviewer の判定 noise が増え、informationArchitecture cap がどちらでも発火することによる原因特定の難しさが発生する。

## D-0017-0019: designMdViolations を pure deterministic 関数で実装 (UX-loop redesign)

`findDesignMdViolations(html, designMd)` を純関数 (no I/O / no clock) として実装する。理由: convergence gate (exit 64) は決定論的でなければならない (D-0017-0008 と整合)。LLM judge による brand compliance 判定は central tendency bias の温床なので、token-level の機械検出に下ろす。

却下案: LLM 補助で "似ているか" を判定する。再現性が崩れ、CI 上で flaky になる。

## D-0017-0020: handoff design-system.yaml を DESIGN.md mirror に変更 (UX-loop redesign)

handoff `design-system.yaml` を「最終 iter HTML から抽出した値」から「DESIGN.md token の deterministic mirror」に変更する。理由: 抽出方式は iter 番号によって brand token が drift する可能性がある (例: iter-12 で枠線 radius を 6px → 8px に変えた場合、handoff も 8px になり downstream 実装が brand 違反になる)。mirror 方式なら handoff は常に DESIGN.md と byte-equivalent。

却下案: 抽出値と DESIGN.md の diff を warning として出す。fail-closed gate (designMdViolations) で既に同等の判定をしており冗長。

## D-0017-0021: DCON 番号を 030/031/032 に renumber (UX-loop redesign)

DESIGN.md 関連の design-contract validator に DCON-030 (DESIGN.md presence/structure) / DCON-031 (DESIGN.md.lock.yaml hash integrity) / DCON-032 (design-system.yaml mirrors DESIGN.md tokens) を新設する。旧 DCON-005..016 は gap-allowed renumber で active 群から除外する。理由: 連続 ID 内で legacy と new を混在させると validator log が読みづらく、grep による事故が起きやすい。10 番台ジャンプで世代を視覚的に分離する。

却下案: DCON-009..011 に詰めて採番する。grep 時に新旧の判別が困難。

## D-0017-0022: cycle ≥1 hash mismatch を exit 2 で halt (UX-loop redesign)

`prototyping.json#designMdSha256` と現 DESIGN.md sha256 の不一致を cycle ≥1 で検出した場合、exit 2 で halt し cycle 0 からの再実行を強制する。理由: 中間サイクルで brand を変えると "iter-N 以降は新 brand、iter-N-1 以前は旧 brand" のような分裂状態を生み、convergence 判定の信頼性が崩れる。再実行強制は D-0017-0014 の "後方互換 layer を作らない" 方針と整合。

却下案: 不一致を warning として継続する。drift を許容することになり brand SSOT の意味が失われる。
