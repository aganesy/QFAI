export type ParsedArgs = {
  command: string | null;
  invalid: boolean;
  options: {
    prototypingAction?: "run";
    prototypingMode?: "full-harness";
    prototypingTargetUrl?: string;
    prototypingBrowserProvider?: string;
    prototypingRenderProvider?: string;
    prototypingReviewer?: string;
    prototypingChangeSummary?: string[];
    prototypingLimitations?: string[];
    root: string;
    rootExplicit: boolean;
    dir: string;
    force: boolean;
    yes: boolean;
    dryRun: boolean;
    reportFormat: "md" | "json";
    reportOut?: string;
    reportIn?: string;
    reportRunValidate: boolean;
    reportBaseUrl?: string;
    doctorFormat: "text" | "json";
    doctorOut?: string;
    validateFormat: "text" | "github";
    phase?: "full" | "atdd" | "tdd" | "refinement";
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    guardrailsAction?: "list" | "extract" | "check";
    guardrailsPaths: string[];
    guardrailsMax?: number;
    guardrailsKeyword?: string;
    platform?: string;
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

  if (command === "prototyping") {
    const candidate = args[0];
    if (candidate && !candidate.startsWith("--")) {
      if (candidate === "run") {
        options.prototypingAction = "run";
      } else {
        markInvalid();
      }
      args.shift();
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
      case "--format": {
        const next = readOptionValue(args, i);
        if (next === null) {
          // `--format` は値必須。欠落時はヘルプ表示（ただし次オプションは食わない）。
          markInvalid();
          break;
        }
        applyFormatOption(command, next, options);
        i += 1;
        break;
      }
      case "--strict":
        options.strict = true;
        break;
      case "--mode": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (next === "full-harness") {
          options.prototypingMode = next;
        } else {
          markInvalid();
        }
        i += 1;
        break;
      }
      case "--target-url": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingTargetUrl = next;
        i += 1;
        break;
      }
      case "--browser-provider": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingBrowserProvider = next;
        i += 1;
        break;
      }
      case "--render-provider": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingRenderProvider = next;
        i += 1;
        break;
      }
      case "--reviewer": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingReviewer = next;
        i += 1;
        break;
      }
      case "--change-summary": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingChangeSummary ??= [];
        options.prototypingChangeSummary.push(next);
        i += 1;
        break;
      }
      case "--limitation": {
        if (command !== "prototyping") {
          break;
        }
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        options.prototypingLimitations ??= [];
        options.prototypingLimitations.push(next);
        i += 1;
        break;
      }
      case "--phase": {
        const next = readOptionValue(args, i);
        if (next === null) {
          markInvalid();
          break;
        }
        if (next === "full" || next === "atdd" || next === "tdd" || next === "refinement") {
          options.phase = next;
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
        if (command === "doctor") {
          options.doctorOut = next;
        } else {
          options.reportOut = next;
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

  return { command, invalid, options };
}

function readOptionValue(args: string[], index: number): string | null {
  const next = args[index + 1];
  if (!next || next.startsWith("--")) {
    return null;
  }
  return next;
}

function applyFormatOption(
  command: string | null,
  value: string | undefined,
  options: ParsedArgs["options"],
): void {
  if (!value) {
    return;
  }
  if (command === "report") {
    if (value === "md" || value === "json") {
      options.reportFormat = value;
    }
    return;
  }
  if (command === "validate") {
    if (value === "text" || value === "github") {
      options.validateFormat = value;
    }
    return;
  }
  if (command === "doctor") {
    if (value === "text" || value === "json") {
      options.doctorFormat = value;
    }
    return;
  }

  if (value === "md" || value === "json") {
    options.reportFormat = value;
  }
  if (value === "text" || value === "github") {
    options.validateFormat = value;
  }
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
