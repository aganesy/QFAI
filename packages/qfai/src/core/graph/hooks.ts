import { closeSync, existsSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export type GraphHookHost = "claude" | "codex" | "copilot" | "vscode";

export interface GraphHookEvent {
  tool: string;
  command?: string;
  path?: string;
  /** The host gave `path` as an include glob, such as VS Code's `includePattern`, not a path. */
  pathIsPattern?: true;
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
  /** The project root a scoped search must stay inside; without one no search is scoped. */
  root?: string;
  /**
   * The project root and the checkout the hook belongs to, given only when the checkout is
   * known: a search that reads one regular file outside all of them is not denied. Empty, no
   * search is exempt as an outside read.
   */
  worktrees: readonly string[];
  /**
   * Whether this text is the whole event: no command before it, and no substitution, can have
   * changed the file system a search would read.
   */
  alone: boolean;
}

interface CommandContext extends ShellScope {
  location: ShellLocation;
  redefined: boolean;
  /**
   * Whether this command is the whole command text, alone or with pipeline stages after it.
   * Only then is a scoped search placed: any command before it, a nested shell, a
   * substitution or a wrapper can move the shell in ways the directory tracker does not
   * follow (`Push-Location`, `cd..`, a script block, `env --chdir`, `pwsh -WorkingDirectory`).
   */
  placeable?: boolean;
}

export function classifyGraphExploration(
  event: GraphHookEvent,
  authorize: GraphSearchAuthorization = (decision) => decision,
  root?: string,
  checkout?: string,
): GraphHookDecision {
  // The outside-file case needs the checkout the hook belongs to. Without it no search is exempt
  // as an outside read, so a caller that knows only the project root never widens it.
  const worktrees = checkout ? [...(root ? [root] : []), checkout] : [];
  if (event.tool === "write_stdin") return outsideBoundary();
  if (
    ["rg", "grep", "grep_search", "search_files", "file_search"].includes(event.tool.toLowerCase())
  ) {
    const base = event.cwd ? path.resolve(event.cwd) : undefined;
    if (event.path !== undefined && !event.pathIsPattern && insideProject(root, base, [event.path]))
      return scopedSearch();
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
      {
        authorize,
        shell,
        worktrees,
        alone: true,
        ...(directory ? { directory } : {}),
        ...(root ? { root } : {}),
      },
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
  // A here-string is read as one string first, so a comment marker or a quote in its text is
  // data to the comment reader too.
  const source =
    scope.shell === "powershell"
      ? withoutPowerShellComments(powershellHereStrings(powerShellLines(text)))
      : text;
  const commands =
    source === undefined ? undefined : shellPipelines(source, scope.shell, depth > 0);
  // Text in a substitution that cannot be read as commands is no verdict of its own.
  if (source === undefined || !commands) {
    return substitution ? undefined : failedGraphHook("quote");
  }
  const bodies = substitutionBodies(source, scope.shell, depth > 0);
  // A substitution whose end the scan cannot find may still run in the shell, which reads
  // comments the scan does not, so the command is denied rather than its body dropped.
  // SIMPLIFIED: this denies a valid command whose substitution holds an unmatched
  // parenthesis, or a comment after an untracked context (`inUntrackedContext`) with a quote
  // or a parenthesis. Lift when: those contexts are tracked as the quotes are.
  if (!bodies) return failedGraphHook("substitution");
  return classifyCommands(
    commands,
    scope,
    depth,
    redefinedOutside,
    start,
    bodies.map(
      (body) => (location: ShellLocation, redefines: boolean) =>
        classifyShellText(body, { ...scope, alone: false }, depth + 1, redefines, location, true),
    ),
  );
}

/**
 * PowerShell text with each here-string read as a plain string. The body of `@'...'@` is
 * literal, so it becomes `''`; a quote inside it, such as the apostrophe in `It's`, no longer
 * ends a string early. The body of `@"..."@` still expands `$(...)`, so it stays inside double
 * quotes with its own double quotes removed.
 */
function powershellHereStrings(text: string): string {
  let output = "";
  let quote: string | undefined;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";
    if (character === "`" && quote !== "'") {
      output += character + (text[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      output += character;
      continue;
    }
    // Only an `@'` or `@"` outside a string opens one, and whichever opens first is the string.
    hereString.lastIndex = index;
    const match = character === "@" ? hereString.exec(text) : null;
    if (match) {
      output += match[1] === "'" ? "''" : `"${(match[2] ?? "").replace(/"/g, "")}"`;
      index = hereString.lastIndex - 1;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    output += character;
  }
  return output;
}

/** A PowerShell here-string: `@'` or `@"` at a line end, closed by `'@` or `"@` at a line start. */
const hereString = /@(['"])[ \t]*\r?\n([\s\S]*?)\r?\n\1@/y;

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
  // Inside a `case`, a command that starts with a word ending in `)`, such as `y)`
  // or `"a b")`, is an arm: its pattern is not a command.
  let openCases = 0;
  const sole =
    depth === 0 &&
    substitutions.length === 0 &&
    commands.every((command, index) => index === 0 || command.join === "|");
  for (const [index, command] of commands.entries()) {
    const words =
      openCases > 0 && command.words[0]?.endsWith(")") ? command.words.slice(1) : command.words;
    if (words[0] === "case") openCases += 1;
    else if (words[0] === "esac") openCases = Math.max(0, openCases - 1);
    // After a move, only an `&&` chain, or a pipeline inside one, runs where the move went:
    // `||`, `;`, `&` and a new line also run when the move failed.
    if (typeof location === "object" && index > 0 && command.join !== "&&" && command.join !== "|")
      location = "unknown";
    const operand = directoryOperand(words);
    if (operand !== undefined) {
      location = redefined
        ? "unknown"
        : movedLocation(location, operand, command, commands[index + 1], scope);
    }
    // A group reads the pipe before it only when its `}` redirects nothing: in
    // `git log | { grep fix; } < .env` the group reads `.env`.
    const upstream =
      words[0] === "{" && !groupClosesBare(commands, index) ? undefined : command.upstream;
    const placeable = sole && index === 0;
    // Only a search that is the event's one command can read outside files: any other command,
    // before it or in a later pipeline stage running beside it, may swap the file it reads.
    const alone = scope.alone && commands.length === 1 && substitutions.length === 0;
    const decision = classifyCommand(
      words,
      { ...scope, alone, location, redefined, placeable },
      depth,
      upstream,
    );
    if (decision?.decision === "deny") return decision;
    if (decision?.state === "outside-boundary") boundary = decision;
    else if (decision) allowed = decision;
  }
  return boundary ?? allowed;
}

/**
 * An `env` option that splits its value into a command line: `-S`, `-S<value>`, a cluster of
 * argument-free short options ending in `S` such as `-iS`, and `--split-string[=<value>]`.
 */
const envSplitOption = /^-[i0v]*S|^--split-string(?:=|$)/;

/**
 * Whether a command defines a function or alias, or sets a variable a later
 * command may read, so a name in the same event may not run the program it names.
 */
function redefinesCommands(words: string[]): boolean {
  const body = arithmeticForBody(words);
  if (body) return redefinesCommands(body);
  let offset = 0;
  for (;;) {
    const redirection = redirectionLength(words[offset]);
    if (redirection) offset += redirection;
    // A group's `{` defines nothing itself; the command it opens is read instead.
    else if (words[offset] === "{") offset += 1;
    else if (["builtin", "command", "env"].includes(commandName(words.slice(offset)) ?? "")) {
      const wrapper = commandName(words.slice(offset));
      offset += 1;
      while (words[offset]?.startsWith("-")) {
        // `env -S` runs its value as a new command line, which may set a variable or name
        // another program; the words after it are not the command this loop would find.
        if (wrapper === "env" && envSplitOption.test(words[offset] ?? "")) return true;
        offset += /^-[uCS]$|^--(?:unset|chdir|split-string)$/.test(words[offset] ?? "") ? 2 : 1;
      }
    } else break;
  }
  const first = words[offset] ?? "";
  return (
    words.some(
      (word) =>
        word.includes("()") ||
        /^\{[A-Za-z_][A-Za-z0-9_]*\}[<>]/.test(word) ||
        // PowerShell sets an environment variable through the env: drive or the .NET API.
        /^env:/i.test(word) ||
        word.includes("Environment]::"),
    ) ||
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
/** Whether the `{` group opened at `index` closes with a bare `}`, which redirects nothing. */
function groupClosesBare(commands: ShellCommand[], index: number): boolean {
  let depth = 0;
  for (const { words } of commands.slice(index)) {
    const opened = words.findIndex((word) => word !== "{");
    depth += opened < 0 ? words.length : opened;
    if (words[0]?.startsWith("}")) {
      depth -= 1;
      if (depth <= 0) return words.length === 1 && words[0] === "}";
    }
  }
  return false;
}

function directoryOperand(words: string[]): string | null | undefined {
  let offset = 0;
  while (offset < words.length) {
    // `if cd /tmp` and `{ cd /tmp` move as `cd /tmp` does.
    if (
      /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "") ||
      words[offset] === "{" ||
      COMPOUND_KEYWORDS.includes(words[offset] ?? "")
    ) {
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

/** The directory a search's relative paths resolve from, when the text tells it. */
function searchBase(context: CommandContext): string | undefined {
  const { location, directory } = context;
  if (location === "unknown") return undefined;
  return location === "observed" ? directory : location.directory;
}

/**
 * Whether a search names at least one path and every path it names lies inside the
 * project root, below it. The root itself, as `.` or by its own path, is the whole
 * repository and is no scope. A path the text cannot place is not inside: one with a
 * `..` segment, which may resolve through a symbolic link, an expansion, a glob, a home
 * or provider prefix, or a list. A parenthesis, `@` or `!` marks a PowerShell
 * subexpression or array, such as `(Get-Location)` or `@('.')`, or a Bash extended glob
 * such as `!(node_modules)`, so its value is unknown.
 *
 * SIMPLIFIED: a glob such as `src/*.ts` stays denied, though it only names project
 * files; a leading-dot glob or a brace can name `..`. Lift when: globs are expanded
 * against the project tree before the decision.
 */
function insideProject(
  root: string | undefined,
  base: string | undefined,
  paths: string[] | undefined,
): boolean {
  if (!root || !base || !paths || paths.length === 0) return false;
  return paths.every((operand) => {
    if (
      !operand.trim() ||
      /[$`%<>~*?[\]{},()@!]/.test(operand) ||
      (operand.includes(":") && !/^[A-Za-z]:[\\/]/.test(operand)) ||
      operand.split(/[\\/]/).includes("..")
    )
      return false;
    const target = path.resolve(base, operand);
    if (path.relative(root, target) === "" || outside(root, target)) return false;
    // A symbolic link or junction inside the project may point outside it.
    const real = realPath(target);
    const realRoot = realPath(root);
    return real === undefined || realRoot === undefined || !outside(realRoot, real);
  });
}

/** The path with every link resolved, or `undefined` when it cannot be resolved. */
function realPath(target: string): string | undefined {
  try {
    return realpathSync.native(target);
  } catch {
    return undefined;
  }
}

/** Whether a grep or rg command follows symbolic links it finds below the paths it names. */
function followsLinks(words: string[]): boolean {
  const name = commandName(words);
  return words
    .slice(1)
    .some((word) =>
      name === "rg"
        ? word === "--follow" || /^-[A-Za-z]*L/.test(word)
        : name === "grep" && (word === "--dereference-recursive" || /^-[A-Za-z]*R/.test(word)),
    );
}

function scopedSearch(): GraphHookDecision {
  return {
    decision: "allow",
    state: "configured",
    message: "Scoped search allowed: every path it names lies inside the project.",
  };
}

/**
 * The paths a grep, rg, findstr, Select-String or git grep command names, read only
 * from a shape known option by option. `undefined` when the command is no such search,
 * or holds a word the shell may expand, an unknown option, an option missing its value,
 * or, for git grep, a revision or no `--` before its paths.
 */
function searchPaths(words: string[]): string[] | undefined {
  if (/[\\/=]/.test(words[0] ?? "")) return undefined;
  const name = commandName(words);
  const args = words.slice(1);
  if (args.some((word) => unparsedWord(word))) return undefined;
  if (name === "grep" || name === "rg") return grepPaths(name, args);
  if (name === "findstr") return findstrPaths(args);
  if (name === "select-string") return selectStringPaths(args);
  if (name === "git" && args[0]?.toLowerCase() === "grep") return gitGrepPaths(args.slice(1));
  return undefined;
}

/** rg options that take the next word as their value. */
const rgValueOptions = /^(?:-[gtT]|--(?:glob|type|type-not))$/;
const scopedGrepSwitches = /^-[ivncowxEFGPqsHhIyzZLlbUarR]+$/;

function grepPaths(name: "grep" | "rg", args: string[]): string[] | undefined {
  let patternGiven = false;
  const operands: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (word === "--") {
      operands.push(...args.slice(index + 1));
      break;
    }
    if (!word.startsWith("-")) operands.push(word);
    else if (valueOptions.test(word) || (name === "rg" && rgValueOptions.test(word))) {
      if (word === "-e" || word === "--regexp") patternGiven = true;
      index += 1;
      if (index >= args.length) return undefined;
    } else if (
      attachedValueOptions.test(word) ||
      /^--(?:include|exclude|glob|type)=.+$/.test(word)
    ) {
      if (/^(?:-e|--regexp=)/.test(word)) patternGiven = true;
    } else if (
      !(name === "grep" ? scopedGrepSwitches : rgSwitches).test(word) &&
      !longSwitches.has(word) &&
      word !== "--recursive" &&
      word !== "--hidden"
    )
      return undefined;
  }
  return patternGiven ? operands : operands.slice(1);
}

/** With `/s`, findstr searches every directory below the current one for each file name. */
function findstrPaths(args: string[]): string[] | undefined {
  let patternGiven = false;
  const operands: string[] = [];
  for (const word of args) {
    if (/^\/c:./i.test(word)) patternGiven = true;
    else if (word.startsWith("/")) {
      if (!/^\/[ivnxbelrmop]+$/i.test(word)) return undefined;
    } else if (word.startsWith("-")) return undefined;
    else operands.push(word);
  }
  return patternGiven ? operands : operands.slice(1);
}

/** Select-String binds its first free positional word to Pattern and the next to Path. */
function selectStringPaths(args: string[]): string[] | undefined {
  let patternGiven = false;
  const named: string[] = [];
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (!word.startsWith("-")) positional.push(word);
    else if (/^-(?:pattern|path|literalpath|context|encoding)$/i.test(word)) {
      const value = args[index + 1];
      if (value === undefined) return undefined;
      index += 1;
      if (/^-pattern$/i.test(word)) patternGiven = true;
      else if (/path$/i.test(word)) named.push(value);
    } else if (
      !/^-(?:simplematch|casesensitive|notmatch|allmatches|list|quiet|raw|noemphasis)$/i.test(word)
    )
      return undefined;
  }
  const rest = patternGiven ? positional : positional.slice(1);
  if (rest.length > 1 || (named.length > 0 && rest.length > 0)) return undefined;
  return [...named, ...rest];
}

function gitGrepPaths(args: string[]): string[] | undefined {
  const separator = args.indexOf("--");
  if (separator < 0) return undefined;
  let patternGiven = false;
  const operands: string[] = [];
  for (let index = 0; index < separator; index += 1) {
    const word = args[index] ?? "";
    if (!word.startsWith("-")) operands.push(word);
    else if (word === "-e") {
      patternGiven = true;
      index += 1;
      if (index >= separator) return undefined;
    } else if (!/^-[nilwvcEFPIhH]+$/.test(word) && !longSwitches.has(word)) return undefined;
  }
  return operands.length === (patternGiven ? 0 : 1) ? args.slice(separator + 1) : undefined;
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

/** POSIX words that start a compound command or one of its parts, followed by a command. */
const COMPOUND_KEYWORDS: readonly string[] = [
  "if",
  "then",
  "elif",
  "else",
  "while",
  "until",
  "do",
  "!",
  "time",
];

/**
 * The loop body after the last part of a `for ((...))` header. The tokenizer splits the
 * header at its `;`, so its last part is a command whose words hold the closing `))`,
 * alone (`i++ ))`), at the end of a word (`i++))`) or before an unspaced `{` (`)){`).
 * Parentheses inside that part, as in `i+=$((1))`, are balanced, so the closing `))` is
 * the one that takes the count of `(` minus `)` to -2. The words after it, a `{ ...; }`
 * group or `do ...`, run as the loop body. Unquoted, a `)` that no `(` in the command
 * opened is a syntax error outside such a header, so no runnable command matches.
 * Ceiling: the tokenizer drops quotes, so `echo "a))" do rg ...` is read as a header and
 * denied. Keeping quote marks on words lifts this.
 */
function arithmeticForBody(words: string[]): string[] | undefined {
  let depth = 0;
  for (const [index, word] of words.entries()) {
    for (let offset = 0; offset < word.length; offset += 1) {
      if (word[offset] === "(") depth += 1;
      else if (word[offset] === ")") depth -= 1;
      if (depth > -2) continue;
      if (word[offset - 1] !== ")") return undefined;
      const rest = word.slice(offset + 1);
      const body = rest === "" ? words.slice(index + 1) : [rest, ...words.slice(index + 1)];
      return body[0] === "{" || body[0] === "do" ? body : undefined;
    }
  }
  return undefined;
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
  // A compound-command keyword runs the command after it: `if grep ...`, `then grep ...`,
  // `do grep ...`, `! grep ...`, `time -p grep ...`. `fi` and `done` run nothing.
  if (COMPOUND_KEYWORDS.includes(words[0] ?? "")) {
    const skip = words[0] === "time" && words[1] === "-p" ? 2 : 1;
    return classifyCommand(words.slice(skip), context, depth + 1);
  }
  if (words[0] === "fi" || words[0] === "done") return undefined;
  const body = arithmeticForBody(words);
  if (body) return classifyCommand(body, context, depth + 1);
  // A `{ ...; }` group and a `case` command's first arm run the command after their
  // opening words. `classifyCommands` strips the pattern of each later arm. A group
  // keeps the pipeline stage before it, so `git log | { grep fix; }` is a filter.
  if (operation === "{") {
    return classifyCommand(words.slice(1), context, depth + 1, upstream);
  }
  if (operation === "case") {
    const subject = words.indexOf("in");
    const arm = words.findIndex((word, index) => index > subject && word.endsWith(")"));
    return arm < 0 ? undefined : classifyCommand(words.slice(arm + 1), context, depth + 1);
  }
  if (operation === "}" || operation === "esac") return undefined;
  if (operation === "env" || operation === "command" || operation === "builtin") {
    let offset = 1;
    let split: string[] = [];
    while (offset < words.length) {
      const word = words[offset] ?? "";
      const redirection = redirectionLength(word);
      if (redirection) offset += redirection;
      else if (operation === "env" && envSplitOption.test(word)) {
        // `env -S 'rg foo /'` runs the split string as the command and its arguments.
        const separate = /^-[i0v]*S$/.test(word) || word === "--split-string";
        const value = separate
          ? (words[offset + 1] ?? "")
          : word.startsWith("--")
            ? word.slice(word.indexOf("=") + 1)
            : word.slice(word.indexOf("S") + 1);
        split = value.split(/\s+/).filter((part) => part.length > 0);
        offset += separate ? 2 : 1;
        break;
      } else if (operation === "env" && /^(?:-C|-u|--chdir|--unset)$/.test(word)) {
        // These options take the next word as their value, not as the command.
        offset += 2;
      } else if (word.startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(word)) offset += 1;
      else break;
    }
    // `env` can change the directory (`-C`), the environment (an assignment, `-u`, `-i`) or the
    // command line (`-S`) of what it runs, so a search behind it is never an outside read.
    return classifyCommand(
      [...split, ...words.slice(offset)],
      operation === "env" ? { ...context, alone: false } : context,
      depth + 1,
    );
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
        worktrees: context.worktrees,
        alone: context.alone,
        ...(context.directory ? { directory: context.directory } : {}),
        ...(context.root ? { root: context.root } : {}),
      },
      depth + 1,
      redefined,
      context.location,
    );
  }
  if (!redefined && pipeFilter(words) && printsText(upstream)) return undefined;
  if (
    !redefined &&
    depth === 0 &&
    context.placeable === true &&
    !followsLinks(words) &&
    !(context.shell === "powershell" && words.some((word) => word.startsWith("@"))) &&
    insideProject(context.root, searchBase(context), searchPaths(words))
  )
    return scopedSearch();
  if (operation === "rg" || operation === "grep" || operation === "findstr") {
    if (readsOnlyOutside(context, searchOperands(operation, words.slice(1))))
      return outsideProject();
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
    if (readsOnlyOutside(context, selectStringOperands(words.slice(1)))) return outsideProject();
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

function outsideProject(): GraphHookDecision {
  return {
    decision: "allow",
    state: "configured",
    message: "The search reads only files outside this project worktree.",
  };
}

/**
 * The switches each search may carry before its pattern when it is checked for reading only
 * files outside the project. None reads a file list or a pattern file, or takes a value. Every
 * operand must be a regular file, so no switch can recurse into a directory. Ceiling: any other
 * option keeps the search denied; lift when an option is shown to read nothing beyond the
 * operands.
 */
const OUTSIDE_SWITCHES: Readonly<Record<string, RegExp>> = {
  grep: /^-[inlHhsvwxcFoqrE]+$/,
  rg: /^-[inlHsvwxcFoq]+$/,
  findstr: /^\/[IVNLXBEMOPR]+$/i,
};

/**
 * A character a shell may expand, split, quote or redirect, so the words the program receives
 * cannot be read from the text. The tokenizer drops quotes, so a quoted glob is refused too.
 * Ceiling: `grep -n "a.*b" file` stays denied; lift when words keep their quote marks.
 */
const EXPANDING = /[$`~%*?[\]{}()<>|;&,!@^'"#]/;

/** The pattern word and the file operands of a search checked for reading only outside files. */
interface OutsideSearch {
  pattern: string;
  operands: string[];
}

/**
 * The file operands of a grep, rg or findstr whose words are all known: switches from
 * `OUTSIDE_SWITCHES`, then a literal pattern, then the operands. Options are read only before
 * the pattern, since BSD grep and POSIXLY_CORRECT read a later `-x` as a file. `undefined` when
 * the shape is any other.
 *
 * Ceiling: `RIPGREP_CONFIG_PATH` and `GREP_OPTIONS` add arguments the command text does not
 * show, and the hook reads its own environment, so a value only the agent's shell profile sets,
 * or an alias or function defined outside the event, is not seen. Lift when a host reports the
 * shell environment in the pre-tool event.
 */
function searchOperands(operation: string, args: string[]): OutsideSearch | undefined {
  const switches = OUTSIDE_SWITCHES[operation];
  if (
    !switches ||
    (operation === "rg" && process.env.RIPGREP_CONFIG_PATH) ||
    (operation === "grep" && process.env.GREP_OPTIONS)
  )
    return undefined;
  let index = 0;
  while (switches.test(args[index] ?? "")) index += 1;
  if (operation !== "findstr" && args[index] === "--") index += 1;
  const [pattern, ...rest] = args.slice(index);
  if (pattern === undefined || pattern.startsWith("-") || EXPANDING.test(pattern)) return undefined;
  // findstr reads a `/` word anywhere as an option, such as `/S` or `/F:list`, and reads
  // `C:/a/b.txt` as the drive-relative `C:b.txt`, so no word after its switches may hold a `/`.
  if (operation === "findstr" && args.slice(index).some((word) => word.includes("/")))
    return undefined;
  return { pattern, operands: rest };
}

/**
 * The file operands of a Select-String whose words are all known: `-Pattern`, `-Path` and
 * `-LiteralPath` with a value, switches that read no other file, and positional words, the
 * first of which is the pattern when `-Pattern` is absent. `undefined` for any other shape.
 */
function selectStringOperands(args: string[]): OutsideSearch | undefined {
  let pattern: string | undefined;
  const operands: string[] = [];
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (/^-(?:pattern|path|literalpath)$/i.test(word)) {
      index += 1;
      const value = args[index];
      if (value === undefined || value.startsWith("-")) return undefined;
      if (!/^-pattern$/i.test(word)) operands.push(value);
      else if (pattern === undefined) pattern = value;
      else return undefined;
    } else if (word.startsWith("-")) {
      if (!/^-(?:simplematch|casesensitive|notmatch|allmatches|list|quiet|noemphasis)$/i.test(word))
        return undefined;
    } else positional.push(word);
  }
  pattern ??= positional.shift();
  if (pattern === undefined || EXPANDING.test(pattern)) return undefined;
  return { pattern, operands: [...operands, ...positional] };
}

/**
 * Whether the one operand of a search provably names a regular file outside the project. The
 * search is the whole event, so no other command can have made a link it reads, and no part
 * of the event redefines a command or sets an environment variable. It runs from a known
 * directory, and its pattern word names nothing that exists there, so an argument the
 * environment adds, such as `-e x` in `GREP_OPTIONS`, cannot turn that word into a file. Each
 * operand is an absolute literal path that, lexically and after resolving symbolic links,
 * neither lies inside nor contains any of the worktrees, and resolves to a regular file with one
 * name that is not a Cygwin or MSYS link file or a Windows shortcut.
 *
 * A directory is refused, since a search recursing into it may reach the project through a
 * link, a junction or a mount below it. No operand, or one that cannot be resolved, proves
 * nothing, so the search stays denied. A `..` segment is refused: the shell resolves it through
 * a symbolic link where a lexical reading does not. Every operand is checked lexically before
 * any is resolved, so a search with a project operand is denied without reading the disk. This
 * reads the file system only; it queries no graph.
 *
 * Ceiling: the hook reads its own environment, so a `GREP_OPTIONS` or `RIPGREP_CONFIG_PATH`
 * left in a persistent terminal that adds a file operand is not seen. A single file bind-mounted
 * from the project onto an outside path keeps its own name and one link, so it is not seen
 * either. A process outside the event, such as a background job an earlier event started, can
 * swap the file between this check and the search opening it; a pre-tool hook cannot close that
 * race. One operand bounds it to one file's matching lines, which a direct `cat` of that file
 * already prints, and the hook steers searches rather than bounding reads. A sibling worktree
 * of the same repository outside the checkout is not part of the project here, so its files are allowed. Resolving a path on a mapped network drive or
 * a network mount is a file-system call that may reach the network; network paths written as
 * `\\server` or `//server` are refused before they are resolved. Lift when a host reports the
 * files a command opened.
 */
function readsOnlyOutside(context: CommandContext, search: OutsideSearch | undefined): boolean {
  const { location, directory, worktrees, redefined, shell, alone } = context;
  if (
    search?.operands.length !== 1 ||
    !alone ||
    redefined ||
    location === "unknown" ||
    !directory ||
    !worktrees.length ||
    /^[\\/]{2}/.test(search.pattern)
  )
    return false;
  const { pattern, operands } = search;
  const base = location === "observed" ? directory : location.directory;
  const lexicalRoots = worktrees.map((root) => path.resolve(root));
  const lexical = operands.map((operand) => path.resolve(operand));
  if (
    !operands.every((operand) => literalPath(operand, shell)) ||
    !lexical.every((file) => !systemPath(file) && lexicalRoots.every((root) => apart(root, file)))
  )
    return false;
  try {
    if (existsSync(path.resolve(base, pattern))) return false;
    const roots = [...lexicalRoots, ...worktrees.map((root) => realpathSync.native(root))];
    return lexical.every((file) => {
      const real = realpathSync.native(file);
      const status = statSync(real);
      return (
        !systemPath(real) &&
        status.isFile() &&
        status.nlink === 1 &&
        !/\.lnk$/i.test(file) &&
        !/\.lnk$/i.test(real) &&
        !linkFile(real) &&
        roots.every((root) => apart(root, file) && apart(root, real) && apartOnDisk(root, real))
      );
    });
  } catch {
    return false;
  }
}

/**
 * Headers of files that a Cygwin or MSYS shell, such as Git Bash, follows as a link while
 * Node.js reads a regular file: a `winsymlinks:sys` link, an Interix link and a Windows
 * shortcut, which `winsymlinks:lnk` writes.
 */
const LINK_HEADERS: readonly Buffer[] = [
  Buffer.from("!<symlink>", "latin1"),
  Buffer.from("IntxLNK\x01", "latin1"),
  Buffer.from([0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00]),
];

/** Whether a file starts with a header from `LINK_HEADERS`. */
function linkFile(file: string): boolean {
  const head = Buffer.alloc(16);
  const descriptor = openSync(file, "r");
  try {
    const read = readSync(descriptor, head, 0, head.length, 0);
    return LINK_HEADERS.some(
      (header) => read >= header.length && head.subarray(0, header.length).equals(header),
    );
  } finally {
    closeSync(descriptor);
  }
}

/** A path under `/proc`, `/dev` or `/sys`, whose entries are not ordinary files. */
function systemPath(file: string): boolean {
  return /^\/(?:proc|dev|sys)(?:\/|$)/.test(file.split(path.sep).join("/"));
}

/**
 * Whether an operand is an absolute path the shell passes as written, so it names the same file
 * whatever the shell's directory is: a drive letter path on Windows, a `/` path elsewhere. A
 * colon is allowed only after a drive letter, so a provider drive, a URL or a pathspec is
 * refused, and a network path is refused before it is resolved. A POSIX shell reads a
 * backslash as an escape, and on Windows maps a path from `/` through its own mount table.
 */
function literalPath(operand: string, shell: GraphShell): boolean {
  return !(
    !(process.platform === "win32" ? /^[A-Za-z]:[\\/]/ : /^\//).test(operand) ||
    EXPANDING.test(operand) ||
    !/^(?:[A-Za-z]:[\\/])?[^:]*$/.test(operand) ||
    /^[\\/]{2}/.test(operand) ||
    operand.split(/[\\/]/).includes("..") ||
    (shell === "posix" && operand.includes("\\")) ||
    (shell === "posix" && process.platform === "win32" && operand.startsWith("/"))
  );
}

/** Neither path lies inside the other, compared without case or Unicode form. */
function apart(first: string, second: string): boolean {
  const one = first.normalize("NFC").toLowerCase();
  const other = second.normalize("NFC").toLowerCase();
  return outside(one, other) && outside(other, one);
}

/**
 * Neither directory holds the other by file identity, which a bind mount or a second name
 * for the same directory cannot hide. A file system that reports no identity, such as FAT,
 * gives every entry the same one, so the search stays denied there.
 */
function apartOnDisk(root: string, target: string): boolean {
  const rootChain = identities(root);
  const targetChain = identities(target);
  const [rootId] = rootChain;
  const [targetId] = targetChain;
  return (
    rootId !== undefined &&
    targetId !== undefined &&
    !targetChain.includes(rootId) &&
    !rootChain.includes(targetId)
  );
}

/** The device and file identity of a path and of each directory above it. */
function identities(file: string): string[] {
  const chain: string[] = [];
  for (let current = file; ; current = path.dirname(current)) {
    const { dev, ino } = statSync(current, { bigint: true });
    chain.push(`${dev}:${ino}`);
    if (path.dirname(current) === current) return chain;
  }
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

/**
 * A character after which a POSIX shell starts a new word. Only space, tab and newline are
 * blanks there: a carriage return, form feed or no-break space is part of the word, so a `#`
 * after one is not a comment.
 */
const WORD_BREAK = /[ \t\n;&|()]/;

/**
 * Whether the `#` at `index`, read where no word has started yet, opens a comment. In a POSIX
 * shell an unquoted `#` at the start of a word runs to the end of its line, so a quote inside it
 * opens nothing and the next line is a command again. The caller must know no word is under way:
 * an escaped separator or a closed substitution before the `#` puts it inside a word.
 * PowerShell comments are removed before this reader runs: `withoutPowerShellComments`.
 * Ceiling: `cmd` has no comment inside a command line, so none is read there.
 */
function startsComment(command: string, index: number, shell: GraphShell): boolean {
  if (shell !== "posix") return false;
  const previous = command[index - 1];
  return (
    (previous === undefined || WORD_BREAK.test(previous)) && !inUntrackedContext(command, index)
  );
}

/**
 * Whether the text before `index` may leave a context open that these readers do not track and
 * where the shell starts no comment or quotes differently: a backtick substitution, a `${...}`
 * expansion, a `((...))` or `$[...]` arithmetic, an ANSI-C `$'...'` string, whose `\'` does not
 * close it, or an extended glob such as `@(...)`. A `#` after one is read as text, as it was
 * before comments were read, so a search after it is still classified.
 * Ceiling: any such opener earlier in the command turns comment reading off for the rest of it,
 * so a quote in a later comment there still fails closed as an unmatched quote. Tracking those
 * contexts as the quotes are tracked lifts this.
 */
function inUntrackedContext(command: string, index: number): boolean {
  return /`|\$\{|\$\[|\$'|\(\(|[?*+@!]\(/.test(command.slice(0, index));
}

/**
 * The PowerShell text with each lone carriage return read as a line feed. PowerShell ends a
 * statement and a `#` line comment at either, while these readers split lines at `\n` only.
 * Ceiling: the whole text is converted, quoted arguments too, so a carriage return inside a
 * `bash -c` argument, which Bash reads as an ordinary character, also splits there and may
 * deny more than Bash runs. Converting only outside quotes lifts this.
 */
function powerShellLines(command: string): string {
  return command.replace(/\r(?!\n)/g, "\n");
}

/** A character after which PowerShell starts a new token and no word of these readers is under way. */
const POWERSHELL_BREAK = /[ \t\n;|&]/;

/**
 * Text after which this reader cannot be sure where a PowerShell string ends: a `@"`/`@'`
 * here-string, a `$(` whose body may hold its own quotes inside a double-quoted string, or a
 * curly quote (U+2018 to U+201E), which PowerShell also reads as a quote.
 */
const POWERSHELL_UNTRACKED = /@["']|\$\(|[\u2018-\u201e]/;

/**
 * The PowerShell text with its comments removed, so both readers see the same commands. A
 * `<# ... #>` block comment that starts a token is replaced by a space up to its `#>`, and a
 * `#` line comment that starts a token is removed up to the end of its line, so a quote inside
 * either opens nothing and a command after either is classified. A block comment with no `#>`
 * leaves the script unparsable, so the text is unreadable and fails closed.
 * Where the start of a token is not certain, inside a word, or after a context these readers
 * do not track (`inUntrackedContext`, `POWERSHELL_UNTRACKED`), a `<#` and its `#>` are
 * replaced by command separators instead, so what lies between and after them is still read as
 * commands, and a `#` there stays text.
 */
function withoutPowerShellComments(command: string): string | undefined {
  let output = "";
  let quote: string | undefined;
  let wordStarted = false;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index] ?? "";
    if (character === "`" && quote !== "'") {
      output += character + (command[index + 1] ?? "");
      index += 1;
      wordStarted = true;
      continue;
    }
    if (quote) {
      output += character;
      if (character === quote) quote = undefined;
      continue;
    }
    const tracked = () =>
      !inUntrackedContext(command, index) && !POWERSHELL_UNTRACKED.test(command.slice(0, index));
    if (character === "<" && command[index + 1] === "#") {
      const end = command.indexOf("#>", index + 2);
      if (end === -1) return undefined;
      output += !wordStarted && tracked() ? " " : `;${command.slice(index + 2, end)};`;
      index = end + 1;
      wordStarted = false;
      continue;
    }
    if (character === "#" && !wordStarted && tracked()) {
      const end = command.indexOf("\n", index);
      if (end === -1) break;
      index = end - 1;
      continue;
    }
    output += character;
    if (character === "'" || character === '"') quote = character;
    wordStarted = !POWERSHELL_BREAK.test(character);
  }
  return output;
}

/** A file operand that names no device or process file: letters, digits and `._/-` only. */
const DATA_FILE = String.raw`(?!/dev/|/proc/)[\w./-]+`;
/** An operand of `cat` or `tee` on a data line: an option, a file, or a redirection to one. */
const DATA_OPERAND = String.raw`[ \t]+(?:-[A-Za-z]+|>>?[ \t]*${DATA_FILE}|>[ \t]*/dev/null|${DATA_FILE})`;
/**
 * A whole line that writes one here-document to files and nothing else: `cat` or `tee`,
 * plain operands, one `<<` or `<<-` with a quoted or escaped identifier delimiter. A line of this
 * shape hands its body to no shell, pipe, descriptor or later command, and the quoted
 * delimiter makes Bash read the body literally, with no expansion or line joining.
 */
const DATA_HEREDOC_LINE = new RegExp(
  String.raw`^[ \t]*(?:cat|tee)(?:${DATA_OPERAND})*[ \t]*<<-?[ \t]*(?:(['"])[A-Za-z_]\w*\1|\\[A-Za-z_]\w*)(?:${DATA_OPERAND})*[ \t]*$`,
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
  // An empty quote such as `''` starts a word that holds no character yet.
  let quotedWord = false;
  const flushWord = () => {
    if (word.length) words.push(word);
    word = "";
    quotedWord = false;
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
    } else if (
      character === "#" &&
      !word.length &&
      !quotedWord &&
      startsComment(command, index, shell)
    ) {
      const end = command.indexOf("\n", index);
      index = (end === -1 ? command.length : end) - 1;
    } else if (character === '"' || character === "'") {
      quote = character;
      quotedWord = true;
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
 * The bodies of the substitutions and groups a shell runs as commands: `$(...)` in
 * POSIX and PowerShell, `@(...)` and a grouping `(...)` in PowerShell, `<(...)`,
 * `>(...)`, zsh `=(...)`, a subshell `(...)` and backticks in POSIX. Quotes keep a
 * bare `(` literal, single quotes keep every opener literal, and an escaped opener
 * is not one. An arithmetic `$((...))` runs no command. A substitution whose end the
 * scan cannot find returns undefined: the shell may still close it, for example past a
 * quote in a comment, so the caller denies the command. A here-document
 * body is data, except the substitutions an unquoted delimiter's body expands:
 * `heredocData` says which bodies.
 */
function substitutionBodies(text: string, shell: GraphShell, nested = false): string[] | undefined {
  if (shell === "cmd") return [];
  const { text: command, expanded } =
    shell === "posix" ? heredocData(text, nested) : { text, expanded: [] };
  const escape = shell === "posix" ? "\\" : "`";
  const bodies: string[] = [];
  let quote: string | undefined;
  // Whether no word is under way: true at the start and after an unquoted separator only, so an
  // escaped separator or a closed substitution before a `#` keeps it inside its word.
  let wordStart = true;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const next = command[index + 1];
    const atWordStart = wordStart;
    wordStart = false;
    if (character === escape && quote !== "'") {
      index += 1;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = undefined;
      continue;
    }
    if (
      !quote &&
      atWordStart &&
      character === "#" &&
      shell === "posix" &&
      !inUntrackedContext(command, index)
    ) {
      const end = command.indexOf("\n", index);
      if (end === -1) break;
      index = end;
      wordStart = true;
      continue;
    }
    if (!quote && character !== undefined && WORD_BREAK.test(character)) {
      wordStart = true;
      // A bare `(` also starts a word, and may open a subshell or a grouping below.
      if (character !== "(") continue;
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
      if (end === undefined) return undefined;
      if (!(character === "$" && command[index + 2] === "(")) {
        bodies.push(command.slice(index + 2, end));
      }
      index = end;
    } else if (
      !quote &&
      character === "(" &&
      // The first `(` of a POSIX `((` arithmetic command opens no subshell; the scan moves
      // on to the second, whose body the comment reader then knows is arithmetic.
      !(shell === "posix" && command[index + 1] === "(") &&
      // A POSIX subshell starts a command, and zsh `=(...)` starts a word; any other
      // `(`, such as an array's in `name=(...)`, is data, scanned on.
      (shell === "powershell" ||
        commandPosition(command, index, 0) ||
        (command[index - 1] === "=" && /^$|[\s;&|(]/.test(command[index - 2] ?? "")))
    ) {
      const end = closingParenthesis(command, index + 1, escape);
      if (end === undefined) return undefined;
      bodies.push(command.slice(index + 1, end));
      index = end;
    } else if (
      !quote &&
      shell === "powershell" &&
      character === "{" &&
      command[index - 1] !== "@"
    ) {
      // A script block, such as the one `ForEach-Object { rg foo $_ }` runs, holds commands.
      // A hashtable `@{...}` holds keys, and a brace this scan cannot close is text; the scan
      // goes on inside either, so a `$(...)` there is still read.
      const end = closingBrace(command, index + 1);
      if (end === undefined) continue;
      bodies.push(command.slice(index + 1, end));
      index = end;
    } else if (shell === "posix" && character === "`") {
      const end = closingBacktick(command, index + 1);
      if (end === undefined) return undefined;
      bodies.push(command.slice(index + 1, end).replace(/\\([`\\$])/g, "$1"));
      index = end;
    }
  }
  for (const body of expanded) {
    const nested = expandedSubstitutions(body);
    if (!nested) return undefined;
    bodies.push(...nested);
  }
  return bodies;
}

/** The index of the `}` that closes a PowerShell brace opened before `start`, outside quotes. */
function closingBrace(command: string, start: number): number | undefined {
  let depth = 1;
  let quote: string | undefined;
  for (let index = start; index < command.length; index += 1) {
    const character = command[index];
    if (character === "`" && quote !== "'") index += 1;
    else if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === "'" || character === '"') quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

/** The index of the backtick that closes one opened before `start`, or undefined. */
function closingBacktick(command: string, start: number): number | undefined {
  let end = start;
  while (end < command.length && command[end] !== "`") end += command[end] === "\\" ? 2 : 1;
  return end < command.length ? end : undefined;
}

/**
 * The `$(...)` and backtick substitutions an unquoted here-document body expands.
 * Quotes in the body are text, so only a backslash keeps an opener literal.
 */
function expandedSubstitutions(body: string): string[] | undefined {
  const bodies: string[] = [];
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "\\") {
      index += 1;
    } else if (character === "$" && body[index + 1] === "(") {
      const end = closingParenthesis(body, index + 2, "\\");
      if (end === undefined) return undefined;
      if (body[index + 2] !== "(") bodies.push(body.slice(index + 2, end));
      index = end;
    } else if (character === "`") {
      const end = closingBacktick(body, index + 1);
      if (end === undefined) return undefined;
      bodies.push(body.slice(index + 1, end).replace(/\\([`\\$])/g, "$1"));
      index = end;
    }
  }
  return bodies;
}

/** A `<<` or `<<-` here-document operator and its delimiter, quoted or not; `<<<` is not one. */
const heredocOperator = /<<(?!<)(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;|&<>()'"]+))/y;

/** A plain word of a message command line: an option, a value or a subcommand. */
const MESSAGE_WORD = String.raw`[ \t]+[\w./=:@-]+`;
/**
 * A line that opens a here-document as the text of a message: `git commit` or `git tag`,
 * or `gh pr`, `gh issue` or `gh release` with `create`, `edit` or `comment`, plain
 * words, then `"$(cat <<'EOF'` with a quoted or escaped identifier delimiter. The body
 * becomes an argument that names a message, so no shell runs it.
 */
const MESSAGE_HEREDOC_LINE = new RegExp(
  String.raw`^[ \t]*(?:git[ \t]+(?:commit|tag)|gh[ \t]+(?:pr|issue|release)[ \t]+(?:create|edit|comment))(?:${MESSAGE_WORD})*[ \t]+"\$\(cat[ \t]+<<-?[ \t]*(?:(['"])[A-Za-z_]\w*\1|\\[A-Za-z_]\w*)[ \t]*$`,
);
/** The line that closes a message substitution: `)"` and plain words. */
const MESSAGE_CLOSE_LINE = new RegExp(String.raw`^[ \t]*\)"(?:${MESSAGE_WORD})*[ \t]*$`);
/** A line that may come before a message line: `git add` of plain paths. */
const MESSAGE_PRELUDE_LINE = new RegExp(String.raw`^[ \t]*git[ \t]+add(?:${MESSAGE_WORD})*[ \t]*$`);

/**
 * The text with each here-document body that is surely data, and its delimiter line,
 * removed. Such a body is text a command reads, such as a commit message, so a backtick
 * or `$(...)` in it starts no substitution here. A body is removed only in a closed
 * shape: its operator's whole line writes files (a data line) or opens a message
 * (`git commit -m "$(cat <<'EOF'` and the like), every line before it is a data line,
 * a message line, its closing line or a prelude, the delimiter is a quoted or escaped
 * identifier, so Bash expands nothing in the body, the command holds no carriage return,
 * the delimiter line is present, and the text is not nested in another command. Every
 * other body is kept in the text and scanned, so a substitution in it is classified.
 * `expanded` stays for bodies a shell expands; a closed-shape body expands nothing.
 */
function heredocData(command: string, nested = false): { text: string; expanded: string[] } {
  let output = "";
  let quote: string | undefined;
  let comment = false;
  let depth = 0;
  const outer: { quote: string | undefined; depth: number }[] = [];
  const expanded: string[] = [];
  let pending: (HeredocBody & { data: boolean })[] = [];
  // Where the current line starts in `output`, which holds no removed body.
  let lineOutput = 0;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index] ?? "";
    output += character;
    if (character === "\n") {
      comment = false;
      if (!quote && pending.length) {
        const end = pending.every((body) => body.data)
          ? heredocEnd(command, index + 1, pending, expanded)
          : undefined;
        if (end !== undefined) index = end - 1;
        pending = [];
      }
      lineOutput = output.length;
    } else if (comment) {
      continue;
    } else if (quote === "'") {
      if (character === "'") quote = undefined;
    } else if (character === "\\") {
      output += command[index + 1] ?? "";
      // A continued line is still a line the earlier-line check must read.
      if (command[index + 1] === "\n") lineOutput = output.length;
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
      const delimiter = match[2] ?? match[3] ?? match[4] ?? "";
      const expands = match[4] !== undefined && !match[0].includes("\\");
      const data =
        !nested &&
        !expands &&
        !command.includes("\r") &&
        /^[A-Za-z_]\w*$/.test(delimiter) &&
        (DATA_HEREDOC_LINE.test(line) || MESSAGE_HEREDOC_LINE.test(line)) &&
        output
          .slice(0, lineOutput)
          .split("\n")
          .every(
            (prior) =>
              DATA_PRELUDE_LINE.test(prior) ||
              DATA_HEREDOC_LINE.test(prior) ||
              MESSAGE_HEREDOC_LINE.test(prior) ||
              MESSAGE_CLOSE_LINE.test(prior) ||
              MESSAGE_PRELUDE_LINE.test(prior),
          );
      pending.push({ delimiter, stripTabs: !!match[1], expands, data });
      output += command.slice(index + 1, heredocOperator.lastIndex);
      index = heredocOperator.lastIndex - 1;
    }
  }
  return { text: output, expanded };
}

interface HeredocBody {
  delimiter: string;
  stripTabs: boolean;
  /** An unquoted delimiter: the shell expands substitutions in the body. */
  expands: boolean;
}

/**
 * The index after the delimiter line that closes the last of `bodies`, or undefined.
 * The text of each body that expands is added to `expanded`. A line that starts with a
 * delimiter but holds more, such as `EOF)`, also returns undefined: inside a
 * substitution Bash may end the body there, so the body is kept.
 */
function heredocEnd(
  command: string,
  start: number,
  bodies: HeredocBody[],
  expanded: string[],
): number | undefined {
  let position = start;
  const texts: string[] = [];
  for (const { delimiter, stripTabs, expands } of bodies) {
    const bodyStart = position;
    let bodyEnd = position;
    let closed = false;
    while (!closed && position < command.length) {
      const end = command.indexOf("\n", position);
      const line = command.slice(position, end < 0 ? command.length : end).replace(/\r$/, "");
      const stripped = stripTabs ? line.replace(/^\t+/, "") : line;
      closed = stripped === delimiter;
      if (!closed && stripped.startsWith(delimiter)) return undefined;
      if (!closed) bodyEnd = end < 0 ? command.length : end;
      position = end < 0 ? command.length : end + 1;
    }
    if (!closed) return undefined;
    if (expands) texts.push(command.slice(bodyStart, bodyEnd));
  }
  expanded.push(...texts);
  return position;
}

/** A POSIX `case` or `esac` reserved word. */
const caseWord = /(case|esac)(?=$|[\s;&|)])/y;

/** Whether `index` starts a command: only blanks lie between it and `start` or an operator. */
function commandPosition(command: string, index: number, start: number): boolean {
  let before = index - 1;
  while (before >= start && /[ \t]/.test(command[before] ?? "")) before -= 1;
  return before < start || /[;&|(\n]/.test(command[before] ?? "");
}

/**
 * The index of the `)` that closes a parenthesis opened before `start`, outside quotes.
 * In POSIX text a `)` that ends a `case` pattern, such as `x)` in
 * `case x in x) ...;; esac`, closes nothing. `case` and `esac` count only where a
 * command starts, so an argument such as `test/case` opens no case.
 * A comment runs as the shell reads it, so a `)` or a quote inside it closes and opens
 * nothing: in POSIX text a `#` that starts a word runs to the end of its line, unless an
 * untracked context or arithmetic comes before it (`inArithmeticOrUntracked`), and in PowerShell a `#` that
 * starts a token runs to the end of its line and a `<#` runs to its `#>`. A block comment
 * with no `#>` leaves no end.
 */
/**
 * Whether a POSIX `#` at `index`, inside a parenthesis that opened just before `start`,
 * may sit in a context where the shell starts no comment: an untracked context before it,
 * or arithmetic, which a body cut from `((` no longer shows as `((`, so a body that opens
 * with `(` or holds `((` counts as arithmetic too.
 */
function inArithmeticOrUntracked(command: string, start: number, index: number): boolean {
  return (
    inUntrackedContext(command, index) ||
    command[start] === "(" ||
    command[start - 2] === "(" ||
    command.slice(start, index).includes("((")
  );
}

function closingParenthesis(command: string, start: number, escape: string): number | undefined {
  let depth = 1;
  let quote: string | undefined;
  /** The parenthesis depth at which each open `case` started. */
  const cases: number[] = [];
  const posix = escape === "\\";
  // Whether the character at `index` starts a word: after an unescaped blank, `;`, `&`,
  // `|`, `(` or newline outside quotes. A `)` does not start one, since the word goes on
  // after a closed substitution, and an escaped character keeps the word going.
  let wordStart = true;
  for (let index = start; index < command.length; index += 1) {
    const character = command[index] ?? "";
    const atWordStart = wordStart;
    wordStart = false;
    if (character === escape && quote !== "'") index += 1;
    else if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === "'" || character === '"') quote = character;
    else if (!posix && atWordStart && character === "<" && command[index + 1] === "#") {
      const end = command.indexOf("#>", index + 2);
      if (end === -1) return undefined;
      index = end + 1;
      wordStart = true;
    } else if (
      character === "#" &&
      atWordStart &&
      (!posix || !inArithmeticOrUntracked(command, start, index))
    ) {
      const end = command.indexOf("\n", index);
      if (end === -1) return undefined;
      index = end - 1;
      wordStart = true;
    } else if (posix && /[ce]/.test(character) && commandPosition(command, index, start)) {
      caseWord.lastIndex = index;
      const word = caseWord.exec(command)?.[1];
      if (word === "case") cases.push(depth);
      else if (word === "esac" && cases.at(-1) === depth) cases.pop();
      if (word) index += word.length - 1;
    } else if (character === "(") depth += 1;
    else if (character === ")") {
      if (cases.at(-1) === depth) continue;
      depth -= 1;
      if (depth === 0) return index;
    }
    if (!quote && /[ \t\n;&|(]/.test(character)) wordStart = true;
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
    message: `Exploration redirected: ${operation} over ${JSON.stringify(target)} was denied. Use ${domain === "code" ? 'CodeGraph for symbols, callers and change impact: node .qfai/tools/graph-cli.mjs code "<question>"' : 'Graphify for document concepts and rationale: node .qfai/tools/graph-cli.mjs documents "<question>"'}. Prepare the required analysis through the CLI. For AI-decided scoped search, run node .qfai/tools/graph-cli.mjs fallback --attempt-id <observed-UUID> --question "<unresolved question>" --reason "<graph limitation>". The fallback command attempts the relevant graph before granting a matching search. Human approval is not required for this search. A search that names explicit project paths, with no glob, expansion or \`..\`, is not denied.`,
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
    ...(typeof target === "string" && payload.path === undefined ? { pathIsPattern: true } : {}),
    ...(typeof workdir === "string" ? { workdir } : {}),
    ...(typeof shell === "string" ? { shell } : {}),
    ...(typeof input.cwd === "string" ? { cwd: input.cwd } : {}),
    ...(typeof session === "string" ? { session } : {}),
  };
}

/** Why the hook could not decide: what it names, and what the user does next. */
export type GraphHookFailure =
  "configuration" | "input" | "state" | "quote" | "substitution" | "depth";

const FAILURE_MESSAGES: Record<GraphHookFailure, string> = {
  configuration:
    "Graph protection failed: .qfai/tools/graph-enforcement.json is missing or is not a valid enforcement configuration. Repair hook configuration with qfai init before direct exploration.",
  input:
    "Graph protection failed: the hook could not read the host's pre-tool event. Repair hook configuration so the hook receives the host's pre-tool event.",
  state:
    "Graph protection failed: the hook could not read its local search state. Retry, and run qfai doctor if it repeats.",
  quote:
    "Graph protection failed: the hook could not match the quotes in the command. Retry without an unmatched quote, heredoc or here-string.",
  substitution:
    "Graph protection failed: the hook could not find where a $(...), (...) or backtick substitution in the command ends. Close it, move any comment out of it, or run its inner command directly.",
  depth:
    "Graph protection failed: the command nests env, command or shell wrappers more than 16 levels deep. Run the inner command directly and retry.",
};

export function failedGraphHook(failure: GraphHookFailure): GraphHookDecision {
  return { decision: "deny", state: "failed", message: FAILURE_MESSAGES[failure] };
}

/**
 * Classify a host event under a configuration. A search whose every path lies inside `root` is
 * not denied. A search that reads one regular file outside both `root` and `checkout`, the
 * checkout the hook belongs to, is not denied either; with no `checkout`, no search is exempt
 * as an outside read.
 */
export function enforceGraphExploration(
  input: unknown,
  configuration: unknown,
  root?: string,
  checkout?: string,
): GraphHookDecision {
  if (
    !object(configuration) ||
    Object.keys(configuration).length !== 2 ||
    configuration.kind !== "graph-enforcement" ||
    configuration.denyExploration !== true
  )
    return failedGraphHook("configuration");
  const event = decodeGraphHookEvent(input);
  return event
    ? classifyGraphExploration(event, undefined, root, checkout)
    : failedGraphHook("input");
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
