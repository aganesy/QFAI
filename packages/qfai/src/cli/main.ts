import { runAnalyze } from "./commands/analyze.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runReport } from "./commands/report.js";
import { runValidate } from "./commands/validate.js";
import { parseArgs } from "./lib/args.js";
import { error, info, warn } from "./lib/logger.js";
import { findConfigRoot } from "../core/config.js";

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
    case "analyze":
      {
        const resolvedRoot = await resolveRoot(options);
        const exitCode = await runAnalyze({
          root: resolvedRoot,
          list: options.analyzeList,
          ...(options.analyzePrompt !== undefined
            ? { prompt: options.analyzePrompt }
            : {}),
        });
        process.exitCode = exitCode;
      }
      return;
    case "validate":
      {
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runValidate({
          root: resolvedRoot,
          strict: options.strict,
          format: options.validateFormat,
          ...(options.failOn !== undefined ? { failOn: options.failOn } : {}),
        });
      }
      return;
    case "report":
      {
        const resolvedRoot = await resolveRoot(options);
        await runReport({
          root: resolvedRoot,
          format: options.reportFormat,
          ...(options.reportOut !== undefined
            ? { outPath: options.reportOut }
            : {}),
          ...(options.reportIn !== undefined
            ? { inputPath: options.reportIn }
            : {}),
          ...(options.reportRunValidate ? { runValidate: true } : {}),
        });
      }
      return;
    case "doctor":
      {
        const exitCode = await runDoctor({
          root: options.root,
          rootExplicit: options.rootExplicit,
          format: options.doctorFormat,
          ...(options.doctorOut !== undefined
            ? { outPath: options.doctorOut }
            : {}),
          ...(options.failOn && options.failOn !== "never"
            ? { failOn: options.failOn }
            : {}),
        });
        process.exitCode = exitCode;
      }
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
  analyze    意味レベルのレビュー補助（プロンプト出力）
  validate   仕様/契約/参照の検査
  report     検証結果と集計を出力
  doctor     設定/パス/出力前提の診断

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         init: .qfai/prompts のみ上書き（それ以外は既存があればスキップ）
  --yes           init: 予約フラグ（現状は非対話のため挙動差なし。将来の対話導入時に自動Yes）
  --dry-run       変更を行わず表示のみ
  --list                     analyze: 利用可能なプロンプト一覧を表示
  --prompt <name>             analyze: 指定プロンプト（.md省略可）を出力
  --format <text|github>       validate の出力形式
  --format <md|json>           report の出力形式
  --format <text|json>         doctor の出力形式
  --strict                     validate: warning 以上で exit 1
  --fail-on <error|warning|never>  validate: 失敗条件
  --fail-on <error|warning>        doctor: 失敗条件
  --out <path>                  report/doctor: 出力先
  --in <path>                   report: validate.json の入力先（configより優先）
  --run-validate                report: validate を実行してから report を生成
  -h, --help      ヘルプ表示
`;
}

async function resolveRoot(options: {
  root: string;
  rootExplicit: boolean;
}): Promise<string> {
  if (options.rootExplicit) {
    return options.root;
  }

  const search = await findConfigRoot(options.root);
  if (!search.found) {
    warn(
      `qfai: qfai.config.yaml が見つからないため defaultConfig を使用します (root=${search.root})`,
    );
  }
  return search.root;
}
