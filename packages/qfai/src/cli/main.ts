import { runDoctor } from "./commands/doctor.js";
import { runGuardrails } from "./commands/guardrails.js";
import { runInit } from "./commands/init.js";
import { runPrototypingIterate } from "./commands/prototypingIterate.js";
import { runPrototypingCertify, runPrototypingShowSpec } from "./commands/prototypingCertify.js";
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
        upgradeAssistantTree: options.upgradeAssistantTree,
      });
      return;
    case "validate":
      {
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runValidate({
          root: resolvedRoot,
          strict: options.strict,
          format: options.validateFormat,
          ...(options.profile ? { profile: options.profile } : {}),
          ...(options.failOn !== undefined ? { failOn: options.failOn } : {}),
          ...(options.platform ? { platform: options.platform } : {}),
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
          ...(options.profile ? { profile: options.profile } : {}),
        });
      }
      return;
    case "doctor":
      {
        if (options.profile && options.profile !== "prototyping") {
          error("qfai doctor: only --profile prototyping is supported.");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const exitCode = await runDoctor({
          root: options.root,
          rootExplicit: options.rootExplicit,
          format: options.doctorFormat,
          ...(options.doctorOut !== undefined ? { outPath: options.doctorOut } : {}),
          ...(options.failOn && options.failOn !== "never" ? { failOn: options.failOn } : {}),
          ...(options.profile === "prototyping" ? { profile: "prototyping" as const } : {}),
          ...(options.profile === "prototyping" && options.prototypingTargetUrl
            ? { targetUrl: options.prototypingTargetUrl }
            : {}),
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
        if (!options.prototypingAction) {
          error(
            "qfai prototyping: unknown or missing subcommand. Expected: preflight|iterate|certify|show-spec",
          );
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }

        if (options.prototypingAction === "certify") {
          const resolvedRoot = await resolveRoot(options);
          process.exitCode = await runPrototypingCertify({
            root: resolvedRoot,
            check: Boolean(options.prototypingCheckOnly),
          });
          return;
        }
        if (options.prototypingAction === "show-spec") {
          const resolvedRoot = await resolveRoot(options);
          process.exitCode = await runPrototypingShowSpec({ root: resolvedRoot });
          return;
        }
        if (options.prototypingAction === "preflight") {
          const resolvedRoot = await resolveRoot(options);
          process.exitCode = await runDoctor({
            root: resolvedRoot,
            rootExplicit: true,
            format: options.doctorFormat,
            ...(options.doctorOut !== undefined ? { outPath: options.doctorOut } : {}),
            ...(options.failOn && options.failOn !== "never" ? { failOn: options.failOn } : {}),
            profile: "prototyping",
            ...(options.prototypingTargetUrl ? { targetUrl: options.prototypingTargetUrl } : {}),
          });
          return;
        }

        // iterate: single-thread evolution loop driver.
        //
        // --check-convergence bypasses the cycle-required guard because
        // the read-only peek path defaults to cycle 9 (the final cycle
        // per the peek-mode hint convention) when --cycle is omitted.
        if (options.prototypingCycle === undefined && !options.prototypingCheckConvergence) {
          error("qfai prototyping iterate: --cycle <number> is required.");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runPrototypingIterate({
          root: resolvedRoot,
          // When --check-convergence is set without --cycle, default to
          // cycle 9 (the final cycle of the loop, matching the peek-mode
          // hint string in `CYCLE_OUT_OF_RANGE_PEEK_HINT`).
          cycle: options.prototypingCycle ?? 9,
          ...(options.prototypingTargetUrl ? { targetUrl: options.prototypingTargetUrl } : {}),
          ...(options.force ? { force: true } : {}),
          ...(options.prototypingLicensePatch
            ? { licensePatch: options.prototypingLicensePatch }
            : {}),
          ...(options.prototypingPrimarySpecId
            ? { primarySpecId: options.prototypingPrimarySpecId }
            : {}),
          ...(options.prototypingCheckConvergence ? { checkConvergence: true } : {}),
          ...(options.prototypingCapture ? { capture: true } : {}),
          ...(options.prototypingAutoServe ? { autoServe: true } : {}),
        });
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
  init                         テンプレを生成
  validate                     仕様/契約/参照の検査
  report                       検証結果と集計を出力
  doctor                       設定/パス/出力前提の診断
  guardrails                   Decision Guardrails の抽出/検査（list|extract|check）
  prototyping preflight        prototyping 実行前提（spec/ui/design contracts/roles/browser/targetUrl）を診断
  prototyping iterate          single-thread evolution loop の cycle 確定
  prototyping certify [--check]         completion-certificate.json を生成 / 検証
  prototyping show-spec                 解決された primary prototyping spec を出力

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         init: .qfai/assistant/skills と publish 先 skills のみ上書き（それ以外は既存があればスキップ）
  --yes           init: 予約フラグ（現状は非対話のため挙動差なし。将来の対話導入時に自動Yes）
  --upgrade-assistant-tree   init: 既存プロジェクトを 4-layer assistant-tree に migrate
                              (legacy .qfai/assistant/{instructions,steering,manifest}/ → constitution/manifest/catalog/process/)
  --dry-run       変更を行わず表示のみ
  --format <text|github>       validate の出力形式
  --format <md|json>           report の出力形式
  --format <text|json>         doctor / prototyping preflight の出力形式
  --strict                     validate: warning 以上で exit 1
  --profile <discussion|sdd|prototyping|atdd|tdd|verify|full>  validate/report: 検証profileを指定
  --profile <prototyping>      doctor: prototyping 固有の preflight 診断を追加
  --fail-on <error|warning|never>  validate: 失敗条件
  --fail-on <error|warning>        doctor / prototyping preflight: 失敗条件
  --platform <web|windows|mobile-ios|mobile-android|cross-platform>  validate: UI/UXプラットフォーム指定
  --out <path>                  report/doctor/prototyping preflight: 出力先
  --in <path>                   report: validate.json の入力先（configより優先）
  --run-validate                report: validate を実行してから report を生成
  --base-url <url>              report: 基準URL
  --path <path>                 guardrails: 対象ファイル/ディレクトリ（複数指定可）
  --max <number>                guardrails extract: 最大件数
  --keyword <text>              guardrails list/extract: キーワードフィルタ
  --target-url <url>            prototyping preflight/iterate: 評価対象の URL
  --cycle <number>              prototyping iterate: cycle index (0..9)
  --check-convergence           prototyping iterate: 収束済みループ状態を再実行なしで覗く (read-only peek; defaults to cycle 9; exit 0 = converged, exit 2 = not converged / missing state)
  --capture                     prototyping iterate: opt-in PNG/HTML capture (default OFF; uses Playwright dynamic import)
  --auto-serve                  prototyping iterate: opt-in in-process HTTP server (default OFF; node:http; SIGINT teardown <= 2s; EADDRINUSE refusal)
  -h, --help      ヘルプ表示
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
