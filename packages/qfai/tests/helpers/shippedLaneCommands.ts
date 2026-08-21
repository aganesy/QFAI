/**
 * What does a shipped lane invoke?
 *
 * This exists because the other direction failed. `tests/helpers/buildCommand.ts` answers "is this a
 * build", and `US-0017-0004` used it to assert that no shipped lane runs one. Ten versions of that
 * predicate were each reported clean and then broken, and round 10 measured the ceiling: a reviewer
 * planted fifty real builds into the shipped orchestrator and **forty-four shipped unnoticed**, with
 * this verdict on the method:
 *
 * > I did not have to find a weakness in v12: I only named build tools it does not name, and gave the
 * > ones it does name their real arguments.
 *
 * A denylist over build spellings cannot converge, because the space of spellings is not ours to
 * enumerate — and it fails **open**: every spelling nobody thought of is a pass. For an assertion whose
 * whole content is "there is nothing here", that is the wrong direction.
 *
 * So this module answers a decidable question instead: **what does the lane invoke?** The shipped tree
 * invokes ten programs. Enumerating those, and refusing everything else, needs no corpus and cannot be
 * evaded by a build spelling nobody has written. It fails **closed**: adding an innocent program breaks
 * the test, which is correct for a shipped surface — a new program in an adopter's lane is a change that
 * should be read by someone.
 *
 * The scanning is the part with a history. Two earlier versions of it reported `typeof parsed`, `let
 * field` and `try {` as commands, both by descending into a `node -e '<javascript>'` payload: the first
 * ignored quotes, the second tracked them but scanned line by line, and the payload spans lines. So the
 * scanner spans a whole `run` body and a newline outside quotes is just another separator.
 */

/** Shell words that begin a construct rather than name a program. */
const KEYWORDS = new Set([
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "for",
  "while",
  "until",
  "do",
  "done",
  "case",
  "esac",
  "in",
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  "[[",
  "]]",
  "!",
  ":",
  ";;",
  "return",
  "local",
  "shift",
  "continue",
  "break",
]);

/** After one of these, the next token is a payload rather than a command. */
const OPAQUE_AFTER = new Set(["-e", "--eval", "-c", "--command", "-p", "--print"]);

/**
 * Split a whole `run` body into commands, honouring quotes, newlines and command substitution.
 *
 * Substitution is the part that needed three attempts. `declared="$(node -e '<javascript>')"` opens with
 * a DOUBLE quote, so a scanner that simply tracks the current quote closes that run at the first `"`
 * inside the payload — which is `require("node:fs")` — and reads the remaining JavaScript as commands.
 * Both earlier versions reported `typeof parsed` and `));` for exactly that reason.
 *
 * A `$( … )` is therefore entered as its own body: its contents are commands (so `node -e` is seen as an
 * invocation) with their own quote state (so the payload inside them stays opaque). The substitution is
 * then removed from the surrounding word, because what it contributes there is its output, not a command.
 */
export function commandsOf(body: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote = "";
  let inComment = false;

  const flush = (): void => {
    out.push(current);
    current = "";
  };

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] ?? "";
    if (inComment) {
      if (ch === "\n") inComment = false;
      else continue;
    }
    // A substitution is scanned on its own terms, inside or outside quotes.
    if (ch === "$" && body[i + 1] === "(" && quote !== "'") {
      const close = matchingParen(body, i + 1);
      out.push(...commandsOf(body.slice(i + 2, close)));
      i = close;
      continue;
    }
    if (quote !== "") {
      current += ch;
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "#") {
      inComment = true;
      continue;
    }
    if (ch === "\\" && body[i + 1] === "\n") {
      i += 1;
      current += " ";
      continue;
    }
    const two = body.slice(i, i + 2);
    if (two === "&&" || two === "||") {
      flush();
      i += 1;
      continue;
    }
    // A pipe splits commands only when it is spaced. `*.md|*.txt|LICENSE|docs/*)` is a `case`
    // pattern alternation, and splitting it produced `LICENSE` as a program — the last parse artifact
    // in this scan. A real pipe is written `a | b`; the unspaced form is legal shell that nobody uses,
    // and this tree uses neither for a pipe nor anything else but patterns.
    const spacedPipe =
      ch === "|" && (/\s/.test(body[i - 1] ?? " ") || /\s/.test(body[i + 1] ?? " "));
    if (ch === ";" || spacedPipe || ch === "&" || ch === "\n") {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return out.map((c) => c.trim()).filter(Boolean);
}

