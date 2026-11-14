import path from "node:path";

export type GraphHookHost = "claude" | "codex" | "copilot" | "vscode";

export interface GraphHookEvent {
  tool: string;
  command?: string;
  path?: string;
  session?: string;
  cwd?: string;
  workdir?: string;
  shell?: string;
}

export interface GraphHookDecision {
  decision: "allow" | "deny";
  state: "configured" | "failed" | "outside-boundary";
  message: string;
  operation?: string;
  target?: string;
  domain?: "code" | "documents";
  exceptionEligible?: boolean;
  fallbackUnavailable?: true;
}

type GraphSearchAuthorization = (decision: GraphHookDecision) => GraphHookDecision;
type GraphShell = "posix" | "powershell" | "cmd";

/**
 * One command of a shell event; `upstream` is the pipeline stage whose output it reads,
 * and `join` the operator that joins it to the command before it.
 */
interface ShellCommand {
  words: string[];
  upstream?: ShellCommand;
  join?: ShellOperator;
}

type ShellOperator = "&&" | "||" | "|" | ";" | "&" | "\n";

/**
 * Where the shell stands when a command runs: the observed directory, a directory
 * inside it reached by an unconditional `cd` chain, or a place the text cannot tell.
 */
type ShellLocation = "observed" | "unknown" | { directory: string };

interface ShellScope {
  authorize: GraphSearchAuthorization;
  shell: GraphShell;
  directory?: string;
}

interface CommandContext extends ShellScope {
  location: ShellLocation;
  redefined: boolean;
}

export function classifyGraphExploration(
  event: GraphHookEvent,
  authorize: GraphSearchAuthorization = (decision) => decision,
): GraphHookDecision {
  if (event.tool === "write_stdin") return outsideBoundary();
  if (
    ["rg", "grep", "grep_search", "search_files", "file_search"].includes(event.tool.toLowerCase())
  ) {
    return authorize(denyExploration(event.tool, event.path ?? "."));
  }
  const shell: GraphShell =
    /(?:^|[\\/])(?:pwsh|powershell)(?:\.exe)?$/i.test(event.shell ?? "") ||
    event.tool.toLowerCase() === "powershell" ||
    (event.tool === "exec_command" && !event.shell && process.platform === "win32")
      ? "powershell"
      : /(?:^|[\\/])cmd(?:\.exe)?$/i.test(event.shell ?? "")
        ? "cmd"
        : "posix";
  const directory = event.cwd ? path.resolve(event.cwd, event.workdir ?? ".") : undefined;
  return (
    classifyShellText(
      event.command ?? "",
      { authorize, shell, ...(directory ? { directory } : {}) },
      0,
      false,
      "observed",
    ) ?? {
      decision: "allow",
      state: "configured",
      message: "No direct exploration was classified.",
    }
  );
}

/** Classify one shell command line, including the command lists its substitutions run. */
function classifyShellText(
  text: string,
  scope: ShellScope,
  depth: number,
  redefinedOutside: boolean,
  start: ShellLocation,
  substitution = false,
): GraphHookDecision | undefined {
  if (depth > 16) return failedGraphHook("depth");
  // Nested text, such as a `bash -c` argument or a substitution body, skips no
  // here-document body: what reads its output lies outside it.
  const commands = shellPipelines(text, scope.shell, depth > 0);
  // Text in a substitution that cannot be read as commands is no verdict of its own.
  if (!commands) return substitution ? undefined : failedGraphHook("quote");
  return classifyCommands(
    commands,
    scope,
    depth,
    redefinedOutside,
    start,
    substitutionBodies(text, scope.shell).map(
      (body) => (location: ShellLocation, redefines: boolean) =>
        classifyShellText(body, scope, depth + 1, redefines, location, true),
    ),
  );
}

type NestedClassification = (
  location: ShellLocation,
  redefined: boolean,
) => GraphHookDecision | undefined;

function classifyCommands(
  commands: ShellCommand[],
  scope: ShellScope,
  depth: number,
  redefinedOutside: boolean,
  start: ShellLocation,
  substitutions: NestedClassification[] = [],
): GraphHookDecision | undefined {
  const redefined =
    redefinedOutside || commands.some((command) => redefinesCommands(command.words));
  // A substitution runs its own command list, so a search inside one is a search.
  // Only its denial counts here: what else it runs keeps the outer verdict. Which
  // command holds it is not tracked, so it runs from the start only while no command
  // in the list moves the shell anywhere else.
  const stays = commands.every((command) => {
    const operand = directoryOperand(command.words);
    if (operand === undefined) return true;
    return (
      !redefined &&
      operand !== null &&
      start === "observed" &&
      scope.directory !== undefined &&
      path.resolve(scope.directory, operand) === scope.directory
    );
  });
  for (const classify of substitutions) {
    const decision = classify(stays ? start : "unknown", redefined);
    if (decision?.decision === "deny") return decision;
  }
  let location = start;
  let boundary: GraphHookDecision | undefined;
  let allowed: GraphHookDecision | undefined;
  for (const [index, command] of commands.entries()) {
    // After a move, only an `&&` chain, or a pipeline inside one, runs where the move went:
    // `||`, `;`, `&` and a new line also run when the move failed.
    if (typeof location === "object" && index > 0 && command.join !== "&&" && command.join !== "|")
      location = "unknown";
    const operand = directoryOperand(command.words);
    if (operand !== undefined) {
      location = redefined
        ? "unknown"
        : movedLocation(location, operand, command, commands[index + 1], scope);
    }
    const decision = classifyCommand(
      command.words,
      { ...scope, location, redefined },
      depth,
      command.upstream,
    );
    if (decision?.decision === "deny") return decision;
    if (decision?.state === "outside-boundary") boundary = decision;
    else if (decision) allowed = decision;
  }
  return boundary ?? allowed;
}

