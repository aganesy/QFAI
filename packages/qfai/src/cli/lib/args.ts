export type ParsedArgs = {
  command: string | null;
  invalid: boolean;
  /**
   * Why the arguments were rejected (a diagnostic for stderr). Set only
   * when `invalid === true`, and holds the reason of the first rejection.
   */
  invalidReason?: string;
  options: {
    root: string;
    rootExplicit: boolean;
    /**
     * Output directory of `qfai init`. When `--root` is given without
     * `--dir`, it holds the `root` value (`--root` acts as an alias for the
     * output directory in init too).
     */
    dir: string;
    /** Whether `--dir` was given. It takes precedence over `--root` when init resolves its output directory. */
    dirExplicit: boolean;
    force: boolean;
    yes: boolean;
    dryRun: boolean;
    upgradeAssistantTree: boolean;
    /**
     * `qfai init --verbose`: expand the run report's `skipped` list. Off by
     * default so a no-op re-run reports its skip count instead of every
     * shipped asset path.
     */
    verbose: boolean;
    reportFormat: "md" | "json";
    reportOut?: string;
    reportIn?: string;
    reportRunValidate: boolean;
    reportBaseUrl?: string;
    doctorFormat: "text" | "json";
    doctorOut?: string;
    validateFormat: "text" | "github";
    profile?:
      | "discussion"
      | "sdd"
      | "prototyping"
      | "atdd"
      | "tdd"
      | "verify"
      | "full"
      | "saas-package"
      | "drift";
    /**
     * `qfai doctor --profile <skill>` per-skill profile. Distinct from
     * the validate-side `profile` enum above: when `doctor --profile`
     * receives a value outside the validate enum, the parser routes it
     * here so the doctor command can probe the named skill manifest.
     */
    doctorSkillProfile?: string;
    /** `qfai doctor --clean`: prune TTL-expired validate run logs. */
    doctorClean?: boolean;
    /** `qfai doctor --autoremediate`: orchestrate install + clean. */
    doctorAutoremediate?: boolean;
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    dbDriftFormat?: "text" | "json";
    dbDriftOut?: string;
    platform?: string;
    prototypingTargetUrl?: string;
    /** Subcommand for `qfai discussion <list|use>`. */
    discussionAction?: "list" | "use";
    /** --active for `qfai discussion list`. */
    discussionActive?: boolean;
    /** --format <text|json> for `qfai discussion list [--active]`. */
    discussionFormat?: "text" | "json";
    /** Positional `<id>` for `qfai discussion use <id>`. */
    discussionId?: string;
    /** Subcommand for `qfai sdd <preflight>`. */
    sddAction?: "preflight";
    /** --format <text|json> for `qfai sdd preflight`. */
    sddFormat?: "text" | "json";
    /** Repeatable `--assume <text>` for `qfai sdd preflight` (carry-over open questions). */
    sddAssumptions: string[];
    /** `--import <path>` for `qfai sdd preflight`: an imported specification to use as the source. */
    sddImport?: string;
    /** Subcommand for `qfai atdd <scaffold>`. */
    atddAction?: "scaffold";
    /** Retired `--spec <id>` value, retained for `qfai atdd scaffold` migration errors. */
    atddSpecId?: string;
    atddStoryId?: string;
    atddFlowId?: string;
    /** `--flow <BF-NNNN>` values for `qfai validate`. */
    validateFlowIds: string[];
    /** `--flow <BF-NNNN>` values for `qfai report`. */
    reportFlowIds: string[];
    /** The operation of `qfai workflow <operation>`. */
    workflowAction?: WorkflowOperation;
    /** `--run <runId>` for `qfai workflow`. */
    workflowRun?: string;
    /** `--in <path>` for `qfai workflow`: the payload file under `.qfai/run/`. */
    workflowIn?: string;
    help: boolean;
    /**
     * `--version` / `-V`: print the resolved tool version to stdout and
     * exit 0. Accepted in the command position and as a trailing flag.
     */
    version: boolean;
    /**
     * Unrecognized `--flag` tokens, in argv order. The CLI prints them
     * before the usage text so a typo names itself.
     */
    unknownFlags: string[];
    /**
     * Exit code used when `invalid` is set. CLI-arg errors (unknown
     * flag, malformed or missing value) exit 2 on every command, per
     * the exit-code table in the init CLI contract.
     */
    invalidExitCode: number;
  };
};

