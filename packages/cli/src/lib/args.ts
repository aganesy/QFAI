export type ParsedArgs = {
  command: string | null;
  options: {
    root: string;
    force: boolean;
    dryRun: boolean;
    help: boolean;
  };
};

export function parseArgs(argv: string[], cwd: string): ParsedArgs {
  const options = {
    root: cwd,
    force: false,
    dryRun: false,
    help: false,
  };

  const args = [...argv];
  const command = args.shift() ?? null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        options.root = args[i + 1] ?? options.root;
        i += 1;
        break;
      case "--force":
        options.force = true;
        break;
      case "--dry-run":
        options.dryRun = true;
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
