import { runAtddScaffold } from "./commands/atddScaffold.js";
import { runAuditLog } from "./commands/auditLog.js";
import { runDiscussion } from "./commands/discussion.js";
import { runDoctor } from "./commands/doctor.js";
import { formatGuardrailsErrorJson, runGuardrails } from "./commands/guardrails.js";
import { runHandoffUpgrade } from "./commands/handoffUpgrade.js";
import { runInit } from "./commands/init.js";
import { runPrototypingIterate } from "./commands/prototypingIterate.js";
import { runPrototypingCertify, runPrototypingShowSpec } from "./commands/prototypingCertify.js";
import { runPrototypingRescope } from "./commands/prototypingRescope.js";
import { runReport } from "./commands/report.js";
import { runSddPreflightCommand } from "./commands/sddPreflight.js";
import { runValidate } from "./commands/validate.js";
import type { ParsedArgs } from "./lib/args.js";
import { parseArgs } from "./lib/args.js";
import { describeIncompleteRun } from "./lib/warnings.js";
import { error, info, warn } from "./lib/logger.js";
import { findConfigRoot } from "../core/config.js";
import { resolveToolVersion } from "../core/version.js";

/**
 * Exit code for a command name nothing recognizes.
 *
 * Deliberately not `options.invalidExitCode`. That field carries the
 * CLI-arg-error code the exit-code table in `.qfai/contracts/cli/qfai-init.md`
 * reserves — 2, for an unknown flag or a malformed value — and the parser never
 * sets `invalid` for an unrecognized command, so borrowing it here would file a
 * mistyped command under a row the contract wrote for something else. 1 keeps
 * the two distinguishable while still refusing to report success, which is the
 * defect this branch closed: the `default:` arm used to print `Unknown command`
 * and exit 0. A `--flag`-shaped first token never reaches here — the parser
 * catches it, leaves `command` null, and the invalid-args branch above exits 2.
 */
const UNKNOWN_COMMAND_EXIT_CODE = 1;

