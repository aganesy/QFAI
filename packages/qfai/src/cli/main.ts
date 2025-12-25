import { runInit } from "./commands/init.js";
import { runReport } from "./commands/report.js";
import { runValidate } from "./commands/validate.js";
import { parseArgs } from "./lib/args.js";
import { error, info } from "./lib/logger.js";

export async function run(argv: string[], cwd: string): Promise<void> {
  const { command, options } = parseArgs(argv, cwd);

  if (!command || options.help) {
    info(usage());
    return;
  }

  switch (command) {
    case "init":
      await runInit({
        dir: options.dir,
        force: options.force,
        dryRun: options.dryRun,
        yes: options.yes,
      });
      return;
    case "validate":
      process.exitCode = await runValidate({
        root: options.root,
        strict: options.strict,
        format: options.validateFormat,
        ...(options.failOn !== undefined ? { failOn: options.failOn } : {}),
        ...(options.jsonPath !== undefined
          ? { jsonPath: options.jsonPath }
          : {}),
      });
      return;
    case "report":
      await runReport({
        root: options.root,
        format: options.reportFormat,
        ...(options.jsonPath !== undefined
          ? { jsonPath: options.jsonPath }
          : {}),
        ...(options.reportOut !== undefined
          ? { outPath: options.reportOut }
          : {}),
      });
      return;
    default:
      error(`Unknown command: ${command}`);
      info(usage());
      return;
  }
}

function usage(): string {
  return `qfai <command> [options]

Commands:
  init       テンプレを生成
  validate   仕様/契約/参照の検査
  report     検証結果と集計を出力

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         既存ファイルを上書き
  --yes           init: 非対話でデフォルトを採用（現在は非対話が既定、将来の対話導入時も自動Yes）
  --dry-run       変更を行わず表示のみ
  --format <text|json|github>  validate の出力形式
  --format <md|json>           report の出力形式
  --strict              validate: warning 以上で exit 1
  --fail-on <error|warning|never>  validate: 失敗条件
  --json-path <path>     validate: JSON 出力先 / report: validate JSON 入力
  --out <path>           report: 出力先
  -h, --help      ヘルプ表示
`;
}