/**
 * Whether a command defines a function or alias, or sets a variable a later
 * command may read, so a name in the same event may not run the program it names.
 */
function redefinesCommands(words: string[]): boolean {
  let offset = 0;
  for (;;) {
    const redirection = redirectionLength(words[offset]);
    if (redirection) offset += redirection;
    else if (["builtin", "command", "env"].includes(words[offset]?.toLowerCase() ?? "")) {
      offset += 1;
      while (words[offset]?.startsWith("-")) {
        offset += /^-[uCS]$|^--(?:unset|chdir|split-string)$/.test(words[offset] ?? "") ? 2 : 1;
      }
    } else break;
  }
  const first = words[offset] ?? "";
  return (
    words.some((word) => word.includes("()") || /^\{[A-Za-z_][A-Za-z0-9_]*\}[<>]/.test(word)) ||
    /^(?:[A-Za-z_][A-Za-z0-9_]*=|\$|\{\w*\}?[<>]?$|\{\w+\}[<>])/.test(first) ||
    (first === "printf" && words.includes("-v")) ||
    [
      "time",
      "!",
      "if",
      "then",
      "do",
      "else",
      "elif",
      "while",
      "until",
      "case",
      "coproc",
      "read",
      "mapfile",
      "readarray",
      "getopts",
    ].includes(first) ||
    [
      "function",
      "alias",
      "export",
      "declare",
      "typeset",
      "readonly",
      "set",
      "setx",
      "set-alias",
      "new-alias",
      "sal",
      "nal",
      "set-item",
      "si",
      "set-variable",
      "sv",
      "filter",
      "new-item",
      "ni",
      "iex",
      "invoke-expression",
      "eval",
      "source",
      ".",
      "hash",
    ].includes(words[offset] === "." ? "." : (commandName(words.slice(offset)) ?? ""))
  );
}

/** A redirection's descriptor: a number, `&`, or a `{name}` the shell assigns a new one to. */
const redirectionSource = String.raw`(?:\d*|&|\{[A-Za-z_][A-Za-z0-9_]*\})`;
const redirectionStart = new RegExp(String.raw`^${redirectionSource}(?:<|>)`);
const detachedRedirection = new RegExp(String.raw`^${redirectionSource}(?:<>|>{1,2}|<{1,3})[&|]?$`);

/** How many words a leading redirection takes: one when its target is attached, else two. */
function redirectionLength(word: string | undefined): number {
  if (!word || !redirectionStart.test(word)) return 0;
  return detachedRedirection.test(word) ? 2 : 1;
}

/**
 * The target of a command that changes the shell's directory: `undefined` when the
 * command changes none, `null` when its target cannot be read from the text. A `..`
 * segment is unreadable: the shell may resolve it from a CDPATH entry or through a
 * symbolic link, not lexically. `popd` returns to a directory the text does not name,
 * a `+N` operand rotates the directory stack, and a colon other than a drive letter's
 * names a PowerShell provider drive such as `env:`, not a folder.
 */
