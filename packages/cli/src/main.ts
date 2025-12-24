import { runInit } from "./commands/init.js";
import { runOnboard } from "./commands/onboard.js";
import { runStatus } from "./commands/status.js";
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
      await runInit(options);
      return;
    case "onboard":
      await runOnboard(options);
      return;
    case "validate":
      await runValidate({ root: options.root });
      return;
    case "status":
      await runStatus({ root: options.root });
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
  onboard    steering の雛形を生成
  validate   仕様/契約/参照の検査（warningのみ）
  status     成果物の欠落を表示

Options:
  --root <path>   対象ディレクトリ
  --force         既存ファイルを上書き
  --dry-run       変更を行わず表示のみ
  -h, --help      ヘルプ表示
`;
}
