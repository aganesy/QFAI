import { runAtddScaffold } from "./commands/atddScaffold.js";
import { runAuditLog } from "./commands/auditLog.js";
import { runDiscussion } from "./commands/discussion.js";
import { runDoctor } from "./commands/doctor.js";
import { runDbDrift } from "./commands/dbDrift.js";
import { runInit } from "./commands/init.js";
import { runReport } from "./commands/report.js";
import { runSddPreflightCommand } from "./commands/sddPreflight.js";
import { runValidate } from "./commands/validate.js";
import { refuse, runWorkflow, WORKFLOW_HELP } from "./commands/workflow.js";
import type { ParsedArgs } from "./lib/args.js";
import { parseArgs } from "./lib/args.js";
import { EXIT_CODES, formatExitCodesSection } from "./lib/exitCodes.js";
import { describeIncompleteRun } from "./lib/warnings.js";
import { error, info, warn } from "../core/logger.js";
import { findConfigRoot } from "../core/config.js";
import { resolveToolVersion } from "../core/version.js";

/**
 * Exit code for a command name nothing recognizes.
 *
 * Deliberately not `options.invalidExitCode`. That field carries the
 * CLI-arg-error code the CLI's exit-code rule reserves — 2, for an unknown
 * flag or a malformed value — and the parser never
 * sets `invalid` for an unrecognized command, so borrowing it here would file a
 * mistyped command under a row the contract wrote for something else. 1 keeps
 * the two distinguishable while still refusing to report success. A
 * `--flag`-shaped first token never reaches here — the parser catches it,
 * leaves `command` null, and the invalid-args branch above exits 2.
 *
 * Read from `EXIT_CODES.findings` rather than written as `1`. That entry's own
 * documentation lists a mistyped command among what it carries, so the number
 * has a single source and cannot drift from the table `--help` prints.
 */
const UNKNOWN_COMMAND_EXIT_CODE = EXIT_CODES.findings;

/**
 * The top-level commands the switch below dispatches. Kept as data so the
 * unknown-command check can run *before* the `--help` branch: `qfai
 * vlaidate --help` would otherwise print usage and exit 0, contradicting
 * the `Exit codes:` note that a mistyped command name is a usage error.
 */
const KNOWN_COMMANDS: ReadonlySet<string> = new Set([
  "init",
  "validate",
  "report",
  "doctor",
  "db-drift",
  "audit",
  "sdd",
  "atdd",
  "discussion",
  "workflow",
]);

