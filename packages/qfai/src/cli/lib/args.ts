export type ParsedArgs = {
  command: string | null;
  options: {
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
    doctorFormat: "text" | "json";
    doctorOut?: string;
    validateFormat: "text" | "github";
    syncFormat: "text" | "json";
    syncMode: "check" | "export";
    syncOut?: string;
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
    reportFormat: "md",
    reportRunValidate: false,
    doctorFormat: "text",
    validateFormat: "text",
    syncFormat: "text",
    syncMode: "check",
    strict: false,
    help: false,
  };

  const args = [...argv];
  let command = args.shift() ?? null;

  if (command === "--help" || command === "-h") {
    options.help = true;
    command = null;
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        options.root = args[i + 1] ?? options.root;
        options.rootExplicit = true;
        i += 1;
        break;
      case "--dir":
        options.dir = args[i + 1] ?? options.dir;
        i += 1;
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
        const next = args[i + 1];
        applyFormatOption(command, next, options);
        i += 1;
        break;
      }
      case "--strict":
        options.strict = true;
        break;
      case "--fail-on": {
        const next = args[i + 1];
        if (next === "never" || next === "warning" || next === "error") {
          options.failOn = next;
        }
        i += 1;
        break;
      }
      case "--out":
        {
          const next = args[i + 1];
          if (next) {
            if (command === "doctor") {
              options.doctorOut = next;
            } else if (command === "sync") {
              options.syncOut = next;
            } else {
              options.reportOut = next;
            }
          }
        }
        i += 1;
        break;
      case "--mode":
        {
          const next = args[i + 1];
          if (command === "sync") {
            if (next === "check" || next === "export") {
              options.syncMode = next;
            }
          }
        }
        i += 1;
        break;
      case "--in":
        {
          const next = args[i + 1];
          if (next) {
            options.reportIn = next;
          }
        }
        i += 1;
        break;
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

  return { command, options };
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
  if (command === "sync") {
    if (value === "text" || value === "json") {
      options.syncFormat = value;
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
