import { runAtddScaffold } from "./commands/atddScaffold.js";
import { runAuditLog } from "./commands/auditLog.js";
import { runDiscussion } from "./commands/discussion.js";
import { runDoctor } from "./commands/doctor.js";
import { formatGuardrailsErrorJson, runGuardrails } from "./commands/guardrails.js";
import { runHandoffUpgrade } from "./commands/handoffUpgrade.js";
import { runInit } from "./commands/init.js";
import { runPrototypingIterate } from "./commands/prototypingIterate.js";
import { runPrototypingCertify, runPrototypingShowSpec } from "./commands/prototypingCertify.js";
import { runReport } from "./commands/report.js";
import { runSddPreflightCommand } from "./commands/sddPreflight.js";
import { runValidate } from "./commands/validate.js";
import { parseArgs } from "./lib/args.js";
import { error, info, warn } from "./lib/logger.js";
import { findConfigRoot } from "../core/config.js";

export async function run(argv: string[], cwd: string): Promise<void> {
  const { command, invalid, options } = parseArgs(argv, cwd);

  if (!command || options.help) {
    // A parser rejection never reaches runGuardrails(), so the `--format json`
    // promise ("stdout stays parseable for every outcome") has to be honoured
    // here too: usage goes to stderr and stdout carries the refusal envelope.
    if (invalid && command === "guardrails" && options.guardrailsFormat === "json") {
      error(usage());
      info(
        formatGuardrailsErrorJson(
          "invalid-arguments",
          "guardrails: invalid arguments (see usage on stderr)",
        ),
      );
    } else {
      info(usage());
    }
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
          ...(options.validateSpecIds.length > 0 ? { specIds: options.validateSpecIds } : {}),
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
          ...(options.reportSpecIds.length > 0 ? { specIds: options.reportSpecIds } : {}),
        });
      }
      return;
    case "doctor":
      {
        if (options.profile && options.profile !== "prototyping") {
          error(
            "qfai doctor: --profile accepts 'prototyping' or a skill name (e.g. 'qfai-prototyping').",
          );
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const exitCode = await runDoctor({
          root: options.root,
          rootExplicit: options.rootExplicit,
          format: options.doctorFormat,
          ...(options.doctorOut !== undefined ? { outPath: options.doctorOut } : {}),
          // `never` はここで捨てない: 捨てると「未指定」と区別できず、
          // config の `validation.failOn` を下向きに上書きできなくなる。
          ...(options.failOn ? { failOn: options.failOn } : {}),
          ...(options.profile === "prototyping" ? { profile: "prototyping" as const } : {}),
          ...(options.doctorSkillProfile !== undefined
            ? { skillProfile: options.doctorSkillProfile }
            : {}),
          ...(options.profile === "prototyping" && options.prototypingTargetUrl
            ? { targetUrl: options.prototypingTargetUrl }
            : {}),
          ...(options.doctorClean ? { clean: true } : {}),
          ...(options.doctorAutoremediate ? { autoremediate: true } : {}),
          ...(options.dryRun ? { dryRun: true } : {}),
          ...(options.yes ? { yes: true } : {}),
        });
        process.exitCode = exitCode;
      }
      return;
    case "guardrails":
      {
        const resolvedRoot = await resolveRoot(options, options.guardrailsFormat === "json");
        const exitCode = await runGuardrails({
          root: resolvedRoot,
          ...(options.guardrailsAction ? { action: options.guardrailsAction } : {}),
          paths: options.guardrailsPaths,
          ...(options.guardrailsMax !== undefined ? { max: options.guardrailsMax } : {}),
          ...(options.guardrailsKeyword !== undefined
            ? { keyword: options.guardrailsKeyword }
            : {}),
          ...(options.guardrailsFormat !== undefined ? { format: options.guardrailsFormat } : {}),
        });
        process.exitCode = exitCode;
      }
      return;
    case "audit":
      {
        if (!options.auditAction) {
          error("qfai audit: unknown or missing subcommand. Expected: log");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runAuditLog({
          root: resolvedRoot,
          ...(options.auditFormat ? { format: options.auditFormat } : {}),
          ...(options.auditScope !== undefined ? { scope: options.auditScope } : {}),
          ...(options.auditOperator !== undefined ? { operator: options.auditOperator } : {}),
          ...(options.auditClause !== undefined ? { clause: options.auditClause } : {}),
        });
      }
      return;
    case "sdd":
      {
        if (!options.sddAction) {
          error("qfai sdd: unknown or missing subcommand. Expected: preflight");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        // `--format json` の stdout は machine-readable として README が案内
        // している。root 探索の警告は stderr へ送り、JSON 本体だけを流す。
        const resolvedRoot = await resolveRoot(options, options.sddFormat === "json");
        process.exitCode = await runSddPreflightCommand({
          root: resolvedRoot,
          ...(options.sddFormat ? { format: options.sddFormat } : {}),
          ...(options.failOn !== undefined ? { failOn: options.failOn } : {}),
          ...(options.sddAssumptions.length > 0 ? { assumptions: options.sddAssumptions } : {}),
        });
      }
      return;
    case "atdd":
      {
        if (!options.atddAction) {
          error("qfai atdd: unknown or missing subcommand. Expected: scaffold");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        if (!options.atddSpecId) {
          error("qfai atdd scaffold: --spec <id> is required.");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runAtddScaffold({
          root: resolvedRoot,
          specId: options.atddSpecId,
        });
      }
      return;
    case "handoff":
      {
        if (!options.handoffAction) {
          error("qfai handoff: unknown or missing subcommand. Expected: upgrade");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        // Only `upgrade` is supported today; the action gate above
        // already markInvalid()s unrecognized values, so we land here
        // with `upgrade` selected.
        if (!options.handoffLegacyFile) {
          error("qfai handoff upgrade: <legacy-file> is required.");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runHandoffUpgrade({
          root: resolvedRoot,
          legacyFile: options.handoffLegacyFile,
          // The canonical `.qfai/handoff.yaml` is a consumed SSOT:
          // `--force` is required to overwrite an existing one, and
          // `--dry-run` must preview instead of writing.
          force: options.force,
          dryRun: options.dryRun,
        });
      }
      return;
    case "discussion":
      {
        if (!options.discussionAction) {
          error("qfai discussion: unknown or missing subcommand. Expected: list|use");
          info(usage());
          process.exitCode = options.invalidExitCode;
          return;
        }
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runDiscussion({
          root: resolvedRoot,
          action: options.discussionAction,
          ...(options.discussionActive ? { active: true } : {}),
          ...(options.discussionFormat ? { format: options.discussionFormat } : {}),
          ...(options.discussionId !== undefined ? { id: options.discussionId } : {}),
        });
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
            ...(options.prototypingScope !== undefined ? { scope: options.prototypingScope } : {}),
            ...(options.prototypingUpgradeScopeFull ? { upgradeScopeFull: true } : {}),
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
            // `never` は doctor 側の明示的なオプトアウトとして渡す。
            ...(options.failOn ? { failOn: options.failOn } : {}),
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
          ...(options.prototypingEmitSkeletons ? { emitSkeletons: true } : {}),
          ...(options.prototypingSkeletonMode !== undefined
            ? { skeletonMode: options.prototypingSkeletonMode }
            : {}),
          ...(options.prototypingMode !== undefined ? { mode: options.prototypingMode } : {}),
        });
      }
      return;

    default:
      error(`Unknown command: ${command}`);
      info(usage());
      process.exitCode = options.invalidExitCode;
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
  discussion list --active     active discussion session pointer を表示（state.json#discussion.currentId）
  discussion use <id>          active discussion session pointer を設定
  audit log [filters]          .qfai/evidence/decisions/ の決定ログを一覧 (--scope/--operator/--clause + --format table|json)
  handoff upgrade <legacy>     legacy handoff ファイルを canonical .qfai/handoff.yaml に変換 (CLI-HANDOFF)
  sdd preflight                /qfai-sdd Stage 0 ゲート（active discussion-pack 選択 / REQ 件数 / blocker 判定）を実行し .qfai/report/preflight_summary.md を生成
  atdd scaffold --spec <id>    spec の Test-Cases から per-TC test skeleton を生成（idempotent + N-cycle escalation）
  prototyping preflight        prototyping 実行前提（spec/ui/design contracts/roles/browser/targetUrl）を診断
  prototyping iterate          single-thread evolution loop の cycle 確定
  prototyping certify [--check]         completion-certificate.json を生成 / 検証
                                        [--scope <saas-package|full>] scope 限定 certificate を発行
                                        [--upgrade-scope full] scope 限定 certificate を full DONE に昇格
  prototyping show-spec                 解決された primary prototyping spec を出力

Options:
  --root <path>   対象ディレクトリ
  --dir <path>    init の出力先
  --force         init: .qfai/assistant/{skills,agents}/** と publish 先 skills/agents、および symlink assets（.agents/.claude/.github/.codex）の生成物を上書き
                  （生成物には各ツリーの README.md と .github/copilot-instructions.md を含む。specs/contracts/steering と assistant/manifest/** は上書きしない）
                  上書きだけでなく削除も行う: 過去の qfai が .claude/commands/ と .github/prompts/ に置いた
                  wrapper と、出荷されなくなった skill 用に qfai が置いた wrapper（symlink 化以前の
                  実ディレクトリを含む）を削除します。所有権は名前ではなくファイルの中身で判定するため
                  自作の command / prompt / skill は残りますが、symlink には中身がないので、引退済みの
                  QFAI skill 名で公開した自作 symlink は削除されます（リンク先の
                  .qfai/assistant/skills/<id>/ 本体は残るので張り直せます）
  --force         handoff upgrade: 既存の .qfai/handoff.yaml を上書き（上書き前に .backup-<ISO> へ退避）
  --yes           init: 予約フラグ（現状は非対話のため挙動差なし。将来の対話導入時に自動Yes）
  --upgrade-assistant-tree   init: 既存プロジェクトを 4-layer assistant-tree に migrate
                              (legacy .qfai/assistant/{instructions,steering}/ → constitution/manifest/catalog/process/)
  --dry-run       init / doctor / handoff upgrade: 変更を行わず表示のみ
  --format <text|github>       validate の出力形式
  --format <md|json>           report の出力形式
  --format <text|json>         doctor / prototyping preflight / sdd preflight / discussion list --active の出力形式
  --active                     discussion list: active session pointer を表示
  --strict                     validate: warning 以上で exit 1
  --profile <discussion|sdd|prototyping|atdd|tdd|verify|saas-package|full>  validate/report: 検証profileを指定
  --profile <prototyping|<skill>>  doctor: prototyping 固有の preflight 診断、または skill manifest の runtimeDependencies 探索
  --fail-on <error|warning|never>  validate: 失敗条件
  --fail-on <error|warning|never>  doctor / prototyping preflight: 失敗条件（既定は validation.failOn、同梱既定値は error）
  --fail-on <error|warning|never>  sdd preflight: 失敗条件（never は blocked でも exit 0。preflight は warning 段を持たないため warning は error と同義）
  --platform <web|windows|mobile-ios|mobile-android|cross-platform>  validate: UI/UXプラットフォーム指定
  --out <path>                  report/doctor/prototyping preflight: 出力先（相対パスは --root 基準）
  --in <path>                   report: validate.json の入力先（configより優先）
  --run-validate                report: validate を実行してから report を生成
  --base-url <url>              report: 基準URL
  --path <path>                 guardrails: 対象ファイル/ディレクトリ（複数指定可）
  --max <number>                guardrails extract: 最大件数
  --keyword <text>              guardrails list/extract: キーワードフィルタ
  --format <text|json>          guardrails list/extract/check: 出力形式（既定 text）
  --target-url <url>            prototyping preflight/iterate: 評価対象の URL
  --cycle <number>              prototyping iterate: cycle index (0..9)
  --check-convergence           prototyping iterate: 収束済みループ状態を再実行なしで覗く (read-only peek; defaults to cycle 9; exit 0 = converged, exit 2 = not converged / missing state)
  --capture                     prototyping iterate: opt-in な PNG/HTML キャプチャ (default OFF; Playwright を dynamic import)
  --auto-serve                  prototyping iterate: opt-in なローカル HTTP サーバを in-process で起動 (default OFF; default port 4321; node:http; SIGINT teardown <= 2s; EADDRINUSE は refusal)
  --license-patch <file>        prototyping iterate: cycle 0 ライセンス allowlist パッチを適用 (audit ledger に追記; replay 対応)
  --primary-spec-id <value>     prototyping iterate: 複数 UI-bearing spec から primary を明示指定
  --emit-skeletons              prototyping iterate --cycle 0: frozenSurfaceUnion の screen ごとに placeholder HTML を出力 (default OFF; opt-in)
  --skeleton-mode <placeholder|full|stub>  prototyping iterate --cycle 0 --emit-skeletons: 出力モード (default placeholder)
  --mode <convergence|exploration>  prototyping iterate: loop posture (default convergence; exploration は soft-rubric gates のみ warning へ medium relaxation)
  --scope <value>               audit log: scope フィールドで filter
  --scope <saas-package|full>   prototyping certify: scope 限定 certificate を発行 (saas-package は notes[] に skip 対象 gate を列挙)
  --upgrade-scope full          prototyping certify: scope 限定 certificate を full DONE に昇格 (validate --profile saas-package の signal を再評価)
  --operator <value>            audit log: operatorIdentity フィールドで filter
  --clause <substring>          audit log: envelopeContractClause で substring filter
  --clean                       doctor: TTL 超過 review pack を _archive/ へ退避 (--dry-run 併用可)
  --autoremediate               doctor: install + clean + config-fill をまとめて実行
  --assume <text>               sdd preflight: carry-over の open question / 前提を summary に記録 (複数指定可)
  --spec <id>                   atdd scaffold: 対象 spec (例: spec-0006)
  --spec <id>                   validate/report: 対象 spec に限定 (複数指定可; 例: --spec 0003 --spec spec-0004)
                                 指定 spec 外の spec-owned findings と specs-coverage レポート出力を除外する
                                 report: 既定の入出力も validate.spec-<ids>.json / report.spec-<ids>.md へ切り替える
  -h, --help      ヘルプ表示
`;
}

/**
 * `machineReadable` keeps stdout reserved for the payload when the command is
 * about to print JSON: the missing-config notice then goes to stderr so
 * `qfai <cmd> --format json` stays parseable.
 */
async function resolveRoot(
  options: { root: string; rootExplicit: boolean },
  machineReadable = false,
): Promise<string> {
  if (options.rootExplicit) {
    return options.root;
  }

  const search = await findConfigRoot(options.root);
  if (!search.found) {
    const notice = `qfai: qfai.config.yaml が見つからないため defaultConfig を使用します (root=${search.root})`;
    if (machineReadable) {
      error(notice);
    } else {
      warn(notice);
    }
  }
  return search.root;
}
