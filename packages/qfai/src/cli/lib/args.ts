export type ParsedArgs = {
  command: string | null;
  invalid: boolean;
  options: {
    root: string;
    rootExplicit: boolean;
    dir: string;
    force: boolean;
    yes: boolean;
    dryRun: boolean;
    upgradeAssistantTree: boolean;
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
      | "saas-package";
    /**
     * `qfai doctor --profile <skill>` per-skill profile. Distinct from
     * the validate-side `profile` enum above: when `doctor --profile`
     * receives a value outside the validate enum, the parser routes it
     * here so the doctor command can probe the named skill manifest.
     */
    doctorSkillProfile?: string;
    /** `qfai doctor --clean`: archive TTL-expired review packs. */
    doctorClean?: boolean;
    /** `qfai doctor --autoremediate`: orchestrate install + clean + config. */
    doctorAutoremediate?: boolean;
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    guardrailsAction?: "list" | "extract" | "check";
    guardrailsPaths: string[];
    guardrailsMax?: number;
    guardrailsKeyword?: string;
    /** --format <text|json> for `qfai guardrails list|extract|check`. */
    guardrailsFormat?: "text" | "json";
    platform?: string;
    prototypingAction?: "preflight" | "iterate" | "certify" | "show-spec";
    prototypingTargetUrl?: string;
    /** Subcommand for `qfai discussion <list|use>`. */
    discussionAction?: "list" | "use";
    /** --active for `qfai discussion list`. */
    discussionActive?: boolean;
    /** --format <text|json> for `qfai discussion list --active`. */
    discussionFormat?: "text" | "json";
    /** Positional `<id>` for `qfai discussion use <id>`. */
    discussionId?: string;
    /** --cycle <n> for `qfai prototyping iterate --cycle <n>`. */
    prototypingCycle?: number;
    /** --check flag for `qfai prototyping certify --check`. */
    prototypingCheckOnly?: boolean;
    /**
     * --scope <saas-package|full> for `qfai prototyping certify`. When
     * set to `saas-package`, the sealed certificate carries
     * `scope: "saas-package"` + `notes[]` enumerating the gates the
     * saas-package profile deliberately skips. Default (omitted) seals
     * a full-scope certificate.
     */
    prototypingScope?: "saas-package" | "full";
    /**
     * --upgrade-scope full for `qfai prototyping certify`. Re-gates the
     * gates skipped by the existing scope-limited certificate against
     * the current project state; rewrites the certificate without the
     * scope-limited markers on success.
     */
    prototypingUpgradeScopeFull?: boolean;
    /** --license-patch <file> for `qfai prototyping iterate`. */
    prototypingLicensePatch?: string;
    /** --primary-spec-id <value> for `qfai prototyping iterate`. */
    prototypingPrimarySpecId?: string;
    /**
     * --check-convergence for `qfai prototyping iterate`. Read-only peek
     * of the canonical prototyping state file; reports stopReason +
     * acceptedIterationIndex without re-running the iterate loop.
     */
    prototypingCheckConvergence?: boolean;
    /**
     * --capture for `qfai prototyping iterate`. Opt-in PNG/HTML capture
     * (default OFF; preserves the no-capture default posture). When
     * present, iterate threads `capture: true` into runPrototypingIterate
     * and the default Playwright runner is loaded dynamically when no
     * DI captureScreen is supplied.
     */
    prototypingCapture?: boolean;
    /**
     * --auto-serve for `qfai prototyping iterate`. Opt-in local HTTP
     * server spawn (default OFF; preserves the no-server default
     * posture). When present, iterate threads `autoServe: true` into
     * runPrototypingIterate and the default in-process HTTP server
     * runner is loaded dynamically when no DI serverRunner is supplied.
     */
    prototypingAutoServe?: boolean;
    /**
     * --emit-skeletons for `qfai prototyping iterate --cycle 0`. Opt-in
     * cycle-0 token-driven placeholder HTML emission (default OFF;
     * preserves prior-release bit-for-bit behavior). Only meaningful at cycle 0;
     * silently ignored on other cycles today.
     */
    prototypingEmitSkeletons?: boolean;
    /**
     * --skeleton-mode for `qfai prototyping iterate --cycle 0
     * --emit-skeletons`. Selects the renderer behavior:
     *   - `placeholder` (default): DESIGN.md-token-styled static HTML,
     *     no per-screen LLM call
     *   - `full`: callers may replace the body via generation (the
     *     renderer itself never calls a model)
     *   - `stub`: minimal `<!doctype html>` marker
     * Unknown values are rejected via markInvalid().
     */
    prototypingSkeletonMode?: "placeholder" | "full" | "stub";
    /**
     * --mode for `qfai prototyping iterate`. Selects the prototyping
     * loop posture:
     *   - `convergence` (default): all gates apply at error severity.
     *   - `exploration`: medium gate relaxation — soft-rubric gates
     *     (QFAI-CRIT-008 axes-exceptional, QFAI-DCON-030..032 design
     *     compliance) downgrade error → warning. Schema / path /
     *     license (exit 66) gates stay hard error.
     * Overrides `qfai.config.yaml#prototyping.mode`. Unknown values
     * are rejected via markInvalid().
     */
    prototypingMode?: "convergence" | "exploration";
    /** Subcommand for `qfai audit <log>`. */
    auditAction?: "log";
    /** --scope filter for `qfai audit log`. */
    auditScope?: string;
    /** --operator filter for `qfai audit log`. */
    auditOperator?: string;
    /** --clause filter for `qfai audit log`. */
    auditClause?: string;
    /** --format <table|json> for `qfai audit log`. */
    auditFormat?: "table" | "json";
    /** Subcommand for `qfai handoff <upgrade>`. */
    handoffAction?: "upgrade";
    /** Positional `<legacy-file>` for `qfai handoff upgrade`. */
    handoffLegacyFile?: string;
    /** Subcommand for `qfai atdd <scaffold>`. */
    atddAction?: "scaffold";
    /** `--spec <id>` value for `qfai atdd scaffold`. */
    atddSpecId?: string;
    /** `--spec <id>` values for `qfai validate` (repeatable; empty = whole repo). */
    validateSpecIds: string[];
    /** `--spec <id>` values for `qfai report` (repeatable; empty = whole repo). */
    reportSpecIds: string[];
    help: boolean;
    invalidExitCode: number;
  };
};

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options: ParsedArgs["options"] = {
    root: cwd,
    rootExplicit: false,
    dir: cwd,
    force: false,
    yes: false,
    dryRun: false,
    upgradeAssistantTree: false,
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    strict: false,
    guardrailsPaths: [],
    validateSpecIds: [],
    reportSpecIds: [],
    help: false,
    invalidExitCode: 1,
  };

  const args = [...argv];
  let command = args.shift() ?? null;
  let invalid = false;

  if (command === "--help" || command === "-h") {
    options.help = true;
    command = null;
  }

  const markInvalid = (): void => {
    invalid = true;
    options.help = true;
    if (command === "guardrails") {
      options.invalidExitCode = 2;
    }
  };

  if (command === "guardrails") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      const action = normalizeGuardrailsAction(candidate);
      if (action) {
        options.guardrailsAction = action;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai prototyping <subcommand>` pulls the subcommand token before the
  // flag loop.
  if (command === "prototyping") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (
        candidate === "preflight" ||
        candidate === "iterate" ||
        candidate === "certify" ||
        candidate === "show-spec"
      ) {
        options.prototypingAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai audit <subcommand>` — currently only `log` is supported.
  if (command === "audit") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "log") {
        options.auditAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai handoff <subcommand> [<legacy-file>]` — currently only `upgrade`.
  if (command === "handoff") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "upgrade") {
        options.handoffAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
      if (options.handoffAction === "upgrade") {
        const fileCandidate = args[0];
        if (fileCandidate && !fileCandidate.startsWith("--")) {
          options.handoffLegacyFile = fileCandidate;
          args.shift();
        }
      }
    }
  }

  // `qfai atdd <subcommand>` — currently only `scaffold` is supported.
  if (command === "atdd") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "scaffold") {
        options.atddAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
    }
  }

  // `qfai discussion <subcommand> [<id>]` pulls the subcommand token (and the
  // positional <id> for `use`) before the flag loop.
  if (command === "discussion") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "list" || candidate === "use") {
        options.discussionAction = candidate;
      } else {
        markInvalid();
      }
      args.shift();
      if (options.discussionAction === "use") {
        const idCandidate = args[0];
        if (idCandidate && !idCandidate.startsWith("--")) {
          options.discussionId = idCandidate;
          args.shift();
        }
      }
    }
  }

  // `prototyping` の subcommand token は flag ループの前に確定するので、
  // iterate 専用 flag の accept 判定はここで一度だけ組み立てる。
  const isPrototypingIterate = command === "prototyping" && options.prototypingAction === "iterate";

  // Value-taking flag-handling contract. Every `case` below that reads
  // a value token consumes it (rule 1) and rejects use on a command
  // that does not own the flag (rule 2). There are no exempt arms.
  //   1. Always read and consume the value token via
  //      `readOptionValue(args, i)` + `i += 1`. A missing value
  //      (`null`) is a parse error → `markInvalid()`.
  //   2. When the flag is used on a command / subcommand that does NOT
  //      accept it, also call `markInvalid()` so the misuse is
  //      surfaced rather than silently dropped. The value token
  //      is STILL consumed so it cannot leak into the positional
  //      stream — keeping consumption symmetric across all
  //      value-taking flags.
  //   3. The accepting-command branch performs any per-flag
  //      enum / domain validation and routes the value to the
  //      right option slot. A rejected value also consumes the token.
  // Cross-command flags (`--root`, `--dir`, `--profile`, `--fail-on`,
  // `--phase`) have no owning command, so rule 2 is vacuous for them;
  // rule 1 still applies.
  // Boolean flags carry no value token, so rule 1 cannot apply to
  // them. Their cross-subcommand misuse is still silent today
  // (`--check`, `--check-convergence`, `--capture`, `--auto-serve`,
  // `--emit-skeletons`, `--active`, `--clean`, `--autoremediate`);
  // TODO(next-minor): extend rule 2 to that set.
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        {
          const next = readOptionValue(args, i);
          if (next === null) {
            markInvalid();
            break;
          }
          options.root = next;
          options.rootExplicit = true;
          i += 1;
        }
        break;
      case "--dir":
        {
          const next = readOptionValue(args, i);
          if (next === null) {
            markInvalid();
            break;
          }
          options.dir = next;
          i += 1;
        }
        break;
      case "--force":
        options.force = true;
        break;
      case "--yes":
        options.yes = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--upgrade-assistant-tree":
        options.upgradeAssistantTree = true;
        break;
      case "--format": {
        const next = readOptionValue(args, i);
        if (next === null) {
          // `--format` は値必須。欠落時はヘルプ表示（ただし次オプションは食わない）。
          markInvalid();
          break;
        }
        if (command === "prototyping" && options.prototypingAction !== "preflight") {
          markInvalid();
          i += 1;
          break;
        }
        if (command === "discussion") {
          if (next === "text" || next === "json") {
            options.discussionFormat = next;
          } else {
            markInvalid();
          }
          i += 1;
          break;
        }
        if (command === "audit") {
          if (next === "table" || next === "json") {
            options.auditFormat = next;
          } else {
            markInvalid();
          }
          i += 1;
          break;
        }
        if (!applyFormatOption(command, next, options)) {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--active":
        if (command === "discussion") {
          options.discussionActive = true;
        }
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--phase":
        markInvalid();
        if (readOptionValue(args, i) !== null) {
          i += 1;
        }
        break;
      case "--profile": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
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
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--clean": {
        if (command === "doctor") {
          options.doctorClean = true;
        }
        break;
      }
      case "--autoremediate": {
        if (command === "doctor") {
          options.doctorAutoremediate = true;
        }
        break;
      }
      case "--fail-on": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (next === "never" || next === "warning" || next === "error") {
          options.failOn = next;
        } else {
          // An unknown threshold must not fall through to the config
          // default: the gate would then silently differ from the flag
          // the caller wrote, in either direction.
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--out": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (
          command === "doctor" ||
          (command === "prototyping" && options.prototypingAction === "preflight")
        ) {
          options.doctorOut = next;
        } else if (command === "report") {
          options.reportOut = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--in": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "report") {
          options.reportIn = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--run-validate":
        options.reportRunValidate = true;
        break;
      case "--base-url": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "report") {
          options.reportBaseUrl = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--path": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "guardrails") {
          options.guardrailsPaths.push(next);
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--max": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        const parsed = Number.parseInt(next, 10);
        if (command !== "guardrails" || Number.isNaN(parsed)) {
          markInvalid();
        } else {
          options.guardrailsMax = parsed;
        }
        i += 1;
        break;
      }
      case "--keyword": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "guardrails") {
          options.guardrailsKeyword = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--platform": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "validate") {
          options.platform = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--target-url": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        // `doctor --profile prototyping` / `prototyping preflight` /
        // `prototyping iterate` の 3 経路のみが targetUrl を読む。
        if (
          command === "doctor" ||
          (command === "prototyping" && options.prototypingAction === "preflight") ||
          isPrototypingIterate
        ) {
          options.prototypingTargetUrl = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--cycle": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        const parsed = parseNonNegativeInteger(next);
        if (!isPrototypingIterate || parsed === null) {
          markInvalid();
        } else {
          options.prototypingCycle = parsed;
        }
        i += 1;
        break;
      }
      case "--check": {
        // only used by `qfai prototyping certify --check`.
        // The flag takes no value; presence flips the boolean.
        options.prototypingCheckOnly = true;
        break;
      }
      case "--license-patch": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (isPrototypingIterate) {
          options.prototypingLicensePatch = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--primary-spec-id": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (isPrototypingIterate) {
          options.prototypingPrimarySpecId = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--check-convergence": {
        // Read-only peek of the canonical prototyping state file. No
        // value; presence flips the boolean. Only meaningful for
        // `qfai prototyping iterate`; main.ts wires it through only on
        // the iterate path. Currently silently ignored for
        // `preflight` / `certify` / `show-spec` — see the boolean-flag
        // note in the value-taking flag contract above, and
        // .qfai/contracts/cli/qfai-prototyping-iterate.md.
        options.prototypingCheckConvergence = true;
        break;
      }
      case "--capture": {
        // Opt-in PNG/HTML capture. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`;
        // silently ignored on other prototyping subcommands today
        // (see the boolean-flag note in the contract block above).
        options.prototypingCapture = true;
        break;
      }
      case "--auto-serve": {
        // Opt-in local HTTP server spawn. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`;
        // silently ignored on other prototyping subcommands today
        // (see the boolean-flag note in the contract block above).
        options.prototypingAutoServe = true;
        break;
      }
      case "--emit-skeletons": {
        // Opt-in cycle-0 placeholder HTML emission. No value; presence
        // flips the boolean. Only meaningful for
        // `qfai prototyping iterate --cycle 0`; iterate itself ignores
        // it on cycle >= 1.
        options.prototypingEmitSkeletons = true;
        break;
      }
      case "--skeleton-mode": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (
          isPrototypingIterate &&
          (next === "placeholder" || next === "full" || next === "stub")
        ) {
          options.prototypingSkeletonMode = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--mode": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (isPrototypingIterate && (next === "convergence" || next === "exploration")) {
          options.prototypingMode = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--spec": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "atdd") {
          options.atddSpecId = next;
        } else if (command === "validate") {
          // Repeatable: `--spec 0003 --spec 0004` scopes the run to both.
          options.validateSpecIds.push(next);
        } else if (command === "report") {
          // Repeatable, same shape as `validate`. Without this branch the
          // per-spec scoping `validate --spec` introduced stopped one command
          // later: a slice worker holding `validate.spec-0003.json` had no way
          // to render its own slice without writing the shared `report.md`.
          options.reportSpecIds.push(next);
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--scope": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditScope = next;
        } else if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "saas-package" || next === "full") {
            options.prototypingScope = next;
          } else {
            markInvalid();
          }
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--upgrade-scope": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "prototyping" && options.prototypingAction === "certify") {
          if (next === "full") {
            options.prototypingUpgradeScopeFull = true;
          } else {
            markInvalid();
          }
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--operator": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditOperator = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--clause": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (command === "audit") {
          options.auditClause = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        break;
    }
  }

  if (command === "guardrails" && !options.help && !options.guardrailsAction) {
    markInvalid();
  }
  if (command === "prototyping" && !options.help && !options.prototypingAction) {
    markInvalid();
  }
  if (command === "discussion" && !options.help && !options.discussionAction) {
    markInvalid();
  }
  if (command === "audit" && !options.help && !options.auditAction) {
    markInvalid();
  }
  if (command === "handoff" && !options.help && !options.handoffAction) {
    markInvalid();
  }
  if (command === "atdd" && !options.help && !options.atddAction) {
    markInvalid();
  }
  return { command, invalid, options };
}

function readOptionValue(args: string[], index: number): string | null {
  const next = args[index + 1];
  if (!next || next.startsWith("--")) {
    return null;
  }
  return next;
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^\d+$/u.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
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
  if (command === "doctor" || command === "prototyping") {
    if (value === "text" || value === "json") {
      options.doctorFormat = value;
      return true;
    }
    return false;
  }
  if (command === "guardrails") {
    if (value === "text" || value === "json") {
      options.guardrailsFormat = value;
      return true;
    }
    return false;
  }
  return false;
}

function normalizeGuardrailsAction(value: string): "list" | "extract" | "check" | null {
  switch (value) {
    case "list":
    case "extract":
    case "check":
      return value;
    default:
      return null;
  }
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
  | "saas-package" {
  return (
    value === "discussion" ||
    value === "sdd" ||
    value === "prototyping" ||
    value === "atdd" ||
    value === "tdd" ||
    value === "verify" ||
    value === "full" ||
    value === "saas-package"
  );
}