/** The seven operations of `qfai workflow`, and no other. */
export const WORKFLOW_OPERATIONS = [
  "start",
  "next",
  "accept",
  "decision",
  "status",
  "resume",
  "finish",
] as const;

export type WorkflowOperation = (typeof WORKFLOW_OPERATIONS)[number];

/** Every spelling of the help flag the parser accepts. */
const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"]);

/** Every spelling of the version flag the parser accepts. */
const VERSION_FLAGS: ReadonlySet<string> = new Set(["--version", "-V"]);

/**
 * The single-dash flags the parser reserves, derived from the alias sets above
 * so the flag loop and the positional scan can never disagree about which short
 * tokens are flags. Every other option is spelled with `--`.
 */
const RESERVED_SHORT_FLAGS: ReadonlySet<string> = new Set(
  [...HELP_FLAGS, ...VERSION_FLAGS].filter((flag) => !flag.startsWith("--")),
);

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options: ParsedArgs["options"] = {
    root: cwd,
    rootExplicit: false,
    dir: cwd,
    dirExplicit: false,
    force: false,
    yes: false,
    dryRun: false,
    upgradeAssistantTree: false,
    verbose: false,
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    strict: false,
    validateFlowIds: [],
    reportFlowIds: [],
    sddAssumptions: [],
    help: false,
    version: false,
    unknownFlags: [],
    invalidExitCode: 2,
  };

  const args = [...argv];
  let command = args.shift() ?? null;
  let invalid = false;

  if (command !== null && HELP_FLAGS.has(command)) {
    options.help = true;
    command = null;
  }

  let invalidReason: string | undefined;

  if (command !== null && VERSION_FLAGS.has(command)) {
    options.version = true;
    command = null;
  }

  /**
   * Record a rejection. `reason` is the diagnostic main.ts writes to stderr
   * before the usage text. If several rejections fire, the first reason is kept.
   */
  const markInvalid = (reason: string): void => {
    invalid = true;
    options.help = true;
    invalidReason ??= reason;
  };

  const scope = (): string => (command ? `qfai ${command}` : "qfai");
  const missingValue = (flag: string): string => `${scope()}: ${flag} requires a value.`;
  const badValue = (flag: string, value: string, expected: string): string =>
    `${scope()}: invalid value for ${flag}: "${value}". Expected: ${expected}`;
  const notValidHere = (flag: string): string =>
    `${scope()}: ${flag} is not valid for this command.`;
  const formatReason = (value: string): string => {
    const choices = formatChoicesFor(command);
    return choices ? badValue("--format", value, choices) : notValidHere("--format");
  };

  // A first token that starts with `--` is an unknown option, not a command
  // name. `command = args.shift()` removes it, so it never reaches the flag
  // loop below; unless it is caught here it falls into the unknown-command
  // branch of main.ts and exits 0 (`qfai --bogus`). `--help` / `-h` were
  // already nulled by the preceding branch.
  if (command !== null && command.startsWith("--")) {
    options.unknownFlags.push(command);
    markInvalid(`qfai: unknown option: ${command}`);
    command = null;
  }

  /**
   * Whether a flag is on one of the commands that actually reads it.
   *
   * A flag accepted where nothing reads it reaches nothing, and the run
   * proceeds as if it had not been given. `--dir` produced a verdict about the
   * CURRENT tree and made `report` overwrite its `report.md`;
   * `--upgrade-assistant-tree` exited 0 having upgraded nothing;
   * `--dry-run` let an operator believe a run was a rehearsal.
   *
   * The owner lists are derived from where `main.ts` reads each field, not
   * guessed:
   *
   * - `dir`, `upgradeAssistantTree` — `init`
   * - `yes` — `init`, `doctor`
   * - `force` — `init`
   * - `dryRun` — `init`, `doctor`
   *
   * One predicate rather than one per flag: two that mean almost the same
   * thing are two contracts to keep in step.
   */
  const ownedBy = (...commands: string[]): boolean =>
    command !== null && commands.includes(command);

  // `qfai sdd <subcommand>` — currently only `preflight` is supported.
  if (command === "sdd") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "preflight") {
        options.sddAction = candidate;
      } else {
        markInvalid(subcommandReason("sdd", candidate));
      }
      args.shift();
    }
  }

  if (command === "workflow") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      const operation = WORKFLOW_OPERATIONS.find((known) => known === candidate);
      if (operation) {
        options.workflowAction = operation;
      } else {
        markInvalid(subcommandReason("workflow", candidate));
      }
      args.shift();
    }
  }

  // `qfai atdd <subcommand>` — currently only `scaffold` is supported.
  if (command === "atdd") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "scaffold") {
        options.atddAction = candidate;
      } else {
        markInvalid(subcommandReason("atdd", candidate));
      }
      args.shift();
    }
  }

  // `qfai discussion <subcommand> [<id>]` pulls the subcommand token (and the
  // positional <id> for `use`) before the flag loop.
  if (command === "discussion") {
    const candidate = args[0];
    if (isSubcommandToken(candidate)) {
      if (candidate === "list" || candidate === "use") {
        options.discussionAction = candidate;
      } else {
        markInvalid(subcommandReason("discussion", candidate));
      }
      args.shift();
      if (options.discussionAction === "use") {
        const idCandidate = args[0];
        if (isPositionalToken(idCandidate)) {
          options.discussionId = idCandidate;
          args.shift();
        }
      }
    }
  }

  /**
   * Value-token consumption for every value-taking flag arm below.
   * The cursor advances the moment a value token exists — before the arm
   * decides whether the flag is used on an owning command — so rule 1 / 2 of
   * the flag-handling contract holds by construction rather than by each arm
   * remembering a trailing `i += 1`.
   */
  let i = 0;
  const consumeOptionValue = (): string | null => {
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      return null;
    }
    i += 1;
    return next;
  };

  for (; i < args.length; i += 1) {
    const arg = args[i];
    if (arg !== undefined && HELP_FLAGS.has(arg)) {
      options.help = true;
      continue;
    }
    if (arg !== undefined && VERSION_FLAGS.has(arg)) {
      options.version = true;
      continue;
    }
    switch (arg) {
      case "--root":
        {
          const next = consumeOptionValue();
          if (next === null) {
            markInvalid(missingValue("--root"));
            break;
          }
          options.root = next;
          options.rootExplicit = true;
        }
        break;
      case "--dir":
        {
          const next = consumeOptionValue();
          if (next === null) {
            markInvalid(missingValue("--dir"));
            break;
          }
          // `--root` is the flag for pointing another command at a tree, and
          // the usage text this refusal prints says so.
          if (ownedBy("init")) {
            options.dir = next;
            options.dirExplicit = true;
          } else {
            markInvalid(notValidHere("--dir"));
          }
        }
        break;
      case "--force":
        // Read by the `init` arm and nowhere else.
        if (ownedBy("init")) {
          options.force = true;
        } else {
          markInvalid(notValidHere("--force"));
        }
        break;
      case "--yes":
        // Read by the `init` and `doctor` arms and nowhere else.
        if (ownedBy("init", "doctor")) {
          options.yes = true;
        } else {
          markInvalid(notValidHere("--yes"));
        }
        break;
      case "--dry-run":
        // Read by `init` and `doctor`. Accepted elsewhere it let an operator believe a run was a rehearsal.
        if (ownedBy("init", "doctor")) {
          options.dryRun = true;
        } else {
          markInvalid(notValidHere("--dry-run"));
        }
        break;
      case "--upgrade-assistant-tree":
        // Same shape as `--dir`, and worse in one way: accepted elsewhere it
        // exited 0 having upgraded nothing, so the operator went on reading an
        // assistant tree they believed had been refreshed.
        if (ownedBy("init")) {
          options.upgradeAssistantTree = true;
        } else {
          markInvalid(notValidHere("--upgrade-assistant-tree"));
        }
        break;
      case "--verbose":
        // init only, as the help states. Passing it to another command is
        // treated as a mistake rather than silently dropped, so automation
        // does not assume detail was printed and still count the run as a
        // success.
        if (command !== "init") {
          markInvalid(notValidHere("--verbose"));
          break;
        }
        options.verbose = true;
        break;
      case "--format": {
        const next = consumeOptionValue();
        if (next === null) {
          // `--format` requires a value. When it is missing, show the help (without consuming the next option).
          markInvalid(missingValue("--format"));
          break;
        }
        if (command === "discussion") {
          if (next === "text" || next === "json") {
            options.discussionFormat = next;
          } else {
            markInvalid(badValue("--format", next, "text|json"));
          }
          break;
        }
        if (command === "sdd") {
          if (next === "text" || next === "json") {
            options.sddFormat = next;
          } else {
            markInvalid(badValue("--format", next, "text|json"));
          }
          break;
        }
        if (!applyFormatOption(command, next, options)) {
          markInvalid(formatReason(next));
        }
        break;
      }
      case "--active":
        // Per usage(): only `discussion list --active`. `discussion use <id>`
        // reads no value, so --active given there is a mistake.
        if (command === "discussion" && options.discussionAction === "list") {
          options.discussionActive = true;
        } else {
          markInvalid(notValidHere("--active"));
        }
        break;
      case "--strict":
        // Per usage(): read by validate and report. runReport now gates on
        // findings, so it honours strict. runDoctor does not read it, so on
        // doctor it is rejected rather than silently dropped.
        if (command === "validate" || command === "report") {
          options.strict = true;
        } else {
          markInvalid(notValidHere("--strict"));
        }
        break;
      case "--phase":
        markInvalid(`${scope()}: --phase is not supported.`);
        consumeOptionValue();
        break;
      case "--profile": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--profile"));
          break;
        }
        if (isValidationProfile(next)) {
          options.profile = next;
        } else if (command === "doctor" && isSkillProfileName(next)) {
          // `qfai doctor --profile <skill>` accepts arbitrary skill
          // names that fall outside the validate-side enum. The
          // doctor command threads the value into the manifest probe.
          options.doctorSkillProfile = next;
        } else {
          markInvalid(
            badValue(
              "--profile",
              next,
              "discussion|sdd|prototyping|atdd|tdd|verify|full|saas-package|drift",
            ),
          );
        }
        break;
      }
      case "--clean": {
        if (command === "doctor") {
          options.doctorClean = true;
        } else {
          markInvalid(notValidHere("--clean"));
        }
        break;
      }
      case "--autoremediate": {
        if (command === "doctor") {
          options.doctorAutoremediate = true;
        } else {
          markInvalid(notValidHere("--autoremediate"));
        }
        break;
      }
      case "--fail-on": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--fail-on"));
          break;
        }
        // usage(): validate / report / doctor / sdd
        // Only preflight reads failOn. report now gates on findings, so it
        // is on the owning side. On any other command it would not be read,
        // so it is rejected. `sdd` has only the preflight subcommand, and a
        // bare `qfai sdd` is already markInvalid()-ed by the trailing guard,
        // so the command name alone is enough here (runSddPreflightCommand
        // reads `never` as exit 0).
        if (
          command !== "validate" &&
          command !== "report" &&
          command !== "doctor" &&
          command !== "sdd"
        ) {
          markInvalid(notValidHere("--fail-on"));
          break;
        }
        // Silently dropping a bad value would let a typo such as
        // `--fail-on neve` pass as the default failure threshold, and CI
        // would fail with no explanation for the user.
        if (next === "never" || next === "warning" || next === "error") {
          options.failOn = next;
        } else {
          // An unknown threshold must not fall through to the config
          // default: the gate would then silently differ from the flag
          // the caller wrote, in either direction. A typo (`--fail-on warn`)
          // dropped silently would let a CI step that meant to gate on warnings
          // exit 0 on a warning-only run.
          markInvalid(badValue("--fail-on", next, "never|warning|error"));
        }
        break;
      }
      case "--out": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--out"));
          break;
        }
        if (command === "doctor") {
          options.doctorOut = next;
        } else if (command === "report") {
          options.reportOut = next;
        } else if (command === "db-drift") {
          options.dbDriftOut = next;
        } else {
          markInvalid(notValidHere("--out"));
        }
        break;
      }
      case "--in": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--in"));
          break;
        }
        if (command === "report") {
          options.reportIn = next;
        } else if (command === "workflow") {
          options.workflowIn = next;
        } else {
          markInvalid(notValidHere("--in"));
        }
        break;
      }
      case "--run": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--run"));
          break;
        }
        if (command === "workflow") {
          options.workflowRun = next;
        } else {
          markInvalid(notValidHere("--run"));
        }
        break;
      }
      case "--run-validate":
        if (command === "report") {
          options.reportRunValidate = true;
        } else {
          markInvalid(notValidHere("--run-validate"));
        }
        break;
      case "--base-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--base-url"));
          break;
        }
        if (command === "report") {
          options.reportBaseUrl = next;
        } else {
          markInvalid(notValidHere("--base-url"));
        }
        break;
      }
      case "--platform": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--platform"));
          break;
        }
        if (command === "validate") {
          options.platform = next;
        } else {
          markInvalid(notValidHere("--platform"));
        }
        break;
      }
      case "--target-url": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--target-url"));
          break;
        }
        // Only `doctor --profile prototyping` goes through the same
        // targetUrl diagnostic (main.ts: it is not passed to doctor when
        // profile !== "prototyping"). --profile may also follow other tokens,
        // so the profile check for doctor runs in the post-loop guard after
        // the flag loop.
        if (command === "doctor") {
          options.prototypingTargetUrl = next;
        } else {
          markInvalid(notValidHere("--target-url"));
        }
        break;
      }
      // Flag-handling contract — governs EVERY command-specific arm of
      // this switch, not a named subset. (Genuinely global flags —
      // `--root`, `--dir`, `--force`, `--yes`, `--dry-run`, `--help` —
      // are exempt because they have no owning command. `--strict` and
      // `--fail-on` are NOT global: `usage()` scopes them to validate
      // and to validate / doctor respectively,
      // so they carry owner tests like every other arm.)
      //   1. A value-taking flag always reads its value token via
      //      `consumeOptionValue()`, which advances the cursor as part
      //      of the read. A missing value (`null`) is a parse error →
      //      `markInvalid(missingValue(flag))`.
      //   2. When the flag is used on a command / subcommand that does
      //      NOT own it, also call `markInvalid(notValidHere(flag))` so
      //      the misuse is surfaced rather than silently dropped, with a
      //      diagnostic main.ts can print to stderr. The value token is
      //      STILL consumed so it cannot leak into the positional
      //      stream — keeping consumption symmetric across all
      //      value-taking flags.
      //   3. The accepting-subcommand branch performs any per-flag
      //      enum / domain validation and routes the value to the
      //      right option slot.
      // Ownership is the one documented in `usage()` (main.ts).
      // Pre-fix `--scope` (consumed-on-misuse) and `--upgrade-scope`
      // (not-consumed-on-misuse) used opposite conventions for the
      // same goal; this contract block plus the unified shape below
      // resolves the asymmetry.
      case "--spec": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--spec"));
          break;
        }
        if (command === "atdd") {
          options.atddSpecId = next;
        } else if (command === "validate" || command === "report") {
          markInvalid(`${scope()}: --spec is no longer supported. Use --flow BF-NNNN.`);
        } else {
          markInvalid(notValidHere("--spec"));
        }
        break;
      }
      case "--flow": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--flow"));
          break;
        }
        if (command === "atdd") {
          options.atddFlowId = next;
        } else if (command === "validate") {
          options.validateFlowIds.push(next);
        } else if (command === "report") {
          options.reportFlowIds.push(next);
        } else {
          markInvalid(notValidHere("--flow"));
        }
        break;
      }
      case "--story": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--story"));
          break;
        }
        if (command === "atdd") options.atddStoryId = next;
        else markInvalid(notValidHere("--story"));
        break;
      }
      case "--import": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--import"));
          break;
        }
        if (command === "sdd") options.sddImport = next;
        else markInvalid(notValidHere("--import"));
        break;
      }
      case "--assume": {
        const next = consumeOptionValue();
        if (next === null) {
          markInvalid(missingValue("--assume"));
          break;
        }
        if (command === "sdd") {
          // Repeatable: `--assume A --assume B` are listed as they are under
          // `Open Questions (Carry-over)` in the preflight summary.
          options.sddAssumptions.push(next);
        } else {
          markInvalid(notValidHere("--assume"));
        }
        break;
      }
      default:
        // Only a token starting with `--` is read as an unknown flag and
        // marked invalid. A positional such as the `<id>` of
        // `discussion use` must stay out of it, so the test is the `--`
        // prefix rather than "matched no case above".
        if (arg?.startsWith("--")) {
          options.unknownFlags.push(arg);
          markInvalid(`qfai: unknown option: ${arg}`);
        }
        break;
    }
  }

  // `--target-url` on doctor is only honored by the built-in prototyping
  // profile (main.ts gates it on `options.profile === "prototyping"`).
  // `--profile` may appear after `--target-url`, so the pairing can only be
  // judged here, once every token has been read.
  if (
    command === "doctor" &&
    options.prototypingTargetUrl !== undefined &&
    options.profile !== "prototyping"
  ) {
    markInvalid(`qfai doctor: --target-url requires --profile prototyping.`);
  }
  if (command === "discussion" && !options.help && !options.discussionAction) {
    markInvalid(subcommandReason("discussion", null));
  }
  if (command === "atdd" && !options.help && !options.atddAction) {
    markInvalid(subcommandReason("atdd", null));
  }
  if (command === "sdd" && !options.help && !options.sddAction) {
    markInvalid(subcommandReason("sdd", null));
  }
  // Every command except init reads `--root` as the target directory. init
  // looked only at `--dir`, so passing `--root` dropped the value and
  // initialized the cwd. init now treats `--root` as an alias for the output
  // directory too. When `--dir` is given, init's own `--dir` wins.
  if (command === "init" && options.rootExplicit && !options.dirExplicit) {
    options.dir = options.root;
  }
  return { command, invalid, ...(invalidReason ? { invalidReason } : {}), options };
}

