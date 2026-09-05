# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

### Fixed

- **`qfai init` が書く `<!-- qfai:language-rules -->` を、実際に埋めるか
  取り除くようにした。** このマーカーはパッケージ内で出荷アセット 2 本にしか
  出現せず、**埋めるコードが 1 行も無かった** (#1167)。1 つ前の版はそこに
  具体的な TypeScript レビュー規則を出荷していたので、以降に作られた
  プロジェクトは規則の代わりに HTML コメントを受け取っていた。機能が
  半分だけ入っていて、しかも入る前より出荷内容が薄い状態である。

  埋める内容は **(ファイル, 言語) の組**で決まる。消えた TypeScript 規則は
  レビュー観点なので code-review 側に戻し、principles 側はどの言語でも
  内容が無い (マーカー導入前もそこには何も無かった)。

  **入れるものが無いスロットは残さず削除する。** ここが置き換え前との違いで
  ある — 出力を読む人は、プロジェクトが何で書かれていようとマーカーに
  出会ってはいけない。規則の無い言語では、スロット導入前とまったく同じ
  内容になる。

  言語判定は manifest (`tsconfig.json` / `package.json` の `typescript`)
  のみで、ツリー走査はしない。判定できない場合は「いいえ」に倒す —
  読めない manifest を「はい」と読むと、別言語のレビュアーの前に
  TypeScript 規則が並ぶ。認識する言語を 1 つに絞っているのは、規則と判定を
  同時に足させるためである (それが今回の「半分だけ出荷」を構造的に防ぐ)。

- **JS リテラルを消す tokenizer が 1 つになった。** `atddTraceability.ts` は
  2 つの独立した実装でリテラルを blank していた — annotation scan は
  `validators/jsSourceMask.ts` の `maskJsNonCode`、carrier 判定はこのファイル
  ローカルの `stripCommentsAndLiterals` である。そして **`if (x) /re/` の `/`
  が正規表現であることを知っているのは後者だけだった** (#1154)。

  前者は `/` の直前の有意文字だけを見て判定するため、制御構文のヘッダを閉じる
  `)` を「値の終わり」と読む。すると `/^\s*```/` は除算として読まれ、中の
  backtick が template literal を開いて次の backtick までの全行を blank する。
  実際、緑の branch 2 本を統合した時点で **live な `it(` を持つファイルが
  annotation only の carrier として報告された**。

  制御構文ヘッダの規則を `maskJsNonCode` 側に移し、ローカル実装 (184 行) を
  削除した。判定は後方走査ではなく `(` ごとのスタックにしてある — 走査時点で
  文字列とコメントは既にスキップ済みなので、その中の括弧を数えてしまうことが
  なく、lookback の上限も要らない。正規表現リテラルの flag も literal の一部
  として消費する。

  **統合は「`comments` option の有無だけ」ではなかった。** ローカル実装は
  多言語 (Python / Ruby / Gherkin の `#` コメント、docstring の三重引用符) を
  扱っており、`maskJsNonCode` は JS 専用である。`#` を無条件に コメントとして
  扱うと JS の private field (`this.#count`) が行末まで消える。そこで言語側の
  span は option (`hashComments` / `tripleQuoted`) にした。Rust の `#[test]`
  は carrier 検出パターンそのものなので、`#` 規則が食べないことをテストで
  固定している。

- **`--format github` の annotation 上限が GitHub の実際の上限と一致するように
  なり、summary が「全件出した」と誤読されなくなった。** 上限は 100 件・run 全体
  で持っていたが、GitHub の上限は **level ごと 10 件 / step** であり、
  `error` / `warning` / `notice` は別勘定である。error が 40 件ある run は
  `annotations=40/40` と表示し、これは「全件 annotation 化した」と読めるが、
  実際には runner が 10 件だけ表示して 30 件を黙って捨てていた。operator が
  見るのは summary だけなので、起きたことと逆を表示していた (#1164)。
  `test (cli)` lane の実測では 3 つの level がすべてちょうど 10 件で、
  切り捨ては例外ではなく定常状態だった。

  上限を level ごとに適用し、summary の `annotations=` は
  **このプロセスが実際に書き出した workflow command の数**を報告する。
  切り捨てが起きた level は `上限省略=error 10/40, warning 10/12` のように
  level ごとに名指しする — 1 つの数字では per-level の上限を表現できず、
  「error 5 件 / notice 200 件」の run は片方の level では完全で
  もう片方では切れている。

  上限判定は severity ではなく **annotation の level** で行う。suppressed な
  error は `notice` として出力されるため、severity で数えると error の予算を
  消費したことになり、runner の勘定と食い違う。level の導出は 1 箇所に
  切り出して emitter と共有している。

  上限を超えて出し続ける案は取らなかった: runner が捨てるので読み手には
  届かず、ローカル実行では誰も読まない行が増えるだけである。全件は JSON に
  残る。

- **テストが実 GitHub annotation を出さなくなった。**
  `qfai validate --format github` は `::error file=…::message` を
  `process.stdout` へ直接書き、`issue.file` は**検証対象ツリーからの相対
  パス**である。テストは `mkdtemp` の fixture を検証するため
  `.qfai/specs/_policies/03_Capabilities.md` のような相対パスが出力され、
  runner はそれをリポジトリ root に解決する。結果、実在する健全なファイルが
  「見つかりません」と注釈されていた (#1160)。

  被害は見た目ではない。GitHub の annotation 上限は **level ごと 10 件 /
  step** で、fixture が 10 件出した lane には本物の指摘の席が残らない。
  `cli` lane を実測すると **184 件**が漏れていた。

  vitest の `setupFiles` 1 箇所で全 project を守る。個別テストの
  `vi.spyOn` による規律は既に 2 件存在していて**スケールしなかった** —
  `qfai init` + validate を足す新しいテストが無自覚に穴を開ける。

  **抑止であって黙殺ではない。** 落とした行はその場で stderr に報告する
  (上限付き)。stderr である理由は、GitHub が workflow command を stdout
  からしか読まないため、報告自身が command になれないようにするため。

  setup の宣言場所も動かしている。当初は `vitest.knobs.ts` の `projectKnobs`
  に入れていたが、**parallelism の E2E はこの object を `mkdtemp` の fixture
  root へそのまま spread する** (宣言された knob を再現して runner の挙動を
  測るのがその suite の目的である)。相対パスの `setupFiles` は fixture root
  から解決されて存在せず、slot 4 ファイルが全部 collect に失敗した。
  `vitest.knobs.ts` は _parallelism_ の knob 集合であり、`setupFiles` は
  parallelism の knob ではない。別 export にして `vitest.workspace.ts` 側
  (fixture が写さない場所) で各 project に渡す。`projectKnobs` に root 相対
  パスが無いことをテストで固定した — 「setupFiles が無いこと」ではなく
  「root 相対のものが無いこと」が守るべき不変条件である。

  child process で走らせる 3 行は Node の `--experimental-strip-types` に
  依存していたが、このフラグは Node 22.6 で入ったもので `engines.node` は
  `>=20.19.0` である。floor lane では child が **コマンドラインの時点で
  status 9 で死に**、setup が読み込まれる前に落ちていた — フィルタの挙動
  ではなくフラグの有無を報告していたことになる。version 判定で skip する案は
  取らなかった: package が約束している版を実際に走らせる唯一の lane で、
  フィルタが一度も動かなくなる。型除去は devDependency の `typescript`
  (`transpileModule`) で行い、child は素の `node` で走る。

- **`qfai init` が `.gitignore` の managed ブロックを毎回重複追記しなくなった。**
  ブロックの範囲を求める 2 つの走査は「既知の行である限り前進し、知らない行で
  止まる」形だった。旧版が書いた行がブロック内にあり、現行のブロックにも legacy
  一覧にも登録されていない場合、その行でブロックが途中で切れる。本リポジトリには
  実際に `.qfai/output/*` (legacy な validate 出力先) が 3 行目にあった (#1168)。

  影響は見た目の重複では終わらない。鮮度判定は抽出したブロックを読むので
  governance negation が「無い」と判定されて早期 return が働かず、除去も同じ
  途中までしか消さず、再構築されたブロックが**消されていない 20 行の上に**
  差し込まれる。git は最後にマッチしたパターンを採用するため、追記された
  negation 群は自分を打ち消す ignore 行より上に来て**何の効果も持たない**。
  実行のたびに無効な行が 1 ブロックずつ増える。

  ブロックの終端は空行・マーカー以外のコメント・EOF とし、その範囲内の
  **最後の既知行**までをブロックとする。間に挟まった未登録行では切れず、
  ブロック直下にプロジェクトが書いた行 (空行なし) は従来どおりブロックの外に
  残る — 内側に取り込むと negation より上に移動し、プロジェクトが ignore した
  かったファイルが追跡対象に変わってしまう。

  取り込まれた未登録行は失われない。`rebuildManagedBlock` は「マーカーでも
  negation でも legacy でもない行」を保持する。

- **`.qfai/steering/_templates/entry.md` の seed が formatter を通ると必ず drift
  するのをやめた。** frontmatter の trailing comment を桁揃えしていたが、Prettier は
  YAML の `#` 直前の連続スペースを潰す。seed は create-only で、re-init は seed と
  byte 単位で突き合わせるため、adopter が一度でも `prettier --write` を掛けると
  **本人が触っていないファイルについて** `_templates/entry.md differs from the seed
this qfai release generates` が以後ずっと出続ける。毎回出る通知は読み飛ばされる
  ようになり、本物の seed 変更を伝えるという通知本来の役目が失われる。

  桁揃えをやめ、`#` の前を 1 スペースに統一した。コメントの中身は変えていない。

- **`doctor --clean` / `--autoremediate` は、追跡されている review pack を
  git-ignore された `_archive/` へ退避しなくなった。** 退避は削除ではなく rename
  だが、行き先が ignore されていて元が追跡されていた場合、git からは 20 個の
  ファイルが消えたように見え、次の commit でリポジトリから削除される。pack は
  操作者のディスクにだけ残り、しかもその削除は "remediate" という名前の
  コマンドによる意図的な操作としてレビューに現れる (#1157)。

  条件は **両方**必要である。現在の同梱 `.gitignore` では pack は追跡されない
  ので、行き先が ignore されていても失うものは無く、そこで拒否すると `--clean`
  が全プロジェクトで無意味になる。失うのは pack を force-add した
  プロジェクト — QFAI 自身のリポジトリがそれである。

  拒否した pack は `kept-tracked=N` として数え、pack ごとに理由を出力する。
  黙って何もしないと `archived=0` が「TTL がまだ切れていない」と読まれる。

### Added

- **依存更新 PR を GitHub 上で自動生成する仕組み。** `.github/workflows/renovate.yml`
  が週次 (Asia/Tokyo の月曜 6 時前) と手動 dispatch で Renovate を回し、
  `.github/renovate.json5` が何をどうまとめるかを持つ。設定手順は
  `.github/renovate.md`。

  **Renovate GitHub App ではなく self-hosted。** App の設定は github.com 側に
  あってリポジトリのレビューを通らない。このリポジトリに書き込む他の仕組みは
  すべて SHA pin 済みの workflow なので、bot も同じ扱いにした。

  **job が 2 つあるのは #1161 が理由である。** action の SHA を書き換えるだけでは
  済まない: `.github/actions/setup/action.yml` は `.github/pinned-bytes.txt` に
  sha256 で pin され、その list の digest は `ci.yml` に、その step の body は
  `.github/required-status-contexts.json` に入っている。`uses:` を書き換えて
  終わる bot は、誰かが読む前から赤い PR を開き続けることになる。

  Renovate 設定の `postUpgradeTasks` は使えなかった。action は Renovate を
  自前の container の中で自前の clone に対して走らせるが、
  `scripts/pin-verification-bodies.mjs` は `packages/qfai/node_modules` から
  `yaml` を読む — その container で `pnpm install` は一度も走っていない。
  そこで再 pin は `renovate/**` への push で動く 2 つ目の job にし、木の他の
  toolchain job と同じ共有 setup action を使わせた。

  書き込みは job token ではなく `RENOVATE_TOKEN` secret を通す。
  `GITHUB_TOKEN` による push / PR 作成には workflow event が発生しないため、
  checks が一度も走らない PR ができてしまう (`prepare-release.yml` と同じ理由)。
  **この secret は本変更では作成できない** — 手順は `.github/renovate.md`。

- **その依存更新 PR を、CI グリーンだけを条件に自動マージするようにした。**
  `.github/renovate.json5` の top level に `automerge: true` を置いたので、
  major を含むすべての更新種別が対象になる。`matchUpdateTypes` で major を
  除外する一般的な書き方を**あえて採っていない**。

  マージ条件が CI だけで成立するのは、ここの CI が何であるかによる。
  `ci-pass` は lint / 型 2 lane / Node floor / Vitest 全体 / scanner coverage /
  pack 検証をすべて needs に持ち、`success` でも `skipped` でもない job 結果を
  受理しない。このリポジトリを壊す依存はその verdict に落ちるので PR はマージ
  されず、落ちない依存は誰にも読まれずにマージされる。

  マージを実行するのは Renovate ではなく GitHub である (`platformAutomerge`)。
  週次スケジュールのもとで Renovate 側マージを使うと、緑になった PR が最大 1 週間
  放置される — 「自動マージ」と書いてあるのに実質そうならない。かわりに
  **branch protection が唯一の門番になる**: `main` で `ci-pass` を required
  status check に設定していないと、GitHub は lane が 1 つも始まらないうちに
  マージする。リポジトリ設定は PR からは読めないので、
  `.github/required-status-contexts.json` に期待が宣言されていることだけを
  `renovateMechanism.test.ts` が要求する — automerge を宣言しながら required
  context を宣言しない状態を構造的に拒否する。設定手順は `.github/renovate.md`。

  併せて: `engines` / `packageManager` の `dependencyDashboardApproval` を外した
  (単独 PR にはなるが承認待ちはしない)。PR 上限は 5/2 から 10/5 に上げた —
  旧上限は「人が読む queue」を前提にした数字で、週 5 件しか流れない自動マージは
  遅い手動マージと変わらない。`ignoreTests: false` は既定値だが明示した。これを
  倒すと上のすべてが無意味になる唯一の knob だからである。

  repin job は push の前に branch がまだ remote に存在するかを確認する。
  自動マージにより、この job が計算している最中に PR がマージされて branch が
  消えうる — そして削除済み branch への `git push HEAD:refs/heads/<name>` は
  失敗せず **branch を作り直す**。action bump を自動マージするたびに孤児 branch が
  残ることになる。lookup 1 回で通常ケースを塞いだ (force push はしていない)。

- **QFAI 利用側リポジトリ向けの Renovate preset を公開した。**
  `.github/renovate-presets/qfai.json` と `qfai-self-hosted.json`。
  `github>aganesy/QFAI//.github/renovate-presets/qfai` の 1 行で extend する。

  `qfai` の bump は、バージョン番号が変わった時点では終わっていない唯一の依存
  更新である。パッケージは adopter のリポジトリに assistant tree (skills /
  agents と `.agents/` `.claude/` `.codex/` `.github/` の wrapper) を書き込むが、
  新しい版を入れても既に書かれたものは更新されない — 更新するのは
  `qfai init --force` だけである。バンプ単体でマージすると、リポジトリは
  「自分が持っていない skills のバージョン」を名乗ることになる。

  そこで preset は `postUpgradeTasks` で更新ブランチ内に
  `npx --yes qfai@{{newVersion}} init --force` を走らせ、再生成された tree を
  同じ PR に commit させる。ただしそのコマンドを走らせてよいかは Renovate の
  **管理者設定** (`allowedCommands`) で、config 側からは読めない — self-hosted
  なら許可でき、hosted app は既定で許可しない。

  したがって base preset は **fail closed** にした: `qfai` だけは自動マージ
  しない。再生成が走ったかどうかを設定ファイルは知りえないので、走らなかった
  場合に stale な assistant tree が default branch へ無点検で入ることを構造的に
  防ぐ。`qfai-self-hosted` はその hold だけを外した同じ preset で、コマンドを
  allow-list 済みの Renovate 向けである。

  preset の**パスは公開インターフェース**であり、改名すれば adopter 側の
  Renovate が config 解決エラーになる一方、こちらは緑のままになる。そのため
  self-hosted preset が base を参照する `github>` 文字列は、base ファイルが
  実際に置かれているパスから導出して検証している。

### Changed

- **`actions/checkout` と `actions/setup-node` を Node 24 対応版へ。**
  どちらも `runs.using: node20` を宣言しており、runner が Node 24 で強制実行
  したうえで全 job に deprecation warning を出していた。GitHub が Node 20 を
  撤去した時点で checkout が失敗して全 lane が落ちる、予告済みの破壊的変更
  である (#1161)。
  - `actions/checkout` → `fbc6f399…` (v5.1.0)
  - `actions/setup-node` → `a0853c24…` (v5.0.0)

  どちらの SHA も `action.yml` を取得して `using: node24` を実際に確認した。
  出荷アセット側 (`qfai-tests.yml` / `qfai-validate.yml`) も同時に上げている
  ため、`qfai init` が書く workflow も同じ警告を出さなくなる。

  出荷 action の pin は 1 箇所ではなく 4 箇所に登録されている: `uses:` 行、
  version を含む step の `name:` ラベル、`ALLOWED_ACTION_COMMITS` と
  `ALLOWED_STEP_SHAPE`、そして `ALLOWED_WORKFLOW_FILES` の byte digest。
  `uses:` だけ書き換えると label が古い版を指したまま残り、e2e の
  scaffold gate が落ちる。4 箇所すべてを更新済み。

## [1.10.2] - 2026-09-05

### Added

- **`QFAI-TDDLIST-009` — `Revision` を読むだけでなく、木と突き合わせる。**
  `evidence-revision.md#what-makes-evidence-stale` は staleness を完全に機械的に
  定義している（「観測が覆ったファイルを変更した commit はそれを無効にする」）
  のに、それを**計算する仕組みが無かった**。フィールドは手書きで、3 箇所で必須
  で、何とも比較されていなかった — `QFAI-REVIEW-009` は `summary.json` の
  フィールドが**存在するか**を見るだけで、**現在のものか**は見ない。

  失敗は沈黙し、かつ自己整合する。stale な `Revision` は fresh なものと
  見分けがつかない — 記録中のコマンドはすべて実在し、記録の中で矛盾する要素は
  何も無い。唯一の signal は誰かが観測をやり直して一致しないと気付くことである。

  行ごとに `git diff --name-only <Revision>..HEAD -- <test file> <srcDir>` を
  計算し、非空なら報告する。promotion window 付き `warning` から始める —
  これまで誰も計算していなかった以上、どのプロジェクトも**構造的に**蓄積した
  stale を抱えており、即時 `error` は誰も知らされていない backlog で gate を
  落とす。

  `changedFilesSince` は **3 値**を返す。`getChangedFilesAgainstBase` が
  あらゆる失敗を空集合に潰すのは、その呼び手が「検査対象なし」と読むから
  正しい。ここで同じ潰し方をすると「evidence は fresh」と読まれる —
  この finding が終わらせようとしている沈黙を、finding の内側で再現する
  ことになる。

  未解決 revision は emit しない。`actions/checkout` は既定で depth 1 なので
  window を共有すれば promote 後に shallow clone の CI が全行で error になり、
  `QFAI-REVIEW-009` が既に同条件を報告している（本リポジトリで 63 件）。
  「間違っているから解決できない」と「shallow だから解決できない」を区別
  できない残課題はソースに明記した。

  **git は distinct revision ごとに 1 回だけ呼ぶ。** 行ごとに 2 プロセスを
  起動する最初の実装は、本リポジトリで実測 104 回・約 10.5 秒（行あたり
  200ms）だった。observation revision は spec と round の単位で、行の単位では
  ないので行間で共有される — 500 行のプロジェクトなら
  `validate --profile tdd`（`qfai-implement` が回す完了 gate）に約 100 秒の
  上乗せになり、これは費用ではなく回帰である。木全体の diff を revision ごとに
  1 回取り、行ごとの絞り込みはメモリ内で行う。キャッシュはモジュール状態では
  なく引数にした — run をまたいで残るキャッシュは、後の run に以前の木の答えを
  返してしまう。 (#1146)

### Fixed

- **`QFAI-DRIFT-001` が二点比較していたため、`origin/main` 側で変わった
  ファイルが「このブランチで変更された」と報告されていた。**
  `git diff <base>..HEAD` は「この 2 つの木はどう違うか」に答える — つまり
  ブランチが分岐した**後に `base` が得た変更**も全部含む。finding の文面は

  > Upstream SSOT modified **on this branch** without an approved Change Request

  であり、main で変わりブランチが一度も触れていないファイルについて、この文は
  偽である。実測 (`tmp/1149/probe.mjs`):

  ```text
  two-dot   (main..HEAD):  [".qfai/contracts/api/other.yaml", ".qfai/contracts/db/owned.sql"]
  three-dot (main...HEAD): [".qfai/contracts/db/owned.sql"]
  ```

  これは偽陽性以上の問題だった。gate item 12 の step 4 は
  `qfai validate --fail-on error` なので、**`origin/main` が進むだけで error 数が
  増える** — しかもその gate 自身が 2 名のレビュアと `qa-gatekeeper` を各 round
  に要求してレビューサイクルを遅くしている。報告者のレビュアの診断が的確である:
  「増加は tree の内容ではなく validate を**いつ**実行したかの関数になっている」。

  `<base>...HEAD` は merge-base 比較で、これが「このブランチが変更した」の意味で
  ある。消費者は 2 つあり、どちらもその問いを立てている —
  `upstreamSsotGuard`（downstream フェーズが保護対象を編集したか）と
  `traceabilityIntegrity`（このブランチが変えた spec pack はどれか）。

  `changedFilesSince` (#1146) の**二点比較はそのまま**にし、意図的である旨を
  明記した。あちらの `revision` は別ブランチではなくこのブランチの履歴上の
  **点**であり、問うているのは「その点から今までに木が動いたか」である。
  三点にすると rebase で捨てられた線の上の観測を取りこぼす —
  過少報告であり、しかも沈黙する。 (#1149)

- **staleness の規則を「commit の性質」ではなく「計算する区間」として述べた。**
  `#what-makes-evidence-stale` の書き方だと「自分の**最後の commit** 以降に
  何か変わったか?」という別の、はるかに弱い問いに手が伸びる。issue が報告した
  2 件の見落としはどちらもその原因で、2 件目は 1 件目を教訓として書き留めた
  後に起きている。区間はコマンド 1 つで表せるので、それを書いた:
  `git diff --name-only <観測が名指す revision>..HEAD -- src tests` (#1146)

- **`qfai prototyping rescope` — loop を捨てずに退役した surface を外す。**
  cycle 0 は screen set を `prototyping.json#frozenSurfaceUnion` に凍結し、
  以降のあらゆる編集は lock drift (exit 2) である。drift ルールとしては正しい。
  だがそれが**唯一のルール**だったため、正当なケース — loop が開いている間に
  製品判断が screen を退役させた — も同じ扱いになり、用意されている経路は
  `iterate --cycle 0 --force` だけだった。これは `iter-00` を退避させ、
  それまでに支払ったすべての cycle のレビューを捨てる。

  ```bash
  npx qfai prototyping rescope --remove 0011 --reason DELTA-022
  ```

  `frozenSurfaceUnion` から surface を外し、captured な
  `iterate-plan.json#screens` から取り除き、
  `{surface, reason, cycle, at}` を `prototyping.json#rescopeLog` に記録し、
  **loop は現在の cycle のまま**にする。`--remove` は repeatable、
  `--reason` は必須、`--dry-run` は書かずに報告する。

  これが drift ルールの穴にならない理由が 3 つある:
  1. **すでに到達不能なものしか外せない。** 除去可能集合は
     `frozenScope.missing` — `QFAI-PROT-011` が報告するのと同じ集合 — なので、
     spec がまだ UI marker を宣言している surface は**拒否**される。
     `--add` は存在せず、拡大は表現できない。finding と操作は
     `core/prototyping/frozenScope.ts` という**単一の reader** を読むので、
     この一致は文書ではなく構造で保たれる。
  2. **`--reason` を要求する。** 記録済みの delta / decision id が、
     「適用された判断」と「exit-2 ルールが止めるべき黙った変更」を分ける唯一の
     signal であり、audit entry が保存するのもそれである。id らしくない値は
     **拒否ではなく警告**にした — id の解決には delta / decision が置かれうる
     全ての場所（`.qfai/decisions/`、spec の `09_delta.md`、
     `_policies/10_delta.md`、および利用側プロジェクト独自の場所）が必要で、
     取りこぼす resolver は**正当な**縮小を拒否してしまう。これはこの操作が
     存在する理由そのものを塞ぐため、弱いフィールドより悪い。実際の制御は
     audit entry であり、警告は「後で log を読む reviewer」ではなく
     「その場の操作者」に伝えるためにある。
  3. **critique を書き換えない。** reviewer が cycle N に見たものは歴史的事実で
     ある。該当する `iter-NN/review.json` には `retiredSurfaces` 注釈を追加し、
     `proseCritique` は一字も変えない。読者が「古い記述」と「誤った記述」を
     区別できるのはそのためである。

  sealed loop (`stopReason` あり) も拒否する — 完了した loop の scope は歴史で
  あり、縮めることはその loop が何を覆ったかの書き換えになる。

  `QFAI-PROT-011` の message / remedy と `qfai-prototyping/SKILL.md` の
  「Scope reduction has no in-loop path」節も追従した。後者は #1099 の part 4
  （「(1) が無いうちはそう書け」）で書かれたもので、役目は果たしたが、
  操作が存在する今はファイル中で最も有害なテキストだった — 読者を破壊的経路へ
  名指しで送るからである。 (#1099)

- **依存宣言と食い違う qfai の解決を `QFAI-TOOL-002` として分離した。**
  `QFAI-TOOL-001` は path 比較だけで判定しており、4 つの解決を区別できなかった:
  worktree ハザード / `_npx` キャッシュ / 意図的なグローバルインストール /
  monorepo root への hoist。前 2 つはハザード、後 2 つは正常運用なので、
  1 つの code では両方について真であることを言えない。
  区別に必要なのは **intent の signal** で、それはプロジェクト自身の依存宣言
  である。`findDeclaringDir` が root から上方に、`qfai` を任意の dependency
  field で宣言する最も近い `package.json` を探す。そのディレクトリが
  「その宣言が入れる copy はどこか」の答なので、内側なら宣言どおり
  (npm の `node_modules/qfai`、pnpm が解決する `.pnpm/...` を含む)、外側なら
  **宣言があるのに別の copy が走っている** = ハザードである。
  判定:
  宣言あり + 宣言の外の copy → `QFAI-TOOL-002` (`warning`、昇格窓付き) /
  宣言なし → `QFAI-TOOL-001` (`info`、グローバルか npx 取得しか実行経路が
  無いので operator の選択) / workspace root への hoist →
  `QFAI-TOOL-001` (`info`、宣言は honour されている)。
  つまり**昇格ではなく code の分割**で、これは issue 自身が
  「that row can be promoted while the rest stays `info`, which means splitting
  the code rather than promoting it」と述べている形である。
  `QFAI-TOOL-002` には昇格窓を置いた。ここでは P7 の既定が正しい —
  この条件は**今日不可視**なので、抱えているプロジェクトは一度も知らされて
  いない。gate が落ち始める前に気付いて直すための 1 minor が必要である。
  版番の比較ではなく**包含**で判定する。lockfile が pin した版は実行中の
  プロセスから読めないが、ディレクトリは読める。
  `classifyAgainstDeclaration` と `findDeclaringDir` を export した。
  `resolveToolPackageDir()` は自分自身の実在位置を返すので、テストは package を
  動かせず、判定すべき状態に到達できない。最初に書いた行はすべて
  `declaredElsewhere === false` の assert で、**一度も発火しないルールでも
  全行通る**状態だった (このリポジトリで 3 度目の one-sided suite)。
  書き直して 6 positive / 11 negative にし、4 変異 (判定が発火しない / 常に
  発火する / walk が最初の manifest で止まる / `dependencies` のみを数える)
  すべてが検出されることを確認した。
  (#1108)
- **waiver 処理後に追加される finding を「未知の rule」と呼ばないようにした。**
  `isPostWaiverSource` は `src/cli/` を `EMITTED_RULE_CODES` から意図的に除外
  している。これは正しい — `applyWaivers` は `core/validate.ts` の中で走るので、
  `src/cli/` が追加する finding は waiver で抑制できず、登録すると
  「一致し得ない waiver が active と報告される」ことになる。
  しかし帰結が operator には**偽の文**として届いていた。`QFAI-WAIVER-004` は
  「未知の rule '<id>' が指定されています」と言うが、真実は「rule は存在するが、
  waiver 処理の後に追加されるのでどの waiver とも一致しない」である。
  `waivers.ts:471-475` は隣接する区別 (「何も emit していない」対「この実行では
  黙っていた」) を既に書いているが、3 番目の状態 —
  **emit されているが構造上 waivable でない** — に名前が無かった。
  「未知の rule」と言われた operator は存在しない typo を探しに行く。remedy も
  異なる: typo は訂正するもので、これは削除するものである。
  生成器が 4 つ目の export `POST_WAIVER_RULE_CODES` を出すようにした。除外した
  code を**登録せずに名指しする**ためのリストで、`EMITTED_RULE_CODES` は不変
  (waiver が一致するかという問いに対しては、これらは依然 known ではない)。
  実装中に生成器側の同じ盲点も 1 つ直した: `constants` / `factories` の map は
  登録対象ソースのみから構築されていたため、post-waiver ファイルが
  `code: TRUNCATED_SCAN_CODE` のように module-level `const` 経由で code を
  名指す場合を解決できず、最初は literal で書かれた 1 件しか収集できなかった。
  両ソース集合から構築するようにして `QFAI-SCAN-001` / `QFAI-SCAN-002` が
  収集されるようになった。
  変異検査: post-waiver 分岐を無効化すると 1 行落ちる。negative control
  (「本当に未知の rule は依然 未知 と言う」) も追加した。
  (#1110)

- **P7 に「初日から error」を表現する 4 番目の答を追加した
  (`ERROR_FROM_INTRODUCTION`)。** それまで post-baseline な code に対する答は
  3 つしかなかった: 昇格窓 (`RULE_PROMOTIONS`) / ラダー外の `info`
  (`INFO_ONLY_SINCE_BASELINE`) / 政策より前 (frozen baseline)。どれも
  **「即座に error で、それは退行ではない」**を言えない。ガードは正しくそれを
  弾く — 登録した entry は `newRuleSeverity` で severity を決めねばならず、
  導入リリース以前の pin は「P7 が書かれた原因そのものの退行」として拒否される。
  `QFAI-SCAN-002` はその 4 番目を必要とする。「実行が完走しなかった」という
  意味で、この code が無かった時点でその条件は stderr 1 行と非 0 exit で
  プロセスを終わらせていた。窓を付けると 2 minor のあいだ結果が反転する —
  finding は `warning` になり、既定の `--fail-on error` では exit 0 なので、
  **クラッシュをより良く報告する変更がクラッシュを pass に変える**。窓の
  存在理由も無い: 新たに落ちるプロジェクトの backlog を吸収するためのものだが、
  この状態で通っているプロジェクトは存在しない (クラッシュするので)。
  判定基準は 1 つで、レビュー時に検証可能: **その条件は今日すでに実行を
  落としている**。各 entry は理由を必須とし、ガードは (a) 理由が空でない、
  (b) 全 site で `"error"`、(c) 何かが実際に emit している、(d) frozen
  baseline が既にカバーしていない、の 4 点を検査する。**理由が真かはガードでは
  検査できない** — 読者は「この code が無かった時ツリーはどうなったか」を問うて
  検証する。だからリストは短く保つ。
  あわせて ratchet の object-literal 抽出を広げた。`OBJECT_CODE_RE` は
  `code: "リテラル"` を要求しており、`cli/lib/warnings.ts` は
  `code: TRUNCATED_SCAN_CODE` と書くので、この形の post-P7 code は
  **一度も答を問われていなかった**。解決機構は 3 行上に既にあり
  (`issue(...)` 側の `resolveArg`)、それを使うだけだった。同じ盲点は
  `severityExpressionsFor` の object-literal 半分にもあり、そちらも定数
  エイリアスを解決するようにした — さもないと「全 site で error」を検査する
  新ガード自身が、検査したい severity を見られない。
  広げた結果 `QFAI-SCAN-001` が初めて ratchet に見えるようになった。導入時期を
  調べると P7 と同日に別ブランチで併行開発され、main へは先に到達している
  (`97abcbfe8` 2026-08-30T23:45:11Z vs `56c59f7fa` 2026-08-31T00:43:00Z)。
  固定 `warning` で `--fail-on error` を落とさないので、baseline リストの
  docblock が認めている例外 (「抽出器を広げると P7 以前の code が現れる」) に
  該当する。receipt をコメントに残して追加した。
  P7 の節にも 3 つの免除とそれぞれの判定基準を記述した。
  (#1111, #1110)
- **`validate.json` を public サーフェスとして文書化し、4 つの矛盾を 1 つの話に
  そろえた。** それまでこのファイルは同時に 4 つのことだった:
  **読むことを MUST とされ** (`qfai-verify/SKILL.md:152`、
  `shared-skill-operating-baseline.md:130`)、**`@api` と宣言され**
  (`change-classification.md:54`)、**internal で安定契約でないと宣言され**
  (`README.md:328`)、そして**キーが 1 つも文書化されていなかった**。
  結果は予測どおりで、findings 配列を探したエージェントは `findings` に手を
  伸ばし、配列名が `issues` のファイルから `undefined` を得た。
  public として解決した — skill がエージェントに読ませている以上、README が
  何と書いていても実質的にサーフェスである。
  `qfai-verify/references/validate-json-schema.md` を新設し、top level
  (`toolVersion` / `generatedAt` / `profile` / `issues` / `counts` /
  `traceability` / `waivers`) と `issues[]` の全キーを、必須と任意を区別して
  記載した。**何が安定で何が安定でないか**も明記した: キー名・`counts` の形・
  3 つの severity 値・配列名が `issues` であることは `@api` 経路の対象で、
  `message` の文面・`issues` の順序・どの任意キーが埋まるかは対象外。
  `message` で match する consumer は壊れるので `code` で match する。
  README の internal 宣言は `report.json` / `doctor.json` / `run-*` を残し、
  `validate.json` を外してスキーマ文書を指すようにした (両 README を整合)。
  2 つの命令元にはエージェントが探しに行くキーを明記した — waiver の `rule:`
  は `issues[].code`、判定は `counts`、そして**配列は `findings` ではなく
  `issues`** であること。
  提案 (3) の `findings` alias と (4) の `qfai report --format json` 安定
  クエリ面は入れていない。前者はまさに public にしようとしているサーフェスの
  スキーマ変更で、後者は新規 CLI 契約である。「どちらなのか」に答えが出た
  今、両方とも issue 側の判断に残す。
  (#1102)
- **他 spec が所有する ID を参照する正しい形を、finding と参照文書に書いた。**
  2 つのルールが「他 spec 所有の ID を名指すこと」を `error` にしている
  (`QFAI-SPACK-101` = namespace、`TRACE_DOWNSTREAM_REF` = 参照方向)。個別には
  妥当だが、両者が揃うと**よくある状況に表現形が無くなる**。レイヤード spec は
  entity を共有するので「この spec のルールは所有者のルールに従う」は実在する
  関係で、素直に「per BR-0017-0004」と書くと `error=0` が `error=2` になる。
  通る形は所有 spec の **contract id** (`CON-DB-*` / `CON-API-*` /
  `CON-UI-*`) を引用することだが、それを述べる箇所がどこにも無かった。
  `QFAI-SPACK-101` の remedy は「ID をこの spec に合わせて修正してください」で、
  これは**著者にできない唯一のこと**である — その ID は他 spec のものだから。
  `TRACE_DOWNSTREAM_REF` には remedy が無かった。両方に正しい形を書いた。
  あわせて `spec-traceability-rules.md` に
  `### Citing an ID another spec owns` を追加し、namespace 検査が
  **どのファイルを対象にするか**を実測値で表にした:
  `02` / `03` / `04` / `05` / `06` は対象、`09_delta.md` は対象外
  (delta は起きたことを記録するので他 spec の ID を載せられる)、
  `10_Plan.md` は**現在対象外**。後者は issue が「? 」として保留していた問いで、
  意図的な決定か抜けかは #1101 に残した。
  提案 (3) の `[owner:BR-…]` という認可された引用形は実装していない — 2 つの
  validator・traceability graph・参照文書にまたがる新しい ID 文法で、その関係を
  first-class にするかどうかの判断を伴う。
  (#1101)

- **loop 中に退役した surface を検出するようにした (`QFAI-PROT-011`)。**
  cycle 0 は screen set を `prototyping.json#frozenSurfaceUnion` に凍結し、
  以降の編集は lock drift として `iterate` が exit 2 で止める。drift ルールと
  しては正しい — 誰も凍結範囲を黙って広げてはならない。しかしそれが唯一の
  ルールで、**製品判断で screen を 1 つ退役させた**正当なケースも同じ扱いに
  なっていた。しかも `iterate` の hard-stop は **UI-bearing spec が全て**
  消えたときにしか発火しない (`prototypingIterate.ts:529-573`) ため、部分的な
  縮小は precheck の「zero UI-bearing specs resolved」条件を満たさず、
  `validate` は存在しない screen を記述した loop に対して `error=0` を出して
  いた。operator が気付くのは次の `iterate` — 唯一の道が
  `--cycle 0 --force` (= `iter-00` を退避し、支払い済みのレビューを全部捨てる)
  になる、後戻りできない地点である。
  新 validator は `frozenSurfaceUnion` と現在 UI-bearing に解決される spec を
  比較する。silent にするのは 4 ケース: loop が無い / 読めない
  `prototyping.json` (それは `certify` が拒否する) / `frozenSurfaceUnion` が
  無い / **loop が閉じている** (閉じた loop は履歴であって現在の主張ではない)。
  さらに「全 marker 消滅」も silent — `iterate` の hard-stop が既に凍結 union を
  名指しして別の remedy を出しており、1 つの状態に 2 つの finding は自動修復を
  2 経路に分岐させる。
  severity は promotion window から取る (`sunsetLedger` のガードが、登録した
  entry は `newRuleSeverity` で severity を決めることを要求する)。窓には実務上の
  意味がある — in-loop の逃げ道 (`rescope` 操作) がまだ存在しないので、
  `error` にすると「remedy が支払い済みレビューの破棄しかない」条件で gate を
  落とすことになり、置き換えた沈黙より悪くなる。
  あわせて `qfai-prototyping/SKILL.md` に `### Scope reduction has no in-loop
path` を追加した。drift ルールは対称だが縮小は非対称であること、reset が何を
  捨てるか、finding が「後戻りできない地点の前に」見えること、そして 2 つの
  出口 (restore / 意図的な reset) を明記した。
  issue が提案する `rescope` サブコマンド (1) と critique の supersede 注記 (2)
  は本 PR には含めない — 新規 CLI サーフェスと audit schema を伴う製品判断で、
  (2) は (1) の設計制約である。
  変異検査: 3 つの保護 (何も報告しない / 閉じた loop を無視する /
  全 marker 消滅を二重報告する) すべてが検出される。
  (#1099)
- **`QFAI-CONTRACT-040` を、DB 側が ENUM のとき `error` に上げた。**
  このルールは API 契約が要求する status/state 値を、同名フィールドを宣言する
  DB 契約が保持できないときに発火する。固定 `warning` だったが、qfai が指示する
  gate はすべて `--fail-on error` なので何もブロックせず、実プロジェクトでは
  95 件規模の warning バケットに埋もれ、**制約違反を先に見つけるのは Postgres**
  だった。
  issue は「(1) `error` に上げる / (2) どうしても `warning` なら ENUM のときだけ
  昇格させる」を提案していた。収集器を読んだ結果 **(2) が代替案ではなく本筋**
  だと判断した。DB 側の domain 収集は 3 形を読む:
  `CHECK_IN_PATTERN` / `CREATE_TYPE_ENUM_PATTERN` / `INLINE_ENUM_PATTERN`。
  後 2 者は Postgres ENUM で、domain 外の値は insert 時に拒絶される — つまり
  両契約を満たす実装は存在せず、これは issue が言うとおり定義上 error である。
  一方 `CHECK (col IN (...))` は列の物理形ではなく DB が**現在**主張している
  境界で、drop / 再定義 / `NOT VALID` で外せる。無条件に上げると issue 自身が
  「soft なケースは soft に保つ」と書いた区別を失う。
  `DbDomain` はどの形由来かを保持していなかったので `enumBacked` を追加した。
  1 つのフィールドが両形で束縛されている場合は enum が勝つ — 実装が満たさねば
  ならないのは最も厳しい制約であり、ENUM 列に冗長な CHECK が付いていても
  違反は不可能なままである。
  `collectSqlEnumDomains` の export シグネチャは変えず、形は
  `collectSqlDomainBounds` という 2 つ目の export で返す。値だけが必要な呼び出し
  側は無変更。
  提案 (3) も実装した。remedy は「DB 契約に値を追加するか、API 側の terminal
  semantics を訂正してください」と**両方向を対称に**提示していて、これは
  事例で実際に判断を要した点そのものだった。`dbFileList` は既に手元にあるので、
  ENUM 由来なら「その DB 契約が正」と名指しし、CHECK 由来なら両方向が取れる旨と
  「所有 spec の Contracts 表で判断する」ことを述べる。message には制約形も
  載せた — severity がそこで決まるので、`error` と `warning` を見比べた読者が
  SQL を開かずに理由を知れるようにするため。
  (#1100)
- **`R-CERTIFY-VERIFY-CIRCULAR` を `validate` では `info` にし、強制は
  `certify` に残した (`CR-20260904-0004`)。** `error` のままでは
  `/qfai-verify` の Completion Contract が Work Order H 外で満たせなかった。
  skill は `verify.json` を MUST とし、その `scope` は「実際に実行した stage を
  名指しし、実行していない stage は決して書かない」(`SKILL.md:148` / `:173` /
  `:72-73`)。したがって通常の full プロファイル実行は `scope: "full"` を書く
  しかなく、prototyping loop が開いている間、このルールがまさにそれで発火した。
  実測: `error=0` → ファイル作成 → `error=1` → 削除 → `error=0`。waiver は
  `warning` / `info` に限られる (`:151`) ので逃げ道が 1 つも無かった。
  `SKILL.md:65` の carve-out は Work Order H に明示的に限定されており、
  実プロジェクトでは loop が数週間開いたまま他の stage が走るため、この状態は
  例外ではなく通常である。
  強制点は変えていない — `prototypingCertify.ts:374-383` が既に非 prototyping
  scope を exit 2 で拒否しており、そのコメント自身が、この finding は
  「keeps the certify command self-contained instead of relying on a downstream
  validate pass to surface the same condition」と述べている。
  `scope: "full"` の verdict がディスク上にあること自体は damage ではない —
  それを `certify` が **consume** することが damage で、`certify` は拒否する。
  finding のメッセージには逃げ道を追加した (loop を閉じ、Work Order H として
  `/qfai-verify` を再実行して `scope: "prototyping"` を記録する)。従来は
  ルールと contract 条項だけを述べ、代わりに何を書けばよいかは述べていなかった。
  severity は `REQ-0015-0013` / `US-0015-0007` / `AC-0015-0013` /
  `EX-0015-0009` に規定された upstream SSOT なので Change Request を伴う。
  4 箇所すべてに新 severity と **その理由** を記録した — 「CIRCULAR」という名前の
  ルールに `info` を見た読者が、強制が無くなったと誤解しないため。
  issue の案 (2) (`prototypingLoop: "open"` の追加) と (3) (SKILL.md に例外を
  明記) はコストではなく中身で却下した: (2) は `prototyping.json` が既に持つ
  情報を schema field に二重化し、どちらが正かを両 reader で合わせる必要が
  生じる。(3) は skill が artifact を MUST としつつ「書かない条件」も述べる形に
  なり、実際の error を捕らえるのは依然 `certify` なので、発火しない gate の
  ための文書になる。
  (#1097)

- **`discussion` profile が root DESIGN.md の parse を見られるようにした。**
  `qfai-discussion` は parsable な root DESIGN.md を MUST とし、gate として
  `--profile discussion` を指定している。しかしその profile が走らせる 5 つの
  validator (mermaid / pack readiness / visuals / research summary /
  review artifacts) はどれも DESIGN.md を読まず、`QFAI-DCON-033` は sdd か
  prototyping の readiness gate からしか実行に載らなかった。つまり
  **ファイルを author する stage が、そのファイルが parse するかだけ検査されて
  いなかった** — malformed なファイルは author 時の gate を通り、レビュー 1 巡
  あとに別の skill の下で表面化していた。
  parse と lock を分離した。`validateRootDesignMdParse` は parse 半分だけで、
  lock 比較は入れていない — それは `/qfai-sdd` Phase 0 が解消するもので、
  discussion 実行を「その stage では直せない理由」で落とすことになる。
  「ファイルが malformed」と「ファイルが凍結 hash と一致しない」は
  owner の異なる別の失敗である。
  `QFAI-DCON-033` の生成は 1 つの builder に集約した。emitter が 2 つになるので、
  message / rule / remedy が食い違えば自動修復が 1 つの defect に 2 経路を取る。
  あわせて `design-md-spec.md` に `## accessibility allowed keys` を追加し、
  `contrast_ratio_min` と `motion` のみで list が **closed** であること、
  なぜ ignore ではなく reject なのか (dropped directive が lock に hash され、
  iterate / certify が読む parsed tokens には現れない)、新しい accessibility
  義務はどこに書くのか (`# Brand Philosophy` 本文 / screen contract の
  `observable_outcome`) を明記した。
  issue の提案のうち「失敗を比例的にする」(未知 leaf 1 つで document 全体を
  落とさない) は **実装しなかった**。`designMd.ts:405-425` が記録している
  理由が反対に働く — document を parse させて key ごとの finding にすると、
  lock は parsed tokens が持たない key を凍結し、document と lock は一致するのに
  どちらも author されたものと一致しない。判断が必要なので issue に報告した。
  「許可キーをメッセージに載せる」提案は既に満たされていた
  (`rejectUnknownKeys` が全 scope 共通で `Allowed: <list>.` を出す)。
  (#1098)
- **`certify` が封印する evidence と保存済み `validate.json` を関係づけるようにした。**
  それまで `certify` はその file について 3 点しか検査していなかった — 存在、
  `profile` が `prototyping`、`counts.error` が 0
  (`prototypingCertify.ts:286-319`) — そして結果とツリーを結ぶものが何も無かった。
  そのため flat な `review.json` があった時点で記録された成功のまま、flat を
  削除して per-spec を書いた状態を封印でき、現在の `validate` が reject する
  ツリーに証明書が出ていた。
  さらに証明書は `validateRun.ranAt` に **certify 実行時刻** を書いていた
  (`:937` の `new Date()`)。「fresh な run に対して封印されたか」を監査しようと
  した人が読んでいたのは、その問いが答えられなくなった瞬間に作られた
  timestamp だった。
  `ValidationResult` に `generatedAt` を追加し、`certify` は (a) evidence の
  いずれかが run より新しければ refuse し、対象ファイルを名指しする、
  (b) 証明書に run 自身の時刻を記録する。
  `generatedAt` が **無い** 場合は「古い writer」であって検査失敗ではないので、
  refuse せず note を出して続行する。issue が求めているのは「evidence が新しい
  ときに refuse」であり、時刻を持たない結果を拒否すると、その条件を表現できない
  すべての既存 `validate.json` を弾くことになる。このバージョンで `validate` を
  走らせれば必ず刻まれるので、窓は stale な 1 ファイル分で、次の run が閉じる。
  mtime の限界 (同一秒の書き込みは「新しくない」と見える / 改竄耐性が無い) は
  兄弟の check (`:1216-1294`) が既に記録しているものをそのまま引き継いだ。
  証明書と run を content digest で結ぶ形 (case B) が強い版で、別判断を要する。
  変異検査: 鮮度 gate を無効化すると 1 行、`ranAt` を certify 時刻に戻すと
  1 行が落ちる。
  (#1107)
- **spec-0004 の `review.json` スキーマを出荷バリデータに合わせた
  (`CR-20260904-0003`)。** 3 箇所で乖離しており、いずれも実装を canonical と
  する判断（ユーザ）。
  `AC-0004-0012` は `lap-*` の 8 ID を navigation / interaction の欠陥
  (orphan-page, deadend-flow, input-trap ...) として列挙していたが、
  `loadKnownLapIds` が解決する `assets/validators/layoutAntiPatterns.json` は
  **layout archetype** (saas-dashboard, bento-grid ... 6 件 `layout`、2 件
  `semantic`) を列挙している。8 件中 7 件に対応が無く、criterion が挙げた ID は
  `lap-008-no-back-affordance` を除きすべて出荷 gate に reject され、gate が
  受け付ける ID は同じ 1 件を除きすべて criterion 違反だった。**同じ種類の
  ものですらない**ため「コードを spec に合わせる」は取れない — 動作している
  detector 8 件を散文のために消すことになる。criterion をレジストリ参照に変え、
  撤回した 8 ID を criterion 内に記録した。
  `AC-0004-0013` の `designMdViolations` は
  `{category, expected, found, location}` で「余分な field でも reject」と
  していたが、`prototypingEvidence.ts:79-87` は `{kind, found}` だけを検査し
  残りは無視する。enum (color/font/radius/shadow) は元から一致していた。
  `04_Business-Rules.md` / `05_Examples.md` の `prose` は
  `proseCritique` へ。実装には 17 箇所あり `REVIEW_KNOWN_KEYS` にも入っている
  ため、spec どおりに書いた payload は **2 回** reject されていた（未知キーと
  必須キー欠落）。
  DERIVED 側とテストは無変更 — `06_Test-Cases.md` は criterion を ID で参照し、
  テストは既に実装の形を assert している（それを canonical にした）。
  **未決の 2 件**は `08_Open-questions.md` に `OQ-0168` / `OQ-0169` として
  記録した: navigation 系欠陥の族を別途検出すべきか（撤回した 7 ID には現在
  detector が無く、意図的に retire されたわけでもない）、reviewer に
  `expected` / `location` を要求すべきか（gate は両方を落とすので、違反は
  位置情報なしで報告される）。canonical の選択は「今 gate が何を要求するか」を
  決めるだけで、「gate が何を要求すべきか」は決めない。
  (#1105)

- **validate が完走できなかったときに判定を出すようにした (`QFAI-SCAN-002`)。**
  `runValidate` は `validateProject` を try 無しで await していたため、どの
  validator の fs エラーでも `cli/index.ts` に届いて stderr 1 行になり、
  `counts:` も `run-log:` も `validate.json` も出なかった。出荷 skill はすべて
  validate を `| tail` に通すので、エージェントには gate の判定があるべき場所に
  その 1 行だけが見えていた。Windows の `git worktree` は
  `.claude/skills/*` を directory を指す FILE symlink にし、`stat` が毎回
  `EPERM` を返すので、この経路には実運用で到達する。
  先例は `QFAI-SCAN-001` で、`cli/lib/warnings.ts` が理由まで書いている —
  不完全な scan は finding でなければならない、「stdout への echo だけでは
  `--fail-on` / `--strict`、GitHub annotation stream、run-log のいずれからも
  到達できない」から。クラッシュした実行は同じ条件のより厳しい版である。
  finding は errno とパスを載せ、`validate.json` には finding と 0 埋めの
  coverage を書く。counts は **finding の severity から導出** する
  (固定値で書くと severity と乖離し、`counts.error: 1` なのに error severity の
  issue が無い `validate.json` になる — 変異検査で実際にその状態を作った)。
  severity は `error` 固定で promotion window を置かない。`sunsetLedger` の
  ガードは「登録した entry は `newRuleSeverity` で severity を決めること」を
  要求するので、登録すると 1.12.0 まで `warning` になる。`warning` は既定の
  `--fail-on error` で exit 0 なので、**クラッシュを pass に変える** — 置き換える
  前の stderr 1 行すら exit 1 だったので、それより悪い。窓が吸収すべき backlog も
  無い (今日この条件は必ずクラッシュするので、この状態で通っているプロジェクトは
  存在しない)。P7 が「初日から error」を表現できないことは政策側のギャップとして
  #1111 に、そもそも `QFAI-SCAN-001/-002` が `EMITTED_RULE_CODES` から見えず
  waiver が「存在しない rule」と報告される問題は #1110 に起票した。
  あわせて `cli/lib/fs.ts` の無防備な `stat` を、判定できなかったパスを名指しする
  エラーに変えた。2 行上の `exists()` は `lstat` を使い、OS が follow しない
  reparse type の symlink でも **成功する** ので、entry は存在すると判定された
  直後に `stat` が無防備に throw していた。飲み込まない — 同モジュールのコメントは
  `catch(() => false)` と `catch(() => [])` がいずれも「失敗している filesystem を
  自信ありげな clean report に変える」として **削除された** ことを記録している。
  残り 10 箇所の `stat` サイトは issue の分割どおり後続に残した (各々が個別の
  判断を要し、この変更でミスがクラッシュではなく degrade になる)。
  (#1104)
- **temporary-files ルールの適用範囲を明文化した。** ルールは
  「一時ファイルはリポジトリルート `tmp/` に置く」と述べ、Rule 5 は例外なしに
  「`tmp/` の外に見つかったら defect として移動または削除する」と書いていた。
  一方でテストスイートは 643 箇所 (252 ファイル) で
  `mkdtemp(path.join(os.tmpdir(), …))` を使っている。つまり 2 つの読みが同時に
  成立していて、それ自体が問題だった — レビューは新規テスト 1 件を個別に
  指摘するが、著者は「同じファイルの他のケースと同じヘルパーを呼んでいる」と
  正直に答えられてしまう。
  適用範囲を「**ワーキングツリーに書かれるファイル**」に限定した。scratch
  スクリプト・中間成果物・ダウンロードした fixture・メモは対象。テストが
  `os.tmpdir()` 配下に `mkdtemp` で作るサンドボックスは非対象。これは Rule 1 の
  禁止事項からの帰結であって例外ではない — Rule 1 が挙げるのはリポジトリ
  ルート・`src/`・`.qfai/specs/` などの production/artifact ディレクトリで、
  リポジトリ外の `mkdtemp` root はそのいずれにもファイルを置けず、作った
  テストが自分で削除する (Rule 4 が求めていること)。
  代替案 (`tmp/` 配下に共通ヘルパーを作り 643 箇所を移行) は却下した。
  テスト I/O がリポジトリ内に入り、file-watcher とツリーを歩く guard すべての
  視界に入る。
  同じ scope を憲法 Article XI (配布 asset) と `CLAUDE.md` にも反映した。
  あわせて `## Reference` の参照先を修正した:
  `.qfai/assistant/instructions/constitution.md` は存在せず、Article XI の実体は
  `.qfai/assistant/constitution/constitution.md` — ルールから典拠を辿った読者は
  何も見つけられなかった。
  (#1094)
- **どの qfai が走ったのかを毎回出力し、プロジェクト外から解決された場合は finding にする。**
  出荷 skill はすべて bare `npx qfai …` を指示しているが、`npx` は bare name を
  **親ディレクトリ方向** に `node_modules/.bin` を探して解決する。Claude Code の
  worktree はメインチェックアウトの 3 階層下にあるため、自前の依存を持たない
  worktree では囲んでいるチェックアウトのバイナリ (別ブランチ・別 lockfile) が
  走り、実行結果には何も現れなかった。版番は `validate.json` の内部にしか無く、
  README はそれを internal と呼んでいるので、gate も貼り付けた evidence も 2 つの
  実行を区別できなかった。`run-log:` の隣に `qfai: <version> (<package dir>)` を
  出力し、走っている package が **プロジェクト root の外にある installed copy** の
  場合は `QFAI-TOOL-001` を出す (`--fail-on` から assert できる)。`RULE_PROMOTIONS`
  で 1.12.0 まで `warning` に固定。
  issue の提案からは 2 点を訂正した。`process.argv[1]` ではなく package
  ディレクトリを比較対象にする — 実インストールでは前者は npm が `.bin` に書く
  shim で、転送先の package とは別パスであり、報告された版番の持ち主でもない。
  また issue は「worktree のケースだけを捉える」としているが、そうではない:
  意図的なグローバルインストールと monorepo root への hoist はどちらも正当に
  root 外へ落ちる。どちらも defect と呼ばずメッセージと docblock に明記した。
  `outside` は `node_modules` セグメントを併せて要求する。`npx` が親探索で到達
  できるのはそこだけ (別チェックアウトのコピー / hoist されたコピー /
  グローバル prefix / 親に無いとき `npx` が黙って作る `_npx` キャッシュ) で、
  この条件が無いと直接実行したソースチェックアウトでも発火し、実際に
  `surfaceShortCircuitScope` と `skillsIntegrity` が落ちた — スイートの temp root は
  構造上すべてソースツリーの外にある。
  `classifyToolLocation` を純粋関数として切り出して export した。
  `resolveToolPackageDir()` は自分自身の実在位置を返すので、テストは package を
  動かせず、ルールが検出すべき状態に到達できない。最初に書いた 5 行はすべて
  `outside === false` の assert で、**一度も発火しないルールでも全行通る**。
  この継ぎ目で到達する 4 行を追加し、両方向を変異検査した (強制 off で
  positive 4 行が、強制 on で 7 行が落ちる)。
  provenance 行は **検証開始前** に、かつ **両 format** で出力する。`run-log:` の
  隣に置くと `--format github` では一切出力されず、出荷 SDD skill と evidence
  テンプレート (`skills/qfai-sdd/SKILL.md`、`templates/evidence/sdd-spec.md`) は
  その形式を指定しているため、製品が実際に走る経路で答えが欠けていた。また
  `validateProject` の後に出力すると、最も必要な実行 — 外部解決された古い qfai が
  新しいプロジェクト構造で例外を投げる場合 — で stack trace だけが残った。
  package directory の解決は固定深度 (`../../package.json`) から **上方探索** に
  変えた。tsup は公開 API を `dist/index.mjs`、CLI を `dist/cli/index.mjs` に
  別々に bundle するので、前者から 2 階層上は package の **1 つ上**
  (`/project/node_modules/package.json`) で、報告される版番もディレクトリも
  別物になる。`resolveToolVersion` に元からあった欠陥で、`src/core/` からも
  `dist/cli/` からも偶然正しくなるため気付かれていなかった。探索は `name` が
  `qfai` の manifest で止まるので、`node_modules/` の 1 つ上にある利用側
  プロジェクトの manifest を取り違えない。
  severity は `warning` + 昇格窓ではなく **`info` 固定** にした。同じ path 判定は
  意図的なグローバルインストールと monorepo root への hoist を捉え、どちらも
  正常運用なので、`error` へ昇格すると何も誤っていないプロジェクトで
  `--fail-on error` が必ず失敗し、しかも `applyWaivers` は error finding に対する
  waiver を `QFAI-WAIVER-002` で拒否するため逃げ道が無い。恒久的な `warning` は
  表現できない (ratchet は post-baseline code に parseable な `promoteAt` を要求
  するので、登録＝昇格の予約になる)。`INFO_ONLY_SINCE_BASELINE` が
  まさにこの形のための category で、既存メンバー `QFAI-REVIEW-010` の説明
  「ツリーが誤っていると主張しない、閉じるべき gate でもない」がそのまま当てはまる。
  昇格には依存宣言から意図を判別する仕組みが必要で、その要件は #1108 に記録した。
  `qfai --version` (#786) と skill 側の worktree ガイダンスも別 issue に残した。
  前者は独立した既知 defect、後者はどの解決形を規定するかという判断を伴う。
  (#1096)

- **ツリーから導出される事実をリテラルで pin しているガードに、再導出ツールを同梱した。**
  `stageEvidenceCounts.test.ts` は e2e callsite 数をツリーから計算し、隣にコミットされた
  リテラルと突き合わせる。導出は出荷されていなかったので、このガードで赤くなった寄稿者は
  全員がガードの散文から walk を再実装するしかなかった — #1065 は 1 回の巡回で 8 体の
  エージェントが独立に同じことをしたと記録している。しかもコンフリクトを人間が見ると
  「もっともらしい整数が 2 つ」並ぶだけで、**正解がそのどちらでもない** ことを示す手がかりが
  無い。正解は常に新しい導出である。
  `scripts/derive-e2e-callsites.mjs` が導出を 1 箇所に持ち、
  `scripts/pin-stage-evidence-counts.mjs` がそれを record に書く (`--check` で書かずに報告)。
  ガードも同じモジュールを import する — 2 実装は食い違いうるし、そうなるとガードは
  ツリーではなく再 pin ツールを測ることになる。ガードが検査するのは **コミットされた
  リテラル** 対ツリーなので、導出を共有しても self-referential にはならない。
  ガードの失敗メッセージはツールのコマンド名と per-root の内訳を出すので、寄稿者が
  数え方を再実装する必要はない。`vitest.workspace.ts` から `e2e` project の include を読む
  部分も共有側に移した — 「e2e project の callsite」を測ると称してディレクトリを自分で
  書いているガードは、include が 1 つ増えた瞬間に別のものを測る。parse できない include は
  黙って落とさず throw する。
  **suite の 2 つの total は対象外**。テストの中からスイートを走らせない限り導出できず、
  record 自身がそう述べている。このツールが動かすのはその total を無効化する 1 つの数だけで、
  total は「妥当性条件が明示された人間の主張」のまま残る。
- **`atddCredentialReuseGuidance.test.ts` には再導出コマンドを文書化し、自動書き込みは
  意図的に付けなかった。** この baseline は「数」ではなく **列挙** であり、それは
  「1 つ失って 1 つ得た集合はサイズが変わらない」という swap を捕まえるためにそうなっている。
  自動書き込みは swap を黙って吸収してしまい、レビュアーがそれを見る機会を消す。
  導出コマンドは出力するだけで、編集は人間が行う。#1065 の提案 3 は「ガードごとに再 pin
  script」だが、**導出された数**と**意図的に凍結された集合**では正しい道具が違う。
- **`tsconfig.tests.json#include` の test エントリはソート順になった** (#1066 で実施)。
  #1065 の提案 4 で、append が最終行に集中しなくなる。
- **Round 2b が正しく検出した重大欠陥を「修正して要件を維持する」経路が存在しなかった
  deadlock に、1 回限りの corrective review という出口を定義した。** 既存規則の交点が行き止まりで
  あることは構造的に到達可能である: named fix が **導入または露出** した欠陥を Round 2b が
  報告すると 2 度目の escalation になり、そこで 2b cap が _apply a named fix_ を、severity floor が
  _accept as Open Question_ を封じる — security / data-loss / released-contract correctness の
  finding では残るのが _drop the item from scope_ だけになる。欠陥を直して要件を保つ選択には
  検証経路が無く、artifact は永久に `REVISE` に留まる。Round 2b が仕事をしたことがこの状態を
  作る。
  そのユーザーが drop ではなく修正を選んだ場合に限り、**corrective review artifact を 1 つ**
  開ける。third round でも budget reset でもなく、round より狭い remit を持つ別 artifact であり、
  同じ 2 規則がこれを通して再合成できないよう境界を持つ: 元 artifact と Round 2b finding の
  逐語、ユーザー決定、修正内容、および触れた全 artifact の before/after revision を digest として
  記録する義務。remit は finding と named fix のみ、独立 review は 1 回のみ (`Round: corrective`
  — 番号は後継を招くので使わない)、`PASS` は当該 finding を supersede して未通過の review gate に
  戻すのみ、`REVISE` は terminal で追加 artifact も追加 review も無い。severity floor と
  Open Question 禁止は弱まらない。
- **2b cap の一文が事実と違っていたのを直した。** 「floor が両方を封じるなら」と書かれていたが、
  floor が封じるのは _accept as Open Question_ の 1 つだけである。`drop` だけが残るのは floor
  単独ではなく **cap と floor の交点** であり、そう述べ直した。
- **review 終了規則を `constitution/review-convergence.md` に分離した。**
  `shared-skill-delegation-baseline.md` は 500 行の shipped-asset 上限に対して 499 行であり、
  1 行の追加すら `assets guardrails > keeps every shipped assistant asset inside the line ceiling`
  を落とす。その guard 自身のメッセージが処方する remedy が "move a topic into references/" で
  あり、`Round budget` と `Convergence` は「review がどう終わるか」という 1 つの topic で
  delegation とは別なので、`drift-protocol.md` が既に確立している sibling constitution file の
  慣習に従った。規則の内容は移動によって変わっていない (baseline 439 行 / 新ファイル 121 行)。
- **リリースの版更新と tag 付けをワークフロー化した。** `Prepare release` に `X.Y.Z` を入力すると
  `packages/qfai/package.json#version` を同期し、`CHANGELOG.md` の `## [Unreleased]` を
  `## [X.Y.Z] - <日付>` に rename して空の `## [Unreleased]` を再挿入し、`release/vX.Y.Z` の PR を
  作成する。その PR が main に入ると `Tag release commit` が `vX.Y.Z` を push し、`release.yml` が
  起動する。publish は従来どおり `release` environment の必須レビュアー承認で止まる。
- **tag はリリース PR が運んだコミットにしか付かない。** 起動条件は
  `packages/qfai/package.json` の変更だが、それは必要条件であって十分条件ではない
  — `feature/vX.Y.Z` のような pinned branch は manifest と CHANGELOG 見出しを両方揃えるため、
  それだけでは区別できない。tag ジョブはそのコミットを運んだ PR を API に問い、head branch が
  `release/vX.Y.Z` であることを要求する。`.agents/rules/version-discipline.md` は tag の発行に
  独立した明示指示を求めており、pin が与えるのは「版」であって「tag を切ってよい」ではない。
- **版に関する検査はリテラルで行う。** CHANGELOG 見出しの照合は文字列一致で、正規表現ではない
  (`1.10.2` を正規表現として使うと `1010.2` に一致してしまう)。同名 tag が既にある場合は
  commit まで dereference し、このコミットを指すときだけ no-op として、異なるコミットを指す
  ときは両方の sha を示して失敗する。`01.11.0` / `1.011.0` のような先頭ゼロ入りの版は両
  ワークフローが拒否する — node-semver が拒否するため、通してしまうと publish 時まで失敗が
  遅れ、そのときには PR も tag も既に存在している。
- **リリース文面は自動生成しない。** 内容は各変更の作者が `## [Unreleased]` に書き足したものがそのまま
  使われ、GitHub Release の本文も同じセクションから抽出される。裏返しとして `## [Unreleased]` が
  何も説明していなければ `Prepare release` は失敗する — 空の場合だけでなく、`### Added` のような
  カテゴリ見出ししか無い場合も含む。誰も書いていないリリースノートは「何も起きなかった」と読める。
  なお `## [X.Y.Z] - <日付>` の日付は **Prepare release を実行した日** で、tag が切られるのは PR が
  マージされたときなので、翌日以降にマージするならリリース PR の中で直す (PR 本文がその旨を告げる)。
- **版番号も自動化は選ばない。** `.agents/rules/version-discipline.md` が版番号の決定権をユーザに置いて
  いるため、入力は必須で既定値を持たない。作成されるブランチ名が pin を運ぶので
  `check-branch-version-pin.sh` が manifest との一致を検証できる。書き込みは
  `RELEASE_AUTOMATION_TOKEN` 経由で行うため、ワークフローの `permissions:` は `contents: read` のままで、
  `BR-0017-0016` の閉じた逸脱集合は広がらない。
- **準備が途中で失敗しても再開できる。** branch の push と PR の作成は別々の失敗で、後者だけが
  remote に branch を残す。force-push は規則で禁止されているため、素直に再実行すると
  non-fast-forward で拒否されて手が無くなる。既存 branch と既存 PR を検出して採用するので、
  原因を直して再実行すればそのまま続けられる (同名でも別の版を宣言している branch は衝突
  として名指しで拒否する)。

### Changed

- **Every `## Default Autopilot Policy` bucket may now be narrowed, and each
  skill's policy is tailored to what that skill actually reaches.** The
  3-bucket policy shipped with a narrowing permission that covered
  `auto-decide` only, so `ask-user` and `hard-required` were copied verbatim
  into every skill: `/qfai-implement` advertised `/qfai-sdd`'s triage ops and
  `qfai init`'s branding inputs, neither of which an implement run can reach,
  and its own authorizations had nowhere to go. Narrowing now applies to all
  three buckets, and the `ask-user` bucket's first entry is a **category** —
  _approval-required governance operations_ — that each skill instantiates
  with its own human-authorized operations (`/qfai-sdd`: the triage ops;
  `/qfai-implement`: the `TDDLIST-001` accepted-risk waiver and the
  Drift-Protocol Change-Request escalation). Widening is still forbidden:
  a skill may instantiate a category, never introduce one. Only
  `auto-decide` widening is machine-detectable
  (`R-AUTOPILOT-POLICY-WIDENED`); the other two buckets remain review-enforced.
  Routing a ledger row **to** `exception` is not an `ask-user` decision — Red
  phase steps 3b and 5 decide it deterministically, and only the waiver that
  follows needs approval.

### Fixed

- **`--force` / `--yes` / `--dry-run` も、読まないコマンドで受理されていた。**
  #1143 の残りである。`validate --dry-run` は exit 0 で**実際の実行**を行い
  `.qfai/report/validate.json` と run-log を書いていた — リハーサルのつもりの
  操作者が本番を得る。

  ```console
  $ npx qfai validate --force    --root .   # exit 0、フラグは無視
  $ npx qfai validate --yes      --root .   # exit 0、フラグは無視
  $ npx qfai validate --dry-run  --root .   # exit 0、フラグは無視
  ```

  所有リストは推測ではなく `main.ts` の読み取り位置を `case` アームに対応
  づけて導出した:

  | field                         | 読むアーム                                 |
  | ----------------------------- | ------------------------------------------ |
  | `force`                       | `init`, `handoff`, `prototyping`           |
  | `yes`                         | `init`, `doctor`                           |
  | `dryRun`                      | `init`, `doctor`, `handoff`, `prototyping` |
  | `dir`, `upgradeAssistantTree` | `init` (#1143)                             |

  #1143 で入れた `ownedByInit()` は `ownedBy(...commands)` に一般化し、5 つの
  フラグすべてを 1 つの述語に通した。ほぼ同じ意味の述語が 2 つあると、歩調を
  合わせるべき契約が 2 つになる。

  **配布物との照合を先に行った**: これらのフラグをコマンドと組で書いている
  配布例は `qfai init --force` と `qfai prototyping iterate … --force` の
  2 つだけで、どちらも所有リスト内。README 2 つは 5 つとも `npx qfai init` の
  下でのみ文書化している。配布された手順が失敗し始めることはない。

  拒否時に出る usage banner が**所有先の唯一の答え**になるので、過小に述べて
  いた 2 行も直した: `--force` は `prototyping iterate`（配布 SKILL.md の
  破壊的リセット手順そのもの）を挙げておらず、`--yes` は `doctor` を挙げて
  いなかった。`--yes` の doctor 側の説明は `doctor.ts` 自身の docblock
  (`skip interactive confirmation (autoremediate)`) から取った。

  **アップグレード時の注意:** `validate --dry-run` のようなスクリプトは失敗する
  ようになる。以前からリハーサルではなく本番を実行していたので、失敗する方が
  厳密に良い。 (#1144)

- **`--dir` が `init` 以外でも受理され、黙って無視されていた。** その結果
  `validate --dir <path>` は**現在のディレクトリ**について判定を返し、
  `report --dir <path>` は現在のディレクトリの `report.md` を**上書き**していた。

  ```console
  $ npx qfai validate --dir "C:/nope/does/not/exist"
  counts: info=6 warning=950 error=0        # <- 現在のリポジトリの結果

  $ npx qfai validate --dir /tmp/empty-dir  # 存在する空ディレクトリでも
  counts: info=6 warning=950 error=0        # <- やはり現在のリポジトリ

  $ npx qfai report --dir "C:/nope/does/not/exist"
  wrote report: C:\Users\...\QFAI\.qfai\report\report.md   # <- 名指ししていない木に書く
  ```

  機構: `--dir` は `options.dir` を設定し、`resolveRoot` が読むのは
  `options.root` / `options.rootExplicit`（`--root` だけが設定する）。
  `options.dir` の読み手は dispatch の `init` アームただ 1 箇所である。

  これは文書化された制約ではなく欠陥である。`lib/args.ts` は「所有していない
  コマンドで使われたフラグは引数エラー」を **80 箇所**で実装しており
  (`--target-url`、`--spec`、`--remove`、`--reason` …)、`--dir` だけが例外
  だった — その `markInvalid()` は**値が無い**場合のみだった。

  `init` 以外では引数エラーにした。usage 行も「init 専用。他コマンドの対象指定は
  `--root`」と述べる — `markInvalid` は理由を取らず usage を出す方式なので、
  そこが操作者の学ぶ場所である。判定は `ownedByInit()` という名前付き述語に
  した (`ownedByPrototyping` / `ownedByGuardrails` に倣う) ので、次の
  init 専用フラグは誰もこの issue を覚えていなくても正しくなる。

  **同じ形の 2 例目**として `--upgrade-assistant-tree` も塞いだ。こちらは
  ある意味より悪く、`validate --upgrade-assistant-tree` は exit 0 で**何も
  更新せず**、操作者は assistant tree が更新されたと信じたまま古い tree を
  読み続けていた。

  本リポジトリ自身のスイートにもこの取り違えがあった:
  `validateRunIncomplete.test.ts` の 3 行が `report --dir` を使っており、
  修正後に落ちた（`--dir` が引数エラーになり dispatch に届かなくなったため）。
  `--root` に直した — これは修正が効いている証拠である。

  **アップグレード時の注意:** `validate --dir X` のようなスクリプトは失敗する
  ようになる。それらは以前から意図した動作をしておらず（別の木について答えて
  いた）、失敗する方が厳密に良い。`--root` に置き換えること。 (#1143)

- **注釈スキャナが、文字列 / template / 正規表現リテラルの中の**完全な** TC / US
  id を今も参照として読んでいた。** #1123 は**切り詰められた** id が
  `/^…TC-0001-\d{4}$/` から取り出されるのを止めたが、同 issue が述べていた
  構造的問題 —「正規表現の中の文字列、文字列リテラル、コメント、本物の注釈は
  同じテキストである」— には触れていなかった。実測:

  ```text
  as designed  コメント内の本物の注釈:              matched=true  want=true
  DEFECT       正規表現リテラル内の完全な id:        matched=true  want=false
  DEFECT       文字列リテラル内の完全な id:          matched=true  want=false
  DEFECT       template リテラル内の完全な id:       matched=true  want=false
  as designed  #1123 が閉じた切り詰め形:             matched=false want=false
  ```

  つまり id を**データとして**保持する fixture が、それを参照していると報告
  されていた。#1123 はその両方（コンストラクトをデータとして持つ generator /
  parser スイート、および対象の id を引用する自己検査型 deferral ledger）を
  日常的な形として挙げている。finding は `QFAI-ATDD-101` / `-102` = `error`
  である。

  必要なレキサーは**同じディレクトリに既にあった** —
  `validators/jsSourceMask.ts#maskJsNonCode` は該当スパンを正確に知っており、
  難所（`a / b` は除算、`= /re/` は違う）も扱っている。ただし**コメントも
  消す**ため、注釈がコメントに書かれるこの用途にはそのまま使えなかった。
  そこで `comments` オプションを足し（既定は `true`、既存の消費者は不変）、
  注釈スキャンはリテラルだけを消すようにした。

  拡張子でゲートしている。`.md` / `.feature` は
  `DEFAULT_TEST_FILE_GLOB` に含まれる注釈キャリアで、Markdown に JS レキサーを
  当てると散文中のアポストロフィが行末までの文字列開始として読まれ、その後の
  注釈が**消える** — over-blanking は本物の注釈を隠すので、この方向だけは
  導入してはならない。 (#1141)

- **CR の免除が `## Impact scope` を 1 つしか読まず、しかも code fence の中まで
  読んでいたため、書式例がそのパスを承認していた。** どちらも本リポジトリが
  `## Triage` に対して**既に発見・修正済み**の欠陥である
  (`specPack.ts#collectTriageSections`)。
  1. **最初のセクションしか読まない。** 兄弟実装の docblock がその修正を
     記録している —「以前は最初の 1 つだけを読んでいたため、skill 再実行で
     2 つ目以降のセクションに積まれた行が…丸ごと外れていた」。
     `QFAI-TRIAGE-008` の remedy は作者に対して
     「`## Triage` を複数置けば全セクションが検査されます」と明示しており、
     **再実行のたびに H2 を追記するのはこのシステムの確立された作法**である。
     それに倣った CR は後半の宣言が黙殺され、**申告済みの編集**に対して
     `QFAI-DRIFT-001` が出ていた。
  2. **fence の中を読む。** 兄弟実装は `maskNonSpecRegions` を先に通しており、
     理由も書かれている（書式例として fence 内に置かれた見出しが 2 つ目の
     セクションとして収集される）。Triage では偽陽性の方向だが、**免除では
     向きが逆で、はるかに悪い** — 書式を fence で説明した CR が、その
     **例が名指すパス**の免除を与える。#1121 の見出しそのもの
     （「禁止が許可になる」）が、別経路で再び開いていた。HTML コメントも
     同じ形で、CR テンプレートは説明用の HTML コメントだらけである。

  兄弟実装がすでに持っていたもの（全セクション収集 + `maskNonSpecRegions`）を
  そのまま採用した。

  検証で見つかった 2 つの「テスト不能コード」も処理した: `lastIndex` の
  リセットは `matchAll` で**状態ごと設計から消し**（`exec` ループと違い
  pattern の `lastIndex` を変えない）、section の join separator は
  `slice(0, next.index)` が次の見出しの `^##` で切るため非最終セクションは
  必ず改行で終わる旨を**証明として書いた**上で残した。 (#1139)

- **`prototyping rescope` の書き込み順序が「クラッシュしても再実行で回復できる」
  ことを決めていたが、コードにそう書かれておらず、テストも無かった。**
  派生成果物 (`iterate-plan.json` / `review.json`) を先に、正の記録
  (`prototyping.json`) を最後に書いている。これは直感と**逆**であり、逆の方が
  正しい: `rescope` は `frozenSurfaceUnion` に無い surface を拒否するので、
  2 群の書き込みの間で死んだプロセスが残す状態は

  | クラッシュ位置     | `frozenSurfaceUnion` | 再実行                                | 結果                                                                        |
  | ------------------ | -------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
  | 現行順（派生が先） | まだ surface を含む  | **受理**（id はまだ `missing`）       | 注釈は既存でスキップ、plan 削除は no-op、最後の書き込みが完了。**収束する** |
  | 逆順（正が先）     | もう含まない         | **拒否**「not in frozenSurfaceUnion」 | 古い plan と未注釈の review をこのコマンドで直す手段が無い                  |

  journal 無しでどちらの順序も crash-safe ではない。現行が回復可能な方である。
  問題は (1) その理由がコードに無く、順序が偶然に見えること、(2) 2 行を入れ替え
  ても**全行が通る**こと — どの行もクラッシュ窓に入らないため。この
  「成り立っていて、重要で、何も守っていない性質」は本リポジトリが繰り返し
  見つけている形である。

  不変条件を書き込み地点に明記し、`tests/cli/prototypingRescopeCrashWindow.test.ts`
  が意図的にその窓に入る行を持つようにした。

  検証自体の誤りも 1 つ潰した: 最初の mutation は 2 ブロックを文字列で入れ替えた
  ため、正の書き込みが参照する宣言より上に移動して **`tsc` が落ちる**コードに
  なっていた。行は「壊れたビルド」で失敗しており、順序について何も証明せずに
  "detected" と表示されていた。手書きの逆順版（`tsc` exit 0）に差し替え、
  verdict を信じる前に型チェックするようにした。 (#1137)

- **Windows ツリーでは必ず赤く CI では緑になる 2 行を、理由を明記した skip に
  した。** どちらも POSIX 固有のファイルシステム性質に依存していた。赤い行が
  2 つあること自体より悪いのは、開発者が作業するプラットフォームで恒常的に
  赤いスイートは「失敗はノイズ」と読むよう訓練してしまう点である — 実際そう
  なった（本セッションはこれらと #1130 を数時間「既知の先行失敗」に分類して
  いた。それは**本物の回帰が見えなくなる**状態である）。
  1. `tddListDecisionRecord` の `DR-0270-<slug>.md` は Windows では
     **作成できない**（`<` と `>` はファイル名に使えない）ので、
     `writeFile` が assertion に到達する前に `ENOENT` を返す。二次的な事実が
     修正の形を決める: 対象のハザード（未置換の `<slug>` が記録ファイル名に
     残ること）自体も同じ理由で Windows では**起こり得ない**。`tddList.ts` は
     その綴り (`DR-<id>-<slug>.md`) をテンプレートとして文書化しているので、
     広げるべきギャップは無い — ルールがそのプラットフォームで到達不能
     なのであり、skip は事実を述べている。兄弟フィクスチャ
     (`DR-0270-.md` / `DR-0270--.md`) は作成可能で全環境で走る。
  2. `tddListEvidence` の `chmod(file, 0o755)` 後に RED hash が stale に
     なることを期待する行。Windows の `fs.chmod` は read-only 属性しか
     切り替えず実行ビットは存在しないので、hash の入力が変わらない。
  3. `initRoutingMergeRaces` の 2 行。当初「並行性の問題でこのクラスでは
     ない」と切り分けたが、測ったら同じクラスだった:
     `restoreOwnership` は `if (process.platform === "win32") return true`
     で即座に戻る（`init.ts` 自身が「Windows に意味のある `fchown` は無い」と
     書いている）ので `handle.chown` が呼ばれず、テストが仕込む `EPERM` は
     起こり得ない。decline が発火せず merge が進む。
     **うち 1 行はこのクラスで最悪の形**だった —
     `leaves no staging file behind when it declines` は Windows で
     **PASS しながら何も検証していなかった**（decline が起きても起きなくても
     `.tmp` は残らない）。何も証明しない green には、気付くべき失敗が無い。

  機構はリポジトリに既にあった —
  `it.skipIf(process.platform === "win32")` は `integrationSurface` /
  `atddCoverageDepth` / `businessFlow` で十数箇所使われている。2 行はそれに
  倣い、理由がファイル内に書かれるようにした（「どの失敗を無視するか」の
  記憶ではなく）。

  skip が壊れた行を隠していないことも確認した: 各 skip を強制的に off に
  すると、失敗理由は**プラットフォーム由来のもの**
  (`ENOENT` / `expected false to be true` / manifest 内容の不一致) だけである。
  3 番目の強制実行は、この確認自体の価値も示した —
  `leaves no staging file behind` は強制実行でも PASS する。 (#1133)

- **finding code の family カバレッジ証明が Windows では一度も走っていなかった
  （CI は green のまま）。** `codesInFile` は解析済みソースをパスで引く:
  `scan.sources.find((c) => c.fileName === file)`。`ts.createSourceFile` は
  渡された名前を**スラッシュに正規化**し、`file` は `path.resolve` の結果である。
  POSIX では同一文字列なので一致するが、win32 では

  ```text
  C:/Users/.../src/core/validators/testTodoStubs.ts     (fileName)
  C:\Users\...\src\core\validators\testTodoStubs.ts     (file)
  ```

  となり、lookup は常に外して行は `not scanned:` で throw していた。

  この行が実装している保証は「gate が emit するコードはすべて**family**
  エントリで覆われる（bare code ではなく）」であり、gate が 2 つ目のコードを
  得たときに `QFAI-PROFILE-001` の notice から黙って抜け落ちるのを防ぐもの。
  `validateTestTodoStubs` は `runTddValidators` の中、つまり
  `qfai-implement` が gate にする profile で走るので、覆われていることを
  確認できていなかったのはそこのコードである。

  さらに悪いのは、Windows ツリーでは常に赤く CI では緑になるため、
  開発者がこの行をノイズとして読むよう訓練される点である（実際そうなった —
  本セッションは数時間これを「既知の先行失敗」に分類していた）。

  比較の両辺を同じ key 関数に通した。正規化は `path.sep` ではなく `\` を
  無条件に畳む — `path.sep` を使うと POSIX ではこの関数が恒等写像になり、
  Linux 上では正規化を外しても全行が緑のままになる。**この欠陥を生かした
  片側プラットフォーム盲点そのもの**なので、win32 形式の key を使う回帰行を
  追加し、両プラットフォームで落ちるようにした。 (#1130)

- **網羅を主張する profile が drift gate を走らせておらず、しかもそれを
  「未評価」として報告することもできなかった。** `QFAI-DRIFT-001` は
  downstream フェーズが upstream SSOT を直接書き換えたことを検出する唯一の
  gate で、`drift-protocol.md#non-negotiable-constraints` はその禁止について
  **「これは検出される」**と書いている。実際に emit するのは `--profile tdd`
  だけである。それでも `PROFILE_GATE_GROUPS.full = ALL_GATE_GROUPS` であり、
  さらに `QFAI-DRIFT-*` は `GATE_GROUP_FAMILIES` の**どのエントリにも無い**ため
  `unevaluatedFamilies()` が名指すこともできなかった。`QFAI-PROFILE-001` 自身の
  助言（「完了宣言の前に `qfai validate --fail-on error` (full profile) を
  実行せよ」）に従った作業者は、一度も見ていない実行から PASS を受け取り、
  そのことを一切知らされない。

  issue が挙げる 2 案のうち後者を採った。opt-out の理由は精査に耐える —
  `/qfai-sdd` はこれらのファイルの**所有者**で、CR なしに編集するのが設計で
  あり、その作者も完了前に full profile を実行するよう言われている。`full` に
  emit させれば、正当な authoring 編集をすべて flag することになり、opt-out が
  避けている失敗そのものになる。

  そこで `full` は網羅の主張をやめた。`drift` を gate group として追加し、
  `tdd` だけがそれを評価する profile であることを map に書き、notice が
  それを名指すようにした。これは defect (2) と同じ欠落エントリなので、
  1 つの変更で両方が閉じる。

  notice の文言は狭い profile では従来どおり（`tdd` / `sdd` / `discussion` /
  `atdd` / `saas-package` は実際に partial なので原文が正しい）。`full` /
  `verify` には専用の文を与えた — 「partial profile」と呼ぶと逆方向に
  言い過ぎで、読者は残りを探しに行く。また full 実行に対して「full profile を
  実行せよ」と助言するのは循環なので、その文は落とした。drift には
  「`npx qfai validate --profile tdd` だけが評価する — どの wide profile も
  wire しないので `--fail-on error` だけでは決して検査されない」という
  独自の 1 文を付けた。 (#1122)

- **`QFAI-DRIFT-001` の免除が承認済み CR 全文への substring 一致だったため、
  禁止文が許可として働いていた。** `readApprovedCrText` は `Status: approved`
  の CR **本文全体**を連結し、変更されたパスがその中に現れるかだけを見ていた。
  帰結が 3 つある:
  1. **禁止が許可になる。** 「`.qfai/contracts/db/db-0022.sql` を編集するな」と
     書いた CR は、`Status` が `approved` に達した瞬間にそのパスの免除を
     **与える**。`## Rejected` 行も同様であり、`#when-drift-is-detected` step 2 が
     defect クラス CR に**必須**としている `## Reproduction` ブロックも同様 —
     報告対象のパスを引用した再現手順が、その編集を承認していた。
  2. **承認済み CR は、たまたま言及したどのパスも免除する。** blob はリポジトリ
     全体なので、`spec-0007` の CR が無関係な contract を引用するとその
     contract の finding も黙る。
  3. **contract を名指す自然な 2 つの書き方が両方黙って失敗する。**
     テンプレートの `## Impact scope` は `Contracts: <CON-*>` を求めるのに、
     ガードは相対パスに一致する。ID 形式もベース名形式も効かない。

  免除を**宣言されたフィールド**に移した。承認済み CR の `## Impact scope`
  セクション（かつそこだけ）が権限の所在であり、`## Context` や
  `## Reproduction`、却下された選択肢の散文は何も承認しない。セクション内では
  **リポジトリ相対パス**と**ベース名**の両方を受け付ける（contract ID は
  受け付けない — ファイル内の宣言を指す名前であって、ファイルを指す名前では
  ないため）。一致はトークン境界付きなので、隣接アーティファクト
  (`<path>.bak` / `<path>2`) の名前がそのファイルを承認することはない。
  finding の remedy はセクション名と受け付ける綴りを述べる — 従来の文言は
  4 通りの綴りで満たされ、効くのはそのうち 1 つだけだった。

  promotion window も新コードも使わない。これは条件の追加ではなく、
  **得られていなかった免除の撤回**であり、通す finding は同じ編集が未申告
  だった場合すでに `error` である。禁止が許可を与えていたために通っていた
  リポジトリは失敗するようになるべきで、remedy は何を書けばよいかを正確に
  述べる。CR テンプレートと `drift-protocol.md#non-negotiable-constraints` も
  追従した。 (#1121)

- **注釈スキャナが切り詰めた TC / US id を一致させ、それを「未定義参照」として
  報告していた。** 注釈の正規表現は後半を optional (`(?:-\d{4})?`) にしていた
  ため、自分の注釈を検証するテスト — 自己検査型の deferral ledger が素直に書く形
  — が**自分自身の 4 桁短い prefix として一致**した。optional 側は `-\d` を
  消費できず、短形式が成立し、`-` は word 文字でないので `\b` も満たされる。
  結果 `QFAI-ATDD-102` が、切り詰めが**発明した**ために構造的に未登録な TC id を
  報告していた。短形式に `(?!-)` を付けた。両方の長さは引き続き正当 —
  `TC-0001` も `TC-0001-0002` も `TC_ID_RE` / `TC_REF_SHAPE` / `TC_ID_TOKEN` が
  受け入れるので、8 桁必須にすると実在の注釈を取り落とす。正当でないのは
  「短形式のあとに `-` が続く」形だけである (実在の短形式注釈の次に来るのは
  空白・引用符・`)`・行末で、ハイフンではない)。
  ガードは**短形式側のみ**に置いた。完全だが不正な注釈
  (`TC-0001-0002-draft`) は引き続き一致し、未定義参照として報告される —
  誤報を黙った取り落としに変えるのは、バリデータでは悪い方向である。
  `US-` は同一の形で同一の欠陥を持つため同時に修正した。 (#1123)
- **`validate` 以外のコマンドが、ファイルシステム障害でどのコマンドが落ちたかも
  分からない 1 行を残していた。** #1112 で `validateProject` を包んだので
  `validate` は `QFAI-SCAN-002` という判定に降格する。他のコマンドは libuv の
  エラーをそのまま `cli/index.ts` に届け、そこは `err.message` を書いて exit 1
  する — errno とパスは名乗るが**コマンド名を名乗らず**、その実行が
  「問題なし」ではなく「未判定」であることも言わない。これが #1104 が
  最初に挙げている苦情そのものである。`run` に境界を 1 つ置き、`validate` が
  既に持っている帰属を全コマンドに与えた。書き換えるのは `code` と `syscall`
  の**両方**を持つ未加工の libuv エラーだけ — 意図的な拒否はどちらも持たない
  ので、著者が書いたメッセージのまま通る。再 throw であり、握り潰さない。
  (#1104)

  残る `stat` サイトの掃き出しは**行わない**。分類を現在のツリーから再導出した
  結果、issue の「残り 10 箇所」は 3 つの理由で数え過ぎだった:
  `lstat` はこのクラスに**該当しない** (#1095 の条件は `lstat` が成功し `stat`
  が拒否すること)、`handle.stat()` は解決済み handle への fstat、そして
  path 追従 `stat` 48 箇所のうち 40 箇所は囲みの `catch` が全部飲むので errno
  は逃げない。逃げるのは 8 箇所で、うち `integrationSurface.ts` の 2 箇所は
  #1103 で `EPERM` を finding に narrow 済み、`cli/lib/fs.ts` は #1112 で
  パスを名乗るメッセージに包み済み、`prototypingIterate.ts` の `dirExists` は
  **伝播が安全性そのもの** (破壊的な `--force` 再実行の gate なので `EPERM` を
  「無い」と読んだら再実行が通る)、`prototypingCertify.ts` は gate なので
  拒否が正しい出力である。

- **Windows の git worktree で `qfai validate` が判定を一切出さずに落ちる問題を直した** (#1095)。
  `git worktree add` は `.claude/skills/*` のリンクを **file symlink**（ターゲットは
  ディレクトリ）として作る — リンクを書く時点でターゲットが新 worktree に存在せず、
  reftype のヒントが無いため。Windows はこれを追跡できず `fs.stat` が `EPERM` を投げる。
  `readlink` は正しいターゲットを返し `lstat` は symlink と答えるので、
  lstat ベースの検査はツリーを健全と報告する一方、同じパスの `stat` が落ちる。
  `integrationSurface.ts` はまさにその wrapper を `stat` しており、catch は
  `ELOOP` / `ENOTDIR` を「検査対象自身の構造的破損」として finding にしつつ
  それ以外を伝播していた。結果 `EPERM` はそのまま最上位まで抜け、`cli/index.ts` が
  `err.message` だけを出して exit 1 — **finding code なし・`counts:` 行なし・
  `validate.json` なし**。判定の無いゲートである。
  EPERM は既存 2 つと同じクラスで、その 2 つの catch コメントには「伝播させた結果
  run が終わった / スタックトレースで終了した」という同型の履歴が残っている。
  module が既に `cycle` / `not-a-directory` を通している 4 箇所（`PathState`、
  `canonicalState`、`statOrNull`、`describeDamage`）に `unfollowable` として通し、
  新しい機構は作っていない。wrapper 側は
  `resolves through a symlink the OS will not follow -> <target>` を伴う
  `QFAI-LINK-001` になる。
  `core/fs/errno.ts` に `isEperm` を追加した（同ファイルの docblock が
  「`EACCES` / `EBUSY` / `EPERM` … はこの module を拡張せよ」と指示している）。
  テストは同ファイル既存の手法（`stat` spy に合成 errno を reject させる）に従うので
  Windows 以外でも検証できる。修正を外すと赤くなることを確認済み。
  **負のコントロール**も追加した: この rule が検査しないパスからの EPERM
  （skills ディレクトリ自体の `readdir`）は引き続き伝播する — 「失敗している
  filesystem が健全な surface として読まれてはならない」という module の規約を守るため。
  Codex レビューで 2 件の実在欠陥が出たので併せて直した。
  1 件目は深刻で、**この finding が印字する修復手順が finding を解消しない**という指摘。
  `suggested_action` は「`qfai init` を再実行、`--force` は不要」と案内するが、
  `ensureSymlink` は「entry が symlink かつ `readlink` が一致」なら `--force` 無しで
  `skipped` を返す — まさにこの wrong-reparse-type がその条件を満たす。
  Windows worktree の利用者は案内どおりにしてもゲートが赤のままになる。
  `qfai init` 側を自己修復させた（同じ形の過去事例が flattened link で既に修正済みで、
  そのコメントが「`skipped` を返したことで修復できず、`--force` が必要なことを誰も
  操作者に伝えなかった」と記録している）。
  2 件目は EPERM 変換が広すぎた点。`statOrNull` は通常の canonical `SKILL.md` も検査するため、
  そのファイルや祖先の権限・filesystem 起因 EPERM まで「OS が追跡できない symlink」に
  誤変換していた。`lstat` で symlink を確認してから変換するようにし、`lstat` catch 側の
  変換は削除した（wrong-type symlink では `lstat` は成功するので不要であり、
  誤診の範囲だけを広げていた）。
  なお追加テストが**私の修正の別の欠陥**を捕まえた: 修復に `recreateFlattenedLink` を
  再利用したのは誤りで、あれは「内容がリンク先文字列の通常ファイル」用に hard link と
  4096 bytes 上限で退避する実装のため symlink には使えない（`link()` が EPERM）。
  `rm` → `symlink` の既存経路に合流させた。
- **#1078 の矛盾を `OQ-0012-0013` に記録した** (`CR-20260904-0002`)。
  canonical をどちらにするかの判断は**保留**（ユーザ判断）。コード・contract・テストは
  いずれも無変更で、変更は記録のみ。
  記録した到達条件は 10 巡のレビューを経て確定した。`validate` は記録済み非 seed
  iteration すべてに flat `iter-NN/review.json` を要求する。`certify` が layout 分岐に
  到達するのは `validate.json` を読み `frozenSpecsCovered` を検証した後だが、
  **well-formed な single-spec frozen set はそこを通過して layout 分岐に達する** —
  したがって single-spec 凍結は緩和策にならない。よって矛盾は
  **「`validate` が監査する記録済み非 seed iteration が per-spec 成果物を持ち、flat を
  持たない」**瞬間に live になる。
  当初の枠組み 2 点は誤りだったので明記する: (1) 矛盾は **multi-spec frozen set を
  必要としない**（したがって single-spec 凍結と `TC-0012-0388` は緩和策にならない）。
  (2) 2 つのレイアウトは**常に排他ではない** — flat を残して per-spec も書く dual-write は
  両ゲートを満たすので、wire-in は canonical を決めずに dual-write で land できる。
  排他なのは per-spec **のみ**の状態だけである。
- **「trigger を守るガードを追加する」という scope 拡張は本 PR では出荷せず、
  要件仕様として #1093 に分離した。**
  **守る対象の実装が存在しない状態では、正しいガードは書けない。**
  `dispatchReviewerToPair` は production caller 0 で、wire-in は未実装の `OQ-0012-0007`。
  9 巡で 7 稿を試し、いずれも反証された — どれも「まだ書かれていないコードの形」への
  推測だったため。反証された 7 稿と、正しいガードが満たすべき要件を #1093 に記録した。
  なお `iterationReviewPathPerSpec` / `dispatchReviewerToPair` の caller が 0 であることは
  **到達不能の根拠にならない** — `prototypingCertify.ts` は per-spec パスをテンプレート
  文字列で組み立て、どちらの helper も import していない。
- **1 つのルールに対して 4 つあった手書き reduction を、共有ヘルパ 1 本に統合した**
  (#1089)。`tests/helpers/sourceReduction.ts` が `withoutComments` /
  `withoutCommentsOrLiterals` を出し、4 つのガードがこれを import する。
  4 実装はいずれも**別々の間違い方**をしていた。故障は「ケースの抜け」ではなく
  構造的で、**この種のスキャンが探す区切り文字はすべて別の構文の内側にも現れうる**
  ため、構文 X を追跡しないスキャンは X の中身を自分の構文として読む:
  - 2 パス `replace`: コメント区切りがコメント内にある場合に破綻
  - コメントのみ追跡: 文字列内の `//` がコメントを開く
  - 文字列と template を追跡: **正規表現内の backtick** が phantom template を開く
    計測値（統合前 → 統合後）:
    | ガード | 症状 | 変化 |
    | --- | --- | --- |
    | `unit/validators-are-wired` | (file, validator) 対の誤判定 | 5 → 0 (#1061 で既に修正) |
    | `validators/ruleCodeUniqueness` | コメント散文がコードとして漏れる | 8/264 → **0/264** |
    | `helpers/prototypingGateSurface` | 同上 | 8/264 → **0/264** |
    | `core/prototyping/reviewerDispatch` | **コメントでないテキストの過剰削除** | 11,381 文字・識別子 91 個 → **0 文字・0 個** |
    `reviewerDispatch` の故障方向が特に危険だった。走査対象は
    `prototypingIterate.ts` 1 ファイルのみで、アサーションが
    `not.toMatch(/captureScreenshots/)` という **否定**なので、過剰削除は
    アサーションを通りやすくする。消えた識別子の 1 つは
    `resolvedCaptureScreens` — まさに禁止対象の隣だった。つまりこのガードは
    一度も赤くならずに黙って空回りしうる状態だった。
    統合により消費側から 217 行を削除し、44 行を追加した。
    `tests/unit/sourceReduction.test.ts` が共有側の契約を 12 ケースで固定する —
    各世代を壊した入力そのものを行にしてあるので、5 世代目の手書き実装は
    散文を読むのではなく、失敗するテストに突き当たる。
- **同じ欠陥を持つ `TDD-0012` / `TDD-0013` / `REQ-0020` も付け替えた**
  (`CR-20260904-0001` の scope 拡張、別途承認)。3 件とも
  `tests/core/prototypingEvidence.negative.test.ts` を引いており、
  そのファイルの `QFAI-PROT-002` は **0 件**。ledger 側 2 行は `done` だった。
  対象挙動は両方 `tests/validators/prototypingEvidence.test.ts` に既存なので
  **テストは追加していない** — ポインタ 3 箇所の付け替えのみ。
  なお `TDD-0012` の `Selector` は backtick で囲んだ。prettier が markdown
  テーブル内の裸の `*` を `\*` にエスケープするため、そのままでは verbatim
  一致が壊れ、`selectorResolves` の末尾トークン fallback（"declares" という
  ありふれた語）でしか通らなくなる。これはこの CR が消そうとしている
  「偶然の通過」そのものなので、`normalizeSelector` が明示的に除去する
  backtick 囲みにした。3 行すべてが strict predicate で verbatim 一致することを
  確認済み。
- **`TDD-0011` が `QFAI-PROT-002` のテストを 1 件も持たないファイルに対して `done`
  だったのを正した** (#1079, `CR-20260904-0001`)。`Test file` セルは
  `tests/core/prototypingEvidence.negative.test.ts` を指していたが、このファイルの
  中身は別 spec の `TC-0012-0238..0248` で、`QFAI-PROT-002` のアサーションは **0 件**。
  つまり CLAUDE.md が要求する REQ -> Spec -> Code -> Test の鎖が `TC-0004-0011` に
  ついて閉じていないのに、ledger は閉じていると述べていた。
  `tests/validators/prototypingEvidence.test.ts` に付け替え、`EX-0004-0010` の
  payload をそのまま食わせて欠落 required keys を列挙させるテストを 1 件追加し、
  `Selector` をそのテスト名にした。`Status: done` は変更していない — **真になる**ため。
  変異テストで空回りでないことを確認済み: unknown-key 報告を止めると失敗、
  `pivotDirective` 欠落の報告を止めると失敗、復元すると成功。
- **#1079 の当初の前提 2 点は誤りだったので、issue 側に訂正を投稿した。**
  (1) `schema v3` は「どこにも定義がない形状」ではなく、`03_Acceptance-Criteria.md:48`
  と `04_Business-Rules.md:60` が 4 UX axes / ordinal 尺度 / 200..500 語 /
  `pivotDirective` enum を列挙して定義している (ハイフン付き `schema-v3` だけを
  grep してスペース版を見落とした — #1076 で犯したのと同じ種類の見落としを、
  それを報告する issue で繰り返した)。
  (2) `TC-0004-0011` の「v1.x-shaped」は版判定ではない。`EX-0004-0010` が入力を
  「旧キーを持ち `pivotDirective` を欠く payload」と定義しており、版フィールドは
  不要で `.agents/rules/distributed-surface.md` と矛盾しない。
  したがって upstream (`03` / `04` / `05` / `06`) は正しいので一切変更していない。
- **validator 結線ガードの reduction を TypeScript パーサに置き換えた。**
  `validators-are-wired.test.ts` の `codeOnly` / `stripComments` は、コメントと
  リテラルを手書きスキャンで除去していた。この故障は「ケースの抜け」ではなく構造的で、
  **このヘルパが探す区切り文字はすべて別の構文の内側にも現れうる**ため、構文 X を
  追跡しないスキャンは X の中身を自分の構文として読む。世代ごとに 1 つ追跡対象を
  増やしてきたが、毎回「次の 1 つ」で間違っていた:
  - 2 パス `replace`: glob を引用した行コメントがブロックコメントの opener を運び、
    ブロック側が 27 行先の本物の closer まで走って途中の
    `validateStaleReferences(...)` 呼び出しを飲み込んだ (#1061 の見出し。単一パス化で
    修正済み)
  - コメントのみ追跡するスキャン: 文字列内の `//` がまだコメントを開いた
  - 文字列と template を追跡するスキャン: **正規表現リテラル内の backtick** がまだ
    phantom template を開いた。`core/specPackParsers.ts` は CommonMark の
    コードフェンス照合器を持つので regex の中に backtick の連続が入っており、
    そこから開いた phantom が **46 行先の JSDoc** まで走ってその JSDoc 自身の
    opener を飲み込む。以降は解釈が反転し、doc の backtick 間の散文がコードとして、
    実際のコードが文字列データとして読まれた。
    パーサ真値と突き合わせると、`main` は **5 つの (file, validator) 対で誤答**しており、
    しかも両方向に誤っていた — 1 つは JSDoc に名前が出ているだけで「結線済み」、
    4 つは自分自身の宣言が消えていた。ガードが緑だったのは「どれか 1 ファイルで
    参照されていれば結線済み」と集約されるためで、集約の偶然に守られていただけである。
    `ts.createSourceFile` に置き換えた結果、この 5 件は 0 件になった。パーサは
    「4 世代目の手書きスキャンが見落としたはずの構文」も知っている。加えて、
    ここのどのスキャンも引けなかった区別を引く: template の `${...}` は実行される
    コードなので `count=${validateX(root)}` は呼び出し箇所であり、その周囲の
    literal 部分はそうではない。呼び出しは (module, validator) 対ごとに問われるため、
    reduction はソーステキストで memo 化した (実行時間は 3.67s -> 3.61s で不変)。
- **同種の reduction を持つ他 3 ガードは本 PR の対象外**。`ruleCodeUniqueness.test.ts`
  は 264 ファイル中 8 件でコメント散文が漏れており (対象ガードは 5 件)、
  `reviewerDispatch.test.ts` は 2 パス `replace` のまま (漏れではなく過剰削除側の故障)、
  `helpers/prototypingGateSurface.ts` も regex を追跡していない。#1061 の本文が
  `validators-are-wired.test.ts` に限定して書かれているため、計測値を添えて別 issue に
  切り出した。
- **条件式で emit された finding code が、code 抽出を行う 2 つのガードの双方から見えていなかった
  構造的な穴を塞いだ。** `sunsetLedger.test.ts` の `ISSUE_ARG_RE` と
  `ruleCodeUniqueness.test.ts` の `ISSUE_FIRST_ARG` はどちらも「リテラル or 識別子」しか
  受けない。`issue(cond ? "A" : "B", …)` は識別子側で `cond` に一致した直後にカンマを要求される
  ため **一致自体が起きず**、その呼び出し地点は P7 promotion window の検査 (severity が
  `newRuleSeverity` を通っているかどうか) も ownership の帰属も受けない。
  `design-principles.md` の「新しい code は warning で出荷し、最低 1 minor 先の promotion
  release に pin する」という規律が、この経路では強制されない。
  両方の抽出器が条件式の **両分岐** を辿るようにした。どちらの分岐も利用者に届く code に
  なりうるので、片方だけ帰属させるのは死角を半死角に替えるだけである。解決できない分岐は
  プレーンな引数と同様にファイルを opaque 扱いにする。`severityExpressionsFor` は
  `firstArgNames` 経由で、直接 / file-local alias / 条件式のいずれかで code を名指す
  first argument を認識する。
  **今日隠れているものは無く、それは設計ではなく偶然である**: `src/` にある条件式 emission は
  `validators/reviewArtifacts.ts` の 2 箇所だけで、名指す `QFAI-REVIEW-007` /
  `QFAI-REVIEW-009` は両方 baseline code であり、しかも同じファイル内の別の呼び出しで
  リテラルとしても emit されている。issue の指摘どおり、問題は構造 — 条件式で出す新しい
  hard error は、ハウススタイルに従ったまま登録も所有もされずに利用者に届く。
  検証は `src/` ではなく合成 body に対して行う。実ツリーは上記 2 つの偶然で穴を隠すので、
  `src/` を見るテストは今日通り、抽出器が退行しても通り続ける。旧パターンが何も見ないことも
  同じケースで明示的に assert した。あわせて「条件式 emission に post-baseline code は
  無い」という測定を 1 行のテストにして、なぜ今 registration が不要なのかを読者が
  再導出しなくても済むようにした。
- **README が `qfai init` の実挙動と逆のことを書いていた誤りを直し、alignment gate に実挙動と
  紐づく 2 本目の oracle を足した。** 両 README が `It does not generate GitHub Actions workflows.`
  と述べていたが、`qfai init` はまさに 2 本の workflow を書き出す
  (`src/shared/shippedWorkflowNames.ts#SHIPPED_WORKFLOW_NAMES` = `qfai-validate.yml` /
  `qfai-tests.yml`、`cli/commands/init.ts` が利用者の `.github/workflows/` へコピー、出荷ファイル
  自身が `# Generated by \`qfai init\``で始まる)。しかも**同じ段落の直前の文**が
「QFAI generates integration wrappers under …`.github/**`…」と述べており自己矛盾していた。`scripts/check-readme-alignment.mjs` の oracle は 2 つの README の行単位一致だけだったので、
  **同じ内容で両方とも間違っていれば "aligned"** になる。ガードは仕様どおり動いていたが、
  "aligned" が "correct" と読まれていた。
  2 本目の oracle は他方の README ではなく **binary 内の write set** と突き合わせる:
  `SHIPPED_WORKFLOW_NAMES` の各名が CI セクションに現れることを要求し、
  `RETIRED_WORKFLOW_NAMES` の名が現れないことを要求し、`does not generate GitHub Actions
workflows` という文自体も明示的に拒否する (正しいファイル名を両方書いた上でこの文が残ると、
  名前一覧の検査だけでは通ってしまう自己矛盾 README になるため)。
  parse できない宣言形は **黙って skip せず報告する** — 実際これが初稿の穴を捕まえた:
  `new Set<string>([...])` だけを想定していたため、空宣言の `RETIRED_WORKFLOW_NAMES`
  (`new Set<string>()`) を unparseable として報告した。両形を受けるよう直した。
  適用範囲は「CI セクションを持つ README」に限る。CI セクションの無い README は workflow に
  ついて何も主張していないので判定対象外 — oracle 1 の fixture がこれに当たる。ただし
  **既定パスを検査しているときにセクションが無ければ error\*\* にする: 主張が消えたことで
  oracle が通るのは、この oracle が答えるために存在する失敗そのものだから。
- **500 行上限を守らせている `assets.test.ts` 自身が型検査対象外で、潜在的な `TS2345` を
  抱えていた欠陥を塞いだ。** `tsconfig.tests.json#include` は glob ではなく列挙であり、
  そのファイル自身の `$comment` が方針を「この変更が持つ責任範囲の境界」と述べているのに、
  出荷アセットの行上限を強制している当のガードがその列挙から漏れていた。列挙外のテストは
  何によっても型検査されない (vitest は型エラーを無視してトランスパイルする) ため、
  `validate.issues.map((i) => i.file).filter(Boolean)` の結果が `(string | undefined)[]` の
  まま `path.isAbsolute` に渡され続けていた。`.filter(Boolean)` は実行時に `undefined` を
  落とすが型を絞らない。型述語 (`(file): file is string => file !== undefined`) で narrowing
  した — bare `as` は同じことを検査せずに主張するだけなので使わない。
  列挙への追加は無料ではなく、`eslint.config.js` が同じリストを `TYPED_TEST_FILES` として
  読んで promise 系 4 ルールを有効化する。露出した `require-await` 6 件 (`await` を持たない
  `async` の `it` コールバック) は `async` を外して解消した。
- **同じ形の再発を構造的に塞いだ。** `testTypeCheckEnumeration.test.ts` に「出荷アセットの
  予算を強制する suite は、それ自身が型検査対象でなければならない」という行を追加した。
  budget helper を import している suite は予算を強制している suite であり、これはツリーから
  決定できる — 490 ファイルの census (同ファイルの docstring が実測に基づいて却下している)
  を持ち込まずに済む。この行は追加した時点で `assets.test.ts` 以外に **3 件**
  (`implementCheckpointVerification.test.ts` / `sddSkillTriagePhase.test.ts` /
  `assetLineBudget.test.ts`) を検出し、いずれも型エラー 0 件・lint エラー 0 件で列挙できた。
- **`include` の test エントリをソート順にした。** #1065 の 4 番目の提案。append が
  最終行に集中せず collating position に落ちるので、併走 PR 間の衝突面が縮む。
- **`prototyping iterate` が `--dry-run` を無視して、preview を求めた実行そのもので cycle-0 の
  破壊的リセットを行っていた欠陥を塞いだ。** `--dry-run` は `変更を行わず表示のみ` と文書化され
  引数パーサでは解釈されていたが、`runPrototypingIterate` へ渡されていなかった (`init` と `doctor`
  にしか結線されていなかった)。実測では 27 ファイル / 1,475,551 バイトの iteration evidence が
  `iter-00.backup-<ISO>` へ移動し、`iterate-plan.json` は `screens: []` で書き直され、
  `mutation-log.jsonl` は 27 件すべてを `"action":"move"` の実書き込みとして記録した
  — dry-run を示す印は 1 件も付かない。しかも直後の非 dry-run 実行はもう動かすものが残っておらず
  1 件しか記録しなかった。
  cycle-0 の破壊的再実行ゲートは `--force` なしでの上書きを既に拒否しており、その outcome を
  「意図的な選択」にするために存在する。`--dry-run` はそのゲートが守ろうとしている結果を
  そのまま素通りしていた。
  preview は `handoffUpgrade` が #515 で採った形に合わせ、**あらゆる書き込みの直前** で止まる
  — 最初の mutation は cycle-0 リセット内の mutation-log 書き込みなので、その手前。読み取り
  専用のゲート (zero-UI-bearing precheck、DESIGN.md の読み取りと hash、lock ゲート、収束ループ
  拒否、`--primary-spec-id` 正規化、cycle 範囲ゲート、そして破壊的再実行の拒否) はすべて
  preview より前に走るので、**preview は実行が返すのと同じ exit code を返す**: 既存の `iter-00`
  に対して `--force` なしの `--cycle 0 --dry-run` は実行と同じく 2 で拒否する。preview が
  0 を返して素通りするなら、それは同じ欠陥を場所を変えて作り直すことになる。
  preview が主張しないことも明示した: capture / license-verify / validate はこの地点より後に
  あるので、preview が覆うのは「この command が行う書き込み」であって「実行の結末」ではない。
  `--help` の `--dry-run` 行にも `prototyping iterate` を加えた。
- **直前に入れた reviewer-deliverable gate が、既定の運用経路では no-op だった欠陥を塞いだ。** seed 除外を
  `reviewerId === "iterate-seed"` だけで判定していたが、これはどちらの向きにも load-bearing ではなかった。
  (a) **解除されない** — `reviewerId` は `Iteration` 型に宣言が無く、書き手は `buildSeedIterations` だけで、
  同じレコードを in-place で更新する transcription で上書きせよという指示は出荷物のどこにも無かった。
  したがって review 済みの `iterations[0]` は seed の刻印を保持したまま、loop の寿命いっぱい除外され続ける
  — cycle 0 で収束する loop では、それが certify が封印する当のイテレーションである。
  (b) **どの index でも効いた** — gate が信用しないと宣言しているファイルに 1 語書けば、その行の義務
  (presence / schema / mirror) がすべて消える。しかも `reviewerId` は mirror 比較対象に入っていなかったので、
  bypass の原因となった不一致それ自体が報告不能だった。修正前の実測: iteration 3 件すべて 4 軸
  `exceptional`、`stopReason: "axes-exceptional"`、`review.json` はディスク上に 1 件も無い状態で
  `validate` は finding 0 件を返した。
  判定は `isUntouchedCycleZeroSeed` に集約し、構造と内容の両方を要求する: iteration がちょうど 1 件で
  index 0、`reviewerId` と `commitSha` が seed のもの、かつ `proseCritique` が placeholder と 1 バイト一致。
  最後の条件が self-clearing にしている — review は critique を 200-500 語の本文に置き換えるので、
  `reviewerId` を直し忘れても除外は自動的に外れる。`reviewerId` は mirror 比較対象にも加えた。
- **cap 違反の `review.json` が、どの編集でも満たせない finding の対を出していた問題を直した。**
  `layoutAntiPatternsDetected[]` が非空なら `informationArchitecture` を `acceptable` 以下に抑える規則は
  mirror 側だけで検査されていたため、違反は「忠実な転記」を通してしか報告されなかった。結果として
  cap 検査は `prototyping.json` の IA を下げろと要求し、mirror 検査は `review.json` に一致させろと要求する
  — どちらの finding も欠陥が実在するファイルを名指さない。review 側でも cap を検査し、
  そのファイルを修正して再転記せよと述べる。
- **`lap-*` registry の空集合を「読めた」と扱っていた fail-soft を直した。**
  `loadLayoutAntiPatterns` は throw しない劣化経路を 2 つ持つ — JSON が配列でなければ `[]` を返し、
  shape 検査に落ちた entry を黙って捨てる。どちらも `undefined` ではなく空 / 部分集合を生むので、
  registry 側が壊れているときに、適合した `review.json` の妥当な `lap-*` id すべてが
  「registry が宣言していない code」として error になった — fail-soft の doc が名指しで防ぐと書いていた
  反転そのもの。空集合は読めなかったのと区別できないので、同じ扱いにした。
- **mismatch message が長い値の先頭 120 文字を残していたため、両側が同一に見えていた。**
  `proseCritique` は 200-500 語で、転記時の言い換えが先頭 120 文字に入ることはほぼ無い。同長の置換
  (片方だけ typo を直した等) では 2 つのレンダリングが文字列として完全に一致し、operator には
  validator の不具合と区別できなかった。最初に食い違う位置を中心に窓を取り、切り出しは UTF-16 単位では
  なく code point で行う (critique band は日本語 / 中国語を受けるので、surrogate pair の中間で切ると
  lone surrogate が `Issue.message` と `validate.json` に混入する)。
- **`designMdViolations` の canonical 化を、宣言済み 2 key への射影から key の再帰ソートに変えた。**
  射影は 2 つのケースを隠していた: (1) 3 つ目の key を持つ entry と持たない entry が equal になり、
  mirror 義務が捕まえると謳っている「転記が field を落とす」ケースがまさに不可視だった。
  (2) 射影が `kind` の enum 適合を条件にしていたため、enum 外の `kind` では両側が raw stringify 経路に
  落ちて、忠実な `{found, kind}` 転記が enum finding の上に mirror mismatch として報告された
  — 1 つの欠陥に 3 件、うち 1 件は誤り。配列順は従来どおり比較対象 (順序は evidence である)。
- **`review.json` の unknown top-level key を拒否するようにした。** reviewer には前 cycle の
  `review.json` が入力として与えられるので、それを編集する際の key の綴り間違い
  (`pivotDirectiv` を足して古い `pivotDirective` が残る) は、完全で enum 内、忠実に転記され、mirror とも
  一致する payload を残す — そして loop は前 cycle の directive で動く。同じ理由で closed になっている
  per-screen payload と揃えた。
- **BOM 付き `review.json` を unparseable と報告していた。** PowerShell の `Set-Content -Encoding UTF8` /
  `Out-File`、および "UTF-8 with signature" を既定とする Windows のエディタは先頭に U+FEFF を出す。
  payload は妥当なので、reviewer の再実行を促すのは誤誘導だった。
- **unreadable finding が絶対パスを漏らしていた。** `EACCES` / `EPERM` 等で Node のメッセージには
  絶対パスが入るため、operator のホームディレクトリとユーザ名が `validate.json` / `validate.log` / CI ログに
  乗り、finding がマシンとチェックアウト位置ごとに変わっていた。errno code だけを載せる
  (ファイル名は repo-relative POSIX 形式の `rel` が既に名指している)。
- **配列位置と `index` が食い違うレコードで、作られていないディレクトリを名指していた。** review path は
  配列位置から導出されるので、`index` がずれたレコードでは存在しない `iter-NN/review.json` の不在を
  報告し、reviewer の実ファイルは読まれないままだった。ずれ自体は QFAI-PROT-004 が報告するので、
  その修正を待つ。
- **軸リストの 3 つ目の複製をやめた。** `evaluatorReview.ts` が `ORDINAL_AXES` を export し `OrdinalAxis` を
  そこから導出しており、`validators/uix/` の 2 モジュールがそれを SSOT と明記している。ローカルの複製は
  「5 番目の軸が追加されたらこの validator だけ 4 軸を検査し続ける」という、この gate が塞ぐために
  存在する形の穴だった。
- **`validateReviewArtifacts` を `validateIterationReviewArtifacts` に改名した。**
  `validators/reviewArtifacts.ts` が同名を export し barrel 経由で公開しているため、
  `prototyping/iterationPaths.ts` が `iterationDir` → `iterationDirPerSpec` の改名で回避したのと同じ
  「IDE の autoimport が別のシンボルを黙って選ぶ」経路に乗っていた。
- **出荷される transcription 指示を実際の義務に合わせた。** `qfai-prototyping/SKILL.md` の cycle 表は
  「`prototyping.json#iterations[]` を update」としか述べず、転記対象の列挙に `reviewerId` と
  `evidenceRefs` が入っていなかった — 両方が hard gate の前提になっているのに、出荷物のどこにも
  上書きせよと書かれていなかった。C0 行の "Append entry" も、`iterate --cycle 0` が既に seed を
  書いている以上そのまま append すると index 0 が 2 件になり QFAI-PROT-004 に落ちる。
  "Transcription" 節を追加して 7 field と 2 つの落とし穴を明示した。あわせて
  `references/reviewer-prompt.md` の Inputs が screenshot を full path、HTML snapshot を短縮形で
  並べていた不整合を直した — その 2 行をそのまま `evidenceRefs` に書くと mirror 不一致になる。

- **cycle-0 seed が「何も書かないファイル」を evidence として引用し、`iterate` と `review` の間で
  自分の gate を落としていた欠陥を塞いだ。** `prototyping iterate --cycle 0` が書く seed iteration の
  `evidenceRefs` は、宣言済み screen が無いとき `iter-NN/index.png` / `iter-NN/index.html` に
  fallback していた。この 2 パスは loop のどこにも writer が存在しない — 同じ invocation が書く
  `iterate-plan.json` 自身が `paths.screenshotTemplate` を `iter-NN/{screen}.png` と宣言しており、
  capture はその template に従うので `index.png` はどの時点でも生成されない。結果として
  `validatePrototypingArtifactRefIntegrity` が `QFAI-PROT-009` を 2 件出し、`iterate` 完了直後から
  reviewer の結果が mirror されるまでの窓 (capture と reviewer pass 全体を含む) でプロジェクトは
  自分の gate を通れなかった。しかも finding は「missing artifact」を名指すので「capture が
  走っていない」と読め、自然な対処である capture 再実行は per-screen ファイルしか書かないため
  救いにならない。screen が宣言されていても窓は消えない: seed は capture より **前** に書かれるので、
  最初の screen のパスもその時点では存在しない。
  seed は `evidenceRefs` を持たなくなり、`QFAI-PROT-009` は `reviewerId` が seed のものである
  iteration を skip する。2 つは 1 つの変更である — 除外なしに field を落とすと、missing-artifact
  error 2 件が empty-field error 2 件に置き換わるだけになる。除外は default ではなく positive claim
  なので、`reviewerId` を省いた iteration も別の reviewer を名乗る iteration も従来どおり両方の ref を
  要求される。`SeedMetadata.declaredScreens` はこの `evidenceRefs` を組むためだけに存在していたので、
  reader を失った field として併せて削除した。
- **上の欠陥を green のまま出荷させていたテストを、自分で作った postcondition を検証しないよう
  直した。** `prototypingIterate.validateConformant.test.ts` の「no declared screens で
  ref-integrity が error 0 件」を主張するケースは、その主張の直前に `iter-00/index.png` と
  `iter-00/index.html` を **自分で書いていた**。根拠として添えられたコメントは
  「seed は `--capture` 経由で暗黙にこれを行う。`--capture` なしなら operator の workflow が
  最初の validate 前に書く」だが、両方とも事実ではない: capture が書くのは plan の
  `screenshotTemplate` どおりの `iter-NN/<screen>.{png,html}` で `index.*` ではなく、`index.*` を
  operator に書かせる記述も出荷物のどこにも無い。fixture が結論を製造していたため、実運用が
  `QFAI-PROT-009` を 2 件出している間もこのテストは通り続けていた。現在は何も書かず、
  `iterate --cycle 0` が実際に残すツリーだけを観測する。
- **`iter-NN/review.json` を一度も読まずに「schema gate がある」と宣言していた
  reviewer-deliverable gate を実装した。** `qfai-prototyping/SKILL.md` は「review.json の
  shape だけが受理される。未知の layoutAntiPatterns code や enum 外の designMdViolations は
  QFAI-PROT-002 で validate を落とす」と書いていたが、その gate は存在しなかった。
  `validate --profile prototyping` が読んでいたのは `prototyping.json#iterations[]` —
  reviewer のファイルを orchestrator が転記した **mirror** のほうだけで、reviewer 側は
  丸ごと素通りだった。実測では、未知の `lap-999-not-a-real-code`、`pivotDirective: "stop"`、
  `scores.usability: "catastrophic"`、そして `review.json` の削除まで、いずれも `error=0` を
  返した。reviewer が走ったことを保証するはずの gate が、reviewer が走ったかどうかを
  判定できていなかった。`validatePrototypingEvidence` が 3 つの義務を QFAI-PROT-002 で
  報告する: (1) presence — review を記録した iteration には parse 可能な `review.json` が
  ある (不在と「あるが読めない」は別 finding — `EACCES` / `EISDIR` を「missing」と報告すると、
  ディスク上にあるファイルの上書きへ操作者を誘導してしまう)、(2) schema — payload が `references/reviewer-prompt.md` の shape に一致し、
  `layoutAntiPatternsDetected[]` は任意の文字列ではなく registry 照合を受ける、
  (3) mirror — 転記された `iterations[N]` が reviewer のファイルと一致する。(3) はどちらの
  surface も単独では捕まえられなかったもので、field を落とす・並べ替える・言い換える転記は
  「内部的には整合した 2 つのファイルが互いに食い違う」状態を作り、各ファイルは自分の検査を
  通ってしまう。code は QFAI-PROT-002 のまま — SKILL.md が既に約束している code であり、
  `ruleCodeUniqueness` が 1 code に owner module 1 つを要求するので、検査は sibling
  validator ではなく `prototypingEvidence.ts` に置いた。cycle-0 seed
  (`reviewerId: iterate-seed`) は 3 つすべてから除外される — reviewer がまだ走っていない
  ことがその存在理由なので、義務を課せば `iterate` と最初の review の間の window で全
  プロジェクトが落ちる。除外は default ではなく positive claim であり、`reviewerId` を
  省いた iteration も別の reviewer を名乗る iteration も義務を負う。SKILL.md の該当行は、
  定義がツリーのどこにも存在しない schema 名を挙げるのをやめて実挙動に合わせた。
- **publish に成功した `rename` を「まだ publish していない」ものとして retry していた
  install-provenance lock の欠陥を塞いだ。** `acquireRecordLock` の待機ループは、成功した
  `rename(staging, lockDir)` のあとに行う marker の stamp と identity 照合まで同じ `try` に
  抱えており、その `catch` は「宛先が publish できなかった、もう一度」を意味する腕だった。
  しかし成功した `rename` は `staging` を消費する — 以降の試行はすべて存在しない source を
  rename する `ENOENT` であり、writer は残りの patience まるごとを確実に失敗する no-op に
  費やしたうえで `another process is writing the record` を報告した。その時点でそれは偽で、
  原因を取り違えている。さらに publish 済みの lock は heartbeat を止めたまま残るため、同じ
  tree の他の writer は全員 `LOCK_STALE_MS` を待たされた。負荷をかけた実測 (fault 注入なし):
  `lock was replaced` の throw が 1 回、それを move して restore した reclaimer が 1 回、
  そのあと 178 回の `ENOENT` rename と entry 1 件の喪失。待機は `publishLock` に切り出して
  rename だけを retry させ、publish 後の処理は 1 回だけ走る — 呼び出し側にはもう loop が
  無い。GitHub Actions 上で無関係の PR を赤くしていた
  `keeps every entry under heavy concurrency` の flake は、この欠陥そのものだった。
- **一瞬 quarantine された lock を「奪われた」と読まないようにした。** reclaimer は lock を
  stale と判定してから MOVE するが、その 2 つは別の syscall である — 直前の holder の marker
  を abandoned と読み、その `rename` が「その直後に publish された lock」に着地しうる。
  `clearAbandonedLock` は move した object に fresh な marker を見つけて restore するので
  lock は同じ inode のまま戻ってくるが、その window の中で名前を 1 回だけ読んだ holder は
  起きていない置き換えを報告していた。publish 直後の identity 読み取りは `LOCK_CONFIRM_MS`
  (1s、ceiling の十分内側) を上限に再読する。受け入れるのは `dev`/`ino` が staging のものと
  一致する object だけなので、1 回読みが通さないものは何も通さない。
- **待機の忍耐を反復回数ではなく持続時間で表した。** `LOCK_ATTEMPTS` (200) と `LOCK_POLL_MS`
  の積は公称 sleep でしか実際の待ち時間にならず、`LOCK_STALE_MS` を上回るという不変条件は
  どちらかが動くたびに書き直され、過去に 2 回とも誤った。`LOCK_PATIENCE_MS` (15s) 1 つと
  なったことで ceiling との比較は直接になり、poll が重くなったときの対処が patience を黙って
  削ることにもならない。`LOCK_POLL_MS` は読んで字のとおり「どれだけの頻度で見るか」になった。
- **失敗した acquisition が lock を置き去りにしないようにした。** identity 照合が通らなかった
  ときは、standing な lock がこの holder の object であるときに限って `release` に返させる
  (link になった名前は拒否し、marker は名前指定で 1 つだけ unlink する — どのガードも review
  finding が買ったものなので、失敗しかけの acquisition が即興で書き直さない)。あわせて、
  `staging` を open できなかった経路が関数末尾の `clearInterval` を飛び越して `unref` 済み
  timer を残していた漏れも塞いだ — heartbeat の停止は 1 箇所に集約した。
- **昇格 window を持たない 9 個の finding code を、ガードの母集団を狭めるのではなく登録して塞いだ。**
  56 本の PR をまとめて取り込んだ後、`RULE_PROMOTIONS` に登録の無い code が 9 個残っていた。
  最初の修正はガードの母集団を `errorCapable` な code に絞るものだったが、これは誤りだった —
  P7 は「新しい code は `warning` で出荷し、1 minor 以上先の release に昇格を pin する」と
  定めており、`errorCapable: false` は新しい code の**正しい初期状態**である。あの filter は
  ガードが守るべき母集団そのもの (登録の無い新しい warning は永久に素通りし、昇格もされない)
  を除外していた。filter を撤回し、`QFAI-AGENT-014` / `QFAI-CONTRACT-015` / `-032` / `-033` /
  `-034` / `-035` / `QFAI-RESEARCH-012` / `QFAI-TRIAGE-008` の 8 個を `RULE_PROMOTIONS` に
  登録した。severity は literal ではなく `newRuleSeverity` が pin から決め、finding 本文は
  window の終わる release を名乗る (P7 step 2 / 3)。`resolveToolVersion()` は validator 実行
  ごとに 1 回だけ解決する。error に到達しうる code として、8 個には `expected:` / `fix:` の
  catalog 行も揃えた。`QFAI-REVIEW-010` だけは `info` のまま据え置いた: P7 の梯子は
  warning → error であり、`newRuleSeverity` は `info` を返さない。info の code をそこへ通すと
  登録した日に severity が上がり、pin の release で build が落ちる — window の目的と逆になる。
  除外は「src/ のどの emission site でも `info` である」ことをテストが毎回検証する、
  名前つきの 1 行として置いた。
- **exploration の hard-error 一覧から落ちていた UIX gate を戻した (24 個)。**
  到達可能性 walk が module-level の配列定数を展開しないため、`CANONICAL_UIX_VALIDATORS` を
  `map` で回す canonical UI/UX validator 群が「到達不能」と読まれ、その gate 20 個が
  `EXPLORATION_HARD_ERROR_CODES` から削除されていた。削除ではなく walk 側の盲点だった —
  discussion pack がある限りこれらは実際に走る。walk が配列 initializer も関数本体と同じ
  規則で辿るようにしたところ、equality テストが 24 個を要求した (以前の 20 個に加えて、
  一度も一覧に載ったことのない `validateTrendScan` の 4 個)。
- **GitHub Release の本文が長すぎるときに、リリースを失敗させずに切り詰めるようにした。**
  `release.yml` の抽出ステップは本文が空の場合しか検査しておらず、CHANGELOG のセクションが
  GitHub Release 本文の上限 125,000 文字を超えると `gh release create` が 422 を返して
  Release が作られなかった (v1.10.1 のセクションは 160,679 文字)。npm publish は別ジョブの
  ため成功しており、run を読むまで表面化しなかった。切り詰めはエントリ境界・文書順で行い、
  どこまで残したかと全文へのリンクを本文末尾に付ける。どのエントリが重要かはこの機構が
  決めない。

- **`QFAI-WAIVER-004` is answered from the emitters, not from this run.**
  Whether a waiver names a rule that exists was decided from the findings the
  current run produced, so a waiver kept on file after its defect was fixed —
  the intended end state — was reported as naming a rule that does not exist
  and dropped from `waivers.active`. The known set is now generated from the
  package's own emitters, and reaches the three shapes a literal scan missed: a
  code picked between on a `const` (`QFAI-FID-010` / `-011`), a code carried on
  a record and handed to the factory as a property, and an id that only ever
  reaches a finding as its `rule` (`TDDLIST-003` / `TDDLIST-004`). Codes the
  CLI appends _after_ the waiver pass (`QFAI-PROFILE-001`) are deliberately
  excluded: no waiver can suppress them, so reporting one as `active` is the
  same lie pointing the other way. A code the CLI re-emits but a validator also
  raises — `D-DEPRECATED-PATH` — stays waivable.
- **A rule whose severity is decided by the same condition as its code keeps
  its error-only classification.** `reviewArtifacts.ts` picks
  `QFAI-REVIEW-007` / `-009` and `error` / `warning` off one flag; reading the
  two independently left both severities unknown and withdrew the
  `QFAI-WAIVER-002` refusal from a rule that only ever fails hard.
- **Per-item TDD evidence survives `qfai init` and is checked on a fresh clone.**
  The managed `.gitignore` block now re-includes
  `.qfai/evidence/implement-*.md` and `.qfai/evidence/atdd-*.md`, so the files
  required by gate item 10 are committed instead of existing only on the
  machine that ran the test. `QFAI-TDDLIST-008` (warning, then error) also
  rejects an `evidence at` pointer when it names the wrong layer-owned file or
  TDD item, or when the referenced file or Markdown heading is absent.

## [1.10.1] - 2026-08-31

### Added

- **`qfai init` ships a layered CI workflow.** `.github/workflows/qfai-tests.yml` is new in the
  template tree: layer-separated test lanes, a `detect` job that classifies the changed-path list so
  four lanes run only when they need to, and a `ci-pass` verdict derived by iterating
  `${{ toJSON(needs) }}` rather than by a hand-written condition over job names — so adding a lane
  cannot leave the verdict silently agreeing. The diff runs with `--no-renames`, because rename
  detection reports only a move's destination and `git mv src/x.ts docs/x.md` otherwise skipped every
  test lane. `qfai-validate.yml` is reworked alongside it; the two are the only workflows the template
  root ships, and both are pinned by content in this repository's own tests.
- **`qfai doctor` gains a `workflows.integrity` check.** It compares each shipped workflow present in
  an adopter's `.github/workflows/` against the copy in the installed package and reports `ok`,
  `modified`, or `skipped_unresolved` when the packaged copy cannot be located. `modified` names the
  files. The check distinguishes "every recorded shipped workflow was removed by this repository, so
  there is nothing to compare" from "nothing was ever installed", because the two want different
  advice.
- **`qfai init` records what it installed, in `.qfai/install-provenance.json`.** Per shipped workflow:
  the sha256 of exactly the bytes written, the package version that wrote them, and when. That record
  is what lets a later `init` tell an adopter's own file from one QFAI installed — the states are
  `absent`, `adopter-owned`, `installed`, `modified` and `declined` — so an edited file is left alone
  and a retired one is pruned only when the record says QFAI wrote it and the digest still matches.
  A file QFAI never installed is never deleted.
- **A reference on credential reuse across parallel workers**, shipped under the `qfai-atdd` skill:
  acceptance tests that need an authenticated actor pay for the sign-in once per worker rather than
  once per test. It is prose guidance and adds no validator, finding code, test layer or annotation
  token.
- **`QFAI-LINK-001` (error) — the assistant integration surface is checked.**
  `qfai init` builds `.claude/skills`, `.agents/skills`, `.codex/skills`,
  `.github/skills`, `.claude/agents` and `.github/agents` entirely out of
  symlinks, and pins their precondition (`core.symlinks true`) into repo-local
  git config. `.git/config` is not cloned, so on any machine whose system or
  global config says `core.symlinks = false` — the Windows default — a fresh
  clone materialises every one of them as a small text file holding the link
  target. Nothing noticed: `qfai validate` never read those directories, and
  `qfai doctor`'s `skills.integrity` / `agents.frontmatter` both read the
  canonical `.qfai/assistant/**` tree, which is unaffected. The assistant then
  loads no skill and routes no agent, and every gate they define silently stops
  existing. The new rule runs in **every** profile, ahead of the profile's own
  validators, and reports a qfai-owned entry that is not a symlink or whose
  target does not resolve. On a project with no evidence `qfai init` ever ran,
  an absent directory is not a finding; once there is such evidence, all six
  integration directories are checked and one deleted whole is reported. Entries
  qfai does not own are left alone.
- **`D-SCAFFOLD-FOREIGN-HOME` (warning)** replaces the placeholder gate for an
  L4/L5 skeleton a pre-upgrade `qfai atdd scaffold` already wrote into
  `tests/integration/**`. The command stopped generating those, but the ones on
  disk kept escalating `D-SCAFFOLD-PLACEHOLDER` and telling the operator to
  implement an assertion — which discharges nothing, because the TC's declared
  `Level` routes elsewhere and `QFAI-ATDD-123` rejects the annotation wherever
  the file sits. The new finding names the move-or-delete remediation and does
  not escalate: escalation exists to pressure an operator into writing the
  assertion, which is not what this one needs.
- **`TDDLIST_COVERAGE_LAYER_MISMATCH` (warning)** reports a coverage-target TC
  discharged only from a row whose `Layer` contradicts its declared `Level` — a
  `Level = L1` TC closed by a `Layer = Integration` row alone. Coverage counted
  any non-API/E2E row, so with L1/L2 out of `QFAI-ATDD-112` nothing asked for
  the unit test. It is a warning, not an error: every ledger written before this
  check could carry one (this repository has five), and escalating on the
  release that introduces the rule is a zero-length window. The row still counts
  as coverage today; the finding announces the escalation.
- **`QFAI-ATDD-117` (info)** names the TCs excluded from the annotation
  obligation on every run. A silent exclusion is indistinguishable from a scan
  that matched nothing, which is how the JS-only test glob survived a release.

### Changed

- **`/qfai-sdd` にとって discussion pack は上流 SSOT ではなく、非規範的な参照資料であると
  分類し直した。** Stage 0 が「最新 pack が欠落・不完全・blocking OQ を持つなら停止」と
  hard stop していたため、SDD が矛盾や考慮漏れや未解決の問いを見つけた場合、実際に振る舞いを
  規定する artifact を書く前に、過渡的な discovery pack を修復して review cycle を回し直す
  ことを求められていた。これは所有境界の逆転である — `.qfai/specs/**` が詳細な振る舞い /
  設計の SSOT であり、pack は来歴と参照材料であるべきなのに、低忠実度の artifact が実際の
  SSOT を上書きする圧力になっていた。
  Stage 0 は source inventory / reference-quality の確認になった: pack は任意であり、
  不完全でも矛盾していても blocking OQ を持っていても、それ単独ではこの stage を止めない。
  自分の gate を通すために pack を編集・修復・再実行することは禁止で、そこから導かれる訂正は
  SDD 所有の spec / policy / contract に入れ、来歴の食い違いは delta/evidence に記録する。
  停止するのは「使える source が 1 つも無い」場合 (pack も import-lite input も明示的な
  user requirement も無い) のみ。安全に推論できない product decision は従来どおり user に
  確認し、その答えは pack に書き戻さず SDD artifact に記録する。
  Inputs Priority も normative な優先順位ではなく reference / provenance 入力という語に改めた
  — `Source: <pack>#<id>` の引用は従来どおり支持されるが、引用された文が拘束力を持つことは
  意味しない。矛盾は pack を書き換えるのではなく、明示的な rationale (product な選択なら
  user decision) とともに SDD artifact の中で解決する。
  併せて `drift-protocol.md` の上流 artifact 一覧から discussion 出力を外し、
  `contract-artifact-rules.md` の「Discussion UI/UX files are upstream discovery artifacts」を
  非規範的な discovery / reference artifact に改め、`sdd-execution-playbook.md` の Stage 0 手順と
  `sdd-triage.md` の Inputs も追従させた。
  **この再分類は pack だけを対象とする**: 本物の上流 artifact は従来どおり上流優先で修復し、
  dependent な spec 内容を書いている最中に見つけた contract 欠陥は contract-first で直す。
  なお validator 側は既にこの形だった — `runSddValidators` は discussion pack validator を
  1 つも実行していない (`validateDiscussionPackReadiness` は `discussion` profile 専用) ので、
  sdd profile が pack の完全性を gate したことはコード上は無く、hard stop は出荷 prose だけに
  存在していた。
- **A validation issue can now carry the CI job its producer reported (`job`).** The
  reviewer-justification gate ingests the workflow-set lint lanes' findings, and those lanes
  report a site as `file` + `job` + `rule`. The gate previously overwrote `file` with the path
  of the artifact the finding arrived in and `rule` with a constant naming its own branch, and
  the job had no field to survive in at all — so a JSON consumer of `qfai validate` was told
  which report file to open and nothing about the workflow that was wrong. The lane's `file`,
  `job` and `rule` now pass through verbatim, the producer's own `detail` is reproduced in the
  message, and the artifact moves to `relatedFiles`, where evidence for a finding belongs.
  `job` is optional and set only when a producer reported one, so no existing issue changes
  shape.
- **`TDDLIST_STALE_STATUS` stops firing on a selector that only shares its last word.** The
  rule reads a ledger row whose `Status` is `todo` and warns when the named test appears to exist
  anyway. It resolved the selector through a helper that falls back to the selector last
  identifier — right for that helper other caller, where a match is evidence FOR a test presence and
  leniency costs a warning rather than swallowing one, and wrong here, where the direction inverts:
  `header` appears in almost any test file, so rows whose test does not exist were reported as
  stale. The stale check now requires the selector itself, segment by segment for a `::`-style
  selector so a pytest row still resolves. Adopters will see fewer of these warnings; a row whose test
  exists under a slightly reworded title is no longer reported, which is a false negative replacing a
  false positive on a `warning` with no error-level consequence.
- **A review round that produced no responses can now be written down.** `summary.json`'s
  `reviewers` array may be empty, and `QFAI-REVIEW-005` ('no `Rxx_*.md`') stands down when it
  is. Previously a round whose reviewers died before writing anything had no accurate
  representation: the schema rejected the empty array, so the true record was indistinguishable
  from a pack somebody forgot to seal. The summary must still be present and schema-valid — that
  is what makes the empty array a statement rather than an absence — and the check runs both
  ways: a summary declaring `reviewers: []` with report files beside it is now an error too, and a
  malformed summary does not excuse a missing report set. Adopters upgrading will see one fewer
  blocking finding on abandoned packs, and one new one on packs whose summary contradicts their
  contents.
- **`qfai report` counts the test cases `qfai validate` gates.** The gate reads
  every `TC-ID` table plus the heading form (`## TC-0001` + `- Level: L1`); the
  report built its own set from the first table alone and skipped the spec
  outright when that table did not resolve. So a heading-form spec vanished from
  `## TDD Coverage` while `TDDLIST_TC_NOT_COVERED` demanded a ledger row for
  every TC in it, and a TC declared in a second table was gated but never
  counted in `coverage-target TCs:` or `done:`. Both callers now read one
  collector (`core/testCaseCoverageTargets.ts`). A spec with no
  `06_Test-Cases.md` is still omitted from the report rather than printed as a
  zero row.
- **`TDDLIST_UNKNOWN_LEVEL` no longer reports a superseded declaration.**
  `unrecognizedLevels` was filled before the first-declaration-wins guard, so a
  duplicate heading or table row for a TC that already had a `Level` raised the
  warning for a value nothing reads — with a message ("Unrecognized values are
  treated as coverage targets, so every such TC becomes a mandatory ledger
  row") that the guard makes false for exactly that TC. Only the declaration
  actually in force is reported.
- **Every ledger row is checked, not only the ones in the first table.** The
  previous release widened coverage scoring to every schema-shaped table but
  left the checks that make a row trustworthy — `Status` enum, `Test file`
  existence, `Evidence`, `Selector`, `Blocked-By`, the `DR-ID` of a parked row,
  duplicate `TDD-ID`, unknown `TC-Refs` — reading the first table alone. A
  `Status=done` row in an appended `## CHG-…` table therefore cleared
  `TDDLIST_TC_NOT_COVERED` while its non-existent `Test file` and empty
  `Evidence` were never looked at, and full validation passed: the gate accepted
  a completion claim it had declined to check. All per-row checks now read one
  iteration of the ledger, so "does this row discharge a TC" and "is this row
  trustworthy" are asked of the same rows.
  - **Who it hits.** Only a ledger with more than one schema-shaped table.
    Rows there now raise what they always raised in the first table. Measured
    on this repository: 30 further findings, all `warning`
    (26 `TDDLIST_EVIDENCE_STATUS_ONLY`, 4 `TDDLIST_SELECTOR_UNRESOLVED`), all
    in one spec's appended table; `error` stays at 0.
  - `TDDLIST_DUPLICATE_ID` is now ledger-wide rather than per table. An id
    repeated in an appended table was invisible, and
    `TDDLIST_EXCEPTION_PARKED` keys its per-row waiver on the `TDD-ID` — so one
    approved `match.dl_ids` entry silently covered a second row nobody
    approved.
  - `TDDLIST_INFO` ("No active items") is keyed on the whole ledger. It was
    keyed on the first table, so a file whose first table is a bare header and
    whose `## CHG-…` table holds every row — the shape `/qfai-implement`
    produces — was reported as empty while it was being worked.
- **A fenced or commented-out table is no longer read as the ledger.** Check 2
  took the first Markdown table in the _raw_ file while the coverage reader
  masks non-spec regions, so a `tdd/test-list.md` whose only schema-shaped table
  sat inside a fence failed open in both directions at once: the row checks ran
  against rows inside the fence, and the coverage check — guarded by
  `if (coverageTables.length > 0)` — skipped itself entirely in the one case
  where every TC is certainly uncovered. With L1/L2 out of `QFAI-ATDD-112` that
  made a copy-paste template a complete substitute for a ledger under
  `validate --profile full --fail-on error`. Such a file now raises
  `TDDLIST_TABLE_MISSING` (`error`) plus `TDDLIST_TC_NOT_COVERED` naming the
  ids that owe a row, the same pair an absent file already raised. A real table
  sitting below a fenced sample is now read correctly rather than being
  shadowed by the sample.
- **`qfai report` lists every parked row `qfai validate` names.** Sharing one
  "can this row carry coverage" predicate between the two commands put the
  report's `- exception rows:` block behind it too, so a `Status=exception` row
  on an `API` or `E2E` layer was dropped from the report while
  `TDDLIST_EXCEPTION_PARKED` still named it — the two commands disagreeing about
  one row, which is the defect the shared reader exists to remove. The two
  questions are separate now: `isLedgerRow` ("is this an entry at all", i.e. does
  it carry a `TDD-ID`) governs the roll-call, and the narrower
  `isCoverageBearingRow` still governs the arithmetic, so an `API`/`E2E` row
  appears in `- exception rows:` without discharging any TC. Projects carrying
  parked API/E2E rows will see them in `qfai report` again.
- **One list of the layers a `TC-*` may not sit on.** `tddList.ts` and
  `tddHelpers.ts` each held a private `["api", "e2e"]`, so the rule that rejects
  the placement (`TDDLIST_OBLIGATION_LAYER_MISMATCH`) and the rule that declines
  to score coverage from it read different copies of their own vocabulary. They
  are one exported `TC_FORBIDDEN_LAYERS` now, on the same terms as
  `UNIT_COMPONENT_LAYERS`: a layer cannot be added to the rejection and left out
  of the arithmetic. No behaviour changes — the two sets were identical.
- **A ledger row is checked the same wherever in the ledger it sits.** Widening
  the coverage reader to every ledger table left the row checks on the first
  one, so `TDD-ID = x` / `Layer = bogus` produced `TDDLIST_INVALID_ID` +
  `TDDLIST_UNKNOWN_LAYER` in the first table and **no finding at all** in an
  appended one — while clearing `TDDLIST_TC_NOT_COVERED` from both. With L1/L2
  out of `QFAI-ATDD-112` that turned "the ledger picks the obligation up" into a
  claim one meaningless cell could falsify with nothing on screen to say so.
  `TDDLIST_INVALID_ID`, `TDDLIST_UNKNOWN_LAYER` and
  `TDDLIST_OBLIGATION_LAYER_MISMATCH` now run on every table coverage is scored
  from.
  - **What is new is the diagnostic, not the verdict.** The same row already
    counted as coverage in the first table, at `warning`. Refusing to count it
    would instead escalate `TDDLIST_UNKNOWN_LAYER` into an unwaivable `error`,
    against the reason it is a warning — ledgers written before the enum existed
    carry project-specific layer names — and would make a typo stricter than the
    known-but-wrong layer beside it, which
    `TDDLIST_COVERAGE_LAYER_MISMATCH` stages with an announced window.
  - **Who it hits.** Only a ledger with more than one schema-shaped table. A
    row there that is malformed, or carries `TC-Refs` on an `API`/`E2E` layer,
    now raises what it always raised in the first table — including one `error`
    for the forbidden placement. Findings outside the first table are labelled
    `ledger table N, row M` — the ordinal counts _ledger_ tables, so the shipped
    template's `## Schema` documentation table does not shift it; a single-table
    ledger keeps the `row M` label it had. The
    status, evidence, transition, duplicate-id and test-file checks read every
    ledger table too. Splitting them — coverage over all tables, execution
    state over the first — was a fail-open in two halves: a `Status=done` row
    in an appended `## CHG-…` table cleared the coverage obligation while its
    non-existent `Test file` and empty `Evidence` were never looked at, so the
    gate accepted a completion claim it had declined to check. **Upgrading a
    multi-table ledger can therefore surface new errors on rows that were
    never validated before.**
- **An incomplete later ledger table is reported instead of dropped.**
  `collectLedgerTables` admits only schema-complete tables, so an appended
  `## CHG-…` section that mistyped one header contributed nothing: its rows
  vanished from the gate and from `qfai report`, and a `done` row in the first
  table read as the whole story while the follow-up work sat in a table nobody
  looked at. A table carrying `TDD-ID` and `TC-Refs` is a ledger attempt, and
  a missing column in one is now `TDDLIST_REQUIRED_COLUMN_MISSING`. "Ledger
  attempt" is **either** test, because neither alone is enough: `TDD-ID` and
  `TC-Refs` together say "ledger" whatever else is absent, and six of the eight
  required columns say it for a table that mistyped one of those two. Markers
  alone miss a mistyped marker; a count alone misses a five-column table that
  keeps both. A documentation table beside the ledger passes neither, so the
  shipped template's own `## Schema` table stays out. `qfai report` treats an unreadable ledger table the same way
  it treats an unreadable first one: no counts, and the reason printed instead.
- **A broken `## Test Case Table` is unresolved even beside heading-form TCs.**
  One readable `## TC-NNNN` heading discarded the failure, so a document with
  both shapes and a mistyped `TC-ID` header lost that table's TCs entirely:
  no level, no coverage target, and no `TDDLIST_TC_TABLE_UNRESOLVED` — while
  `collectShortIds` still saw them declared, so ATDD asked for the default
  integration annotation and full validation passed on a test at the wrong
  layer. A spec that has no such section is still not a fault.
- **A malformed `TC-Refs` value discharges nothing.** `resolveParentTcId`
  strips the last segment, so an over-long `TC-0001-0001-0001` resolved to the
  real `TC-0001-0001` and cleared its obligation — while Check 5 skips a token
  that fails the `TC-*` shape rather than reporting it, so nothing named the
  typo either. Only a well-formed reference is counted or resolved — in `qfai
report` as well, which was computing `done: 1 / open: 0` from the same
  malformed cell the gate was reporting as uncovered.
- **A ledger row whose `Layer` is blank or `-` no longer discharges a TC.** Every rule that
  would police the placement keys on that cell and skips when it is empty —
  the enum check, the forbidden-layer test, the `Level`/`Layer` crosswalk — so
  a row carrying an id and a `TC-Refs` and nothing else cleared
  `TDDLIST_TC_NOT_COVERED` with no test behind it and no rule able to say so.
  An unknown but real `Layer` still counts, as before: that is a project's own
  vocabulary and `TDDLIST_UNKNOWN_LAYER` names it. A blank cell and `-` are not
  vocabulary — the enum check treats both as the same "no claim" placeholder and
  skips them, so a row carrying either is exempt from every placement rule.
- **The counts are omitted, not zeroed, when coverage cannot be assessed.**
  `report --format json` serializes the spec object verbatim, so hiding the
  numbers in the markdown formatter alone left machine consumers reading
  progress computed from rows the validator never accepted.
- **`qfai report` states when coverage cannot be assessed, instead of printing
  zero.** A report is an audit artifact and `0 done / 0 open` is a claim: it
  says the spec owes nothing. Printed for a spec whose `06_Test-Cases.md` has
  no readable `TC-ID` table (`TDDLIST_TC_TABLE_UNRESOLVED`), or whose ledger's
  first table is missing required columns — where `validate` stops at Check 3
  and checks nothing else — that claim is unfounded, and beside a failing gate
  it reads as the gate being wrong. Those specs now print
  `coverage cannot be assessed: <why>` and no counts.
- **The parked-row roll-call no longer depends on the coverage set or on a
  well-formed id.** A spec whose TCs are all L3-L5 ended before the ledger was
  read, so `qfai report` showed it with no `exception` rows while
  `TDDLIST_EXCEPTION_PARKED` was listing them; and a first-table row with an
  empty `TDD-ID` was dropped by the report while the gate reported it by
  position. Both readers now share one row-shape rule.
- **Two headings for one test case resolve to the first, on both sides.**
  `collectTcLevels` wrote every heading pair into the map, so the _last_
  duplicate heading won there while the ledger gate kept the first — a TC headed
  `L1` and then `L3` was excluded from `QFAI-ATDD-112` by one collector and
  claimed by `TDDLIST_TC_NOT_COVERED` by the other, owed twice for one
  declaration. Both collectors are first-seen now, matching what the table
  reader and the scaffold parser already do, so either order leaves exactly one
  gate owning the TC. A heading block with no `- Level:` line declares nothing
  and no longer consumes the slot.
- **A blank `Level` is released by the first explicit one.** An unstated `Level`
  classifies as a coverage target so the TC cannot
  fall out of the only gate L1/L2 have — but a row that says nothing must not
  outrank a later row that says `L3`. The ATDD collector ignores a blank cell
  and takes the `L3`, so a TC whose first table row had a blank `Level` (or
  whose first table had no `Level` column) owed `QFAI-ATDD-112` **and**
  `TDDLIST_TC_NOT_COVERED` together, failing full validation on a spec that was
  correct. Ids admitted by the fallback are tracked and dropped when a later
  explicit `Level` says they are not coverage; a later explicit _coverage_
  `Level` replaces the recorded blank, so the `Level`/`Layer` crosswalk reads
  what the spec states. A TC that nothing later contradicts still stays a
  coverage target — the fallback itself has not moved.
  - **Known residual: a TC that declares no `Level` anywhere is still owed by
    both gates.** `classifyCoverageLevel("")` is a coverage target, so it owes
    a ledger row; `collectTcLevels` records no level for a blank cell and
    `resolveAtddHomeKind(undefined)` routes to `tests/integration/**`, so it
    also owes `QFAI-ATDD-112`. That is not an oversight — narrowing either side
    would drop an undeclared TC out of a gate, and the fallback exists because
    an unstated `Level` must not silently leave L1/L2 ungated. It is written
    down here because the fix above removes the case where a _later_ row
    contradicts the blank, and it would otherwise read as removing all of them.
    Declare the `Level` and exactly one gate owns the TC.
- **`qfai report` reads the ledger `qfai validate` reads.** `collectTddCoverage`
  parsed the first Markdown table in `tdd/test-list.md` while the gate scores
  every table carrying the ledger schema, so a `done` L1/L2 row in an appended
  `## CHG-…` section passed validation and was printed as missing and open. A CI
  progress figure that contradicts the gate blocking the same branch is worse
  than none. Both now call one reader in `core/tddHelpers.ts`, which also masks
  fenced templates and commented-out tables out of the report and applies the
  same "is this a row that can carry coverage" rule (`TDD-ID` present, `TC-Refs`
  not on an `API`/`E2E` row). Report figures may move for a ledger with appended
  tables, a fenced template, or `TC-Refs` on an `API`/`E2E` row.
- **`qfai atdd scaffold`'s skip guidance follows `paths.testsDir`.** The message
  naming where an L4/L5 test case belongs was pinned to `tests/api/**` /
  `tests/e2e/**` while the writer and the ATDD scan both follow the configured
  directory, so a project that relocated `testsDir` was sent somewhere no gate
  reads and could not clear `QFAI-ATDD-112` by doing as it was told.
- **`QFAI-ATDD-105` no longer asks for an L1/L2 annotation to be moved.** The
  legacy `tests/atdd/**` probe listed every annotated file, and the finding's
  advice is "move it into integration / api / e2e" — wrong for a file carrying
  only Unit/Component annotations, which owe no ATDD directory at all and which
  `catalog/test-layers.md` says are not misplaced wherever they land. Following
  it walked the project back into the all-integration collapse the exclusion
  undoes. Only a file whose every annotation is provably outside ATDD goes
  quiet: one `US-*`, `CON-API-*` or `CON-DB-*` reference, or one `TC-*` with an
  unknown or absent `Level`, still names the file.
- **The npm README states the routing the package ships.** `README.md` is in
  `package.json#files`, so it is the npm landing page, and it still carried the
  pre-`Level`-routing rules: every `TC` annotated in `tests/integration/**` and
  a blanket ban on `TC` in `tests/api/**` / `tests/e2e/**`. A reader arriving
  from npm duplicated L1/L2 into integration and could not place an L4/L5
  annotation in the home the validator requires. It now carries the routing
  table, the L1/L2 exclusion and the gate that replaces it, and says the
  directories follow `paths.testsDir`.
- **`tdd/test-list.md` is now required for a spec that declares a
  coverage-target TC.** This is an escalation from warning to error, announced
  here because it is one. The file used to be optional for every spec: an
  absent one raised `TDDLIST_MISSING` (`warning`) and the validator returned.
  With Unit and Component out of `QFAI-ATDD-112` (below) that early return
  became the last hole — a spec with declared L1/L2 TCs, no tests and no ledger
  passed `validate --profile full --fail-on error` on a `warning` and an `info`.
  An absent ledger now also raises `TDDLIST_TC_NOT_COVERED` (`error`), naming
  every coverage-target TC it leaves without a row.
  - **Who it hits.** Only a spec that declares at least one coverage-target
    `Level` — `L1`/`L2`/`Unit`/`Component`, an unrecognized value, or no
    `Level` column at all — _and_ has no `tdd/test-list.md`. A spec whose TCs
    are all L3-L5 keeps the warning and gains no error; a spec that already has
    a ledger is unaffected, and the escalation is per spec, not per project.
  - **It is not waivable, and it is clearable.** `QFAI-WAIVER-002` refuses
    every waiver on an `error` rule, so the exit is to seed `tdd/test-list.md`
    with one row per coverage-target TC (`/qfai-sdd` Phase 2b) and run
    `/qfai-implement`. That is the same exit the rule has when the file exists;
    nothing new becomes unsatisfiable.
  - `TDDLIST_MISSING` now states which of the two cases the spec is in and
    names the error that follows, so the escalation is visible in the run that
    first reports it rather than only in these notes. The shipped `/qfai-sdd`
    reference (`references/spec-traceability-rules.md`) said unconditionally
    that a missing ledger is a warning, which told the author the gap was
    non-blocking; it now states the condition.
- **`catalog/test-layers.md` says what happens to a multi-valued `Level` cell.**
  It called `L3/L5` illegal and then claimed "nothing consumes it and no
  validator can route it" — the opposite of the shipped behaviour, in the file
  that is the SSOT for it. `QFAI-ATDD-112` routes such a cell to the same
  default a TC with no `Level` gets (`<testsDir>/integration/**`) and keeps the
  obligation, and `TDDLIST_UNKNOWN_LEVEL` (`warning`) names the cell while the
  TC stays a coverage target. Both are written down now, with the only fix
  (split the row) and an explicit statement that nothing normalizes such a cell
  to one of its own halves — a consumer project had recorded exactly that
  invented normalization as a fact about a spec value it never held.
- **One `Level` predicate, one normalization.** `resolveTcHomeKind` matched
  `NO_ATDD_OBLIGATION_LEVELS` against the raw map value, the exported
  `isOutsideAtddObligation` matched a trimmed and lower-cased one, and
  `qfai atdd scaffold` carried a third set with a third inline normalization —
  one question with three answers, inside the routing whose whole purpose is
  stopping two rules from disagreeing about one cell. All three now call
  `resolveAtddHomeKind`, which owns the normalization. The level table is a
  `Map` rather than an object literal, so a `Level` cell spelled `constructor`
  or `__proto__` no longer resolves to an inherited `Object.prototype` value:
  that made the TC uncounted where it was annotated **and** reported as
  forbidden there — two errors from one correct placement, on a cell whose only
  fault was a typo. The Unit/Component word list is now one list rather than
  two: the ATDD side imports `UNIT_COMPONENT_LAYERS` instead of restating its
  members, since the levels ATDD stops owing have to be exactly the levels the
  ledger starts owing, and a spelling in one set and not the other is a `Level`
  owed by no gate at all. A test pins that property at the predicate level, so
  it survives the constants being split apart again.
- **First declaration wins between two tables, not only between two shapes.**
  The heading-wins fix below settled a heading disagreeing with a table row; two
  tables inside `## Test Case Table` still disagreed. The non-coverage branch
  `continue`d without recording the id, so a TC declared `L3` by an earlier
  table and `L1` by a later one was claimed by the ledger gate as well as by
  `QFAI-ATDD-112`, which reads the `L3` — the same two-gates-disagree failure
  one level down, and the one an L1/L2 TC can no longer afford now that exactly
  one gate is meant to own it. A levelled id is recorded whether or not it is a
  coverage target, so the first declaration wins in both directions.
- **`catalog/test-layers.md` describes the routing the validator performs.**
  The "Annotation routing" section still said the derived `Level` does not move
  the annotation, that every `TC-*` is answered from `tests/integration/**`, and
  that a `TC-*` in `tests/api/**` or `tests/e2e/**` is rejected outright — the
  pre-`Level`-routing rules, two paragraphs above the L1/L2 exclusion that
  contradicts them. A reader following it duplicated L1/L2 into integration and
  misplaced L4/L5. It now carries the routing table the gate implements, and the
  crosswalk paragraph above it agrees. The section anchor changed to
  `#annotation-routing`.
- **A coverage row needs a `TDD-ID`, and the heading form wins over a table
  row.** Requiring the ledger schema of a later table left two ways through: a
  line under a complete header that fills only `TC-Refs` cleared the obligation
  with no item behind it (and its blank `Layer` slipped past both the E2E/API
  exclusion and the `Level` crosswalk), and a TC declared `L3` by its heading
  and `L1` by a table row picked up a ledger obligation on top of its
  `QFAI-ATDD-112` one — the two gates disagreeing about one TC.
- **`qfai atdd scaffold` skips `L4`/`L5` TCs as well.** The writer is
  integration-only, so their skeleton landed in a directory their declared
  `Level` does not name: uncounted towards api/e2e coverage and reported as a
  forbidden reference by `QFAI-ATDD-123`. Skipped TCs are named on stderr with
  what to do instead.
- **The forbidden-reference bullet is `Level`-relative, not a blanket ban.** It
  said `tests/api/**` and `tests/e2e/**` "must not carry `TC-*` annotations",
  so a reader left an L4/L5 TC uncovered: the validator requires the annotation
  in the directory the TC's own `Level` names. The re-filing advice — a `TC-*`
  should not be at L4/L5 at all — stays.
- **Coverage counts real ledger rows only.** The multi-table scan read the raw
  file and accepted any table with a `TC-Refs` column, so a fenced template or a
  commented-out old table in `test-list.md` counted a TC as covered, and a stray
  two-column table headed `TC-Refs` cleared the obligation with no `TDD-ID`, no
  `Layer` and no `Test file` behind it — clearing the only `error` that still
  owes an L1/L2 TC. Non-spec regions are masked first, and a table must carry the
  full ledger schema to contribute.
- **The two TC readers now read the same tables.** `collectTcLevels` scanned
  every table in `06_Test-Cases.md` while `resolveTestCaseTables` reads the
  `## Test Case Table` section, so an illustrative table above the heading won
  under first-declaration-wins: an example row saying `TC-0001 | L1` excluded
  the TC from `QFAI-ATDD-112` while the section-scoped ledger gate read the
  real `L3` row and did not claim it either. Both now read through
  `resolveTestCaseTables`, which also leaves a mistyped `tc-id` header owed by
  both gates instead of neither.
- **`qfai atdd scaffold` skips Unit and Component TCs.** It wrote a skeleton
  into `tests/integration/<spec-id>/` for every TC, which for an L1/L2 TC is
  the annotation the same skill forbids and that `QFAI-ATDD-112` no longer
  counts — so filling it in discharged nothing. Skipped TCs are named on
  stderr; a spec whose TCs are all L1/L2 exits 0 saying nothing was in scope,
  which is distinct from the exit-1 no-Test-Case-entries case.
- **`QFAI-ATDD-112` no longer demands an annotation for a Unit or Component
  TC.** `LEVEL_TO_TEST_KIND` had keys for `l3`/`l4`/`l5` and none for
  `l1`/`l2`, so `resolveTcHomeKind` fell through its `?? "integration"` case —
  the fallback meant for a spec with _no_ `Level` column — and every declared
  L1/L2 TC was reported as uncovered in `tests/integration/**`. That is not
  their home: `catalog/test-layers.md` gives L1/L2 no mandated directory and
  `qfai-atdd/SKILL.md` puts Unit and Component out of its scope. Since the rule
  is `error` and `QFAI-WAIVER-002` refuses waivers on `error` rules, a project
  that filed unit tests where the layer policy says to had **no exit** — the
  only validator-clean path was duplicating every annotation into
  `tests/integration/**`, which is the all-integration collapse the same
  catalog lists as an anti-pattern. Measured on one consumer repository: 263
  findings, 255 L1 + 8 L2, zero L3, against 483 TCs all correctly annotated.
  L1/L2 stay gated by `tdd/test-list.md` / `TDDLIST_TC_NOT_COVERED` under
  `/qfai-implement`, the stage that owns them. The no-`Level` default is
  unchanged, and an L1/L2 annotation that happens to sit in a scanned directory
  is not reported as forbidden either — the routing rule and the forbidden rule
  have to agree.
  - **What the exclusion adds to the output.** A silent exclusion is
    indistinguishable from a scan that found nothing, so it is stated in three
    places a consumer may already parse. `QFAI-ATDD-117` is a new `info` finding
    naming every excluded TC in `refs` — a code that did not exist before, so a
    consumer keying on rule codes will meet it on upgrade. `summary.json` gains
    `excludedUnitComponentTc` (rendered under Deferred Coverage in
    `summary.md`), because `missing.tc: []` alone reads as "ATDD covers every
    TC". Neither is an `error` and neither changes an exit code.
  - **`D-SCAFFOLD-PLACEHOLDER` stops blocking on Unit and Component too.**
    `qfai atdd scaffold` did not route by `Level` before this release, so an
    upgrading project can already hold an unfilled L1/L2 skeleton under
    `tests/integration/**`, and an unfilled one escalates to `error` in
    `--profile atdd|full`. Left alone, the release would have traded
    `QFAI-ATDD-112` for that — the same unwaivable block under a second code.
    The validator reads the spec's declared levels and skips TCs outside the
    ATDD obligation, through the same `isOutsideAtddObligation` the routing
    uses, so the two rules cannot disagree about one cell.
- **`TDDLIST_TC_NOT_COVERED` now reads the whole ledger and the whole spec.**
  Two gaps surfaced once L1/L2 depended on this gate alone. Coverage was scored
  against the _first_ table in `tdd/test-list.md`, so a ledger that appends a
  per-change-request section with its own table reported every TC those later
  tables cover as uncovered. And the known-TC set was seeded from heading-form
  `- Level:` pairs, so a `## TC-NNNN` block declaring no `Level` counted as
  undeclared and its own ledger row became a `TDDLIST_UNKNOWN_REF`. A `TC-*` on
  an E2E/API row still does not count towards coverage, wherever that row lives.
- **`references/execution-ledger.md` is the only place the ledger's transition
  table is stated.** `qfai-implement/SKILL.md` summarised it four times and
  three of those summaries claimed the re-entry set was a single edge
  (`refactor` -> `red`), so `blocked` -> `todo`, `exception` -> `todo` and the
  reviewer loop read as illegal to anyone working from the skill — including the
  `project_memory` line, which is the one most likely to be quoted into a
  delegated work order. The summaries now state the forward spine, name the
  reference as the complete list, and say outright not to infer an edge's
  absence from them. `TDDLIST_EXCEPTION_PARKED` cites the same anchor and says
  its `exception -> todo` remediation needs no Change Request **when the row's
  approved obligation is unchanged**, which is what an operator could not tell
  from the skill alone. When the investigation finds the obligation itself was
  wrong, that is an upstream change: the row re-enters through the approved
  Change Request reset under the Drift Protocol instead.
- **The Coverage Depth Matrix has a committed home.** `/qfai-atdd` gates
  completion on it three times — Mandatory Output 2, a Definition-of-Done
  condition and a Not-done criterion — and `qa-gatekeeper` REVISEs when it is
  absent, but nothing said where it goes. The only file the skill mandates
  writing is `.qfai/evidence/atdd-<spec-id>.md`, whose eleven Required sections
  had no slot for it and which the managed `.gitignore` block ignores, so the
  judgement that discharges those gates — why a given `❌` cell is acceptable —
  was guaranteed never to reach a commit, and "unjustified ❌" was unfalsifiable
  for every later reader. The matrix and its per-`❌` justifications now go to
  `.qfai/evidence/coverage-depth-<spec-id>.md`, negated in the managed block
  alongside Change Requests and decision records; the stage evidence file gains
  a section that links to it and carries the totals. `qa-gatekeeper` treats a
  matrix that exists only inside the ignored stage evidence as a missing matrix.
  Existing projects pick the negation up on the next `qfai init`; no ignore line
  is removed, so nothing previously tracked becomes untracked.
- **A governance negation is checked against real gitignore globs, and against
  the whole file.** Git applies the last matching pattern, so a negation is
  effective only when no ignore line below it matches the same path — and both
  checks got that wrong. The root check read the managed block alone, so a
  project rule appended _after_ the block (`.qfai/evidence/*.md`) won while the
  check called the negations effective and returned early. The leaf
  `.qfai/evidence/.gitignore` check compared string prefixes, which sees `*` and
  `.qfai/evidence/*` but not `*.md` or its double-star form — the patterns that
  match `coverage-depth-*.md`, `decision-*.md` and `change-request-*.md`
  exactly. Both now use one matcher that implements the anchoring, directory
  and star rules, over the whole file. The repair itself was already correct;
  only the detection short-circuited it.
- **A duplicated managed block no longer loses the lines only its later copy
  carries.** A past duplicate-append bug left some projects with two blocks
  separated by their own entries. `removeManagedBlock` strips all of them but
  the rebuild read only the first, so a line living exclusively in the later
  block — `.qfai/state.json`, for one — was deleted and never written back, and
  local run state became committable on the next `qfai init`. The blocks are
  merged in document order before the rebuild and collapse to one.
- **Re-init no longer resurrects an ignore line a project deleted.**
  `ensureRootGitignoreEntries` rewrote the managed block from the canonical list
  whenever its freshness check failed — and shipping a new governance negation
  is exactly what makes it fail. A project that had removed `.qfai/evidence/*`
  to track its own audit trail got that line back from the very release meant to
  widen tracking. **Every** block now keeps its own ignore lines and only gains
  the governance negations it is missing — a block still carrying retired lines
  is not migrated wholesale either, because age and intent cannot be told apart
  from the file and a project can carry a retired line _and_ have deleted
  `.qfai/evidence/*` on purpose. Retired lines are dropped, one has a named
  successor, and no ignore line is ever re-added. A project with no managed
  block still gets the full canonical one. If you deleted a line you now want
  back, add it to the block yourself; `qfai init` will preserve it.
- **`qfai init` migrates a legacy `.qfai/evidence/.gitignore`.** Earlier
  versions wrote a per-directory ignore whose first line is `*`. Git applies the
  deepest matching file, so that `*` beat every root-level negation and the
  governance records — Change Requests, decision records, and now the Coverage
  Depth Matrix — stayed ignored however correct the managed block was. The
  leaf negations are appended to that file when it exists; nothing else in it is
  touched.
- **`qfai init --force` regenerates `assistant/agents`, not only
  `assistant/skills`.** Every other `.qfai/**` path is create-only, so a
  correction to an agent definition reached new projects and nobody else — an
  installed repository kept the old reviewer instructions with no command that
  would update them. `agents/` is generated in the same sense `skills/` is.
  **`assistant/manifest/` is not touched at all**, `agent-catalog.yml`
  included: `qfai-configure` is the shipped entrypoint for editing those
  declarative manifests, so forcing the catalog would replace a taxonomy
  adjustment made through the supported path, and nothing migrates it back —
  `--upgrade-assistant-tree` deliberately does not walk `manifest/`. The cost
  is that `agent-catalog.yml#developer_instructions` can drift from
  `assistant/agents/*.md` in an installed project; drift is visible and
  repairable, a silently overwritten taxonomy is neither. `specs/`,
  `contracts/` and `steering/` stay create-only.

### Added

- **`qfai doctor --autoremediate` writes both halves of the legacy migration**
  — the `.legacy-packs` record _and_ `revision_form: "legacy"` in each pack that
  declares no form. The validator relaxes only when both agree, so writing the
  record alone left every pack a blocking `QFAI-REVIEW-007`: the state the
  migration exists to clear. It refreshes the managed `.gitignore` block first,
  because an existing repository still carries the older one, whose
  `.qfai/review/*` would keep the record out of every commit and leave every
  legacy claim uncorroborated in CI and in the next clone.
- **`qfai doctor --autoremediate` records the review packs that predate
  `revision_form`.** Without it, taking a version that requires the marker turns
  every pack already on disk into a blocking `QFAI-REVIEW-007` — a repository
  that keeps its review history fails `--fail-on error` on adoption, for a
  condition no producer can go back and fix. The migration is additive and
  idempotent: a repeat run is a no-op, a name recorded by hand is never dropped,
  and a pack that forgets its marker _after_ the migration is still an error.

### Fixed

- **The short-circuit is decided per tree, because the readers differ.** The
  skills tree is `readdir`ed, so a regular file where the directory belongs
  raises `ENOTDIR` and takes the run with it; the agents tree is not — each
  document is opened by path and the same shape reads as absence. Treating both
  alike stopped `full` on damage nothing walks into. What does stop the agent
  reader is the _document_ being the wrong type or unreadable, and that is what
  is recorded now.
- **A nested `SKILL.md` decides its own short-circuit.** With only the document
  a symlink, the parent directory is healthy — so the answer inherited from it
  was "keep going", while `validateSkillDocReferences` opened the same pathname
  and got `ELOOP`.
- **An unreadable canonical agent stops the profiles that route agents.**
  `validateAgentDefinition` confirms the file exists and then reads it, so an
  ACL ended the run and took the repairable finding with it.
- **A retired-wrapper candidate is read to the ceiling and confirmed at EOF.**
  Reading only the size just measured returned a prefix, so an append through an
  fd held from before the `fstat` could leave a canonical-shaped target matching
  — and the finding tells the operator to delete the file.
- **The absent-wrapper branch asks the same question as every other.** It
  checked link and type only, so with all four wrappers for a skill deleted a
  canonical that was unreadable, or reachable only through a resolving symlink,
  passed clean — and the profile then read the same document and ended the run
  on its own error. There is one helper now, and one place that decides the
  short-circuit.
- **A document whose type a later `readFile` cannot survive stops the run.** A
  `SKILL.md` that is a cycle, a directory or a FIFO gives
  `validateSkillDocReferences` an `ELOOP` / `EISDIR` — or blocks it — taking the
  repairable finding with it. Absence does not: every validator handles a
  missing file, so "has no SKILL.md" is still reported and still lets the rest
  of the profile run.
- **A non-file canonical agent stops the profiles that read it.**
  `validateAgentDefinition` opens the agent pathname directly and runs under
  `prototyping` / `saas-package` / `full` / `verify`, none of which the
  skills-only short-circuit covered.
- **The restored mode comes from the handle the content was read on.** A `stat`
  on the pathname and a read on another inode could disagree, so content a
  process had just made `0600` was restored under the `0644` the old entry
  carried — readable by everyone — and the sidecar removed straight after.
- **The canonical state is read before the link problem, so every answer
  carries the short-circuit.** A wrapper that was flattened _and_ whose skills
  root is a regular file reported the ancestor without marking it unwalkable,
  and the profile then walked into the same `ENOTDIR` the finding was about.
- **A broken wrapper's canonical is checked for readability too.** An ACL or a
  mode that keeps the document shut is not repaired by `qfai init` — the copy is
  create-only — so reporting the wrapper alone had the operator re-run it and
  learn nothing. An unreadable document also stops the profile:
  `validateSkillDocReferences` re-throws its own `readFile` error, which would
  take the finding down with it.
- **A damaged integration directory is not enumerated for retired wrappers.**
  When it is a symlink that resolves, `readdir` follows the redirect and lists
  somebody else's tree — and the remedy printed for a retired wrapper is "delete
  the path", which through that redirect deletes a file outside the project.
- **The restore's copy is a bounded read of the inode it measured.** A ceiling
  checked by `stat` and a read taken by pathname are two operations on two
  possibly different inodes, so a sidecar replaced between them was read
  unbounded anyway.
- **A create-only copy treats a dangling symlink at the destination as
  occupied.** `access` follows the link, so a dangling one answered "free" and
  `copyFile` then wrote _through_ it — resolving the symlink and creating its
  target — which turned `qfai init` into a writer of fixed content at whatever
  path the link named, including one outside the project.
- **A restore that cannot carry the mode takes its destination back out.**
  Reporting a wrong-permission restore while leaving it in place fixes nothing:
  a `0600` file put back as `0644` is readable by everyone. The fallback created
  it exclusively, so it is removed, and the sidecar keeps both the content and
  the permissions.
- **The short-circuit does not reach a sibling of the skills directory.**
  `validateSkillsIntegrity` and `validateAssistantAssets` walk the configured
  skills directory, not its parent, so a regular file at
  `.qfai/assistant/agents` stopped `full` on a tree they never open — while a
  missing agent is an ordinary finding rather than an exception.
- **Every wrapper branch checks the canonical, through one helper.** The
  wrong-target branch reported the mismatch and stopped, so `qfai init`
  re-pointed the wrapper, left the create-only canonical as it found it, and the
  operator needed a second run to learn the rest. Three branches diverging on
  which half they checked is what produced that shape three times; they now ask
  the same question the same way, and the answer carries its own short-circuit
  rather than leaving the caller to recover it from a detail string.
- **A per-entry read error is propagated.** A transient `EIO`, or an ACL on one
  entry, was answered "not a wrapper" — leaving a retired wrapper the assistant
  still loads unexamined, the same hole the listing error had one level up. Only
  a race (`ENOENT`) is a clean `null`.
- **The copy fallback is bounded.** It also runs when the bounded probe
  _refused_ the entry, so reading an oversized file whole into memory to copy it
  back was exactly the exhaustion that probe exists to avoid. It refuses
  instead, keeps the sidecar, and says where the content is.
- **A flattened wrapper's canonical is checked for type collisions too.** The
  link check is only one of the two ways a canonical goes wrong: a skill
  directory replaced by a regular file, or an agent document by a directory, is
  a collision it says nothing about — and the create-only copy `qfai init`
  performs fails on it, so the operator was sent to re-run a command that cannot
  succeed with the path at fault never named.
- **A non-directory ancestor is reported as itself, once.** `not-a-directory` on
  a canonical leaf means a component above it is a regular file, so the leaf is
  unreachable rather than damaged. Naming the leaf recorded one finding per
  skill and per agent, each pointing at a path the operator cannot even move
  aside — `ENOTDIR` again — while the one path at fault went unnamed.
- **A listing error is propagated instead of passing silently.** An
  execute-only directory answers every `lstat` on a known wrapper and refuses
  the listing, so swallowing it passed validation with no retired wrapper
  examined at all, while the assistant went on loading them. Only the damage
  already reported elsewhere — `ELOOP`, `ENOTDIR`, absence — is skipped.
- **Only a non-directory component stops the run.** The walks over the
  assistant tree list a directory with `withFileTypes` and descend only into
  `isDirectory()` entries, and they probe the root with an `access` that
  swallows every error — so a symlink, cycle or not, is listed and skipped, and
  a cycle at the root reads as absent. A regular file where a directory belongs
  is the one shape that reaches `readdir` and raises `ENOTDIR`. Treating a leaf
  cycle as unwalkable hid every unrelated finding behind a link the operator had
  to repair first, and the finding now names the component at fault rather than
  the leaf below it.
- **`full` and `verify` follow the configured skills directory.** They pinned
  `.qfai/assistant` while the validators that walk it read `paths.skillsDir`, so
  a project that moved it had the run stopped for damage sitting outside every
  walk it performs.
- **A flattened wrapper no longer hides the canonical.** The two are
  independent, and `qfai init` repairs the wrapper while leaving the canonical
  as it found it — so reporting only the wrapper had the operator clear the
  finding and end with a healthy symlink loading the wrong instructions.
- **A retired wrapper is matched byte-exactly.** Git writes the target for mode
  `120000` with no trailing newline; trimming one off made a project's own
  one-line note indistinguishable from a wrapper, failed every profile, and told
  the operator to delete it.
- **The sidecar is re-read before the cleanup deletes it.** The handle that
  vetted its content closes when the read returns, and a process holding that
  inode from before the rename can append in the window that follows — so the
  delete discarded bytes nothing had seen, with the new symlink standing where
  they had been. Content that changed keeps the sidecar, and says so.
- **The short-circuit tests the paths a profile walks, not its name.** `sdd`
  runs `validateSkillDocReferences`, `validateAutopilotPolicy` and
  `validateStaleReferences`, all of which `readdir` the configured skills
  directory — so excluding it by name left one of them raising `ENOTDIR` /
  `ELOOP` and losing the `QFAI-LINK-001` that names the path and the repair. The
  test is now the intersection of the damaged paths with the ones that
  profile's own validators open.
- **A repair sidecar is not reported as a retired wrapper.** It holds the
  flattened target, so it reads as one, and it exists precisely because a repair
  could not finish — sometimes making it the only surviving copy of the
  original. The remedy printed for a retired wrapper is "delete the path".
- **The moved-aside wrapper is read to the ceiling, not to its measured size.**
  A process holding the inode from before the rename can append after the
  `fstat`; reading only the size just measured took a prefix, which still
  matched the target, so the repair went ahead and the cleanup deleted the
  sidecar with the appended bytes in it.
- **A fallback restore puts the mode back.** `writeFile` creates a new inode
  with the umask and the parent's defaults, so a `0600` file another process
  left at the path came back `0644` — readable by everyone — or lost its
  executable bit, and the sidecar that still carried the metadata was removed
  straight after. A restore that cannot carry the mode keeps the sidecar and
  reports itself as incomplete.
- **The short-circuit stops only the profiles that walk the damage.**
  `unwalkable` names paths under `.qfai/assistant/**`, and
  `validateSkillsIntegrity` / `validateAssistantAssets` are the only validators
  that open that tree — they run under `verify` / `full` alone. `discussion`,
  `sdd`, `atdd` and `tdd` were being stopped for damage none of their own
  validators would have touched, so every independent defect in the spec packs,
  the ledger and the discussion packs stayed hidden until the surface had been
  repaired and the run repeated.
- **`qfai init` leaves a marker inside the tree it owns.** The four README
  markers sit in conventional directories and are written only when the path is
  free, so a project that already had its own at all four ran init and got no
  marker at all — and once every wrapper was deleted the surface read as never
  initialised: nothing checked, every profile passing, and the assistant loading
  nothing. `.qfai/assistant/README.md` cannot be pre-empted (init creates that
  tree) and outlives every integration directory, which is the state the
  evidence is for.
- **A wrapper for a skill or agent this version no longer ships is reported.**
  Wrappers are enumerated from the current roster, so one left behind by a
  shipped document since removed or renamed was enumerated by nobody: it still
  resolves, so the assistant went on loading retired instructions while every
  profile reported a clean surface. `pruneStaleQfaiWrappers` does not reach it
  either — it matches a `qfai-` prefix, and `web-research` is the standing proof
  that a shipped name need not have one. Identified by where the target lands
  rather than by the name, so a flattened checkout is covered too.
- **The short-circuit is decided by the damage, not by the message.** It was
  read back out of the finding's text, which carries a 12-entry sample — so a
  thirteenth entry holding the only unwalkable path decided nothing, a profile
  validator walked into the `ENOTDIR` and the run ended with a stack trace
  instead of the finding that names the path. Each site now records the
  canonical it cannot walk as it sees the errno, and `inspectIntegrationSurface`
  hands that list to the caller.
- **Damage confined to an integration directory no longer stops the profile.**
  `.claude/skills` and its siblings are read by this validator and by nothing
  downstream, so a cycle on one of them breaks no later `readdir` — and
  stopping there hid every spec, contract and test defect sitting alongside it
  until the operator had repaired the link and run again.
- **A wrapper whose canonical is not there yet says why.** Point
  `.qfai/assistant/skills` at an existing empty directory and every wrapper
  under it is `ENOENT`, reported as a plain dangling link. The remedy printed
  for that is "re-run `qfai init`", which writes the canonical _inside_ the
  redirect and leaves the correct wrapper target alone: the finding clears and
  the redirect stays. The ancestor is named first.
- **The moved-aside wrapper is read from the inode it was measured on.**
  Checking it with `lstat` and reading it by pathname are two operations on two
  possibly different inodes: another process replacing the sidecar in between,
  or growing it through an fd held from before the rename, left the read
  unbounded — memory exhausted, or blocked for ever on a FIFO — with the
  original already moved aside and the pathname empty. One `open`, `fstat` on
  that handle, a bounded read from it, shared with the flattened-link probe.
- **Only damage that breaks a walk stops the run.** A canonical redirected by
  a link that resolves is a finding a `readdir` survives, so short-circuiting
  on it hid every unrelated spec, contract and test defect.
- **A bounded read runs to the end.** `read` may return fewer bytes than
  asked for, and the unfilled tail stayed NUL — a correct flattened wrapper or
  the one surviving marker then failed its own signature comparison.
- **Structural damage stops the run after reporting it.** A profile validator
  walking the same tree raises `ENOTDIR` from its own `readdir`, and one
  rejection took the whole run down — losing the only finding that names the
  path and how to repair it.
- **A canonical is checked even with its surface gone.** Gating the branch on
  the wrapper directory existing skipped every canonical check with it, and
  `qfai init` then recreates the wrappers around a canonical it leaves as it
  found.
- **A size ceiling binds the entry that is read.** `lstat` then `readFile` are
  two operations against a name, so a huge file or a FIFO left at the path in
  between was read unbounded — one `open`, `fstat` on that handle, and a
  bounded read from it, with `O_NONBLOCK` so a FIFO answers instead of
  blocking.
- **An ancestor that is not a directory is named directly.** The check
  answered only for symlinks, so a regular file at `.claude` was reported
  through the child `ENOTDIR` keeps the operator out of.
- **A claim that never took anything is released.** A failed `rename` left an
  empty sidecar that prune deliberately skips and the next attempt sidesteps,
  so repeated failures piled them up to the ceiling and refused every later
  repair.
- **The post-move probe is inside the rollback.** By then the wrapper has
  moved, so a permission change or a transient `EIO` there left the pathname
  empty and the original in the sidecar with nothing said about either.
- **A repair sidecar is not pruned as a stale wrapper.** It is named after the
  wrapper it holds, so it matched the `qfai-` prefix — and prune runs first, so
  a `--force` re-run deleted the file an earlier failed repair preserved.
- **A cleanup failure is not a failed repair.** Removing the sidecar sat inside
  the rollback `try`, so an ACL or antivirus hold sent a successful repair down
  the restore path — where the new symlink already occupies the name.
- **Readability is answered by opening the file.** `access(R_OK)` does not
  consult a Windows ACL, so a document an ACL denies read as fine while the
  assistant's own read failed.
- **A broken integration ancestor is reported instead of its child.** With
  `.claude` a cycle, the probe on `.claude/skills` answered cycle too and named
  a path the operator cannot reach.
- **The canonical integrity check does not depend on a wrapper.** With no
  wrapper to resolve through, a canonical, an ancestor or a `SKILL.md`
  replaced by a resolving symlink read as a plain missing wrapper — and
  `qfai init` then creates a wrapper pointing at it, since create-only leaves
  the canonical as it found it. Both branches call one helper now.
- **Every canonical ancestor is searched for damage**, not the immediate
  parent alone: a dangling `.qfai/assistant` leaves the parent answering
  absent too, so one level of checking found nothing.
- **What was moved aside is what gets checked.** The caller's size and kind
  probe covered an inode that may no longer be at the path, so the read ran on
  an entry nothing had vetted — a large enough one exhausts memory, a FIFO
  never returns.
- **The restore writes bytes, not a decoded string.** A non-UTF-8 file was
  round-tripped through a string on the fallback path, replacing what it could
  not decode, and the sidecar was removed straight after.
- **A canonical ancestor is a real directory too.** `.qfai/assistant/skills`
  redirected inside the project follows through to a real leaf, so the leaf
  check passed and both resolved paths landed in the same place.
- **A `SKILL.md` is a real file wherever a link would land**, which is the
  case no resolved-path comparison can see.
- **Proof that init ran outweighs a probe that could not read.** One
  unreadable candidate rejected the whole evidence pass and stopped every
  profile on a project the wrapper beside it already proved initialised.
- **A restore that fails during the read path is reported**, with the sidecar
  named — re-throwing the read error alone made the original look simply lost.
- **A canonical is a real document, not a link to one.** Redirected at another
  skill inside the project, both resolved paths converge and the
  outside-the-project rule is satisfied — while the assistant loads the wrong
  instructions in every profile but `full`.
- **A broken link on the way to a surface is not an absent surface.** A
  dangling `.claude` made the directory answer absent, and a dangling
  `.qfai/assistant/agents` made every document answer ENOENT — reported as
  never taken, with a remedy that cannot create anything through a broken link.
- **Every restore claims the path atomically**, not only the one after a failed
  `symlink`: the two early returns used a plain rename.
- **The marker read is bounded.** A project's own document at one of those
  paths could be any size, and reading it whole to look for three substrings
  cost every profile in proportion to it.
- **The sidecar name is claimed exclusively.** A PID alone is not unique, so a
  second repair in the same process renamed over the file an earlier failed
  one had preserved — and the success path removes the sidecar.
- **A nested `SKILL.md` has to resolve inside the project**, like the
  directory holding it.
- **Ancestors are checked component by component.** Comparing a resolved path
  with a built one reported a sound surface as a symlink wherever the
  filesystem is case-insensitive and the directory was created as `.Claude`.
- **`ENOTDIR` on a marker path does not end the run.** A marker ancestor
  written as a regular file lost the finding the other markers and wrappers
  still had.
- **The restore claims the path atomically.** Checking that it is free and
  then renaming are two operations, and `rename` overwrites — so a file
  created in between was destroyed by the rollback. `link` refuses an existing
  path instead, with an exclusive write as the fallback.
- **A canonical that resolves outside the project is reported.** Replace it
  with a symlink to a readable file of the right kind and both sides of the
  resolved-path comparison follow it to the same external path, so they agree
  while the assistant loads instructions the project does not own.
- **A symlinked ancestor of an integration directory is named.** `.claude`
  pointing at an external tree leaves `.claude/skills` a plain directory, so
  the probe on the directory said nothing while every relative wrapper under
  it resolved against the external location.
- **The verified file is moved aside, not deleted by pathname.** Reading and
  deleting are two operations, so another process could still replace the file
  in between and lose content the check never saw. The repair renames it aside
  first and judges what it holds; nothing is removed until the symlink exists.
- **An integration directory that is a symlink is reported.** The wrappers
  under it carry relative targets, so they resolve against wherever it
  physically is; empty, there were no wrappers to reach the resolved-path
  check and it read as healthy while `qfai init` filled the external location.
- **A wrapper replaced by something other than a file names its kind**, and
  the remedy covers it — `qfai init` preserves a directory or a special file,
  and "inspect the content first" does not apply to a FIFO.
- **An unreadable document has a remedy that changes something.** `qfai init`
  skips both the wrapper (its target string is right) and the canonical asset
  (create-only), so the generic remedy left the operator with a check that
  stops every profile and no way to clear it.
- **A type collision is reported wherever it sits on the path.** An
  integration directory replaced by a regular file raised `ENOTDIR` on every
  wrapper under it, and a canonical ancestor replaced by one did the same on
  the target — both ended the run instead of reporting. An absent wrapper now
  also names what the canonical actually is, which is the state `qfai init`
  cannot repair on its own.
- **A cyclic integration directory is reported, not thrown.** `lstat` on
  every wrapper under it raises `ELOOP`, and propagating that ended
  `qfai validate` with a stack trace instead of a finding.
- **An init marker is matched on a full signature.** One mention of
  `.qfai/assistant/` is what a project documenting its own QFAI tree writes,
  and it made a checkout that never ran init read as initialised.
- **A flattened wrapper is matched byte-exactly.** `path.normalize` accepted
  `../../.qfai/assistant/./skills/<id>` — not what git writes — so a project's
  own note at that path made a checkout that never ran init read as
  initialised.
- **An init marker is `lstat`ed.** `stat` followed the link, so a project's
  own `README.md` pointing at another file that mentions `.qfai/assistant/`
  read as a marker init wrote.
- **Only an entry init itself wrote counts as proof it ran.** These
  directories are conventional and a shipped skill id can be a name a project
  chose, so a project's own `.agents/skills/web-research` made a checkout that
  never ran `qfai init` read as initialised — and its own directory was then
  reported as a broken qfai link, with every other surface reported missing.
- **A broken canonical document is reported, not skipped.** `access` follows
  the link, so a canonical replaced by a dangling symlink answered "absent"
  and its skill left the check altogether; a cycle propagated `ELOOP` and
  ended `qfai validate` with a stack trace.
- **An init marker must be a regular file.** These paths are create-only, so
  whatever the project already had survives; a directory made `readFile` throw
  `EISDIR` and reject the whole probe, losing the finding a valid marker
  beside it would have produced, and a FIFO would block the validator.
- **A wrapper is checked by where it lands, not by what it spells.** The
  target is relative and the wrapper directory can itself be a symlink, so an
  outside tree with a canonical-shaped path at the same offset passed every
  check while the assistant loaded instructions that are not the project's.
- **A rollback no longer overwrites a file created in the gap.** Between the
  removal and the failed `symlink`, another process can create its own file at
  the path — that is what an `EEXIST` from `symlink` means — and the default
  write flag truncated it and put the old flattened content over the top.
- **A backslash spelling is not a flattened link on POSIX.** The separator
  tolerance exists because `path.relative` yields `\` on Windows; applied
  everywhere it made a hand-maintained `..\..\.qfai\assistant\skills\...` match
  the real target and get deleted without `--force`.
- **An agent wrapper names a regular file, not merely a non-directory.** A
  FIFO, socket or device passed `!isDirectory()` and could pass `access(R_OK)`
  as well, so the assistant either failed to read the document or, on a FIFO,
  blocked — with no finding.
- **A cyclic `SKILL.md` is reported, not propagated.** The wrapper target's own
  `ELOOP` was already handled as structural damage; the nested probe re-threw
  it, so `qfai validate` exited with a stack trace.
- **The remedy names the canonical path.** A canonical type collision is not
  cleared by re-running init — the copy is create-only and `--force` fails on
  the collision — so the printed remedy has to say to move it aside first.
- **A wrapper that changed under the check is not deleted.** Between
  `isFlattenedLink` reading the file and the removal, an editor or another
  process can replace it; deleting on the strength of the earlier read
  destroyed that content without `--force`, and the rollback does not fire when
  the symlink then succeeds.
- **The init marker is QFAI's own, not any file at that path.** `.agents/` and
  `.github/agents/` are conventional directories, so a project's own README in
  one of them made `initialised` true and failed every profile of a project
  that never installed QFAI. The marker is the signature `qfai init` writes.
- **`ELOOP` is a broken target, not a crash.** It says the canonical target is
  a symlink cycle — structural damage to the thing this rule inspects — and
  re-throwing it exited `qfai validate` with a stack trace instead of a
  `QFAI-LINK-001` naming the path to repair.
- **A target that resolves can still be unreadable.** `stat` reads metadata,
  which an ACL or a mode can allow while the body stays shut, and the assistant
  loads the body. Both the agent document and a skill's `SKILL.md` are checked
  for read access.
- **The flattened-link probe no longer re-stats what the caller holds.**
  `ensureSymlink` had already `lstat`ed the path; re-probing let `safeLstat`
  turn a transient `EIO` into `undefined`, which reads as "somebody else's
  file" — so init left a flattened wrapper in the reassuring `skipped` list.
- **An initialised project is recognised without any wrapper left.** The test
  was "some wrapper survives", so deleting all of them said init had never run
  and nothing was checked at all — the state where the assistant can load
  nothing passed every profile most confidently. The READMEs `qfai init` writes
  and never removes are the marker.
- **A canonical `SKILL.md` has to be a file.** `access` succeeds on a directory
  of that name too, and the assistant can load that no better than a missing
  one — while the profiles that would notice are `prototyping` and `full`.
- **A canonical type collision has a remedy that works.** `qfai init` skips the
  existing path (create-only) and `--force` fails on `copyFile` / `mkdir`
  against a collision, so the printed remedy could not clear the finding. It
  says to move the canonical path aside first.
- **An integration surface deleted whole is reported.** The populated test was
  per directory, so removing one entirely made every entry in it read as "not
  created yet" and every profile passed while the assistant could load nothing
  from it. Whether init has run is a property of the project, and the missing
  directory is reported once — one `rm -r` is one act, and one ref per shipped
  skill buries that.
- **A wrapper has to resolve to the right kind of thing.** A canonical agent
  document replaced by a directory — or a skill directory by a file — leaves
  the link string correct, so `lstat`, `readlink` and `stat` all succeeded and
  nothing looked further. The agent surface has no other check outside
  `prototyping` / `full`, so the narrow profiles passed an agent tree with no
  markdown in it at all.
- **A wrapper deleted from a populated surface is reported.** An absent wrapper
  was skipped unconditionally, so removing one from a directory whose siblings
  are all in place left the assistant unable to load that skill with nothing
  saying so — the canonical tree is untouched, so `skills.integrity` sees a
  healthy spec, and it only runs under `full`. Absence is benign only while the
  surface is unpopulated, which is also the state of a project that has not
  taken a newly shipped skill.
- **A skill wrapper is checked for the file that makes it loadable.** The link
  can resolve to a directory that still holds `references/` and `templates/`
  while `SKILL.md` is gone; `stat` succeeded and the rule said nothing, and a
  narrow profile passed a skill the assistant cannot load.
- **A `readlink` failure is not a wrong link target.** A transient `EIO` or an
  `EACCES` reported a healthy wrapper as `points at ?`, and the remedy the
  finding prints — re-run `qfai init` — calls the same `readlink` and fails the
  same way. Only an absent link is a link problem.
- **An unreadable wrapper is not somebody else's file.** `lstat` had already
  succeeded, so the file is there and small; answering "not the signature" on
  an ACL or I/O failure put the path in the reassuring `skipped` list and left
  the flattened wrapper in place, with `QFAI-LINK-001` failing and nothing to
  act on. Absence stays benign — that is a race with something removing it.
- **A `stat` failure is not a dangling link.** Every error was reported as
  dangling, including `EACCES` and a transient `EIO` — and the remedy the
  finding prints is "re-run `qfai init`", which leaves the wrapper `skipped`
  because the target string is already correct. That was a `QFAI-LINK-001` an
  operator could not clear by following it. Only an absent target is dangling.
- **Ownership is the shipped roster, without the project intersection.** The
  intersection went one step too far: a shipped skill whose canonical
  `SKILL.md` was deleted by mistake, wrapper still in place, dropped out of
  scope and its dangling wrapper passed every profile — precisely the state the
  rule exists to report. A retired skill is already excluded by not being
  shipped, and a skill this project has not taken yet is skipped by its wrapper
  being absent.
- **The flattened-link match tolerates the separator and nothing else.**
  Dropping `trim()` left `path.normalize`, which widens the same way for a
  different input: `../../.qfai//assistant/x` and `../../.qfai/assistant/./x`
  are not the bytes git writes but normalize to them, so a hand-managed wrapper
  was still deleted without `--force`. Only `\` vs `/` is absorbed, because
  git writes `/` and the target comes from `path.relative`.
- **A rollback that could not write says so.** The restore was wrapped in an
  empty `catch`, so a disk error or permission change during it still produced
  "元のファイルは復元しました" — on the one path where the operator has to know
  the file is gone. The restore's own outcome now decides the message, and the
  content it could not write back is carried in it.
- **`ENOTDIR` is a type collision, not an absence.** It says a path component
  exists and is not a directory — `.claude/skills` written as a regular file.
  Folding it into "not created yet" skipped every wrapper under it and passed a
  surface the assistant can load nothing from. Only `ENOENT` means absent.
- **The template root is identified, not just found.** Candidates were tried
  outermost-first, and from `<project>/node_modules/qfai/dist` the outermost is
  `<project>/assets/init` — a consuming project with an unrelated directory of
  that name became the template root. Wrong-but-present is worse than missing:
  the shipped roster read empty and `QFAI-LINK-001` passed every broken wrapper
  without looking. Candidates are nearest-first now, and each is confirmed by
  sentinels the real tree always has.
- **A hand-managed wrapper is no longer auto-deleted over a trailing newline.**
  The flattened-link signature git writes carries no surrounding whitespace, so
  comparing `content.trim()` matched past it — a regular file someone maintains
  themselves, written by an editor or `echo`, read as flattened and was removed
  without `--force`. The comparison is byte-exact; everything else takes the
  preserve path.
- **A repair that cannot finish restores what it found.** The removal and the
  recreate fail independently — `symlink` raises `EPERM` on Windows without
  Developer Mode, the same condition that flattened the checkout — and the
  wrapper was left _absent_, which `QFAI-LINK-001` treats as benign because a
  project predating a newly shipped skill looks identical. The flattened file
  at least announced itself; it is now put back, and the error says so.
- **`assets/init` resolves from the package's public entry.** `tsup` bundles
  with `splitting: false`, so `dist/index.mjs` sits one level shallower than
  `dist/cli/index.mjs` — a depth the candidate list did not cover. Calling
  `validateProject` through the library entry therefore searched
  `<parent-of-package>/assets/init` and threw `Template assets not found`
  before any validator ran; the CLI was unaffected, which is why it went
  unnoticed. `QFAI-LINK-001` made this reachable by reading the shipped roster.
- **The membership probe propagates a read error too.** `readdir` and the
  wrapper `lstat` were fixed to distinguish absence from failure, but the
  `SKILL.md` probe that decides whether a skill is in the roster still folded
  every error into `false` — dropping the skill, and with it the only canonical
  entry, into the early return that passes a broken surface with no finding.
- **Ownership of an integration wrapper is the roster `qfai init` ships.** It
  was every directory in the project's own canonical tree, but
  `.qfai/assistant/skills/<own>/SKILL.md` is an allowed project-owned location
  and init enumerates what to wrap from the package assets, never from the
  project — so a hand-published `.claude/skills/my-skill` was reported as a
  broken qfai link in every profile. The roster is the shipped set alone — see
  the shipped-roster entry above for why the project intersection was dropped.
- **A failing filesystem no longer reads as a healthy surface.** The roster read
  and the wrapper probe folded every error into "absent", and absent is the
  benign case — an empty roster takes the early return, an absent wrapper is
  skipped. `EACCES` on the canonical tree therefore produced a clean
  `QFAI-LINK-001` pass at exactly the moment the assistant could load nothing.
  Only `ENOENT` / `ENOTDIR` mean absent; everything else propagates.
- **`qfai init --dry-run` no longer reports a repair it did not make.** The
  removal and the recreate are both suppressed under `--dry-run`, but the
  flattened-link log said `repaired` unconditionally — to the one invocation
  whose whole purpose is to preview. It says `would repair` there now.
- **`qfai init` repairs a flattened link instead of skipping it.**
  `ensureSymlink` returned `"skipped"` for any existing non-symlink unless
  `--force` was passed, and skipped paths print as a plain list — so the one
  command that could repair the surface reported the broken entry as preserved
  and changed nothing. The path is one qfai created and owns, and its content is
  the link target, so it is now replaced without `--force` and the repair is
  announced on stdout.
- **The legacy migration classifies once, on the first run.** Re-scanning on
  every `doctor --autoremediate` meant a pack written _after_ the migration that
  forgot its marker was recorded and then marked `legacy` — turning a blocking
  `QFAI-REVIEW-007` into a warning, which is the downgrade the corroboration
  exists to prevent. Once the record exists it is a historical fact; adding to it
  is a visible edit to a governance record.
- **`doctor --format json` stays parseable through the migration.** The
  `.gitignore` helper wrote its progress line straight to stdout, ahead of the
  document, on exactly the adoption path that needs it.
- **`qa-gatekeeper` follows Integration to the ATDD file, with the ownership
  boundary that goes with it.** Its input branch still read Integration evidence
  from the implement file, so P1b / P4b either stopped a correct row for missing
  evidence or audited the wrong one — and the production-path `Satisfied-by` and
  the mutation-scope exception were still `E2E` / `API` only, sending a normal
  branch-2 Integration row to `exception`.
- **An Integration row's `RED test hash` is recomputed at completion.** Item 10
  had already taken Integration into the handoff while the field itself was
  still required and rechecked for `E2E` / `API` alone, so a test or fixture
  edited after the handoff carried stale provenance to `done`.
- **The Integration alignment reaches the two places it had missed.** Phase Red
  step 2 still held back only `E2E` / `API` from `todo -> red`, so an
  Integration row advanced before step 3b could verify its handoff — and the
  next run selects only `todo` and `review-fix`, leaving a `red` row with no RED
  behind it. The mandatory-writer contract, the execution ledger and both
  reviewers' inputs still sent only `E2E` / `API` evidence to the ATDD file, so
  a correct Integration handoff put its provenance in one file and its GREEN,
  refactor pair and verdicts in another.
- **`Layer = Integration` rows are on the same side of the split as their
  tests.** `QFAI-ATDD-112` covers every `L3` TC — and every TC with no declared
  `Level` — from `tests/integration/**`, and `/qfai-atdd`'s P4 writes those
  tests; but the ledger handoff named only `E2E` and `API`. `/qfai-implement`
  therefore treated them as self-owned and demanded a fresh RED for a test
  already made green, so the row either grew a duplicate test or went to
  `exception` as an unexpected pass. The provenance, the handoff and the
  evidence home now follow the same three layers.
- **`implementation-reviewer` is given the subject it hashes.** It records its
  own `Audited evidence hash` over the row's phase-authored fields, and those
  live in an evidence file the diff of changed files does not carry — so without
  the ledger and the evidence home the row's `Layer` selects, the hash goes
  missing and gate items 10-11 stop, or the orchestrator computes it and breaks
  the one rule that makes it worth having.
- **The evidence-shape table lists every field the consumer gate requires.**
  `RED test hash` and its manifest were missing from the observed-RED branch,
  and those plus `Falsifiability revision` and the `qa-gatekeeper` PASS from the
  falsifiability one — so a producer following the canonical table wrote a
  handoff `/qfai-implement` rejects as malformed, and P1c / P4b could not
  complete.
- **The item-cycle reviewer is given the artifacts it judges.** Told to judge
  the row's own phase-authored evidence, `completion-reviewer` had neither the
  ledger nor the evidence home the row's `Layer` selects among its inputs — so
  it could not identify the artifact and fell into its own Stop condition on a
  correct row.
- **Omitting a revision field is a current-contract violation, not an older
  pack.** The layout said both were required and then described the omission as
  the legacy case; only `revision_form: "legacy"`, corroborated by the migration
  record, marks a pack as predating the form.
- **The git probe runs once per repository and once per rev.** It was two
  synchronous spawns per pack, so a repository that keeps its history paid them
  on every full run, growing with the number of packs.
- **A seal says what it catches, and the escalation stops.** Three homes for the
  expected value each fell to the same move — beside the artifact, in a commit,
  in the newest commit introducing the line — and a committed copy is not even
  available: stage evidence is regenerable and deliberately not committed
  (`.qfai/evidence/*` is ignored, with only the governance records negated back
  in), so requiring one would have stopped every completion. A seal catches
  drift between recording and recomputation, which is what happens; it does not
  catch an author rewriting the artifact and the seal together, and nothing
  recorded in the repository can. That is stated once, in place of a fourth
  mechanism.
- **The audit boundary counts only headings outside a fenced block.** Recorded
  output is arbitrary — a test asserting on Markdown prints `## …` of its own —
  and a boundary that took it ended the section there, dropping the GREEN, the
  `Oracle proof` and the round evidence out of the subject.
- **The legacy migration record is tracked by default.** `.qfai/review/*` is
  ignored, so the manifest that corroborates a `legacy` claim was untracked and
  the pack the claim excuses could add itself to it — which is the
  self-declaration the corroboration exists to replace.
- **Every pack producer names the revision fields.** The `qfai-implement` layout
  and both review-cycle playbooks omitted them, so a pack written by following
  them passed its own profile and then failed the repo-wide
  `/qfai-verify --fail-on error`.
- **A git rev is checked against the repository.** A placeholder, a truncated
  paste or a transposed digit passes the form check and names no tree at all. A
  warning, not an error: a shallow clone or an unfetched branch answers the same
  way, and the check says nothing at all outside a git work tree.
- **A `legacy` claim is corroborated against the migration record.** The field
  is exactly as writable as the `revision` it excuses, so a current producer
  with a broken value could downgrade its own finding by typing `legacy`. Only a
  pack listed in `.qfai/review/.legacy-packs` — written once by the migration
  pass — is believed; an uncorroborated claim is an error, and the value it
  tried to excuse is judged as a current pack's.
- **The mutation-only handoff has a receiver.** It was defined on the producer
  side only, and every `/qfai-implement` entry path selects a `todo`, a named or
  a `review-fix` row — none of which a `done` row can be — so the request had
  nowhere to land and the requesting stage could never complete. Phase Red now
  answers it read-only: apply, capture, revert, return, and write nothing to the
  ledger or to that row's evidence.
- **Gate item 10 accepts a stage-level re-verify.** The mismatch exception named
  only "a later row's entry", so a spec with no ATDD-owned rows — the ordinary
  case for a fresh spec that edits a shared fixture — had nowhere its re-verify
  would be read, and a correctly re-verified consumer stayed stale for ever.
- **Two seal references resolve.** `references/evidence-revision.md` does not
  exist under `qfai-atdd`, and `../qfai-implement/references/…` from inside
  `qfai-implement/references/` names a directory twice.
- **An item's `Review pack seal` names the pack and the round it covers.** A
  spec has several packs and a blocking REVISE opens more, so a bare hash left
  the gate unable to say which directory to recompute over — it either checked
  another round's pack or stopped a correct item.
- **A current pack that names no `revision` at all is an error.** It declares
  the contract and then gives nothing to check: strictly worse than a malformed
  value, since the form check never runs either. Only an explicit `legacy` keeps
  it a warning.
- **A zero-row ATDD stage hands its shared-artifact mutation to the production
  owner.** No phase there edits production code, and the rows being re-verified
  are already `done`, so `/qfai-implement`'s named-row, `todo` and `review-fix`
  entry paths do not reach them: the stage could only breach its own Non-goals
  or leave the fixture's hash mismatch permanently unclearable. The handoff is a
  mutation-only request that applies, captures, reverts and returns — without
  reopening the row.
- **The `revision_form` marker is required, and only `legacy` excuses a
  malformed `revision`.** An optional marker made the strict form opt-in: a
  producer that omitted it downgraded its own check to a warning, so a
  `working-tree+<porcelain digest>` — the spelling that does not move when the
  file under review is edited — passed `--fail-on error`. Absence is now a
  schema violation like any other missing field. A pack that predates the form
  says `"revision_form": "legacy"`, written once from the history the same way
  the `Pre-split-evidence` marker is; until that pass has run those packs are
  reported rather than accepted, and running it is what clears them.
- **The spec-level checkpoint carries a seal too.** The seal was defined per
  item, and the spec-level boundary has no row — gate item 12 never runs for it,
  so the full-suite result on a terminal ledger could be edited from FAIL to
  PASS afterwards with no revision, no `Audited evidence hash` and no pack seal
  moving. The spec completion conditions recompute it.

- **A review pack declares which contract wrote it** — `"revision_form":
"content-hash"` in `summary.json` — and only a pack that declares it is held
  to the strict `revision` form as an error. Neither of the two things that
  could stand in for a declaration works: rank made "current" mean "newest
  overall", so a malformed pack stopped being an error the moment another spec
  produced one, and a timestamp cutoff misclassifies by construction — the
  directory stamp carries no timezone, and any instant chosen either predates
  the contract (letting that morning's old-contract packs count as current) or
  postdates it (letting genuinely current packs off). Omitting the marker is
  reported in its own right, so a producer cannot quietly downgrade its own
  check by forgetting it.
- **A stage with no ledger row can still record a shared-artifact re-verify.**
  A fresh spec owns no ATDD row and still creates and edits the fixtures a
  completed spec's handed-over rows read. With the record tied to an "editing
  row" there was nowhere to put the re-run: the earlier row's `RED test hash`
  stayed mismatched with nothing able to clear it, or the change was accepted
  unverified. The stage evidence file carries a `## Shared-artifact re-verify`
  block with the same identity and the same proof rule, and a consumer clearing
  a mismatch reads both places.
- **`qa-gatekeeper` reads the validate evidence from the configured outputs.**
  The scoped JSON goes beside `output.validateJsonPath` and the run directory
  under `paths.outDir`; pinning `.qfai/report/**` stopped completion on a
  project that had moved either, reporting a missing artifact for a validate
  run that had succeeded and left everything it owed.
- **Phase Red step 3c puts the falsifiability addresses in the round block.**
  It still called `RED test hash` and `Falsifiability revision` row-level while
  the round contract put them in each round's block, so a blocking REVISE that
  opened Round 2 on a `falsifiability` row either overwrote Round 1's addresses
  or reused them for a mutation run they were not taken on.
- **Which contract a review pack was written under is read from the pack**, not
  from its rank among siblings. "Held to the strict `revision` form" meant
  "newest overall", so a malformed pack written under the current contract
  stopped being an error the moment any other spec produced one, and
  `validate --fail-on error` accepted a stale current verdict. The timestamp in
  the pack's own directory name decides it: a pack stamped before the form
  shipped could not have satisfied it and cannot be migrated to it, and reports
  a warning; every pack stamped after is an error. An unreadable stamp
  establishes nothing, so it is held to the form.
- **The P8 pack seal has a place to live and something to compare against.**
  The criterion said to seal the pack and check the status against it, but not
  where the expected seal is stored or what the recomputation is compared with —
  and a value taken from the pack at completion always matches itself, whatever
  was edited in between. It is recorded outside the pack, in the stage evidence
  file's `## Final status` (the one section excluded from the P8 audit subject,
  and the only place that exists on a spec with no ATDD-owned rows), when the
  last reviewer response lands and before the stage writes its verdict.
- **The checkpoint record carries a seal of its own.** `Checkpoint verification
command` / `result` are appended after every reviewer has hashed, so they sit
  in no audit subject; the working-tree revision excludes `.qfai/evidence/**`
  and the pack seal covers only the pack. A row already at `done` could have its
  checkpoint result edited from FAIL to PASS with nothing moving anywhere.
  `Checkpoint verification seal` is taken as the run ends and recomputed at gate
  item 12.
- **The RED addresses are out of the row-level field list.** It still named
  `RED test hash`, `RED revision` and `Falsifiability revision` as recorded once
  for the row while the round contract put them in each round's block, so a
  blocking REVISE that opened Round 2 either overwrote Round 1's address or
  reused it for a RED it was not taken on.
- **The audit-subject references resolve.** From
  `qfai-implement/references/`, a bare `constitution/...` names
  `qfai-implement/references/constitution/...`, which does not exist — so a
  producer following it could not reach the extraction rule and hashed a range
  of its own, staling a correct verdict.
- **The stage's own review pack is sealed**, and `## Final status` is checked
  against it: the stage hash covers the evidence but not the verdict.
- **The RED address cardinality is left to the round contract alone.**
- **`RED test manifest` carries kind and mode.** After Phase Green the
  original `RED revision` cannot be recomputed, so this hash is the only thing
  still watching the test-owned artifacts.
- **A changed test invalidates the proof on either branch**, not only where
  the corrected test passes.
- **A re-verify record names the spec as well as the row.** A `TDD-ID` is
  unique within a ledger, not across them.
- **A legacy review pack's revision is a warning, not an error.** The tree a
  past verdict described cannot be reconstructed, so there is no content hash
  to migrate to — only the current pack is held to the form.
- **The same-revision exemption is stated once, for item 3 on every row.** The
  consequences section still listed two special cases, so a reviewer applying
  it rejected the cycle the section above permits.
- **The RED address cardinality is stated once**, per round, where the round
  contract lives.
- **The pack seal names the procedure it uses** — the audit hash, not the
  working-tree revision; "the procedure below" was ambiguous between two that
  produce different values.
- **A multi-id obligation column is split before matching the matrix**, so a
  row with two obligations is not left with no matrix rows at all.
- **The stage hash is recomputed before completion is declared.** On a spec
  with no ATDD-owned rows item 10 never runs, so it was written by P8 and read
  by nobody.
- **A sibling reference is named as a sibling**, not through a `references/`
  prefix that resolves to `references/references/`.
- **A RED's revision and hash live in its round block.** Each round's RED is
  taken on its own tree, so one field per row meant a second round overwrote
  the first pair's address or inherited it.
- **The failing review-fix branch syncs the identity too**; a REVISE can ask
  for real behaviour and a split selector at once.
- **The pack seal is recomputed by the gate**, and stays out of every
  reviewer's subject — it is written after the last of them has hashed.
- **The stage subject stops before `## Final status`**, which the P8 reviewer
  fills in.
- **The producer stops restating the untracked record shape.**
- **The exception producer records what P1d's gate will hash.**
- **The pre-split migration reads every status**, so a row interrupted
  mid-cycle by the upgrade can still finish.
- **A stage review has a subject that needs no row.** A spec with no
  ATDD-owned rows is the ordinary case, and its final review had no
  `### <TDD-ID>` section to hash.
- **A finalized review pack is sealed from outside it.** The audit hash
  addresses what a reviewer read; the pack is what it wrote, so excluding it
  from the revision left an edited PASS reading as fresh.
- **Every RED gets its own revision.** A RED precedes the code that makes it
  pass, so Phase Green moves the address by construction — framing the
  exemption as two special cases made an ordinary uncommitted cycle stale at
  GREEN.
- **The obligation reference is checked against the ledger too.** Changing
  `TC-Refs` alone after the PASS left the entry holding the old copy, so a
  verdict about one requirement stood for another.
- **The matrix extraction matches an obligation exactly**, table row and
  justification alike — "everything after the table" was the other reading,
  and two readers taking one each computed different hashes from one file.
- **A review-fix that moves the test syncs both the ledger and the copy.**
  Updating one alone leaves gate item 10 comparing a changed value with an
  unchanged one, which it fails by construction.
- **The handoff records the obligation reference the RED subject hashes.** The
  gatekeeper judges at P1b, so recording it later moves a stored hash and
  leaving it out lets the reference be repointed.
- **`Replacement proof revision` is inside a subject**, so the proof cannot be
  attributed to a tree it never ran on.
- **The baseline stops restating the working-tree serialization.** Restated as
  `path + NUL + hash`, it fell behind the canonical's `kind` and `mode`, and
  the two spellings gave one tree two addresses.
- **A T1 coherent group is hashed per member.** One hash over a representative
  left the other members' evidence free to change after the PASS.
- **A replacement proof gets its own revision.** Overwriting `RED revision` on
  an `observed-red` row hashed the natural RED's pair with a later mutation's
  tree as one observation.
- **Branch 3 hashes the obligation it says cannot be observed**, so the
  reference cannot be pointed at a different requirement after the PASS.
- **An untracked symlink contributes its own payload**, never the target's
  contents — a dangling link has no second reading at all.
- **The completion gate reads this spec's validate artifact**, not the shared
  `validate.log` a sibling run overwrites.
- **Falsifiability is observed per selector entry**, as a RED already is: one
  aggregate run leaves every entry after the first unobserved.
- **`Round 1: Revision` is taken from the restored tree.** It is the address
  items 5, 7 and 8 share, and the revert moves it by construction — the
  mutated tree already has `Falsifiability revision`.
- **A `Shared-artifact re-verify` entry clears the hash it necessarily
  breaks.** A later row editing a shared fixture moves an earlier `done` row's
  `RED test hash`, and that row cannot take a fresh RED.
- **The reviewer contract lists the same three exclusions**, review pack
  included.
- **The branch-3 `DR-*` is a record in the serialization**, not only a name in
  the subject.
- **The producer records the row identity the reviewers hash**, in both the
  field contract and the ATDD handoff shape.
- **An untracked record carries kind and mode.** An uncommitted `chmod +x` on
  a new script left the address unmoved.
- **The copied row identity is checked against the ledger.** Hashing a value
  the entry already holds proves only that the entry has not changed, and the
  ledger is excluded from the revision too — so editing `Selector` after the
  PASS moved nothing.
- **Branch 3 has a subject of its own.** There is no RED and no GREEN there,
  so the `DR-*` is the evidence; leaving it out let the pointer be swapped
  after the PASS for another existing DR with nothing moving.
- **The falsifiability trio is a round field**, in the RED pair's place, and
  `round-evidence.md` is the only list of which fields take the prefix.
- **A re-entry rewrites the entry before it is judged again.** After a REVISE
  the mutation or the test has usually changed, so hashing the previous entry
  recorded a PASS describing neither run.
- **The replacement revision is recorded where the proof is run.** `/qfai-atdd`
  owns no mutation, so it could only have named the tree before it.
- **The stale-manifest remediation is one that exists.** `/qfai-configure`
  edits what the project has; it does not reconcile against the package, and
  no such migration exists.
- **Row identity is in every observation subject.** The ledger is excluded
  from the revision, so changing `Selector` after a PASS to another valid test
  in the same file moved nothing.
- **The review pack is excluded from the working-tree revision.** A project
  may legitimately track `.qfai/review/**`, and then every reviewer answer
  written into it moved the address the previous reviewer had just recorded.
- **Only the matrix rows an obligation names are hashed.** The coverage-depth
  matrix is one document for the spec and a later run recomputes it, so
  hashing it whole made every existing verdict stale when an unrelated
  obligation's cell moved — with no re-review path for a `done` row.
- **The audit-hash extraction is stated in one place.** The reference still
  described the old whole-section shape, so a reviewer following it produced a
  value neither the baseline nor gate item 10 would reproduce.
- **The RED subject hashes the obligation reference the row's `Layer`
  selects.** An ATDD-owned row has no `TC-ref`, so its obligation sat outside
  every hash and could be rewritten after the PASS.
- **The completion subject covers the `Shared-artifact re-verify` block**,
  which those reviewers are the ones who audit.
- **`QFAI-REVIEW-009` validates the form of a `revision` that is present.**
  Any non-empty string passed, so the porcelain digest the reference forbids
  by name still cleared the machine gate.
- **The RED subject holds the transient revision, not the final one.**
  `Revision` names the tree the GREEN landed at, so including it put a field
  into the subject that appeared later and made every correct RED PASS stale
  at GREEN.
- **The completion subject takes a round block's phase-authored fields only.**
  Those reviewers write `Round N: reviewer verdict` into the block after
  reading it, so the whole block put their own line inside what they hashed.
- **The pre-split anchor is accepted only from a marked row.** Status and
  anchor cannot tell a legacy row from one written to the wrong file after the
  split, so accepting it unmarked let a row that never produced an ATDD
  handoff pass the gate as complete.
- **Each observation hashes the fields it could read.** Subtracting a list of
  later-written fields only moved the problem to the next field added: the RED
  gatekeeper hashes an entry with no GREEN in it yet, so its PASS went stale as
  soon as the phase wrote on. Three named subjects instead.
- **The seam returns a schema-compatible neutral body**, not an empty one — a
  selector that decodes JSON first raises a parse error, which the
  admissibility rule rejects.
- **A weakened shared artifact re-takes the proof**, not just a passing re-run:
  a passing test is not a discriminating one.
- **Both stale manifests are named**, with a remediation — `agent-catalog.yml`
  carries the reviewer contracts, so an old one REVISEs correct handoffs.
- **A replaced test moves its transient revision**, and a fresh RED after a
  REVISE opens round `N+1` rather than the round the reviewer closed.
- **Step 3c writes the whole entry before the gate hashes it**, and reverts
  the mutation whatever the verdict — a REVISE left the broken predicate in
  the working tree for the next run to break again.
- **The `Round N:` prefix is scoped to the per-round fields.** It swept in
  `RED test hash`, `RED revision` and `Falsifiability revision`, which are
  recorded once for the row.
- **A re-taken proof reads the field its own branch wrote** — `Oracle proof`
  on an `observed-red` row, which has no `Satisfied-by`.
- **The handoff records `RED failure mode`**, which the consumer requires
  before the reviewers run and neither branch was writing.
- **The working-tree address has one serialization** — collect, exclude,
  serialize, hash — so producer and reviewer cannot get different values for
  the same tree.
- **The audited entry drops the whole gate-completed group.** The checkpoint
  fields are appended after the reviewers, so leaving them in made both
  verdicts stale on every ordinary item the moment the checkpoint ran.
- **A shared-artifact re-verify is recorded on the row that caused it.**
  Appending to a `done` row breaks the verdicts that closed it, and `done` has
  one exit — the upstream reset — which a sibling editing a fixture is not.
- **Step 3c records `Falsifiability revision`** before the revert: the mutated
  tree stops existing there, and gate item 10 requires the field.
- **Branch 3 is judged before it becomes terminal.** P1b judges branch 1 only
  and the exception path writes the status and stops, so a correct branch-3
  row reached `exception` having been judged by nobody.
- **One content-address procedure, referenced rather than restated.** The
  producer hashed all of `git diff HEAD`, so its `RED revision` and the
  gatekeeper's `Reviewed revision` for the same RED tree could not be matched.
- **The audited entry drops every appended verdict**, including the
  `qa-gatekeeper` observation verdicts — the gatekeeper hashes the entry and
  then writes into it, so its own verdict went stale on recording.
- **Both transient observations are named where the rule is stated**, not only
  the handed-over RED.
- **The shared `Satisfied-by` procedure requires the symbol too**, in step
  with the producer and the gatekeeper.
- **`RED test hash` is one per row**, not per round: nothing produces a
  second, and the cardinality belongs to `Revision`.
- **A shared test artifact a later row edits re-verifies the rows that read
  it** — a `done` row's manifest addressed a fixture that could still change,
  and a `done` row has no re-entry edge of its own.
- **The re-taken proof is performed where the production owners are.** The
  `/qfai-atdd` stage owns no agent for a mutation — the paragraph below the
  instruction said exactly that — so it marks the proof stale and the handback
  re-takes it in `/qfai-implement`'s rework.
- **The audited-evidence hash covers the row's `### Round N` blocks.** Ending
  the extraction at any `###` cut them out, and a rework's RED, GREEN and
  proof live there — so a PASS survived every edit to the evidence it was
  given for.
- **A falsifiability trio with no gatekeeper PASS is not a complete handoff.**
  Step 3c writes the trio and only then routes the gate, so an interrupted run
  left a trio no gate had judged, and step 3b advanced the row on it.
- **A test-only replacement re-takes its mutation proof.** A new hash over the
  old proof says somebody edited the test; it does not say the edited test
  still fails when the predicate is broken.
- **`Audited evidence hash` has one recomputable procedure** — extract,
  normalize, serialize, hash — because the subject is part of a file and a
  file-level manifest alone left two readers free to hash different extents.
- **The mutation run names its own revision.** The gate reads the mutated tree
  before the revert, so item 3 observes a tree that is deliberately thrown
  away while the GREEN and both reviews see the restored one; one revision
  across all four made every correct branch-2 row permanently stale.
- **The reviewer response template carries the hash it is judged on.** Every
  verdict needs an `Audited evidence hash`, but the shared template offered
  only `Reviewed revision`, so a reviewer answering it faithfully omitted the
  field and the row could not reach `done`.
- **The gatekeeper rejects a `Satisfied-by` that names only a commit**, in
  step with the producer contract: without a symbol the ownership check has no
  boundary to apply.
- **Spec completion no longer requires rows no skill may write.** It read
  "every `US-*` has a `Layer = E2E` row"; Phase 2b seeds one row per
  coverage-target `TC-*` and `/qfai-atdd` is not a writer of the ledger, so a
  correct spec was uncompletable and the handoff for the missing rows returned
  nothing. The gate names `QFAI-ATDD-111` / `QFAI-ATDD-113` — the rules the
  annotations discharge — instead.
- **The falsifiability gate sees the mutated tree.** Phase Red step 3c said to
  revert before routing `qa-gatekeeper`, which left it nothing to inspect but
  the restored tree — so it could not check that what broke is the predicate
  `Satisfied-by` names, the one thing that distinguishes a trio from a test
  that would pass against anything.
- **A branch-2 row has the test manifest its completion gate recomputes.**
  `RED test hash` is required on every handed-over `E2E` / `API` row, but a
  falsifiability row has no RED pair, so nothing was hashed at handoff. Step 3c
  records it against the mutation run.
- **The evidence the reviewers audit has an address of its own.** The revision
  excludes `.qfai/evidence/**` so it stays stable across the phase's own
  writes — which also let a PASS survive an edit to the RED/GREEN output and
  the coverage justifications it ruled on. Each verdict now carries an
  `Audited evidence hash`, recomputed at the completion gate.
- **`Satisfied-by` names a predicate a mutation can reach.** A commit id was
  an accepted form; a commit touching several routes and a helper names no
  single predicate, so the gatekeeper's ownership boundary could not be
  applied to it.
- **A test-only replacement re-addresses the test it replaced.** A REVISE that
  changes only the acceptance test left `RED test hash` addressing the
  pre-edit manifest, and the consumer sent the row back for a fresh RED — the
  same passing no-round path, for ever.
- **The branch-2 handoff is covered by the item-cycle exemption**, and the
  phase-authored sequencing note names the evidence file the row's `Layer`
  owns instead of always the implement file.
- **`QFAI-REVIEW-009`'s remedy names the content hash**, not the porcelain
  digest its own reference forbids.
- **The reviewer's revision excludes the ledger too.** `Revision` is
  phase-authored and `Reviewed revision` is not, and the phases write
  `test-list.md` between them — so hashing all of `git diff HEAD` in the shared
  contract made the two permanently unequal while item 10 wants them equal.
- **The RED test hash records the manifest it was taken over.** Naming only the
  _kinds_ of file left two readers free to choose different sets from an
  unchanged tree, so the consumer's recomputation either looped or passed an
  edit it never looked at.
- **The migration finds its commit from the patch, not from `-S`.** The id is
  on both sides of a status-only change, so `git log -S` walks back to the
  commit that _added_ the row and the marker lands on the wrong one.
- **Branch 2's mutation is submitted to the gate before the transition.**
  Steps 4 and 5 are skipped for an `E2E` / `API` row and step 4 is the only
  place that submits a RED, so the branch advanced the ledger with no
  observation verdict at all — and the gatekeeper is conditional in that phase,
  so nothing selected it by default.
- **A passing `review-fix` row takes the no-round path, not falsifiability.**
  That form needs a production mutation this stage owns no agent for and cannot
  hand over: step 3b excludes a `review-fix` row by name and 3c is reachable
  only from a `todo` entry, so the row would sit at `review-fix` again.
- **Every blocking reviewer of the nested run is exempt, not just the
  gatekeeper.** `completion-reviewer` is mandatory and blocking there too and
  requires validate evidence, so exempting one left the first branch-1 row
  stopped at the same gate for a different reason.
- **The revision hash excludes the ledger and the evidence.** Phase Green
  writes `green` and Refactor writes `refactor` into `test-list.md` between the
  observations, and gate item 10 wants one revision across the GREEN and both
  reviews — so a hash over all of `git diff HEAD` moved on its own bookkeeping
  and no uncommitted item could reach `done`.
- **The pre-split marker has a migration that writes it.** Nothing did, so no
  row ever carried it and the compatibility clause it gates was unreachable.
  It is written once from the history, and until then those rows are judged by
  the current rule — reported rather than silently accepted.
- **The consumer recomputes the test hash over the producer's inputs.** It
  recomputed over `Test file` alone while the producer hashed the artifacts the
  test reads, so every row with a fixture or a snapshot failed the gate
  unchanged and was sent back on each pass.
- **The shared reviewer contract carries the untracked manifest.** It still
  said "the contents of every untracked file", so a reviewer following it
  computed a value the consumer could not reproduce.
- **A handed-over row's mutation may touch the predicate it names.** The Oracle
  Strength Check rejects a mutation outside the code the item owns, and an
  `E2E` / `API` row owns no production surface — so no branch-2 row could
  produce falsifiability evidence that passes.
- **Branch 3 has a verdict the observation gate can return.** Judged by the two
  evidence forms a genuine branch-3 row can only be REVISE, and skipping the
  gate leaves the stage's completion condition unmet: it could not close
  either way. The `DR-*` and the unavailability of both branches are what that
  verdict judges.
- **A corrected test that passes on its first run is reclassified.** A REVISE
  asking for no new behaviour — a selector split, a rename, an expectation made
  explicit — leaves the test passing, and demanding a fresh RED stranded the
  row at `review-fix`.
- **Phase Red runs 3a, then 3b, then 3c.** Listed 3c first, an ordered read ran
  the production mutation and wrote `todo -> red` before 3b had checked the
  entry's branch, selector and missing fields — advancing the ledger on
  provenance nobody had verified.
- **The consumer gate requires and rechecks `RED test hash`.** The producer
  records it, but the completion contract asked only for `Revision` — which
  Phase Green makes unrecomputable — so a test edited after the handoff passed
  gate item 10 exactly as a fresh one did.
- **A pre-split row is identified by a marker, not by its status.** `done` plus
  an `implement-` anchor also describes a new `E2E` / `API` row written to the
  wrong file, so the compatibility clause would have accepted a row that never
  produced its ATDD handoff.
- **A `review-fix` row has a defined path back through `/qfai-atdd`.** Phase Red
  step 3b sends one there when the REVISE touches the acceptance test, and the
  three branches only cover a `todo` row's first handoff — so the stage had no
  invocation, evidence shape or return path and the row stayed at `review-fix`.
- **The uncommitted revision hashes a manifest, not bare contents.** Contents
  alone collide on a rename or a swap between two files, and with no order or
  separator defined a second reviewer cannot recompute the same value for the
  same tree — the one thing the address exists to allow.
- **`RED test hash` covers what the test reads.** Limited to the `Test file`
  column, an edit to a snapshot, fixture or helper reshaped the assertion after
  the handoff with the hash unchanged, and the working-tree hash cannot be
  recomputed from the final tree to catch it.
- **Scope approval precedes the RED.** The steps ran the test first and asked
  `delivery-planner` after, while the same step requires a scope REVISE to be
  settled _before_ the RED is submitted — so a REVISE left the just-recorded
  RED as evidence for a scope that no longer existed.
- **`qfai-implement`'s `red` phase routes `qa-gatekeeper` conditionally.** The
  skill said not to route it for a seam-only invocation; the manifest listed it
  as mandatory. The gate had no RED to judge, could only return REVISE, and the
  round trip stopped on the contradiction.
- **The RED test hash is keyed on `Test file`, not `Selector`.** `Selector` is a
  test name in the ordinary case, so hashing "the files it names" produced an
  empty or guessed value and detected no post-handoff edit.
- **Planner scope authority follows the row's obligation column.** It was
  defined as "a sufficient slice of its `TC-*` obligation", but an `E2E` row
  owes `US-Refs` and an `API` row owes `CON-API-Refs` — and the role's required
  inputs listed neither document, so a blocking gate asked it to judge
  something it could not read.
- **Zero ATDD-owned rows is a count, not "nothing to do".** `/qfai-sdd` seeds a
  row per coverage-target `TC-*`, which excludes L4/L5, and this skill cannot
  write the ledger — so a fresh spec legitimately has none. Reading that as no
  work skipped the US and CON-API obligations that are this skill's own.
- **The reviewer revision description follows the field contract.** It still
  specified a `git status --porcelain` digest, so a reviewer following it could
  read a stale PASS as fresh.
- **The P1c round trip is an item cycle, not a completion gate.**
  `/qfai-implement` PASSes its blocking reviewers before the checkpoint, and
  those reviewers' completion-gate inputs are P5/P6 artifacts — so the first
  branch-1 row stranded at `refactor`, which Phase Red does not re-select, and
  P2 was never reached.
- **Branch 3 no longer reads as a way to close a spec.** `exception` is a
  blocking output and completion needs a user-approved `TDDLIST-001` waiver;
  "a valid outcome, not a shortfall" read as done, so a run could record the
  `DR-*`, hand over, and leave a spec that can never legally close. The branch
  ends in the waiver or in a parked row, and the stage has to say which.
- **The RED address includes a hash of the test itself.** The working-tree hash
  covers the production files Phase Green necessarily changes, so it cannot be
  recomputed from the final tree — a reviewer could not tell "only production
  changed" from "the acceptance test was edited after the handoff". `RED test
hash` covers the files the row's `Selector` names and nothing else, which
  Phase Green does not touch.
- **A falsifiability reference resolved into its own directory.**
  `references/red-not-observable.md` from inside `references/`.
- **The ATDD `red` phase is routed per ledger item, and its gatekeeper is
  conditional.** The default `per-invocation` routes each agent once for the
  whole ledger, which cannot execute the one-row-at-a-time loop P1b/P1c
  require; and a mandatory blocking `qa-gatekeeper` stopped a branch-2-only run
  before it could reach the P4b handoff that produces the trio it stopped for.
- **A plan is an acceptable `Oracle proof` at a RED observation.** Branch 1's
  RED precedes the production behaviour, so there is nothing to mutate —
  requiring a demonstrated mutation made a correct observed RED unable to pass
  P1b, and so unable to reach the phase that builds the code the mutation needs.
- **The revision field is a content address in the contract that binds.** The
  rule was corrected in the ATDD reference while `evidence-revision.md` and its
  consumers still specified a `git status --porcelain` digest. `git stash
create` is not a substitute either: it has no `-u`, and a new acceptance test
  — the ordinary case — is untracked.
- **The handoff stage is named the same in both documents.** The reference is
  mandatory reading before a row advances and still said P1d for branch 2.
- **A pre-split `E2E` / `API` row stays gateable.** One that reached `done` or
  `review-fix` before the per-`Layer` evidence split has its anchor in
  `implement-<spec-id>.md`, has no ATDD entry to produce, and no legal
  transition that would let it re-observe a RED. That anchor is accepted.
- **A project whose manifest predates the `red` phase is told what to do.**
  `qfai init --force` leaves `assistant/manifest/**` alone, so the skill update
  can arrive without it. The gate still applies; the routing is manual.
- **The seam returns a neutral response, not an empty one.** An empty body
  raises a parse error in a test that decodes JSON before asserting, and a
  thrown handler does the same in a server that re-raises — both non-assertion
  failures `red-admissibility.md` rejects.
- **The branch-2 handoff is gate P4b, not part of P1d.** P1d required the
  surface P2-P4 build while sitting before P2 in a Do-not-skip list, so a run
  with an ordinary branch-2 row could only wait at a gate whose precondition
  needed gates it had not reached, or skip one. Branch 3, which has no such
  precondition, stays at P1d.
- **A seam-only round trip is not the RED gate.** `/qfai-atdd` calls Phase Red
  step 3a before it has a RED — that is what the trip is for — but the `red`
  phase always routes a blocking `qa-gatekeeper`, which had no assertion
  failure to judge, and step 3b read the row's entry as malformed for lacking
  the very RED the trip exists to make possible. Step 3a returns after building
  the seam now, and the blocking gate applies to the handoff that follows.
- **`qa-gatekeeper`'s completion inputs are conditional on the phase.** It is
  blocking at stage gate P1b, and validate output, coverage reports and runtime
  evidence are first produced at P5/P6 — so a fresh run with a perfectly good
  RED pair stopped on artifacts its own ordering says cannot exist yet.
- **An uncommitted RED is addressed by content.** `git status --porcelain`
  names changed paths and their states, so editing the file under test after
  the RED left the digest identical and a stale observation passed the
  freshness gate the handover depends on.
- **Phase Red step 3a covers the seam an HTTP row needs.** It was defined as a
  module, export or signature the test _imports_, but `/qfai-atdd` hands a row
  here precisely when an unregistered route 404s — the same resolution error,
  reached a different way. Following the step as written left the test 404ing
  with nowhere to go. The step now names the registered route as a seam, and
  requires a status the row does not contract for, so the route resolves and
  the assertion still fails.
- **A checkpoint reference pointed inside the ATDD skill.**
  `../qfai-implement/...` from `qfai-atdd/references/` resolves to
  `qfai-atdd/qfai-implement/...`; every other reference in that file already
  used `../../`.
- **Every branch is handed over; only the timing differs.** `/qfai-atdd` said
  branch 2 and branch 3 rows needed no round-trip, but `/qfai-implement` is the
  only writer of `Status` / `DR-ID` / `Evidence` — and branch 2's mutation is run
  by its Phase Red step 3c. A run with no branch-1 row therefore ended with the
  falsifiability trio never produced (P6 and P8 unpassable) or the Decision
  Record written and the ledger untouched. New stage gate P1d hands both over:
  branch 2 after P2-P4 build the surface and before P6, branch 3 once its `DR-*`
  exists.
- **P1b and P1c are one loop per `TDD-ID`.** P1b required branch 1 "discharged in
  full" before P1c, while P1c takes each row through GREEN before the next
  failing test is written — following P1b left several deliberate REDs open at
  once, and the first row's full-suite checkpoint failed on them. The two gates
  now read as choose, discharge, next row. The scheduling contract moved to
  `red-provenance.md#which-stage-hands-a-row-over`, which owns the branches it
  schedules.
- **The spec-level checkpoint boundary has a defined home.** Its rule read and
  wrote `implement-<spec-id>.md`, but a spec whose every row is `E2E` / `API`
  never has that file — so a terminal ATDD-only ledger judged the boundary
  unrecorded on every re-run, or wrote a second evidence file and broke the
  one-file-per-spec contract. The boundary has no `Layer` to route by, so it
  goes to the implement file when it exists and to the ATDD file when it does
  not, by the same rule on read and on write.
- **Two broken references in the skills.** P1's layer catalog resolved from no
  root (`catalog/test-layers.md` → `.qfai/assistant/catalog/test-layers.md`), and
  `#atdd-owned-rows` named an anchor the parenthesised heading did not generate.
  The heading is short now, so one anchor serves every reference to it.
- **Phase Red selects the row P1c named.** It took the first `todo` row
  regardless, so a branch-2 row above the named one was processed first — and
  its full-suite checkpoint ran against a tree still holding the named row's
  deliberate RED, failed, and left that row at `refactor`, which step 1 does
  not re-select. A named `TDD-ID` now wins over ledger order.
- **The branch is re-checked at each row's handoff.** Fixing every row's
  branch at P1b goes stale once rows are taken one at a time: an earlier
  branch-1 row's production code can satisfy a later row's predicate, leaving
  a row recorded as `observed-red` with no observable RED and no
  re-classification step. The P1b choice is provisional; the branch is taken
  from a run against the tree as it stands at handoff.
- **`/qfai-atdd` records `RED revision` when it takes the RED.** The
  completion gate requires it on a handed-over RED and the producer recorded
  no revision at all — an uncommitted tree's address cannot be recovered once
  Phase Green has changed the tree, so the required field was a guess or
  missing, and a guess fails the freshness gate exactly as a gap does.
- **A `review-fix` on an `E2E` / `API` row hands its test back.**
  `/qfai-implement` does not author acceptance tests and its `red` phase has
  no `acceptance-test-engineer`, so a REVISE asking for a test change left the
  row at `review-fix` or had a production agent edit a test it does not own.
  The corrected test and its new RED come from `/qfai-atdd`; the production
  fix and the re-review stay here.
- **Cross-spec obligations follow the row's `Layer` too.**
  `cross-spec-ownership.md` still wrote `## Cross-spec obligations` to
  `implement-<spec-id>.md`, so an unresolved obligation was invisible in the
  file gate item 10 reads for an `E2E` / `API` row.
- **The production-path form of `Satisfied-by` is scoped to handed-over rows.**
  Widening it for every row let an ordinary `Unit` / `Component` /
  `Integration` row reach `done` with no production change and no sibling —
  `qfai-implement/SKILL.md` Phase Red step 5 sends exactly that case to
  `exception`, so the shared reference and the gatekeeper were contradicting
  the skill body they serve.
- **P1b gates the rows that have evidence at P1b.** The `red` phase's
  `qa-gatekeeper` is mandatory and blocking, and a branch 2 row's payload is
  the falsifiability trio — which by the same gate's own rule does not exist
  until P6. A run whose rows are all branch 2 had nothing submittable and
  could not pass P1b to reach P6. It judges the branch 1 rows there; branch 2
  rows are judged when their trio lands.
- **A RED-gate REVISE reruns whoever wrote the production edit.** The seam and
  the mutation are written by the production owners in that phase, and a
  `qa-gatekeeper` REVISE there is usually about one of them —
  `failed-agents-only` re-judged an unchanged artifact and returned the same
  REVISE, so the row never left `red`. The phase uses
  `changed-scope-dependents`.
- **Someone is routed to every step that touches production code.** The
  implement `red` phase had `qa-gatekeeper` alone and the orchestrator may not
  implement, so neither step 3a's minimal seam nor the falsifiability mutation
  had an agent able to perform it — a new-surface row could not reach an
  admissible RED at all. `frontend-engineer` / `backend-engineer` are
  conditional agents of that phase now.
- **Phase Red step 3c performs the first falsifiability mutation.** The
  preconditions were circular: step 3b deferred a branch-2 row until its trio
  existed, and Phase Green step 2a refused to repeat a mutation it assumed had
  already run — so nobody performed the first one and an ordinary
  first-run-pass row could not leave `todo`. 3c applies it, records the trio in
  the row's ATDD entry, and writes `todo -> red`; it is that row's
  `Oracle proof` and 2a still does not repeat it.
- **A natural RED keeps its scope and RED gates.** The path into branch 1
  skipped steps 1 and 3-4 as "for a surface that does not exist", which also
  dropped `delivery-planner`'s scope approval and the `qa-gatekeeper` PASS the
  handover table then requires. Only the seam is skipped.
- **Checkpoint evidence follows the row's `Layer`.** `checkpoint-verification.md`
  still wrote its two per-item fields to `implement-<spec-id>.md`, splitting an
  `E2E` / `API` row across two files and leaving the one gate item 10 reads
  incomplete.
- **`qa-gatekeeper` requires the evidence file the row's `Layer` owns, and only
  that one.** Requiring both made the Stop condition fire on a spec that
  legitimately has one: a Unit-only spec never ran `/qfai-atdd`, and a spec
  whose rows are all `E2E` / `API` has no implement file. Either way the gate
  stopped before reading the evidence that does exist.
- **`execution-ledger.md` has an `### Allowed transitions` heading**, so the
  anchor two documents cite resolves instead of landing at the top of the file.
- **`RED revision` is a field, so that exemption can be recorded.** Declaring
  it in the completion gate was not enough: the per-item contract stores one
  `Revision` per round and `evidence-revision.md` calls any observation naming
  a different revision stale, so a correct `observed-red` row stayed
  permanently stale whatever the gate said. The handed-over RED records its own
  revision; `Revision` covers the GREEN and the two reviews, which must still
  agree with each other.
- **P1c takes branch-1 rows one at a time.** Writing every branch-1 failing
  test and then handing the batch over cannot work: each row's checkpoint runs
  the full suite, so a second deliberate RED left open elsewhere fails the
  first row's checkpoint — and that row is then stranded at `refactor`, which
  Phase Red does not re-select. RED, handoff, GREEN and checkpoint complete for
  one row before the next one's test is written.
- **Branch 2's mutation is applied by `/qfai-implement`.** It rewrites a
  production predicate, and this stage's `evidence` phase is
  `devops-ci-engineer` and `qa-gatekeeper` — neither owns production source,
  the same boundary branch 1 states two branches earlier. Following the old
  text meant editing production code out of ownership; refusing to meant a stop
  with no falsifiability trio. The row is handed over naming the predicate to
  break, and records the pair that comes back.
- **The handed-over RED is exempt from the same-revision rule.** Completion item
  10 asked the item's four sub-agent observations for one revision. A branch-1
  RED is taken before the production code exists, so its revision necessarily
  differs from the GREEN's and the reviewers' — that is the property the RED is
  worth having, and demanding one revision made an `observed-red` E2E/API row
  unable to reach `done` at all.
- **`Satisfied-by` accepts what actually satisfies the row, in the shared
  contract too.** `red-provenance.md` required the production path and symbol
  for an ATDD surface no ledger row owns, while `red-not-observable.md` called
  a sibling `TDD-NNNN` the only legal value and `qa-gatekeeper.md` called a
  sibling row the only legitimate absence — so the form one document mandates
  was rejected by the gate that judges it, and every such row stopped. All
  three now ask the same question of the field: what would I mutate to falsify
  this row.
- **A natural RED on an existing surface has a step to enter branch 1 at.**
  Branch 2's first-run check correctly sends an already-failing row to branch
  1, but branch 1 opens by asking for a seam for a surface that does not exist
  and confirms the RED "before any production code exists" — neither true
  here, so a row that observed a real defect had nowhere to go. It enters at
  step 2, and what `qa-gatekeeper` confirms is a failure observed against the
  tree before the fix.
- **The GREEN is submitted after the `Oracle proof`, not before it.**
  `qa-gatekeeper` requires a proof on every item and the `build` phase is
  blocking, so a GREEN submitted before step 2a produced one is a REVISE by
  construction — and that REVISE blocks the step meant to produce the proof.
  Step 2 takes the passing run, step 2a takes the proof, and the two are
  submitted together.
- **A scope REVISE in the ATDD `red` phase reruns the agents it invalidates.**
  `failed-agents-only` re-ran `delivery-planner` alone, against a selector
  nobody had changed — so it returned the same REVISE, or the previous
  `qa-gatekeeper` PASS stood over a test that had since been split. The phase
  uses `changed-scope-dependents`.
- **Phase Green runs the `Oracle proof`.** Branch 1 records the mutation it
  intends; there is nothing to mutate until Phase Green builds the surface, and
  the phase had no step for it. Completion item 5 wants the command and its real
  failing output, so a handed-over row arrived at the gate with a plan and no
  run. New step 2a applies the mutation, captures the failure, and reverts it
  immediately. A falsifiability row already has one and must not repeat it.
- **The mandatory `## Evidence` section follows the row's `Layer` too.** Items
  10-11 pointed an `E2E` / `API` row at `atdd-<spec-id>.md` while the section
  below still created `implement-<spec-id>.md` and called it the single home for
  every row — so following it split one row across two files and left the file
  the gate reads incomplete.
- **The minimal seam is requested, not written, by `/qfai-atdd`.** Branch 1 told
  it to register the route or add the export, which is production code its
  `red` phase has no agent for — the same ownership breach the branch forbids
  two steps later. It is asked of `/qfai-implement` Phase Red step 3a instead.
- **Branch 2 is chosen from a first-run pass, not from surface existence.** A
  surface that exists can still be wrong, and a correct test against a buggy one
  fails naturally — an observed RED. Keying on existence sent that real defect to
  `exception` or to a stop, because the mutation cannot run against an
  already-failing test and there is no GREEN to restore to.
- **A branch-2 row is deferred by step 3b, not treated as a malformed handoff.**
  Phase Red always takes the first `todo` row, and branch 2 records its evidence
  at the ATDD stage's P6 — after the P1c handover. Stopping on it meant a
  branch-2 row above the branch-1 rows blocked them from Phase Green, so their
  tests stayed red, ATDD never passed P5-P8, and P6 never happened. P1c also
  names the rows it hands over.
- **`delivery-planner` approves the slice before the RED gate.**
  `qfai-implement` makes it the only authority on whether a selector covers a
  sufficient slice and requires a scope REVISE settled _before_ the RED is
  submitted. The ATDD `red` phase took the `qa-gatekeeper` PASS first, leaving
  the planner only "keep the PASS and open a new row" — which cannot repair a
  handoff taken at the wrong granularity. It is now mandatory and blocking in
  that phase.
- **The handover is verified before the status moves.** Phase Red step 2 wrote
  `todo -> red` unconditionally, so a row whose ATDD entry was missing or
  malformed was parked at `red` with no RED behind it, and an `exception` row
  reached its `DR-*` only after an illegal `red` hop. An `E2E` / `API` row's
  transition is now decided by step 3b: `observed-red` and `falsifiability`
  write `red`, `exception` writes `exception` and skips Phase Green, and an
  unusable entry leaves the row at `todo`.
- **The completion gate can see the ATDD evidence file.** Item 10 required every
  row's `Evidence` anchor to resolve into `implement-<spec-id>.md`, so an
  `E2E` / `API` row pointing at `atdd-<spec-id>.md` — where this release puts
  its RED provenance — could not reach `done` however correct its evidence was.
  The gate now reads the evidence file the row's `Layer` owns, and the reviewer
  verdicts are appended to that file. `/qfai-implement` still runs both
  reviewers for every row it advances.
- **`/qfai-atdd` no longer told to write production code.** Branch 1 ended
  "build the surface and re-run for GREEN", but `agent-routing.yml` gives that
  stage `acceptance-test-engineer` and no backend or frontend agent — so it
  either wrote code it does not own or stopped with no GREEN. It now records the
  RED, gets `qa-gatekeeper` PASS **before any production code exists** (the
  blocking confirmation `qfai-implement` requires, which cannot honestly be
  sought after the surface is built), and hands over; `/qfai-implement` Phase
  Green builds the surface and takes the GREEN.
- **The execution ledger is a mandatory `/qfai-atdd` input.** Neither the
  preflight priority list nor the Read Set Contract named
  `tdd/test-list.md`, so a default-mode run could not enumerate the
  `Layer = E2E` / `Layer = API` rows it owes evidence for — and step 3b then
  stopped on a missing handoff for every one of them. It is read, never written.
- **The observed-RED submission has a routing phase to go to.** Branch 1 says
  to submit the RED to `qa-gatekeeper` at routing phase `red`, and
  `agent-routing.yml` gave `qfai-atdd` only `coverage` / `implementation` /
  `evidence` / `review` — the phase named belonged to `/qfai-implement`. A
  blocking `red` phase now sits before `implementation`, which is the only
  place it can sit: after the surfaces are built there is no RED left to
  confirm.
- **Branch 1 rows hand over before the gates that need a green tree (P1c).**
  Branch 1 ends with a deliberately failing test and no production code, while
  P5-P8 require the suite and the repo quality gates to pass — so the stage
  could not finish its own gates. The handover to `/qfai-implement` is now an
  explicit stage gate rather than a next-action at the end.
- **P1b no longer demands evidence branch 2 cannot have yet.** It required RED
  provenance "established" for every row while the same sentence deferred branch
  2's mutation run to P6. P1b is now "branch chosen for every row, branch 1
  discharged in full", and a branch 2 row legally leaves it with its branch
  recorded and no evidence.
- **A `review-fix` row does not replay the handover.** Phase Red selects it
  first and keeps its status, so step 3b would have re-read the original ATDD
  entry and written `todo -> red` from a row that is not at `todo`. It now
  applies to `todo` rows only; rework goes through `round-evidence.md`.
- **The layer-owned evidence file is named everywhere the row is written.** Gate
  item 10 was not enough on its own: the orchestrator override and the ledger's
  `Evidence` column definition both still said `implement-<spec-id>.md`
  unconditionally, so following either produced a pointer item 10 rejects.
- **Step 3b's reference resolves.** `qfai-atdd/references/red-provenance.md`
  read from `qfai-implement/SKILL.md` points at
  `qfai-implement/qfai-atdd/...`, which does not exist — the mandatory handover
  contract was unreachable from the step that requires it.
- **`/qfai-implement` Phase Red consumes the ATDD provenance instead of
  re-observing it.** The handover was declared but not executable: steps 4 and 5
  re-run the row's test and watch it fail, and by the time that skill reaches an
  `E2E` / `API` row the surface exists, so the run passes and step 5 classifies
  it as an anomaly bound for `exception` — the terminal state the falsifiability
  branch exists to avoid, reached through the branch itself. New step 3b verifies
  and carries over the recorded branch; a missing or malformed entry stops with a
  handoff note rather than inventing a RED.
- **The ATDD minimal seam must not answer with the contracted status.** Branch 1
  said to register the route "with the declared status, an empty body". When the
  row's predicate _is_ the status — `201` on create, `204` on delete, `403` on a
  refusal — that passes the assertion the moment the seam exists, so there is no
  RED left to observe and the behaviour was implemented before the test failed.
  The seam now answers with a not-implemented sentinel outside the contract's
  declared set.
- **ATDD evidence keeps its payload out of the table cell.** `## Ledger rows
advanced` asked for RED/GREEN commands, output and the falsifiability result
  inside a GFM cell — the same container defect the implement ledger had. Real
  output is multi-line and carries bare `|`, so it either truncated the proof
  `qa-gatekeeper` requires or broke the table below it. The table is now an
  index; each row's payload lives under its own `### TDD-NNNN` heading in fenced
  blocks.
- **`QFAI-ATDD-117` is scoped like the obligations it excludes.** It lists the
  excluded ids and was filed at `specsRoot`, which belongs to every scope, so
  a `--spec` run reported a sibling spec's L1/L2 TCs in its own evidence.
- **The per-spec owner is read positionally, not by pattern search.** The
  layout is exactly `<testsRoot>/<layer>/spec-NNNN/**`; scanning for that shape
  anywhere in the path found it above the checkout and inside fixture
  directories, attributing tests to specs that do not own them.
- **A nonexistent-spec reference is repo-wide only where no spec owns the
  file**, and the repo-wide `QFAI-TRACE-*` claim is limited to the findings
  that have no spec owner — the per-artifact ones are dropped by the scope
  filter before a scoped checkpoint sees them.
- **The owner scan stops at the configured tests root.** Test paths are
  absolute, so a checkout that itself lives under `/srv/integration/spec-0002/`
  has an ancestor pair spelled exactly like the canonical layout, and a flat
  `tests/integration/a.test.ts` inside it was attributed to `0002`.
- **A spec-named directory that is not the owner no longer ends the search.**
  In `tests/integration/spec-0002/fixtures/spec-0001/**` the innermost
  `spec-NNNN` is a fixture named after the spec it stands in for; stopping
  there lost `0002`, so `--spec 0002` dropped findings in its own tests.
  The forbidden-placement findings (`QFAI-ATDD-121` / `-122` / `-123`) carry
  that owner in `relatedFiles` too. `narrowForbidden` kept them for the right
  scope, but `isFindingInSpecScope` re-derives the owners from `relatedFiles` —
  so `qfai validate --spec 0002` still dropped a misplacement in its own tests,
  and a test that stopped at the validator return value did not show it.

- **A forbidden reference is owned by the tests that hold it.** The
  unknown-reference path already treats a file under
  `tests/integration/spec-0002/**` as `0002`'s; attributing a misplaced
  annotation to the token alone meant the gate of the spec whose tests hold the
  misplacement never saw it, and only an unrelated spec's run did.
- **The test-path owner is read from the layer directory, not any ancestor.**
  `entry.file` is absolute, so scanning every segment made a checkout that
  happens to live under a directory called `spec-0002` claim every test in it —
  dropping repo-wide findings from one scope and leaking siblings into another.
  Only `<integration|api|e2e|atdd>/spec-NNNN/**` counts.
- **`lint:shipping` keeps its rules' own flags.** Globalising them with a bare
  `"g"` dropped the `i` on the spec-id rules, so `SPEC-9999` in JSDoc passed
  the pre-build lint while the post-build guard and the smoke test caught it.
- **An unknown reference is attributed to both of its owners.** `narrowUnknown`
  keeps the finding when either the token's spec or the test's own per-spec
  directory is in scope, but `relatedFiles` listed only the token's — and
  `isFindingInSpecScope` re-derives the owners from there, where an unowned
  `tests/**` path contributes nothing. The narrowing was undone one layer later.
- **A shared spec artifact keeps a finding repo-wide.** A path under
  `specsRoot` but outside any `spec-NNNN` directory — `_policies/**` — is part
  of the finding, not an auxiliary representative path: the duplicate
  `QFAI-ID-001` reports between a shared policy and one spec is present for
  every spec, and attributing it to that one spec hid it from all the others.
  A path outside `specsRoot` stays auxiliary and grants no membership.
- **An unknown reference has two owners, and either one keeps it in scope.**
  Attribution used the token alone, but the token is the thing that may be
  mistyped: a test under `tests/integration/spec-0002/**` annotated
  `QFAI:SPEC-0001:TC-9999` was attributed to `0001`, so `--spec 0002` — the
  completion gate of the spec that owns the file — never saw its own broken
  annotation, and only an unrelated spec's run reported it. A canonical
  per-spec test directory is an owner too.
  The three layers also scan the same input set now: the word boundaries the
  pre-build lint carried made `spec-9999suffix` invisible to it while the
  post-build guard and the smoke test both caught the `spec-9999` inside it —
  the same distributed content passing one layer and failing another.

- **The still-blocking families a `--spec` checkpoint names include the
  contracts.** `runTddValidators` runs `validateContracts` regardless of scope,
  and `QFAI-CONTRACT-*` / `QFAI-DB-002` are filed against `.qfai/contracts/**`,
  which no spec owns — so they survive the scope filter and exit 1 exactly like
  `QFAI-TEST-001` and `QFAI-TRACE-*`. Naming only those two made a contract
  error read as an unexplained checkpoint failure.
  The three layers express the range as a numeric property now —
  `spec-0*[1-9][0-9]+`, any leading zeros then a value of ten or more — because
  enumerating digit shapes kept them out of step: `spec-9999` (no leading zero)
  and `spec-00100` (two) were each caught by some layers and not others.

- **The distributed-surface spec-ID guard covered half its own range.**
  `spec-0010 and above` is a numeric range, but all three layers spelled only
  its leading-zero half and matched case-exactly — so a four-digit id with no
  leading zero, or any `SPEC-` spelling, shipped past every one of them. The
  regex now covers 0010-0099, 0100-0999 (and 01000+) and 1000 and up, in either
  case; the `SPEC-` spelling matters because a spec directory may legally be
  `SPEC-0042` on a case-sensitive filesystem. Widening it surfaced two
  pre-existing leaks in `src/` header comments, which `tsup` was retaining in
  `dist/*.d.ts` and the sourcemaps; both are removed.
- **A finding names the spec directory as it is spelled on disk.** Spec
  discovery matches `spec-NNNN` case-insensitively and keeps the directory name
  it read, so a pack under `SPEC-0001/` is valid. Attribution rebuilt the path
  from the number instead — `.qfai/specs/spec-0001` — so on a case-sensitive
  filesystem the `file` and `relatedFiles` of `QFAI-ATDD-111` / `-112`, the
  forbidden-layer findings and the scaffold placeholder all pointed at a path
  that does not exist, and the GitHub annotation had nothing to attach to. The
  enumerated directory is carried alongside the number now and used verbatim.
- **"Does this spec exist" is a directory question.** It was answered from the
  US/TC id maps, which only key a spec that declares at least one id — so a
  sibling created moments ago read as nonexistent and its typo was kept
  repo-wide, failing exactly the gate separation `--spec` exists for. The
  answer comes from the enumerated spec directories now, and the same
  correction applies to a scaffold directory: `tests/integration/spec-9999/`
  is not an out-of-scope sibling, and skipping it removed the placeholder from
  every valid scoped gate.
- **A reference to a spec that does not exist stays repo-wide.** `--spec`
  narrowing drops a sibling's unknown reference because that sibling's own
  gate will report it. A token naming a spec number no spec pack has —
  `QFAI:SPEC-9999:TC-0001`, the ordinary fat-finger — has no such gate:
  `--spec 9999` is rejected by `QFAI-SCOPE-002`, so every legitimate per-spec
  run would drop it and the annotation would sit in the current spec's own
  tests unreported. Only refs naming a spec that exists are narrowed.
- **An unknown `US` / `TC` reference is scoped by the spec its token names.**
  `QFAI-ATDD-101` / `-102` are filed against the test file carrying the typo,
  which no spec owns, so a sibling's `QFAI:SPEC-0001:TC-9999` failed
  `--spec 0002`. The root cause was narrower than it looked: the owning-spec
  regex was anchored at `SPEC-`, and an unknown-reference token is the
  annotation as written (`QFAI:SPEC-0001:TC-9999`), so every one of them read as
  unattributed. Contract tokens (`CON-API-*` / `CON-DB-*`) name no spec and stay
  repo-wide, the documented limit `QFAI-ATDD-113` already has.
- **A forbidden TC placement is scoped too.** `narrowToScope` narrowed
  `missing.us` / `missing.tc` only, and `QFAI-ATDD-121` / `-122` / `-123` are
  filed against a `tests/**` path that `.qfai/specs/` does not own — so a
  sibling's half-finished annotation failed a scoped gate the requested spec had
  fully discharged. The lists are narrowed by the same rule, an entry left with
  no in-scope id is dropped, and the finding carries the owning spec dirs in
  `relatedFiles` while `file` stays the test path the operator edits.
- **A `--spec` run no longer touches another spec.** Three ways it still did.
  `isFindingInSpecScope` kept a finding when _any_ of its paths was in scope,
  and an unowned path is in every scope — so `D-SCAFFOLD-PLACEHOLDER`, whose
  representative `file` is a test path outside `.qfai/specs/`, survived every
  filter no matter what it was attributed to. Once a finding names an owning
  spec, only its owners decide; a finding no spec owns still belongs to every
  scope. `validateScaffoldPlaceholder` also scanned and counted repo-wide, so
  three scoped gates pushed an unrelated spec's placeholder to the escalation
  threshold and opened its next run at `error` — it now scans, counts and
  resets only the specs in scope. And the shared
  `.qfai/report/atdd-traceability/summary.{json,md}` artifact is written from
  the repo-wide evaluation again rather than the narrowed one, so the artifact
  no longer depends on which scope wrote it. That is **not** the same as making
  concurrent runs safe: the two files are separate writes taken at separate
  instants, so an interleaving can still leave them describing different
  snapshots. Do not run per-spec gates in parallel expecting a consistent audit
  artifact — that race is open, tracked in the shared-state issue alongside the
  `.qfai/state.json` counters.
- **`qfai-atdd` no longer claims `QFAI-TEST-001` fails its gate.**
  `runAtddValidators` runs the coverage and scaffold validators only;
  `validateTestTodoStubs` is wired into the tdd profile. A completion reviewer
  trusting that line would read a green `--profile atdd` as proof there is no
  `it.todo` acceptance test.
- **`qfai validate --spec` now actually scopes the two spec-owned ATDD coverage
  rules, and the per-spec skills use it.** `QFAI-ATDD-111` and `QFAI-ATDD-112`
  were filed against `specsRoot` itself; `owningSpecNumber` returns `null` for a
  path that is not inside a `spec-NNNN` directory and `isPathInSpecScope` treats
  an unowned path as belonging to every scope, so both findings survived every
  `--spec` filter. They are now attributed to the spec directories the missing
  refs name, using the representative-plus-`relatedFiles` shape `QFAI-ID-001`
  already uses. `/qfai-atdd` (four gate statements) and `/qfai-implement`
  (`checkpoint-verification.md`, `final-checklist.md`) pass `--spec <spec-id>`,
  which only `/qfai-sdd` did before — so a stage that discharged everything its
  own spec owns can close, instead of failing on a sibling's obligations.
  `QFAI-ATDD-113` / `-115` are attributed to `.qfai/contracts/**`, which no spec
  owns, so they stay repo-wide under every scope; `/qfai-atdd` now says so
  rather than implying a scoped gate is clean.
- **Foreign home is a placement, not a `Level`.** Once `api` and `e2e` are
  scanned, an L4 skeleton that followed the remediation into `tests/api/**` is
  in its declared home — its annotation counts, so what it needs is the
  ordinary placeholder gate and its escalation. Judged by `Level` alone it left
  the coverage list, hit the `continue`, and sat on the non-escalating foreign
  warning however many times validate ran: the same silence the move used to
  produce, one step further along.
- **A mistyped TC column still declares its ids.** Reading them from the
  resolved tables closed the appendix hole and opened this one: a header like
  `TC Id` drops the whole table, so the id left the obligation set and
  `QFAI-ATDD-112` stopped asking for it. The ledger does not cover the gap —
  with no `tdd/test-list.md` at all `TDDLIST_MISSING` is a warning and the
  check returns early — so `--profile full --fail-on error` passed with neither
  a test nor a row. Tokens in an unresolvable table inside the authoritative
  section are kept; the header is what `TDDLIST_TC_TABLE_UNRESOLVED` reports.
- **A top-level indented code block is masked before table parsing.** Only
  fenced blocks and HTML comments were, and `parseAllMarkdownTables` matches
  `^s*|` — so a schema-complete sample ledger indented four spaces was
  collected as a real table. A spec with no ledger of its own could satisfy
  `TDDLIST_TC_NOT_COVERED` from the sample, and a `todo` row owes neither
  `Test file` nor `Evidence`, so `validate --profile full --fail-on error`
  passed with no test behind it. Recognised at the top level only: under a list
  item four-space indentation is continuation, not code.
- **A scaffold skeleton is followed to the directory the remediation names.**
  `D-SCAFFOLD-FOREIGN-HOME` tells the operator to move an L4/L5 skeleton to
  `tests/api/**` or `tests/e2e/**`, and a move without an implementation left
  every gate at once — this scan did not reach it, the ATDD scan counted its
  annotation as coverage, and the generated `it.skip(...)` is not the `*.todo`
  form `QFAI-TEST-001` matches. Both directories are scanned, and the
  remediation says to write the real test rather than move the skeleton.
- **An L1/L2 annotation in `tests/integration/**`is not a violation.** The
Reviewer Gate and`project_memory`said`QFAI-ATDD-123`rejects it, but`resolveTcHomeKind`returns`null` for those levels and the scan continues
  before the forbidden-placement check — the validator neither counts it nor
  flags it. A reviewer working from that text would have had an existing,
  passing annotation deleted.
- **The declared TC set is read from the authoritative shapes only.** Masking
  fixed the fenced-sample case; an appendix or illustrative table written as
  ordinary markdown _outside_ `## Test Case Table` was still collected, so its
  ids landed in the declared set with no `Level`, fell through to the
  integration default, and `QFAI-ATDD-112` raised a hard error against a TC
  that does not exist. The set is the heading form plus the `TC-ID` column of
  the tables inside that section — the same two passes `collectTcLevels`
  makes. Scoped to the section rather than to `resolveTestCaseTables`, so a
  mistyped `tc-id` header still declares its ids and both gates report it.
- **The L1/L2 exclusion reaches every mandatory checklist.** The body defined
  it, but the Reviewer Gate, the Definition of Done and `project_memory` still
  demanded "every TC" — so a `completion-reviewer`, or an agent that never
  opens the body, judged an L1/L2-only spec the validator passes as not-done,
  and the repair they would reach for is the duplicated integration annotation
  `QFAI-ATDD-123` rejects.
- **A settled `Level` survives a later table that has no `Level` column.** The
  first-declaration-wins guard sat inside the `levelIndex >= 0` branch, so a
  re-listing without that column skipped it and fell through to the
  column-absent fallback — re-adding an `L3` TC as a Unit/Component target on
  top of the integration obligation its declaration gives it. The result was
  `TDDLIST_TC_NOT_COVERED` beside a correct `QFAI-ATDD-112`, and an inflated
  target count in the report.
- **The declared-id set is read from the same masked text as the levels.**
  `collectTcLevels` masks fenced samples and HTML comments; the id collector
  read the raw document, so an id that appears only in a format example stayed
  declared with no `Level`, fell through to the integration default, and
  `QFAI-ATDD-112` raised a hard error against a TC that does not exist.
- **A ledger table that kept one marker column is a ledger table.** Detection
  admitted a table carrying both `TDD-ID` and `TC-Refs`, or six of the eight
  required columns — and a table that drops one marker _and_ two other columns
  fell between them. `TDD-ID | Layer | Test file | Status | Evidence` can
  obviously hold ledger rows, so a `done` row in the complete first table and a
  `todo` row in this one reported no missing column and no outstanding work,
  and the report published `done: 1 / open: 0` from the first table alone. One
  marker plus four columns now counts as an attempt, which leaves a
  `TDD-ID | Status` roll-up read as the summary it is.
- **The complete transition list says `any status` too.** Widening only the
  summary table left the list — which declares itself complete and prohibits
  every unlisted edge — still naming five sources, so whether a `blocked` or
  `review-fix` reset was legal depended on which of the two a reader reached
  first. The list also called the approved reset "the fourth" row of a table
  where it is the third, which read QA rejection recovery as the sanctioned
  backward transition and contradicted the paragraph below it.
- **The upstream reset admits every source status.** The lifecycle table
  enumerated five, which read as a complete list — but `drift-protocol.md`
  step 5 sweeps the ledger with `any status -> todo`, so a row at `blocked` or
  `review-fix` when the upstream obligation moved was one the table forbade the
  Protocol from sweeping, leaving the preflight with nothing legal to do. The
  enumeration existed to stop an unapproved `review-fix -> todo`; the approval
  column already does that, and does it without contradicting the Protocol.
- **`qfai-implement`'s primary spec-completion condition is a list item again.**
  A missing newline joined `- Each item reached \`done\` or valid \`exception\`
  (with DR-ID)`to the tail of the bullet above it, and because the joined line
is a two-space continuation, markdown rendered the condition as trailing prose
inside a bullet about the`QFAI-ATDD-111`/`QFAI-ATDD-113`hard gate. The
words were all still there, so nothing flagged it — while the clause had no
line of its own, and downstream Decision Records that cite it by`file:line`pointed at a line it does not occupy.`tests/assets/swallowedListItem.test.ts`now scans the shipped`assistant/\*\*` tree for a list marker stranded mid-line.

### Changed

- **`/qfai-atdd` now has RED discipline for the ledger rows it feeds.**
  `qfai-implement/SKILL.md` states the split — `Layer = E2E` and `Layer = API`
  rows are tracked in its ledger, their tests authored in `/qfai-atdd` — and its
  Phase Red requires an admissible failure confirmed before production code
  exists. `qfai-atdd/SKILL.md` contained no occurrence of `RED`, `red`, `green`,
  `refactor`, `exception` or `test-list.md`, and its stage gates ran
  plan → layer → E2E → API → integration → validate → runtime → repo gates →
  reviewer with no failing-test step. Since `todo` has exactly two exits and
  `todo -> red` needs a RED the stage order makes unobservable, `exception` was
  the only terminal state such a row could reach: on one consumer repository all
  13 remaining `todo` rows were ATDD-owned, and the ledger closed at 95
  `exception` against 21 `done`. The skill now names the ledger it feeds and
  states that it **does not write it** — `/qfai-implement` remains the single
  writer of every `Status` / `DR-ID` / `Evidence` cell, as the Drift Protocol
  grants; what `/qfai-atdd` owes is the evidence those cells point at, in
  `.qfai/evidence/atdd-<spec-id>.md`. It adds stage gate **P1b** (RED observed,
  and `qa-gatekeeper`-confirmed, before P2-P4 build any surface) and documents
  three ordered branches in
  `references/red-provenance.md` — observed RED, falsifiability via the existing
  `red-not-observable.md` path, and `exception` with a `DR-*` only when both are
  unavailable. `qa-gatekeeper` accepts the falsifiability form for these rows as
  expected evidence and REVISEs an `exception` whose only stated reason is that
  the surface came first.

## [1.10.0] - 2026-08-03

### Changed

- **Correction to the 1.9.2 deprecation notice.** That release announced four
  deprecations escalating "from warning to error" at 1.10.0. An audit against the
  code found the notice was accurate for one of them. `surface_type`-absent specs
  (`D-SURFACE-TYPE-MISSING`) did emit a warning and now escalate as promised. The
  pre-mutation-log iterate emit was already `error` under
  `R-EVIDENCE-MUTATION-UNLOGGED`, so no window ever applied to it. But
  `D-HANDOFF-LEGACY-FORMAT` and string-only `primary_tasks` **emitted nothing at
  all** during the 1.9.x window — the code that would have warned was never built.
  Escalating those two now would hand consumers a zero-length window, which is what
  REQ-0169 — the requirement the constraint cites as its own justification — exists
  to prevent. Both are re-pinned to 1.11.0 in `_policies/07_Constraints.md` and will
  emit a warning first.
- **`D-SURFACE-TYPE-MISSING` escalates to error.** A spec with a UI contract
  companion but no `surface_type` marker is excluded from the UI-bearing set, so its
  screens are skipped downstream — silently, while the finding said to "treat it as
  priority-2 cleanup rather than blocking". Affects projects with marker-less
  UI-bearing specs; run `/qfai-sdd`, which populates the field. Alongside it,
  `detection/surfaceType.ts` narrowed its companion match from `.ya?ml` to `.yaml`,
  matching `prototyping/specResolution.ts` — otherwise a stray `.yml` would now
  hard-fail as a companion nothing else recognises.
- **`prototyping certify` reports the legacy `prototyping.json` shape.** A record
  with `fullHarness.runId` instead of a top-level `runId` was accepted in silence,
  sealing a completion certificate with no operator signal while the migration memo
  said the shape was rejected. It now emits `D-DEPRECATED-SCHEMA` at the
  version-computed severity and still seals — the acceptance path stays, per OC-60.
- **A sunset can no longer be announced without being enforced.**
  `tests/core/sunsetLedger.test.ts` fails when a `SUNSETS` key has no consumer, when
  a constraint row names a finding code no source emits, or when a file parses a
  version next to a sunset instead of calling the shared comparator. The previous
  guard compared `isAtOrPastSunset` against `deprecationSeverity` — a tautology over
  the latter's own body — and iterated existing keys, while every gap found in this
  release was a missing one.
- **The legacy assistant-tree sunset joined that sweep.** `LEGACY_STEERING_SUNSET`
  was a fourth, separately-shaped SSOT (`{ major, minor }`) that `isAtOrPastSunset`
  could not parse, so three hand-rolled comparators had grown around it — in
  `assistantTreeMigration`, `skillDocReferences` and `init`. Two ignored the patch
  and prerelease fields, so they disagreed with every other deprecation about
  `1.10.0-rc.1`. The pin is now `SUNSETS.legacyAssistantSteering` and the label
  derives from it. `qfai init` reported the layout as "read-compatible for the
  current minor release only" with no version input at all, and wrote that same
  sentence into a commit-immutable migration memo — false at 1.10.0, and
  contradicted by `qfai validate` calling the identical layout an error. Both now
  compute their wording, and post-sunset the init line goes to stderr at error
  severity. **The readers are deliberately unchanged**: `qfai-validate.md` puts
  reader removal in the minor _after_ the sunset, and `qfai init
--upgrade-assistant-tree` has to keep reading the legacy tree to migrate it.
  `init` still exits 0, so no bootstrap script breaks; `qfai validate` remains the
  surface that fails the build.
- **Every sunset pinned to 1.10.0 is now enforced, not just documented.**
  Sunsets were declared in prose beside the code they governed, and each site
  decided separately whether to act: `prototyping.execution.browserTool:
"playwright-cli"` was documented as "at sunset only `playwright` is
  accepted" while the config loader accepted it unconditionally, the
  `D-DEPRECATED-PROBE` doctor check hard-coded `warning`, and `QFAI-AUD-001`
  hard-coded `info`. Shipping this version would have made all three notices
  false. `core/sunset.ts` now holds the single comparator and the sunset SSOT,
  and each site reads its severity from it:
  - `browserTool: "playwright-cli"` is refused by `loadConfig`, which falls
    back to the `playwright` default so a run that ignores the issue still
    targets a supported launcher. Only projects that set the value explicitly
    are affected.
  - `D-DEPRECATED-PROBE` reports `error`. The `sunset: 1.10.0` substring
    remains part of the wire contract.
  - `QFAI-AUD-001` on a UI contract authored before the `primary_tasks` slot
    reports `error`. Add the slot during the next `/qfai-sdd` cycle.

### Removed

- `.qfai/assistant/steering/` — the legacy pre-recut assistant layout reached
  the sunset pinned in `assistantPaths.ts#LEGACY_STEERING_SUNSET`, so
  `D-DEPRECATED-PATH` escalates from `warning` to `error` at this version.
  All eleven files already had canonical homes under
  `.qfai/assistant/manifest/` and `.qfai/assistant/catalog/`, and
  `qfai init` has not shipped the directory since v1.9.0 — only this
  repository still carried the copy. A project upgrading from an older tree
  runs `qfai init --upgrade-assistant-tree` to migrate.

### Added

- `TDDLIST_UNKNOWN_LEVEL` (warning): `tdd/test-list.md` validation now reports
  a `Level` value in `06_Test-Cases.md` that matches neither the coverage-target
  vocabulary nor the non-coverage vocabulary, lists the accepted values, and
  states that an unrecognized value is still treated as a coverage target. The
  finding is attributed to `06_Test-Cases.md` — the file whose cell must be
  edited — so `scope.paths` waivers match the real input, and it is emitted
  under rule id `TDDLIST-002` so a project that deliberately uses its own Level
  vocabulary can suppress or downgrade it through `.qfai/waivers.yml`.

### Fixed

- A waiver's `rule:` now accepts the `code` a finding actually publishes. The
  grammar was `^[A-Z]+-\d{3}$`, which matched none of the identifiers
  `qfai validate` prints: copying `QFAI-ATDD-112` out of `validate.json` — the
  only spelling the CLI, the JSON report and the GitHub annotations ever show —
  failed with a hard `QFAI-WAIVER-001` whose remediation text named
  `COMPAT-003`, a rule no validator emits. The form the engine did key on
  (`ATDD-112`) appeared in no shipped artifact, and 46 emitted codes —
  every `TDDLIST_*`, `W-*`, `E_*` and `R-*` rule, plus `D-DEPRECATED-PATH`,
  `D-SCAFFOLD-PLACEHOLDER` and `QFAI-CFG-LINK-00x` — matched neither branch and
  were unwaivable by construction. `rule:` now takes any code shape the package
  emits (`QFAI-ATDD-112`, `TDDLIST_UNKNOWN_LEVEL`, `E_TC_ORPHAN`,
  `D-SCAFFOLD-PLACEHOLDER`); the `QFAI-`-stripped form still resolves, so
  existing waiver files keep applying unchanged. A well-formed but unknown rule
  is now reported as `QFAI-WAIVER-004` (warning) rather than `QFAI-WAIVER-001`
  (error). `suppressed.byRule` is keyed by the spelling the waiver used. This
  also makes the newer `TDDLIST_*` findings waivable for the first time —
  `qfai-implement/SKILL.md` and `references/execution-ledger.md` already
  instruct operators to waive `TDDLIST_EVIDENCE_STATUS_ONLY` under
  `TDDLIST-004`, which the old grammar made impossible.
- The shipped `.qfai/waivers.yml` example named `COMPAT-003`, which no validator
  emits; it now shows `TDDLIST_UNKNOWN_LEVEL`, a real waivable warning.
  `STATIC_RULE_SEVERITY` no longer pre-declares the never-emitted `COMPAT-*`,
  `CTYPE-*`, `DELTA-*` and `VFY-*` families, its remaining entries carry every
  spelling a waiver may use, and a severity actually observed in the run now
  outranks the static declaration instead of the reverse. `README.md` and
  `qfai-verify/SKILL.md` state which spelling to write.

### Changed

- The TDD coverage-level filter now recognizes the `L1`…`L5` codes the shipped
  `06_Test-Cases.md` template actually produces, not only the word spellings.
  Previously every `L*` value was unknown and therefore a coverage target, so
  `TDDLIST_TC_NOT_COVERED` demanded a ledger row for every test case including
  the integration/api/e2e layers. Projects whose specs use the code form will
  see those `TDDLIST_TC_NOT_COVERED` findings disappear for `L3`–`L5` rows and
  remain for `L1`/`L2` rows.
- `QFAI-REVIEW-001` (root `.gitignore` managed-block check) now also
  requires the `.qfai/state.json` entry. The file is per-runtime state
  (written by `qfai discussion use`, `qfai atdd scaffold` escalation
  counters, and future single-file state holders); its header already
  states "NOT committed configuration". Existing consumers whose root
  `.gitignore` was generated by an earlier `qfai init` will see
  `QFAI-REVIEW-001` re-fire on validator upgrade — recovery is to
  re-run `qfai init` (idempotent: `ensureRootGitignoreEntries` strips
  the existing QFAI managed block via `removeManagedBlock` and then
  appends the current `QFAI_GITIGNORE_BLOCK` verbatim, so the new
  `.qfai/state.json` entry lands alongside the current managed
  entries (legacy lines listed in `QFAI_GITIGNORE_LEGACY_LINES` are
  stripped in the same pass; see the migration contract constants
  in `core/gitignore.ts` and the `removeManagedBlock` /
  `ensureRootGitignoreEntries` writer in `cli/commands/init.ts`)
  in a single block rewrite. The init branch also writes the new
  entry on fresh repos.

## [1.9.2] - 2026-06-01

### Added (second-wave defect remediation)

- Cycle-0 screen-coverage skeletons: `qfai prototyping iterate --cycle 0 --emit-skeletons`
  (opt-in) emits one token-driven placeholder HTML per declared screen, styled from
  the root `DESIGN.md` tokens, so every screen has both screenshot and HTML evidence
  after convergence without hand-skeletoning. `--skeleton-mode full|placeholder|stub`
  tunes cycle-0 fidelity per run (default `placeholder`). Unflagged default behavior is
  unchanged.
- DESIGN.md patch zone: a front-matter `patch_zone:` block lists line ranges / token
  names that may be edited without invalidating prototyping evidence. In-zone edits
  update only a `patchHash`; out-of-zone edits invalidate as before.
- `prototyping.mode` discriminator: `qfai.config.yaml#prototyping.mode` and
  `qfai prototyping iterate --mode <convergence|exploration>` (CLI overrides config;
  default `convergence`). Exploration mode relaxes the axes-exceptional and
  design-compliance gates to warning; structural and license gates stay hard.
  `qfai prototyping certify` rejects exploration-mode iterations.
- Stale review-pack archival: `qfai doctor --clean` moves review directories older than
  a configurable TTL (default 14 days, `review.staleTtlDays`) to `.qfai/review/_archive/`;
  never deletes. `qfai doctor --autoremediate` installs declared skill runtime
  dependencies, runs the archive, and writes missing default config keys
  (`--yes` / `--dry-run`; off by default in CI).
- `qfai atdd scaffold --spec <spec>` bulk-generates one test skeleton per declared test
  case (with TODO markers and framework imports); idempotent. `qfai validate` warns with
  `D-SCAFFOLD-PLACEHOLDER` until the TODO is removed (escalates to error after 3 cycles,
  `atdd.scaffoldEscalateCycles`).
- Per-skill `manifest.json` declaring `runtimeDependencies`; `qfai doctor --profile <skill>`
  probes each declared dependency and reports the install command for missing ones.
- `## Default Autopilot Policy` section in every SKILL.md (auto-decide / ask-user /
  hard-required buckets), reducing avoidable confirmation prompts per session.
- Cross-skill `handoff.yaml` canonical schema (`packages/qfai/src/core/schemas/handoff.ts`,
  documented in `references/handoff.md`); `qfai handoff upgrade <legacy-file>` converts a
  legacy file and preserves original fields under `legacy:`.
- Envelope-deviation decision audit log under `.qfai/evidence/decisions/` (git-ignored);
  `qfai audit log` lists records with `--scope` / `--operator` / `--clause` filters and
  `--format table|json`.
- Evidence-mutation audit log at `.qfai/evidence/prototyping/mutation-log.jsonl`
  (git-ignored) recording destructive mutations to per-iteration evidence.
- Active discussion session pointer: `.qfai/state.json#discussion.currentId` as the source
  of truth; `qfai discussion list --active` prints it. Multiple-active ambiguity is rejected
  with a recovery command.
- `qfai validate --profile saas-package` lightweight verify profile (prototyping profile +
  design-system attestation + handoff schema; ATDD / implement gates skipped with info
  findings). `qfai prototyping certify --scope saas-package` seals with
  `scope: "saas-package"` and a `notes:` field; does not claim full DONE.
- New Reviewer-Gate finding codes (severity error, mandatory justification):
  `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`,
  `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (warning), `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`,
  `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT`.
- Pack-location CI lane: `scripts/check-pack-locations.mjs` (wired into `pnpm ci:lint`)
  rejects `review-*/` / `discussion-*/` directories outside `tmp/`, `.qfai/review/<ts>/`,
  `.qfai/discussion/<ts>/`.

### Changed (second-wave defect remediation)

- `qfai-discussion` HTML mock template emits anchor-form hrefs (`#name`) by default and
  SKILL.md instructs authors accordingly; the mock-href validator stays strict (anchor and
  external URLs PASS, same-origin absolute paths still rejected). Template and validator are
  a locked SSOT-sync pair.
- The primary-tasks audit names a recommended count band (3..7) in the UI contract template
  and guide; the audit profile accepts both string-only and structured
  `{ id, label, acceptance }` items.
- `/qfai-sdd` auto-populates `surface_type: ui-bearing` frontmatter for specs with a UI
  contract companion.
- Reference docs (`iteration-loop.md`, `generator-prompt.md`, `handoff.md`,
  `evidence-requirements.md`) and each SKILL.md are realigned to the implemented behavior.

### Deprecated (second-wave defect remediation)

- Legacy ad-hoc handoff files (`D-HANDOFF-LEGACY-FORMAT`), `surface_type`-absent specs with
  a UI contract (`D-SURFACE-TYPE-MISSING`), string-only primary-tasks items, and
  pre-mutation-log iterate emit are accepted during a one-minor deprecation window.
  Sunset is qfai 1.10.0, at which the deprecation findings escalate from warning to error
  and the legacy forms are no longer accepted. See
  `.qfai/assistant/process/migrations/1.9.2-second-wave-defect-remediation.md` for the
  per-capability migration and recovery steps.

## [1.9.1] - 2026-05-24

### Added (qfai-prototyping defect remediation — CHG-005)

- Capture / serve as opt-in iterate flags: `qfai prototyping iterate --capture`
  and `qfai prototyping iterate --auto-serve` re-introduce capture infrastructure
  as **opt-in only** (default OFF). Formally amends `DR-0012-0029` ("no PNG /
  HTML / interaction.json capture") via `DR-0012-0031`; default behavior
  unchanged. `--capture` ships with the default Playwright runner
  (`defaultCaptureScreen.ts`, dynamic `await import("playwright")` so Playwright
  stays in `optionalDependencies`; per-screen
  `viewport`/`deviceScaleFactor`/`waitUntil`/`htmlSourceCopy` contract).
  `--auto-serve` ships with the default in-process `node:http` server
  (`defaultServerRunner.ts`) — no subprocess, `server.close()` with a 2s
  SIGINT teardown bound, and EADDRINUSE on a foreign owner is refused
  (exit 2 with the offending PID + command-line surfaced) rather than
  killed. Operators that need subprocess-spawn semantics (tree-kill /
  `taskkill /F /T`) supply their own `options.serverRunner` via the DI
  escape hatch. A read-only `--check-convergence` peek path is also
  shipped (TDD-0497): reads `.qfai/evidence/prototyping/prototyping.json`,
  exits 0 when `stopReason === "axes-exceptional"` with
  `acceptedIterationIndex` set, exits 2 otherwise. (REQ-0109 / REQ-0110,
  AC-0012-0059..0060.)
- `prototyping.json` validate-conformant schema: `iterations[i]` MUST carry
  non-null `commitSha` (accepts `"uncommitted"` sentinel), non-empty
  `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`,
  `pivotDirective`, `reviewerId`, and `evidenceRefs[]` with
  `{kind:"screenshot"|"html", path:"iter-NN/<screen-id>.<ext>"}` for every
  declared `screens[].id`. On convergence: top-level `acceptedIterationIndex`
  (number|null) and `stopReason ∈ {"axes-exceptional","max-iterations","license-verify-fail","input-error"}`.
  (REQ-0111, AC-0012-0061.)
- Profile-suffixed validate output: `.qfai/report/validate-<profile>.json` per
  profile + always-latest `.qfai/report/validate.json` with explicit `profile`
  field. Legacy `.qfai/output/validate.json` accepted during the deprecation
  window with `D-DEPRECATED-PATH` warning; sunset at qfai 1.10.0.
  Post-sunset, the legacy file is no longer written and `D-DEPRECATED-PATH`
  escalates to error severity, but only when on-disk evidence of a legacy
  consumer is present (the stale legacy file exists) — clean projects that
  never used the legacy surface see no finding. `qfai prototyping certify`
  now reads `validate.json#profile` and refuses with the recovery command
  `qfai validate --profile prototyping --fail-on error` on mismatch.
  (REQ-0120, BR-0004-0025..0026.)
  **Upgrade impact**: consumers (CI scripts, agent prompts, dashboards)
  reading `.qfai/output/validate.json` must migrate to
  `.qfai/report/validate.json` (always-latest, carries `profile` field) or
  `.qfai/report/validate-<profile>.json` (per-profile, independent files)
  before upgrading past qfai 1.10.0. The legacy path is still written
  during the v1.9.x window; at 1.10.0 it stops being written and the
  finding escalates to error. Delete any stale `.qfai/output/validate.json`
  after migrating to silence the post-sunset finding.
- SSOT-sync pair-changed CI lane: new `scripts/check-prompt-scanner-pair.mjs`
  wired into `pnpm ci:lint`. Rejects PRs that edit only one half of the
  `findDesignMdViolations.ts` (scanner) ↔ `generator-prompt.md` (LLM contract)
  pair with `R-PROMPT-SCANNER-DRIFT` (3-part justification: modified file,
  un-paired counterpart, unmatched clause). Both-changed and neither-changed
  PRs pass silently. (REQ-0102, BR-0004-0027..0028.)
- `qfai doctor` probe rebuild: `node_modules/.bin/playwright` (with Windows
  `.cmd`/`.bat`/`.ps1` variants) is the primary launcher candidate;
  `npx --no-install playwright --version` fallback; `playwright-cli`
  accepted-with-warning during the deprecation window (sunset 1.10.0).
  Failure-mode error text includes the install hint `npm i -D playwright`.
  `skills.integrity` default severity downgraded to `warning`; doctor summary
  groups findings into "errors blocking the active profile" vs
  "advisory findings (drift, non-blocking by default)". (REQ-0107 / REQ-0122,
  AC-0006-0010..0014.)
  **Upgrade impact**: pipelines using `qfai doctor --fail-on error` will no
  longer fail on `skills.integrity` drift (the severity now defaults to
  `warning`). Use `--fail-on warning` to preserve the old gate, or accept the
  new advisory semantics. The skills-integrity check itself is unchanged —
  only its severity classification.
- Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity error) emitted when a
  future PR wires `certify` to read validator output requiring `/qfai-atdd`
  or `/qfai-implement` artifacts at the prototyping phase. Resolution path:
  `verify.json#scope: "prototyping" | "full" | "atdd"` discriminator;
  `certify --check` accepts `scope: "prototyping"` as the phase-gate condition.
  (REQ-0112 / REQ-0113, DR-0001-0004, BR-0015-0008.)
- Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` (severity error) emitted on
  asymmetric modification of the
  `findDesignMdViolations.ts` ↔ `generator-prompt.md` SSOT-sync pair.
  Backed by a new `pnpm ci:lint` lane. Justification: 3-part required
  text naming (a) modified file path, (b) un-paired counterpart path,
  (c) unmatched contract clause. `qfai validate` rejects empty / whitespace-only
  justifications as advisory-failing errors. (REQ-0102 / REQ-0125,
  BR-0004-0027..0028, BR-0015-0009.)
- Tailwind ↔ DESIGN.md scanner contract: hybrid β (preflight literal allowlist
  for the 5 sentinels `#fff`, `#9ca3af`, `#e5e7eb`, `rgb(59 130 246 / 0.5)`,
  `--tw-ring-*`) + γ (scanner gate scope narrowed to `<body>`-only) per
  `DR-0001-0001`. `--*-shadow*:` custom-property declarations stripped per
  `DR-0001-0002`. CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`,
  `currentColor`) accepted by all 4 scanners. `scanFonts` / `scanRadius` /
  `scanShadow` import `unwrapVarReference` consistently with `scanColors`.
  (REQ-0101 / REQ-0103..0105, AC-0012-0053..0056.)
- CJK-aware `proseCritique` length validation: Intl.Segmenter (`word`
  granularity) primary with OR-fallback (`200..500 words OR 600..2500 chars`)
  per `DR-0001-0003`. Japanese-only 800–1500-char fixtures pass without
  regression to English 200–500-word fixture acceptance. (REQ-0106,
  AC-0012-0057.)
- Iterate ergonomics: `--cycle 0 --force` moves prior `iter-00/` to a
  timestamped backup (`iter-00.backup-<ISO>/`) before
  `clearEvidenceIterDirs` runs; non-converged cycle prints a top-3
  blocking-cause summary; md5-based duplicate-capture detection
  (`lap-009`, advisory-failing) + missing-route detection
  (`lap-010`, advisory-failing). (REQ-0117 / REQ-0118 / REQ-0121.)
- SDD UI contract template carries a `primary_tasks` slot per `screens[]`
  entry (shipped pre-populated with one example entry so the sample passes
  its own validate); `requirements-analyst` agent guide instructs ≥ 1
  primary_task per screen. QFAI-AUD-001 aligned validate lane uses a
  2-stage emission to distinguish slot-absent (legacy) contracts from
  slot-empty (intentional violation) contracts: key-absent → severity=info
  (non-blocking) under a one-minor-release deprecation window
  (sunset: qfai 1.10.0); key-empty (`primary_tasks: []`) → severity=error
  (blocking, intentional violation). All QFAI-AUD-001 findings name the
  offending file path, the screen id, and the rule token in a single
  user-facing message. (REQ-0115 / REQ-0117, AC-0013-0018.)
  **Upgrade impact**: consuming projects whose UI contracts predate v1.9.1
  do not carry the `primary_tasks` slot. On upgrade, `qfai validate` will
  surface QFAI-AUD-001 at severity=info (non-blocking) for each affected
  screen during the deprecation window, with a remediation message naming
  the sunset version. Recovery before sunset: add a `primary_tasks` slot
  (with at least one task) to each screen contract; at qfai 1.10.0 the
  slot becomes required and missing slots will block.
- Multi-spec posture: `/qfai-prototyping` SKILL.md realigned to single-spec
  per `DR-0001-0005` (option A); `resolveSurfaceUnion()` retained as an
  internal helper for validators / `show-spec` only. Full per-spec layout
  migration deferred. (REQ-0114.)
- Screen-id casing normalized to underscore end-to-end (iterate emit ↔
  validator expectation ↔ aggregate-dir filename ↔ `screens[].id`) per
  `DR-0001-0007`. Aggregate-dir mirror on convergence:
  `.qfai/evidence/prototyping/screenshots/<screen-id>.png` +
  `html/<screen-id>.html`. (REQ-0116.)
- One-minor-release deprecation window (`OC-60`) for all path / probe /
  schema changes; sunset = qfai 1.10.0. Migration memo
  `.qfai/assistant/process/migrations/v1.9.1-prototyping-defect-remediation.md`
  (immutable per `OC-61`). (REQ-0126 / REQ-0127.)

### Changed (CHG-005)

- spec-0012 `DR-0012-0031` formally amends `DR-0012-0029` ("no capture")
  by introducing opt-in `--capture` / `--auto-serve` flags. Inner-loop
  reviewer-driven Playwright posture from `DR-0012-0027` / `DR-0012-0029`
  preserved as the default.
- `_policies/05_Contracts.md` Contract Index gains `CLI-DOC` (new) and
  `CLI-PITER` (new); `CLI-PROT` / `CLI-VAL` / `DCON-005` updated.
- `_policies/06_Glossary.md` gains 9 finding-code / contract terms.
- `_policies/07_Constraints.md` gains `OC-60` / `OC-61` / `OC-62`.
- `_policies/08_Decisions.md` gains `DR-0001-0001..0009` resolving
  9 deferred OQs (OQ-0103/0104/0105/0107/0108/0109/0110/0111/0112).

## [1.9.0] - 2026-05-23

### Added (assistant-layer recut + steering work-log surface — CHG-003)

- 4-layer assistant-tree: `.qfai/assistant/{constitution,manifest,catalog,process}/`
  replaces the legacy single-layer `.qfai/assistant/steering/`. `qfai init`
  seeds the new layout; `qfai init --upgrade-assistant-tree` migrates
  existing projects (REQ-0018..0023 in spec-0003).
- Project-root `.qfai/steering/` repurposed as the AI work-log surface
  (entries with `kind: decision | risk | blocker | scope-down | …`).
  Skill bodies are the writers; `qfai validate` enforces frontmatter
  schema (`W-WORKLOG-SCHEMA`), link integrity (`W-WORKLOG-BROKEN-LINK`),
  staleness (`W-WORKLOG-STALE` at 90 days), and decision-promotion gate
  (`W-PENDING-PROMOTION`).
- Reviewer-Gate drift findings: `R-WORKLOG-DRIFT`, `R-REJECTED-READOPT`,
  `R-HANDOFF-INCOMPLETE` — finding-code implementation owned by
  spec-0004 (REQ-0036 / REQ-0042) and reviewer-input-bundle / R-\*
  schema obligation owned by spec-0015 CHG-003 (see
  `.qfai/specs/spec-0015/09_delta.md` "CHG-003" block and
  `.qfai/contracts/cli/qfai-validate.md` "New finding codes" table
  for per-code Source REQ mapping). Reviewer reports MUST carry
  non-empty `justification:` on these findings; empty values are
  rejected (advisory-failing).
- `assistantPaths.ts` SSOT module (`packages/qfai/src/core/paths/`)
  produces every distributed assistant-tree path string (REQ-0022 in
  spec-0003); hard-coded literals in `path.join(...)` position are
  lint-rejected by the SSOT import test in
  `tests/integration/initSpec0003.test.ts`.
- Migration memo authored at
  `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md`
  by `qfai init --upgrade-assistant-tree`; commit-immutable per OC-53.
  Sunset version inside the memo is computed via
  `nextMinorVersion(resolveToolVersion())` so no future-version
  literal ships in `dist/`.
- New validators wired into the SDD profile:
  `validateWorklogSurface`, `validateAssistantTreeMigration`,
  `validateSkillDocReferences`, `validateReviewerJustification`.
  Implementations under `packages/qfai/src/core/validators/`.
- New `--upgrade-assistant-tree` flag plumbed through `parseArgs`,
  `runInit` → `runUpgradeAssistantTree`. Legacy steering content is
  re-located into the appropriate new layer via
  `classifyLegacySteeringEntry`; existing files at the destination are
  preserved with a `W-USER-EDIT-PRESERVED` informational note.
- `W-USER-EDIT-PRESERVED` informational pass-through emitted by the
  migration helper and recognized by `qfai validate` as info-only.
- ATDD coverage closure for spec-0012 TC-0012-0396..0432 (PR #208
  late-review waves 11..50) appended to
  `tests/integration/qfai-traceability.md`.
- TC-0012-0416 / TDD-0436 cycle-9 idempotency regression test landed in
  `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`.

### Changed

- `.codex/README.md` and `.github/copilot-instructions.md` now reference
  the cross-AI rules under `.agents/rules/` (closing pre-existing
  drift caught by `agentsRulesSurface.test.ts`).
- spec-0003 / spec-0004 per-spec SDD pass: REQ-0018..0023 (spec-0003)
  and REQ-0034..0044 (spec-0004 — renumbered from initial REQ-0023..
  0033 draft in wave-7 ce5a6613 to preserve pre-existing AC/TC refs
  to REQ-0023..0031) fanned out into US/AC/BR/EX/TC, then
  TDD-0021..0026 (spec-0003) and TDD-0015..0025 (spec-0004) landed
  with full RED→GREEN evidence in `tdd/test-list.md`.

### Deprecated

- Legacy `.qfai/assistant/steering/` layout is read-compatible for the
  current minor release window only. `qfai validate` emits
  `D-DEPRECATED-PATH` whose body literally contains `sunset: vX.Y.Z`
  computed via `nextMinorVersion(resolveToolVersion())` (resolves to
  `sunset: v1.10.0` on this release). The same condition escalates
  to error from `v1.10.0+`.
- `W-SKILL-DOC-BROKEN-REF` (`qfai-*` SKILL.md referencing a legacy
  `.qfai/assistant/{instructions,steering}/<file>` path) follows the
  same escalation timeline: warning during the v1.9.x window, error
  from `v1.10.0+`. The headline shape branches with severity
  ("Read-compatible only..." pre-sunset; "past the announced
  sunset..." post-sunset) so consumers can disambiguate which mode
  fired. User-defined (non-`qfai-*`) skills are NOT flagged.

## [1.8.10] - 2026-05-19

### BREAKING CHANGES (PR #208 — `qfai prototyping show-spec` JSON schema reshape)

- **`qfai prototyping show-spec` JSON payload was reshaped** in the
  12th late-review wave (codex r3265482150). The pre-wave payload
  emitted three top-level keys (`specId`, `specMdPath`, `source`)
  resolved from the live primary spec; the new payload emits
  `{ frozenSpecsCovered, frozenSurfaceUnion, liveUiBearing, primary? }`
  where the pre-wave triple has been demoted to the optional `primary`
  block and `frozenSpecsCovered` / `frozenSurfaceUnion` / `liveUiBearing`
  are new top-level fields surfaced for drift visibility. Pinned-branch
  authorization ships this under v1.8.10 (codex r3265949051 /
  r3265954849 13th-wave Fix promoted the schema reshape from a buried
  `### Fixed` bullet to its own BREAKING block).
  - Migration (operator tooling): replace `show-spec | jq '.specId'`
    with `show-spec | jq '.primary.specId'`; the same one-liner applies
    to `.specMdPath` → `.primary.specMdPath` and `.source` → `.primary.source`.
    The `primary` block is itself optional (absent when no primary spec
    resolves), so robust callers should guard with `// empty` or `?`.
    The new top-level keys are SSOT-pinned in
    `.qfai/contracts/cli/qfai-prototyping.md#qfai prototyping show-spec`.
  - Intra-PR migration follow-up (waves 15 + 16, within v1.8.10): the
    `liveUiBearing` field also evolved within this PR — wave-15
    switched the resolver to `resolveSurfaceUnion` (the same resolver
    iterate's drift gate uses, so live scope is apples-to-apples with
    enforcement) and wave-16 aligned the documented schema with the
    actual emitted type (`string[]` of bare spec IDs, not `SpecRef[]`).
    Per-spec metadata is now solely available via the optional
    `primary` block. Operator tooling that grepped `show-spec | jq
'.liveUiBearing[].specId'` MUST migrate to `show-spec | jq
'.liveUiBearing[]'` (or `show-spec | jq '.primary.specId'` when
    only the primary spec is needed). See the
    `### Fixed (PR #208 16th late-review wave)` entry below for the
    underlying alignment commit; this sub-bullet exists to keep the
    BREAKING block self-contained.
  - Precondition change: `show-spec` now hard-requires a seeded
    `prototyping.json` and exits 2 when the file is missing or
    malformed. Operators who previously ran `show-spec` _before_
    `iterate --cycle 0` to plan the run must now seed via cycle 0
    first; this is the contracted precondition for reading the
    cycle-0 frozen `frozenSpecsCovered[]`.

### BREAKING CHANGES (PR #208 — ImageSource attribution required)

- **`ImageSource.attribution` is now read at the runtime license gate.**
  Prior to the 12th late-review wave, `licenseVerify` did not validate
  attribution at all; the field was deferred to the handoff stage. The
  CLI contract's exit-66 class always listed "missing attribution"
  among the rejection conditions, so unattributed stock photos that
  satisfied the source/license/host gates passed iterate silently and
  only surfaced at certify time. The runtime now emits
  `{code: "license-missing-attribution", source, url}` whenever
  `attribution` is undefined or an empty string, exiting 66 alongside
  the other license-class rejections.
  - The `ImageSource` type carries `attribution?: string` (optional at
    the type level so existing fixtures continue to compile). The
    runtime gate enforces non-empty.
  - `collectImageSources` promotes a missing / non-string attribution
    to `""` (rather than treating it as an input-shape error → exit 2)
    so the rejection lands in the license-class (exit 66) per the
    contract.
  - Migration: any consumer constructing `ImageSource` values directly
    must now populate `attribution`; otherwise `licenseVerify` returns
    a `license-missing-attribution` error. The behavior is intentional
    — entries that previously slipped through the iterate gate
    unattributed will now be caught at iterate time rather than at
    certify time. No auto-migration shim; offending entries surface a
    structured error per affected URL.
  - Pinned-branch authorization is preserved: this lands in 1.8.10
    because `feature/v1.8.10` is the release pin.

### Fixed (PR #208 50th late-review wave)

- **`hasMatchingUiContract` file-vs-directory discrimination (codex
  r3271969283, P2 — chatgpt-codex-connector):** the direct-match
  arm in `core/prototyping/specResolution.ts` used
  `access(<uiDir>/<specId>.yaml)` to confirm existence, but
  `access` does NOT distinguish a file from a directory. A
  misauthored project with `<contractsDir>/ui/0007.yaml/` as a
  directory would have made `hasMatchingUiContract()` return
  `true`, falsely classifying spec-0007 as UI-bearing and driving
  `resolveSurfaceUnion()` / `resolvePrimaryPrototypingSpec()` to
  report a phantom UI surface — `prototyping iterate` / drift
  gates would then run against that phantom instead of taking the
  documented no-op path. Switched to `stat().isFile()`, consistent
  with the entries-walk branch's `entry.isFile()` filter for the
  spec-prefixed / ui-prefixed candidates. Removed the now-unused
  `access` import. New TC-0012-0432 + TDD-0452 + EX-0012-0161 —
  fixture creates a directory named like a UI-contract file at
  the canonical path and asserts `resolveAllUiBearingSpecs()`
  returns `[]`.

### Fixed (PR #208 49th late-review wave)

- **Partner-helper regression test (codex r3271867391, P1 —
  implementation-reviewer + codex r3271867923 MAJOR — qa-gatekeeper,
  same finding):** wave-48 fixed `readUiContractScreenContracts`
  (`path.join` → `path.resolve`) for partner-helper consistency
  with the wave-47 `readPerSpecScreens` fix, but did not add a
  regression test. The two helpers have the SAME responsibility on
  the certify path, so without a structural symmetry test a future
  `path.join` regression in the project-wide reader would silently
  break certify on explicit-contracts-dir workflows (project-wide
  pass returns empty while per-spec returns full set → asymmetric
  screen discovery). New TC-0012-0431 + TDD-0451 + EX-0012-0160
  pin the symmetry directly via the exported
  `readUiContractScreenContracts` API — fixture writes a
  project-wide `screens.yaml` at an absolute `contractsDir`
  outside `root` and asserts the reader returns both declared
  screens. AC anchor: AC-0012-0047 (same as TC-0012-0430 so the
  partner-helper pair shares the AC binding). r3271868724 PASS
  NIT (requirements-reviewer OQ-0012-0012 well-formedness audit)
  closed without action.

### Fixed (PR #208 48th late-review wave)

- **`readUiContractScreenContracts` absolute-path fix (codex
  r3271787723, P1 — architecture-reviewer):** partner to wave-47's
  `readPerSpecScreens` fix. The project-wide screen reader in
  `core/contracts/screenContracts.ts` used the same
  `path.join(root, contractsDirRelative, "ui")` pattern, so an
  absolute `paths.contractsDir` override would have made the
  project-wide pass produce different discovery results than the
  per-spec pass after wave-47 — a least-astonishment / SoC
  violation between two helpers with the same responsibility.
  Switched to `path.resolve()`.
- **Systematic audit deferred follow-up (codex r3271787723, P1
  architectural concern — deferred):** the same review thread
  flagged ~11 other `path.join(root, config.paths.*, ...)` call
  sites with the same bug class (lockAbs in iterate / certify,
  `doctor.ts`, `validators/bpApDb.ts`,
  `validators/designAudit.ts`,
  `validators/designContractReadiness.ts`,
  `validators/designToken.ts`,
  `validators/uiDefinitionConsistency.ts`). Several run only
  during validate-time gates, not the prototyping loop. Deferred
  to a focused follow-up PR per the reviewer's "scope-out +
  explicit follow-up record" option. New OQ-0012-0012
  registered with the full call-site list, due 2026-06-30,
  recommending helper consolidation
  (`resolveContractsDir(root, config)` / `resolveSpecsDir(root, config)`)
  - a lint rule (`no-restricted-syntax` on the offending
    pattern) so the regression cannot reappear.

### Fixed (PR #208 47th late-review wave)

- **`readPerSpecScreens` absolute-path fix (codex r3271715563, P1 —
  chatgpt-codex-connector):** the helper built
  `uiDir = path.join(root, contractsDirRelative, "ui")`. When
  `qfai.config.yaml` carries an absolute `paths.contractsDir`
  override (e.g. `/abs/contracts`), `path.join` concatenates root +
  absolute rather than resetting, so the probe at
  `<root>/abs/contracts/ui` misses every per-spec contract file at
  the real `/abs/contracts/ui/spec-NNNN.yaml`. The helper returned
  `null` and certify's per-(spec × screen) gate silently fell back
  to the project-wide screen list, enforcing the wrong
  `(spec, screen)` coverage for explicit-contracts-dir workflows.
  Switched to `path.resolve()` which correctly resets to the
  latter absolute segment when one is supplied. Same pattern as
  the wave-45 `specDirExists` fix for `paths.specsDir`. New
  TC-0012-0430 + TDD-0450 + EX-0012-0159 — fixture writes the
  per-spec UI contract at an absolute `contractsDir` pointing
  OUTSIDE root and asserts `readPerSpecScreens()` returns the
  declared screens rather than `null`.
- **Cross-platform absolute-path narrative (codex r3271709884,
  MINOR — requirements-reviewer):** the wave-45 EX-0012-0158 /
  TC-0012-0429 narratives said only "ABSOLUTE path" without
  explicitly noting cross-platform coverage. Both now explicitly
  note the contract holds for POSIX (`/abs/...`), Windows
  drive-letter (`C:\...`), and UNC (`\\host\share\...`) absolute
  paths; the OS-native `mkdtemp` fixture exercises whichever
  absolute shape the CI matrix lane's OS produces (Node's
  `path.resolve` is platform-aware and treats either as absolute).

### Fixed (PR #208 46th late-review wave)

- **TC-0012-0429 fixture dead-key cleanup (codex r3271708081, MINOR
  — requirements-reviewer + r3271706477 / r3271707791 NIT — same
  finding):** the wave-45 fixture passed `specsDirOverride: "<abs>"`
  to `seedSimpleConfig.extra[]`, which inserted an unknown YAML key
  into the test `qfai.config.yaml`. The qfai.config schema has no
  `specsDirOverride` field (the canonical key is `paths.specsDir`);
  `loadConfig` ignored it, and the actual override flowed through a
  subsequent string-replace step. The dead key risked misleading
  future readers and could trip a future strict-unknown schema
  validator. Removed the line and added a comment documenting that
  the override is performed via the canonical `paths.specsDir`
  patch only.

### Fixed (PR #208 45th late-review wave)

- **`specDirExists` absolute-path fix (codex r3271656121, P1 —
  chatgpt-codex-connector):** `specDirExists()` in
  `core/prototyping/specResolution.ts` built the probe path with
  `path.join(root, specsDir, dirName)`. When `qfai.config.yaml`
  carries an absolute `paths.specsDir` override (e.g. `/tmp/specs`),
  `path.join` silently concatenates root + absolute rather than
  resetting to the absolute, so the probe at
  `<root>/tmp/specs/spec-NNNN` misses the real on-disk spec dir at
  `/tmp/specs/spec-NNNN`. `resolveSurfaceUnion()` then drops the
  `prototyping.primarySpecId` pin and `prototyping iterate
--cycle 0` hits the zero-UI short-circuit (exit 0) for
  explicit-primary workflows using absolute path overrides.
  Switched to `path.resolve()` which correctly resets to the
  latter absolute segment when one is supplied (relative
  `specsDir` still composes against `root` the same way
  `path.join` did). New TC-0012-0429 + TDD-0449 + EX-0012-0158 —
  fixture writes an absolute `specsDir` pointing OUTSIDE root,
  seeds the primary spec there, and asserts
  `resolveSurfaceUnion(root, config)` returns the pinned id.

### Fixed (PR #208 44th late-review wave)

- **show-spec stderr 2-block layout (codex r3271639132, NIT —
  product-surface-reviewer):** the wave-43 stderr re-narrowing
  produced a 3-segment single sentence that buried the operator-
  actionable CTA inside a long claim → narrowing → recovery chain on
  narrow terminals. Restructured to the 2-block layout the
  iterate-side `frozenSurfaceUnion missing` diagnostic uses
  (introduced wave-24 for the same scan-readability parity): CTA
  headline + blank separator + indented `Reason:` block. CTA
  `Re-run qfai prototyping iterate --cycle 0` now leads; the
  rationale (certify hard-error symmetry + iterate-side
  separate-mechanism note) follows on the `Reason:` line. No
  behaviour change; runtime-string layout only. Existing
  TC-0012-0428 substring assertion still passes (loose `"present"`
  - `"malformed"` match).

### Fixed (PR #208 43rd late-review wave)

- **show-spec runtime stderr surface-scope narrowing (codex
  r3271608582, MINOR — requirements-reviewer):** the wave-38
  `error(...)` runtime string emitted by `runPrototypingShowSpec`
  on the malformed branch still carried the "iterate / certify
  both treat a malformed multi-spec frozen scope as a hard error"
  over-claim, even though wave-41 / 42 corrected the same wording
  in AC-0012-0052 / EX-0012-0157 / show-spec JSDoc. Operator-visible
  stderr is the most-exposed SSOT surface — re-narrowed to
  acknowledge that iterate-side handles present-but-malformed
  `frozenSpecsCovered` via a different mechanism (legacy
  `specsCovered` reader + `frozenSurfaceUnion` drift gate),
  matching the rhetorical anchor of the spec-side / JSDoc fixes.
  No code-path / behavior change; runtime-string only.

### Fixed (PR #208 42nd late-review wave)

- **AC-0012-0052 wording correction — surface-scope alignment
  (codex r3271136886, MINOR — architecture-reviewer):** the
  wave-40 AC-0012-0052 sub-clause carried the same "iterate and
  certify both treat the same input as a hard error" over-claim
  that wave-41 already corrected in EX-0012-0157 and the
  `prototypingCertify.ts` show-spec JSDoc. AC and JSDoc are now
  consistent: certify treats the same input as a hard error per
  class (h); iterate-side handles present-but-malformed
  `frozenSpecsCovered` via the legacy `specsCovered` reader +
  `frozenSurfaceUnion` drift gate (a different mechanism), so the
  cross-surface symmetry the absent-vs-malformed contract
  enforces is certify ↔ show-spec, not all three commands.
  AC-0012-0052 sub-clause also condensed to fit the markdownlint
  MD013 line-length budget.

### Fixed (PR #208 41st late-review wave)

- **EX-0012-0157 surface-scope narrowing (codex r3271095022, MINOR —
  requirements-reviewer):** the wave-38 EX-0012-0157 Then clause
  claimed "iterate / certify both treat a present-but-malformed
  `frozenSpecsCovered` as a hard error", but iterate-side
  present-but-malformed is handled via the legacy `specsCovered`
  reader + `frozenSurfaceUnion` drift gate — NOT the SSOT
  classifier path that certify / show-spec share. The wave-40
  JSDoc rewording acknowledged this surface split but EX-0012-0157
  still carried the overstated cross-command claim, creating an
  Example ⇄ AC drift (no iterate-side AC anchor exists). Rewrote
  the Then clause to cite AC-0012-0045 class (h) (certify) and
  AC-0012-0052 (show-spec) directly and note that iterate-side
  handles the same input via a different mechanism. No code or
  test change.

### Fixed (PR #208 40th late-review wave)

- **JSDoc orphan re-fix (codex r3271087212, NIT —
  architecture-reviewer):** the wave-38 `CANONICAL_SPEC_DIR`
  insertion orphaned the existing `hasPerSpecSubdir` JSDoc (TSDoc
  binds only the last JSDoc to the next declaration — the same
  hazard waves 32 / 35 already fixed on `normalizeSpecDirName`).
  Reordered so `CANONICAL_SPEC_DIR` const + JSDoc precede
  `hasPerSpecSubdir` and the function's own JSDoc sits adjacent.
- **TC-0012-0427 AC-Ref rebind (codex r3271092532, MINOR —
  requirements-reviewer):** the regression test pins certify-side
  per-spec presence aggregation, not iter-dir layout regulation.
  AC-Ref rebound from AC-0012-0046 (per-spec iter-dir namespacing)
  to AC-0012-0047 (certify aggregates per-spec presence) across
  06_Test-Cases.md / 16_Traceability-ledger.md / tdd/test-list.md.
- **AC-0012-0052 sub-clause + TC-0012-0428 AC-Ref rebind (codex
  r3271093350, MINOR — requirements-reviewer):** AC-0012-0052
  (show-spec JSON payload contract) now carries a sub-clause
  mirroring AC-0012-0045 class (h) onto the show-spec surface, so
  the absent-vs-malformed discrimination contract holds across all
  three CLI surfaces. TC-0012-0428 AC-Ref rebound from
  AC-0012-0045 to AC-0012-0052.
- **show-spec scope-narrowing JSDoc rewording (codex r3271093206,
  FYI — architecture-reviewer):** the wave-38 motivation rhetoric
  ("iterate / certify both treat the same input as a hard error")
  overstated iterate's semantic. iterate handles present-but-
  malformed `frozenSpecsCovered` via the legacy `specsCovered`
  reader + `frozenSurfaceUnion` drift gate, not the SSOT
  classifier. JSDoc reworded to acknowledge the surface split.
- **r3271007632 closure attribution moved to wave-37 (codex
  r3271094169, MINOR — requirements-reviewer):** the
  `null`/`undefined` enumeration backfill landed in wave-37
  (`ef013528`), not wave-38. 09_delta closure attribution moved
  to the correct entry; wave-38 header recount adjusted to 5
  threads.

### Fixed (PR #208 39th late-review wave)

- **EX-0012-0154 / EX-0012-0155 BDD structure (codex r3271039452,
  MAJOR — requirements-reviewer):** the 32nd-wave EX-0012-0154 was
  missing the When / Then clauses, and the 33rd-wave EX-0012-0155
  had two duplicated When / Then pairs that mixed in EX-0012-0154's
  responsibility (path-traversal defence). Restructured both to
  canonical Given / When / Then format: EX-0012-0154 now carries
  the path-traversal When/Then (`reads the record and validates
each entry against CANONICAL_SPEC_ID`, `exits 2 with the
malformed id echoed verbatim`); EX-0012-0155 carries only the
  absent-vs-malformed discrimination When/Then.
- **EX-0012-0155 enumeration drift (codex r3271037888, MINOR —
  requirements-reviewer):** the wave-37 enumeration backfill
  extended the AC + CLI contract classes (h) with `explicit null /
undefined` but did not cascade into EX-0012-0155's Given clause.
  Example layer was still showing the wave-33 4-classes shape, so
  TC-0012-0426 (which now covers 5 classes via the `explicit null`
  it.each row) was no longer SSOT-aligned with its EX-Ref. Extended
  EX-0012-0155 Given with the 5th class and the Then clause with
  the corresponding `value is null` / `value is undefined`
  rejection reasons.
- **"no user prompt is emitted" scope restoration (codex
  r3271039011, MINOR — requirements-reviewer):** the wave-37
  AC-0012-0045 restructure lifted the ordering invariant out of
  class (h) but left `AND no user prompt is emitted.` as an
  indented continuation of class (h)'s Then block. Original
  CHG-002 intent was a cross-class postcondition binding all of
  (a)-(h). Lifted to its own catalog-level bullet with explicit
  "applies cross-class to (a)-(h)" wording so a grep of
  AC-0012-0045 cannot misread it as class-(h)-specific.

### Fixed (PR #208 38th late-review wave)

- **show-spec fail-closed on malformed `frozenSpecsCovered` (codex
  r3271018000, P2 — chatgpt-codex-connector):** `runPrototypingShowSpec`
  previously read `frozenSpecsCovered` via
  `readStringArrayField(...) ?? readStringArrayField(specsCovered)`,
  collapsing "field absent" and "field present-but-invalid" into one
  null fallback. A hand-edited multi-spec record with a malformed
  `frozenSpecsCovered` would silently downgrade the reported scope
  to the legacy `specsCovered` field, misleading operators /
  automation making recovery decisions because iterate / certify
  both treat the same input as a hard error. show-spec now consumes
  the SSOT classifier `classifyFrozenSpecsCoveredMultiSpec()` and
  exits 2 with a "present but malformed" diagnostic on the
  malformed branch — only `absent` (key omitted) still legitimately
  falls back to legacy `specsCovered`.
- **`hasPerSpecSubdir` restricted to canonical `spec-\d{4}` dirs
  (codex r3271018003, P2 — chatgpt-codex-connector):** the per-spec
  layout probe activated the per-(spec × screen) gate on any
  iteration directory whose name started with `spec-`. An incidental
  sibling like `spec-assets/`, `spec-temp/`, or `spec-archive/` in a
  legacy flat-iter project would spuriously activate the gate and
  fail with missing review-json coverage the run never intended to
  produce. The probe now requires an anchored
  `^spec-\d{4}$` match so gate activation only fires on canonical
  per-spec evidence directories.
- **Wave-35 P1 traceability stitch (codex r3271008259 MINOR —
  qa-gatekeeper + codex r3271011545 MAJOR — requirements-reviewer):**
  the wave-35 `indexPerSpecScreens()` removal closed the partial-set
  bug but shipped without a registered TC / TDD / EX anchor. Added
  `TC-0012-0427` + `TDD-0447` + `EX-0012-0156` with a regression
  test pinning the contract: multi-file subdir layout where two
  specs share a `screenId` and one spec carries a unique screen
  forces certify to enumerate the FULL per-spec union via
  `readPerSpecScreens()` (the partial indexed re-parse would let
  a missing shared-screenId review.json pass silently). AC anchor:
  AC-0012-0046 (per-spec iter-dir namespacing).
- **TDD-0444 wave-label cascade (codex r3271013103 MINOR —
  requirements-reviewer):** the wave-35 `29th-wave Fix` →
  `30th-wave Fix` comment correction in
  `prototypingIterate.ts:1298` was not cascaded into the
  `tdd/test-list.md` and `16_Traceability-ledger.md` TDD-0444
  narratives, which still read "29th late-review wave" /
  "29th-wave". Both narratives now read "30th late-review wave" /
  "30th-wave" so all four artifacts pinning codex r3270687650 P1
  (iterate src comment, TC narrative, test-list, ledger) carry a
  consistent wave label.

### Fixed (PR #208 37th late-review wave)

- **Wave-36 enumeration backfill (codex r3271006127, MINOR —
  chatgpt-codex-connector):** wave-34 introduced operator-facing
  enumerations of the present-but-malformed sub-classes in both the
  CLI contract certify exit-2 row and AC-0012-0045 class (h)
  (`non-array, empty array, non-string entry, empty-string entry`).
  Wave-36 extended the classifier to also classify explicit `null` /
  `undefined` on a present key as `malformed`, but did not update
  those enumerations. An operator hand-editing
  `"frozenSpecsCovered": null` would see a
  `present but malformed (value is null)` diagnostic that did not
  match any class enumerated in the SSOT. Both the contract row and
  AC class (h) now list `null` / `undefined` alongside the four
  existing sub-classes.
- **AC-0012-0045 ordering invariant restructured (codex r3271006396,
  MINOR — requirements-reviewer):** the 34th-wave ordering invariant
  was added as a continuation of class (h)'s Then block via
  `AND no user prompt is emitted, AND **(ordering invariant ...)**`,
  which could be misread as a class-(h)-specific postcondition. The
  clause is actually a cross-class scheduling rule applying to the
  full hard-stop catalog (a)-(h). Lifted to its own bullet at the AC
  catalog level (sibling of When / Then) with an explicit "applies
  cross-class to (a)-(h); not a postcondition of any single class"
  note so a future `shouldStop`-first regression can cite a single
  AC bullet rather than chase the clause inside a class continuation.

### Fixed (PR #208 36th late-review wave)

- **Classifier explicit-null tightening (codex r3270923641, P1 —
  chatgpt-codex-connector):** wave-33's
  `classifyFrozenSpecsCoveredMultiSpec()` returned
  `kind: "absent"` when `prototyping.json#frozenSpecsCovered` was
  explicitly `null` (or `undefined`) on a present key, which on the
  certify side triggered the legacy fallback to single-spec
  `specsCovered` — re-opening the same evidence-gap vector wave-33
  had closed. A hand-edited `"frozenSpecsCovered": null` is a
  corrupt edit, not a "field omitted" record. The classifier now
  returns `kind: "malformed"` with reason `"value is null"` (or
  `"value is undefined"`) so certify fails closed instead of
  silently downgrading to primary-spec scope. New `it.each`
  integration row for explicit-null at the certify call site;
  unit suite extended with 2 new malformed-branch `it` blocks
  (removed the previous "absent when null/undefined" branch).

### Fixed (PR #208 35th late-review wave)

- **Per-spec screens partial-set bug (codex r3270911400, P1 —
  chatgpt-codex-connector):** the wave-9 `indexPerSpecScreens()`
  optimisation pre-built a per-spec map from project-wide
  `screenContracts.sourceRef` and used it whenever the indexed entry
  was non-empty, only falling back to `readPerSpecScreens()` on
  missing/empty. For multi-file subdir layouts (`spec-NNNN/<sub>.yaml`)
  where some screens shared `screenId` with another spec, project-wide
  dedup left only the surviving sourceRef paths in the bucket —
  partial files in the indexed re-parse, and the per-(spec × screen)
  gate falsely passed without requiring `<spec>/<shared-screen>.review.json`.
  Removed the index optimisation entirely; certify now calls
  `readPerSpecScreens()` unconditionally for every spec in the
  frozen set (the helper does its own authoritative `fg()` discovery).
  `indexPerSpecScreens` / `chooseWinningFiles` /
  `extractSpecDirFromUiRel` helpers removed (only the indexing
  pathway used them).
- **JSDoc orphan on `normalizeSpecDirName` (codex r3270895911, MINOR —
  architecture-reviewer):** wave-32 inserted a JSDoc block for
  `CANONICAL_SPEC_ID` directly above `normalizeSpecDirName`,
  orphaning the latter's docs (TypeDoc / IDE bind only the LAST
  JSDoc to the next declaration). Relocated `CANONICAL_SPEC_ID`
  (with its JSDoc) to the top-of-file module-constants section,
  restoring `normalizeSpecDirName`'s JSDoc adjacency.
- **Wave-number comment correction (codex r3270896487, NIT —
  completion-reviewer):** `prototypingIterate.ts` L1298 comment
  `29th-wave Fix` corrected to `30th-wave Fix` (commit `d9fed238`
  was the 30th late-review wave; archaeology / regression
  triangulation needs the wave label to match the commit history).
- **TC-0012-0424 branch-coverage gap (codex r3270897052, MINOR —
  qa-gatekeeper):** the wave-30 reorder moved TWO drift classes
  before `shouldStop()` (`frozenUnion === null` + `drift.drifted`).
  TC-0012-0424 only pinned the second branch. Added a second `it`
  block covering the first: converged loop with `frozenSurfaceUnion`
  field omitted from `prototyping.json` exits 2
  (`frozenSurfaceUnion is missing or malformed`) instead of
  returning the convergence exit 64.
- **TC-0012-0425 leading-whitespace coverage (codex r3270897573, NIT —
  qa-gatekeeper):** the canonical-id validation gate's `it.each`
  table only covered trailing whitespace. Added 2 rows
  (`" 0001"` leading whitespace + `"\t0001"` tab whitespace) so a
  future "strip leading whitespace before validation" defensive
  transform cannot slip a `" /../foo"`-style path-traversal vector
  past the canonical-id gate.

### Fixed (PR #208 34th late-review wave)

- **CLI contract certify exit-2 row enumeration (codex r3270886845,
  MINOR — product-surface-reviewer):** `.qfai/contracts/cli/qfai-prototyping.md`
  certify exit-2 row now enumerates the two `frozenSpecsCovered`
  classes added in waves 32 / 33 — non-canonical entries (any value
  not matching bare 4-digit `NNNN` or fully-qualified `spec-NNNN`)
  and present-but-malformed field (key on record but value
  non-array / empty / non-string / empty-string). Pre-fix the row
  only listed "Missing / unreadable `prototyping.json`, missing
  `specsCovered[]`, accepted iter dir absent, certificate schema
  malformed" so operators looking at the contract after a
  hand-edited / corrupt `prototyping.json` exit-2 could not predict
  the cause from contract alone (stderr → contract traceability
  broken). Recovery path (`iterate --cycle 0`) also named in the row.
- \*\*09_delta narrative backfill — waves 26-31 (codex r3270888066 MINOR
  - r3270889565 MAJOR — requirements-reviewer + completion-reviewer):\*\*
    `.qfai/specs/spec-0012/09_delta.md` previously jumped wave-25 →
    wave-32 with six waves of narrative missing, breaking spec ↔
    commit-history correspondence. Backfilled R26 / R27 / R28 / R29 /
    R30 / R31 entries (each with thread IDs + AC-Refs / TC-Refs +
    impact scope) so the spec-side SSOT is reconstructable without
    `git log` excavation.
- **AC-0012-0045 ordering invariant (codex r3270889168 MINOR —
  requirements-reviewer):** the wave-30 drift-gate-before-`shouldStop`
  ordering invariant was previously pinned only by EX-0012-0153 and
  TC-0012-0424 / TDD-0444; AC-0012-0045's hard-stop catalog
  enumerated classes (a)-(h) but did not normatively require
  hard-stop classes to be evaluated BEFORE convergence / budget
  signals. AC-0012-0045 Then clause now carries the ordering invariant:
  "Hard-stop classes (a)-(h) MUST be evaluated BEFORE convergence /
  budget-exhaustion signals; when both fire in the same invocation,
  the hard-stop class wins and convergence is suppressed." This
  gives the wave-30 behaviour a normative AC anchor so a future
  `shouldStop`-first regression has a requirements-layer violation
  to cite, not just an example / test contradiction.

### Fixed (PR #208 33rd late-review wave)

- **Certify-side absent-vs-malformed `frozenSpecsCovered`
  discrimination (codex r3270861808, P1 —
  chatgpt-codex-connector):** new SSOT classifier
  `classifyFrozenSpecsCoveredMultiSpec()` in
  `core/prototyping/specsCovered.ts` returns
  `{kind: "absent" | "malformed" | "ok"}`. Pre-fix the certify
  per-(spec × screen) gate AND the cert-sealing call site used
  `readFrozenSpecsCoveredMultiSpec(...) ?? readFrozenSpecsCovered(...)`,
  which collapsed "missing" and "present-but-invalid" into one
  branch. A partial / corrupt edit of `frozenSpecsCovered` (key on
  the record but value non-array / empty / non-string entry /
  empty-string entry) would silently fall back to legacy
  single-spec `specsCovered`, downgrading multi-spec certification
  scope to the resolved primary spec only and letting missing
  secondary-spec review evidence ship a sealed completion
  certificate. Post-fix both call sites consume the classifier
  directly: `malformed` exits 2 with a "present but malformed"
  diagnostic naming the rejection reason (e.g. `not an array`,
  `empty`, `non-string`, `empty-string`); `absent` (key omitted)
  still legitimately falls back to legacy `specsCovered` for
  pre-Wave-3 evidence compatibility. AC-0012-0045 hard-stop catalog
  extended with class (h). New TC-0012-0426 + TDD-0446 +
  EX-0012-0155 (5 parametrized integration `it` blocks + 1
  absent-fallback companion + 8 unit `it` blocks for the
  classifier in `specsCovered.test.ts`).

### Fixed (PR #208 32nd late-review wave)

- **Certify-side canonical-spec-id validation gate (codex r3270776268,
  P2 — chatgpt-codex-connector):** `prototypingCertify.ts#runPrototypingCertify`
  now validates every `prototyping.json#frozenSpecsCovered[]` entry
  against `CANONICAL_SPEC_ID` (`/^(?:spec-)?\d{4}$/u`) BEFORE the
  per-(spec × screen) review.json presence gate calls
  `normalizeSpecDirName` / `path.join`. Pre-fix `normalizeSpecDirName`
  only stripped/re-added the `spec-` prefix, so a hand-edited
  `prototyping.json` carrying values like `"../../../etc/passwd"`,
  `"spec-0001/../../escape"`, `"0001 "` (whitespace), `"spec-abcd"`,
  or `"spec-001"` (wrong digit count) would have flowed straight
  into `path.join(root, "iter-NN", id, "<screen>.review.json")` and
  let the gate probe outside the intended `iter-NN/spec-NNNN/`
  subtree — potentially "satisfying" missing-review checks with
  unrelated files. Post-fix certify exits 2 with the malformed id
  echoed verbatim (`JSON.stringify` form) and the canonical shape
  (`spec-NNNN` / 4-digit `NNNN`) named in stderr; operator is
  directed to re-run `qfai prototyping iterate --cycle 0` to
  regenerate the record. AC-0012-0045 hard-stop catalog extended
  with class (g); new TC-0012-0425 + TDD-0445 + EX-0012-0154 (six
  `it` blocks: path-traversal / slash-injected / whitespace /
  non-numeric / wrong-digit-count malformed variants + one
  canonical-coexistence happy path proving bare `0012` and
  fully-qualified `spec-0007` ids still pass).

### Fixed (PR #208 31st late-review wave)

- **Certify spec-set source contract (codex r3270736005, P2 —
  chatgpt-codex-connector):** the `qfai prototyping certify` Inputs
  section previously claimed it reads `prototyping.json#specsCovered`
  via `readFrozenSpecsCovered()`. The implementation actually
  resolves the spec set with `readFrozenSpecsCoveredMultiSpec(...) ??
readFrozenSpecsCovered(...)` — the multi-spec `frozenSpecsCovered[]`
  field is the first source, legacy `specsCovered[]` is the
  fallback. The contract now names that precedence so operators /
  automation diagnosing certify exit-64 coverage rejections don't
  mistake `specsCovered` for the SSOT field. SSOT module list also
  updated to mention `readFrozenSpecsCoveredMultiSpec()`.
- **Certify imageSources / licenseVerify (codex r3270736007, P2 —
  chatgpt-codex-connector):** the certify Inputs list previously
  required `prototype-handoff.yaml#imageSources[]` and license
  verification — contradicting the same contract's later (wave-26)
  statement that license-verify is iterate-only and certify does
  NOT read `imageSources[]`. The Inputs section now explicitly
  states license-class enforcement is iterate-side only (exit 66),
  certify does not invoke `licenseVerify()`, and the
  `prototype-handoff.yaml#imageSources[]` payload is a post-loop
  handoff artifact consumed by audit / hand-off tooling — not by
  certify.

### Fixed (PR #208 30th late-review wave)

- **Drift gate ordering (codex r3270687650, P1 —
  chatgpt-codex-connector):** the cycle ≥ 1 lock-drift gates
  (`frozenSurfaceUnion` missing / malformed + live-vs-frozen
  spec-set drift) now run BEFORE `shouldStop()` so a converged or
  max-budget loop cannot mask a mid-loop drift. Pre-fix the order
  was `designMd hash → shouldStop → drift`; a loop that satisfied
  `shouldStop` (axes-exceptional or max-iterations) returned exit
  64/65 immediately and the drift gate never fired — a mid-loop UI
  marker removal or contract edit was silently accepted as a
  successful convergence / exhaustion instead of the documented
  exit-2 lock-drift. Order is now `designMd hash → frozenSurfaceUnion
presence → spec-set drift → shouldStop`. New regression test
  `TC-0012-0424 / TDD-0444`: a multi-UI project with iter-0
  fully-converged + spec-0002 marker removed mid-loop returns
  exit 2 (`spec-set drift detected mid-loop` + `removed=[0002]`),
  NOT exit 64.

### Fixed (PR #208 29th late-review wave)

- **CLI contract internal-label residuals (codex r3270625675 NIT +
  r3270626085 / r3270626517 / r3270627244 MINOR —
  product-surface-reviewer):** the 24th-wave internal-label scrub
  left three residuals in `.qfai/contracts/cli/qfai-prototyping.md`
  — `MAJOR/P1 bug closed by the 11th-wave fix` (now: a behavioural
  "what fallback would do" sentence); `post-Wave-3` / `pre-Wave-3`
  schema-comment leakage (now: "records written before
  `frozenSpecsCovered` existed"); and the wave-27 certify exit-66
  meta-commentary ("Pre-fix this table previously listed exit 66 …
  is corrected here") removed entirely. Verified with
  `grep -nE 'MAJOR/P[0-9]|[0-9]+(st|nd|rd|th)-wave|Wave-[0-9]|codex r[0-9]|Pre-fix'` →
  zero hits.
- **AC ↔ contract baseline-field cascade (codex r3270628554, MINOR
  — requirements-reviewer):** the wave-27 contract correction
  (cycle ≥ 1 drift gate baseline is `frozenSurfaceUnion`, not
  `specsCovered` / `frozenSpecsCovered`) is now cascaded into
  AC-0012-0049 and BR-0012-0038 Then clauses. Both now explicitly
  name `frozenSurfaceUnion` as the SSOT baseline, note that the
  legacy fields carry only the primary-spec scope under review (not
  the multi-spec drift baseline), and call out the missing-snapshot
  hard-fail. Closes the AC ↔ contract drift the reviewer flagged.
- **SKILL.md L73 wrap polish (codex r3270627813, NIT —
  product-surface-reviewer):** the wave-25 wrap fix left L73 at
  ~96 chars, breaking the bullet-block rhythm. Re-wrapped to
  match the surrounding ~75-char wrap width.

### Fixed (PR #208 28th late-review wave)

- **Recursive-DFS contract pin (codex r3270624828, MINOR —
  architecture-reviewer):** the wave-26 rename to
  "recursively accepts ... nested in a child folder" left the test
  body only exercising a single nested level, while
  `hasMatchingUiContract`'s implementation is an unbounded DFS and
  the TC narrative claims recursive walk. Add a 2-level-deep
  fixture (`spec-0007/screens/auth/login.yaml`) so the unbounded-DFS
  contract is pinned and a future single-level "optimisation"
  cannot regress green. Test names, TC-0012-0423 narrative, and
  TDD-0443 ledger row aligned to "recursively walks (≥ 1 level)"
  wording (5 `it` blocks total: (a) basic match / (b) 1-level /
  (c) 2-level / (d) empty subdir non-match / (e) `.yml`
  non-match).

### Fixed (PR #208 27th late-review wave)

- **Hard-stop class 4 baseline-field correction (codex r3270572395, P2
  — chatgpt-codex-connector):** the contract's hard-stop class 4
  (Mid-run spec-set change) now names `prototyping.json#frozenSurfaceUnion`
  as the comparison baseline — the actual SSOT field that
  `evaluateCycleGteOneGate` reads. Pre-fix the prose said
  `frozenSpecsCovered`, which would send operators to inspect / edit
  the wrong field during recovery and yield repeated exit-2 failures
  after they thought drift was resolved. Class 4 also now explicitly
  enumerates the missing-or-malformed-snapshot hard-fail.
- **Certify exit-66 row scrub (codex r3270572400, P2 —
  chatgpt-codex-connector):** the `qfai prototyping certify` exit-code
  table no longer lists exit 66. `prototypingCertify.ts` does not
  read `imageSources[]` or call `licenseVerify()` — the license-class
  hard-stop is enforced on the `iterate` side only. The table now
  carries an explicit prose note redirecting operators / CI scripts
  to the iterate exit-code table for the license-class hard-stop.
  Pre-fix wording promised a code 66 certify return that the
  implementation cannot produce, which would break orchestrator
  branches that wait on 66-specific remediation.
- **Outdated (codex r3270572406, P2 — chatgpt-codex-connector):**
  duplicate of the wave-26 fix (codex r3270555207). The remaining
  `cannot reach the source on cycle 0` claim was already removed
  from hard-stop class 3 in `8a86b3ee` and replaced with the
  explicit 5-rejection enumeration plus a "no network egress" note.

### Fixed (PR #208 26th late-review wave)

- **Code cleanup (codex r3270526761 + r3270527599, MINOR):** dropped
  the unreachable outer `try { ... } catch (subErr) { if
(!isEnoent(subErr)) throw subErr; }` around the subdir DFS in
  `hasMatchingUiContract` — the only throw path inside the loop is
  the inner `readdir`, which is already discriminated as
  ENOENT-continue / propagate. Renamed the wave-25 nested-subdir
  test from `nested one level deep` to
  `recursively accepts a per-spec subdirectory contract nested in a
child folder` (and updated the code comment) so the wording
  matches the unbounded-DFS semantic the README candidate #5 layout
  documents (multi-component `<subpath>`).
- **CLI contract reachability scrub (codex r3270555207, P2 —
  chatgpt-codex-connector):** removed the false "`licenseVerify()`
  cannot reach the source on cycle 0" reachability claim from
  hard-stop class 3. `licenseVerify` is a pure static validator over
  the `imageSources[]` shape; it does NOT probe network egress. The
  contract now explicitly enumerates the five static rejection
  classes (`license-not-allowlisted`, `license-tier-unknown`,
  `license-non-https-url`, `license-host-mismatch`,
  `license-missing-attribution`) and calls out that dead /
  unreachable URLs that pass the static rules are accepted at this
  gate. Operators and automation that grepped the contract for
  network reachability semantics will now see the accurate scope.
- **Resolved as FYI (codex r3270527316 + r3270527439):** wave-23
  qa-gatekeeper PASS verdict and architecture-reviewer observations
  on the subdir fallback — no code change needed.

### Fixed (PR #208 25th late-review wave)

- **Traceability stitch — TC-0012-0423 registration (codex r3270527912,
  MAJOR — requirements-reviewer):** the 23rd-wave `hasMatchingUiContract`
  per-spec subdirectory fallback gains a registered TC entry:
  `TC-0012-0423` in `06_Test-Cases.md`, `TDD-0443` in
  `tdd/test-list.md` and `16_Traceability-ledger.md`, new
  `EX-0012-0152` in `05_Examples.md`, and the three new `it` blocks
  in `tests/core/prototyping/specResolution.test.ts` are annotated
  `// QFAI:SPEC-0012:TC-0012-0423`. AC-Refs: `AC-0012-0037` (cycle-0
  precheck UI-bearing input candidates) + `AC-0012-0049` (mid-run
  spec-set freeze). AC-0012-0037 Given clause extended with the
  subdir-layout signal alongside the existing strict marker / single-
  file fallbacks.
- **Edge-case test coverage (codex r3270529771, MINOR):** add an
  explicit `it` block asserting the subdir branch rejects a `.yml`
  (single-l) file as the sole content — pins the deliberate
  asymmetry between the subdir branch (`.endsWith(".yaml")`) and the
  top-level anchored regex (`^...\.yaml$`). Policy comment added to
  `specResolution.ts` explaining the asymmetry.
- **09_delta narrative backfill (codex r3270529342, MINOR —
  requirements-reviewer):** five narrative entries added for waves
  21 / 22 / 23 / 24 / 25 so the rolling delta-document SSOT matches
  the CHANGELOG.
- **SKILL.md wrap repair (codex r3270528363 / r3270528371, NIT —
  product-surface-reviewer):** L72 re-wrapped so the wave-23
  `qfai-config.yaml` slash-command-parse fix does not leave the
  `Operators authoring` continuation visually dangling past the
  bullet's wrap rhythm.

### Fixed (PR #208 24th late-review wave)

- **specs-coverage report regen (codex r3270453832, MAJOR —
  qa-gatekeeper):** `.qfai/report/specs-coverage/spec-0012.md` rebuilt
  via `qfai validate` so AC counts reflect the wave-22 TC-0012-0416
  AC-Ref migration (AC-0012-0044 → AC-0012-0038) and the wave-20 +
  wave-22 AC additions (`AC-0012-0052` show-spec contract).
- **Operator-facing contract scrub (codex r3270457491 MINOR —
  product-surface-reviewer):** `.qfai/contracts/cli/qfai-prototyping.md`
  no longer references internal codex review IDs / wave labels /
  internal severity tokens (`codex r3265480688`, `11th-wave fix`,
  `MAJOR/P1`, `22nd-wave operator-facing layout per codex r3270257688
MINOR`, etc.). Operator-readable language only — internal-trace
  metadata stays in `09_delta.md` / `CHANGELOG.md`.
- **Stderr two-line layout polish (codex r3270459355, NIT —
  product-surface-reviewer):** the `frozenSurfaceUnion missing`
  diagnostic now inserts a blank `error("")` line between the primary
  CTA and the indented `Reason:` block so narrow-terminal wrap does
  not visually fuse the two. The `why:` prefix is also re-cased to
  `Reason:` per the suggestion.
- **Outdated threads (already addressed by wave-23 commit
  `1edd8051`):** wave-22 CI BLOCKERs on `promptRefs.test.ts` because
  of the `.qfai/contracts/config/qfai-config.yaml` literal path
  (codex BLOCKER r3270452746 / r3270453722 + clarification
  r3270455565); the SKILL.md markdown bullet continuation indent on
  the same hunk (codex MINOR r3270455737); the
  `.qfai/contracts/config/qfai-config.yaml` / `qfai doctor --explain`
  dangling references (codex MAJOR r3270454138).
- **Deferred (codex r3270455347 MINOR + r3270456831 NIT):** stderr
  two-line layout convention across the other cycle ≥ 1 drift
  classes, and an explicit OQ for removing the
  `prototypingIterate.ts` `resolveSurfaceUnion` re-export once
  wave-8/10/13 unit tests migrate their imports — both noted here as
  follow-up surface for a focused subsequent wave.
- **FYI (codex r3270455436):** wave-21 commit message used "test
  annotations updated" while no `tests/` diff was emitted; clarified
  that TC-0012-0416 is a deferred follow-up (`status: todo`, test
  file: planned) and the "annotations" refer to the spec markdown
  AC-Ref tags. No code change needed.

### Fixed (PR #208 23rd late-review wave)

- **`hasMatchingUiContract` per-spec subdirectory fallback (codex
  r3270307469, P1 — chatgpt-codex-connector):** the helper now detects
  the documented per-spec subdirectory layout
  (`.qfai/contracts/ui/spec-<specId>/<sub>.yaml`, candidate #5 in
  `.qfai/contracts/ui/README.md`). Pre-fix the helper only listed
  top-level basenames; a project that authored UI contracts as
  `.qfai/contracts/ui/spec-0007/home.yaml` (without
  `surface_type: ui-bearing` on the spec) was silently treated as
  non-UI-bearing — `resolveAllUiBearingSpecs` returned empty, the
  cycle-0 precheck no-op'd, and the iterate command exited 0 without
  producing iter dirs. The fix walks the spec subdir (one level deep)
  looking for at least one `.yaml` file. Tests added:
  `accepts the per-spec subdirectory contract fallback`,
  `accepts a per-spec subdirectory contract nested one level deep`,
  `does NOT match a per-spec subdirectory that contains no .yaml files`.

### Fixed (PR #208 22nd late-review wave)

- **SKILL.md operator narrative ↔ implementation (codex r3270253034,
  MAJOR — architecture-reviewer):** Step 2-A now correctly says the
  skill resolves the UI-bearing union via `resolveSurfaceUnion()` (the
  resolver the precheck / cycle ≥ 1 drift gate / show-spec actually
  invoke), with `resolveAllUiBearingSpecs()` documented as the strict
  frontmatter sub-component the union composes internally. Pre-fix
  the narrative claimed `resolveAllUiBearingSpecs()` was the resolver
  the skill calls — true for the test guard but false against the
  implementation. SKILL.md also gains a pointer (`see
.qfai/contracts/config/qfai-config.yaml or qfai doctor --explain
prototyping for the exact key name`) for the config-pinned spec id
  so operators can still discover the config key without the
  forbidden literal token (codex r3270259409 MINOR — discoverability
  partial restore).
- **AC ↔ BR pairing (codex r3270250830, MINOR — requirements-reviewer):**
  `BR-0012-0034` AC-Refs extended to include `AC-0012-0052`
  (`show-spec` JSON payload contract) so the REQ → BR → AC chain is
  not broken at the operator drift-analysis surface.
- **REQ ledger (codex r3270252059, MINOR — requirements-reviewer):**
  `REQ-0011` Refers-To extended with `AC-0012-0052`; `Date Updated`
  bumped to `2026-05-20` to reflect the wave-20 amendment.
- **09_delta narrative AC-Ref history (codex r3270253036, MINOR —
  requirements-reviewer):** 13th-wave Fix 3 narrative annotated with
  the AC-Ref binding history (`AC-0012-0044` → `AC-0012-0045 class
(f)` per the 20th-wave rebinding). Mirrors the wave-19 narrative
  annotation pattern.
- **CLI contract exit-2 cell (codex r3270257688, MINOR —
  product-surface):** the exit-2 row in
  `.qfai/contracts/cli/qfai-prototyping.md` now points operators at
  an enumerated bullet list immediately below the table; the inline
  cell was ~870 chars / 1000+ char rendered which was unreadable in
  GitHub / VSCode preview. Common recovery (`--cycle 0` re-seed) is
  named in a separate paragraph.
- **Stderr layout (codex r3270255983, NIT — product-surface):** the
  cycle ≥ 1 legacy-record diagnostic in `prototypingIterate.ts`
  splits into a short primary CTA (`Re-run with --cycle 0
--target-url <url> …`) + a separate `why:` line so the
  recovery action is the headline and the rationale follows.

### Fixed (PR #208 21st late-review wave)

- **AC-Ref consistency (codex r3270214641, MAJOR — requirements-reviewer):**
  TC-0012-0416 / OQ-0012-0011 references rebound from `AC-0012-0044`
  to `AC-0012-0038`. The cycle-9 idempotency Then-clause moved from
  AC-0044 to AC-0038 in the 19th-wave (per codex r3270052195), but
  the TC-0012-0416 row and the OQ-0012-0011 `Couples:` / Question
  prose were not migrated alongside TDD-0439 / TC-0012-0419.
- **JSDoc consistency (codex r3270215029 / r3270209821, NIT/MINOR):**
  `prototypingCertify.ts` L695-696 comment now names
  `core/prototyping/specResolution.ts` as the canonical location of
  `resolveSurfaceUnion` (matched to the 19th-wave move) and notes the
  CLI-layer re-export as back-compat-only.
- **API surface annotation (codex r3270215675 / r3270214114, MINOR):**
  the back-compat re-export of `resolveSurfaceUnion` from
  `prototypingIterate.ts` is now wrapped in an `@internal` JSDoc that
  explicitly directs new call sites to import from
  `core/prototyping/specResolution.ts` and notes that the re-export
  exists only so the wave-8/10/13 unit tests keep resolving until
  their import paths migrate.
- **Outdated review threads (already addressed by wave-20 commit
  `6fe7a45d`):** SKILL.md regression / forbidden-phrase contract
  (codex BLOCKER r3270212184 / r3270213902 / r3270216674); TC AC-Ref
  binding for TC-0012-0420 / 0421 / 0422 (codex MAJOR r3270212594 /
  r3270216588); ledger TDD-0441 / 0442 AC-Ref drift (codex MAJOR
  r3270213639 / r3270217340); TC-0012-0420 stderr assertion pin
  (codex MAJOR r3270215064); cycle ≥ 1 drift gate stderr internal
  labels (codex MAJOR r3270212694); AC-0012-0045 class (e)
  "pre-12th-wave" marker (codex MINOR r3270218216).

### Fixed (PR #208 20th late-review wave)

- **CI integration BLOCKER (codex r3270133293 + r3270145337, BLOCKER):**
  revert the 18th-wave `SKILL.md` Step 2-A edit to satisfy
  `tests/skill/prototypingSkill.test.ts#TC-0012-0356` — restore "every
  UI-bearing spec ... in one invocation via
  `resolveAllUiBearingSpecs()`" wording and remove the `primarySpecId`
  literal that the forbidden-phrase guard blocks. The `resolveSurfaceUnion`
  documentation is preserved alongside but kept clear of the
  forbidden-phrase / required-regex contracts so the multi-spec wiring
  invariant remains pinned.
- **Traceability — unregistered EX-Refs (codex r3270134830, MAJOR):**
  register `EX-0012-0145..EX-0012-0151` in `05_Examples.md`
  (cycle-9 idempotency, reviewer payload schema, per-spec UI contract
  precedence, zero-UI cycle-0-only semantic, legacy-record hard-fail,
  license-catalog set-equality drift, show-spec JSON payload
  discriminant) so the 14th + 17th + 18th-wave TC additions have
  registered EX entries. Closes the CLAUDE.md
  "TDD-IDs / TC-Refs must not reference unregistered entries" gap.
- **AC layer — hard-stop catalogue (codex r3270141326 MAJOR + codex
  r3270143584 MINOR):** extend `AC-0012-0045` hard-stop catalogue
  with class **(f) `frozenLicenseCatalog` drift** (set-equality
  semantic: byte permutations OK, semantic differences exit 2) and
  broaden class (e) to cover the legacy-shape variant (record exists
  but the `frozenSurfaceUnion` field is missing). Rebind
  `TC-0012-0421` from `AC-0012-0043` (license-verify exit 66, wrong
  axis) to `AC-0012-0045` class (f); `TC-0012-0420` remains on
  `AC-0012-0045` class (e). Ledger updated to match.
- **AC layer — show-spec contract (codex r3270138113 MAJOR):** add
  new `AC-0012-0052` (`show-spec` JSON payload contract) covering
  `frozenSpecsCovered` / `frozenSpecsCoveredSource` discriminant /
  `frozenSurfaceUnion` / `liveUiBearing: string[]` / optional `primary`
  block. Rebind `TC-0012-0422` from `AC-0012-0044` (autonomous-run,
  wrong axis) to the new `AC-0012-0052`. Ledger updated.
- **Operator-facing surface (codex r3270142020, MAJOR — product-surface):**
  scrub the cycle ≥ 1 drift gate stderr of internal labels
  (`legacy pre-12th-wave record`, `11th-wave Fix (codex r3265480688)`,
  `MAJOR/P1`). Replace with the observable contract statement: "the
  gate does not fall back to the single-spec `frozenSpecsCovered`".
  `TC-0012-0420` assertion narrowed to match the new wording so the
  test pins the contract (no silent fallback) rather than the wave
  label.
- **Test specificity (codex r3270136775, MINOR):** narrow
  `TC-0012-0421(c)` from `expect(exit).toBe(0)` (over-coupled to
  unrelated future gates) to `expect(stderr).not.toMatch(/drifted .../)`
  - `expect(exit).not.toBe(2)` — the contract this case pins is
    catalog-gate non-firing under set-equality, scoped to the gate
    rather than the whole pipeline.
- **CLI contract (codex r3270152438, P2 — chatgpt-codex-connector):**
  the exit-code table in `.qfai/contracts/cli/qfai-prototyping.md`
  now names the actual drift baseline field
  (`prototyping.json#frozenSurfaceUnion`) and the missing /
  malformed-field hard-fail. Pre-fix the table named
  `frozenSpecsCovered` (the original pre-11th-wave baseline);
  operators inspecting the wrong field during recovery would have
  hit repeated exit-2 failures.
- **specs-coverage report (codex r3270147998, MAJOR — outdated but
  applied):** bump `AC-0012-0037` / `AC-0012-0045` / `AC-0012-0049`
  counts and register the new `AC-0012-0052` entry to reflect the
  wave-18 + wave-20 TC additions and the AC-Ref rebinding above.

### Fixed (PR #208 19th late-review wave)

- **Architecture (codex r3270055214, MAJOR — architecture-reviewer):**
  move `resolveSurfaceUnion` (and its private helper `specDirExists`)
  from `cli/commands/prototypingIterate.ts` to
  `core/prototyping/specResolution.ts`. The CLI → CLI sideways import
  `prototypingCertify` had to take to align with iterate's drift gate
  (wave-15) is replaced by both CLI commands importing the resolver
  from the core layer. `prototypingIterate` re-exports the symbol for
  back-compat with the wave-8/10/13 unit tests.
- **AC layer (codex r3270053231 / r3270091255 MINOR):** narrow
  AC-0012-0037 to "zero UI-bearing specs **at cycle 0**" and add an
  explicit clause that cycle ≥ 1 zero-UI is a hard-stop drift class.
  The pre-19th-wave AC text was unconditionally "exit 0 deterministic
  no-op", which contradicted the 15th + 17th-wave behavioural change
  to exit 2 at cycle ≥ 1.
- **AC layer (codex r3270094588 MINOR + r3270091255 MINOR):** extend
  AC-0012-0045 hard-stop catalogue with new class (e) — "cycle ≥ 1
  invocation without a recorded cycle-0 `frozenSurfaceUnion` seed →
  exit 2 with re-seed instruction". Formalises the wave-15 / wave-17
  Seed-the-loop-first diagnostic that TC-0012-0419 already pins.
  Class (d) is broadened to cover removed-mid-loop in addition to
  added-mid-loop.
- **AC layer (codex r3270052195 MINOR):** move the cycle-9 idempotency
  Then-clause that briefly lived on AC-0012-0044 to AC-0012-0038
  (10-cycle iteration budget) — terminator routing is an
  iteration-budget concern, not an autonomous-run / no-prompts
  concern.
- **TC binding (codex r3270093532 MINOR — architecture-reviewer):**
  TC-0012-0419 AC-Refs corrected from `AC-0012-0044` (autonomous-run
  / no-prompts — wrong axis) to `AC-0012-0037` + `AC-0012-0045` +
  `AC-0012-0049` so the test's four `it` blocks land on the AC clauses
  they actually exercise. Traceability ledger TDD-0439 updated to
  match.
- **Code (codex r3270092241 MINOR):** rewrite the precheck JSDoc to
  match the implementation — the cycle ≥ 1 branch always returns
  exit 2; it never falls through to `evaluateCycleGteOneGate`. The
  pre-19th-wave comment claimed the empty-frozen branch fell through,
  which was incorrect after the wave-17 refactor.
- **Code (codex r3270093043 MINOR — product-surface):** scrub the
  internal wave label "12th-wave schema" from the operator-facing
  stderr string and replace with observable facts ("either the file
  does not exist yet or it is a legacy record without the
  `frozenSurfaceUnion` field"). The wave label was meaningless to
  end users.
- **Code (codex r3270095015 NIT + r3270092346 NIT):** drop the
  redundant `&& frozenUnionForPrecheck.length > 0` guard in the
  precheck branch — `readFrozenSurfaceUnionField` returns `null`
  whenever the field is empty / malformed, so a `!== null` check is
  sufficient. The helper's JSDoc was tightened to declare the
  empty-→-null post-condition explicitly so two-place semantic
  duplication does not silently drift.
- **Docs (codex r3270056361 MINOR + r3270051957 MINOR):** refresh the
  `runPrototypingShowSpec` JSDoc to describe the current resolver
  (`resolveSurfaceUnion`), document the `frozenSpecsCoveredSource`
  discriminant field, and adjust the `indexPerSpecScreens` JSDoc tone
  so it accurately reflects the post-13th-wave reality (the
  optimisation is path discovery, not file I/O — the project-wide
  reader still parses every file, and the per-spec re-parse runs
  again on the winning file).
- **CHANGELOG (codex r3270093210 MINOR):** repair the soft-wrap
  indentation drift on L138-140 of the 17th-wave entry (was
  zero-indent continuation, now matches the surrounding two-space
  bullet style).
- **09_delta.md (codex r3270050901 MINOR — requirements-reviewer):**
  register `OP-APPEND-080` for `OQ-0012-0011` (Cycle-9 idempotency
  follow-up) so the OQ ↔ OP pairing that OQ-0012-0006..0010 already
  follow is consistent for OQ-0012-0011. Closes the wave-14 Fix-6
  self-consistency gap.

### Fixed (PR #208 18th late-review wave)

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  Step 2-A resolver SSOT alignment — the skill now correctly documents
  `resolveSurfaceUnion()` (the full UI-bearing union the cycle ≥ 1
  drift gate enforces) as the resolver the skill invokes, with
  `resolveAllUiBearingSpecs()` (strict signals only) called out as an
  input subset. Pre-fix the skill claimed the narrower strict-only
  resolver, leaving operators with title-marker / `primarySpecId` /
  UI-contract-only projects expecting "not resolved" behaviour that
  would not match the iterate gate. Resolves codex MAJOR r3270057960
  (distributed-surface drift).
- `tests/cli/commands/prototypingIterate.test.ts`: add regression
  coverage for the 13th-wave legacy-record hard-fail (TC-0012-0420,
  TDD-0440) — `prototyping.json` without `frozenSurfaceUnion` exits 2
  with a re-seed instruction and explicitly does NOT silent-fall-back
  to `frozenSpecsCovered` (which would re-enable the pre-11th-wave
  MAJOR/P1 false-positive). Resolves codex MAJOR r3270058882.
- `tests/cli/commands/prototypingIterate.test.ts`: add regression
  coverage for the 13th-wave license-catalog drift gate (TC-0012-0421,
  TDD-0441) — three `it` blocks: (a) tampered `allowedSources`
  (`pinterest` added) → exit 2 with `drifted from the cycle-0 frozen
license catalog`; (b) `sourceHosts` removed (malformed) → exit 2;
  (c) order-permuted catalog still passes (`licenseCatalogsEqual`
  set-equality semantic). Resolves codex MAJOR r3270057892.
- `tests/cli/prototypingCertify.test.ts`: add regression coverage
  for the 14th-wave + 15th/16th-wave show-spec payload semantic
  changes (TC-0012-0422, TDD-0442) — three `it` blocks pinning the
  new `frozenSpecsCoveredSource` discriminant (`"frozenSpecsCovered"`
  vs `"specsCovered"`) and the post-wave-16 `liveUiBearing: string[]`
  shape. Resolves codex MINOR r3270061025.
- `CHANGELOG.md`: extend the `### BREAKING CHANGES (PR #208 —
show-spec JSON schema reshape)` block with a sub-bullet covering
  the intra-PR `liveUiBearing` migration (wave-15 / wave-16 resolver
  - schema alignment) so operators reading the BREAKING block see
    the full migration surface in one place. Resolves codex MINOR
    r3270061586.
- _FYI only (codex r3270059627, no behavioural change):_ noted the
  `validateLayeredTraceability` strictness around informational AC →
  BR back-references as a future SDD profile design seed; no
  in-PR action required.

### Fixed (PR #208 17th late-review wave)

- `prototypingIterate.ts`: refine the 15th-wave zero-UI precheck
  short-circuit at cycle ≥ 1 so the error message accurately reflects
  the underlying state. The pre-17th-wave message always claimed
  "the cycle-0 frozen scope is no longer reachable" on any zero-UI
  cycle ≥ 1 invocation, including fresh projects that ran `--cycle 1`
  before `--cycle 0` (no prototyping.json on disk yet) — violating the
  principle of least astonishment. The fix reads `prototyping.json`
  before short-circuiting and discriminates two diagnostics: (a)
  non-empty cycle-0 `frozenSurfaceUnion` → "UI markers removed
  mid-loop" hard-stop (names the frozen union for clarity); (b)
  missing / malformed `frozenSurfaceUnion` (fresh project or
  pre-12th-wave record) → "Seed the loop first with `--cycle 0`".
  Resolves codex MINOR r3270050451.
- `tests/cli/commands/prototypingIterate.test.ts`: add a new
  describe block (TC-0012-0419, TDD-0439) with 4 `it` blocks pinning
  the wave-15 / wave-17 zero-UI precheck branches — cycle 0 no-op
  preserved; cycle ≥ 1 + non-empty frozen union → exit 2 with
  `no longer reachable`; cycle ≥ 1 + missing prototyping.json → exit 2
  with `Seed the loop first`; cycle ≥ 1 + legacy record without
  `frozenSurfaceUnion` → same `Seed the loop first` path.
  06_Test-Cases.md / tdd/test-list.md / 16_Traceability-ledger.md
  registered. Resolves codex MAJOR r3270050284 (regression coverage)
  per CLAUDE.md "All source changes must have corresponding test
  coverage".

### Fixed (PR #208 16th late-review wave)

- `.qfai/contracts/cli/qfai-prototyping.md`: align the documented
  `liveUiBearing` shape in the `qfai prototyping show-spec` JSON schema
  with the actual emitted type (`string[]`) after the 15th-wave switch
  to `resolveSurfaceUnion`. Pre-fix the contract still claimed
  `SpecRef[]` (objects with `specId` / `specMdPath` / `source`), which
  matched the older `resolveAllUiBearingSpecs` path; the new resolver
  also covers the non-strict title-marker / `primarySpecId` paths that
  have no per-spec metadata, so the union has to be a bare ID list.
  Per-spec metadata for the resolved primary is still available via the
  optional `primary` block. Resolves codex P2 r3269597174
  (chatgpt-codex-connector).

### Fixed (PR #208 15th late-review wave)

- `prototypingIterate.ts`: the cycle-0 zero-UI-bearing precheck no
  longer silently exits 0 at cycle ≥ 1. Pre-fix, an in-progress frozen
  run whose UI markers / contracts were removed mid-loop would
  short-circuit through the precheck before `evaluateCycleGteOneGate`
  ran, masking the `removed=[...]` drift event. The fix preserves the
  zero-UI no-op semantic only at cycle 0 (no specs to seed); at
  cycle ≥ 1 a zero-UI live result against a non-empty cycle-0 frozen
  union is treated as hard-stop drift → exit 2 with a re-seed
  instruction. Resolves codex P1 r3269453276
  (chatgpt-codex-connector).
- `prototypingCertify.ts#runPrototypingShowSpec`: `liveUiBearing` now
  uses `resolveSurfaceUnion` — the same resolver iterate's drift gate
  uses — so the live scope reported by show-spec is apples-to-apples
  with what iterate actually enforces. Pre-fix show-spec called the
  narrower `resolveAllUiBearingSpecs` (strict signals only) and
  projects relying on non-strict markers (title marker /
  `primarySpecId` config pin / UI contract signals) saw false drift
  diagnostics that did not match the iterate gate. Resolves codex P2
  r3269453293 (chatgpt-codex-connector).

### Fixed (PR #208 14th late-review wave)

- `.qfai/specs/spec-0012/tdd/test-list.md`: TDD-0347 Status column reverted
  from the invalid `superseded` token to `exception` (which is in the
  `tddList.ts#VALID_STATUSES` enum). The supersede semantic is carried by
  the Notes column ("superseded by TDD-0371"). Pre-fix `qfai validate`
  reported `TDDLIST_INVALID_STATUS` and failed the CI build job. Resolves
  codex BLOCKER r3269192039 / r3269196044 / r3269196302 / r3269200030
  (qa-gatekeeper + completion-reviewer).
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  add exit 66 to the C1..9 exit-code summary and to the "Exit codes" prose
  block; add a new "License-verify hard-stop (exit 66)" subsection that
  enumerates the five `licenseVerify` error codes and the recovery path
  (inspect `frozenLicenseCatalog`, edit `imageSources[]`, re-seed via
  cycle 0). Resolves codex MAJOR r3269196571 (product-surface-reviewer).
- `packages/qfai/src/core/prototyping/licenseVerify.ts`: tighten
  `license-missing-attribution` to reject whitespace-only attribution
  (`"   "`, `"\t\n"`, ideographic space, mixed) via `.trim()`; add
  parameterized boundary regression tests (4 `it.each` cases). Resolves
  codex MINOR r3269193005.
- `.qfai/specs/spec-0012/04_Business-Rules.md`: extend BR-0012-0033 with
  a runtime-gate clause that mirrors the AC-0012-0043 14th-wave amendment
  — license-verify rejects undefined / empty / whitespace-only
  attribution with `license-missing-attribution` → exit 66. Closes the
  AC-without-BR pairing asymmetry. Resolves codex MAJOR r3269193861
  (requirements-reviewer).
- `.qfai/specs/spec-0012/06_Test-Cases.md` + `03_Acceptance-Criteria.md`:
  TC-0012-0416 AC-Refs binding corrected from `AC-0012-0045` (hard-stop
  classes catalogue) to `AC-0012-0044` (autonomous-run bound); the
  AC-0012-0044 Then clause is extended with the cycle-9 idempotency
  requirement (single `--cycle 9` invocation must surface exit 65
  directly). Resolves codex MAJOR r3269195807 (requirements-reviewer).
- `.qfai/specs/spec-0012/08_Open-questions.md`: register `OQ-0012-0011`
  (Cycle-9 idempotency — single `--cycle 9` invocation on non-converged
  10-iter loop) coupled to TDD-0436 / TC-0012-0416 / AC-0012-0044 so the
  deferred-followup follows the OQ ↔ TDD pairing pattern established
  in the 10th-wave (OQ-0012-0006..0010). Resolves codex MINOR
  r3269198118 (requirements-reviewer).
- `packages/qfai/src/cli/commands/prototypingCertify.ts#runPrototypingShowSpec`:
  add `frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered"`
  to the JSON payload so operators doing drift analysis can detect
  legacy pre-Wave-3 seed records (which only carry the legacy
  `specsCovered` field on disk) without re-reading
  `prototyping.json`. Contract amended in lockstep. Resolves codex
  MINOR r3269198684 (product-surface-reviewer).
- Outdated review threads (already addressed by the 13th-wave commit
  `d7f3cdaf` but re-raised against `c51df21f` before the push landed):
  prettier format / build-job formatting failure (codex BLOCKER
  r3269199076 / r3269199764 / r3269204297), and the
  `frozenSurfaceUnion` contract drift (codex BLOCKER r3269201316).

### Fixed (PR #208 13th late-review wave)

- `packages/qfai/README.md`: rewrite the prototyping description (Release
  status `## Release status` block + CLI command summary + skill listing)
  to match CHG-002 — multi-spec parallel evolution, frozen UI-bearing
  spec set at cycle 0, `cycle 0..9`, `review.json`-only per-iter evidence
  (no `screenshot.png` / `index.html` / `interaction.json`), AND
  convergence (`4 axes exceptional AND layoutAntiPatternsDetected empty
AND designMdViolations empty`), and exit codes (0 / 64 / 65 / 66 / 2).
  Pre-fix the README still described the v1.8.9 single-thread /
  one-prototype / anti-slop model, drift that bled into operator
  expectations. Resolves codex MAJOR r3265800332 / r3265808732 /
  r3265811785.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  rewrite the intro paragraph (multi-spec evolution / one lineage per
  `spec × screen` pair / frozen spec set) and the "Cycle 9 budget
  exhaustion" subsection (handoff artifacts CAN be written for
  inspection; only `qfai prototyping certify --check` rejects DONE).
  Resolves codex MAJOR r3265801777 and codex MINOR r3265802899.
- `packages/qfai/assets/init/.qfai/assistant/steering/agent-routing.yml`:
  rewrite the `qfai-prototyping` routing comment to "Multi-spec
  evolution loop" with the full surface (4 axes + 6 \*Feel + anti-pattern
  - DESIGN.md gates) instead of the v1.8.9 single-thread label.
    Resolves codex MINOR r3265803600.
- `CHANGELOG.md`: remove the contradictory `optional
timeBudgetSoftWarning?: string` claim from the Wave 2 schema
  description; the BREAKING CHANGES (ReviewerPayload schema) block is
  the authoritative diff and the closed-schema parser now rejects the
  legacy key. Resolves codex MAJOR r3265805771.
- `CHANGELOG.md`: promote the `qfai prototyping show-spec` JSON schema
  reshape from a `### Fixed` bullet to a dedicated `### BREAKING
CHANGES` block (see above) so the operator-facing migration is
  surfaced alongside the existing `ImageSource.attribution` BREAKING.
  Resolves codex MAJOR r3265949051 and codex MEDIUM r3265954849.
- `.qfai/contracts/cli/qfai-prototyping.md`: enumerate the new
  cycle-0-freeze field `frozenSurfaceUnion[]` (the SSOT the cycle ≥ 1
  drift gate compares against), document the license-catalog drift
  exit-2 semantics, and pin the JSON schema for the `qfai prototyping
show-spec` payload. Resolves codex MAJOR r3265951894 and codex
  MEDIUM r3265954849.
- `prototypingIterate.ts`: drop the legacy `frozenSurfaceUnion ??
frozenSpecsCovered ?? frozenSpecs` fallback chain at the cycle ≥ 1
  drift gate. The fallback silently restored the MAJOR/P1 pre-11th-wave
  baseline for legacy `prototyping.json` records (the very bug
  TC-0012-0415 / codex r3265480688 closed), so v1.8.10 binaries running
  against v1.8.9-seeded records re-enabled the false-positive. The
  drift gate now hard-fails with exit 2 + an explicit "legacy record;
  re-run `--cycle 0`" message when `frozenSurfaceUnion` is missing or
  malformed. Resolves codex MAJOR/P1 r3265953324.
- `prototypingIterate.ts`: detect cycle ≥ 1 drift of
  `frozenLicenseCatalog` against the in-memory SSOT
  (`DEFAULT_LICENSE_CATALOG`) and exit 2 instead of silently honouring
  the edited catalog as the verifier authority. Mid-loop additions to
  `allowedSources` / `licenseTiers` / `sourceHosts` no longer let
  otherwise-unallowed `imageSources[]` entries pass with exit 0. The
  in-memory constant is now the verifier authority (cycle 0 mirrors it
  into prototyping.json). Resolves codex P2 r3265947252.
- `prototypingCertify.ts`: re-parse each spec's winning UI contract
  file(s) via `parseUiScreenFile` inside `indexPerSpecScreens` instead
  of reusing the project-wide-deduplicated `screenContracts` collection.
  Pre-fix two specs declaring the same `screenId` (e.g. `home`) hit the
  project-wide `findIndex` dedup, which kept only one entry; the index
  then false-negative-passed the `<spec>/<screen>.review.json` gate
  for the spec whose entry was dropped. The per-spec re-parse isolates
  the dedup scope. Resolves codex MAJOR r3265806993.
- `prototypingCertify.ts`: return the full multi-file union from
  `chooseWinningFiles` (renamed from `chooseWinningFile`) for the
  subdir (#5) and glob (#4) layouts instead of returning `null` and
  forcing the call site to re-probe via `readPerSpecScreens`. The
  pre-indexed multi-file path discovery now flows into the same
  per-spec re-parse, restoring the N+1 optimization for subdir / glob
  layouts. Resolves codex MAJOR r3265809880.
- `prototypingCertify.ts#parseUiScreenFile`: replace bare `catch {}` on
  the readFile / parseYaml branches with per-file `warn` lines that
  name the offending path and narrow the error class (read vs parse).
  Pre-fix a half-failure (some matched files parsed, one silently
  failed) was invisible because the call site's aggregate warn only
  fired on the all-empty case. The function still returns `[]` on
  failure so callers keep their contracts; CLAUDE.md "every async path
  must have explicit error handling" is now satisfied via the named
  warn line. Resolves codex MINOR r3265813656.
- `core/prototyping/evaluatorReview.ts`: tighten the closed-schema
  `cycle` validation to reject `cycle > MAX_ITERATION_INDEX` (currently
  `> 9`). Pre-fix the parser accepted `cycle: 99` because the
  upper-bound check was absent — asymmetric with the closed-schema
  `unknown field` and per-field word-count rejections. Adds a boundary
  regression test (`rejects when cycle exceeds MAX_ITERATION_INDEX`)
  covering `10 / 99 / 100`. Resolves codex MAJOR r3265809796 and codex
  MINOR r3265811203 / NIT r3265814987.
- `.qfai/specs/_policies/03_Capabilities.md`: extend CAP-0012
  success-metrics with the `6 *Feel fields (200-word bounded)` reviewer
  payload extension so the capability success-metric carries the same
  shape as the spec-0012 contract surface. Resolves codex MINOR
  r3265808939.
- `.qfai/specs/_policies/05_Contracts.md`: extend the DCON-008
  (prototype-handoff) Purpose cell with `imageSources[] (closed schema,
CHG-002 — validated by core/prototyping/handoff.ts)` so the contract
  index reflects the closed-schema `imageSources` field that already
  lives in `prototype-handoff.yaml`. Resolves codex MINOR r3265811914.
- `.qfai/contracts/ui/README.md`: restructure the candidate-precedence
  table so the `Order` column is split into `Tier` (single-file vs
  multi-file) and `Precedence within tier`, and extend the
  Recommendations to enumerate the mixed-layout cases (`spec-0007.yaml`
  - `ui-0007-home.yaml`; `spec-0007.yaml` + `spec-0007/home.yaml`) so
    authoring choices match the resolver's TRUE first-hit-wins +
    multi-file aggregation semantics. Resolves codex MINOR r3265814788 /
    r3265815283.
- `.qfai/specs/spec-0012/16_Traceability-ledger.md`: register
  TDD-0336..TDD-0369 (34 entries) as a v2.0-baseline ledger block so
  the CLAUDE.md project rule "TDD-IDs and TC-Refs must not reference
  unregistered entries" is satisfied for every TDD landed in
  `tdd/test-list.md`. Resolves codex HIGH r3265822700.
- `.qfai/specs/spec-0012/tdd/test-list.md`: TDD-0353 Notes — replace
  "single-thread serial iteration with at most 15 iters" with the
  CHG-002 value `at most 10 iters (CHG-002, MAX_ITERATIONS=10)` so the
  ledger row matches the post-CHG-002 sweep that already updated
  TDD-0347. Resolves codex MEDIUM r3265823332.
- `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts` +
  `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`:
  annotate the 11th-wave-added describe blocks (`parseEvaluatorReview
— new required fields (cycle / retryCount / wallTimeSec)` and the
  four `respects the * canonical layout` / `uses candidate #1 only`
  cases) with concrete `QFAI:SPEC-0012:TC-...` IDs and register the
  matching rows in `06_Test-Cases.md` / `tdd/test-list.md` /
  `16_Traceability-ledger.md`. The 09_delta entry for the 11th-wave
  cluster names the AC-Refs (`AC-0012-0041` / `AC-0012-0046`).
  Resolves codex MAJOR r3265811711.
- `prototypingIterate.ts` / `prototypingCertify.ts` / `licenseVerify.ts`:
  rename inline JSDoc / comment labels from `11th-wave Fix (codex r...)`
  to `12th-wave Fix (codex r...)` so the wave label matches the
  commit subject and CHANGELOG H3 (`### Fixed (PR #208 12th
late-review wave)`). Pre-fix the same codex review IDs were tagged
  as "11th-wave" inline and "12th-wave" in CHANGELOG / commit subject;
  `git blame` / `grep "12th-wave Fix"` therefore could not locate the
  inline comments. Documentation-only; no behaviour change. Resolves
  codex MEDIUM r3265950622 and codex P3 r3265953161.

### Fixed (PR #208 12th late-review wave)

- `licenseVerify.ts`: compare URL host and per-source allowlist host
  case-insensitively on BOTH sides (was already case-insensitive on
  the URL side via `urlHost()`'s `.toLowerCase()`, but the catalog
  side passed entries verbatim, so a user catalog with
  `"Images.Unsplash.com"` could false-positive reject a valid URL).
  RFC 3986 §3.2.2: host is case-insensitive. New `it()` block under
  the existing TC-0012-0411 describe. Resolves codex P2 r3265474144.
- `licenseVerify.ts` + `prototypingIterate.ts`: enforce non-empty
  attribution at the runtime license gate (see BREAKING CHANGES above
  for the schema diff). New error code `license-missing-attribution`
  on `LicenseVerifyError` and new TC-0012-0414 (2 `it` blocks).
  Resolves codex P2 r3265482144.
- `prototypingIterate.ts`: persist the cycle-0 UI-bearing UNION as
  `frozenSurfaceUnion` in prototyping.json and use it as the
  apples-to-apples baseline at the cycle ≥ 1 drift gate. Pre-fix the
  gate compared the single-spec frozen scope (`frozenSpecsCovered`)
  against the live multi-spec UNION; any baseline already carrying
  ≥ 2 UI-bearing specs false-positive-fired `added=[secondaries...]`
  at cycle 1 → exit 2, making convergence unreachable. Backward-compat:
  pre-12th-wave records (no `frozenSurfaceUnion` field) fall back to
  `frozenSpecsCovered`. New TC-0012-0415 regression test. Resolves
  codex MAJOR/P1 r3265480688.
- `prototypingCertify.ts`: missing per-spec `<screen>.review.json`
  coverage now returns exit 64 (coverage-rejection class) instead of
  exit 2 (input-error class) to match the CLI contract §Exit codes
  table and the adjacent multi-spec flat-iter coverage branch. The
  existing TC-0012-0381 test was tightened from `not.toBe(0)` to
  `toBe(64)`, and a new dedicated per-spec layout assertion was added.
  Resolves codex P2 r3265482136.
- `prototypingCertify.ts#runPrototypingShowSpec`: read the cycle-0
  frozen `specsCovered[]` from prototyping.json (with
  `frozenSurfaceUnion` and the live UI-bearing union surfaced for
  drift visibility) instead of resolving the live primary from config
  / spec markers. Exit 2 when prototyping.json is missing or malformed,
  per the CLI contract §`qfai prototyping show-spec`. Resolves codex
  P2 r3265482150.
- `prototypingIterate.ts`: rewrite the stale fence comment that
  claimed `earlyUiBearing` is still computed for bypass / drift
  signals; the variable / type field was removed in Fix A and the
  drift gate now re-resolves the live UNION via `resolveSurfaceUnion`.
  Resolves codex MINOR r3265482249.
- `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`: extend
  AC-0012-0043 Then clause to enumerate the malformed-imageSources
  exit-2 class alongside the license-verify exit-66 class so the AC
  surface matches the implemented + tested behavior of TC-0012-0413.
  Resolves codex MEDIUM r3265479524.
- `.qfai/specs/spec-0012/10_Plan.md` + `tdd/test-list.md` +
  `16_Traceability-ledger.md` + `06_Test-Cases.md`: reserve TDD-0436
  / TC-0012-0416 for the cycle-9 idempotency follow-up so the
  deferred-followup row carries a stable TDD/TC handle (pre-fix the
  row was `(none) | (none)` and could not be mirrored into the
  test-list ledger). Resolves codex LOW r3265481161.

### BREAKING CHANGES (PR #208 — ReviewerPayload schema)

- **ReviewerPayload shape is now SSOT-compliant with the CLI contract**
  (`.qfai/contracts/cli/qfai-prototyping.md` §Review payload, L161-200).
  This is a breaking change relative to the v1.8.9 shape that the
  9th-wave / 11th-wave reviews exposed. Per the project's pinned-branch
  version-discipline rule, the breaking change ships in 1.8.10 because
  the branch pin `feature/v1.8.10` is the user's release authorization;
  in normal SemVer terms this would typically warrant a minor bump.
  Pinned-branch authorization is preserved here.
  - Removed: top-level `timeBudgetSoftWarning?: string` (flat string,
    optional).
  - Added (required): `cycle: number` (0..9), `retryCount: number`,
    `wallTimeSec: number`, and `softWarnings: { timeBudget: boolean }`
    nested record. `softWarnings` is closed-schema (the single key
    `timeBudget` is required; unknown nested keys are rejected).
  - Pre-fix: 7 top-level fields, with optional `timeBudgetSoftWarning`.
    Post-fix: 11 top-level fields, all required, matching the CLI
    contract §Review payload §schema declaration.
  - Migration: existing flat `iter-NN/spec-NNNN/<screen>.review.json`
    files written under the v1.8.9 shape will be rejected by
    `parseEvaluatorReview` with `missing field: cycle` /
    `missing field: retryCount` / `missing field: wallTimeSec` /
    `missing field: softWarnings` errors. No auto-migration shim is
    provided — consumers must regenerate `review.json` files via the
    product-surface-reviewer sub-agent. The legacy
    `timeBudgetSoftWarning` key now surfaces as `unknown field:
timeBudgetSoftWarning` so authoring drift is caught fail-closed
    instead of silently dropped.

### Fixed (PR #208 11th late-review wave)

- `evaluatorReview.ts`: align `ReviewerPayload` schema with the CLI
  contract §Review payload SSOT (11 required top-level fields).
  Documented as a BREAKING CHANGE above. Resolves codex P2
  r3265368922 + P1 r3265379781 (dup).
- `screenContracts.ts` + `prototypingCertify.ts`: export
  `extractUiScreens` from the core module and rewrite
  `readPerSpecScreens` to reuse the shared parser via a new
  `parseUiScreenFile` helper. Removes the duplicated YAML / shape
  extraction logic that had drifted between the project-wide and
  per-spec readers. Resolves codex MAJOR r3265374692 + P2 r3265379531
  - P2 r3265382282 (dup).
- `prototypingCertify.ts#readPerSpecScreens`: implement TRUE
  first-hit-wins for canonical single-file candidates (`spec-NNNN.yaml`
  > `<bare>.yaml` > `ui-<bare>.yaml`). Pre-fix the loop pushed every
  > matching file into a single `matched[]` and unioned screens across
  > authoring forks (e.g. both `spec-0007.yaml` and `ui-0007.yaml` on
  > disk produced surprising cross-file behaviour). JSDoc precedence
  > table updated to reflect the impl. Resolves codex MAJOR r3265378130.
- `prototypingCertify.ts#readPerSpecScreens`: add the recursive
  per-spec subdirectory layout (`<contractsDir>/ui/<spec-id>/<sub>.yaml`)
  as candidate #5. Pre-fix the per-spec reader was flat-only, so a
  project organising contracts as `.qfai/contracts/ui/spec-0007/home.yaml`
  fell through to the project-wide list and re-opened the 9th-wave
  cross-product false-positive. Resolves codex P2 r3265377858.
- `prototypingCertify.ts`: collapse the N+1 fs probe in the per-(spec
  x screen) gate by pre-indexing the project-wide `screenContracts`
  into a per-spec Map via the new `indexPerSpecScreens` /
  `extractSpecDirFromUiRel` / `chooseWinningFile` helpers. Map honors
  the same first-hit-wins precedence as `readPerSpecScreens`; multi-file
  layouts fall through to the fs-probe fallback. Resolves codex MINOR
  r3265376125.
- `.qfai/contracts/ui/README.md`: document all 5 per-spec UI contract
  resolution candidates with a precedence table + authoring
  recommendations (canonical single-file `<spec-id>.yaml` is preferred;
  multi-file shapes #4 / #5 are supported with first-write-wins
  deduplication). Pre-fix only the legacy `ui-XXXX-<slug>.yaml`
  convention was documented and only candidate #1 was test-covered.
  Added tests for candidates #2 (`<bare>.yaml`), #3 (`ui-<bare>.yaml`),
  #5 (subdir), and the true-first-hit-wins regression. Resolves codex
  P2 r3265376163.
- `prototypingCertify.ts#readPerSpecScreens`: dedup JSDoc / impl
  mismatch — change the "last-write wins" line to "first-write wins
  (matches readUiContractScreenContracts dedup semantics)". The impl
  has always used `findIndex` which is first-write. Resolves codex
  MAJOR r3265372889.
- `prototypingCertify.ts#readPerSpecScreens`: emit a `warn` line when
  per-spec UI contract files matched but extracted zero valid screens
  (YAML parse error, `screens:` typo, non-array `screens`). Pre-fix
  the silent skip cascaded through a null return and a project-wide
  fallback, which re-opened the cross-product false-positive without
  any diagnostic surface. Resolves codex LOW r3265378799.
- `lint-shipping.ts` + `check-no-internal-version-leakage.sh` +
  `distributedSurfaceLeakage.test.ts` + `.agents/rules/distributed-surface.md`:
  add `OQ-NNNN-NNNN` to the forbidden-class set across all 4 SSOT-sync
  layers (per the distributed-surface-discipline 4-layer rule). The
  pattern catches internal open-question IDs that the spec authoring
  workflow uses. Resolves codex LOW r3265386185.

### Fixed (PR #208 4th late-review wave)

- Renumber CHG-002 cascade TDD IDs from TDD-0409..0414 to TDD-0415..0420 to
  remove the collision with the v2.1 planned `TDD-0409 | TC-0012-0392`..
  `TDD-0412 | TC-0012-0395` rows previously registered in the
  `16_Traceability-ledger.md` v2.1 block. Mirrored across
  `09_delta.md`, `tdd/test-list.md`. Added TDD-0421 / TC-0012-0401 for the
  symmetric cycle-1 drift regression test on the title-marker bypass code
  path (the primarySpecId bypass had a cycle-1 test via TC-0012-0397; the
  title-marker bypass via TC-0012-0398 only covered cycle 0). Resolves
  CRITICAL r3264654080.
- `prototypingCertify`: make the per-(spec x screen) review.json presence
  gate opt-in based on actual per-spec subdir presence at the accepted
  iter. Flat-iter projects (the legacy `iter-NN/index.html` shape that
  `prototypingIterate` and the shipped SKILL.md still emit) skip the gate
  with a one-line stderr info note. Pre-fix the gate ran unconditionally
  and would fail every (spec, screen) pair on a normal run that followed
  the documented plan. New helper `hasPerSpecSubdir`; new integration test
  pinning the flat-iter skip behaviour. Resolves P1 r3264630513.
- `specResolution.ts`: extract `TITLE_MARKER_RE` as an exported SSOT and
  rebuild the legacy composite `PROTOTYPING_MARKER_RE` from
  `UI_BEARING_MARKER_RE.source + "|" + TITLE_MARKER_RE.source`. Move the
  `findTitleMarkerSpecs` helper out of `cli/commands/prototypingIterate.ts`
  into `core/prototyping/specResolution.ts` (re-exported as
  `resolveTitleMarkerSpecs`). Eliminates the string-duplicate regex /
  function pair flagged by review and adds a JSDoc note above
  `UI_BEARING_MARKER_RE` documenting the intentional asymmetry vs the
  legacy composite. Resolves MAJOR r3264651323 + MINOR r3264490653.
- spec-0012 `09_delta.md`: add OP-APPEND-075..078 entries mirroring
  OQ-0012-0006..0009 in `08_Open-questions.md`, matching the OP-APPEND-074
  pattern established for OQ-0012-0001. Resolves required r3264563268.

### Changed (implementation)

- Reduce prototyping cycle budget from 15 to 10 iterations
  (`MAX_ITERATIONS = 10`, derived `MAX_ITERATION_INDEX = 9`). Cascade refresh
  of boundary test literals in `prototypingE2E.test.ts` and
  `prototypingIterate.test.ts`, JSDoc / inline comments in
  `prototypingIterate.ts` and `prototypingEvidence.ts`, and the user-facing
  strings in `cli/main.ts` (`--cycle (0..9)`) and `observability/guidance.ts`
  ("10 cycles"). CHG-002 Wave 3 foundation; spec-0012 TDD-0371 (TC-0012-0359).
- Add `shouldStop` boundary regression guard for `index===9` →
  `"max-iterations"`, `index===8` → `null`. No production change required —
  the symbolic `MAX_ITERATION_INDEX` consumption already honors the new
  boundary; the test pins the contract. spec-0012 TDD-0372 (TC-0012-0357).
- Add `shouldStopAcrossSpecs(pairs)` to `core/prototyping/iteration.ts` with
  `PerSpecScreenIter` and `MultiSpecStopResult` types. Pure function: returns
  `{ stopReason: "axes-exceptional", laggingSpecs: [] }` only when every
  `(spec, screen)` pair passes `allFourAxesExceptional`; otherwise returns
  `{ stopReason: null, laggingSpecs: [...sortedUnique specIds...] }`.
  Existing single-spec `shouldStop(iterations)` unmodified. spec-0012
  TDD-0376/0377 (TC-0012-0367/0368).
- Add per-(spec × screen) `<screen>.review.json` presence check to
  `qfai prototyping certify`. When the cycle-0 frozen spec set AND screen
  contracts are both non-empty, certify exits non-zero and names every
  missing `spec-NNNN / <screen>` pair in stderr (capped 20 lines). New
  helpers `fileExists` / `normalizeSpecDirName` (canonicalizes bare `"0012"`
  ↔ `"spec-0012"`). Legacy single-page fixtures untouched. spec-0012
  TDD-0387 (TC-0012-0381).
- Rephrase cycle-≥1 DESIGN.md hash-mismatch stderr to include the canonical
  phrase "DESIGN.md hash mismatch — ... re-run from cycle 0" while
  preserving the legacy "sha256 mismatch" / "edited mid-loop" tokens for
  backward-compat. spec-0012 TDD-0380 (TC-0012-0373).
- Add integration coverage: `runPrototypingIterate` autonomous-mode test
  (no `process.stdin` reads via source-grep + runtime throwing-getter probe
  across cycle 0 / cycle 1 / cycle 9), boundary exit-65/exit-0 synthesis,
  serial-budget structural shape, and `shouldStop` quantitative-gate
  absence assertions. spec-0012 TDD-0373/0374/0375/0378.

### Added (Wave 1 — new core modules)

- New module `core/prototyping/iterationPaths.ts`: per-spec iter-NN helpers
  (`iterationDir(idx, specId)` → `.qfai/evidence/prototyping/iter-NN/spec-NNNN`,
  `iterationReviewPath(idx, specId, screen)`, `findIterationReviewFiles(root, idx)`,
  `findStaleIterDirs(root)` + `deleteStaleIterDirs(root)` matching only
  `/^iter-\d{2,}$/`, `parseIterationReviewPath(rel)` round-trip). spec-0012
  TDD-0389/0390/0391/0392 (TC-0012-0378/0379/0380/0392).
- New module `core/prototyping/licenseVerify.ts`: pure
  `licenseVerify(imageSources, catalog)` returning `{ok:true}` when every
  source is allowlisted and license is in the catalog tier, otherwise
  `{ok:false, errors:[…]}` with structured `{code:"license-not-allowlisted"|"license-tier-unknown", …}`
  entries. Exit-code mapping (66) is caller responsibility. spec-0012
  TDD-0393/0394 (TC-0012-0370/0395).
- New module `core/prototyping/reviewerDispatch.ts`: interface stub
  `dispatchReviewerToPair(specId, screen, options)` with injectable
  `playwrightRunner`, attempt-limit retry, structured `ReviewerOutcome`.
  Real Playwright wiring deferred. spec-0012 TDD-0399/0400
  (TC-0012-0362/0363); TDD-0401/0402 (TC-0012-0374/0383) deferred to a
  subsequent integration cycle.

### Changed (Wave 1 — specResolution + skill asset)

- Extend `core/prototyping/specResolution.ts` with
  `resolveAllUiBearingSpecs(root, config)`. Detection: `surface_type: ui-bearing`
  marker in `01_Spec.md`; fallback to matching `.qfai/contracts/ui/<spec-id>.yaml`.
  Returns deduped lex-sorted spec IDs. Existing single-spec
  `resolvePrimaryPrototypingSpec` preserved (deprecated; removal in next
  cycle when callers migrate). spec-0012 TDD-0395/0398
  (TC-0012-0354/0391).
- Extend `core/prototyping/specsCovered.ts` with
  `checkSpecsCoveredDrift(frozenSpecsCovered, currentLive)`. Pure; uses the
  frozen value as baseline. spec-0012 TDD-0397 (TC-0012-0386).
- Rewrite the `qfai-prototyping` SKILL.md Step 2-A bullet (asset under
  `assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`): remove
  "confirm the selected spec is UI-bearing" prompt language; replace with
  multi-spec wording that references `resolveAllUiBearingSpecs()` and
  states the zero-specs no-op exit. spec-0012 TDD-0396 (TC-0012-0356).

### Changed (Wave 3 blocked-resolved after Wave 1)

- `runPrototypingIterate` zero-UI-bearing behavior flipped from exit 2 to
  exit 0 with stderr "no UI-bearing specs resolved" and no iter-NN/
  directory creation (section 0 pre-check using `resolveAllUiBearingSpecs`).
  Existing test inverse-updated in-place. spec-0012 TDD-0379 (TC-0012-0355).
- `runPrototypingIterate` cycle 0 now writes `frozenSpecsCovered: [...]`
  and `frozenLicenseCatalog: { allowedSources, licenseTiers }` into
  `prototyping.json` via extended `writeSeedMetadata`. New
  `DEFAULT_LICENSE_CATALOG` constant (allowedSources `["unsplash","pexels"]`).
  spec-0012 TDD-0381/0382 (TC-0012-0388/0389).
- `runPrototypingIterate` hard-stops with exit 66 when any
  `imageSources[]` entry has a non-allowlisted source or unknown license
  tier; stderr names the offending URL. Reads `imageSources[]` from
  `prototyping.json` directly (handoff-yaml extraction deferred). spec-0012
  TDD-0383 (TC-0012-0371).
- `runPrototypingIterate` cycle ≥1 spec-set drift detection via
  `checkSpecsCoveredDrift`. Drift → exit 2 with stderr listing added /
  removed specs; no auto-restart at cycle 0. spec-0012 TDD-0385
  (TC-0012-0385).
- Pin `readFrozenSpecsCovered` input-order preservation and
  `buildCompletionCertificate` order propagation. spec-0012 TDD-0386
  (TC-0012-0382).
- Pin frozen SSOT immutability across cycles: mutating in-memory live
  arrays does not back-write to the persisted record; consumer
  defensive-copy contract enforced. spec-0012 TDD-0388 (TC-0012-0390).

### Added (Wave 2 — schema extensions)

- New `parseEvaluatorReview(input)` parser in
  `core/prototyping/evaluatorReview.ts` validating the v2.0 review payload:
  4 ordinal axes (`informationArchitecture` / `navigationFlow` / `usability`
  / `functionality`), 6 `*Feel` fields (`operability` / `transitionFeel`
  / `crossScreenContinuity` / `userStoryFeel` / `acceptanceCriteriaFeel`
  / `menuReachabilityFeel`), `layoutAntiPatternsDetected[]`,
  `designMdViolations[]`, and the closed nested record
  `softWarnings: { timeBudget: boolean }` (required). The flat
  `timeBudgetSoftWarning?: string` key that earlier Wave 2 drafts
  carried is no longer part of the schema and is rejected by the
  closed-schema gate — see the "BREAKING CHANGES (PR #208 —
  ReviewerPayload schema)" entry above for the authoritative
  removed/added diff.
  New constants `FEEL_FIELDS`, `FEEL_FIELD_MAX_WORDS = 200`. Named-path
  validation errors: `missing field: <name>` / `missing field: scores.<axis>`
  / `unknown field: <name>` / per-field word-count rejection. Legacy
  `buildEvaluatorReview` path untouched. spec-0012 TDD-0403/0404/0405/0406/0407
  (TC-0012-0364/0365/0366/0384/0387).
- New module `core/prototyping/handoff.ts` with `validateImageSources(input)`.
  Closed schema: each entry exactly `{url, license, attribution, source}`
  (all strings); missing/non-string fields emit
  `imageSources[N].FIELD is required` named-field errors; unknown keys
  rejected; multi-entry error aggregation. spec-0012 TDD-0408
  (TC-0012-0372).

### Deferred (tracked for follow-up)

- TDD-0384 (TC-0012-0377): per-spec `iter-NN/spec-NNNN/<screen>.review.json`
  layout migration. Requires coordinated change to `iteration.ts` SSOT
  helpers, validator path predicates, certify scan logic, and the
  iterate-plan template paths. Surgical scope exceeded; would cascade
  through 8+ existing tests. Defer to a dedicated migration wave.
- TDD-0401/0402 (TC-0012-0374/0383): Reviewer Playwright-session failure
  hard-stop + menu-entry navigation count. Requires real Playwright
  wiring; deferred to a subsequent integration cycle.

### Changed (spec / contract only — implementation lands separately)

- **`/qfai-prototyping` redefinition (CHG-002, spec-0012)**: spec pack rewritten
  per discussion-20260516144141078 (REQ-0001..0013). The new model is
  multi-spec per invocation (`resolveAllUiBearingSpecs()` replaces the
  per-invocation primary-spec selection prompt), 10-cycle budget
  (`MAX_ITERATIONS = 10`, `MAX_ITERATION_INDEX = 9`), reviewer-driven
  Playwright per spec × screen (no scripted interaction transcript, no
  PNG / HTML / `interaction.json` capture), qualitative-only convergence
  (AND across every spec × screen pair of the 4 ordinal UX axes at
  `exceptional` AND `layoutAntiPatternsDetected[]` empty AND
  `designMdViolations[]` empty — no quantitative AC-pass% /
  transition-pass% thresholds), autonomous cycle 0..9 with four
  deterministic hard-stop classes (lock drift exit 2 / Reviewer
  Playwright failure exit 64 + `sessionStatus` discriminator /
  license-verify failure exit 66 / mid-run spec-set change exit 2),
  per-spec iter-dir layout
  `iter-NN/spec-NNNN/<screen>.review.json`, cycle-0 freeze of the
  resolved spec set AND the stock-photo license-class catalog, and
  per-image license recording in
  `prototype-handoff.yaml#imageSources[]`. Phase 0 contract authored at
  `.qfai/contracts/cli/qfai-prototyping.md`. Five integration follow-ups
  captured as OQ-0012-0001..0005 in `spec-0012/08_Open-questions.md` to
  resolve before code lands.

## [1.8.9] - 2026-05-07

### Fixed (Breaking — pre-1.8.9 internal pipelines only)

- **design-system.yaml accepts the post-1.8.9 DESIGN.md token mirror**:
  `validateDesignSystem` now accepts the new mirror shape
  (`visual.colors`, `visual.typography`, `visual.radius`,
  `visual.shadow`) documented in
  `qfai-prototyping/references/handoff.md`. The legacy
  `checklist.{color,typography,...}` shape is still accepted as a
  fallback so existing projects keep validating until they regenerate
  their design-system.yaml. Without this, a freshly generated mirror
  would fail QFAI-DCON-005 before certification, blocking the
  validate → verify → certify sequence.
- **prototype-handoff.yaml string fields require non-empty scalars**:
  Each string field (`finalArtifact`, `designMdPath`, `designMdSha256`,
  `designSystemMirror`, `implementationNotes`) is now validated as a
  non-empty string. Previously the helper passed arrays / mappings as
  "meaningful content", so a handoff like `finalArtifact: { uri: "..." }`
  or `designSystemMirror: ["a.yaml", "b.yaml"]` slipped past
  QFAI-DCON-013 even though downstream consumers (`/qfai-implement`,
  certify, ref-integrity) require scalar paths. The
  `validateRequiredStringArrayKeys` helper is now removed (it was
  the source of the type-laxity).
- **prototyping ref-integrity rejects non-string handoff paths**:
  `validatePrototypingArtifactRefIntegrity` now treats
  `prototype-handoff.finalArtifact` and
  `prototype-handoff.designSystemMirror` as required, so a
  non-string or empty value produces QFAI-PROT-009 instead of
  silently passing the ref-integrity gate.
- **DESIGN.md color scanner restricted to CSS contexts**:
  `findDesignMdViolations` color scan now reads only inline `style="..."`
  values and `<style>...</style>` block content, not arbitrary HTML
  text. Previously hex literals in non-CSS contexts (`<a href="#deadbeef">`,
  SVG `url(#abc)` references, Tailwind `class="bg-[#...]"` arbitrary
  values, commit-hash prose) were flagged as DESIGN.md drift, making
  `qfai prototyping certify` reject otherwise-compliant prototypes.
- **DESIGN.md scanner strips `url(...)` fragments before color scan**:
  CSS `url(...)` invocations (SVG / filter / mask references such as
  `filter:url(#abc)` or `mask:url("#defaced")`) no longer surface their
  fragment-id as a DESIGN.md color violation. The strip-pass runs
  inside `extractCssRegions`'s output before HEX_RE / RGB_RE / HSL_RE
  match, complementing the prior CSS-context restriction.
- **DESIGN.md scanner detects mixed-case CSS property names**:
  `RADIUS_RE`, `SHADOW_RE`, and `FONT_RE` now use the `i` flag so
  `Border-Radius: 1.5rem`, `BOX-SHADOW: 0 0 8px red`, and
  `Font-Family: "Comic Sans"` are caught. CSS property names are
  case-insensitive per spec; without the flag, off-spec authored
  prototypes could leak DESIGN.md drift through the certify gate.
- **DESIGN.md scanner rejects CSS named-color keywords**:
  A new property-anchored regex (`color`, `background-color`,
  `border-color`, `outline-color`, `fill`, `stroke`, etc.) catches
  values like `color: red` / `background-color: white` / `fill: blue`.
  Previously the scanner only matched hex / rgb / hsl literals, so a
  prototype that authored `color: red` could slip past certify even
  though red is not in DESIGN.md. The check skips `transparent` /
  `currentcolor` / `inherit` / `var(...)` references; if the
  DESIGN.md authored a named color as a token (`primary: red`) the
  match is allowed. Multi-token shorthand values
  (e.g. `border-color: red blue green red` for top/right/bottom/left)
  are now split on whitespace and each token is checked
  independently, so 4-side longhand drift is no longer silent. The
  property allow-list now also includes the common shorthands
  (`background`, `border`, `border-{top,right,bottom,left}`,
  `outline`) so named colors authored as `background: red` /
  `border: 1px solid red` / `outline: 2px dashed blue` are also
  caught. Hex / rgb / hsl tokens are skipped per-token (rather than
  at the value level), so a mixed shorthand like
  `border-color: red #ff0000 blue #00ff00` surfaces every token —
  the literal scanner catches the hex tokens, and the named-color
  pass catches the keyword tokens.
- **design-system.yaml mirror values cross-checked against DESIGN.md**:
  `validateDesignSystem` now compares the mirror's
  `visual.colors.{12 keys}`, `visual.typography.{family_*3}`,
  `visual.radius.{4 keys}`, `visual.shadow.{3 keys}` against the
  parsed root DESIGN.md tokens. Each mismatch surfaces a DCON-005
  with the diverging value diff (e.g. "mirror=#FF0000, DESIGN.md=
  '#1F2937'"). Previously the mirror was shape-only (top-level
  records non-empty), so a hand-authored mirror that disagreed with
  DESIGN.md could pass `qfai validate --profile prototyping` and
  bind downstream `/qfai-implement` to a tampered identity.
- **prototype-handoff.yaml designMdPath / designMdSha256 cross-check
  against DESIGN.md.lock**: `validatePrototypeHandoff` now requires
  `designMdPath` to resolve to the repo-root DESIGN.md (accepting
  `DESIGN.md` and `./DESIGN.md`) and requires `designMdSha256` to
  be a 64-hex value equal to `DESIGN.md.lock.yaml#designMdSha256`.
  Without this, a handoff with a path pointing at an alternate file
  or a stale arbitrary sha could pass `qfai validate` while binding
  downstream `/qfai-implement` to a DESIGN.md identity that diverges
  from the frozen root lock.
- **DESIGN.md `visual.typography.scale` strict-parse**:
  `parseDesignMd` now rejects non-string and padded /
  whitespace-only typography scale values (`base: 1`,
  `base: " 1rem "`). Pre-fix, `readStringRecord` coerced numbers to
  strings and accepted padded values, so malformed type-scale
  tokens leaked into the lock and the design-system.yaml mirror
  as "validated" tokens that downstream CSS engines reject. Now
  rejected with `invalid-type` / `invalid-format` at the brand
  SSOT.
- **DESIGN.md `visual.typography.weight` numeric strict-parse**:
  `parseDesignMd` now rejects non-number values for typography
  weight tokens (`regular` / `medium` / `bold`). Pre-fix, an
  authored `regular: "400"` (quoted string) silently dropped from
  the resulting weight record, leaving the mirror cross-check with
  an empty / partial expected and accepting a handoff that lost
  authored weight tokens. Now rejected with `invalid-type` at the
  brand SSOT so the contract is enforced before downstream
  consumers see the data.
- **DESIGN.md `visual.spacing` strict-parse**: `parseDesignMd` now
  rejects `visual.spacing.base` values with leading / trailing
  whitespace (e.g. `" 0.25rem "`) at parse time, and requires
  `visual.spacing.scale` to be a finite-number array per the
  canonical `design-md-spec.md` (`scale: number[]`). Mixed
  number/string entries (`[0, "wide"]`) and non-array values are
  rejected with `invalid-type` / `invalid-format` errors. Without
  this, malformed spacing tokens could freeze into the DESIGN.md
  lock and the design-system.yaml mirror, then surface as render-
  time CSS rejections at the `/qfai-implement` step. The
  `DesignMd["visual"]["spacing"]["scale"]` type tightens from
  `Array<number | string>` to `number[]`.
- **iterate gap-check uses typed isRecord predicate**:
  `prototypingIterate.ts` corrupt-history check no longer carries a
  bare `as { index?: unknown }` assertion. A local `isRecord` user-
  defined type predicate guards `it.index` access through control-
  flow narrowing, satisfying the project rule "avoid bare `as` type
  assertions; prefer type narrowing".
- **iterate frozen-specs check compares element-wise**:
  `prototypingIterate.ts` cycle >= 1 spec-frozen check now uses
  `arraysShallowEqual` instead of comparing only the first element.
  Today `specs` is single-element, but `specsCovered` is a
  multi-element array per the prototyping.json schema, and the
  contract is "every covered spec must match across cycles" — a
  first-element-only check would silently drift on non-zero indices
  if the loop ever extends to multi-spec coverage.
- **iterate fail-fast when frozen specsCovered seed is missing**:
  Cycle >= 1 now exits 2 when `prototyping.json#specsCovered` is
  absent, empty, or contains non-string entries (i.e.
  `readFrozenSpecsCovered` returns null). Previously the null path
  was a silent skip that allowed iterate to write a fresh resolved
  spec into `iterate-plan.json` while certify later blocked on the
  same gap. Single, clear error pointing at
  `--cycle 0 --target-url <url>` to refreeze.
- **DESIGN.md scanner: shadow-embedded colors are scoped to box-shadow**:
  `collectAllowedColors` no longer widens the global color allow-set
  with literals embedded in registered box-shadow tokens. Instead,
  `scanColors` strips `box-shadow:` declarations from the cssText
  before the literal scan via a new `SHADOW_DECL_STRIP_RE`. Pre-fix,
  an unrelated `background-color: rgba(15,23,42,0.05)` would
  silently pass when the same rgba happened to appear inside a
  registered shadow value (it had been added to the global allow-
  set). The scoped fix preserves the original "shadow value with
  embedded rgba is legitimate" exemption while closing the
  cross-property leak. `scanShadow` continues to validate the full
  shadow string against `dm.visual.shadow` independently. The strip
  is intentionally box-shadow-only — `text-shadow` has no
  independent validator, so its `text-shadow:` declarations remain
  in the literal-scan input and hex / rgb / hsl drift inside a
  text-shadow value still surfaces (named-color drift in
  text-shadow is uncovered until a future spec adds a
  `dm.visual.textShadow` token contract).
- **DESIGN.md scanner: text-decoration / column-rule shorthands**:
  COLOR_PROP_RE now also captures `text-decoration` and
  `column-rule` shorthands. `text-decoration: underline red`
  (named color in the second slot) and
  `column-rule: 1px solid red` (named color in the third slot) now
  surface as DESIGN.md drift. Pre-fix only the dedicated
  `text-decoration-color` / `column-rule-color` longhands were
  caught.
- **design-system.yaml mirror: optional tokens cross-checked**:
  When DESIGN.md authors `visual.spacing`, `visual.typography.scale`,
  or `visual.typography.weight`, the mirror is now required to copy
  them verbatim — divergent values, missing keys, and fabricated
  extra keys all surface as DCON-005. Pre-1.8.9 only the required
  tokens (colors, family triple, radius, shadow) were cross-checked,
  leaving the optional sections as a silent gap. New helpers
  `crossCheckTypographyScale` / `crossCheckTypographyWeight` /
  `crossCheckSpacing` handle the heterogeneous shapes (string vs
  number values, scalar vs array). When DESIGN.md does NOT author
  these optional tokens, the mirror is also required to omit them
  — the verbatim-mirror contract is set-equal in both directions.
  A "third state" where the mirror authors a section that DESIGN.md
  does not is now rejected via dedicated
  `rejectMirrorOnlyTypographySubKey` / `rejectMirrorOnlySpacing`
  helpers.
- **designContractReadiness: bidirectional mirror cross-check**:
  `crossCheckMirrorValues` now runs in both directions. The
  DESIGN.md → mirror direction was already added; the new mirror →
  DESIGN.md direction surfaces fabricated extra keys (e.g. a
  hand-authored `visual.colors.fabricated_token: "#FF00FF"` not in
  DESIGN.md) as a DCON-005 with the rationale "the mirror must be
  a verbatim copy of DESIGN.md (no fabricated keys)". The contract
  is now structurally enforced: the mirror's per-section key set
  must be set-equal to DESIGN.md's. The reverse loop accepts an
  `optionalKeys` whitelist so legitimate nested optional sub-keys
  (`typography.scale`, `typography.weight`) handled by dedicated
  helpers do not surface as fabricated false-positives.
- **designContractReadiness: handoff cross-check skips placeholders**:
  The `designMdPath` / `designMdSha256` cross-check skip predicate
  now also excludes `PLACEHOLDER_RE` matches (`tbd`, `todo`, `n/a`,
  etc.). Pre-fix, an operator who left `designMdPath: TBD` saw two
  DCON-013 entries for the same authoring fix — once from the
  upstream string-field gate (which already rejects placeholders),
  once from the cross-check ("TBD is not DESIGN.md"). Post-fix,
  the cross-check defers to the upstream gate; only one DCON-013
  fires per placeholder field.
- **designContractReadiness: parse DESIGN.md even without lock**:
  `parseDesignMd` is no longer gated on `lockText !== null`. A
  UI-bearing project in the common initial state (DESIGN.md
  authored but malformed, lock not yet generated) now surfaces both
  DCON-031 (missing lock) AND DCON-033 (parse failure), pointing
  the operator at the file that actually needs repair. Pre-fix,
  only DCON-031 fired and `/qfai-sdd Phase 0` would keep failing
  on the invalid front-matter without the validator naming it.
- **specsCovered SSOT module**: `readFrozenSpecsCovered` is now a
  single shared helper at
  `core/prototyping/specsCovered.ts`. Both `prototypingIterate`
  (cycle >= 1 hash gate) and `prototypingCertify` (final-spec
  resolution) import it. Pre-1.8.9 each command had its own copy
  of the predicate, with the comment "same shape as the helper in
  prototypingCertify" — the SSOT consolidation removes the manual
  shape-mirror obligation and adds dedicated unit tests for the 4
  null trigger paths.
- **renderCritique reads the canonical prototyping.json path**:
  `collectRenderEvidenceViewports` now imports
  `PROTOTYPING_JSON_REL` (`.qfai/evidence/prototyping/prototyping.json`)
  instead of the pre-1.8.9 hard-coded
  `.qfai/evidence/prototyping.json`. Without this, viewport
  metadata written by iterate / validate at the canonical path was
  invisible to render-critique and surfaced as spurious
  QFAI-CRIT-003/004 even when the iter HTML had the right viewport
  entries.
- **DESIGN.md typography scale/weight allowlist**: `parseDesignMd()`
  now rejects unknown nested keys under `visual.typography.scale`
  (allowed: `xs sm base lg xl 2xl 3xl`) and
  `visual.typography.weight` (allowed: `regular medium bold`),
  matching the canonical spec. Authored extras (`scale.hero`,
  `weight.black`) no longer freeze into the lock while iteration /
  certification ignore them.
- **prototype-handoff.yaml `finalIterIndex` error message accuracy**:
  The DCON-013 message now distinguishes missing-field vs invalid-
  type/value cases. Operators who DID write the field but with the
  wrong type/range no longer see "missing required field"
  (Principle of Least Astonishment); they see "must be a non-negative
  integer (got X)".
- **certify enforces per-screen HTML in the accepted iter (multi-screen)**:
  `qfai prototyping certify` now reads UI contracts via
  `readUiContractScreenContracts` and rejects with exit 2 when any
  declared screen lacks a matching `<screenId>.html` in the
  accepted iter dir. Previously a stale older
  `iter-NN/<missing-screen>.html` could let `validate` stay green
  (validateUiEvidenceArtifacts accepts a screen file from any iter
  directory), and certify would seal the run as long as the
  accepted iter had at least one HTML — closing that gap.
- **iterate rejects mid-loop primary-spec change**:
  `qfai prototyping iterate --cycle N` (N >= 1) now compares the
  resolved primary spec against the frozen
  `prototyping.json#specsCovered`. A mismatch (e.g.
  `prototyping.primarySpecId` was edited or a new `surface_type:
ui-bearing` marker landed mid-loop) exits 2 — preventing the
  scenario where iterations write the new spec into
  `iterate-plan.json` while certify keeps reporting the frozen one.
- **iterate detects corrupt iterations history**:
  Before deriving the expected next cycle from `iterations.length`,
  `runPrototypingIterate` now confirms `iterations[i].index === i`
  for every entry. A hand-edited or partially-corrupted
  `prototyping.json` (e.g. `iterations.length === 3` but
  `iterations[2].index === 5`) exits 2 at the command boundary,
  rather than letting the validator's per-index check produce a
  delayed cryptic error one cycle later.
- **iterate diagnostic message tightened**: The out-of-sequence
  error message no longer repeats the same number twice
  ("must be 5 (next sequential index after iterations.length=5)").
  New form: "expected --cycle N (iterations.length=N); got --cycle X.
  Re-run with the expected cycle, or restart the loop with
  `--cycle 0 --target-url <url>`." The hint now includes the
  `--target-url` requirement so the operator does not fall into a
  second exit-2 on the restart path.
- **`prototyping iterate` rejects out-of-sequence cycles**: Calling
  `qfai prototyping iterate --cycle N` when `iterations.length !== N`
  now exits 2 with a message naming the expected cycle. Previously a
  call like `--cycle 3` after only `iter-00` was recorded would
  silently create an `iter-03/iterate-plan.json` that the validator
  later rejected (`iterations[i].index === i` invariant), blocking
  validation/certification with a delayed cryptic error. The check
  runs AFTER `shouldStop`, so converged or max-budget loops still
  return their 64/65 stop reason cleanly.
- **DESIGN.md nested unknown-key reject (colors/radius/shadow)**:
  `parseDesignMd()` now rejects unknown keys nested under
  `visual.colors`, `visual.radius`, and `visual.shadow` at parse
  time (not just at validate time). Previously
  `readStringRecord` silently dropped non-scalar values
  (`visual.colors.gradients: [...]`, `visual.radius.breakpoints: {...}`)
  before the validator could see them, so the offending directive
  would freeze into the lock without surfacing a parse error. New
  TC-1.1.22..24 anchor the contract.
- **`RejectScope` discriminated union**: The `rejectUnknownKeys`
  helper's scope parameter is now a discriminated union of
  `{ kind: "root" }` and `{ kind: "section"; name; path }`. The
  prior shape carried a dead `name: ""` placeholder for the root
  invocation; the union form makes that unrepresentable, and TS
  exhaustiveness checks every callsite.
- **`finalIterIndex` numeric handling in prototype-handoff validator**:
  `validatePrototypeHandoff` now treats `finalIterIndex` as a
  numeric field (`Number.isInteger && >= 0`) rather than forwarding
  it through `hasMeaningfulContractContent`, which only accepts
  strings/arrays/records. Without this, every spec-conformant
  `prototype-handoff.yaml` (where `finalIterIndex` is a YAML number)
  would fail QFAI-DCON-013 and block the validate → verify → certify
  sequence. New positive test asserts well-formed handoff produces
  zero DCON-013 issues; new negative tests assert non-integer and
  negative values are still rejected. The handoff sample
  (`assets/init/.../prototype-handoff.sample.yaml`) is updated to the
  new field set so `qfai init` ships a passing example.
- **`designSystemMirror` ref-integrity check (was extractedDesignSystem)**:
  `validatePrototypingArtifactRefIntegrity` now checks
  `prototype-handoff.yaml#designSystemMirror`, matching the renamed
  field. The previous code checked the legacy `extractedDesignSystem`
  name, so a handoff that pointed `designSystemMirror` at a missing
  artifact was silently passed by ref-integrity (only DCON-013 from
  the readiness validator caught the missing field, and the missing-
  TARGET case slipped through entirely). New positive test seeds a
  handoff with a missing `designSystemMirror` target and asserts
  PROT-009 surfaces the field name + path.
- **prototype-handoff.yaml validator aligned with new contract**:
  `validatePrototypeHandoff` now requires `finalIterIndex`,
  `finalArtifact`, `designMdPath`, `designMdSha256`,
  `designSystemMirror`, `implementationNotes` — the fields documented
  in `qfai-prototyping/references/handoff.md`. The legacy
  multi-option fields (`sourcePrototypeRefs`, `surfaceProfiles`,
  `screens`, `visualDna`, `implementationHandoff`) are retired
  together with the preserve/adapt/copy split, since the loop became
  single-thread when DESIGN.md became the brand SSOT. Pre-1.8.9
  pipelines that wrote a handoff with the legacy field names will
  now fail QFAI-DCON-013 and must be re-run from the new handoff
  authoring step in `/qfai-prototyping`.
- **DESIGN.md `visual.spacing` unknown-key reject**:
  `parseDesignMd()` now rejects unknown keys under `visual.spacing`
  (e.g. `gutter`, `density`) with the same `unknown-key` ParseError
  shape as the other sections. Allowlist: `base`, `scale`. New
  TC-1.1.21 anchors the contract.
- **assets/ retired-sidecar reference sweep + guard**: Migrated 6
  more `assets/` doc files (14_Review-Request.md L38/L40/L41,
  product-experience-architect.md L31, contract-artifact-rules.md L12,
  comparison-review.md L8, contracts-review.md L25, scoring-review.md
  rewritten) so distributed surfaces stop pointing operators at the
  retired `33_exploration_rubric.md` / `34_evaluator_calibration.md`
  sidecars. Added a guard test in `uiuxSidecar.test.ts` that
  greps every `assets/**/*.md` for the forbidden phrases
  (`exploration brief|rubric` / `evaluator calibration` /
  `33_exploration_rubric` / `34_evaluator_calibration`) and only
  whitelists the two warning lines in `00_index.md` Forbidden
  Legacy Files. Future partial fixes will fail this test in CI.
- **DESIGN.md `rejectUnknownKeys` SSOT**: New
  `rejectUnknownKeys(record, allowed, pathPrefix, sectionLabel)`
  helper in `core/design/designMd.ts` replaces 6 inline copies of
  the unknown-key reject pattern (root, `brand`, `visual`,
  `visual.typography`, `audience`, `accessibility`). Each call site
  is now `const err = rejectUnknownKeys(...); if (err) return { error: err };`.
  Future spec sections that grow a new key add their allowlist + a
  single `rejectUnknownKeys` call rather than copy-pasting the
  filter / first-match / ParseError shape.
- **DESIGN.md `accessibility` unknown-key reject**: `parseDesignMd()`
  now rejects unknown keys under `accessibility` (e.g. `focus_ring`,
  `reduced_motion_details`) with the same `unknown-key` ParseError
  shape as the other sections. Allowlist: `contrast_ratio_min`,
  `motion`. Closes the final remaining gap in the "Unknown keys at
  any level are rejected" contract — every section (`brand`, `visual`,
  `visual.typography`, `audience`, `accessibility`) and the root now
  enforce it.
- **DESIGN.md root unknown-key reject**: `parseDesignMd()` now rejects
  unknown root-level keys (e.g. `platform:`, `references:`) with the
  same `unknown-key` ParseError shape as `visual` / `visual.typography`
  / `audience`. Allowlist: `brand`, `visual`, `audience`, `accessibility`.
  Closes the last gap in the "Unknown keys at any level are rejected"
  contract.
- **DESIGN.md shadow whitespace reject**: `validateDesignMd` now
  rejects leading/trailing whitespace in `visual.shadow.{sm,md,lg}`
  (new `invalid-shadow-format` code), matching the existing color /
  font / radius byte-anchored validation. Otherwise certify's
  exact-string box-shadow comparison can flag compliant CSS as drift
  because the token froze a stray-whitespace variant.
- **DESIGN.md `audience` unknown-key reject**: `parseDesignMd()` now
  rejects unknown keys under `audience` (e.g. `audience.references`)
  with the same `unknown-key` ParseError as `visual` and
  `visual.typography`. Previously such keys were silently dropped
  from the parsed tokens consumed by iteration / certify while still
  being hashed into `DESIGN.md.lock.yaml`, letting authors freeze
  directives that the parser ignored.
- **canonical sidecar pruning end-to-end**: The init template
  surfaces (`uiux/00_index.md` File Inventory,
  `uiux/50_review_input_bundle.md` Bundle Contents,
  `14_Review-Request.md` reviewer checklist,
  `qfai-sdd/references/ui-design-contract-normalization.md`,
  `assets/uix-rev/scoring-review.md`) no longer reference the
  retired `33_exploration_rubric.md` / `34_evaluator_calibration.md`
  sidecars. The previous validator-only fix left a documented
  expectation that operators create the deleted sidecars, which then
  fell into the legacy-format guard. Reviewer alignment is now
  pinned to the four canonical UX axes fixed in
  `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`.
- **shared `isEnoent` errno helper**: New `src/core/fs/errno.ts`
  exports `isEnoent(err: unknown): boolean` and is now the SSOT for
  all 11 ENOENT narrowing call sites in the package: `init.ts`,
  `core/config.ts`, `core/specLayout.ts`, `cli/commands/report.ts`,
  `cli/commands/prototypingIterate.ts`, `core/calibration/loader.ts`,
  `core/validators/atddLedger.ts`,
  `core/validators/requirementsContext.ts`,
  `core/validators/reviewArtifacts.ts`,
  `core/validators/reviewGate.ts`,
  `core/validators/uix/designSystemPresence.ts`,
  `core/validators/uix/foundation.ts`. The legacy
  `isMissingFileError` alias in `core/validators/utils.ts` is removed.
  Future errno codes (`EACCES`, `EBUSY`, `EPERM`, ...) extend
  `errno.ts` rather than sprouting new inline checks.
- **forbidden legacy file patterns extended**: `threeLayer.ts#FORBIDDEN_LEGACY_PATTERNS`
  now matches `^3[34]_.*\.md$` (covers `33_exploration_rubric.md`
  and `34_evaluator_calibration.md`). Operators following stale docs
  who recreate either file now hit `UIX-VAL-3LAYER-FORBIDDEN-FILE`
  at validate time instead of being silently ignored. The init
  template surfaces (`uiux/00_index.md` Forbidden Legacy Files,
  `uiux/50_review_input_bundle.md` Trend-derived focus + Review
  Checklist) updated to match.
- **certify reads frozen `specsCovered` from cycle 0**:
  `qfai prototyping certify` no longer re-resolves the primary spec
  via `resolvePrimaryPrototypingSpec`. It now reads
  `prototyping.json#specsCovered` (seeded by `iterate --cycle 0`)
  and fails fast when the slot is missing, malformed, or empty.
  A config edit (`prototyping.primarySpecId`) or a new
  `surface_type: ui-bearing` marker landing between cycle 0 and
  certify can no longer silently re-baseline the certificate to a
  spec the loop never exercised. The cycle 0 seed is the SSOT for
  what was actually reviewed.
- **DESIGN.md font violation regex respects style attribute boundary**:
  `findDesignMdViolations` font scan no longer captures past the
  enclosing inline-style quote. Previously
  `<div style="font-family: Inter" class="card">` resolved to
  `Inter" class="card"` (because `[^;}<>]+` allowed the trailing
  attribute quote inside the value), which made `fontMatches` reject
  an otherwise-allowed family and could fail compliant generated HTML
  during `qfai prototyping certify`. The regex now models CSS
  font-family as a comma-separated list of either fully-quoted
  strings or unquoted tokens, so `"Comic Sans"` inside a `<style>`
  block still resolves correctly.
- **DESIGN.md overlay alpha accepts `1.0` / `1.00` (CSS-equivalent to `1`)**:
  The strict overlay regex introduced earlier accepted only the
  integer `1`, surprising authors writing the CSS-equivalent
  `rgba(0,0,0,1.0)` and rejecting templates that already used the
  decimal form. Alpha branch is now `0|1(?:\.0+)?|0?\.\d+`, which
  also collapses the dead `\.\d+` alternation that was a subset of
  the existing `0?\.\d+` branch.
- **prototyping handoff order documented end-to-end**: Cross-doc drift
  in the `qfai-prototyping/references/handoff.md` "Cert" section and
  `qfai-verify/SKILL.md` reviewer-gate checklist is fixed: the
  handoff reference now spells out the validate → /qfai-verify →
  certify order with the explicit precondition that certify requires
  both gate files in place; the verify reviewer-gate no longer asks
  the reviewer to confirm the completion-certificate (which only
  exists AFTER verify in the new order).
- **threeLayer canonical sidecar family pruned**: `validateThreeLayerModel`
  / `validateThreeLayerFamilyCompleteness` no longer require
  `33_exploration_rubric.md` and `34_evaluator_calibration.md`. These
  sidecars were retired when DESIGN.md became the brand SSOT and the
  evaluator axes were fixed (`ORDINAL_AXES`); they are no longer
  generated by `qfai init`. Discussion packs created from current init
  assets used to fail `qfai validate --profile discussion` because the
  validator demanded the deleted files. Canonical family is now
  `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md`.
- **prototyping cycle 0 stale-state cleanup hardened**:
  `qfai prototyping iterate --cycle 0` now also unlinks any stale
  `.qfai/evidence/prototyping/completion-certificate.json` (so
  consumers reading the cert during the reset window do not observe
  the prior loop's signoff). The iter-NN cleanup is now restricted
  to actual directories (a stray non-dir entry matching the regex is
  preserved) and surfaces an `info()` hint when a removal fails (e.g.
  Windows file lock) so the operator notices the leftover instead of
  silent rot. The cert cleanup treats ENOENT as silent.
- **DESIGN.md overlay regex tightened**: `visual.colors.overlay` now
  validates against an `rgba(R,G,B,A)`-only pattern with R/G/B in
  0..255 and alpha in `{0, 1, 0.x, .x}`. The previous shared regex
  `^rgba?\(...\)$` accepted the alpha-less `rgb(...)` form even though
  the distributed DESIGN.md spec and the validator's own error message
  both reserved overlay for `rgba(...)`. Hex (6 or 8-digit) is also
  rejected for overlay; only the explicit-alpha rgba literal is valid.
- **DESIGN.md typography unknown-key reject**: `parseDesignMd()` now
  rejects unknown keys under `visual.typography` (e.g. `font_pairing`,
  `fallback_policy`) with the same `unknown-key` ParseError as the
  visual top level. Previously such keys were silently dropped from
  the parsed tokens consumed by iteration and certification while
  still being hashed into `DESIGN.md.lock.yaml`.
- **prototyping cycle 0 hard-reset includes legacy `fullHarness`**:
  `qfai prototyping iterate --cycle 0` now also deletes a stale
  `fullHarness` block (legacy pre-UX-loop schema) alongside the
  existing `iterations` / `reviewerGate` / `acceptedIterationIndex`
  / `stopReason` reset. Pre-1.8.9 projects that retained
  `fullHarness.{runId,status,scoringTrace,...}` could otherwise show
  prior-loop completion data in `validate` / `report` surfaces
  (PROT-329 etc.) alongside the freshly-frozen loop.
- **prototyping certify ↔ iter binding**: `prototypingCertify` now anchors
  the final-iteration HTML scan to
  `prototyping.json#iterations[iterations.length - 1]` instead of the
  highest-indexed `iter-NN/` directory found on disk. After a
  `qfai prototyping iterate --cycle 0` reset, stale `iter-NN/` directories
  from a prior loop could otherwise survive on disk; the previous
  filesystem-max resolver would scan and digest those stale artifacts as
  the "final" iteration, binding the completion certificate to evidence
  the current reviewer gate did not approve. As defense-in-depth,
  `prototypingIterate --cycle 0` also deletes any pre-existing
  `iter-NN/` directories under `.qfai/evidence/prototyping/` during its
  hard-reset; non-iter siblings (e.g. operator notes) are preserved.
- **prototyping path SSOT**:
  `validators/prototyping/completionCertificate.ts#isCompletionClaimed`
  was reading the legacy `.qfai/evidence/prototyping.json`, silently
  bypassing QFAI-PROT-335 / QFAI-PROT-336 in the new UX-loop
  pipeline. The validator now reads the canonical
  `.qfai/evidence/prototyping/prototyping.json` (matching the
  `iterate` / `certify` writers), and a new
  `src/core/prototyping/paths.ts` exports `PROTOTYPING_JSON_REL`
  consumed by all 6 prior literal sites. Pipelines that previously
  passed `validate` while claiming completion without a certificate
  will now correctly emit QFAI-PROT-335 — re-run
  `qfai prototyping certify` to seal a valid certificate.

### Changed (BREAKING)

- **spec layout**: spec-0017 (CAP-0017 v2.0 single-thread evolution loop / UX-loop redesign) decomposed into spec-0012 (primary) + spec-0004 (validators) + spec-0010 (discussion) + spec-0011 (implement) + spec-0013 (sdd) + spec-0014 (verify) + spec-0015 (agent routing) + spec-0007 (guardrails). CAP-0017 absorbed into CAP-0012. `.qfai/specs/spec-0017/` and `CAP-0017` permanently retired (gap reserved per slice-policy §ID 安定性ルール 5). Backward compatibility intentionally NOT preserved.
- **spec-0012 v1.x purge**: legacy AC-0012-0011..0019, BR-0012-0011..0016, EX-0012-0090..0097/0108..0109, TC-0012-0287..0288/0297..0309/0314..0318, DR-0012-0004/0006/0007/0008/0009/0011 removed. EX-0012-0098..0102 (Delegation Scope, Validate/Verify Gates, Non-UI Exclusion, Legacy Traceability Space) remain active. mode budgets / `fullHarness.iterations[]` / `scoringTrace[]` / `allReviewerAxesPerfect100` / weighted-total scoring / r5/r3/r2/r1 round funnel / hard-floor evaluation-rubric enforcement are no longer in the active spec surface.
- **`designContractReadiness` / `doctor` lock-sha contract tightened**: `DESIGN.md.lock.yaml#designMdSha256` is now required to be a 64-character hex string (case-insensitive, normalized to lower-case). Previously the validator path accepted any non-empty string and silently disagreed with the doctor path (regex-anchored 64 hex). Existing locks generated by `/qfai-sdd` Phase 0 are 64-hex by construction; manually-edited locks with placeholder or shortened sha values now surface as DCON-031 instead of slipping through validate. The new `src/core/design/designMdLock.ts#readDesignMdLockSha` is the single SSOT extractor and is consumed by `doctor.ts`, `validators/designContractReadiness.ts`, `cli/commands/prototypingIterate.ts`, and `cli/commands/prototypingCertify.ts`.

This release also rewrites `qfai-prototyping` around a single root
`DESIGN.md` brand source of truth, swaps the evaluator axes for a
UX-focused set, and removes the visual-aesthetic anti-slop registry
together with the legacy UI-bearing sidecars and yaml contracts.
Backward compatibility is intentionally not preserved.

### Breaking changes

- **DESIGN.md is the single source of truth for brand visual identity.**
  `qfai init` now writes a `DESIGN.md` template at the consuming-project
  root (front-matter tokens for colors / typography / spacing / radius /
  shadow plus a `# Brand Philosophy` body). `/qfai-discussion` drafts it
  and `/qfai-sdd` Phase 0 freezes it into
  `.qfai/contracts/design/DESIGN.md.lock.yaml` (sha256 + frozen schema
  tokens). `/qfai-prototyping` and `/qfai-implement` consume the root
  `DESIGN.md` plus the lock file in place of the previous yaml contracts.
  Existing `--force` invocations of `qfai init` do not overwrite an
  existing `DESIGN.md`.
- **Evaluator axes swapped (UX-focused).** The four ordinal review axes
  change from `designQuality` / `originality` / `craft` / `functionality`
  to `informationArchitecture` / `navigationFlow` / `usability` /
  `functionality`. `designQuality` is replaced by a hard
  `designMdViolations` gate over the final iteration HTML;
  `originality` is dropped (branding is frozen up-front);
  `craft` is absorbed into `usability`. `prototyping.json` reviews,
  `evaluatorReview` output, and the renamed cap field
  `layoutAntiPatternsDetected` (was `slopPatternsDetected`) are not
  backward compatible with prior runs — existing artifacts must be
  regenerated.
- **shadcn / visual-aesthetic anti-slop set removed.** `slop-001-shadcn-zinc`,
  `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`,
  and `slop-010-rounded-2xl-shadow-lg` are deleted; the entire
  `designSlop` validator (which scanned discussion-pack markdown) is
  removed. Their concerns are now enforced by the DESIGN.md compliance
  gate on iter HTML. A new layout-anti-pattern set `lap-001..lap-008`
  ships in its place (`packages/qfai/src/core/validators/layoutAntiPatterns.{ts,json}`),
  scoped to prototyping iter HTML and capping
  `informationArchitecture` at `acceptable` on detection. The
  `slop-*` ID namespace is no longer issued.
- **Legacy UI-bearing sidecars deleted.** The qfai-discussion
  templates `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`,
  and `uiux/32_design_anti_goals.md` are removed. Their content is
  now expressed directly in `DESIGN.md` (front-matter tokens plus the
  `audience.do_not_look_like` field and the `# Brand Philosophy` body).
  Discussion artifact rules and the UI-bearing playbook no longer list
  these files as required outputs.
- **Legacy yaml design contracts deleted.** The qfai-sdd templates
  `contracts/brand-design.sample.yaml`,
  `contracts/exploration-brief.sample.yaml`, and
  `contracts/reference-pool.sample.yaml` are removed.
  `designContractReadiness` no longer requires these files; the
  required-files set becomes root `DESIGN.md` plus
  `.qfai/contracts/design/DESIGN.md.lock.yaml`. The DCON validator
  IDs tied to the deleted yaml are renumbered (gap-allowed): new
  `DCON-030` / `DCON-031` / `DCON-032` are added for the DESIGN.md
  surface, while the prior `DCON-002` / `DCON-003` / `DCON-004` /
  `DCON-006` / `DCON-007` / `DCON-008` / `DCON-010` / `DCON-011` /
  `DCON-014` / `DCON-015` / `DCON-016` / `DCON-017` / `DCON-018` /
  `DCON-020` / `DCON-021` slots are vacated. The `qfai-implement`
  Read order is rewritten to consume root `DESIGN.md` and
  `DESIGN.md.lock.yaml` instead of the deleted yaml contracts.

### Added

- `qfai prototyping iterate` records the root `DESIGN.md` sha256 in
  `prototyping.json` at cycle 0 and exits 2 on any subsequent cycle
  whose recomputed hash diverges from either the cycle-0 value or the
  `DESIGN.md.lock.yaml` value (DESIGN.md is frozen for the duration of
  a loop; edit and rerun from cycle 0 to change brand).
- `qfai prototyping certify` enforces a DESIGN.md compliance gate by
  running `findDesignMdViolations` over the final iter HTML; certification
  fails if any color / font / radius / shadow value falls outside the
  DESIGN.md token set.
- `qfai doctor --profile prototyping` adds three preflight checks for
  the prototyping profile: `designMdRoot` (root `DESIGN.md` exists and
  parses), `designMdLock` (`.qfai/contracts/design/DESIGN.md.lock.yaml`
  exists and parses), `designMdSha` (the lock sha matches the live
  file). `qfai prototyping preflight` aliases this profile.
- New core module `src/core/design/designMd.ts` (`parseDesignMd`,
  `validateDesignMd`, `hashDesignMd`) and
  `src/core/prototyping/designMdViolations.ts` (`findDesignMdViolations`).

### Fixed

- Copilot code review reviewer assignment migrated from REST
  `requested_reviewers` (silently ignored by GitHub since the
  late-April 2026 Copilot platform tightening) to GraphQL
  `requestReviews.botIds`. The workflow now requires the `GH_TOKEN`
  repo secret to be a fine-grained PAT with `Pull requests: write`;
  the default `GITHUB_TOKEN` is no longer accepted for bot reviewer
  assignment.
- `bestSubjectMatch` excludes `Scope > Out:` tokens from the overlap
  haystack. Subjects that a spec explicitly declares as out-of-scope
  must not bias the closest-match selection (otherwise append-first
  could route a REQ onto a spec that has already disowned the subject).
- `classifyTriage` `removalHint` branch now mirrors the additive path
  and emits `MERGE` (with a removal-intent rationale) when a REQ matches
  multiple capability-keyed specs, rather than silently collapsing onto
  `capabilityMatches[0]` and dropping the cascade across the other
  matched specs.

## [1.8.8] - 2026-05-02

Strengthens `/qfai-sdd` so that, when specs already exist and a new
requirement arrives, the skill chooses the right granularity
(create / append / modify / remove / delete / split / merge / supersede)
through a deliberate Stage 1 Triage step rather than implicit
subject-existence checks. The classifier is biased to **append-first**:
default to UPDATE on an existing active spec; CREATE is reserved for
genuine scope deviations that introduce a new capability. Also
introduces the cross-AI rules master at `.agents/rules/` and the
branch-name version-pin guard, plus the distributed-surface
`schemaVersion` / internal-version-marker scrub.

### Removed (BREAKING)

- `prototyping.json` and `completion-certificate.json` no longer carry a
  `schemaVersion` field; validators no longer read it. Pre-1.8.8 artifacts
  must be regenerated.
- Validator error code prefix `QFAI-PROT2-NNN` collapsed to `QFAI-PROT-NNN`
  with renumbered slots (the schemaVersion gate is removed; remaining six
  codes are renumbered contiguously).
- Validator entry point `validatePrototypingEvidenceV3` renamed to
  `validatePrototypingEvidence`; the prior empty stub of the same name is
  removed. Test files renamed in lockstep.
- Internal QFAI spec IDs (spec-0010..) and internal version markers
  (v1.x, v2.0, v3.0) removed from `README.md`, CLI help, `report.md`
  output, validator messages, and `qfai init` templates under
  `assets/init/**`. The npm package version is the only canonical
  version surface.
- `packages/qfai/docs/MIGRATION-2.0.md` and `MIGRATION-1.8.4.md` removed.
- `packages/qfai/scripts/check-no-legacy-concepts.sh` removed.

### Added

- `packages/qfai/scripts/check-no-internal-version-leakage.sh` — CI guard
  that fails if QFAI-internal spec IDs, version markers, internal trace
  IDs, or `schemaVersion` fields appear in distributed surfaces (README,
  assets, dist).
- `/qfai-sdd` Stage 1 Triage: a mandatory step between preflight and
  Phase 0 (Contracts-first). Documented in
  `assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`
  and wired into the execution playbook and phase checklists.
- 8 first-class triage operations: CREATE, UPDATE:APPEND / MODIFY /
  REMOVE, DELETE, SPLIT, MERGE, SUPERSEDE. CREATE / DELETE / SPLIT /
  MERGE / SUPERSEDE / UPDATE:REMOVE require AskUserQuestion approval.
- Spec lifecycle `Status:` bullet on every `01_Spec.md`
  (`active | superseded | deprecated | removed`) with
  `Superseded-by:` and `Deprecated-at:` companions.
- New validator codes:
  - `QFAI-STATUS-001..006` — spec lifecycle status field validation
    (missing / invalid enum / superseded chain / deprecated date).
  - `QFAI-TRIAGE-001..005` — `## Triage` section structure on
    `09_delta.md` and `_policies/10_delta.md` (warning when missing,
    errors for missing columns / invalid Operation / invalid Sub-op /
    missing approval).
  - `QFAI-TRIAGE-006` — every CREATE row must cite a `CAP-NNNN` in the
    Rationale column AND that capability must already be registered in
    `_policies/03_Capabilities.md`.
- Core helpers `src/core/specSummary.ts` (`collectSpecSummaries`) and
  `src/core/sddTriage.ts` (`classifyTriage`, `renderTriageMarkdown`,
  `requiresApproval`, `bestSubjectMatch`). Internal helpers
  (`tokenize`, `overlapCount`, `topLevelOp`, `subOp`) are not part of
  the public API surface.
- Append-first principle and impact-cascade pattern documented across
  `assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`,
  `references/sdd-triage.md`, `references/sdd-execution-playbook.md`,
  `references/sdd-phase-checklists.md`, and
  `templates/specs/_policies/11_Slice-Policy.md`.
- Cross-AI rules master at `.agents/rules/`. Existing rules
  (`distributed-surface`, `root-additions-policy`, `temporary-files`)
  are migrated here from `.claude/rules/`; the original paths are kept
  as symlinks so existing references continue to resolve.
- New rule `version-discipline.md` (master at `.agents/rules/`):
  branch-name version pin and the prohibition on AI-driven
  `package.json#version` bumps / `chore(release):` commits. Surfaced
  to every AI tool via `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`,
  and `.codex/README.md`.
- Surface test `tests/integration/agentsRulesSurface.test.ts` verifying
  the master/symlink layout and entrypoint references.
- Automated guard `packages/qfai/scripts/check-branch-version-pin.sh`
  enforcing the version-discipline rule: extracts the SemVer from the
  current branch name and fails if it disagrees with
  `packages/qfai/package.json#version`. Wired into the CI lint job
  (alongside the existing distributed-surface leakage guard) and
  exposed as `pnpm --filter qfai run lint:branch-version` for local
  use. `VERSION_PIN_SKIP=1` can override for coordinated release PRs.
- Test coverage `tests/scripts/checkBranchVersionPin.test.ts`
  (8 cases: matching SemVer, suffix tolerance, mismatch failure,
  no-SemVer skip on `main`/`chore/*`, override env, PR-context
  `GITHUB_HEAD_REF` precedence).
- Templates updated:
  `templates/specs/spec/01_Spec.md` declares `Status: active`;
  `templates/specs/spec/09_delta.md` and
  `templates/specs/_policies/10_delta.md` ship a `## Triage` skeleton;
  `templates/specs/_policies/11_Slice-Policy.md` rewritten to the
  8-operation table with the APPEND-vs-CREATE algorithm and
  size-threshold rules.
- Test coverage: `tests/core/parseSpecStatus.test.ts`,
  `tests/core/specSummary.test.ts`, `tests/core/sddTriage.test.ts`,
  `tests/validators/specPack/statusValidation.test.ts`,
  `tests/validators/specPack/triageSection.test.ts`,
  `tests/integration/sddTriageSection.test.ts`,
  `tests/integration/sddSkillTriagePhase.test.ts`.

### Changed

- CI workflow runs the new leakage guard in both the lint job (assets +
  README) and the build job (post-build, including dist).

### Changed (BREAKING)

- Every `01_Spec.md` MUST declare a valid `Status:` bullet. Specs
  without a Status now fail validation with `QFAI-STATUS-001`.
  Operational specs in this repository are migrated to
  `Status: active`.
- `_policies/11_Slice-Policy.md` (template + operational) is rewritten
  around the 8-operation triage model. The legacy 3-row table
  (CREATE / UPDATE / DELETE only) is removed.
- `validateStatusInSpecs` is renumbered from `QFAI-STATUS-001` to
  `QFAI-STATUSLEAK-001` to free the `QFAI-STATUS-NNN` namespace for
  the new spec lifecycle validator. The validator no longer matches
  the bare `status:` token because the new `Status:` bullet is a
  legitimate definition-level field; other operational fields
  (`progress`, `risk_state`, `review_gate`, `last_updated_at`,
  `release_candidate`) continue to fire `QFAI-STATUSLEAK-001`.
- `assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md` rewritten as
  a Stage 0 / Stage 1 / Phase 0..4 surface (346 -> 238 lines). Detailed
  procedure pulled out into `references/sdd-triage.md`,
  `references/sdd-execution-playbook.md`, and
  `references/sdd-phase-checklists.md`.
- `classifyTriage` is biased to APPEND-first. When a REQ's capability
  does not match any active spec exactly, the classifier falls back to
  UPDATE:APPEND on the spec whose title / scope / capability shares the
  most subject tokens, upgrading to SPLIT if the closest spec exceeds
  AC/TC thresholds. CREATE is only emitted when there is **zero** token
  overlap with any active spec.
- The runtime slice policy (template + operational) leads with a
  "Principle (read first)" block and the APPEND-vs-CREATE algorithm
  has an explicit subject-overlap fallback step plus a CREATE step
  that requires citing a registered `CAP-NNNN`.

## [1.8.7] - 2026-05-02

### Added

- `qfai prototyping iterate --cycle <n>` driver for the single-thread design evolution loop. Exit codes 0 / 64 / 65 / 2 (continue / convergence / max-iterations / input error).
- `core/prototyping/iteration.ts` — `Iteration`, `OrdinalScore`, `PivotDirective`, `shouldStop()`, `MAX_ITERATIONS = 15`, path helpers.
- `core/prototyping/evaluatorReview.ts` — 4-axis ordinal review (200–500 word prose critique, anti-slop cap on `originality`).
- `core/validators/prototypingEvidence.ts` — schema validator with `QFAI-PROT-NNN` error codes (collapsed and renamed in 1.8.8).
- `qfai-prototyping/references/{iteration-loop,generator-prompt,reviewer-prompt,handoff}.md` references.
- `packages/qfai/scripts/check-no-legacy-concepts.sh` — CI sanity grep for re-introduction of legacy concepts.
- A migration guide was published with this release and removed again in 1.8.8.
- `tests/e2e/prototypingE2E.test.ts` — end-to-end iter-00..iter-03 cycle (renamed in 1.8.8).

### Changed (BREAKING)

- `prototyping.json` schema rewritten: `iterations[]` replaces the prior `rounds[]` / `polishCycles[]` / `bestOfHistory` / `breakthrough` / `mode` / `fullHarness` shape. Old runs fail to load.
- `completion-certificate.json` schema rewritten (`polishCycleCount` removed).
- `/qfai-prototyping` SKILL.md rewritten as the single-thread loop with global anti-slop pattern list.
- `/qfai-discussion`, `/qfai-sdd`, `/qfai-implement`, `/qfai-verify` SKILL.md aligned with the new contract surface.
- `agent-routing.yml`: prototyping routing rewritten as 3-phase loop (seed / loop / handoff); `review_profile: full-harness` removed.
- `core/observability/{guidance,types}.ts`: `mode: "full-harness"` literal replaced by `mode: "single-thread-loop"`.

### Removed (BREAKING)

- Legacy prototyping mode tier (`low-cost` / `standard` / `full-harness`) and the entire `core/harness/` subsystem.
- Legacy funnel: `r5/r3/r2/r1` rounds, harvest, absorption, reimplementation, branch planner, plateau detector, candidate concepts, prior evaluator-review schema.
- Legacy design contracts: `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `absorption-policy.yaml`, `selected-direction.yaml`.
- Legacy discussion sidecars: `uiux/33_exploration_rubric.md`, `uiux/34_evaluator_calibration.md`.
- Legacy CLI: `qfai prototyping round-start` / `round-harvest` / `round-narrow` / `round-absorb` / `round-reimplement-verify`; `--mode`, `--round`, `--candidates`, `--survivors`.
- Legacy `bestOfHistory` acceptance rule and `100/100 every axis` completion gate.
- `prototype-handoff.yaml` `mustPreserve` / `mayAdapt` / `mustNotCopy` triple (the artifact itself is the SSOT).
- `core/evidence/{bundleWriter,specCoverage,uiObservation,fakeUiDetection,actionCoverage,uiFidelityBuilder,runtimeObservation,runtimeGateBuilder,evidenceHandler,fsEvidenceWriter,captureStatus}.ts`.
- `core/validators/prototyping/{modeInvariant,executionPlan,lighthouseGate,screenshotDir,iterationGate,designSystemThreshold}.ts`.
- ~3,000+ lines of legacy code and ~25 legacy-coupled test files.

## [1.8.6] - 2026-04-30

Simplifies the design workflow contracts as a deliberate breaking
change, removing compatibility aliases that made the prototyping and
SDD boundaries harder to reason about.

### Added

- **Design readiness phase split**: explicit SDD and prototyping design
  contract readiness validators replace the previous stage option API.
- **Skill size guardrail**: `qfai-prototyping/SKILL.md` now has an asset
  test that keeps the orchestration file concise enough for agent use.

### Changed

- **Canonical design workflow only**: downstream design execution now
  relies on normalized contracts and rejects retired selected-direction
  aliases instead of preserving compatibility paths.
- **Prototyping skill compression**: large workflow details are moved
  into existing references while preserving mandatory execution intent.

### Removed

- **Legacy design contract aliases**: retired design contract references
  and selected-direction alias handling were removed from shipped
  assistant assets and validators.

## [1.8.5] - 2026-04-28

Hardens prototyping full-harness readiness so preflight, doctor, and
shipped skill assets agree on delegation roles, launcher availability,
and distributed agent metadata before runtime delegation starts.

### Added

- **Prototyping readiness policy + launcher probing**: centralizes the
  required full-harness roles / supported wrapper integrations and adds
  bounded `playwright-cli` launcher resolution across project wrapper,
  `node_modules/.bin`, `PATH`, and `npx --no-install`.
- **Structured Playwright execution metadata**: command plans now carry
  logical `toolId`, `args`, and `stdoutPath` fields alongside the
  rendered command so evaluators can execute capture steps without
  shell-redirection assumptions.

### Changed

- **Doctor / preflight / skill alignment**: `qfai doctor --profile
prototyping`, `qfai prototyping preflight`, validators, and shipped
  `qfai-prototyping` assets now diagnose active wrapper integrations,
  literal required-input paths, launcher readiness, and runtime
  hard-stop expectations from the same policy.
- **Distributed agent asset compatibility**: shipped agent cards drop
  undistributed `.instruction/...` required inputs and align shared
  metadata/frontmatter across Claude Code, GitHub Copilot, and Codex.
- **Full-harness follow-up hardening**: target URL forwarding,
  certificate loading, invalid `--format` rejection, Linux launcher
  cleanup, and integration coverage were tightened around prototyping
  flows.

### Removed

- なし

## [1.8.4] - 2026-04-27

Structural refactor of the prototyping skill driven by the v1.8.3
retrospective report (RR §8). Closes the dangling-ID class of bug
(RR §8.3), the dual-SoT class (RR §8.2), the dead-code-validator class
(RR §8.6), and the install-site-assumption class (RR §8.1) by adding
preventive mechanisms at every layer of the stack.

### Added

- **Single completion artifact**:
  `.qfai/evidence/prototyping/completion-certificate.json`. Carries
  SHA-256 digests of every evidence file, runId, validate/verify run
  refs, reviewer signoff, iteration / polish counts, and resolved spec
  coverage. Generated only when every gate passes; tampering is
  detected by digest comparison. Closes RR §8.4 (completion semantics
  multi-source).
- **New CLI subcommands**:
- `qfai prototyping certify` — generates the certificate after gates
  pass (validate.json error count = 0, verify.json status = PASS,
  reviewer gate result = PASS, fullHarness.runId present).
- `qfai prototyping certify --check` — recomputes evidence digests
  and verifies them against the certificate; non-zero exit on drift.
- `qfai prototyping show-spec` — prints the resolved primary
  prototyping spec (config or marker-scan), eliminating the
  SKILL.md hardcode.
- **Spec resolution helper** `resolvePrimaryPrototypingSpec`: resolves
  via (1) explicit `qfai.config.yaml: prototyping.primarySpecId`,
  (2) marker scan for `surface_type: ui-bearing`, (3) undefined.
  Closes RR §8.1 (primary-spec hardcode in shipped templates).
- **Validator wiring registry** + **CI-enforced meta-test**
  (`tests/unit/validators-are-wired.test.ts`): walks the symbol graph
  from `validate.ts` and asserts every public Issue[]-returning
  validator under `validators/prototyping/` is reachable from
  `runPrototypingValidators`. The Phase 2 meta-test surfaced four
  pre-existing dead validators (`validateScreenshotDir`,
  `validateLighthouseGate`, `validateIterationGate`,
  `validateDesignSystemThreshold`); Phase 3 wired them via
  `validateStateGate`. The PENDING_WIRING set is now empty and locked
  by sentinel: NEW dead-code validators cannot enter the codebase
  silently. Closes RR §8.6 (validators implemented but never invoked).
- **ID linkage integrity validators** (Phase 7):
- `validateConfigReferenceIntegrity` — qfai.config.yaml values
  resolve to real filesystem entities (primarySpecId, paths.\*,
  calibration.packPath).
- `validatePrototypingArtifactRefIntegrity` — every xxxRef string in
  prototyping.json / review-bundle.json / breakthrough.json points
  to an existing file.
- `validateSpecIdLinkage` — spec IDs in prototyping.json.specs[],
  review-bundle.json.spec, candidate dirs, and polish cycle
  iteration dirs reference entities that exist.
- **Package self-containment lint** (`npm run lint:shipping`,
  invoked by `npm test`): detects spec-NNNN, AC|TC|REQ-NNNN-NNNN,
  and `.qfai/specs/spec-NNNN/` literals in shipped runtime data
  (yaml / yml / json / ts under assets/init/) and source code.
  Markdown documentation and YAML/TS comments are exempt by design
  because they don't ship as runtime data. Inline pragma
  `qfai-shipping:allow reason="<concrete reason>"` for explicit
  opt-out. Closes RR §8.1 root-cause class structurally.
- **Filesystem-first report aggregation**: report.md round artifact
  counts (absorptionPlans, reimplementations, harvestArtifacts,
  narrowDecisions) are now sourced from
  `.qfai/evidence/prototyping/rounds/<rN>/*.json` directly. The
  curated index (`prototyping.json.rounds[]`) is no longer
  authoritative for these counts; index/filesystem drift is surfaced
  as a warning. Closes RR §8.2 (`absorption plans: 0` while files
  exist on disk).
- **Internal `docs/design-principles.md`** (P1–P6, contributor
  reference, not shipped via init).
- **17 new error codes** (each with description, severity, and
  suggested action):
- `QFAI-PROT-310` — executionPlan absent in full-harness
- `QFAI-PROT-311` — delegationMap role violation
- `QFAI-PROT-331` — fullHarness.scoringTrace[].screenshotDir missing
- `QFAI-PROT-332` — Lighthouse report missing in full-harness + web
- `QFAI-PROT-333` — iteration 1 cannot be marked converged
- `QFAI-PROT-334` — designSystemCompliance below 0.75 threshold
- `QFAI-PROT-335` — completion certificate absent while completion claimed
- `QFAI-PROT-336` — completion certificate digest mismatch
- `QFAI-CFG-LINK-001` — primarySpecId points to missing spec dir
- `QFAI-CFG-LINK-002` — paths.\* points to missing directory (warning)
- `QFAI-CFG-LINK-003` — calibration.packPath missing
- `QFAI-PROT-REF-001` — dangling artifact ref in prototyping.json /
  review-bundle.json / breakthrough.json
- `QFAI-PROT-LINK-001` — prototyping.json.specs[].specId references
  missing spec
- `QFAI-PROT-LINK-002` — review-bundle.json.spec references
  missing spec
- `QFAI-PROT-LINK-003` — candidate artifact dir missing
- `QFAI-PROT-LINK-004` — polish cycle iteration dir missing
- **100+ new test cases** across 13 new test files (state gate,
  certificate, ID linkage, lint-shipping, RR-8-2 regression, etc.).
  Final test suite: 203 test files / 1557 cases, all green.

### Changed

- `report.md` aggregator scans the filesystem directly for round
  artifacts; `prototyping.json.rounds[]` is no longer authoritative
  for harvest / narrowDecision / absorptionPlan / reimplementation
  counts.
- `executionPlan` and `delegationMap` validators are now wired into
  `runPrototypingValidators` (via `validateStateGate`) and emit
  standard `Issue[]` with codes `QFAI-PROT-310 / 311`.
- `screenshotDir`, `lighthouseGate`, `iterationGate`, and
  `designSystemThreshold` validators are now wired into
  `runPrototypingValidators` (via `validateStateGate`).
- `buildReviewBundle` and `buildRoundReviewBundle` require a
  `primarySpecId` parameter; `review-bundle.json.spec` is the
  resolved spec ID, not a hardcoded literal.
- `ReviewBundle.spec` and `RoundReviewBundle.spec` types widened from
  `"0017"` literal to `string`. Reader (`readRoundReviewBundleFile`)
  accepts any non-empty string.
- SKILL.md and `references/{evidence-requirements,reviewer-gate}.md`
  no longer hardcode a specific spec id. The "primary SSOT" entry now
  instructs the consumer to run `qfai prototyping show-spec` to
  discover the resolved path.
- `vitest.workspace.ts` adds a `scripts` project for tests/scripts/.

### Removed (BREAKING)

- **BREAKING**: legacy custom-Issue functions and types removed.
  Callers MUST use the `*Issues` adapters that return standard
  `Issue[]`. Removed:
- `validateExecutionPlan` / `ExecutionPlanIssue` →
  `validateExecutionPlanIssues`
- `validateDelegationMap` / `DelegationViolationIssue` →
  `validateDelegationMapIssues`
- `validateScreenshotDir` / `ScreenshotDirIssue` →
  `validateScreenshotDirIssues`
- `validateLighthouseGate` / `LighthouseGateIssue` →
  `validateLighthouseGateIssues`
- `validateIterationGate` / `IterationGateIssue` →
  `validateIterationGateIssues`
- `validateDesignSystemThreshold` /
  `DesignSystemThresholdIssue` →
  `validateDesignSystemThresholdIssues`
- Removed `tests/integration/prototypingSkillV1716Integration.test.ts`
  (redundant after absorption — every TC is now unit-tested
  in dedicated `*Issues` adapter test files).

### Compatibility notes (severity escalation timeline)

The new ID-linkage validators ship at **warning** severity in v1.8.4
to give existing user repos a one-release transition window:

- `QFAI-PROT-LINK-001..004` (spec ID linkage in prototyping.json
  artifacts): warning. Escalates to error in a future release (TBD).
- `QFAI-PROT-REF-001` (dangling artifact ref): warning. Escalates
  to error in a future release (TBD).
- `QFAI-CFG-LINK-001` / `QFAI-CFG-LINK-003` (config-time
  primarySpecId / calibration packPath dangling): error from v1.8.4
  (config typos benefit from immediate signal).
- `QFAI-CFG-LINK-002` (paths.\* directory absent): warning (init-time
  lazy creation rationale).

`qfai validate --profile prototyping --fail-on error` therefore PASSes
on v1.8.3 → v1.8.4 upgrade even when prototyping.json carries
absorbed-spec history. See the corresponding CHANGELOG entry.
for the recommended cleanup path.

### Deferred to a follow-up release

- Full V1 lifecycle removal (`iterations[]` schema, `cycle*` path
  helpers, V1 `buildReviewBundle` / `writeReviewBundles`,
  `prototyping.json.completionCertificate` block). The structural
  fixes that drove the v1.8.4 PR (RR §8.x) are already closed by the
  Phase 1–9 commits; V1 cleanup is a separate refactor that does not
  block the release.

## [1.8.3] - 2026-04-26

### Added

- prototyping V2 lifecycle (`rounds[]` / `polishCycles[]` / `completionCertificate` / `allReviewerAxesPerfect100`); V1 (`iterations[]`) lifecycle remains valid for existing packs.
- `qfai init` ships `.github/workflows/qfai-validate.yml` for downstream CI (`npx qfai validate --profile full --fail-on error`, Node 20 / npm). Pinned-allow-list pack guard ensures the workflow file always ships.
- `QFAI-TEST-001` test-todo stub validator: detects `it.todo` / `test.todo` / `describe.todo` in files matched by `validation.traceability.testFileGlobs`. Configurable via `validation.testStrategy.forbidTestTodoStubs` (default: true).
- `V2` round-funnel and per-candidate evidence validation in `validateV2Lifecycle`: enforces `r5 → r3 → r2 → r1` order, per-round candidate counts (5/3/2/1), unique candidateIds within a round, and the presence/shape of `screenEvidenceByCandidate` / `evaluatorReviewRefsByCandidate`.
- `maxCycles` vs `maxIterations` conflict detection in mode invariant validator.
- `round-absorb` and `round-start` (absorption rounds) now require `--candidates` / `--survivors` to match the prior `narrow-decision.json`.

### Changed

- spec-0012 absorbs the former spec-0017 (Playwright CLI harness) and spec-0018 (round/candidate/absorption harness) registries (REQ / AC / BR / DEC / TC). The standalone `spec-0017/` and `spec-0018/` directories are deleted.
- prototyping skill / agent terminology unified to `round` / `absorption` (qfai-prototyping, qfai-sdd, qfai-implement, qfai-verify, qfai-discussion, qfai-atdd, qfai-configure).
- `CandidateId` is now a nominal brand type (was the template-literal `c${number}` which over-accepted `c0` / `c-1` / `c1.5`); both `parseCandidateIds` and `isCandidateId` mint via `CANDIDATE_ID_PATTERN`.
- V1 `PrototypingEvidenceRecord` field renamed `cycles` → `iterations` to match `validatePrototypingEvidence` and the on-disk `.qfai/evidence/prototyping/iterations/<n>/` URL convention.
- CI profile guard now allows `tdd` alongside `full` / `verify` (was `full` / `verify` only); narrow phase profiles (discussion / sdd / prototyping / atdd) are still rejected in CI.
- `QFAI-TEST-001` issues now set `issue.file` to the bare repo path with the line number in `issue.loc.line` (was `path:line`); rule code follows the `QFAI-<RULE-###>` waiver-resolver convention.

### Removed

- **BREAKING**: library exports `createPlaywrightRenderAdapter` and `createPlaywrightBrowserQaProvider` are no longer re-exported from `qfai` (Node Playwright runtime retired in spec-0017).
  - migration: use the Playwright CLI path — `qfai prototyping round-start ...` for the supported entry point, or build command plans via `buildPlaywrightCliCommandPlan` (still exported) and run them through your own Playwright CLI invocation.
- Active `spec-0017/` and `spec-0018/` directories (absorbed into `spec-0012`).

### Fixed

- Numerous late-review integrity findings: `verify-pack` `.github` allow-list (now requires the workflow file as a regular file), V2 evidence record now accepts `runtimeGate` / `uiFidelity` / `completionCertificate` so `writePrototypingEvidenceRecordV2({ completionClaimed: true, … })` cannot produce a self-contradicting record, V1-vs-validator `cycles`/`iterations` mismatch, prettier and markdownlint drift across docs / spec packs, plateau detector test fixtures aligned to the 0..100 scoring scale, downstream `qfai-validate.yml` Node version aligned with `engines: ">=20.0.0"`.

## [1.8.2] - 2026-04-23

### Added

- なし

### Changed

- package root export (`qfai`) で full-harness helper の互換公開を維持
- restored: `loadHistory`, `appendIteration`, `computeTerminationReason`
- restored: `validateReviewer`, `resolveCommitSha`, `REVIEWER_PLACEHOLDERS`
- restored: `FullHarnessHistory`, `MeasurementInput` などの harness type export

### Removed

- **BREAKING**: experimental full-harness runtime entrypoints `runFullHarness`, `computeWeightedTotal`, `determineDecision` are no longer exported from the package root
- migration: runtime execution is now skill/workflow driven; package consumers should use persisted evidence plus validator/report APIs instead of invoking the removed runtime helpers directly

## [1.8.0] - 2026-03-29

### Added

- skills: Web Research Enhancement skill template
- 8-stage standard research pipeline (search, rank, fetch, extract, sanitize, cache, verify, cite)
- MCP integration templates for Brave Search, Firecrawl, Playwright (3 agent formats each)
- Content sanitization layer (control chars, aria-hidden, display:none removal)
- Domain/URL allowlist with default-deny enforcement
- Research session log schema with secret exclusion
- Cache strategy (hash(URL+etag) key, 24h default TTL)
- Evaluation metrics (citation precision, coverage, freshness, security hygiene)
- HITL risk-based review gates
- specs: SDD artifacts (Web Research Enhancement, CAP-0034)
- specs: TDD execution ledger (28 items, all done)
- discussion: v1.8.0 Web Research Enhancement discussion pack (`discussion-20260328212829687`)
- tests: 28 integration tests for web-research skill (pipeline, security, skill, observability, evaluation)

## [1.7.15] - 2026-04-08

### Added

- Full-harness runtime truthfulization: measurement-driven iteration engine replaces fake planner/generator/evaluator loop
- Trend scan canonicalization: `04_Sources.md#Trend Scan` is the sole canonical location; `uiux/20_trend_scan.md` removed
- Root/init SSOT unification: `scripts/sync-init-to-root.mjs` ensures `packages/qfai/assets/init/` is the single source of truth
- Evidence schema v2: `fullHarness` block requires calibrationRef, L1/L2 panel scores, commitSha, limitations, reviewer logs
- New harness modules: `measurement.ts`, `panelScore.ts`, `history.ts`, `reviewerIdentity.ts`, `gitRevision.ts`
- Validator hardening: reviewer placeholder rejection, weightedTotal = min(L1, L2) enforcement, commitSha/limitations mandatory
- Calibration wiring: `qfai.config.yaml > prototyping.calibration` is the sole runtime parameter source for full-harness

### Changed

- **BREAKING**: full-harness is now measurement-driven; 1 CLI invocation = 1 iteration measurement, multiple iterations require real code changes between runs
- **BREAKING**: `--reviewer <id>` is mandatory for full-harness mode; `config.prototyping.execution.reviewer` removed
- **BREAKING**: `weightedTotal = min(l1.total, l2.total)` replaces generic weighted average
- **BREAKING**: `fullHarness` evidence schema v2 with calibrationRef, iterations array, scoringTrace, reviewerLogs, limitations
- `04_Sources.md` template restructured: Source Registry, Trend Scan (4 canonical categories), Competitive Reference Registry, Traceability
- CLI: added `--change-summary` and `--limitation` flags for full-harness mode
- Prototyping SKILL.md: full-harness described as measurement-driven iterative workflow
- Discussion README: `04_Sources.md` responsibilities expanded to include trend scan and competitive registry
- Evidence README: fullHarness schema v2 field table added, uiFidelity observation-only policy documented
- Review profiles and agent routing synced between root and init assets

### Removed

- Fake planner/generator/evaluator loop (`planner.ts`, `generator.ts`, `evaluator.ts`, `loop.ts`)
- `uiux/20_trend_scan.md` template and all references
- `config.prototyping.execution.reviewer` config option
- `resolvedReviewer ?? "qfai"` placeholder reviewer logic
- uiFidelity expected→observed synthetic fallback
- Legacy fullHarness schema v1 compatibility

## [1.7.14] - 2026-04-07

### Added

- Full-harness iteration protocol: 4-step cycle (Evaluate→Identify→Fix→Re-evaluate), MIN_ITERATIONS=5, 4 termination conditions (converged/max-iterations/plateau/manual-stop)
- Independent evaluator panel: 3-layer structure (product-surface-reviewer L1, product-experience-architect L2, qa-gatekeeper L3) with background mode invocation
- Score scope separation: discussion 3-layer scores ≠ prototyping scoringTrace, copy prohibition
- Evaluation rigor rules: 3-tier rubric (existence_gate/quality_criteria/excellence_criteria), L1/L2/L1-manual finding classification
- Asset acquisition strategy: free assets MUST, emoji prohibition (U+1F000–U+1FAFF, U+2600–U+27BF), placeholder prohibition, WCAG 2.1 AA checklist
- Reviewer gate strengthening: 6 full-harness-specific checks, Limitations section obligation
- Full-harness validator rules QFAI-PROT-290~294: iteration integrity validators (single-pass convergence, scoringTrace count, terminationReason cross-check, maxIterations cap, score progression)
- Full-harness review profile in review-profiles.yml (always_required: completion-reviewer, product-surface-reviewer, qa-gatekeeper)
- product-experience-architect added to agent-routing.yml prototyping evidence phase
- Semantic invariant SSOT: validateRecommendationSemantics() shared across parser/resolver/execution/CLI/validator/preflight
- Canonical strategy decision vocabulary (template, component-library, design-system, native-pattern, bespoke, none)

### Changed

- PrototypingSurface canonical names: web-ui/mobile-ui/desktop-ui → web/mobile/desktop, cli/mixed added
- IssueCategory simplified: "compatibility" removed, "canonical" | "change" only
- prototyping.yaml schema: namespaced-only (`prototyping:` block mandatory), legacy top-level keys hard-rejected
- Classification separation: isUiBearingSurface() split into isDiscussionUiBearingPrototypingSurface() + requiresVisualBrowserEvidenceSurface()
- Surface inference: null default (was "non-ui"), explicit surface specification promoted
- fullHarness schema: reviewerSignoff boolean→object, scoringTrace boolean→array, terminationReason +plateau/manual-stop
- Validator taxonomy: fullHarness reserved range 281-283 → 281-294, TAXONOMY_RANGE_MAX 283 → 294
- "selected direction" → "selected anchor" wording normalization

### Removed

- Legacy validator infrastructure: legacy/ directory, legacyStatusDir.ts, migration/formatDetection.ts, uix/rollout.ts
- IssueCategory "compatibility" from union type
- Legacy top-level prototyping.yaml keys support (QFAI-PROT-231/232 warnings removed)
- Compatibility test files (ddpCompatibility, uixCompatibility)

### Fixed

- Strict classification validation: semantic contradictions in classification block detected as hard errors
- Execution hard gates: invalid classification/recommendation immediately rejected
- readValidatedClassification() enforced in execution path (readClassificationBlock non-strict prohibited)

## [1.7.13] - 2026-04-04

### Added

- CLI flags for prototyping production path: --target-url, --browser-provider, --render-provider, --reviewer
- Built-in Playwright render adapter and browser QA provider (optionalDependencies)
- uiFidelity validator error codes: QFAI-PROT-270 (absent), QFAI-PROT-271 (skeleton rejection), QFAI-PROT-272 (missing fields)
- prototyping.execution config section with reviewer field and priority cascade (CLI > config > env)
- Production path test suites: CLI flag parsing, obligation matrix, uiFidelity validator

### Changed

- uiFidelity.mode=skeleton rejected in standard/full-harness for UI-bearing surfaces (truthfulization)
- Calibration error codes relocated: QFAI-PROT-271/272 → QFAI-PROT-265/266
- Review assets (scoring/comparison/strategy-review) aligned to canonical vocabulary and responsibility split
- comparison-review split into Comparison Quality (30_option_comparison) + Selected Direction Quality (31_selected_anchor_screen)
- SKILL.md: "not a public CLI command" → "auxiliary generate-side command"

### Fixed

- SSOT contradictions across README, SKILL.md, steering, product note
- Stale filenames in ui-definition-protocol.md (30_comparison→30_option_comparison, etc.)
- Stale filenames in canonical test suite (integration/e2e/core/assets)
- exactOptionalPropertyTypes issues in prototyping execution pipeline
- 23_design_eval_aggregate.md total_score_formula formatting

## [1.7.12] - 2026-04-02

### Added

- 3-layer 評価テンプレート（invariant/trend-derived/product-specific/aggregate/dynamic-overrides）
- Design taste interview テンプレート（11_design_taste_interview.md）
- browserQa minimal truthful runner
- テスト並列実行: Vitest workspace による 5 スライス（core/validators/integration/e2e/cli）
- CI: Node 20 単一 + 5 スライス並列マトリクスに移行
- pr-fix skill にバージョン整合チェックを追加

### Changed

- 評価軸テンプレートを 3-layer 正規名にリネーム（20-23*eval_axis*\* → 20-23_design_eval\_\*）
- SKILL.md: HTML/CSS mock をオプション化
- US-0012-0008..0010 テストを prototyping SKILL.md に切り替え

### Removed

- 31_anchor.md, 60_critique_loop.md（レガシーテンプレート）

### Fixed

- delta/AC の migration warning → error 整合
- source_translation バリデーションをバレット行のみに制限
- threeLayer relPath 表記を実際のファイル範囲（2[0-3]\_design_eval\_\*）に修正
- prototypingWordingAlignment テストの silent return → throw Error
- renderEvidenceIntegration テストの truncated expected string 補完

## [1.7.11] - 2026-03-31

### Added

- npm publish dry-run CI チェック（`ci:build-verify` に統合、警告=エラー）
- E2E テスト 8 ファイル + Integration テスト 3 ファイル（計 263 テスト）
- `detectAspirationalClaims()`: SKILL.md の未実装機能主張を検出（spec-0006 TDD-0015）
- `checkRoutingConsistency()`: フルハーネスルーティング一貫性検証（spec-0006 TDD-0016）
- ATDD カバレッジ: 12 E2E US + 52 Integration TC（QFAI-ATDD-111/112 解消）
- TDDLIST バックフィル: 9 spec に 43 エントリ追加

### Fixed

- bin パス auto-correction 警告修正（`./dist` → `dist`）
- uixDetection phase1 ratchet テストの時刻依存バグ修正

## [1.7.10] - 2026-03-31

### Added

- Spec Auto-Discovery Protocol: spec引数なしで4ソース統合差分検出により作業対象specを自動特定
- Traceability Integrity Validator: QFAI-TRACE-001 (error) / QFAI-TRACE-002 (warning)
- `baseBranch` 設定: qfai.config.yaml で比較対象ブランチを指定可能
- discussion .gitignore: 生成されたdiscussion packをデフォルトでGit管理外に（init標準仕様）

### Changed

- SKILL.md (prototyping/implement): Spec Auto-Discovery Protocol セクション追加
- specDiffDetector/traceabilityIntegrity: execSync → execFileSync でコマンドインジェクション対策

## [1.7.9] - 2026-03-30

### Changed

- browserQa: phase status vocabulary unified to `captured | skipped | failed`
- detection: consolidated surface type detection to shared module with table format, Mermaid flow, screen contract support
- validators: wired `validateFullHarnessSkill` and `validatePrototypingSkillContent` into production validate path
- prototyping SKILL.md: removed banned runtime-heavy phrases, added mode sections (Low-cost/Standard/Full-harness), non-UI n/a documentation, static-first language
- prototyping mode model: full-harness is documented as an explicit mode within `/qfai-prototyping`, not as a separate skill entrypoint

## [1.7.8] - 2026-03-30

### Added

- validators/uix: taste interview validator (`UIX-VAL-TASTE-MISSING` / `INCOMPLETE`) — 9 section completeness check
- validators/uix: trend scan validator (`UIX-VAL-TREND-SCAN-MISSING` / `FRESHNESS-MISSING`) — freshness metadata enforcement
- validators/uix: 3-layer evaluation model validator (`UIX-VAL-3LAYER-LEGACY-FORMAT` / `MIXED-FORMAT`) — invariant/trend-derived/product-specific enforcement with 4-axis migration warning
- validators/uix: scoring-ready schema validator (`UIX-VAL-DYNAMIC-AXIS-INCOMPLETE`) — 16 mandatory fields per axis + aggregate scoring rules
- validators/uix: strategy strong schema validator (`UIX-VAL-STRATEGY-WEAK-LEGACY` / `SELECTION-CONSTRAINT`) — 8-field schema with selection_required cardinality check
- validators/uix: screen contract schema validator (`UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE` / `DUPLICATE-ID` / `STATE-COVERAGE`) — 10-field multi-screen with mandatory state coverage
- detection: unified surface type detection module (`detectSurfaceType`) — single shared module replacing inline detection logic
- validators/skill: prototyping skill content validator — banned phrase scan, 3-mode headings, non-UI n/a path, static-first alignment
- validators/skill: full-harness skill validator — workflow loop detection, evidence/reviewer/calibration obligation checks
- uiux: render evidence capture module (`captureRenderEvidence`) — capture/skip/partial with alternative suggestions
- browserQa: smoke phase runner (`runSmokeQa`) — structured findings with selector/issue/severity/suggestion
- browserQa: visual phase runner (`runVisualQa`) — visual findings matching smoke structure
- review: UIX review template — 5 canonical review items (taste-reflection-quality, anti-preference-enforcement, trend-relevance-freshness, dynamic-axis-specificity, generic-fallback-persistence)
- validators/migration: format detection validator — version 1/2/3/unknown detection with structured upgrade guidance
- validators/docs: vocabulary scan validator — allowed/prohibited maturity term enforcement with contradiction detection
- validators/docs: convergence doc validator — required structure sections check
- validators/uix: taste reflection, anti-preference, non-UI over-fire regression, fixture coverage validators
- tests: 79 new tests across 21 test files covering 78 TDD items
- evidence: per-spec TDD implementation evidence

### Changed

- package: npm version を `1.7.8` に更新
- specs: 4 spec の TDD execution ledger を全項目 `done` に更新

### Notes

- v1.7.8 は v1.7.7 gap analysis に基づく Canonical Convergence correction release
- 20 gaps を 14 deliverables に統合し、4 capability groups (CAP-0034~0037) で実装
- Migration window: 4-axis → 3-layer および weak strategy → strong schema は v1.7.8 で warning、v1.8.0 で error
- Non-UI safety: 全 UI-bearing validator が non-ui surface type で zero fires を保証

## [1.7.7] - 2026-03-30

### Added

- specs: master design spec に基づく several specs の remediation alignment を追加
- evidence: v1.7.7 correction release 向けの SDD preflight / evidence 記録を追加

### Changed

- specs: spec の評価モデル記述を 3-layer canonical model に統一
- specs: spec の screen contract minimum を screen-level obligation に更新
- specs: spec の UI-bearing detection を `surface classification primary / content-signal fallback` に更新
- docs: root/package README の release context と tutorial/versioned headings を v1.7.7 に整合
- package: `packages/qfai` の npm version を `1.7.7` に更新
- steering: product steering / initiative policy の milestone と release posture を v1.7.7 に更新

### Fixed

- traceability: spec の AC-0026-0014 → TC 参照漏れを修正
- validate: review summary minimum schema (`QFAI-REVIEW-007`) と prototyping coverage matrix (`QFAI-PROT-111`) の即時 blocker を解消
- validate: spec decisions の `status:` 混入警告 (`QFAI-STATUS-001`) を解消

### Notes

- repo-wide `qfai validate --fail-on error` は既存の review/evidence/ATDD/TDD blocker により未通過
- v1.7.7 は v1.7.6 remediation/correction release として扱い、プロトタイピング前の仕様整合と version normalization を優先

## [1.7.6] - 2026-03-30

### Added

- critique: `CritiqueAdapter` with fail-open semantics, `GenericCommandProvider` (external process execution with AbortSignal), `EchoProvider`, `FileProvider`
- calibration: `CalibrationLoader` (YAML-based scoring alignment packs), `ScoringEngine` (accept/refine/pivot thresholds), `DisagreementHandler` (majority rule + tie-breaking), `PlateauDetector` (score delta + lookback window)
- harness: `HarnessLoop` (planner/generator/evaluator cycle, 5-15 iterations), `Planner`, `Generator`, `Evaluator` (weighted scoring + dimension floors + calibration baselines), evidence generation
- observability: `MetricsCollector` (JSON Lines per-iteration + aggregate), `MetricsWriter` (buffered sink with auto-flush), `ModeGuidance` (standard/premium recommendation), `DriftTracker`, `CapabilityProfiler`
- handoff: `HandoffWriter` (credential stripping + portable paths), `HandoffReader` (corruption detection + fresh-start fallback)
- detection: `DisplayDetector` (JSX-only heuristic), `StubDetector` (throw/TODO/empty patterns + partial stubs with lineRange)
- specs: SDD artifacts for through (5 capabilities × 10 files each)
- tests: 103 new tests across 22 test files covering 87 test cases

## [1.7.5] - 2026-03-29

### Added

- prototyping: `modeResolver` — obligation set resolver with exhaustiveness guard, exported via `core/prototyping` barrel ( Slice 1)
- evidence: `captureRenderEvidence` / `captureElement` / `captureViewportElement` — render evidence capture pipeline ( Slice 2, internal — not yet exported from package root)
- providers: `ProviderRegistry` with capability-method validation and duplicate-name guard; `BrowserProvider` type with optional stubs for interaction/visual/accessibility ( Slice 3, internal — not yet exported from package root)
- browserQa: `runBrowserQa` — phase-gated browser QA runner with tier-based phase selection and runtime tier validation ( Slice 4, internal — not yet exported from package root)
- tests: slice revert independence test proving Slice 2/3/4 have no import dependency on Slice 1

> **Note:** `modeResolver` is exported from the public API via `core/prototyping`. The evidence, providers, and browserQa modules are internal foundation code not yet exported from the `qfai` package root. Public re-export is planned for a future release once the APIs stabilise.

## [1.7.4] - 2026-03-29

### Added

- traceability: `..0027` の required `US-*` / `TC-*` を E2E・Integration traceability ledger に補完
- evidence: `/qfai-verify` 実行証跡 `verify-` を追加し、repo gate / validate / report の結果を記録

### Changed

- docs: `qfai-implement` / `qfai-verify` の README 説明を ledger-first / full-scan verify + evidence 運用に更新
- tdd: several specs の ledger 整合を更新
- specs: spec の BR/EX/TC 参照整合を補正

### Fixed

- prototyping: `failOpen` 有効時に Playwright 不在でも `renderEvidence` を `skipped` として記録
- validate: `QFAI-SKILLS-001`, `QFAI-REVIEW-004/005/007`, `QFAI-PROT-111`, `QFAI-ATDD-111/112`, `QFAI-DDP-014`, `QFAI-DDP-019` の blocker を解消
- steering: `product.md` の `v1.7.1` 状態表記を現況に更新

## [1.7.3] - 2026-03-29

### Added

- discussion: UIUX Authoring Foundation — structured `uiux/` sidecar artifact family for UI-bearing projects
- assets: 11 sidecar templates (strategy, eval axes, comparison, anchor, contracts, review bundle, critique loop)
- assets: SKILL.md UI-bearing detection with 5 surface categories and completion conditions
- assets: direct template replacements (03, 04, 14) with behavior-first focus and sidecar references
- assets: Batch A/B core template augmentation with UX-INTENT cross-references
- validators: `Screen Mock — Fallback (HTML+CSS)` heading support in htmlMockBlocks and discussionVisuals
- tests: 26 new tests for uiux sidecar templates, Fallback heading extraction, DDS state coverage

### Changed

- templates: 03_Story-Workshop.md primary focus shifted from HTML mock to Behavior Obligations
- templates: Screen Mock section demoted to secondary fallback (subordinate to Behavior Obligations)
- templates: DDS State Coverage references Behavior Obligations table as SSOT

### Fixed

- validators: redundant Unicode literal em dash in regex character classes (htmlMockBlocks, discussionVisuals)

## [1.7.2] - 2026-03-27

### Added

- validators: Design Audit validator (QFAI-AUD-001, QFAI-AUD-004, QFAI-AUD-020) — CTA hierarchy, token drift, duplicate-primary detection (CAP-0025)
- validators: Slop Guardrails validator (SLP-01..06) — declarative JSON-driven slop pattern detection (CAP-0025)
- config: `uiux.audit` section with `enabled`, `slopDetection`, `maxPrimaryCtas`, `maxRawTokenLiteralWarnings`, `maxDuplicateFindingsPerRule`
- config: 3-tier × 3-profile severity mapping (`mapSeverity`) and `deduplicateFindings` utility
- assets: `assets/validators/designSlopPatterns.json` for packaged build compatibility
- specs: SDD artifacts (Design Audit & Slop Guardrails, CAP-0025)
- discussion: v1.7.2 Design Audit & Slop Guardrails discussion pack (discussion-20260326072322818)
- tests: 34 new tests for design audit and slop guardrails validators

### Fixed

- build: slop patterns JSON now resolved via candidate-path fallback for packaged builds
- lint: formatted all markdown artifacts and fixed 10_delta.md table column mismatch

## [1.7.1] - 2026-03-26

### Added

- specs: SDD artifacts (Render Evidence Automation, CAP-0024)
- discussion: v1.7.1 Render Evidence Automation discussion pack (discussion-20260325144633348)

### Changed

- validators: layered ID / traceability validator の解釈改善
- specs: shared policy / steering の v1.7.1 状態表記更新

### Fixed

- validators: repo-wide validator blocker 解消（historical review/discussion, layered ID 誤検知, traceability 欠落）

## [1.7.0] - 2026-03-25

### Added

- validators: Discussion Design Hardening (QFAI-DDP-019..025) — DDS 存在・オプション比較・アンカースクリーン・競合リファレンス・CTA 階層・ステートカバレッジ・デザインアンチゴール検証（CAP-0023）
- validators: `isUiBearing()` artifact-based UI-bearing detection (DR-0042)
- templates: Design Direction Summary section in 03_Story-Workshop.md
- templates: Competitive Reference Registry in 04_Sources.md
- templates: Design Direction Decisions section in 14_Review-Request.md
- templates: Rejected Visual Directions section in 99_delta.md
- skills: UI-bearing Authoring Requirements section in qfai-discussion SKILL.md
- specs: SDD artifacts (Discussion Design Hardening, CAP-0023)
- discussion: v1.7.0 Discussion Design Hardening discussion pack (discussion-20260325120000000)
- tests: 34 new tests (25 unit + 9 integration) for DDH validators

## [1.6.5] - 2026-03-24

### Added

- validators: DDP validation (QFAI-DDP-001..018) — Design Direction Pack 必須フィールド・テーマ・CTA 階層・アンチゴール・テンプレート・コンフィグ検証（CAP-0019）
- validators: Navigation flow validation (QFAI-NAV-001..007) — Mermaid 遷移図構文・到達可能性・エラーリカバリー・実装整合（CAP-0020）
- validators: Render critique validation (QFAI-CRIT-001..010) — クリティークループプロセス・ビューポート批評・taskFidelity 検証（CAP-0021）
- validators: Design fidelity validation (QFAI-FID-001..011) — スコアカード 4/5 次元・閾値・warning→error 昇格（CAP-0022）
- specs:..0022 SDD artifacts (Design Direction, Navigation, Render Critique, Fidelity Scorecard)
- discussion: ChatGPT UI/UX analysis integrated discussion pack (discussion-20260324090005338)
- tests: 126 new tests (54 DDP + 21 NAV + 23 CRIT + 28 FID)
- policies: DR-0036..DR-0041, +7 glossary terms, +6 constraints
- config: `uiux` policy section (qualityProfile, requireResearchSummary, competitive_refs_min, warning_as_error_override)

### Changed

- codex: max_threads 1→20 for sub-agent parallelism
- templates: summary.json restored to placeholder enum with full 12-reviewer roster
- templates: 05_Contracts.md ER diagram reverted to neutral placeholders
- skills: inline HTML replaced with backtick-code in 6 SKILL.md files

## [1.6.4] - 2026-03-23

### Added

- codex: 39 `.codex/agents/*.toml` + `.codex/config.toml` — Codex サブエージェント TOML 実装（CAP-0018）
- specs: SDD artifacts (Codex sub-agent TOML support)
- discussion: discussion pack for Codex sub-agent implementation (v1.6.4)
- tests: 14 tests (12 TCs) for Codex agent TOML validation
- policies: DR-0027〜DR-0030 — Codex 向け設計決定記録（TOML 形式・39 スコープ・sandbox 分類・静的配置）

### Changed

- policies: CAP-0018 追加、用語・制約・意思決定記録の更新
- devDependencies: smol-toml 追加

## [1.6.3] - 2026-03-22

### Added

- init: `.github/instructions/` に Copilot レビューインストラクション（code-review, principles）を create-only で配布
- specs: SDD artifacts (Copilot review instructions distribution)
- discussion: discussion pack for

### Changed

- policies: CAP-0017 追加、用語・制約・意思決定記録の更新

## [1.6.2] - 2026-03-20

### Added

- skills: `qfai-implement` SKILL.md hardened — DR-ID/Evidence required columns, refactor verify command+result pair, exception error-level enforcement
- tests: phrase guardrail helper functions (`checkRequiredPhrases`/`checkForbiddenPhrases` in `phraseGuardrails.test.ts`)
- tests: negative tests for required/forbidden phrase detection with mutated content
- specs: SDD artifacts (discussion pack, spec pack, implementation plan, TDD ledger)

### Changed

- skills: `qfai-implement` Refactor phase now requires TDDSpecReviewer and TDDCodeQualityReviewer gates before `done`
- skills: TDD-ID example corrected from 3-digit to 4-digit format (TDD-0001)
- scripts: `verify-pack.mjs` Windows path normalization with `toPosix()` helper
- tests: CRLF-tolerant frontmatter regex in `wrapperParity.test.ts`
- tests: `skillRoster.test.ts` handoff regex tightened, test name accuracy improved
- tests: integration test type annotations changed from `string` to `string | undefined`
- specs: 10_Plan.md paths updated to full `packages/qfai/tests/` format
- specs: 05_Examples.md TDD-ID corrected to 4-digit format
- specs: 04_Business-Rules.md BR-0016-0002 updated with all 8 handoff transitions

## [1.6.1] - 2026-03-20

### Added

- validators: TDD list Phase 2 checks — TC coverage (TDDLIST_TC_NOT_COVERED), exception DR-ID (TDDLIST_EXCEPTION_MISSING_DR), test file existence (TDDLIST_TEST_FILE_MISSING), duplicate ID (TDDLIST_DUPLICATE_ID), invalid ID format (TDDLIST_INVALID_ID)
- report: TDD Coverage section per spec with unit/component coverage visualization
- report: Contract Coverage, SC Coverage, Hotspots promoted to top-level sections
- validators: discussion pack validation (QFAI-DPACK-001 through DPACK-005)
- helpers: shared `tddHelpers.ts` module with `isCoverageTargetLevel`, `splitTcRefs`, `resolveParentTcId`

### Changed

- validators: unknown Level values in 06_Test-Cases.md are conservatively included as coverage targets (avoids silent false negatives)
- validators: Level column fallback — when Level column is absent, all TCs are treated as coverage targets
- report: heading hierarchy flattened — SC Coverage, Hotspots, Duplicate SC IDs promoted from `###` to `##`
- validators: path traversal check uses `path.sep` for cross-platform correctness
- validators: `collectTestCaseIds` merges two separate I/O calls into one
- report: `collectTddCoverage` receives pre-scanned entries to avoid redundant directory scan
- specs: `_policies/07_Constraints.md` TC-22 updated from `fs.access` to `fs.promises.stat`

### Fixed

- parsers: `trimEdgePipes` now strips all consecutive edge pipes (`||`, `|||`) via regex
- helpers: `resolveParentTcId` no longer incorrectly strips parent-level TC IDs (e.g., `TC-0001` → `"TC"`)

## [1.6.0] - 2026-03-17

### Added

- skills: `/qfai-implement` — TDD micro-cycle (Red/Green/Refactor) を一括管理する統合実装スキルを追加
- validators: `tddList` — `test-list.md` の構造・ステータス・TC参照を検証する validator を追加
- specs: (CAP-0014) qfai-implement unification の SDD アーティファクトを追加
- assets: `spec-XXXX/tdd/test-list.md` テンプレートを init に追加

### Removed

- skills: `/qfai-tdd-red`, `/qfai-tdd-green`, `/qfai-tdd-refactor` を廃止（`/qfai-implement` に統合）

### Changed

- workflow: implementation stage の説明を `/qfai-implement` に統一
- integration: `.agents/.claude/.codex` の skill ラッパーを symlink に統一

## [1.5.7] - 2026-03-16

### Added

- specs: (CAP-0013) UI/UX 定義・レビュー基盤の validator 8系統を追加（QFAI-DT / QFAI-MOCK / QFAI-FLOW / QFAI-BPAP / QFAI-PLATFORM / QFAI-CONSISTENCY / QFAI-RESEARCH / QFAI-AGENT）
- cli: `--platform <web|windows|mobile-ios|mobile-android|cross-platform>` 引数を追加
- validators: Design Token 3層（primitive/semantic/component）検証を追加
- validators: HTML Mock の構造・参照・アクセシビリティ観点の検証を追加
- agents: UI/UX 専門エージェント定義と関連 steering ドキュメントを追加

### Changed

- validate: `qfai validate` の検証対象を UI/UX 領域へ拡張
- config: `qfai.config.yaml` に `uiux` 設定を追加

## [1.5.6] - 2026-03-15

### Added

- review: Devil's Advocate と Pattern Doubler をロースターに追加し、12-reviewer 運用を明確化

### Changed

- skills: 全レビュアーの FAIL 時に具体的代替案を必須化
- templates: discussion review テンプレートを 12-reviewer 前提に更新
- steering: review-agent enhancement を次期マイルストーンとして整理

## [1.5.5] - 2026-03-14

### Added

- specs: Spec Diff Protocol (SDP) の増分実行フローを定義し、差分実行の運用指針を明確化

### Changed

- skills: AskUserQuestion Protocol を MUST 運用として整理し、SSOT 手順を強化
- init/assets: skill integration の symlink 構成説明を最新アーキテクチャに整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.5` に更新

## [1.5.4] - 2026-03-13

### Added

- skills: 全 9 SSOT スキルに `AskUserQuestion Protocol` セクションを追加
- tests: skill integration と `pr-merge` plan 生成まわりの回帰テストを追加・拡張

### Changed

- init: integration wrapper 配布をテキストコピーから symlink ベースへ移行
- ci: required build check context と matrix/needs の扱いを見直し、workflow の安定性を改善
- docs: release/skill/README の説明を symlink アーキテクチャと AskUserQuestion 運用に整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.4` に更新

### Fixed

- assets/init: legacy wrapper cleanup と symlink error handling の挙動を修正
- skills: `pr-fix` / Copilot guidance の記述差分を吸収し、各 integration の整合を回復

## [1.5.3] - 2026-03-07

### Changed

- **BREAKING**: layered spec の shared policy directory を `.qfai/specs/_shared/` から `.qfai/specs/_policies/` へ変更
- assets: init scaffold / skill templates / specs README を `_policies` と Consumer View / Escalation Hook 方針へ更新
- validate: layered spec path checks と関連 error / guidance を `_policies` 前提へ更新
- tests: assets/core 回帰テストを `_policies` 期待値に更新
- docs/migrations: `docs/migrations/v1.5.3.md` を追加し、`_shared` → `_policies` の移行手順を明文化
- docs: Minimal tutorial と examples の toolVersion を `1.5.3` に更新

## [1.5.2] - 2026-03-04

### Added

- assets: `qfai-discussion` / `qfai-sdd` に skill-local な `references/rcp_footer.md` を追加

### Changed

- assets: `qfai-discussion` / `qfai-sdd` の RCP footer 参照先を `assistant/templates` から各 skill 配下へ移設
- tests: init assets テストを skill-local RCP footer 構成に更新
- docs: Minimal tutorial と examples の toolVersion を `1.5.2` に更新

### Removed

- assets: `.qfai/assistant/templates/rcp_footer.md` と空の `assistant/templates` ディレクトリを削除

## [1.5.1] - 2026-03-03

### Added

- validators: `validateDiscussionVisuals` を追加し、`QFAI-VIS-001` / `QFAI-VIS-002` を導入
- tests: discussion 統合に伴う validator/preflight の回帰テストを追加・更新

### Changed

- core/preflight: `11_OQ-Register.md` の `Disposition: open` を gate 非依存で blocking 判定するよう統一
- validators: review target kind を `discussion` / `spec` に統一し、legacy `require` 判定を廃止
- validators/discussMermaid: issue code を `QFAI-DPACK-009` / `QFAI-DPACK-010` に統一
- assets/docs: discussion 命名とテンプレート（Mermaid/HTML+CSS mock）を統一

### Removed

- core/validators: legacy `validateDiscussPack` / `validateRequirePackReadiness` を削除

## [1.5.0] - 2026-03-03

### Added

- core: `discussionPack.ts` — 15ファイル構成の統合 discussion pack インスペクタ
- core/packLocator: `"discussion"` PackKind（timestamp 命名 `discussion-YYYYMMDDhhmmssSSS`）
- validators: `validateDiscussionPackReadiness` — QFAI-DPACK-001..008 コード
- assets: `qfai-discussion` スキル（SKILL.md + 15 テンプレート + review テンプレート）
- assets: `.qfai/discussion/README.md`
- docs/migrations: `v1.5.0.md` 移行ガイド

### Changed

- **BREAKING**: config `requireDir` → `discussionDir`（QfaiPaths 型変更）
- core/sddPreflight: require-pack → discussion-pack ベースに切り替え
- core/doctor: `requireDir` → `discussionDir`
- core/runLog: `discuss_pack` / `require_pack` → `discussion_pack`
- validators/importLite: `requireDir` → `discussionDir`
- validators/requireIndex: `requireDir` → `discussionDir`
- validators/requirementsContext: 全参照を discussion ベースに移行
- validators/discussMermaid: `.qfai/discuss` → `.qfai/discussion`, `04_Business-flow.md` → `03_Story-Workshop.md`
- validators/mermaidEnforcement: `.qfai/discussion` を TARGETS に追加
- validators/repositoryHygiene: `discuss` / `require` → `discussion` legacy ルール追加
- validators/reviewArtifacts: `ALLOWED_TARGET_KINDS` に `"discussion"` 追加
- assets: `qfai.config.yaml` で `requireDir` → `discussionDir`

### Deprecated

- validators/requirePack: `validateRequirePackReadiness` は deprecated（`validateDiscussionPackReadiness` を使用）
- skills: `qfai-discuss` / `qfai-require` → `qfai-discussion` に統合

### Removed

- assets: `qfai-discuss` スキル
- assets: `qfai-require` スキル
- assets: `.qfai/discuss/` ディレクトリ
- assets: `.qfai/require/` ディレクトリ

## [1.4.38] - 2026-03-03

### Changed

- core/prototyping: `collectElements` を `ids` + `labels` 両方返却するよう拡張（`collectElementsDetailed` 相当）
- core/prototyping: `expectedMarkers` を `CONTRACT_ID:ELEMENT_ID` ベースに変更（旧: `CONTRACT_ID:ELEMENT_LABEL`）
- core/prototyping: `UiFidelityGeneratedScreen.expected` に `ids` フィールドを追加
- core/prototyping: `UiFidelityAutogenExpected` に `elementIds` フィールドを追加
- core/prototyping: `ContractScreenInput` に `elementIds` フィールドを追加
- validate/prototyping: `QFAI-PROT-242` を `expected.ids` 優先に変更し、旧形式（label ベース）も後方互換で許容
- validate/prototyping: `UiFidelityScreenEvidence.expected` に `ids?: string[]` を追加
- validate/prototyping: QFAI-PROT-242 の診断メッセージを `CONTRACT_ID:ELEMENT_ID` 形式に更新
- docs/migrations: `v1.4.37.md` のマーカー記述を `CONTRACT_ID:ELEMENT_ID` に修正
- docs/migrations: `v1.4.38.md` を追加
- docs: UI Contract README のマーカー推奨値を `CONTRACT_ID:ELEMENT_ID` に統一
- repo: パッケージバージョンを 1.4.38 に更新

## [1.4.37] - 2026-03-02

### Added

- validate/prototyping: `QFAI-PROT-241` (error) — `uiFidelity.screens[].missing.labels` が空でない場合のラベル欠落検出を追加（`expected.labels` 存在時のみ適用、後方互換）
- validate/prototyping: `QFAI-PROT-242` (error) — `uiFidelity.screens[].missing.markers` が空でない場合のマーカー欠落検出を追加（`expected.elements > 0` 時に適用）
- validate/prototyping: `QFAI-PROT-243` (warning) — placeholder/single-text ページ検知を追加（`expected.elements > 2` かつ `observed <= 1`）
- core/prototyping: `extractDomMarkers()` を追加し、`[data-qfai]` 属性からのマーカー抽出を実装
- docs/migrations: `docs/migrations/v1.4.37.md` を追加

### Changed

- cli/prototyping: `--autogen-only` かつ `--autogen-ui-fidelity` 未指定時に exit 2 を返すよう変更（no-op 事故防止）
- cli/prototyping: autogen 未有効時に `uiFidelityAutogen.status=skipped` を evidence に書き込むよう変更（検知可能性向上）
- cli/prototyping: 既存 evidence の `runtimeGate.ui[].route` および `specs[].missing.uiRoutes` から route hints を自動抽出するよう変更
- core/prototyping: `hasLabelMatch` を正規化完全一致に変更（部分一致によるチート防止）
- core/prototyping: body テキストトークン化をオプトイン化（`QFAI_AUTOGEN_BODY_TOKENS=1`、デフォルト無効）
- core/prototyping: crawl 結果に `markers` フィールドを追加し、`buildUiFidelityScreens` で `found.markers / missing.markers` を生成
- validate/prototyping: `UiFidelityScreenEvidence` 型に `expected.labels`, `found`, `missing`, `coverage` を任意フィールドとして追加（後方互換）
- repo: パッケージバージョンを 1.4.37 に更新

## [1.4.36] - 2026-02-28

### Added

- cli/prototyping: `qfai prototyping --autogen-ui-fidelity` コマンドを追加し、`contracts/ui/**` と DOM 巡回による `uiFidelity` 自動生成を実装
- core/prototyping: `uiFidelityAutogen` モジュールを追加（`collectExpectedFromContracts`, `crawlRoutesAndCollectFoundLabels`, `runMockPaths`, `emitUiFidelity`）
- dependencies: `jsdom` を追加（軽量 DOM 解析用）

### Changed

- cli: `--autogen-ui-fidelity`, `--autogen-only`, `--evidence-out`, `--base-url`（prototyping 用）オプションを args に追加
- env: `QFAI_PROTOTYPE_FIDELITY_AUTOGEN=1` / `QFAI_PROTOTYPE_BASE_URL` 環境変数をサポート
- docs: README に prototyping autogen の使用方法・CI 統合例・失敗時ハンドリングを追記
- repo: パッケージバージョンを 1.4.36 に更新

## [1.4.35] - 2026-02-28

### Added

- docs/migrations: `docs/migrations/v1.4.35.md` を追加し、v1.4.34 からの運用更新点（gate追加なし）を明文化
- docs/examples: UI Contract と `uiFidelity` の良い例を追加（`docs/examples/ui-contract.good.yaml`, `docs/examples/prototyping-ui-fidelity.good.json`）

### Changed

- validate/prototyping: `QFAI-PROT-232` の診断性を改善し、`refs` に `contract_id/route/contract_element_labels(_by_contract_route)/missing_labels(alias)/required_actions` を付与
- validate/prototyping: `QFAI-PROT-231/232/233` のメッセージを次アクション指向に更新（label描画・`data-qfai` マーカー・action配線）
- templates/contracts-ui: `contracts/ui/README.md` に `elements[].id` 命名/変更ポリシー、`elements[].label` 運用、L2 `actions[]` 最小セット、FAQ を追加
- templates/review: `assistant/templates/rcp_footer.md` と `review/README.md` に prototyping 失敗時の診断手順と「最初に見るファイル」順を追加
- tests/assets+core: 上記 docs/validator 変更に追従する回帰チェックを追加・更新
- repo: パッケージバージョンを 1.4.35 に更新

## [1.4.34] - 2026-02-27

### Added

- validate/prototyping: `uiFidelity` interactive hard gate を追加し、欠落を `QFAI-PROT-231`（error）として検出
- validate/prototyping: UI contract と `uiFidelity` の欠落整合検証を `QFAI-PROT-232`（error）として追加（contract参照/route/elements/actions）
- validate/prototyping: interactive 時の `mockPaths.status=pass` 欠落検知 `QFAI-PROT-233`（warning）を追加
- docs/migrations: `docs/migrations/v1.4.34.md` を追加し、v1.4.33 からの最小移行手順を明文化

### Changed

- tests/core: `prototypingEvidence` 回帰テストを拡張し、`QFAI-PROT-231/232/233` の最小セットを追加
- tests/core: `validate` fixture の `prototyping.json` を v1.4.34 hard gate 準拠に更新
- templates/evidence: `README.md` の `uiFidelity` 説明を optional から modeベース運用（interactive必須 / skeleton許容）へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.34 に更新
- repo: パッケージバージョンを 1.4.34 に更新

## [1.4.33] - 2026-02-27

### Added

- templates/contracts-ui: `contracts/ui/README.md` に mockable prototype（`prototype.mode/mockPaths/markers`）の規約と `elements/actions` フィールド詳細を追記し、copy-ready な sample/example を追加
- templates/evidence: `prototyping` 証跡テンプレートへ `uiFidelity`（optional, backward-compatible）を追記

### Changed

- templates/prototyping: `/qfai-prototyping` の DoD を L1/L2 二層で明文化し、既定 L2（interactive）+ `uiFidelity` 出力必須 + placeholder-only output を REVISE 規約に更新
- tests/assets+core: 上記テンプレート/skill追加に対する guardrail を追加し、v1.4.33 表記へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.33 に更新
- repo: パッケージバージョンを 1.4.33 に更新

## [1.4.32] - 2026-02-24

### Added

- wrappers: `.agents` / `.github/prompts` の `qfai-sdd` wrapper に no-arg all-specs batch reminder（Capabilities SSOT / parallel delegation / batch末尾validate+review）を追加

### Changed

- templates/docs: `.qfai/README.md` の deprecated wrappers 説明を「route」から「initでは非配布・`/qfai-sdd` を使用」へ修正
- tests/assets: `qfai-sdd` wrapper reminder の回帰guardrailを追加
- docs/tests/validator: v1.4.32 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.32 に更新

## [1.4.31] - 2026-02-24

### Added

- tests/assets: `/qfai-sdd` の引数なし実行で「全spec対象 + 並列委任必須」ルールが維持されることを検知する guardrail を追加

### Changed

- templates/sdd: `/qfai-sdd` の引数解釈を更新し、引数なし時は `_shared/03_Capabilities.md` の順序に従って `spec-0001..N` を全件対象にするルールを明文化
- templates/sdd: 引数なしバッチ時は Contracts-first/Outline を1回、Slice/Plan/Delta を spec毎に並列委任、validate/review をバッチ末尾1回で実施する必須ルールを追加
- templates/instructions: `workflow.md` に `/qfai-sdd` の target policy（引数あり単一spec・引数なし全spec）を追記
- docs/tests/validator: v1.4.31 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.31 に更新

## [1.4.30] - 2026-02-23

### Added

- validate/prototyping: `.qfai/evidence/prototyping.json` を検査する `validatePrototypingEvidence` を追加し、全spec網羅・declared/checked整合・API 404禁止（`QFAI-PROT-101/111/112/113/114`）を hard gate 化
- templates/agents: prototyping の coverage 欠落を検知して STOP する `prototyping-coverage-auditor` ロールカードを追加

### Changed

- templates/prototyping: `/qfai-prototyping` を `<spec-id>` 前提から **ALL specs** 前提へ更新し、Preflight/Execution/Runtime Gate v2 + `prototyping.md/json` 証跡を必須化
- templates/instructions: `workflow.md` / `constitution.md` の prototyping 完了条件を `evidence + qfai validate --fail-on error` に統一し、scope 縮小禁止を明文化
- tests/assets: prototyping guardrail（ALL specs/evidence必須/DONE禁止条件）の退行検知を追加
- docs/tests: v1.4.30 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.30 に更新

## [1.4.29] - 2026-02-22

### Added

- tests/assets: init assets 内の禁止文字列（Coverage Ledger hard gate 残骸）・legacy spec 参照（`spec.md` / `delta.md`）・`qfai-sdd/templates/spec-pack` 再導入を検知する guardrail を追加

### Changed

- templates/skills+agents: `assistant/**` の完了ゲートを `qfai validate --fail-on error` + `assistant/steering/test-layers.md` に統一し、Coverage Ledger / `scenario.feature` 必須導線を除去
- templates/specs: spec 参照を layered v1.4.21 命名（`01_Spec.md` / `09_delta.md` / `_shared/10_delta.md`）へ統一
- templates/sdd: `qfai-sdd/templates/spec-pack/**` を配布対象から除去し、`templates/specs/**` のみを配布
- templates/skills: `qfai-sdd-planning` / `qfai-sdd-refinement` を init 配布対象から除外し、`qfai-tdd-red|green|refactor` を deprecated wrapper 運用へ更新
- docs/tests: v1.4.29 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.29 に更新

## [1.4.28] - 2026-02-22

### Added

- tests/assets: 汎用 skills/agents に `Coverage Ledger 100%` ゲート残骸が再導入されないことを検査する guardrail を追加

### Changed

- templates/skills: `qfai-verify` / `qfai-sdd` / `qfai-configure` / `qfai-prototyping` から coverage ledger 完了ゲートを除去し、`qfai validate --fail-on error` + `assistant/steering/test-layers.md` を必須ゲートとして明記
- templates/skills: 上記4 skill で `scenario.feature` / coverage ledger を mandatory 入力から optional legacy 入力へ格下げ
- templates/agents: `orchestrator` / `test-engineer` / `qa-engineer` / `qa-reviewer` / `unit-test-scope-enforcer` / `backend-engineer` / `frontend-engineer` を SSOT（US/TC/CON-API + validate gate）に整合
- docs/tests: v1.4.28 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.28 に更新

## [1.4.27] - 2026-02-22

### Added

- templates/migration: ATDD運用の v1.4.27 hard gate 整合を明記する `v1.4.27-atdd-alignment.md` を追加

### Changed

- templates/assistant: `test-layers` / `workflow` / `agent-selection` / `drift-protocol` を US/TC/CON-API 中心の運用へ更新
- templates/skills+agents: `/qfai-atdd` と atdd implementers・reviewer・coverage planning 系を ledger 必須から validate error gate 中心へ更新
- docs/tests: v1.4.27 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.27 に更新

## [1.4.26] - 2026-02-21

### Added

- validate/atdd: spec→コード（ATDD注釈）の hard gate を追加し、Unknown参照（`QFAI-ATDD-101/102/103`）・Coverage欠落（`QFAI-ATDD-111/112/113`）・禁止参照（`QFAI-ATDD-121/122`）を error として検出
- report/atdd-traceability: `.qfai/report/atdd-traceability/summary.json` と `summary.md` の出力を追加（出力失敗は `QFAI-ATDD-901` warning）

### Changed

- templates/docs: test-layer運用とRCP観点を v1.4.26 の ATDD注釈運用に更新
- docs/tests: v1.4.26 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.26 に更新

## [1.4.25] - 2026-02-21

### Added

- validate/layerCoverage: v1.4.21 layered specs 向けに構造完全性 hard gate（`QFAI-COV-204`/`QFAI-COV-205`/`QFAI-COV-206`）を追加し、空参照行を error として検出
- validate/layerCoverage: EX の複数 BR 参照を薄さシグナルとして警告する `QFAI-COV-207` を追加
- ci: `qfai validate --fail-on error --format github` 実行と report artifact upload を workflow に追加

### Changed

- templates/skills: `/qfai-sdd` に validate 実行（error=0）と evidence（`validate.log` / `specs-coverage`）必須の completion gate を追加
- templates/skills: `/qfai-discuss` に Example Mapping 観点（Happy/Negative/Edge/Permission/State/Idempotency）と Density Review 連携を追加
- templates/review+agents: RCP footer / review request / coverage-planner / test-case-owner / test-volume-estimator / qa-gatekeeper を v1.4.21 layered 入力と hard gate 運用に更新
- docs/tests: v1.4.25 運用に合わせて README・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.25 に更新

## [1.4.24] - 2026-02-20

### Added

- validate/contracts: `11_Contracts.md` と `_shared/05_Contracts.md` の契約参照IDを宣言済み契約へ照合する validator を追加（`QFAI-CONTRACT-030`、short ID 正規化対応）
- init/wrappers: `.agents/skills/**` と `.agents/README.md` の生成を追加し、`--force` 時の stale wrapper 削除に対応

### Changed

- templates/sdd: `/qfai-sdd` を contracts-first 必須フローへ更新し、`_shared/05_Contracts.md` の Contract Index（DB/API/UI short ID）規約を明記
- templates/specs: layered shared/spec の欠番対策として `_shared/08_Decisions.md` / `_shared/09_Open-questions.md` / `_shared/10_delta.md` を追加し、`07/08` 系の empty 時 `0 items` 明示を標準化
- templates/prototyping: `/qfai-prototyping` に「契約不足時STOP」「契約ファイル新規作成禁止」を追加
- docs/tests: `.agents` wrapper 追加・v1.4.24 運用に合わせて README と回帰テストを更新
- repo: パッケージバージョンを 1.4.24 に更新

## [1.4.23] - 2026-02-18

### Added

- validate/layered: v1.4.21 layered specs 向けに下位参照検知（`TRACE_DOWNSTREAM_REF`）と `_shared` 責務違反検知（`TRACE_SHARED_SCOPE_VIOLATION`）を追加
- validate/status: `.qfai/status` の legacy 検知 validator を追加（`LEGACY_STATUS_DIR` / `LEGACY_STATUS_DIR_NONEMPTY`）
- report/run-log: `qfai validate` 実行ごとに `.qfai/report/run-*/` を append-only 生成し、`run.json` / `validator.json` / `traceability.json` / `summary.md` を保存

### Changed

- validate/spec-pack: release gate の `release_candidate` 判定を specs Initiative レイヤーに統一し、`.qfai/status/*.json` 依存を廃止
- templates/docs: init scaffold と README 群の status 記述を run-log 運用（`.qfai/report/run-*`）へ更新
- tests: layered v1.4.21 traceability・legacy status warning・run-log 生成の回帰テストを追加/更新
- repo: パッケージバージョンを 1.4.23 に更新

## [1.4.22] - 2026-02-18

### Added

- core/pack-locator: discuss/require pack の命名判定・timestamp 解析・latest 選定を共通化し、生成系（preflight）と検証系（validator）で同一ルールを適用
- validate/hygiene: legacy directory（`discussions/`, `requirements/`, `spec/`, `specification/`）と legacy pack（`*-0001` 形式）検知を追加（v1.4.22 は warn 中心、危険命名は error）

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を実処理なしの deprecated wrapper へ置換し、`/qfai-sdd` へ一本化
- templates/init: report ディレクトリに `.gitignore` を追加し、ログ/成果物の追記型運用を明確化
- docs/tests: v1.4.22 の skill 導線・衛生ルール・テンプレ構成へ README と回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.22 に更新

## [1.4.21] - 2026-02-18

### Added

- validate/layerCoverage: v1.4.21 向けの `AC->TC` / `BR->EX` / `EX->TC` 必須カバレッジ検証（error）を追加
- validate/layerCoverage: `.qfai/report/specs-coverage/spec-XXXX.md` のカバレッジレポート出力と signal 行を追加
- validate/layerCoverage: `specs/plan.md` 禁止・`10_Plan.md` の How-only 禁止項目検査を追加

### Changed

- templates/specs: layered canonical 名を v1.4.21 へ更新（`03_Acceptance-Criteria.md` / `04_Business-Rules.md` / `05_Examples.md` / `06_Test-Cases.md` / `_shared/04_Business-Flow.md`）
- core/spec-layout: layered 既定 required file set を v1.4.21 名へ更新し、`LayeredStyle=v1421` 判定を追加
- validate/business-flow/mermaid/review-gate: Business Flow の canonical 名を `04_Business-Flow.md` に統一し、旧名は warning で検出
- templates/docs/tests: v1.4.21 命名・Plan方針に合わせて manifest / skill / README / test expectation を更新
- repo: パッケージバージョンを 1.4.21 に更新

## [1.4.20] - 2026-02-18

### Added

- templates/discuss: `/qfai-discuss` の固定成果物を `01_Context.md`..`09_delta.md` の9ファイル構成へ更新
- templates/review: `review-roster.yml` と共通RCPフッター（`assistant/templates/rcp_footer.md`）のSSOTを追加
- validate/discuss: 最新 discuss pack の OQ 検査（`Disposition: open` 禁止、`deferred` 必須メタ検査）を追加

### Changed

- templates/skills: `/qfai-discuss` を Open OQ=0 ループ（`deferred` 許容）へ更新し、`/qfai-discuss` `/qfai-require` `/qfai-sdd` で総動員レビュー導線を統一
- docs/tests: v1.4.20 表記と discuss 固定テンプレート構成に合わせて回帰テストを更新
- repo: パッケージバージョンを 1.4.20 に更新

## [1.4.19] - 2026-02-17

### Added

- validate/require: `require-<timestamp>/` の固定9ファイル存在・最小内容・Blocking OQ（`Disposition: open` + `Gate: discuss|require|sdd`）検査を追加
- validate/review: `.qfai/review/.gitignore` と `review-*` 最小成果物（`review_request.md` / `R*_*.md` / `summary.json`）検査を追加
- core/preflight: `/qfai-sdd` 用 preflight に require-pack 必須停止ガード（不足時の次コマンド誘導）を追加
- core/spec-layout: layered spec 必須ファイル集合のSSOTを追加し、欠落・番号飛び検知を強化

### Changed

- templates/init: `.qfai/review/.gitignore` を常設し、review 生成物の追記型運用を固定化
- templates/require: `/qfai-require` の成果物を固定9ファイル（`01_Sources.md`..`09_delta.md`）へ更新
- templates/skills: `/qfai-require` `/qfai-sdd` `/qfai-sdd-refinement` `/qfai-sdd-planning` を require-pack 必須導線へ更新
- docs/tests: v1.4.19 表記と require-pack / preflight / review / layered spec 回帰テストを更新
- repo: パッケージバージョンを 1.4.19 に更新

## [1.4.18] - 2026-02-16

### Added

- validate/mermaid: `.qfai/specs|require|discuss`（`evidence` 除外）を対象に Mermaid 記法の fenced block 強制 + Business Flow 必須図を検証する validator を追加
- validate/layered: v1.4.17 layered spec の `US -> AC -> BR -> EX -> TC` に対して「親が最低1つの子を持つ」coverage validator を追加

### Changed

- templates/specs: `_shared/04_Business-flow.md` と `_shared/05_Contracts.md` の Mermaid 必須表現を強化
- templates/specs: `spec/05_Examples.feature` の `# Parent:` 必須ルールをテンプレートに明記
- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` `/qfai-sdd-planning` の FINAL CHECKLIST を v1.4.18 要件へ更新
- docs/tests: v1.4.18 表記と Mermaid/Coverage validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.18 に更新

## [1.4.17] - 2026-02-16

### Added

- validate/layered: CAP単位のspec分割を検証する `validateSpecSplitByCapability` を追加
- validate/layered: Parent参照の方向（下位→上位のみ）を検証する `validateLayeredTraceability` を追加
- validate/layered: US/AC/BR/EX/TC の孤児禁止を検証する `validateOrphanProhibition` を追加
- templates/specs: `_shared/03_Capabilities.md` と `spec/01..09` の v1.4.17 テンプレート群を追加

### Changed

- core/spec-layout: layered spec の標準構成を `01_Spec.md + 02..06` へ対応しつつ旧構成との互換を維持
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の分割規約を CAP単位ループ・Parent必須ルールへ更新
- templates/review: review request / reviewer / summary テンプレートの layer 名を v1.4.17 スキーマへ更新
- docs/tests: v1.4.17 表記と layered traceability / orphan 検証の回帰テストを更新
- repo: パッケージバージョンを 1.4.17 に更新

## [1.4.16] - 2026-02-16

### Added

- templates/sdd: import-lite 用 evidence テンプレート（`templates/evidence/import-lite.md`）を追加
- templates/sdd: preflight 報告テンプレート（`templates/report/preflight_summary.md`）を追加
- validate/require: `02_requirement-index.md` の最小 shape（`REQ-` 件数、`Source refs` 欠落率）を検査する warning validator を追加
- validate/import-lite: specs が存在するのに require index と import-lite evidence の両方が無い場合の warning validator を追加
- core/preflight: SDD preflight 入力選択と `preflight_summary.md` 生成ユーティリティを追加

### Changed

- templates/require: `02_requirement-index.md` を索引専用（`REQ-ID / Statement / Priority / Source refs / Notes`）へ更新し、specs との重複禁止を明確化
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の preflight 手順を `require-index` 優先 + import-lite fallback + report 出力に整合
- templates/init: `.qfai/report/README.md` を追加し、preflight_summary の格納先を明確化
- docs/tests: v1.4.16 表記と import-lite/preflight テンプレート参照を更新
- repo: パッケージバージョンを 1.4.16 に更新

### Changed

- なし

## [1.4.15] - 2026-02-16

### Added

- templates/init: `.qfai/status/README.md` を追加し、status（運用状態）の保管場所を明確化
- validate/status: specs 配下の status 混入（`release_candidate` / `Status` / `Progress` / `Risk(s)`）を検知する warning validator を追加
- validate/density: BR/Examples/Test-cases の最低存在チェック（`BR-` / `Scenario` / `TC-` と Coverage Matrix）を warning validator として追加

### Changed

- templates/specs: Business Rules / Examples / Test-cases テンプレートを v1.4.15 の密度要件（Catalog/Rule Definitions/Matrix 等）へ強化
- templates/skills: `/qfai-sdd-refinement` `/qfai-sdd-planning` の review 観点に BR→Examples→Test-cases の分解品質チェックを追加
- docs/tests: v1.4.15 表記と status 分離・density validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.15 に更新

## [1.4.14] - 2026-02-16

### Added

- validate/mermaid: Mermaid 記法が `mermaid` 以外の fenced code block に書かれた場合を検出する validator（error）を追加
- validate/business-flow: `.qfai/specs/_shared/04_Business-flow.md` の mermaid 必須チェック（flowchart または sequenceDiagram）を追加
- validate/compat: `.qfai/specs/_shared/*Business-flow*.feature` を deprecated warning として検出

### Changed

- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` の Mermaid ルールと review checklist を更新
- templates/specs: Business Flow のテンプレート/README を `Markdown + Mermaid` 前提へ更新
- docs/tests: v1.4.14 表記と Mermaid 関連の回帰テストを更新
- repo: パッケージバージョンを 1.4.14 に更新

## [1.4.13] - 2026-02-16

### Added

- なし

### Changed

- templates/discuss+require: discuss / require 出力ディレクトリ命名を timestamp (`discuss-*` / `require-*`) へ統一し、README・skill 定義を更新
- validate/discovery: discuss 探索を `discuss-*` 優先に変更し、旧形式 (`DISCUSS-####`) は後方互換 + warning として扱う
- docs/tests: v1.4.13 表記と成果物パス表記を更新
- repo: パッケージバージョンを 1.4.13 に更新

## [1.4.12] - 2026-02-16

### Added

- templates/review: `/qfai-discuss` / `/qfai-require` / `/qfai-sdd-refinement` / `/qfai-sdd-planning` に review artifacts 用テンプレート（`review_request.md` / `Rxx_reviewer.md` / `summary.json`）を追加
- templates/steering: `review-gate.rules.yml` を追加し、required/optional gate と default reviewers を定義
- validate/review-gate: `.qfai/review/**/summary.json` を検証する review gate validator（schema / fixed 条件 / attempt 連番 / fingerprint / required gate）を追加

### Changed

- templates/skills: discuss/require/sdd-refinement/sdd-planning に RCP 手順（attempt 採番・差戻しループ・fixed 判定）を明記
- tests: review gate validation と review template 配布の回帰テストを追加
- tests/docs: v1.4.12 表記へ更新
- repo: パッケージバージョンを 1.4.12 に更新

## [1.4.11] - 2026-02-16

### Added

- templates/skills: `/qfai-sdd-refinement` / `/qfai-sdd-planning` を追加し、SDD preflight の分割運用を再導入
- templates/sdd: import-lite 証跡テンプレート（`qfai-sdd-refinement/templates/import-lite-evidence.md`）を追加

### Changed

- templates/require: `/qfai-require` の成果物を `01_sources.md` / `02_requirement-index.md` / `03_open-questions.md` へ刷新
- docs/workflow: require・specs・README 導線を import-lite/preflight 前提へ更新
- validate: require context validator を `qfai validate` の実行対象から外し、旧 require 構造依存を解消
- tests/verify-pack: require index 新構造と SDD split skill に追従
- tests/docs: v1.4.11 表記へ更新
- repo: パッケージバージョンを 1.4.11 に更新

## [1.4.10] - 2026-02-16

### Added

- validate/layered: `_shared + spec-XXXX` レイアウト向け検証（CAP↔spec整合、US→AC→BR→SC→CASE の必須エッジ、namespace整合）を追加

### Changed

- validate/ids: `CAP` / `US` を ID 抽出・重複検知対象に追加
- validate/layout: `*_delta.md` を許容し、Layered layout を優先検出
- docs/skills: `.qfai/specs/README.md` と skill の Mandatory Outputs を v1.4.10 契約へ更新
- tests/docs: v1.4.10 表記へ更新
- repo: パッケージバージョンを 1.4.10 に更新

## [1.4.9] - 2026-02-14

### Added

- なし

### Changed

- init/integrations: `qfai init` で `.claude/commands`・`.github/prompts`・`.codex/skills` と agent wrapper（`.claude/agents`・`.github/agents`）を再生成するよう修正（対象は現行 canonical skills のみ）
- init/force: `qfai init --force` で canonical skills と integration wrappers を再同期する挙動へ更新
- verify-pack/tests/docs: wrapper 配布前提に検証・ドキュメントを更新
- tests/docs: v1.4.9 表記へ更新
- repo: パッケージバージョンを 1.4.9 に更新

## [1.4.8] - 2026-02-14

### Added

- なし

### Changed

- templates/init-root: `qfai init` 実行時に `features/spec-0001.feature` を生成しないよう、root サンプル feature を削除
- tests/docs: v1.4.8 表記へ更新
- repo: パッケージバージョンを 1.4.8 に更新

## [1.4.7] - 2026-02-14

### Added

- なし

### Changed

- templates/skills: 廃止対象 skill（`qfai-implement` / `qfai-pr` / `qfai-scenario-test` / `qfai-spec` / `qfai-unit-test`）を削除
- templates/wrappers: `.claude` / `.codex` / `.github` 配下の配布資産を撤廃
- templates/contracts: contracts サンプルを `qfai-sdd/templates/contracts/` へ移設し、参照を更新
- docs/tests/init: 廃止導線の参照を削除し、`qfai-sdd` 中心フローへ統一
- repo/ci: このリポジトリ自身の品質ゲートとして `build`（`pnpm ci:local`）を GitHub Actions で維持
- repo: パッケージバージョンを 1.4.7 に更新

## [1.4.6] - 2026-02-14

### Added

- templates/skills: 全 canonical skill (`.qfai/assistant/skills/*/SKILL.md`) に `Completion Checklist (MUST)` と `Completion Message & Next Actions (MUST)` を追加
- templates/skills: `qfai-discuss` に固定の完了メッセージ（`/qfai-require` 誘導）を必須化

### Changed

- templates/skills: 完了時に「次のユーザー行動」を列挙する導線を全 skill で標準化
- repo: パッケージバージョンを 1.4.6 に更新

## [1.4.5] - 2026-02-14

### Added

- templates/skills: contracts サンプルを `.qfai/assistant/skills/qfai-spec/templates/contracts/` に追加

### Changed

- templates/init: `qfai init` 初期資産を空スキャフォールド化（specs/discuss/require/contracts は README/.gitignore のみ）
- templates/init: legacy `.qfai/discussions/` を削除し、参照を `.qfai/discuss/` に統一
- tests: init 直後に sample pack が無い前提へ検証セットアップを更新
- repo: パッケージバージョンを 1.4.5 に更新

## [1.4.4] - 2026-02-13

### Added

- validate: release_candidate 判定（`03_Initiative.md` の `release_candidate: true`）と release gate（OQ open blocking）を追加
- validate: `18_delta.md` の required sections / Rejected の `DO NOT`・`Temptation` 必須チェックを追加

### Changed

- validate: Spec Pack/Ledger 系エラーの修正指示を強化し、error_code ベースで原因と対処を明確化
- cleanup/docs: 旧資産導線を整理し、v1.4.4 hardening 方針へ統一
- repo: パッケージバージョンを 1.4.4 に更新

## [1.4.3] - 2026-02-13

### Added

- templates/skills: 統合SDD skill `qfai-sdd` を追加し、`templates/spec-pack/01..18` を単一skill配下に集約
- templates/wrappers: `.codex` / `.claude` / `.github` 向け `qfai-sdd` wrapper を追加

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を廃止し、`qfai-spec` は `qfai-sdd` への deprecated alias に更新
- templates/docs: README / `.qfai` ドキュメント導線を `qfai-sdd` 一本化へ更新
- repo: パッケージバージョンを 1.4.3 に更新

## [1.4.2] - 2026-02-13

### Added

- templates: `qfai-discuss` / `qfai-require` の v1.4.2 ヒアリングテンプレート（Core / Optional deep dive, `00..07`）を追加

### Changed

- templates/skills: `qfai-discuss` / `qfai-require` を「レイヤー型 Spec Pack 入力を揃える構造化ヒアリング」フローに刷新
- templates/docs: discuss / require 成果物フォーマットを v1.4.2 仕様へ更新
- repo: パッケージバージョンを 1.4.2 に更新

## [1.4.1] - 2026-02-12

### Added

- validate/report: 新Spec Pack（`01..18`）と Ledger SSOT を前提にした検証・レポート生成を追加

### Changed

- validate: 旧成果物（`spec.md` / `scenario.feature` / `case-catalogue.md` / `traceability-matrix.md`）前提の探索・検証を廃止
- repo: パッケージバージョンを 1.4.1 に更新

## [1.4.0] - 2026-02-12

### Added

- templates/spec-pack: `01_Spec.md` から `18_delta.md` までの新 Spec Pack テンプレートを `qfai-sdd-refinement` / `qfai-sdd-planning` の skills 配下に追加
- templates/specs/contracts: init 直後に参照できる `spec-0001` サンプルと `API-0001` / `DB-0001` / `UI-0001` サンプル契約を追加

### Changed

- templates/docs: `.qfai/specs/README.md` を Spec Pack 01..18 構成と参照方向ルール（下位→上位のみ）へ更新
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` の作業フロー規約と Mandatory Outputs を新構成へ更新
- repo: パッケージバージョンを 1.4.0 に更新

## [1.3.19] - 2026-02-11

### Added

- validate: Drift Protocol / test-layer hardening 用の assistant assets validator を追加（`QFAI-ASSETS-001/002`, `QFAI-SKILLS-010/011/012`）
- validate: `.qfai/assistant/skills/**` と `.qfai/assistant/skills.local/**` の `SKILL.md` 必須 marker / Reviewer Gate 静的検証を追加

### Changed

- validate: `implementation-brief.md` 単独存在を warning から error へ変更（How SSOT を `plan.md` に完全統一）
- templates/docs: `implementation-brief.md` の互換期間説明を廃止し、`plan.md` 必須方針へ更新
- repo: パッケージバージョンを 1.3.19 に更新

## [1.3.18] - 2026-02-11

### Added

- templates: How SSOT の新テンプレート `.qfai/templates/spec/plan.md` を追加
- templates: Drift Protocol 規範 `.qfai/assistant/instructions/drift-protocol.md` とテストレイヤ規範 `.qfai/assistant/steering/test-layers.md` を追加
- validate: `plan.md` 検証と legacy `implementation-brief.md` 互換判定（`QFAI-HOW-001/002` 継続）を追加
- templates/agents: reviewer 系サブエージェントに Drift Protocol / test-layer policy 観点を追加

### Changed

- templates/specs/docs: How SSOT の標準ファイル名を `implementation-brief.md` から `plan.md` へ移行（legacy は互換期間で warning 扱い）
- templates/skills: Reviewer Gate と work order 制約を更新し、drift 承認制・test-layer 準拠を明文化
- templates/skills: ATDD のテストボリューム floors/倍率を「ゲート」ではなく「不足検知シグナル」として扱う方針に更新
- repo/docs: README・命名規約・関連説明を `plan.md` 前提へ整合
- repo: パッケージバージョンを 1.3.18 に更新

## [1.3.17] - 2026-02-10

### Added

- validate: case-catalogue の必須カラム表ヘッダ検証を追加（`QFAI-CASE-011`）
- validate: `.qfai/discussions/discuss-*.md` の Mermaid `sequenceDiagram` 検証を追加（`QFAI-DISCUSS-021`）

### Changed

- validate: CI 環境で `--phase refinement` 実行を禁止し、`QFAI-VALIDATE-017` で Fail 化
- validate: waiver を Warn/Info 用途に限定し、Error finding 対象 waiver を `QFAI-WAIVER-002` として Fail 化
- validate: waiver 期限切れの扱いを `QFAI-WAIVER-003` warning へ変更
- templates/docs: waiver 運用と refinement phase の注意事項（CI は full を使用）を更新
- repo: パッケージバージョンを 1.3.17 に更新

## [1.3.16] - 2026-02-10

### Added

- templates/skills: 全 Skill に `Sub-agent Delegation (MANDATORY)` セクションを追加し、Capability Probe / Simulation mode / Work Orders Summary / Reviewer Gate を明文化
- test/assets: skills 出荷アセットの委任要件整合を検査する静的チェックを追加

### Changed

- templates/skills: 主要工程（discuss/require/sdd/atdd/tdd/verify）の委任フローを Delegate → Integrate → Reviewer Gate に更新
- templates/wrappers: `.claude/.github/.codex` の wrapper skill へ同等の委任要件を反映
- repo: パッケージバージョンを 1.3.16 に更新

## [1.3.15] - 2026-02-10

### Added

- templates: `require/business-flows.md` と discussions の Business Flow 例で Mermaid `sequenceDiagram` を標準化
- validate: requirements context で `business-flows.md` の Mermaid 必須チェックを追加（`QFAI-REQCTX-020/021`）

### Changed

- templates: skills 構造を `SKILL.md` 単体完結（SSOT）へ移行し、`qfai-source` / `10_workflow.md` 依存を廃止
- templates: `assistant/instructions/workflow.md` と各工程 skill に steering 補完ルールを明記
- templates/docs: `specs/README.md` の `case-catalogue.md` テンプレを表形式へ更新
- repo: パッケージバージョンを 1.3.15 に更新

## [1.3.14] - 2026-02-09

### Added

- validate: `--phase refinement` を追加し、Refinement段階の専用検証プロファイルを導入
- validate: `implementation-brief.md` 検証を追加（`QFAI-HOW-001/002`）
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を追加し、How SSOT（`implementation-brief.md`）運用を導入
- templates: `.qfai/templates/spec/implementation-brief.md` を追加

### Changed

- validate: refinement phase では How必須チェックと SC→Test 強制（`QFAI-TRACE-010/013`）を緩和
- templates/docs: Spec Pack 必須ファイルに `implementation-brief.md` を追加し、SDDフローを refinement/planning に更新
- skills: `qfai-spec` を deprecated alias として `qfai-sdd-refinement` へ誘導
- repo: パッケージバージョンを 1.3.14 に更新

## [1.3.13] - 2026-02-08

### Added

- templates: skills-only 配布構成（`.claude/skills` / `.github/skills`）を追加
- validate/doctor: `skillsIntegrity` チェックを追加（`.qfai/assistant/skills/**` を検査）

### Changed

- templates: `prompts/commands` を廃止し、`.qfai/assistant/skills` を SSOT とする構成へ移行
- init: `--force` の上書き対象を `assistant/skills` と publish 先 skills（`.claude/.github/.codex`）へ変更
- config: `paths.skillsDir` を追加し、`paths.promptsDir` を deprecated 扱いへ変更
- tests/scripts/docs: assets テスト・verify-pack・README 群を skills-only 構成に更新
- repo: パッケージバージョンを 1.3.13 に更新

## [1.3.12] - 2026-02-08

### Added

- validate: delta.md の Verification Plan 検証を追加（VFY-001〜007）
- report: Verification findings（Error/Warn）の可視化を追加

### Changed

- templates: delta.md テンプレートに Verification セクションを追加
- templates: PR テンプレートに verification 確認項目を追加
- docs: verification 運用の最小ガイドを README と init docs に追記
- repo: パッケージバージョンを 1.3.12 に更新

## [1.3.11] - 2026-02-08

### Added

- validate: waiver 設定（`.qfai/waivers.yml`）と適用機構を追加（WAIVER-001〜006）
- report: Active Waivers / Suppressed Summary / Expired Waivers の表示を追加
- templates: `.qfai/waivers.yml` テンプレートを init 資産に追加

### Changed

- validate: findings に waiver マッチ用メタ（`dl_id` / `file`）を付与し、waiver 適用後の結果で fail 判定
- templates: PR テンプレートに Waivers 申告セクションを追加
- tests: waiver の unit/integration/assets 回帰テストを追加
- repo: パッケージバージョンを 1.3.11 に更新

## [1.3.10] - 2026-02-07

### Added

- validate: compat/scope 整合チェックを追加（COMPAT-001〜005, SCOPE-001/002）
- report: compat 観点と scope mismatch の表示を追加

### Changed

- templates: delta.md を v1.1（`#### Migration / Follow-ups`）へ更新し、PR テンプレートに compat セクションを追加
- tests: compat/scope ルールとテンプレート更新の回帰テストを追加
- repo: パッケージバージョンを 1.3.10 に更新

## [1.3.9] - 2026-02-07

### Added

- validate: delta.md フォーマット v1（Update History / Decision Log / Meta YAML / Rejected guardrails）検証を追加（DELTA-001/002/003）
- validate: Change Type の語彙検証と diff ベース矛盾検知を追加（CTYPE-001/002/003）
- report: Change Type（Primary/Tags/compat）集計と CTYPE-002 警告一覧を追加

### Changed

- templates: delta.md テンプレートを v1 構造に更新し、PR テンプレートに Change Type / Tags / delta 参照 / Review Focus を追加
- tests: delta/ctype 関連ユニットテストと assets ガードレールを更新
- repo: パッケージバージョンを 1.3.9 に更新

## [1.3.8] - 2026-02-06

### Changed

- templates: Claude Code slash commands（`.claude/commands/*.md`）が `.qfai/assistant/skills/<id>/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- docs: README の integration 説明を Claude commands の skills 優先に更新
- repo: パッケージバージョンを 1.3.8 に更新

## [1.3.7] - 2026-02-06

### Changed

- Codex skill wrappers now reference `.qfai/assistant/skills/<id>/SKILL.md` as the canonical entrypoint (instead of `.qfai/assistant/prompts/<id>.md`).
- Updated `.codex/README.md` to document the skills-first entrypoint for tool integrations.

## [1.3.6] - 2026-02-06

### Changed

- templates: GitHub Copilot prompt wrappers（`.github/prompts/*.prompt.md`）が `.qfai/assistant/skills/*/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- templates: `.github/copilot-instructions.md` のガイダンスを skills 優先に更新
- docs: README の integration 説明を skills 優先に更新
- repo: パッケージバージョンを 1.3.6 に更新

## [1.3.5] - 2026-02-06

### Added

- templates: `.qfai/assistant/skills/<skill-name>/SKILL.md` と `.qfai/assistant/skills.local/` を追加（experimental: prompt の thin wrapper）

### Changed

- init: `assistant/skills.local` を `qfai init --force` の上書き対象から保護
- verify-pack: `assistant/skills` / `assistant/skills.local` の生成を検証
- repo: パッケージバージョンを 1.3.5 に更新

## [1.3.4] - 2026-02-05

### Changed

- validate: requirements コンテキスト段階導入メッセージのバージョン表記を v1.3.4 に更新
- repo: パッケージバージョンを 1.3.4 に更新

## [1.3.3] - 2026-02-05

### Added

- templates: change classification（Primary/Tags）判断基準の SSOT を追加（`.qfai/assistant/instructions/change-classification.md`）

### Changed

- docs/templates: README と `.qfai/README.md` に change classification 参照を追加
- prompts: `qfai-spec` / `qfai-verify` に Primary/Tags の必須化を追加
- templates: `specs/README.md` に Primary/Tags メタデータとガイドを追加
- repo: PR テンプレに Primary/Tags のセクションを追加

## [1.3.2] - 2026-02-05

### Added

- validate: requirements コンテキスト（glossary/actors/business-flows）と Coverage Map の段階導入チェックを追加（QFAI-REQCTX-000/001/002/003/004/010）
- config: `paths.requireDir`（デフォルト `.qfai/require`）を追加
- tests: requirements コンテキスト検証のユニットテストを追加

### Changed

- templates: `qfai.config.yaml` に `paths.requireDir` を追記
- docs: README の config 例に `requireDir` を追記

## [1.3.1] - 2026-02-04

### Added

- prompts: legacy entrypoint 向け prompt（`qfai-scenario-test` / `qfai-unit-test` / `qfai-implement` / `qfai-pr`）を追加
- templates: legacy entrypoint 向け wrapper（`.github/prompts` / `.claude/commands` / `.codex/skills`）を追加
- templates: `.qfai/require/require.md` テンプレを追加
- templates: `.qfai/discussions/README.md` を追加
- templates: `require/glossary.md` / `require/actors.md` / `require/business-flows.md` を追加
- instructions: `assistant/instructions/requirements-decomposition.md` を追加

### Changed

- docs: README を npm EN v1.0.7 の内容に整合（root/package 同期）し、設定例を現行スキーマに整合
- templates: `.qfai/README.md` / `require/README.md` を要求分解と Coverage Map に整合
- prompts: `/qfai-discuss` / `/qfai-require` / `/qfai-spec` を ACT/BF/TERM と Coverage Map に整合

## [1.3.0] - 2026-02-04

### Added

- validate: delta.md の Change Type（primary/tags）と Decision Records の do_not/temptation 欠落警告を追加（QFAI-DELTA-201〜204）
- tests: Change Type 警告のユニットテストを追加

### Changed

- templates: delta.md の Change Log テンプレートに Change Type と rejected 補強（do_not/temptation）を追加
- prompts/instructions: 作業開始時に Change Type を宣言する運用を追加
- docs: PR テンプレに Change Type / Compatibility / delta.md 更新点を追加

## [1.2.14] - 2026-02-03

### Added

- prompts: /qfai-atdd の Coverage Ledger 必須化、sub-agent 必須、Stage Gates/DoD/差戻し条件を強化
- prompts: /qfai-prototyping・/qfai-tdd-green の Runtime Gate を必須化、/qfai-tdd-red の TDD Ledger を必須化
- prompts: /qfai-require・/qfai-spec の未定義/OQ 検知とユーザー質問を必須化、/qfai-discuss の事前調査を必須化
- agents: Orchestrator / ATDD Implementers / Reviewer / Runtime Gatekeeper / Doc Steward / Test Volume Estimator を追加
- templates: evidence の階層化パスと命名規則を追加、traceability matrix に status 列を追加
- validate: traceability-matrix の status 列検証を追加

### Changed

- docs: README の ATDD 説明と sub-agent 必須化を更新
- instructions: agent-selection の委譲マップを新ロールに整合

## [1.2.13] - 2026-02-01

### Added

- prompts: inputs の優先順位（instructions/steering/delta）と rejected ガード、DONE 宣言の必須情報を全プロンプトに追加
- agents: 全ロールに Preflight / rejected ガード / DR-ID 参照を追記
- validate: delta.md の最小構造検証（Change Log / Decision Records / 順序 / rejected）を追加
- tests: delta validator の新規検証に対応するユニットテストを追加

### Changed

- templates: `.qfai/specs/README.md` の delta.md 契約を Change Log + Decision Records + RE-OPEN へ更新
- prompts: qfai-spec の delta.md 要件を新契約に整合し、qfai-discuss/qfai-require に意思決定ログ前提を追記
- docs: README のワークフロー説明に delta 参照/RE-OPEN の前提を追記

## [1.2.12] - 2026-01-31

### Added

- prompts: 完了契約に OQ/placeholder スキャンと成果物の全量チェックを追加（全プロンプト共通）

### Changed

- なし

## [1.2.11] - 2026-01-31

### Added

- agents: OptionExplorer / OptionReviewer ロールを追加（delta の案出し/レビュー）
- agents: UI/UX Reviewer ロールを追加（UI レイアウト健全性のレビュー）
- templates: specs/README の delta.md テンプレートを拡張（Decision Summary / Considered Options / Selection Criteria / Chosen・Rejected / Contract Trace）

### Changed

- prompts: qfai-spec に OptionExplorer / OptionReviewer の作業順と必須セクションを追記
- prompts: qfai-prototyping に Runtime Interaction Gate と UI レイアウトガードレールを追加
- prompts: qfai-tdd-green の Runtime Interaction Gate と UI レイアウト健全性チェックを強化
- instructions: agent-selection の委譲マップを v1.2.11 の新ロールに整合

## [1.2.10] - 2026-01-31

### Added

- prompts: qfai-require/qfai-spec に OQ ハーベストと問診ループを追加
- agents: OQHarvester / OQReviewer ロールを追加
- templates: require に open-questions 台帳を追加

### Changed

- prompts: Open=0 をデフォルト完了条件にし、Deferred にはユーザー承認の証跡を必須化
- prompts: qfai-spec の未定義潰しを require 相当のヒアリングとして内包

## [1.2.9] - 2026-01-31

### Added

- prompts: qfai-discuss に事前知識収集フェーズ（Researcher 委任）を追加
- agents: Researcher ロールカードを追加

### Changed

- prompts: qfai-discuss の質問設計を「全量ドラフト→1問ずつ（総数/番号表示、3択+おまかせ）」に更新
- prompts: qfai-discuss の Evidence に収集メモ/質問設計根拠の記録を追加
- docs: qfai-discuss の説明と委任ルールを更新

## [1.2.8] - 2026-01-30

### Changed

- templates: `.qfai/**/README.md` の構成説明をツリー表記に統一

## [1.2.7] - 2026-01-30

### Added

- prompts: `/qfai-prototyping` を追加（契約からの最小実行可能スケルトン実装フェーズ）
- prompts: 全プロンプトに FORMAT SSOT (Mandatory) セクションを追加（README-as-SSOT for formatting）
- templates: `.qfai/**/README.md` に正規テンプレートとサンプルを追加
- templates: `specs/README.md` に spec.md/delta.md/scenario.feature/case-catalogue.md/traceability-matrix.md の完全テンプレートを追加

### Changed

- prompts: 全プロンプトで `.qfai/**/README.md` をフォーマットの単一の情報源として参照するよう更新
- templates: `.qfai/README.md` に推奨ワークフローシーケンス（prototyping フェーズ含む）を追加
- docs: README に `/qfai-prototyping` を推奨シーケンスに追加

## [1.2.6] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence/FINAL CHECKLIST）を水平展開
- prompts: Evidence を `.qfai/evidence/` に統一し、Git 管理外（.gitignore 同梱）を明記
- agents: 全ロールカードに Mission/Inputs/Deliverables/Stop/Sign-off を追加
- init: `.qfai/evidence/.gitignore` を同梱し、Evidence を自動で追跡対象外に
- tests: assets guardrails で Evidence .gitignore を検査

## [1.2.5] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence 要求）を追加
- prompts: qfai-tdd-green に契約→実装スコープ表、ステージゲート、Runtime Smoke を追加
- prompts: qfai-tdd-green に evidence テンプレートを追加
- init: `.qfai/evidence` をテンプレート構成に追加
- tests: prompts の必須セクションを assets guardrails でスモーク検証

### Changed

- prompts: qfai-tdd-green をオーケストレーター主導の完了分離フローに強化

## [1.2.4] - 2026-01-28

### Added

- traceability: .feature の @SC-XXXX-XXXX をテスト証跡として収集
- traceability: layer-aware enforcement と deferred info を追加
- config: traceability.testFileGlobs に `features/**/*.feature` を追加
- prompts: qfai-atdd / qfai-tdd-\* に Coverage Ledger と完了条件を追加
- prompts: qfai-spec の粒度ガイドを更新（1BR=1ルール＋分割）
- agents: Coverage Ledger 監査と差し戻し条件を追加

### Changed

- traceability: SC 未参照の出力を layer 付き + サンプル上限化
- docs: README / templates の説明を更新

## [1.2.3] - 2026-01-27

### Added

- config: testStrategy に requireLayerTags / requireSizeTags / maxE2eScenarioRatio / maxE2eScenarioCount を追加

### Changed

- validate: Spec が契約 ID を列挙しているのに Scenario が none の場合は warning を追加
- report: e2e 比率/上限のガードレール表示を追加

## [1.2.2] - 2026-01-27

### Added

- prompts: qfai-atdd / qfai-tdd-red / qfai-tdd-green / qfai-tdd-refactor を追加

### Changed

- prompts/docs: qfai-scenario-test / qfai-unit-test / qfai-implement を廃止し、新ワークフローへ更新

## [1.2.1] - 2026-01-27

### Added

- scenario: @layer-_/@size-_ タグの検証を追加（opt-in + 集約出力）
- report: layer/size 分布と未設定一覧を追加
- spec: case-catalogue / traceability-matrix の検証を追加
- traceability: Scenario の contract-ref subset 検証を追加

### Changed

- report: scenarios を scenario.feature のファイル数ではなく総シナリオ数で集計

## [1.2.0] - 2026-01-26

### Added

- ids: AC/CASE のフォーマット検証と Spec Pack 間の重複検知を追加
- traceability: scenario.feature 内の SC 重複検出（QFAI-TRACE-035）を追加

### Changed

- traceability: scenario.feature の複数 Scenario/Outline を許容し、Spec:SC=1:1 の制約を撤廃
- prompts/docs: Spec Pack ガイドと qfai-spec を複数シナリオ対応に更新
- report/tests: 新ルールに合わせてレポート/テストを更新

## [1.1.11] - 2026-01-26

### Changed

- prompts: qfai-unit-test をテスト実装専用に固定し、完了条件をテスト実行ベースへ更新
- prompts: qfai-implement を実装専用に固定し、runnable 証拠の明示とテスト責務分離を強化
- tests: assets guardrails に qfai-unit-test / qfai-implement の必須フレーズ検証を追加

## [1.1.10] - 2026-01-25

### Changed

- prompts: qfai-unit-test にテスト専用の範囲制約とブロック条件/DoD を追加
- prompts: qfai-implement に runtime evidence 必須化と禁止完了条件を追加
- agents: Unit Test Scope Enforcer / Runtime Gatekeeper のロールカードとラッパーを追加

## [1.1.9] - 2026-01-24

### Changed

- ids: Spec内ローカル連番に合わせて BR/SC ID フォーマットを更新
- traceability: SC/BR タグとテストアノテーションの検出を新形式へ対応
- prompts: qfai-discuss/qfai-spec/qfai-scenario-test を v1.1.9 方針に合わせて強化
- agents: 多層レビュー向けの役割カードを追加
- docs: 命名規約と例示の ID 形式を更新

## [1.1.8] - 2026-01-23

### Changed

- init: `.qfai` テンプレートから指定 README と require.md を削除し、report は実行時生成へ統一
- init: テンプレート Markdown を英語・汎用化（日本語/日付/版表記を除去）
- prompts: README 非編集ルールを全プロンプトへ拡張
- prompts: qfai-require の require.md 自動作成と安定テンプレ遵守を明記
- prompts: qfai-spec に要求/契約の事前準備を追加し、gate 実行条件を明確化
- tests: init 期待ファイル/プロンプト整合テストを更新し、英語-only ガードレールを追加

## [1.1.7] - 2026-01-23

### Changed

- init: `.qfai` 配下の全 README.md を全面刷新 — 意義/背景、配置可否、構造例、テンプレ、完成例、チェックリストを統一フォーマットで記載
- prompts: qfai-discuss / qfai-require / qfai-spec に README rule（README は編集せず参照のみ）を追加
- agents: 主要エージェントに README rule を追加

## [1.1.6] - 2026-01-22

### Changed

- prompts: qfai-spec に Contracts First の順序強制（contracts完成→FIX→specs作成）を追加
- prompts: qfai-spec の Hard Constraints を強化（1ファイル=1シナリオ、BR=1、許可カテゴリ api/db/ui のみ、samples生成禁止）
- prompts: qfai-discuss のコンセプト/NFR/方針必須化と discussions 保存を強化
- agents: contract-designer に UI/API/DB 必須成果物の強制と禁止事項（infra、YAML中のMarkdown混入）を追加
- tests: assets テストにプロンプト退行防止チェック（キーフレーズ存在検証）を追加

## [1.1.5] - 2026-01-21

### Changed

- prompts: qfai-spec に定量ガードレール（1 spec pack = 1シナリオ、ID形式、BR上限、contractRef必須）を追加
- prompts: qfai-spec の delta.md に Decision Log（候補→採用/不採用/保留）を必須化
- prompts: qfai-spec に discuss 記録参照を必須化し、最終ゲート（validate + repo gates）を作業完了条件に明記
- prompts: qfai-discuss にコンセプト/NFR/方針の必須化と `.qfai/discussions/discuss-XXXX.md` 保存を追加
- prompts: qfai-scenario-test に事前チェック（単一シナリオ確認）と SC 注釈ルール、最終ゲートを追加
- prompts: qfai-unit-test に SC 注釈ルールと最終ゲートを追加
- prompts: qfai-implement に最終ゲートを明記
- prompts: qfai-verify と qfai-require に最終ゲートを明記

## [1.1.4] - 2026-01-20

### Changed

- init: `.qfai/samples/**` の生成を撤廃し、Decision Guardrails の例を README 内のインライン例へ移行
- prompts: qfai-spec の delta.md テンプレートに Decision Table / Decision Guardrails を追加
- prompts: qfai-implement に delta の decision log 参照を必須化
- verify-pack: guardrails extract のスモークを合成 delta で実施
- docs: README の guardrails 説明を samples 依存から切り離し、ツリー記述も更新

## [1.1.3] - 2026-01-20

### Added

- init: `.github/agents` と `.claude/agents` にサブエージェント wrapper を追加（.qfai の role card 参照）

## [1.1.2] - 2026-01-20

### Changed

- prompts: qfai-spec に preflight（config/steering 収束保証）を追加
- prompts: qfai-configure に qfai-spec preflight の注記を追加
- docs: README に qfai-spec preflight の注記とフロー補足を追加

## [1.1.1] - 2026-01-19

### Changed

- docs: v1.0.14 実体に合わせ、v1.1.0 設計資料へ v1.1.1 addendum を追記
- init: `.qfai/README.md` の Template version を撤去し、テンプレ内 semver を排除
- init: `steering/manifest.md` と steering/specs の導線を v1.1.1 方針に整合
- prompts: qfai-configure に manifest 補完の evidence/assumptions を明記
- repo: PR テンプレに Manifest / Decision Guardrails の確認項目を追加

## [1.1.0] - 2026-01-19

### Added

- guardrails: Decision Guardrails の抽出/検査/整形 CLI を追加
- guardrails: delta.md の Decision Guardrails サンプルを同梱（opt-in）
- report: Decision Guardrails の集計章を追加
- doctor: Decision Guardrails の導入状況チェックを追加
- tests: guardrails のパース/CLI/verify-pack を追加

### Changed

- init: steering をフラット化し、manifest の参照を一意化
- prompts: qfai-configure に steering 自動補完ステップを追加
- verify-pack: guardrails extract のスモークを追加
- init: `.qfai/README.md` の Template version を明示（唯一の例外として許可）

## [1.0.14] - 2026-01-19

### Added

- tests: add guardrails to ensure init workflow does not rely on lockfile caching

### Changed

- init: remove cache settings from generated GitHub Actions workflow
- docs: clarify that the default workflow avoids dependency caching and show optional setup-node cache snippet

## [1.0.13] - 2026-01-18

### Changed

- init: remove npm ci from generated GitHub Actions workflow
- init: keep validate gate runnable without repository dependency install
- docs: align CI description with the generated workflow

## [1.0.12] - 2026-01-18

### Changed

- init: remove hard-coded version labels from init kit docs
- init: use meaning labels in contract docs

## [1.0.11] - 2026-01-18

### Changed

- prompts: remove orphan reference to /qfai-pr from qfai-verify
- tests: add guardrail to ensure prompt bodies do not reference missing /qfai-\* commands

## [1.0.10] - 2026-01-18

### Changed

- init: remove orphan prompt `qfai-pr` from `.qfai/assistant/prompts`
- tests: add guardrail test to ensure prompt bodies and agent wrappers are aligned

## [1.0.9] - 2026-01-18

### Changed

- spec: BR 抽出を固定セクション依存から全体走査に変更
- config: `validation.require.specSections` の既定値を空配列に変更
- docs: specSections の任意設定と /qfai-configure の推奨フローを追記

## [1.0.8] - 2026-01-18

### Changed

- docs: README の設定スキーマ例を実装に合わせて修正

## [1.0.7] - 2026-01-16

### Added

- init: `qfai-configure` プロンプトを追加
- init: Copilot / Claude Code / Codex 向けのラッパー資産を追加

### Changed

- docs: README を英語版に刷新し、npm README と同期
- verify-pack: init 資産の検証対象を拡張

## [1.0.6] - 2026-01-14

### Added

- assistant assets: instructions set expanded (thinking/communication/quality/agent-selection)

### Changed

- init: remove root tests sample
- contracts: DB is SQL
- docs: .qfai README clarity improvements

## [1.0.5] - 2026-01-12

### Added

- init: `.qfai/assistant/**` を同梱（instructions/steering/prompts/agents）

### Changed

- Breaking: `.qfai/out/` を廃止し、`.qfai/report/` に統一
- Breaking: `.qfai/prompts/` を `.qfai/assistant/prompts/` に移動
- Breaking: `qfai analyze` と analyze 資産を廃止
- init: `.qfai` テンプレ構成を v1.0.5 へ刷新（assistant 資産を SSOT 化）

## [1.0.4] - 2026-01-10

### Changed

- `qfai init` から `.qfai/rules/**` と `.qfai/samples/**` を削除（導入を簡素化）
- `delta.md` の「変更区分（Compatibility/Change）」チェック運用を撤廃（テスト/QA ゲートへ移行）
- `promptpack` / `prompts` / docs から分類ルールの参照を削除

### Fixed

- doctor の path checks から `rulesDir` を削除
- report のガイダンス文言を更新

## [1.0.3] - 2026-01-10

### Added

- thema 契約（`thema-*.yml`）を導入
- UI 契約に `themaRef` / `themeOverrides` / `assets` を追加
- validate に assets 参照整合チェックを追加（最小検証）

### Changed

- Breaking: Scenario は `scenario.feature` 固定（v1.0.2 で導入済みのため再掲）
- Breaking: `scenario.md` は v1.0.3 から error（自動救済なし）
- 移行: `scenario.md` を `scenario.feature` にリネームし、参照スクリプトも更新
- 補足: v1.0.2 が変更の初出、v1.0.3 で `scenario.md` の拒否挙動を追加

## [1.0.2] - 2026-01-09

### Added

- なし

### Changed

- Breaking: Spec Pack の Scenario ファイルを `scenario.feature` に変更（旧拡張子は非対応）
- docs: Spec Pack の例・命名規約・PRテンプレ等を `scenario.feature` に統一
- docs: 破壊的変更の例外運用（minor/patch での実施）を明記
- tests/pack: init テンプレと配布物検証を `scenario.feature` 前提に更新
- tests: fs glob のパス表記差を吸収するため比較を正規化

## [1.0.1] - 2026-01-09

### Added

- report: `--base-url` を追加し、report.md 内のファイルパスをリンク化可能に
- core: glob 走査の上限ガードレール（20000件で打ち切り + warning）
- ci: Node 20 の検証ジョブを追加

### Changed

- core: testFileGlobs 走査に truncated/limit を追加
- docs: Node.js の Supported/Tested/Recommended を明記
- docs: report.json / doctor.json の内部表現方針を明文化

## [1.0.0] - 2026-01-08

### Added

- verify:pack: analyze の `--list` / `--prompt spec_to_scenario` を配布物ゲートに追加
- ci: analyze の CLI スモークを追加
- tests: root README と npm README の一致チェックを追加

### Changed

- docs: v1.0.0 向けに README/RELEASE/CHANGELOG を整合

## [0.9.2] - 2026-01-07

### Added

- tests: npm README の初日導線/インストール/参照整合のガードレールを追加

### Changed

- docs: README の初日導線を init→doctor→validate→report に統一
- docs: npm README のインストール案内を dev dependency 前提に修正
- docs: npm README の docs/\*\* 参照を GitHub リンクへ置換

## [0.9.1] - 2026-01-07

### Added

- cli: `qfai analyze` を追加（`--list` / `--prompt <name>`）
- init: analyze 用の入力バンドル例を `.qfai/samples/analyze/input_bundle.md` に同梱（create-only）

### Changed

- init: analyze 用標準プロンプトの雛形/命名を改善

## [0.9.0] - 2026-01-07

### Added

- init: analyze 用の標準プロンプトを `.qfai/prompts/analyze/**` に同梱
- init: analyze 実施ログのテンプレートを `.qfai/samples/analyze/analysis.md` に同梱（create-only）

### Changed

- docs: analyze の目的/使い方/注意事項を追記

## [0.8.2] - 2026-01-07

### Fixed

- docs: init/--force の挙動説明を実装契約に一致させ、specs/contracts 破壊の誤誘導を解消
- cli: init 実行時に `--force` の適用範囲（prompts のみ）を明示

### Added

- tests: init の overwrite/create-only 契約を回帰テストで固定

## [0.8.1] - 2026-01-07

### Added

- validate: issue に category（compatibility/change）と suggested_action を追加
- doctor: `.qfai/prompts` の整合性チェック（標準 assets との差分検出）を追加

### Changed

- init: `.qfai/prompts` のみ `--force` で上書き（それ以外は create-only）
- validate: `.qfai/prompts` 直編集（標準資産改変）を error として検出
- report.md: Dashboard + カテゴリ別章 + issue カード形式に変更
- docs: validate.json schema/examples に category/suggested_action を反映

## [0.8.0] - 2026-01-07

### Added

- verify:pack: `.qfai/prompts.local/**` が `init --force` でも上書きされないことを回帰で検証
- validate: GitHubサマリに failOn/result を出力し、次アクション（report生成）を案内

### Changed

- report.md: Summary / Findings / Guidance に再構成し、Issue集計・安定ソート・fail-on根拠を明示
- docs: 初日導線（init→doctor→validate→report）の整合、prompts.local保護対象の明記
- validate: 代表的なエラーメッセージを具体化（例/次アクションを明示）

## [0.7.3] - 2026-01-06

### Added

- LICENSE を追加（repo root + packages/qfai、npm tarball に同梱）

### Changed

- packages/qfai: package.json のメタデータを補完（license/description/repository 等）
- verify:pack: packed artifact に LICENSE/README.md が含まれることを検査

## [0.7.2] - 2026-01-06

### Changed

- packages/qfai: パッケージメタデータ修正のため v0.7.2 として再リリース（version フィールド整合）

## [0.7.1] - 2026-01-06

### Added

- Prompts Overlay を採用（`.qfai/prompts.local/**` を優先参照する運用）

### Changed

- `init` は `.qfai/prompts.local/**` を上書きしない（利用者カスタム領域を保護）
- `doctor` に `.qfai/prompts.local` の存在を情報として出力

### Removed

- `qfai sync`（PromptPack 差分検知・export）を撤去（overlay 方針へ一本化）

## [0.7.0] - 2026-01-05

### Added

- `qfai sync` を追加（PromptPack の差分検知・同期候補書き出し）
- `--mode check`: 同梱アセットとの差分を検出（exit 0=差分なし、1=差分あり、2=エラー）
- `--mode export`: 同期候補を非破壊でエクスポート
- `--out <path>`: export の出力先
- `--format <text|json>`: 出力形式

### Changed

- なし

## [0.6.3] - 2026-01-05

### Changed

- docs: 回数ベースの完了基準を削除し、DoD/CI 基準に統一
- docs: README の JSON 例から version フィールドを削除
- docs: README にバッジ・目次・インストールセクション・ライセンスセクションを追加
- docs: npm パッケージ README をルート README と同期

## [0.6.2] - 2026-01-05

### Added

- doctor に `--fail-on` を追加（warning/error で exit 1）
- doctor に monorepo outDir 衝突検出（`--root` 指定時のみ）
- CI と verify:pack に doctor スモークを追加

### Changed

- report/doctor JSON から formatVersion を削除
- README/ドキュメントに非契約方針とレビュー完了基準を追記

## [0.6.1] - 2026-01-05

### Changed

- doctor のチェック出力順を config→paths→spec→output→traceability に整合
- README に doctor JSON / report.json の非契約方針と短い例を追記

## [0.6.0] - 2026-01-05

### Added

- `qfai doctor` を追加（設定/探索/パス/glob/validate.json の事前診断）

### Changed

- `report --format json` に `reportFormatVersion` を追加

## [0.5.2] - 2026-01-04

### Added

- `report --run-validate` / `report --in` を追加
- `qfai.config.yaml` の自動探索（cwd から親へ）
- `test:assets` と CI での assets/Docs スモーク検証

### Changed

- `validate --format github` のアノテーション上限・重複排除・サマリ出力
- report の Spec キーを specId 固定にし、出力パスは root 相対化
- PromptPack と docs/examples の運用ガイドを更新（非契約/experimental 明記）

## [0.5.1] - 2026-01-04

### Added

- Scenario の 1ファイル=1シナリオ検証（`QFAI-TRACE-030`）を追加
- report で Spec→契約の missing/none を区別し、全 Spec を出力

### Changed

- Scenario の契約参照を `# QFAI-CONTRACT-REF:` コメント宣言に統一（タグ抽出を廃止）
- issue code を `QFAI-TRACE-xxx` 形式へ正規化し、Spec の contract-ref エラーを `021/023/024` に分割
- orphan contract 設定を `allowOrphanContracts` から `orphanContractsPolicy` へ移行
- docs/examples・init テンプレートを新ルールに整合

## [0.5.0] - 2026-01-03

### Added

- report に Spec の contract-ref 未宣言一覧を追加
- トレーサビリティ/契約/変更区分の運用プロンプトを追加

### Changed

- report の契約→Spec / Spec→契約 表に (none)/(orphan) を明示
- PromptPack と README の導線・文言を v0.5.0 仕様に整合

## [0.4.9] - 2026-01-03

### Fixed

- README の `unknownContractIdSeverity` 説明を Scenario 側の契約参照に整合（Spec の未知契約は常に error）
- `prepack` を `npm run build` に変更し、pack の自己完結性を向上

## [0.4.8] - 2026-01-03

### Fixed

- npm pack/publish 時に dist が必ず生成されるようにし、壊れた成果物の生成を防止
- d.ts ビルドが monorepo 外でも成立しやすいように @types/node を追加

## [0.4.7] - 2026-01-03

### Fixed

- PromptPack/.instruction のトレーサビリティ文面を現行方針に整合（Spec→下流参照禁止は運用担保、Spec→Contract を SSOT）

## [0.4.6] - 2026-01-03

### Fixed

- init テンプレの contracts README を Spec/Contract ルールに整合（Spec の参照が SSOT、Scenario→Contracts は任意）

## [0.4.5] - 2026-01-03

### Added

- 契約ファイルの `QFAI-CONTRACT-ID` 宣言を必須化（1ファイル1ID）
- Spec の `QFAI-CONTRACT-REF` 宣言を必須化（`none` 可）
- 契約→Spec のカバレッジ検証（orphan contract）
- report に契約カバレッジと Spec/Contract マップを追加
- PromptPack と PR テンプレに Compatibility / Change の分類欄を追加

### Changed

- DATA ID を DB ID に統一（`DATA-xxxx` を無効化）
- 契約 ID の抽出を宣言行（SSOT）に統一（本文/operationId からの抽出を撤去）
- SC→契約の接続必須ルールを廃止
- init テンプレの Spec/Contract サンプルと README を新ルールに整合

## [0.4.2] - 2026-01-02

### Added

- テスト探索の glob 設定（`testFileGlobs` / `testFileExcludeGlobs`）を追加
- init テンプレートにテスト glob 生成プロンプトを追加
- validate/report にテスト探索のメタ情報（glob/除外/件数）を追加

### Changed

- SC→Test 判定を glob 設定に切替（未設定・一致0件は `QFAI-TRACE-013`）
- Scenario の SPEC/BR 欠落を `QFAI-TRACE-014/015` として検出
- Spec→Contract 参照の存在チェック（`QFAI-TRACE-009`）を廃止
- Spec:SC=1:1 で SC が 0 件の場合も error

## [0.4.1] - 2026-01-02

### Added

- SC→Test アノテーション方式（`QFAI:SC-xxxx`）と `tests/`・`src/` 探索を追加
- テスト側の未知 SC アノテーション検出（`QFAI-TRACE-011`）を追加
- Spec:SC=1:1 検証（`QFAI-TRACE-012`）を追加
- `validate.json` に SC→Test カバレッジを追加
- report に Spec:SC=1:1 違反一覧を追加

### Changed

- Scenario の複数記述を許容（参照 SC は同一）
- SCカバレッジの missing 表示に scenario ファイル情報を付与
- `QFAI-TRACE-002` を info に格下げ
- init テンプレートのテストサンプルをアノテーション方式に更新

## [0.4.0] - 2026-01-01

### Added

- SC→Test 参照のトレーサビリティ検証（`scMustHaveTest` / `scNoTestSeverity`）
- report に SC カバレッジと参照テスト一覧を追加
- init テンプレートに tests サンプルを追加

### Changed

- report の Markdown 出力に SC カバレッジセクションを追加

### Removed

- ロードマップ文書を削除

## [0.3.8] - 2026-01-01

### Changed

- validate/report の入出力から schemaVersion を廃止（後方互換破棄）
- docs/examples を現行例に一本化
- テスト/fixture を schemaVersion 廃止に追従

### Removed

- `docs/schema/validation-result.schema.json` から schemaVersion を削除

## [0.3.7] - 2026-01-01

### Changed

- （タグ整合のための追記）v0.3.7 は既にリリース済み

## [0.3.6] - 2026-01-01

### Changed

- `.instruction/02_project` を QFAI Toolkit 向けに更新し、誤誘導の元を除去
- `AGENTS.md` の参照ガイドとレビュー運用ルールを更新
- `docs/rules/naming.md` の版表記を削除
- README/RELEASE/テスト/パッケージのバージョン表記を更新

## [0.3.5] - 2025-12-31

### Added

- PromptPack を init テンプレートに追加（`.qfai/promptpack/`）
- `docs/promptpack.md` を追加

### Changed

- OQ表記の排除対象を「現行仕様として参照される場所」に限定する方針を明文化
- RELEASE/README の表記を更新（PromptPack 追記を含む）

## [0.3.4] - 2025-12-31

### Changed

- init で生成する require を `.qfai/require/` 配下へ移動（後方互換なし）

### Fixed

- PRテンプレのOQチェックリストを撤去し、決定事項チェックへ置換
- 命名規約の過去状態（OQ継続/版表記）を除去し、標準構成へ収束
- CHANGELOG の誤記（ADR検証表現）を修正

## [0.3.3] - 2025-12-31

### Added

- pnpm allowlist 運用ガイド（`.qfai/rules/pnpm.md`）をテンプレートに追加
- `.qfai/require/README.md` と require-to-spec プロンプト雛形をテンプレートに追加

### Changed

- README に「できること」セクションを追加
- init テストでテンプレート生成を検証
- 命名規約ドキュメントの版表記を更新

### Fixed

- init のテンプレート探索パスを明確化し、見つからない場合はエラーで通知

## [0.3.2] - 2025-12-31

### Added

- Gherkin 公式パーサ（@cucumber/gherkin）と Scenario モデルを追加
- Scenario 内の本文/DocString から契約 ID を抽出するトレーサビリティを追加
- Feature の SPEC タグ必須チェックと Scenario/Spec ファイルの存在チェックを追加

### Changed

- Spec Pack のディレクトリ名を `spec-0001`（4 桁）へ統一（`spec-001` など 3 桁は非対応）
- Spec Pack は `.qfai/specs` 直下のディレクトリのみサポート（ネスト構成を廃止）
- Scenario/ID/Traceability の解析を AST ベースへ刷新

## [0.3.1] - 2025-12-30

### Added

- Spec Pack（spec.md / delta.md / Scenario ファイル）のテンプレートと規約を追加
- delta.md の変更区分検証を追加
- Scenario 単位のタグ検証（SC 1件必須、Feature タグ継承）を追加

### Changed

- config スキーマを刷新（paths.\* / output.validateJsonPath）
- Scenario ファイルの配置を `specs/spec-xxx/` に統一
- validate は常に `validate.json` を出力し、report は固定パスを入力に使用
- init テンプレート/README/verify-pack を新構成に整合

### Removed

- decisions/ADR のバリデーションを除外

## [0.3.0] - 2025-12-30

### Added

- parse 層（Spec/Scenario/ADR）を導入し、構造解析を集約
- BR Priority（P0〜P3）の検証を追加
- Scenario の Feature/Scenario/タグ必須チェックを追加
- ADR パーサ（parseAdr）ユーティリティを追加

### Changed

- Spec 必須セクション判定を H2 見出しベースへ変更
- traceability の Spec→BR を BR 定義（業務ルール内）に限定
- init テンプレ/README を現行仕様へ整合

## [0.2.9] - 2025-12-29

### Added

- ContractIndex を導入し、契約 ID を共通収集（パース失敗時はテキスト抽出）
- 契約パース失敗時のノイズ低減テストを追加

### Changed

- traceability/duplicate 検証の契約 ID 収集を共通化
- init テンプレの固定表現を削除
- API サンプルから `x-qfai-refs` を撤去

## [0.2.8] - 2025-12-29

### Added

- Contract パース失敗/ID 未定義の検出（UI/API）
- Spec → Contract 参照の実在性チェック

### Changed

- report から rules 指標を削除
- `paths.rulesDir` を削除（互換不要）

## [0.2.7] - 2025-12-29

### Added

- Scenario 参照 ID の実在性チェック（SPEC/BR/Contract）
- BR が参照 SPEC に属するかの検証
- 定義 ID の重複検知（Spec/Scenario/Contracts）
- unknown Contract 参照の severity 設定（warning|error）

### Changed

- ID 形式を `PREFIX-0001` に厳格化
- 命名規約/テンプレートの説明を整合

## [0.2.6] - 2025-12-28

### Added

- .qfai 配下の README 群とガイドを追加（spec/contracts/prompts/out）
- Spec/Scenario/Contracts の最小例を刷新

### Changed

- init の生成先を `.qfai/` に統一
- 既定の探索/設定パスを `.qfai` 前提に更新
- Scenario の既定配置を `.qfai/spec/scenarios` に変更

### Removed

- legacy の `spec.md` 探索互換を削除

## [0.2.5] - 2025-12-28

### Added

- 命名規約ドキュメントを追加（docs/rules/naming.md）
- overview / Business Flow 生成用プロンプトをテンプレートに同梱

### Changed

- init テンプレートの Spec/Contracts サンプルを ID+slug 命名に変更
- validate/report/traceability の Spec 探索を `spec-0001-*.md` に対応

### Behavior

- legacy の `spec.md` は引き続き探索対象（後方互換維持）

## [0.2.4] - 2025-12-26

### Added

- CHANGELOG.md を追加
- RELEASE.md を追加

### Changed

- README の Quick Start を現行 CLI 挙動に整合
- validate/report の入出力と GitHub Actions テンプレート導線を明記

### Behavior

- No behavior change（validate/report/CLI の挙動は維持）

## [0.2.3] - 2025-12-25

### Changed

- report: validate.json 欠損時の案内と exit code 2
- init: 既存ファイル衝突時の --force 案内
- build: import.meta 警告の解消と警告ゲート追加
