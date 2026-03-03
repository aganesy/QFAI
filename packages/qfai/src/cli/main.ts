import { runDoctor } from "./commands/doctor.js";
import { runGuardrails } from "./commands/guardrails.js";
import { runInit } from "./commands/init.js";
import { runPrototyping } from "./commands/prototyping.js";
import { runReport } from "./commands/report.js";
import { runValidate } from "./commands/validate.js";
import { parseArgs } from "./lib/args.js";
import { error, info, warn } from "./lib/logger.js";
import { findConfigRoot } from "../core/config.js";

export async function run(argv: string[], cwd: string): Promise<void> {
  const { command, invalid, options } = parseArgs(argv, cwd);

  if (!command || options.help) {
    info(usage());
    if (invalid) {
      process.exitCode = options.invalidExitCode;
    }
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
      {
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runValidate({
          root: resolvedRoot,
          strict: options.strict,
          format: options.validateFormat,
          ...(options.phase ? { phase: options.phase } : {}),
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
          ...(options.reportOut !== undefined ? { outPath: options.reportOut } : {}),
          ...(options.reportIn !== undefined ? { inputPath: options.reportIn } : {}),
          ...(options.reportBaseUrl !== undefined ? { baseUrl: options.reportBaseUrl } : {}),
          ...(options.reportRunValidate ? { runValidate: true } : {}),
          ...(options.phase ? { phase: options.phase } : {}),
        });
      }
      return;
    case "doctor":
      {
        const exitCode = await runDoctor({
          root: options.root,
          rootExplicit: options.rootExplicit,
          format: options.doctorFormat,
          ...(options.doctorOut !== undefined ? { outPath: options.doctorOut } : {}),
          ...(options.failOn && options.failOn !== "never" ? { failOn: options.failOn } : {}),
        });
        process.exitCode = exitCode;
      }
      return;
    case "guardrails":
      {
        const resolvedRoot = await resolveRoot(options);
        const exitCode = await runGuardrails({
          root: resolvedRoot,
          ...(options.guardrailsAction ? { action: options.guardrailsAction } : {}),
          paths: options.guardrailsPaths,
          ...(options.guardrailsMax !== undefined ? { max: options.guardrailsMax } : {}),
          ...(options.guardrailsKeyword !== undefined
            ? { keyword: options.guardrailsKeyword }
            : {}),
        });
        process.exitCode = exitCode;
      }
      return;
    case "prototyping":
      {
        const resolvedRoot = await resolveRoot(options);
        const exitCode = await runPrototyping({
          root: resolvedRoot,
          autogenUiFidelity: options.prototypingAutogen,
          autogenOnly: options.prototypingAutogenOnly,
          ...(options.prototypingBaseUrl !== undefined
            ? { baseUrl: options.prototypingBaseUrl }
            : {}),
          ...(options.prototypingEvidenceOut !== undefined
            ? { evidenceOut: options.prototypingEvidenceOut }
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
  init        テンプレを生成
  validate    仕様/契約/参照の検査
  report      検証結果と集計を出力
  doctor      設定/パス/出力前提の診断
  guardrails  Decision Guardrails の抽出/検査（list|extract|check）
  prototyping uiFidelity evidence の自動生成

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         init: .qfai/assistant/skills と publish 先 skills のみ上書き（それ以外は既存があればスキップ）
  --yes           init: 予約フラグ（現状は非対話のため挙動差なし。将来の対話導入時に自動Yes）
  --dry-run       変更を行わず表示のみ
  --format <text|github>       validate の出力形式
  --format <md|json>           report の出力形式
  --format <text|json>         doctor の出力形式
  --strict                     validate: warning 以上で exit 1
  --phase <full|atdd|tdd|refinement>       validate/report: 検証フェーズを指定
  --fail-on <error|warning|never>  validate: 失敗条件
  --fail-on <error|warning>        doctor: 失敗条件
  --out <path>                  report/doctor: 出力先
  --in <path>                   report: validate.json の入力先（configより優先）
  --run-validate                report: validate を実行してから report を生成
  --base-url <url>              report/prototyping: 基準URL
  --path <path>                 guardrails: 対象ファイル/ディレクトリ（複数指定可）
  --max <number>                guardrails extract: 最大件数
  --keyword <text>              guardrails list/extract: キーワードフィルタ
  --autogen-ui-fidelity         prototyping: uiFidelity 自動生成を有効化
  --autogen-only                prototyping: 自動生成のみ実行（失敗時exit 1）
  --evidence-out <path>         prototyping: 出力先（デフォルト .qfai/evidence/prototyping.json）
  -h, --help      ヘルプ表示

Environment:
  QFAI_PROTOTYPE_FIDELITY_AUTOGEN=1   prototyping: --autogen-ui-fidelity と同等
  QFAI_PROTOTYPE_BASE_URL=<url>       prototyping: --base-url と同等
`;
}

async function resolveRoot(options: { root: string; rootExplicit: boolean }): Promise<string> {
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