/** The set of subcommands accepted by `qfai <command> <subcommand>`. */
const SUBCOMMAND_EXPECTATIONS = new Map<string, string>([
  ["discussion", "list|use"],
  ["atdd", "scaffold"],
  ["sdd", "preflight"],
  ["workflow", WORKFLOW_OPERATIONS.join("|")],
]);

/**
 * Build the diagnostic for a missing or invalid subcommand. `value === null`
 * means none was given at all.
 */
function subcommandReason(command: string, value: string | null): string {
  const expected = SUBCOMMAND_EXPECTATIONS.get(command) ?? "";
  const what = value === null ? "unknown or missing subcommand" : `unknown subcommand "${value}"`;
  return `qfai ${command}: ${what}. Expected: ${expected}`;
}

/** The set of values `--format` accepts for the command (empty = not supported). */
function formatChoicesFor(command: string | null): string {
  if (command === "report") {
    return "md|json";
  }
  if (command === "validate") {
    return "text|github";
  }
  if (command === "doctor") {
    return "text|json";
  }
  return "";
}

/**
 * Whether a token can be the subcommand name in `qfai <command> <subcommand>`.
 *
 * The scan that pulls it runs *before* the flag loop, so testing only for a
 * `--` prefix let the short forms through as candidates: `qfai discussion -V`
 * had `-V` taken as an unknown action and shifted away, which both raised a
 * usage error and stopped the flag loop from ever setting `options.version`,
 * while the long `--version` was skipped here and worked. A subcommand name is
 * drawn from a closed set and none of them starts with `-`, so this position
 * excludes every dash-prefixed token.
 */
