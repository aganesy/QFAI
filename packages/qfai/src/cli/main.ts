import { runAtddScaffold } from "./commands/atddScaffold.js";
import { runAuditLog } from "./commands/auditLog.js";
import { runDiscussion } from "./commands/discussion.js";
import { runDoctor } from "./commands/doctor.js";
import { runGuardrails } from "./commands/guardrails.js";
import { runHandoffUpgrade } from "./commands/handoffUpgrade.js";
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
          ...(options.failOn && options.failOn !== "never" ? { failOn: options.failOn } : {}),
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
  init                         Generate the template tree
  validate                     Check specs, contracts and references
  report                       Emit validation results and aggregates
  doctor                       Diagnose config, paths and output preconditions
  guardrails                   Extract / check Decision Guardrails (list|extract|check)
  discussion list --active     Show the active discussion session pointer (state.json#discussion.currentId)
  discussion use <id>          Set the active discussion session pointer
  audit log [filters]          List the decision log under .qfai/evidence/decisions/ (--scope/--operator/--clause + --format table|json)
  handoff upgrade <legacy>     Convert a legacy handoff file into the canonical .qfai/handoff.yaml (CLI-HANDOFF)
  atdd scaffold --spec <id>    Generate per-TC test skeletons from a spec's Test-Cases (idempotent + N-cycle escalation)
  prototyping preflight        Diagnose prototyping preconditions (spec/ui/design contracts/roles/browser/targetUrl)
  prototyping iterate          Commit one cycle of the single-thread evolution loop
  prototyping certify [--check]         Generate / verify completion-certificate.json
                                        [--scope <saas-package|full>] issue a scope-limited certificate
                                        [--upgrade-scope full] promote a scope-limited certificate to full DONE
  prototyping show-spec                 Print the resolved primary prototyping spec

Options:
  --root <path>   Target directory
  --dir <path>    init: output directory
  --force         init: overwrite .qfai/assistant/{skills,agents}/** and the published skills/agents (everything else, including assistant/manifest/**, is skipped when it already exists)
                  It deletes as well as overwrites: the wrappers a past qfai placed in
                  .claude/commands/ and .github/prompts/, and the wrappers qfai placed for skills
                  that are no longer shipped (including the real directories from before they
                  became symlinks). Ownership is decided by a file's content and not by its name,
                  so your own command / prompt / skill files survive; a symlink has no content of
                  its own, so one you published under a retired QFAI skill name is deleted (its
                  target .qfai/assistant/skills/<id>/ stays, so you can re-link it).
  --yes           init: reserved flag (no behavioural difference today because init is non-interactive; auto-Yes once prompts are introduced)
  --upgrade-assistant-tree   init: migrate an existing project to the 4-layer assistant tree
                              (legacy .qfai/assistant/{instructions,steering}/ -> constitution/manifest/catalog/process/)
  --dry-run       Show what would change without writing anything
  --format <text|github>       validate: output format
  --format <md|json>           report: output format
  --format <text|json>         doctor / prototyping preflight / discussion list --active: output format
  --active                     discussion list: show the active session pointer
  --strict                     validate: exit 1 on warning or worse
  --profile <discussion|sdd|prototyping|atdd|tdd|verify|saas-package|full>  validate/report: select the validation profile
  --profile <prototyping|<skill>>  doctor: prototyping-specific preflight diagnosis, or a skill manifest runtimeDependencies probe
  --fail-on <error|warning|never>  validate: failure threshold
  --fail-on <error|warning>        doctor / prototyping preflight: failure threshold
  --platform <web|windows|mobile-ios|mobile-android|cross-platform>  validate: UI/UX platform
  --out <path>                  report/doctor/prototyping preflight: output path (a relative path is resolved against --root)
  --in <path>                   report: validate.json input path (takes precedence over the config)
  --run-validate                report: run validate first, then generate the report
  --base-url <url>              report: base URL
  --path <path>                 guardrails: target file/directory (repeatable)
  --max <number>                guardrails extract: maximum number of entries
  --keyword <text>              guardrails list/extract: keyword filter
  --target-url <url>            prototyping preflight/iterate: URL under evaluation
  --cycle <number>              prototyping iterate: cycle index (0..9)
  --check-convergence           prototyping iterate: peek at a converged loop state without re-running it (read-only peek; defaults to cycle 9; exit 0 = converged, exit 2 = not converged / missing state)
  --capture                     prototyping iterate: opt-in PNG/HTML capture (default OFF; Playwright is imported dynamically)
  --auto-serve                  prototyping iterate: opt-in in-process local HTTP server (default OFF; default port 4321; node:http; SIGINT teardown <= 2s; EADDRINUSE is a refusal)
  --license-patch <file>        prototyping iterate: apply a cycle-0 license allowlist patch (appended to the audit ledger; replay-safe)
  --primary-spec-id <value>     prototyping iterate: pick the primary spec explicitly when several UI-bearing specs exist
  --emit-skeletons              prototyping iterate --cycle 0: emit a placeholder HTML per frozenSurfaceUnion screen (default OFF; opt-in)
  --skeleton-mode <placeholder|full|stub>  prototyping iterate --cycle 0 --emit-skeletons: output mode (default placeholder)
  --mode <convergence|exploration>  prototyping iterate: loop posture (default convergence; exploration relaxes soft-rubric gates only, to warning at medium)
  --scope <value>               audit log: filter on the scope field
  --scope <saas-package|full>   prototyping certify: issue a scope-limited certificate (saas-package lists the skipped gates in notes[])
  --upgrade-scope full          prototyping certify: promote a scope-limited certificate to full DONE (re-evaluates the validate --profile saas-package signal)
  --operator <value>            audit log: filter on the operatorIdentity field
  --clause <substring>          audit log: substring filter on envelopeContractClause
  --clean                       doctor: move review packs past their TTL into _archive/ (combinable with --dry-run)
  --autoremediate               doctor: run install + clean + config-fill together
  --spec <id>                   atdd scaffold: target spec (e.g. spec-0006)
  --spec <id>                   validate/report: restrict to the given spec (repeatable; e.g. --spec 0003 --spec spec-0004)
                                 Excludes spec-owned findings and specs-coverage report output for every other spec
                                 report: also switches the default input/output to validate.spec-<ids>.json / report.spec-<ids>.md
  -h, --help      Show this help
`;
}

async function resolveRoot(options: { root: string; rootExplicit: boolean }): Promise<string> {
  if (options.rootExplicit) {
    return options.root;
  }

  const search = await findConfigRoot(options.root);
  if (!search.found) {
    warn(`qfai: qfai.config.yaml not found; falling back to defaultConfig (root=${search.root})`);
  }
  return search.root;
}