export async function run(argv: string[], cwd: string): Promise<void> {
  const { command, invalid, invalidReason, options } = parseArgs(argv, cwd);

  // `--version` / `-V` short-circuits before the usage branch so the
  // version is readable from anywhere, including outside a project.
  if (options.version) {
    info(await resolveToolVersion());
    return;
  }

  if (!command || options.help) {
    // 拒否理由は stderr、usage は stdout。呼び出し側が stdout を捨てても
    // 「どのトークンが拒否されたか」は必ず手元に残る。`--format json` の
    // 経路でも理由は stderr なので、stdout の JSON は汚れない。
    //
    // The flag list is more specific than the stored reason when several
    // unknown flags arrived together, so it is preferred where it exists.
    if (invalid && options.unknownFlags.length > 0) {
      const label = options.unknownFlags.length > 1 ? "unknown options" : "unknown option";
      error(`qfai: ${label}: ${options.unknownFlags.join(", ")}`);
    } else if (invalid) {
      error(invalidReason ?? "qfai: invalid arguments.");
    }
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

  // Every command except `validate` sends a filesystem fault straight to
  // `cli/index.ts`, which writes `err.message` and exits 1 — a line naming the
  // errno and the path but not the command, and not saying that the run is
  // undetermined rather than clean (#1104). `validate` answers with
  // `QFAI-SCAN-002` instead because #1112 wrapped `validateProject`; the others
  // have no verdict artifact, so the refusal itself has to carry it.
  //
  // Rethrown, never swallowed: the exit code and the `cause` chain are what a
  // caller and a stack trace still need. `describeIncompleteRun` returns `null`
  // for anything that is not an unwrapped libuv error, so a deliberate refusal
  // passes through with the message its author wrote.
  try {
    await dispatch(command, options);
  } catch (thrown: unknown) {
    // Bound as `thrown`, not `error`: this module imports a logger named
    // `error`, and shadowing it inside the one block that must not log is a
    // trap for the next edit.
    throw describeIncompleteRun(thrown, command) ?? thrown;
  }
}

async function dispatch(command: string, options: ParsedArgs["options"]): Promise<void> {
  switch (command) {
    case "init":
      await runInit({
        dir: options.dir,
        force: options.force,
        dryRun: options.dryRun,
        yes: options.yes,
        upgradeAssistantTree: options.upgradeAssistantTree,
        verbose: options.verbose,
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
        // サブコマンド欠落 / 不正は parseArgs が拒否済み (invalidReason)。
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
        // サブコマンド欠落 / 不正は parseArgs が拒否済み (invalidReason)。
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
        // Only `upgrade` is supported today; parseArgs already
        // markInvalid()s a missing / unrecognized action, so we land
        // here with `upgrade` selected.
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
        // サブコマンド欠落 / 不正は parseArgs が拒否済み (invalidReason)。
        // ここでは required な `action` を narrow するためだけに読む。
        const discussionAction = options.discussionAction;
        if (!discussionAction) {
          return;
        }
        // `discussion ... --format json` writes its whole payload to
        // stdout, so the defaultConfig notice has to go to stderr there —
        // otherwise stdout is JSON-plus-a-Japanese-warning and no
        // `JSON.parse` (or downstream jq) can read it.
        const resolvedRoot = await resolveRoot(options, options.discussionFormat === "json");
        process.exitCode = await runDiscussion({
          root: resolvedRoot,
          action: discussionAction,
          ...(options.discussionActive ? { active: true } : {}),
          ...(options.discussionFormat ? { format: options.discussionFormat } : {}),
          ...(options.discussionId !== undefined ? { id: options.discussionId } : {}),
        });
      }
      return;
    case "prototyping":
      {
        // サブコマンド欠落 / 不正は parseArgs が拒否済み (invalidReason)。
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
        if (options.prototypingAction === "rescope") {
          const resolvedRoot = await resolveRoot(options);
          process.exitCode = await runPrototypingRescope({
            root: resolvedRoot,
            remove: options.rescopeRemove,
            reason: options.rescopeReason ?? "",
            dryRun: options.dryRun,
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
          ...(options.dryRun ? { dryRun: true } : {}),
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
      process.exitCode = UNKNOWN_COMMAND_EXIT_CODE;
      return;
  }
}

function usage(): string {
  return `qfai <command> [options]

Commands:
  init                         Generate the template tree
  validate                     Check specs, contracts and references
  report                       Emit validation results and aggregates
  doctor                       Diagnose config, paths and output preconditions
  guardrails                   Extract / check Decision Guardrails (list|extract|check)
  discussion list              List the discussion packs (the active pointer's pack is marked with *)
  discussion list --active     Show the active discussion session pointer (state.json#discussion.currentId)
  discussion use <id>          Set the active discussion session pointer
  audit log [filters]          List the decision log under .qfai/evidence/decisions/ (--scope/--operator/--clause + --format table|json)
  handoff upgrade <legacy>     Convert a legacy handoff file into the canonical .qfai/handoff.yaml (CLI-HANDOFF)
  sdd preflight                Run the /qfai-sdd Stage 0 gate (active discussion-pack selection / REQ count / blocker verdict) and write .qfai/report/preflight_summary.md
  atdd scaffold --spec <id>    Generate per-TC test skeletons from a spec's Test-Cases (idempotent + N-cycle escalation)
  prototyping preflight        Diagnose prototyping preconditions (spec/ui/design contracts/roles/browser/targetUrl)
  prototyping iterate          Commit one cycle of the single-thread evolution loop
  prototyping certify [--check]         Generate / verify completion-certificate.json
                                        [--scope <saas-package|full>] issue a scope-limited certificate
                                        [--upgrade-scope full] promote a scope-limited certificate to full DONE
  prototyping show-spec                 Print the resolved primary prototyping spec
  prototyping rescope --remove <id> --reason <delta-id>
                                        Drop a retired surface from frozenSurfaceUnion
                                        (the loop stays on its current cycle; a surface still being resolved is refused)

Options:
  --root <path>   Target directory (for init, the output directory when --dir is absent)
  --dir <path>    init: output directory (init only; --dir wins when both are given)
  --force         init: overwrite .qfai/assistant/{skills,agents}/**, the published skills/agents, and the symlink-asset output under .agents/.claude/.github/.codex
                  (that output includes each tree's README.md and the qfai-provided .github/copilot-instructions.md and .github/instructions/**; specs/contracts/steering and assistant/manifest/** are never overwritten)
                  It deletes as well as overwrites: the wrappers a past qfai placed in
                  .claude/commands/ and .github/prompts/, and the wrappers qfai placed for skills
                  that are no longer shipped (including the real directories from before they
                  became symlinks). Ownership is decided by a file's content and not by its name,
                  so your own command / prompt / skill files survive; a symlink has no content of
                  its own, so one you published under a retired QFAI skill name is deleted (its
                  target .qfai/assistant/skills/<id>/ stays, so you can re-link it).
  --force         handoff upgrade: overwrite an existing .qfai/handoff.yaml (the previous file is saved to .backup-<ISO> first)
  --force         prototyping iterate --cycle 0: required to re-seed an existing iter-00. Moves iter-00
                  to iter-00.backup-<ISO>, then clears the stale iter-NN (without it the run is
                  refused with exit 2)
  --yes           init: reserved flag (no behavioural difference today because init is non-interactive; auto-Yes once prompts are introduced)
  --yes           doctor --autoremediate: skip the interactive confirmation (no effect elsewhere)
  --upgrade-assistant-tree   init: migrate an existing project to the 4-layer assistant tree
                              (legacy .qfai/assistant/{instructions,steering}/ -> constitution/manifest/catalog/process/)
  --dry-run       init / doctor / handoff upgrade / prototyping iterate|rescope: show what would change without writing anything
  --verbose       init: expand the run report's skipped-path list (counts only by default)
  --format <text|github>       validate: output format
  --format <md|json>           report: output format
  --remove <surface-id>        prototyping rescope: surface id to drop (repeatable)
  --reason <delta-id>          prototyping rescope: the delta / decision id that retired it (required)
  --format <text|json>         doctor / prototyping preflight / discussion list: output format
  --active                     discussion list: show the active session pointer instead of listing packs
  --strict                     validate: exit 1 on warning or worse
  --profile <discussion|sdd|prototyping|atdd|tdd|verify|saas-package|full>  validate/report: select the validation profile
  --profile <prototyping|<skill>>  doctor: prototyping-specific preflight diagnosis, or a skill manifest runtimeDependencies probe
  --fail-on <error|warning|never>  validate: failure threshold (takes precedence over --strict)
  --fail-on <error|warning|never>  doctor / prototyping preflight: failure threshold (defaults to validation.failOn; the shipped default is error)
  --fail-on <error|warning|never>  sdd preflight: failure threshold (never exits 0 even when blocked; preflight has no warning tier, so warning means the same as error)
  --platform <web|windows|mobile-ios|mobile-android|cross-platform>  validate: UI/UX platform
  --out <path>                  report/doctor/prototyping preflight: output path (a relative path is resolved against --root)
  --in <path>                   report: validate.json input path (takes precedence over the config)
  --run-validate                report: run validate first, then generate the report
  --base-url <url>              report: base URL
  --path <path>                 guardrails: target file/directory (repeatable)
  --max <number>                guardrails extract: maximum number of entries
  --keyword <text>              guardrails list/extract: keyword filter
  --format <text|json>          guardrails list/extract/check: output format (default text)
  --target-url <url>            prototyping preflight/iterate: URL under evaluation
  --cycle <number>              prototyping iterate: cycle index (0..9)
  --check-convergence           prototyping iterate: peek at a converged loop state without re-running it (read-only peek; defaults to cycle 9; exit 0 = converged, exit 2 = not converged / missing state)
  --capture                     prototyping iterate: opt-in PNG/HTML capture (default OFF; Playwright is imported dynamically)
  --auto-serve                  prototyping iterate: opt-in in-process local HTTP server (default OFF; default port 4321; node:http; SIGINT teardown <= 2s; EADDRINUSE is a refusal)
  --license-patch <file>        prototyping iterate: apply an add-only license allowlist patch on any cycle (not cycle 0 only; appended to the audit ledger and replayed on later cycles. sourceHosts are not replayed)
  --primary-spec-id <value>     prototyping iterate: pick the primary spec explicitly when several UI-bearing specs exist
  --emit-skeletons              prototyping iterate --cycle 0: emit a placeholder HTML per frozenSurfaceUnion screen (default OFF; opt-in)
  --skeleton-mode <placeholder|full|stub>  prototyping iterate --cycle 0 --emit-skeletons: output mode (default placeholder)
  --mode <convergence|exploration>  prototyping iterate: loop posture (default convergence; exploration relaxes soft-rubric gates only, to warning at medium)
  --scope <value>               audit log: filter on the scope field
  --scope <saas-package|full>   prototyping certify: issue a scope-limited certificate (saas-package lists the skipped gates in notes[])
  --upgrade-scope full          prototyping certify: promote a scope-limited certificate to full DONE (re-evaluates the validate --profile saas-package signal)
  --operator <value>            audit log: filter on the operatorIdentity field
  --clause <substring>          audit log: substring filter on envelopeContractClause
  --clean                       doctor: move review packs past their TTL into _archive/, and delete validate run logs (outDir/run-*) past their TTL (the newest N are always kept; combinable with --dry-run)
  --autoremediate               doctor: run install + clean + config-fill together
  --assume <text>               sdd preflight: record a carried-over open question / assumption in the summary (repeatable)
  --spec <id>                   atdd scaffold: target spec (e.g. spec-0006)
  --spec <id>                   validate/report: restrict to the given spec (repeatable; e.g. --spec 0003 --spec spec-0004)
                                 Excludes spec-owned findings and specs-coverage report output for every other spec
                                 report: also switches the default input/output to validate.spec-<ids>.json / report.spec-<ids>.md
  -h, --help      Show this help
  -V, --version   Show the version (prints the installed qfai's version to stdout)
`;
}

/**
 * `machineReadable` keeps stdout reserved for the payload when the command is
 * about to print JSON: the missing-config notice then goes to stderr so
 * `qfai <cmd> --format json` stays parseable, and cannot be interleaved with
 * the payload to break `JSON.parse` on the consumer side.
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
    const notice = `qfai: qfai.config.yaml not found; falling back to defaultConfig (root=${search.root})`;
    if (machineReadable) {
      error(notice);
    } else {
      warn(notice);
    }
  }
  return search.root;
}
