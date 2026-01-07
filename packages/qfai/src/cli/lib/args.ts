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
    analyzeList: boolean;
    analyzePrompt?: string;
    reportFormat: "md" | "json";
    reportOut?: string;
    reportIn?: string;
    reportRunValidate: boolean;
    doctorFormat: "text" | "json";
    doctorOut?: string;
    validateFormat: "text" | "github";
    strict: boolean;
    failOn?: "never" | "warning" | "error";
    help: boolean;
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
    analyzeList: false,
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    strict: false,
    help: false,
  };

  const args = [...argv];
  let command = args.shift() ?? null;
  let invalid = false;

  if (command === "--help" || command === "-h") {
    options.help = true;
    command = null;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        {
          const next = readOptionValue(args, i);
          if (next === null) {
            invalid = true;
            options.help = true;
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
            invalid = true;
            options.help = true;
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
      case "--list":
        options.analyzeList = true;
        break;
      case "--prompt":
        {
          const next = readOptionValue(args, i);
          if (next) {
            // 例: `qfai analyze --prompt spec_to_scenario`
            options.analyzePrompt = next;
            i += 1;
          }
          // `--prompt` は値が欠落していても invalid にはしない。
          // 例: `qfai analyze --prompt` は「プロンプト未指定」と同等に扱い、一覧表示へフォールバックする。
        }
        break;
      case "--format": {
        const next = readOptionValue(args, i);
        if (next === null) {
          // `--format` は値必須。欠落時はヘルプ表示（ただし次オプションは食わない）。
          invalid = true;
          options.help = true;
          break;
        }
        applyFormatOption(command, next, options);
        i += 1;
        break;
      }
      case "--strict":
        options.strict = true;
        break;
      case "--fail-on": {
        const next = readOptionValue(args, i);
        if (next === null) {
          invalid = true;
          options.help = true;
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
          invalid = true;
          options.help = true;
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
          invalid = true;
          options.help = true;
          break;
        }
        options.reportIn = next;
        i += 1;
        break;
      }
      case "--run-validate":
        options.reportRunValidate = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        break;
    }
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
