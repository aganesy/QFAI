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
  const commands = shellPipelines(event.command ?? "", shell);
  if (!commands) return failedGraphHook();
  return (
    classifyCommands(commands, authorize) ?? {
      decision: "allow",
      state: "configured",
      message: "No direct exploration was classified.",
    }
  );
}

function classifyCommands(
  commands: string[][],
  authorize: GraphSearchAuthorization,
  depth = 0,
): GraphHookDecision | undefined {
  const changesDirectory = commands.some(changesGraphDirectory);
  const scopedAuthorization: GraphSearchAuthorization = changesDirectory
    ? (decision) =>
        graphFallbackUnavailable(
          decision,
          "The command changes its working directory.",
          "Run a single search from this project worktree, then retry the denied action.",
        )
    : authorize;
  let boundary: GraphHookDecision | undefined;
  let allowed: GraphHookDecision | undefined;
  for (const words of commands) {
    const decision = classifyCommand(words, scopedAuthorization, depth);
    if (decision?.decision === "deny") return decision;
    if (decision?.state === "outside-boundary") boundary = decision;
    else if (decision) allowed = decision;
  }
  return boundary ?? allowed;
}

function changesGraphDirectory(words: string[]): boolean {
  let offset = 0;
  while (offset < words.length) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "")) {
      offset += 1;
      continue;
    }
    if (words[offset]?.toLowerCase() !== "command") break;
    offset += 1;
    if (words[offset] === "-v" || words[offset] === "-V") return false;
    while (words[offset]?.startsWith("-")) offset += 1;
  }
  return ["cd", "chdir", "pushd", "popd", "set-location", "sl"].includes(
    words[offset]?.toLowerCase() ?? "",
  );
}

function classifyCommand(
  words: string[],
  authorize: GraphSearchAuthorization,
  depth = 0,
): GraphHookDecision | undefined {
  if (depth > 16) return failedGraphHook();
  const operation = words[0]
    ?.split(/[\\/]/)
    .at(-1)
    ?.replace(/\.exe$/i, "")
    .toLowerCase();
  if (operation === "env" || operation === "command") {
    let offset = 1;
    while (words[offset]?.startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[offset] ?? "")) {
      offset += 1;
    }
    return classifyCommand(words.slice(offset), authorize, depth + 1);
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
    const commands = shellPipelines(inner, shell);
    return commands ? classifyCommands(commands, authorize, depth + 1) : failedGraphHook();
  }
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
    return authorize({ ...denyExploration(operation, target), exceptionEligible: eligible });
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
    return authorize({
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
    return authorize({
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

function outsideBoundary(): GraphHookDecision {
  return {
    decision: "allow",
    state: "outside-boundary",
    message:
      "Search inside scripts, aliases or continuing input is not verified by this pre-tool boundary.",
  };
}

function shellPipelines(command: string, shell: GraphShell): string[][] | undefined {
  const commands: string[][] = [];
  let words: string[] = [];
  let word = "";
  let quote: string | undefined;
  const flushWord = () => {
    if (word.length) words.push(word);
    word = "";
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
    } else if (character === "|" || character === ";" || character === "&" || character === "\n") {
      flushWord();
      if (words.length) commands.push(words);
      words = [];
    } else if (/\s/.test(character)) {
      flushWord();
    } else {
      word += character;
    }
  }
  if (quote) return undefined;
  flushWord();
  if (words.length) commands.push(words);
  return commands;
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

export function failedGraphHook(): GraphHookDecision {
  return {
    decision: "deny",
    state: "failed",
    message:
      "Graph protection failed: invalid pre-tool input. Repair hook configuration before direct exploration.",
  };
}

export function enforceGraphExploration(input: unknown, configuration: unknown): GraphHookDecision {
  if (
    !object(configuration) ||
    Object.keys(configuration).length !== 2 ||
    configuration.kind !== "graph-enforcement" ||
    configuration.denyExploration !== true
  )
    return failedGraphHook();
  const event = decodeGraphHookEvent(input);
  return event ? classifyGraphExploration(event) : failedGraphHook();
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
