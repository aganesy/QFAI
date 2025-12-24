export type ParsedArgs = {
  command: string | null;
  options: {
    root: string;
    dir: string;
    force: boolean;
    dryRun: boolean;
    format: "md" | "json";
    help: boolean;
  };
};

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options: ParsedArgs["options"] = {
    root: cwd,
    dir: cwd,
    force: false,
    dryRun: false,
    format: "md",
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
        i += 1;
        break;
      case "--dir":
        options.dir = args[i + 1] ?? options.dir;
        i += 1;
        break;
      case "--force":
        options.force = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--format": {
        const next = args[i + 1];
        if (next === "md" || next === "json") {
          options.format = next;
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

  return { command, options };
}