function isSubcommandToken(token: string | undefined): token is string {
  return token !== undefined && token.length > 0 && !token.startsWith("-");
}

/**
 * Whether a token can be the positional value after a subcommand, such as the
 * `<id>` of `discussion use`.
 *
 * A positional is caller data rather than a closed set, and it may legitimately
 * begin with a single `-`. So this position excludes only the spellings the
 * parser actually reserves — any `--` long flag, plus RESERVED_SHORT_FLAGS —
 * which still keeps `-V` and `-h` out of the positional and lets them reach the
 * flag loop.
 */
function isPositionalToken(token: string | undefined): token is string {
  return (
    token !== undefined &&
    token.length > 0 &&
    !token.startsWith("--") &&
    !RESERVED_SHORT_FLAGS.has(token)
  );
}

function applyFormatOption(
  command: string | null,
  value: string | undefined,
  options: ParsedArgs["options"],
): boolean {
  if (!value) {
    return false;
  }
  if (command === "report") {
    if (value === "md" || value === "json") {
      options.reportFormat = value;
      return true;
    }
    return false;
  }
  if (command === "validate") {
    if (value === "text" || value === "github") {
      options.validateFormat = value;
      return true;
    }
    return false;
  }
  if (command === "doctor") {
    if (value === "text" || value === "json") {
      options.doctorFormat = value;
      return true;
    }
    return false;
  }
  if (command === "db-drift") {
    if (value === "text" || value === "json") {
      options.dbDriftFormat = value;
      return true;
    }
    return false;
  }
  return false;
}

function isSkillProfileName(value: string): boolean {
  // Skill names are non-empty, lower-kebab-case-ish identifiers. Keep
  // the gate permissive so future skills don't need a parser update.
  return /^[a-z][a-z0-9-]*$/u.test(value);
}

function isValidationProfile(
  value: string,
): value is
  | "discussion"
  | "sdd"
  | "prototyping"
  | "atdd"
  | "tdd"
  | "verify"
  | "full"
  | "saas-package"
  | "drift" {
  return (
    value === "discussion" ||
    value === "sdd" ||
    value === "prototyping" ||
    value === "atdd" ||
    value === "tdd" ||
    value === "verify" ||
    value === "full" ||
    value === "saas-package" ||
    value === "drift"
  );
}
