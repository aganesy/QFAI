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
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    guardrailsAction?: "list" | "extract" | "check";
    guardrailsPaths: string[];
    guardrailsMax?: number;
    guardrailsKeyword?: string;
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
        } else {
          markInvalid();
        }
        i += 1;
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
        options.reportIn = next;
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
        options.reportBaseUrl = next;
        i += 1;
        break;
      }
      case "--path": {
        if (command !== "guardrails") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.guardrailsPaths.push(next);
        i += 1;
        break;
      }
      case "--max": {
        if (command !== "guardrails") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        const parsed = Number.parseInt(next, 10);
        if (Number.isNaN(parsed)) {
          markInvalid();
          break;
        }
        options.guardrailsMax = parsed;
        i += 1;
        break;
      }
      case "--keyword": {
        if (command !== "guardrails") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.guardrailsKeyword = next;
        i += 1;
        break;
      }
      case "--platform": {
        if (command !== "validate") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.platform = next;
        i += 1;
        break;
      }
      case "--target-url": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingTargetUrl = next;
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
        if (parsed === null) {
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
        options.prototypingLicensePatch = next;
        i += 1;
        break;
      }
      case "--primary-spec-id": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingPrimarySpecId = next;
        i += 1;
        break;
      }
      case "--check-convergence": {
        // Read-only peek of the canonical prototyping state file. No
        // value; presence flips the boolean. Only meaningful for
        // `qfai prototyping iterate`; main.ts wires it through only on
        // the iterate path. Currently silently ignored for
        // `preflight` / `certify` / `show-spec` (consistent with
        // `--check` / `--license-patch` / `--primary-spec-id`); see
        // .qfai/contracts/cli/qfai-prototyping-iterate.md.
        // TODO(next-minor): cross-subcommand `markInvalid()` follow-up.
        options.prototypingCheckConvergence = true;
        break;
      }
      case "--capture": {
        // Opt-in PNG/HTML capture. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`;
        // silently ignored on other prototyping subcommands today.
        // TODO(next-minor): cross-subcommand markInvalid() follow-up
        // (see `--check-convergence` note above).
        options.prototypingCapture = true;
        break;
      }
      case "--auto-serve": {
        // Opt-in local HTTP server spawn. No value; presence flips the
        // boolean. Only meaningful for `qfai prototyping iterate`;
        // silently ignored on other prototyping subcommands today.
        // TODO(next-minor): cross-subcommand markInvalid() follow-up
        // (see `--check-convergence` note above).
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
        if (next === "placeholder" || next === "full" || next === "stub") {
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
        if (next === "convergence" || next === "exploration") {
          options.prototypingMode = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--scope": {
        if (command !== "audit") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.auditScope = next;
        i += 1;
        break;
      }
      case "--operator": {
        if (command !== "audit") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.auditOperator = next;
        i += 1;
        break;
      }
      case "--clause": {
        if (command !== "audit") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.auditClause = next;
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