function directoryOperand(words: string[]): string | null | undefined {
  let offset = 0;
  while (offset < words.length) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "")) {
      offset += 1;
      continue;
    }
    if (!["command", "builtin", "env"].includes(words[offset]?.toLowerCase() ?? "")) break;
    offset += 1;
    if (words[offset] === "-v" || words[offset] === "-V") return undefined;
    while (words[offset]?.startsWith("-")) offset += 1;
  }
  const name = words[offset]?.toLowerCase() ?? "";
  if (!["cd", "chdir", "pushd", "popd", "set-location", "sl"].includes(name)) return undefined;
  const operands = words.slice(offset + 1);
  const target = operands[0];
  return name === "popd" ||
    operands.length !== 1 ||
    target === undefined ||
    target.startsWith("-") ||
    target.startsWith("+") ||
    (target.includes(":") && !/^[A-Za-z]:[\\/]/.test(target)) ||
    /[$`~%*?[\]{}]/.test(target) ||
    target.split(/[\\/]/).includes("..")
    ? null
    : target;
}

/**
 * Where the shell stands after a directory command. A move to the observed directory
 * itself changes nothing, whatever joins it. A move into a directory inside it is
 * followed only while the move runs unconditionally before what comes next: it is
 * not a pipeline stage, which runs in a subshell, no `||` joins it to the command
 * before it, which may skip it, and an `&&` joins it to the next command. Any other
 * move, or one whose target cannot be read, leaves the location unknown.
 *
 * A relative POSIX target that does not start with `.` is resolved from CDPATH when
 * that is set, so such a move is followed only while CDPATH is unset. Ceiling: the
 * hook reads its own environment, so a CDPATH that only the agent's shell sets is
 * not seen. Lift when a host reports the shell environment in the pre-tool event.
 */
function movedLocation(
  location: ShellLocation,
  operand: string | null,
  command: ShellCommand,
  next: ShellCommand | undefined,
  scope: ShellScope,
): ShellLocation {
  if (location === "unknown" || operand === null || !scope.directory) return "unknown";
  const from = location === "observed" ? scope.directory : location.directory;
  const directory = path.resolve(from, operand);
  if (location === "observed" && directory === scope.directory) return "observed";
  if (outside(scope.directory, directory)) return "unknown";
  if (command.join === "|" || command.join === "||" || (next !== undefined && next.join !== "&&"))
    return "unknown";
  if (
    scope.shell === "posix" &&
    !path.isAbsolute(operand) &&
    !operand.startsWith(".") &&
    process.env.CDPATH
  )
    return "unknown";
  return { directory };
}

function outside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

/**
 * Hands a denied search to the fallback authorization from where the shell stands.
 * After a followed move, the search target is rebased to the project-relative path
 * it names, so the grant matches the scope the search actually reads. A `..` segment
 * is not rebased: through a symbolic link it resolves from the link's real location.
 */
function authorizeAt(context: CommandContext, decision: GraphHookDecision): GraphHookDecision {
  const { location, directory, authorize } = context;
  if (location === "observed") return authorize(decision);
  if (location === "unknown" || !directory)
    return graphFallbackUnavailable(
      decision,
      "The command changes its working directory.",
      "Run a single search from this project worktree, then retry the denied action.",
    );
  if (!decision.exceptionEligible || decision.target === undefined || !decision.operation)
    return authorize(decision);
  if (decision.target.split(/[\\/]/).includes(".."))
    return graphFallbackUnavailable(
      decision,
      "The search target has a .. segment after a directory change.",
      "Run a single search from this project worktree, then retry the denied action.",
    );
  const target = path.resolve(location.directory, decision.target);
  if (outside(directory, target))
    return graphFallbackUnavailable(
      decision,
      "The search target resolves outside this project worktree.",
      "Run a single search with one explicit project-relative target, then retry the denied action.",
    );
  const relative = path.relative(directory, target).split(path.sep).join("/") || ".";
  return authorize({ ...denyExploration(decision.operation, relative), exceptionEligible: true });
}

function classifyCommand(
  words: string[],
  context: CommandContext,
  depth: number,
  upstream?: ShellCommand,
): GraphHookDecision | undefined {
  const { redefined } = context;
  if (depth > 16) return failedGraphHook("depth");
  let offset = 0;
  while (offset < words.length) {
    const redirection = redirectionLength(words[offset]);
    if (redirection) offset += redirection;
    else if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "")) offset += 1;
    else break;
  }
  if (offset > 0) {
    return classifyCommand(words.slice(offset), context, depth + 1);
  }
  const operation = commandName(words);
  if (operation === "env" || operation === "command" || operation === "builtin") {
    let offset = 1;
    while (offset < words.length) {
      const redirection = redirectionLength(words[offset]);
      if (redirection) offset += redirection;
      else if (
        words[offset]?.startsWith("-") ||
        /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "")
      )
        offset += 1;
      else break;
    }
    return classifyCommand(words.slice(offset), context, depth + 1);
  }
  if (["bash", "sh", "zsh", "pwsh", "powershell", "cmd"].includes(operation ?? "")) {
    const switchIndex = words.findIndex((word) => /^(?:-[a-z]*c|\/c|-command)$/i.test(word));
    const inner = switchIndex >= 0 ? words[switchIndex + 1] : undefined;
    if (!inner) return outsideBoundary();
    const shell =
      operation === "pwsh" || operation === "powershell"
        ? "powershell"
        : operation === "cmd"
          ? "cmd"
          : "posix";
    return classifyShellText(
      inner,
      {
        authorize: context.authorize,
        shell,
        ...(context.directory ? { directory: context.directory } : {}),
      },
      depth + 1,
      redefined,
      context.location,
    );
  }
  if (!redefined && pipeFilter(words) && printsText(upstream)) return undefined;
  if (operation === "rg" || operation === "grep" || operation === "findstr") {
    let offset = 1;
    while (
      /^(?:-[RrinlIHsvwxcFoq]+|--(?:hidden|line-number|ignore-case|fixed-strings|recursive)|\/[SIMOPVNLR]+)$/i.test(
        words[offset] ?? "",
      )
    )
      offset += 1;
    if (words[offset] === "--") offset += 1;
    const positional = words.slice(offset);
    const eligible =
      positional.length > 0 &&
      positional.length <= 2 &&
      !positional.some((word) => word.startsWith("-") || /[$%`<>]/.test(word));
    const target = eligible ? (positional[1] ?? ".") : JSON.stringify(positional);
    return authorizeAt(context, {
      ...denyExploration(operation, target),
      exceptionEligible: eligible,
    });
  }
  let gitCommand = 1;
  if (operation === "git") {
    while (words[gitCommand]?.startsWith("-")) {
      const option = words[gitCommand];
      gitCommand += ["-C", "-c", "--git-dir", "--work-tree"].includes(option ?? "") ? 2 : 1;
    }
  }
  if (operation === "git" && words[gitCommand]?.toLowerCase() === "grep") {
    const paths = words.indexOf("--");
    const targets = paths >= 0 ? words.slice(paths + 1) : [];
    const eligible =
      gitCommand === 1 &&
      targets.length <= 1 &&
      (paths >= 0 || words.length === 3) &&
      !targets.some((word) => /[$%`<>]/.test(word));
    return authorizeAt(context, {
      ...denyExploration(
        "git grep",
        eligible ? (targets[0] ?? ".") : JSON.stringify(words.slice(1)),
      ),
      exceptionEligible: eligible,
    });
  }
  if (operation === "select-string") {
    const path = words.findIndex((word) => /^-(?:literalpath|path)$/i.test(word));
    const targets: string[] = [];
    for (let offset = path + 1; path >= 0 && offset < words.length; offset += 1) {
      const word = words[offset];
      if (word === undefined || word.startsWith("-")) break;
      targets.push(word);
    }
    const eligible = targets.length === 1 && !targets.some((word) => /[,$%`<>]/.test(word));
    return authorizeAt(context, {
      ...denyExploration("Select-String", eligible ? (targets[0] ?? ".") : JSON.stringify(targets)),
      exceptionEligible: eligible,
    });
  }
  if (
    !operation ||
    [
      "echo",
      "printf",
      "write-output",
      "cat",
      "get-content",
      "pnpm",
      "npm",
      "npx",
      "corepack",
      "node",
      "nodejs",
      "python",
      "python3",
      "uv",
      "git",
      "pwd",
      "get-location",
      "ls",
      "dir",
      "sort",
    ].includes(operation)
  ) {
    return undefined;
  }
  return outsideBoundary();
}