/** The index of the `)` closing the `(` at `open`, honouring nesting and quotes. */
function matchingParen(body: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < body.length; i += 1) {
    const ch = body[i] ?? "";
    if (quote !== "") {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return body.length;
}

/** Tokens of one command, a quoted run counting as one token. */
export function tokensOf(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote = "";
  for (const ch of command) {
    if (quote !== "") {
      if (ch === quote) quote = "";
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current !== "") tokens.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current !== "") tokens.push(current);
  return tokens;
}

/**
 * What this command invokes: the program, plus its first non-flag argument when it has one.
 *
 * The argument is included because `npx qfai validate` and `npx tsup` are the same program and only one
 * of them may ship. `undefined` means the command names no program — a shell keyword, a `case` pattern,
 * an assignment, or a function definition.
 */
export function invocationOf(command: string): string | undefined {
  const tokens = tokensOf(command);
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i] ?? "";
    if (!/^[A-Za-z_]\w*=/.test(token) && !token.startsWith(">") && !token.startsWith("<")) break;
    i += 1;
  }
  const head = tokens[i];
  if (head === undefined || KEYWORDS.has(head)) return undefined;
  // A `case` pattern, a function definition, or an assignment reached by another route.
  if (/[*?[\]]/.test(head) || head.endsWith("()") || head.includes("=")) return undefined;
  for (let j = i + 1; j < tokens.length; j += 1) {
    const token = tokens[j] ?? "";
    if (OPAQUE_AFTER.has(token)) return head;
    if (!token.startsWith("-")) return `${head} ${token}`;
  }
  return head;
}

/** Functions a `run` body defines for itself, which are not programs. */
export function localFunctionsOf(body: string): Set<string> {
  return new Set([...body.matchAll(/^[ \t]*(\w+)[ \t]*\(\)[ \t]*\{/gm)].map((m) => m[1] ?? ""));
}

/**
 * Every invocation in a `run` body, with the body's own function definitions removed.
 *
 * A local function is a name this body defined, so it cannot be the route a build arrives by — whatever
 * the function itself runs is scanned on its own.
 */
export function invocationsOf(body: string): string[] {
  const local = localFunctionsOf(body);
  const out: string[] = [];
  for (const command of commandsOf(body)) {
    const invocation = invocationOf(command);
    if (invocation === undefined) continue;
    if (local.has(invocation.split(" ")[0] ?? "")) continue;
    out.push(invocation);
  }
  return out;
}

/**
 * Programs whose arguments cannot reach a build, allowed by NAME.
 *
 * The split between this and `ALLOWED_INVOCATIONS` is the whole design: a program that could build is
 * allowed only as an exact invocation, so `npx qfai` ships and `npx tsup` does not, though they are the
 * same program.
 */
export const HARMLESS_PROGRAMS: ReadonlySet<string> = new Set([
  "echo",
  "exit",
  "true",
  "read",
  "grep",
  "cut",
  "tr",
  "printf",
  "git",
]);

/** Exact invocations allowed for a program that could otherwise build. */
export const ALLOWED_INVOCATIONS: ReadonlySet<string> = new Set([
  "corepack enable",
  "npm ci",
  "npm install",
  "pnpm install",
  "yarn install",
  "yarn",
  "npx qfai",
  // `node` with no bare argument: its only shipped use is `node -e <payload>`, and a payload is opaque
  // to any scan. `node build.mjs` is a different invocation and is refused.
  "node",
]);

/** Actions a shipped lane may use, and the input keys they may be given. */
export const ALLOWED_ACTIONS: ReadonlySet<string> = new Set([
  "actions/checkout",
  "actions/setup-node",
  "pnpm/action-setup",
]);
export const ALLOWED_ACTION_INPUTS: ReadonlySet<string> = new Set([
  "cache",
  "fetch-depth",
  "node-version",
  "persist-credentials",
]);

/**
 * The invocations in this body that the allowlist refuses.
 *
 * One definition, used by the story's assertion and by the corpus that falsifies it. Round 10 found
 * three hardcoded file lists in a sibling guard maintained independently of each other; two copies of
 * an allowlist is the same defect one size smaller.
 */
export function refusals(body: string): string[] {
  return invocationsOf(body).filter((invocation) => {
    const program = invocation.split(" ")[0] ?? "";
    return !HARMLESS_PROGRAMS.has(program) && !ALLOWED_INVOCATIONS.has(invocation);
  });
}