export async function run(argv: string[], cwd: string): Promise<void> {
  const { command, invalid, invalidReason, options } = parseArgs(argv, cwd);

  // `--version` / `-V` short-circuits before the usage branch so the
  // version is readable from anywhere, including outside a project.
  if (options.version) {
    info(await resolveToolVersion());
    return;
  }

  // Before the help branch: `--help` must not turn a mistyped command
  // name into a successful run.
  //
  // `UNKNOWN_COMMAND_EXIT_CODE`, not `options.invalidExitCode`: the two are
  // different rows of the same table, and the `Exit codes:` block this command
  // prints says a mistyped command name is a usage error at
  // `EXIT_CODES.findings` even when `--help` follows it. Borrowing the
  // CLI-arg-error code here would make the help text the CLI ships disagree
  // with the code that ships it.
  if (command !== null && !KNOWN_COMMANDS.has(command)) {
    error(`Unknown command: ${command}`);
    info(usage());
    process.exitCode = UNKNOWN_COMMAND_EXIT_CODE;
    return;
  }

  // `workflow` answers every outcome but its help with one JSON document on stdout, a refused
  // argument included, so it leaves before the usage branch.
  if (command === "workflow" && (invalid || options.help)) {
    process.exitCode = await workflowEntry(invalid, invalidReason, options);
    return;
  }

  if (!command || options.help) {
    // The rejection reason goes to stderr and the usage to stdout. Even if a
    // caller discards stdout, it still learns which token was rejected. The
    // reason is on stderr on the `--format json` path too, so the JSON on
    // stdout stays clean.
    //
    // The flag list is more specific than the stored reason when several
    // unknown flags arrived together, so it is preferred where it exists.
    if (invalid && options.unknownFlags.length > 0) {
      const label = options.unknownFlags.length > 1 ? "unknown options" : "unknown option";
      error(`qfai: ${label}: ${options.unknownFlags.join(", ")}`);
    } else if (invalid) {
      error(invalidReason ?? "qfai: invalid arguments.");
    }
    info(usage());
    if (invalid) {
      process.exitCode = options.invalidExitCode;
    }
    return;
  }

  // Every command except `validate` sends a filesystem fault straight to
  // `cli/index.ts`, which writes `err.message` and exits 1 — a line naming the
  // errno and the path but not the command, and not saying that the run is
  // undetermined rather than clean. `validate` answers with
  // `QFAI-SCAN-002` instead because `validateProject` is wrapped; the others
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
          ...(options.validateFlowIds.length > 0 ? { flowIds: options.validateFlowIds } : {}),
        });
      }
      return;
    case "report":
      {
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runReport({
          root: resolvedRoot,
          format: options.reportFormat,
          strict: options.strict,
          ...(options.failOn !== undefined ? { failOn: options.failOn } : {}),
          ...(options.reportOut !== undefined ? { outPath: options.reportOut } : {}),
          ...(options.reportIn !== undefined ? { inputPath: options.reportIn } : {}),
          ...(options.reportBaseUrl !== undefined ? { baseUrl: options.reportBaseUrl } : {}),
          ...(options.reportRunValidate ? { runValidate: true } : {}),
          ...(options.profile ? { profile: options.profile } : {}),
          ...(options.reportFlowIds.length > 0 ? { flowIds: options.reportFlowIds } : {}),
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
          // Do not drop `never` here: dropped, it cannot be told from
          // "not given", and could no longer override the config's
          // `validation.failOn` downward.
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
    case "db-drift":
      {
        const resolvedRoot = await resolveRoot(options, options.dbDriftFormat === "json");
        process.exitCode = await runDbDrift({
          root: resolvedRoot,
          ...(options.dbDriftFormat !== undefined ? { format: options.dbDriftFormat } : {}),
          ...(options.dbDriftOut !== undefined ? { outPath: options.dbDriftOut } : {}),
          ...(options.failOn === "never" ? { failOn: "never" as const } : {}),
        });
      }
      return;
    case "audit":
      {
        // parseArgs already rejected a missing or invalid subcommand (invalidReason).
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
        // The README documents `--format json` stdout as machine-readable.
        // Send root-discovery warnings to stderr so only the JSON body is
        // written to stdout.
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
        // parseArgs already rejected a missing or invalid subcommand (invalidReason).
        const resolvedRoot = await resolveRoot(options);
        process.exitCode = await runAtddScaffold({
          root: resolvedRoot,
          ...(options.atddStoryId !== undefined ? { storyId: options.atddStoryId } : {}),
          ...(options.atddFlowId !== undefined ? { flowId: options.atddFlowId } : {}),
          ...(options.atddSpecId !== undefined ? { specId: options.atddSpecId } : {}),
        });
      }
      return;
    case "discussion":
      {
        // parseArgs already rejected a missing or invalid subcommand
        // (invalidReason). It is read here only to narrow the required
        // `action`.
        const discussionAction = options.discussionAction;
        if (!discussionAction) {
          return;
        }
        // `discussion... --format json` writes its whole payload to
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
    case "workflow":
      process.exitCode = await workflowEntry(false, undefined, options);
      return;

    default:
      // Normally unreachable: an unknown command name is rejected before the
      // help branch. Kept as a backstop for when KNOWN_COMMANDS drifts from
      // this switch; failing with a usage error is safer than passing through
      // with exit 0.
      error(`Unknown command: ${command}`);
      info(usage());
      process.exitCode = UNKNOWN_COMMAND_EXIT_CODE;
      return;
  }
}

async function workflowEntry(
  invalid: boolean,
  invalidReason: string | undefined,
  options: ParsedArgs["options"],
): Promise<number> {
  if (invalid || (!options.help && !options.workflowAction)) {
    error(invalidReason ?? "qfai workflow: name one of the seven operations.");
    const subjects = options.unknownFlags.length > 0 ? options.unknownFlags : ["operation"];
    return refuse(null, {
      code: "invalid-input",
      message:
        "The command line names no operation or flag the workflow command takes. Run it with --help.",
      reasons: subjects.map((subject) => ({ reason: "schema", subject })),
    });
  }
  if (options.help || !options.workflowAction) {
    info(WORKFLOW_HELP);
    return EXIT_CODES.ok;
  }
  return runWorkflow({
    root: await resolveRoot(options, true),
    operation: options.workflowAction,
    ...(options.workflowRun ? { runId: options.workflowRun } : {}),
    ...(options.workflowIn ? { inPath: options.workflowIn } : {}),
  });
}

function usage(): string {
  return `qfai <command> [options]

Commands:
  init                         Generate the template tree
  validate                     Check specs, contracts and references
  report                       Emit validation results and aggregates
  doctor                       Diagnose config, paths and output preconditions
  db-drift                     Compare the DB contracts with the migrations as schemas (needs paths.migrationsDir)
  discussion list              List the discussion packs (the active pointer's pack is marked with *)
  discussion list --active     Show the active discussion session pointer (state.json#discussion.currentId)
  discussion use <id>          Set the active discussion session pointer
  audit log [filters]          List the decision log under .qfai/evidence/decision/ (--scope/--operator/--clause + --format table|json)
  sdd preflight                Run the /qfai-sdd Stage 0 gate (active discussion-pack selection / REQ count / blocker verdict) and write .qfai/report/preflight_summary.md
  atdd scaffold --story <US-ID> Generate one test skeleton per AC in a story
  atdd scaffold --flow <BF-ID>  Generate an E2E test skeleton for a flow
  workflow <operation>         Drive a free-text change through its stages (start|next|accept|decision|status|resume|finish)

Options:
  --root <path>   Target directory (for init, the output directory when --dir is absent)
  --dir <path>    init: output directory (init only; --dir wins when both are given)
  --force         init: overwrite .qfai/assistant/{skill,agent}/**, the published skills/agents, and the symlink-asset output under .agents/.claude/.github/.codex
                  (that output includes the qfai-provided .github/copilot-instructions.md and .github/instructions/**; the story tree, rule/*.local.md overlays and assistant/skill.local/** are never overwritten)
                  It deletes as well as overwrites: the wrappers a past qfai placed in
                  .claude/commands/ and .github/prompts/, and the wrappers qfai placed for skills
                  that are no longer shipped (including the real directories from before they
                  became symlinks). Ownership is decided by a file's content and not by its name,
                  so your own command / prompt / skill files survive; a symlink has no content of
                  its own, so one you published under a retired QFAI skill name is deleted (its
                  target .qfai/assistant/skill/<id>/ stays, so you can re-link it).
  --yes           init: reserved flag (no behavioural difference today because init is non-interactive; auto-Yes once prompts are introduced)
  --yes           doctor --autoremediate: skip the interactive confirmation (no effect elsewhere)
  --upgrade-assistant-tree   init: migrate an existing project to the 4-layer assistant tree
                              (legacy .qfai/assistant/{instructions,steering}/ -> rule/ skill/ agent/ prompt/)
  --dry-run       init / doctor: show what would change without writing anything
  --verbose       init: expand the run report's skipped-path list (counts only by default)
  --format <text|github>       validate: output format
  --format <md|json>           report: output format
  --format <text|json>         doctor / discussion list: output format
  --active                     discussion list: show the active session pointer instead of listing packs
  --strict                     validate/report: exit 1 on warning or worse
  --profile <discussion|sdd|prototyping|atdd|tdd|verify|saas-package|full|drift>  validate/report: select the validation profile
                                drift runs the drift guard alone: the same gate tdd carries, without the completion obligations
  --profile <prototyping|<skill>>  doctor: prototyping-specific preflight diagnosis, or a skill manifest runtimeDependencies probe
  --fail-on <error|warning|never>  validate/report: failure threshold (takes precedence over --strict)
  --fail-on <error|warning|never>  doctor: failure threshold (defaults to validation.failOn; the shipped default is error)
  --fail-on <error|warning|never>  sdd preflight: failure threshold (never exits 0 even when blocked; preflight has no warning tier, so warning means the same as error)
  --platform <web|windows|mobile-ios|mobile-android|cross-platform>  validate: UI/UX platform
  --out <path>                  report/doctor: output path (a relative path is resolved against --root)
  --in <path>                   report: validate.json input path (takes precedence over the config)
  --run-validate                report: run validate first, then generate the report
  --base-url <url>              report: base URL
  --target-url <url>            doctor --profile prototyping: URL under evaluation
  --scope <value>               audit log: filter on the scope field
  --operator <value>            audit log: filter on the operatorIdentity field
  --clause <substring>          audit log: substring filter on envelopeContractClause
  --clean                       doctor: move review packs past their TTL into _archive/, and delete validate run logs (outDir/run-*) past their TTL (the newest N are always kept; combinable with --dry-run)
  --autoremediate               doctor: run install + clean + config-fill together
  --assume <text>               sdd preflight: record a carried-over open question / assumption in the summary (repeatable)
  --story <US-ID>               atdd scaffold: target story (e.g. US-0001-0001)
  --flow <BF-ID>                atdd scaffold: target flow (e.g. BF-0001)
  --spec <id>                   Legacy option; atdd scaffold, validate, and report reject it
  --flow <BF-NNNN>              validate/report: restrict to the given business flow (repeatable)
                                 report: reads validate.flow-<ids>.json and writes report.flow-<ids>.md by default
  -h, --help      Show this help
  -V, --version   Show the version (prints the installed qfai's version to stdout)

${formatExitCodesSection()}
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