function commandName(words: string[]): string | undefined {
  return words[0]
    ?.split(/[\\/]/)
    .at(-1)
    ?.replace(/\.exe$/i, "")
    .toLowerCase();
}

/** A word the shell may expand or redirect, so what the command reads cannot be told from the text. */
function unparsedWord(word: string): boolean {
  return /\$(?!$)|[`<>]|%[^%\s]+%/.test(word);
}

/**
 * Whether a pipeline stage prints only text that is not project file contents:
 * git, a package-manager command, a literal echo, or a sort or filter of such text.
 * Every other stage, including cat, Get-Content and Get-ChildItem, may hand the
 * next stage project files or their contents, so a search over it stays denied.
 */
function printsText(command: ShellCommand | undefined): boolean {
  if (
    !command ||
    command.words.some(
      (word) =>
        /[(){}@]/.test(word) || (unparsedWord(word) && !/^\d*>(?:&\d|\/dev\/null)$/.test(word)),
    )
  )
    return false;
  const name = /[\\/=]/.test(command.words[0] ?? "") ? "" : (commandName(command.words) ?? "");
  const args = command.words.slice(1);
  if (name === "git") {
    return (
      gitTextCommands.has(args[0] ?? "") &&
      !args.some(
        (word) =>
          word === "--no-index" ||
          /^(?:\/|[A-Za-z]:|\\|~|:\/)|(?:^|[\\/:])\.\.(?:[\\/]|$)/.test(word),
      )
    );
  }
  if (["echo", "printf", "write-output"].includes(name))
    return !args.some((word) => /[*?[!]/.test(word));
  if (name === "pnpm" || name === "npm") return packageTextCommands.has(args[0] ?? "");
  if (name === "corepack") {
    return ["pnpm", "npm"].includes(args[0] ?? "") && packageTextCommands.has(args[1] ?? "");
  }
  if (name === "sort" || name === "uniq") {
    const switches = name === "sort" ? /^-[rnufbdhMV]+$/ : /^-[cdiu]+$/;
    return args.every((word) => switches.test(word)) && printsText(command.upstream);
  }
  return pipeFilter(command.words) && printsText(command.upstream);
}

/** git subcommands that print names, status, history or differences, never a whole file. */
const gitTextCommands = new Set([
  "status",
  "ls-files",
  "ls-tree",
  "log",
  "diff",
  "branch",
  "remote",
  "rev-list",
  "rev-parse",
  "shortlog",
  "worktree",
]);

/** Package-manager commands whose own output is text; exec, dlx and unknown commands run binaries. */
const packageTextCommands = new Set([
  "test",
  "t",
  "lint",
  "build",
  "typecheck",
  "check-types",
  "ls",
  "list",
  "why",
  "outdated",
  "audit",
  "install",
  "i",
  "ci",
  "view",
  "info",
]);

const grepSwitches = /^-[ivncowxEFGPqsHhIyzZLlbUa]+$/;
const rgSwitches = /^-[ivncowxFsSqaUNHlLIP]+$/;
const longSwitches = new Set([
  "--ignore-case",
  "--invert-match",
  "--line-number",
  "--count",
  "--only-matching",
  "--word-regexp",
  "--line-regexp",
  "--extended-regexp",
  "--fixed-strings",
  "--perl-regexp",
  "--quiet",
  "--silent",
  "--no-filename",
  "--with-filename",
  "--smart-case",
  "--case-sensitive",
]);
const valueOptions = /^(?:-[emABC]|--(?:regexp|max-count|context|after-context|before-context))$/;
const attachedValueOptions =
  /^(?:-e.+|-[mABC]\d+|--(?:regexp|max-count|context|after-context|before-context|color|colour)=.+)$/;

/**
 * Whether a grep, rg, findstr or Select-String stage has a shape known to read
 * only its standard input: known options and a pattern, and no file operand.
 * Any other word, such as an unknown or abbreviated option, keeps it a search.
 */
function pipeFilter(words: string[]): boolean {
  if (/[\\/=]/.test(words[0] ?? "")) return false;
  const name = commandName(words);
  const args = words.slice(1);
  if (args.some((word) => unparsedWord(word) || /[*?[\]{}()~@!]/.test(word))) return false;
  if (name === "findstr") return findstrFilter(args);
  if (name === "select-string") return selectStringFilter(args);
  if (name !== "grep" && name !== "rg") return false;
  let patternGiven = false;
  const operands: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (word === "--") {
      operands.push(...args.slice(index + 1));
      break;
    }
    if (!word.startsWith("-") || word === "-") operands.push(word);
    else if (valueOptions.test(word)) {
      if (word === "-e" || word === "--regexp") patternGiven = true;
      index += 1;
      if (index >= args.length) return false;
    } else if (attachedValueOptions.test(word)) {
      if (/^(?:-e|--regexp=)/.test(word)) patternGiven = true;
    } else if (!(name === "grep" ? grepSwitches : rgSwitches).test(word) && !longSwitches.has(word))
      return false;
  }
  const files = patternGiven ? operands : operands.slice(1);
  return (patternGiven || operands.length > 0) && files.every((word) => word === "-");
}

function findstrFilter(args: string[]): boolean {
  let patternGiven = false;
  const operands: string[] = [];
  for (const word of args) {
    if (/^\/c:./i.test(word)) patternGiven = true;
    else if (word.startsWith("/")) {
      if (!/^\/[ivnxbelrmop]+$/i.test(word)) return false;
    } else if (word.startsWith("-")) return false;
    else operands.push(word);
  }
  return operands.length === (patternGiven ? 0 : 1);
}

/** Select-String names a path by its second positional word, so only one is allowed. */
function selectStringFilter(args: string[]): boolean {
  let patternGiven = false;
  let positional = 0;
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (!word.startsWith("-")) positional += 1;
    else if (/^-(?:pattern|context|encoding)$/i.test(word)) {
      if (/^-pattern$/i.test(word)) patternGiven = true;
      index += 1;
      if (index >= args.length) return false;
    } else if (
      !/^-(?:simplematch|casesensitive|notmatch|allmatches|list|quiet|raw|noemphasis)$/i.test(word)
    )
      return false;
  }
  return positional === (patternGiven ? 0 : 1);
}

function outsideBoundary(): GraphHookDecision {
  return {
    decision: "allow",
    state: "outside-boundary",
    message:
      "Search inside scripts, aliases or continuing input is not verified by this pre-tool boundary.",
  };
}

/**
 * PowerShell's built-in alias `sls` names Select-String. Only PowerShell resolves it:
 * elsewhere `sls` is another program, such as the Serverless Framework CLI.
 */
function resolveAlias(words: string[], shell: GraphShell): string[] {
  return shell === "powershell" && words[0]?.toLowerCase() === "sls"
    ? ["Select-String", ...words.slice(1)]
    : words;
}

/** A file operand that names no device or process file: letters, digits and `._/-` only. */
const DATA_FILE = String.raw`(?!/dev/|/proc/)[\w./-]+`;
/** An operand of `cat` or `tee` on a data line: an option, a file, or a redirection to one. */
const DATA_OPERAND = String.raw`[ \t]+(?:-[A-Za-z]+|>>?[ \t]*${DATA_FILE}|>[ \t]*/dev/null|${DATA_FILE})`;
/**
 * A whole line that writes one here-document to files and nothing else: `cat` or `tee`,
 * plain operands, one `<<` or `<<-` with a quoted identifier delimiter. A line of this
 * shape hands its body to no shell, pipe, descriptor or later command, and the quoted
 * delimiter makes Bash read the body literally, with no expansion or line joining.
 */
const DATA_HEREDOC_LINE = new RegExp(
  String.raw`^[ \t]*(?:cat|tee)(?:${DATA_OPERAND})*[ \t]*<<-?[ \t]*(['"])[A-Za-z_]\w*\1(?:${DATA_OPERAND})*[ \t]*$`,
);
/** A line that may come before a data line: blank, `mkdir -p` of plain paths, or another data line. */
const DATA_PRELUDE_LINE = new RegExp(
  String.raw`^[ \t]*(?:mkdir[ \t]+-p(?:[ \t]+${DATA_FILE})+[ \t]*)?$`,
);

/**
 * Splits a shell command into its pipelines. A nested command string, such as the
 * argument of `bash -c`, skips no here-document body: what reads its output is outside it.
 */
function shellPipelines(
  command: string,
  shell: GraphShell,
  nested = false,
): ShellCommand[] | undefined {
  const commands: ShellCommand[] = [];
  let words: string[] = [];
  let upstream: ShellCommand | undefined;
  let join: ShellOperator | undefined;
  let word = "";
  let quote: string | undefined;
  let afterRedirect: "" | "<" | ">" = "";
  // Here-documents whose bodies start after the next unquoted newline.
  const heredocs: { delimiter: string; stripTabs: boolean; data: boolean }[] = [];
  // The spans of bodies already skipped as data, which later checks do not read.
  const skipped: [number, number][] = [];
  const flushWord = () => {
    if (word.length) words.push(word);
    word = "";
  };
  /**
   * Reads an unquoted `<<` or `<<-` operator and its delimiter word at `index`, pushes
   * both as words, and returns the index after the delimiter. Its body is skipped as data
   * only when the operator's whole line is a data line and every line before it, less
   * bodies already skipped, is a data line or a data prelude. Every other body stays
   * classified as shell text, as if no here-document were read.
   */
  const readHeredocOperator = (index: number): number => {
    if (word.length && !/^\d+$/.test(word)) flushWord();
    let cursor = index + 2;
    const stripTabs = command[cursor] === "-";
    if (stripTabs) cursor += 1;
    words.push(`${word}<<${stripTabs ? "-" : ""}`);
    word = "";
    while (command[cursor] === " " || command[cursor] === "\t") cursor += 1;
    let delimiter = "";
    let read = false;
    let delimiterQuote: string | undefined;
    while (cursor < command.length) {
      const character = command[cursor] ?? "";
      if (delimiterQuote) {
        if (character === delimiterQuote) delimiterQuote = undefined;
        else delimiter += character;
      } else if (character === '"' || character === "'") {
        delimiterQuote = character;
      } else if (character === "\\" && cursor + 1 < command.length) {
        delimiter += command[cursor + 1] ?? "";
        cursor += 1;
      } else if (/[\s;|&<>()]/.test(character)) {
        break;
      } else {
        delimiter += character;
      }
      read = true;
      cursor += 1;
    }
    if (delimiterQuote) {
      quote = delimiterQuote;
      return command.length;
    }
    if (!read) return cursor;
    words.push(delimiter);
    const lineStart = command.lastIndexOf("\n", index) + 1;
    const lineEnd = command.indexOf("\n", index);
    // The command text before the operator's line, less the bodies already skipped as data.
    let earlier = "";
    let from = 0;
    for (const [start, end] of skipped) {
      earlier += command.slice(from, start);
      from = end;
    }
    earlier += command.slice(from, lineStart);
    const line = command.slice(lineStart, lineEnd < 0 ? command.length : lineEnd);
    // A carriage return is an ordinary character to Bash, so a command holding one skips
    // nothing rather than risk ending a body on a different line than Bash does.
    const data =
      !nested &&
      !command.includes("\r") &&
      DATA_HEREDOC_LINE.test(line) &&
      earlier
        .split("\n")
        .every((prior) => DATA_PRELUDE_LINE.test(prior) || DATA_HEREDOC_LINE.test(prior));
    heredocs.push({ delimiter, stripTabs, data });
    return cursor;
  };
  /**
   * Skips the bodies of pending here-documents after the newline at `index`. A body
   * whose delimiter line never comes is not skipped, and when any body on the line is
   * not data none is skipped, so no text is hidden on a guess.
   */
  const skipHeredocs = (index: number): number => {
    let position = index + 1;
    const pending = heredocs.splice(0);
    if (!pending.every((heredoc) => heredoc.data)) return index;
    for (const { delimiter, stripTabs } of pending) {
      let closed = false;
      while (position < command.length && !closed) {
        const end = command.indexOf("\n", position);
        const line = command.slice(position, end < 0 ? command.length : end);
        position = end < 0 ? command.length : end + 1;
        closed = (stripTabs ? line.replace(/^\t+/, "") : line) === delimiter;
      }
      if (!closed) return index;
    }
    skipped.push([index + 1, position]);
    return position - 1;
  };
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (character === undefined) continue;
    const next = command[index + 1];
    const escaped =
      next !== undefined &&
      ((shell === "posix" &&
        character === "\\" &&
        (!quote || (quote === '"' && ['"', "\\", "$", "`", "\n"].includes(next)))) ||
        (shell === "powershell" && character === "`" && quote !== "'") ||
        (shell === "cmd" && character === "^" && !quote));
    const redirectBefore = afterRedirect;
    afterRedirect = "";
    if (escaped) {
      if (next !== "\n") word += next;
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      else word += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (
      (character === "&" || character === "|") &&
      (character === "&"
        ? redirectBefore !== "" && /[\d-]/.test(next ?? "")
        : redirectBefore === ">" && shell === "posix")
    ) {
      word += character;
    } else if (shell === "posix" && character === "&" && next === ">") {
      flushWord();
      word = character;
    } else if (character === "\n" && !words.length && !word.length && upstream) {
      index = skipHeredocs(index);
      continue;
    } else if (character === "|" || character === ";" || character === "&" || character === "\n") {
      flushWord();
      const stage: ShellCommand | undefined = words.length
        ? {
            words: resolveAlias(words, shell),
            ...(upstream ? { upstream } : {}),
            ...(join ? { join } : {}),
          }
        : undefined;
      if (stage) commands.push(stage);
      const pipe = character === "|" && next !== "|" && stage !== undefined;
      const operator: ShellOperator =
        (character === "|" || character === "&") && next === character
          ? character === "|"
            ? "||"
            : "&&"
          : character === "|" || character === "&" || character === ";"
            ? character
            : "\n";
      if ((character === "|" || character === "&") && next === character) index += 1;
      else if (pipe && shell === "posix" && next === "&") index += 1;
      // An empty line after an operator continues the command it joins.
      if (stage || join === undefined || operator !== "\n") join = operator;
      upstream = pipe ? stage : undefined;
      words = [];
      if (character === "\n") index = skipHeredocs(index);
    } else if (/\s/.test(character)) {
      flushWord();
    } else if (
      shell === "posix" &&
      character === "<" &&
      next === "<" &&
      command[index + 2] !== "<" &&
      command[index - 1] !== "<"
    ) {
      index = readHeredocOperator(index) - 1;
    } else {
      if (
        (character === ">" || character === "<") &&
        !/^(?:\d*|\{[A-Za-z_][A-Za-z0-9_]*\})$/.test(word) &&
        !/[<>]$/.test(word) &&
        word !== "&"
      ) {
        flushWord();
      }
      word += character;
      afterRedirect = character === ">" || character === "<" ? character : "";
    }
  }
  if (quote) return undefined;
  flushWord();
  if (words.length) {
    commands.push({
      words: resolveAlias(words, shell),
      ...(upstream ? { upstream } : {}),
      ...(join ? { join } : {}),
    });
  }
  return commands;
}

/**
 * The bodies of the substitutions a shell runs as commands: `$(...)` in POSIX and
 * PowerShell, `@(...)` in PowerShell, `<(...)`, `>(...)` and backticks in POSIX.
 * Single quotes keep them literal, and an escaped opener is not one. An arithmetic
 * `$((...))` runs no command. A substitution left open runs nothing, and no later
 * one can close, so the scan stops there. A here-document body is data and is not
 * scanned: `heredocData` says which bodies.
 */
function substitutionBodies(text: string, shell: GraphShell): string[] {
  if (shell === "cmd") return [];
  const command = shell === "posix" ? heredocData(text) : text;
  const escape = shell === "posix" ? "\\" : "`";
  const bodies: string[] = [];
  let quote: string | undefined;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const next = command[index + 1];
    if (character === escape && quote !== "'") {
      index += 1;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = undefined;
      continue;
    }
    if (character === "'" && !quote) {
      quote = "'";
      continue;
    }
    if (character === '"') {
      quote = quote ? undefined : '"';
      continue;
    }
    const opens =
      next === "(" &&
      (character === "$" ||
        (!quote && shell === "powershell" && character === "@") ||
        (!quote && shell === "posix" && (character === "<" || character === ">")));
    if (opens) {
      const end = closingParenthesis(command, index + 2, escape);
      if (end === undefined) break;
      if (!(character === "$" && command[index + 2] === "(")) {
        bodies.push(command.slice(index + 2, end));
      }
      index = end;
    } else if (shell === "posix" && character === "`") {
      let end = index + 1;
      while (end < command.length && command[end] !== "`") end += command[end] === "\\" ? 2 : 1;
      if (end >= command.length) break;
      bodies.push(command.slice(index + 1, end).replace(/\\([`\\$])/g, "$1"));
      index = end;
    }
  }
  return bodies;
}

/** A `<<` or `<<-` here-document operator and its delimiter, quoted or not; `<<<` is not one. */
const heredocOperator = /<<(?!<)(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;|&<>()'"]+))/y;

/** A line that hands its input to a shell, whose here-document body is a script. */
const feedsShell = /(?:^|[\s|;&(`/])(?:(?:ba|z|da|k)?sh|eval|source)(?=$|[\s|;&)<>])/;

/**
 * The text with each here-document body and its delimiter line removed. The body is
 * text the command reads, such as a commit message, so a backtick or `$(...)` in it
 * starts no substitution here. Only an operator outside quotes, comments and
 * arithmetic starts a body; a `$(` starts a fresh context, as the shell reads it,
 * even inside double quotes. A body fed to a shell is a script and is kept, and so
 * is one with no closing delimiter line.
 * Ceiling: an unquoted delimiter's body does expand `$(...)`, and that body is
 * removed as well, so a search inside it stays unclassified, as it was before.
 */
function heredocData(command: string): string {
  let output = "";
  let quote: string | undefined;
  let comment = false;
  let depth = 0;
  const outer: { quote: string | undefined; depth: number }[] = [];
  let pending: { delimiter: string; stripTabs: boolean }[] = [];
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index] ?? "";
    output += character;
    if (character === "\n") {
      comment = false;
      if (!quote && pending.length) {
        const end = heredocEnd(command, index + 1, pending);
        if (end !== undefined) index = end - 1;
        pending = [];
      }
    } else if (comment) {
      continue;
    } else if (quote === "'") {
      if (character === "'") quote = undefined;
    } else if (character === "\\") {
      output += command[index + 1] ?? "";
      index += 1;
    } else if (character === "$" && command[index + 1] === "(" && command[index + 2] !== "(") {
      outer.push({ quote, depth });
      quote = undefined;
      depth = 0;
      output += "(";
      index += 1;
    } else if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "#" && /^$|[\s;|&(]/.test(command[index - 1] ?? "")) {
      comment = true;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      const context = depth === 0 ? outer.pop() : undefined;
      if (context) ({ quote, depth } = context);
      else depth = Math.max(0, depth - 1);
    } else if (character === "<" && command[index - 1] !== "<") {
      heredocOperator.lastIndex = index;
      const match = heredocOperator.exec(command);
      if (!match) continue;
      const lineStart = command.lastIndexOf("\n", index) + 1;
      const lineEnd = command.indexOf("\n", index);
      const line = command.slice(lineStart, lineEnd < 0 ? command.length : lineEnd);
      if (!feedsShell.test(line) && !command.slice(lineStart, index).includes("((")) {
        pending.push({ delimiter: match[2] ?? match[3] ?? match[4] ?? "", stripTabs: !!match[1] });
      }
      output += command.slice(index + 1, heredocOperator.lastIndex);
      index = heredocOperator.lastIndex - 1;
    }
  }
  return output;
}

/** The index after the delimiter line that closes the last of `bodies`, or undefined. */
function heredocEnd(
  command: string,
  start: number,
  bodies: { delimiter: string; stripTabs: boolean }[],
): number | undefined {
  let position = start;
  for (const { delimiter, stripTabs } of bodies) {
    let closed = false;
    while (!closed && position < command.length) {
      const end = command.indexOf("\n", position);
      const line = command.slice(position, end < 0 ? command.length : end).replace(/\r$/, "");
      position = end < 0 ? command.length : end + 1;
      closed = (stripTabs ? line.replace(/^\t+/, "") : line) === delimiter;
    }
    if (!closed) return undefined;
  }
  return position;
}

/** The index of the `)` that closes a parenthesis opened before `start`, outside quotes. */
function closingParenthesis(command: string, start: number, escape: string): number | undefined {
  let depth = 1;
  let quote: string | undefined;
  for (let index = start; index < command.length; index += 1) {
    const character = command[index];
    if (character === escape && quote !== "'") index += 1;
    else if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === "'" || character === '"') quote = character;
    else if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function denyExploration(operation: string, target: string): GraphHookDecision {
  const domain = /(?:^|[\\/])(?:docs?|spec|adr|requirements)(?:[\\/]|$)|\.md$/i.test(target)
    ? "documents"
    : "code";
  return {
    decision: "deny",
    state: "configured",
    operation,
    target,
    domain,
    message: `Exploration redirected: ${operation} over ${JSON.stringify(target)} was denied. Use ${domain === "code" ? 'CodeGraph for symbols, callers and change impact: node .qfai/tools/graph-cli.mjs code "<question>"' : 'Graphify for document concepts and rationale: node .qfai/tools/graph-cli.mjs documents "<question>"'}. Prepare the required analysis through the CLI. For AI-decided scoped search, run node .qfai/tools/graph-cli.mjs fallback --attempt-id <observed-UUID> --question "<unresolved question>" --reason "<graph limitation>". The fallback command attempts the relevant graph before granting a matching search. Human approval is not required for this search.`,
  };
}

export function graphFallbackUnavailable(
  decision: GraphHookDecision,
  cause: string,
  recovery: string,
): GraphHookDecision {
  return {
    ...decision,
    exceptionEligible: false,
    fallbackUnavailable: true,
    message: `Exploration redirected: ${decision.operation ?? "search"} was denied. Search fallback unavailable: ${cause} ${recovery} Use node .qfai/tools/graph-cli.mjs ${decision.domain === "documents" ? "documents" : "code"} "<question>" for graph exploration.`,
  };
}

export function decodeGraphHookEvent(input: unknown): GraphHookEvent | undefined {
  if (!object(input)) return undefined;
  const snake = ["tool_name", "tool_input", "session_id"].some((key) => key in input);
  const camel = ["toolName", "toolArgs", "sessionId"].some((key) => key in input);
  if (snake && camel) return undefined;
  const tool = input.tool_name ?? input.toolName;
  let payload: unknown = input.tool_input ?? input.toolArgs;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return undefined;
    }
  }
  if (typeof tool !== "string" || !tool.trim() || !object(payload)) return undefined;
  const session = input.session_id ?? input.sessionId;
  if (
    (session !== undefined && (typeof session !== "string" || !session.trim())) ||
    (input.session_id !== undefined &&
      input.sessionId !== undefined &&
      input.session_id !== input.sessionId)
  )
    return undefined;
  const command = payload.command ?? payload.cmd;
  const target = payload.path ?? payload.includePattern;
  const workdir = payload.workdir;
  const shell = payload.shell;
  if (target !== undefined && (typeof target !== "string" || !target.trim())) return undefined;
  if (workdir !== undefined && (typeof workdir !== "string" || !workdir.trim())) return undefined;
  if (shell !== undefined && (typeof shell !== "string" || !shell.trim())) return undefined;
  if (
    ["bash", "powershell", "exec_command"].includes(tool.toLowerCase()) &&
    typeof command !== "string"
  )
    return undefined;
  return {
    tool,
    ...(typeof command === "string" ? { command } : {}),
    ...(typeof target === "string" ? { path: target } : {}),
    ...(typeof workdir === "string" ? { workdir } : {}),
    ...(typeof shell === "string" ? { shell } : {}),
    ...(typeof input.cwd === "string" ? { cwd: input.cwd } : {}),
    ...(typeof session === "string" ? { session } : {}),
  };
}

/** Why the hook could not decide: what it names, and what the user does next. */
export type GraphHookFailure = "configuration" | "input" | "state" | "quote" | "depth";

const FAILURE_MESSAGES: Record<GraphHookFailure, string> = {
  configuration:
    "Graph protection failed: .qfai/tools/graph-enforcement.json is missing or is not a valid enforcement configuration. Repair hook configuration with qfai init before direct exploration.",
  input:
    "Graph protection failed: the hook could not read the host's pre-tool event. Repair hook configuration so the hook receives the host's pre-tool event.",
  state:
    "Graph protection failed: the hook could not read its local search state. Retry, and run qfai doctor if it repeats.",
  quote:
    "Graph protection failed: the hook could not match the quotes in the command. Retry without an unmatched quote, heredoc or here-string.",
  depth:
    "Graph protection failed: the command nests env, command or shell wrappers more than 16 levels deep. Run the inner command directly and retry.",
};

export function failedGraphHook(failure: GraphHookFailure): GraphHookDecision {
  return { decision: "deny", state: "failed", message: FAILURE_MESSAGES[failure] };
}

export function enforceGraphExploration(input: unknown, configuration: unknown): GraphHookDecision {
  if (
    !object(configuration) ||
    Object.keys(configuration).length !== 2 ||
    configuration.kind !== "graph-enforcement" ||
    configuration.denyExploration !== true
  )
    return failedGraphHook("configuration");
  const event = decodeGraphHookEvent(input);
  return event ? classifyGraphExploration(event) : failedGraphHook("input");
}

export function graphHookOutput(
  host: GraphHookHost,
  decision: GraphHookDecision,
): Record<string, unknown> {
  if (decision.decision === "allow") return {};
  return host === "copilot"
    ? { permissionDecision: "deny", permissionDecisionReason: decision.message }
    : {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.message,
        },
      };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
