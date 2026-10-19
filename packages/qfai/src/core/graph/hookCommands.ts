/**
 * The graph hook entries init writes into each host's settings, and the entries earlier releases
 * wrote there.
 *
 * The settings are committed, but `.qfai/tools/` is git-ignored and created per checkout by
 * `qfai init`, so a fresh clone or a new worktree runs a hook whose script is absent. Each command
 * therefore starts a short `node -e` guard. Where the script is absent the guard reads and discards
 * stdin, so a large tool input cannot fail the host's write, then prints one line to stderr naming
 * `qfai init` and exits 0, because the graph hook steers exploration and stopping
 * every tool call adds no safety. Where it is present the guard imports it in the same process,
 * which keeps the hook's argument, stdin, stdout and exit code.
 *
 * The guard holds no `"`, `$`, backtick, `%`, `!` or backslash, so one line runs alike under
 * `sh -c`, `cmd.exe /C` and PowerShell.
 */

/** The hook script, relative to the project root. */
export const GRAPH_HOOK_SCRIPT = ".qfai/tools/graph-hook.mjs";

/** The status message that identifies a graph hook entry. */
export const GRAPH_HOOK_MARKER = "QFAI graph exploration";

const GUARD =
  "const f=require('path').resolve(process.argv[1]),s=require('fs');" +
  "if(s.existsSync(f))import(require('url').pathToFileURL(f).href);" +
  "else{try{s.readFileSync(0)}catch{}" +
  `console.error('QFAI graph hook skipped: ${GRAPH_HOOK_SCRIPT} is missing. Run qfai init in this checkout.')}`;

function shellLine(host: string): string {
  return `node -e "${GUARD}" ${GRAPH_HOOK_SCRIPT} ${host}`;
}

const CLAUDE_MATCHER = "Bash|PowerShell|Grep";
const CODEX_MATCHER =
  "^(Bash|PowerShell|exec_command|Grep|grep|rg|grep_search|search_files|file_search)$";

/** The `PreToolUse` group of `.claude/settings.json`, run in exec form. */
export const CLAUDE_GRAPH_HOOK_GROUP = {
  matcher: CLAUDE_MATCHER,
  hooks: [
    {
      type: "command",
      statusMessage: GRAPH_HOOK_MARKER,
      command: "node",
      args: ["-e", GUARD, `\${CLAUDE_PROJECT_DIR}/${GRAPH_HOOK_SCRIPT}`, "claude"],
    },
  ],
};

/** The `PreToolUse` group of `.codex/hooks.json`. */
export const CODEX_GRAPH_HOOK_GROUP = {
  matcher: CODEX_MATCHER,
  hooks: [{ type: "command", statusMessage: GRAPH_HOOK_MARKER, command: shellLine("codex") }],
};

/** The `preToolUse` entry of `.github/hooks/qfai-graph.json`. */
export const SHARED_GRAPH_HOOK_ENTRY = {
  type: "command",
  bash: shellLine("shared"),
  powershell: shellLine("shared"),
  timeoutSec: 10,
};

/**
 * The entries an earlier release wrote, which ran the script directly. An entry exactly equal to
 * one of these is replaced in place by the current entry; any other edited entry stays a conflict.
 */
export const EARLIER_GRAPH_HOOK_ENTRIES: readonly unknown[] = [
  {
    matcher: CLAUDE_MATCHER,
    hooks: [
      {
        type: "command",
        statusMessage: GRAPH_HOOK_MARKER,
        command: "node",
        args: [`\${CLAUDE_PROJECT_DIR}/${GRAPH_HOOK_SCRIPT}`, "claude"],
      },
    ],
  },
  {
    matcher: CODEX_MATCHER,
    hooks: [
      {
        type: "command",
        statusMessage: GRAPH_HOOK_MARKER,
        command: `node ${GRAPH_HOOK_SCRIPT} codex`,
      },
    ],
  },
  {
    type: "command",
    bash: `node ${GRAPH_HOOK_SCRIPT} shared`,
    powershell: `node ${GRAPH_HOOK_SCRIPT} shared`,
    timeoutSec: 10,
  },
];

/** Whether `value` is, byte for byte once serialised, an entry an earlier release wrote. */
export function isEarlierGraphHookGroup(value: unknown): boolean {
  const text = JSON.stringify(value);
  return EARLIER_GRAPH_HOOK_ENTRIES.some((entry) => JSON.stringify(entry) === text);
}
