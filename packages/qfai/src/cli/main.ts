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
      });
      return;
    case "validate":
      await runValidate({ root: options.root });
      return;
    case "report":
      await runReport({ root: options.root, format: options.format });
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
  validate   仕様/契約/参照の検査（warningのみ）
  report     検証結果と集計を出力

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         既存ファイルを上書き
  --dry-run       変更を行わず表示のみ
  --format <md|json>  report の出力形式
  -h, --help      ヘルプ表示
`;
}
