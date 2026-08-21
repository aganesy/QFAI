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
 * invokes a small fixed set of programs, pinned by the test rather than counted in prose — this line
 * said ten while the story's E2E row said fifteen. Enumerating them, and refusing everything else, needs
 * no corpus and cannot be
 * evaded by a build spelling nobody has written. It fails **closed**: adding an innocent program breaks
 * the test, which is correct for a shipped surface — a new program in an adopter's lane is a change that
 * should be read by someone.
 *
 * The scanning is the part with a history. Two earlier versions of it reported `typeof parsed`, `let
 * field` and `try {` as commands, both by descending into a `node -e '<javascript>'` payload: the first
 * ignored quotes, the second tracked them but scanned line by line, and the payload spans lines. So the
 * scanner spans a whole `run` body and a newline outside quotes is just another separator.
 */

import { createHash } from "node:crypto";

/**
 * `local` is deliberately not special-cased anywhere: `local x=1` is an assignment, and the
 * assignment skip reads it as one.
 *
 * The set that used to sit here — one flat `KEYWORDS` holding `if` beside `fi` and `[` beside `]` —
 * is gone, and its SHAPE was the defect. A single set could only support one answer, "this is a
 * keyword, stop", which discarded the command a prefix keyword introduces:
 * `if [ -f package.json ]; then pnpm build; fi` refused nothing. `COMMAND_PREFIXES` and
 * `TERMINATORS`, declared beside `invocationOf`, are the two answers it could not give.
 */

/**
 * Stands in for a command substitution removed from a surrounding word.
 *
 * Chosen to be something no real token contains, and something `invocationOf` reads as unreadable.
 */
export const SUBSTITUTION = "\u0000substitution\u0000";

/**
 * Stands in for the pipe that feeds a command's stdin.
 *
 * Spelled as a redirection because that is what it is — every walk that already skips `<` skips this
 * too, and every rule that reads a command's INPUT sees the pipe and the `<` file and the here-string
 * as the one thing they are.
 */
export const STDIN_FROM_PIPE = "<\u0000pipe\u0000";

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
  const mask = codeMask(body);
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
    // A substitution is scanned on its own terms, inside or outside quotes. THREE spellings, because
    // the shell has three and the previous version entered one: `$( … )`, the backtick, and process
    // substitution `<( … )` / `>( … )`. Round 11 measured all three: `echo ` npx tsup `` and
    // `grep -q x <(npx tsup)` both ran a real build while `$(npx tsup)` was correctly refused, so two
    // spellings of one shell feature got opposite verdicts.
    if (ch === "$" && body[i + 1] === "(" && quote !== "'") {
      const close = matchingParen(body, i + 1);
      out.push(...commandsOf(body.slice(i + 2, close)));
      // A PLACEHOLDER, not nothing. Deleting the substitution from the surrounding word narrowed the
      // command into a shorter one that happened to be allowed: `node $(echo build.mjs)` left a bare
      // `node`, which is on the list, while the substitution's output was the script it ran. Nothing can
      // know that output, so the surrounding command must read as unreadable rather than as a prefix of
      // itself.
      current += SUBSTITUTION;
      i = close;
      continue;
    }
    if ((ch === "<" || ch === ">") && body[i + 1] === "(" && quote !== "'") {
      const close = matchingParen(body, i + 1);
      out.push(...commandsOf(body.slice(i + 2, close)));
      current += SUBSTITUTION;
      i = close;
      continue;
    }
    if (ch === "`" && quote !== "'") {
      const close = body.indexOf("`", i + 1);
      const end = close === -1 ? body.length : close;
      out.push(...commandsOf(body.slice(i + 1, end)));
      current += SUBSTITUTION;
      i = end;
      continue;
    }
    if (quote !== "") {
      if (ch === "\\" && quote === '"') {
        current += ch + (body[i + 1] ?? "");
        i += 1;
        continue;
      }
      current += ch;
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    // A comment starts only at the beginning of a WORD. bash runs `echo a#b && npx tsup`; the
    // previous version dropped the rest of the line at the `#` and the build ran unseen.
    if (ch === "#" && (i === 0 || /[\s;&|(]/.test(body[i - 1] ?? " "))) {
      inComment = true;
      continue;
    }
    if (ch === "\\") {
      if (body[i + 1] === "\n") {
        i += 1;
        current += " ";
        continue;
      }
      // A backslash escapes the next character: it is NOT a quote, NOT a separator, and it does not
      // toggle quote state. Reading it as an ordinary character desynchronised the scanner from bash,
      // and `echo \\" ; npx tsup` swallowed a real build into an `echo` argument.
      current += ch + (body[i + 1] ?? "");
      i += 1;
      continue;
    }
    const two = body.slice(i, i + 2);
    if (two === "&&" || two === "||") {
      flush();
      i += 1;
      continue;
    }
    // A `|` is a pipe unless it sits inside a `case` PATTERN, where it is an alternation. Spacing is not
    // the question, and two previous rules both got that wrong: requiring a space let
    // `echo x|npx tsup` read as an invocation of `echo` with the build running (round 12), and splitting
    // unconditionally fragmented `*.md|*.markdown|*.txt|LICENSE|docs/*)` into glob heads with no `)`,
    // which the fail-closed rule then refused sixteen times in the shipped tree.
    //
    // Decidable locally: a `)` reachable before any `;`, newline or `(` closes a case arm, so the `|`
    // before it is an alternation. A `(` first means the `)` belongs to that group, so
    // `echo a|grep -f <(make)` splits — its `)` closes the process substitution.
    const isAlternation = (): boolean => {
      // A `)` that closes a group already open at this point is not a case arm, so the pipe inside
      // `( echo x | npx tsup )` is a pipe. Depth is counted over CODE positions only.
      let depth = 0;
      for (let j = 0; j < i; j += 1) {
        if (!mask[j]) continue;
        if (body[j] === "(") depth += 1;
        else if (body[j] === ")") depth -= 1;
      }
      if (depth > 0) return false;
      for (let j = i + 1; j < body.length; j += 1) {
        if (!mask[j]) continue;
        const ahead = body[j] ?? "";
        if (ahead === ")") return true;
        if (ahead === ";" || ahead === "\n" || ahead === "(") return false;
      }
      return false;
    };
    if (ch === ";" || (ch === "|" && !isAlternation()) || ch === "&" || ch === "\n") {
      const piped = ch === "|";
      flush();
      // A pipe IS a redirection of the downstream command's stdin, so it leaves a token shaped like
      // one. Dropping it made `echo "<javascript>" | node` read as a bare `node`, which is allowed.
      if (piped) current = `${STDIN_FROM_PIPE} `;
      continue;
    }
    current += ch;
  }
  flush();
  return out.map((c) => c.trim()).filter(Boolean);
}

/**
 * Which characters of a body are CODE, as opposed to quoted text or comment prose.
 *
 * Computed by the same state machine `commandsOf` runs, and computed ONCE, because the alternation
 * lookahead used to be a second, weaker parse of the same text: it scanned raw characters, so a `)`
 * inside a string literal or a trailing `#` comment was read as a case-arm close and the pipe before it
 * stopped splitting. Two copies of the lexer is the two-copies-of-an-allowlist defect one size smaller.
 */
function codeMask(body: string): boolean[] {
  const mask = new Array<boolean>(body.length).fill(true);
  let quote = "";
  let inComment = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] ?? "";
    if (inComment) {
      mask[i] = false;
      if (ch === "\n") inComment = false;
      continue;
    }
    if (quote !== "") {
      mask[i] = false;
      if (ch === "\\" && quote === '"') {
        if (i + 1 < body.length) mask[i + 1] = false;
        i += 1;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "\\") {
      mask[i] = false;
      if (i + 1 < body.length) mask[i + 1] = false;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      mask[i] = false;
      continue;
    }
    if (ch === "#" && (i === 0 || /[\s;&|(]/.test(body[i - 1] ?? " "))) {
      inComment = true;
      mask[i] = false;
      continue;
    }
  }
  return mask;
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
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i] ?? "";
    if (ch === "\\" && quote !== "'") {
      current += command[i + 1] ?? "";
      i += 1;
      continue;
    }
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
 * A construct that provably invokes no program: a `case` pattern arm, a function-definition header, a
 * bare assignment, a block terminator. **Not** the same as "I cannot tell", which is `UNREADABLE`.
 */
export const NOTHING = Symbol("invokes nothing");

/**
 * A command whose program this scanner could not determine.
 *
 * The distinction from `NOTHING` is the whole repair. Both used to be `undefined`, and `refusals()` read
 * `undefined` as consent — so every construct the scanner did not understand was permission to run
 * anything. Round 11 measured five separate holes of that shape (a keyword head, a backtick, a glob
 * head, a process substitution, a mid-word `#`) and ran fifteen of eighteen real builds with the
 * instrument reporting clean. Enumerating five repairs would have left the sixth open.
 *
 * Now the scanner's own failure is a refusal. A construct nobody anticipated costs a spurious refusal in
 * review — which someone reads — rather than a shipped build, which nobody does. That is what "fails
 * closed" has to mean for an assertion whose content is "there is nothing here".
 */
export const UNREADABLE = Symbol("cannot be read");

/**
 * Shell keywords that PREFIX a command rather than being one.
 *
 * `if`, `then`, `else`, `elif`, `do`, `while`, `until`, `!` and `{` are all followed by a command in
 * one-line form, and `commandsOf` splits on `;` — so the command after the keyword used to arrive as the
 * TAIL of a keyword-headed command and be discarded whole. `if [ -f package.json ]; then pnpm build; fi`
 * refused nothing, and `pnpm build` is the first entry the corpus claims to refuse: one shell construct
 * around it was enough.
 */
const COMMAND_PREFIXES = new Set([
  "if",
  "then",
  "else",
  "elif",
  "do",
  "while",
  "until",
  "!",
  "{",
  "(",
]);

/** Keywords that end a construct and invoke nothing at all. */
const TERMINATORS = new Set([
  "fi",
  "done",
  "esac",
  "}",
  ")",
  ";;",
  "in",
  // Loop and function control. These are builtins that run nothing, so they belong here rather than on
  // the by-name program list, where they would have read as programs whose arguments are unexamined.
  "continue",
  "break",
  "shift",
  "return",
  ":",
]);

/**
 * What this command invokes: the program, plus its first non-flag argument when it has one.
 *
 * The argument is included because `npx qfai validate` and `npx tsup` are the same program and only one
 * of them may ship.
 */
/**
 * Where the program name starts, after assignments, redirects and command-prefix keywords.
 *
 * `undefined` when the walk runs out of tokens or hits something that answers for the whole command; the
 * caller decides what that means. Shared so `invocationOf` and `bareArgumentsOf` cannot disagree about
 * which token is the program.
 */
function headIndexOf(tokens: readonly string[]): number | undefined {
  let i = 0;
  for (;;) {
    if (i >= tokens.length) return undefined;
    const token = tokens[i] ?? "";
    if (/^[A-Za-z_]\w*=/.test(token) || token.startsWith(">") || token.startsWith("<")) {
      i += 1;
      continue;
    }
    if (COMMAND_PREFIXES.has(token)) {
      i += 1;
      continue;
    }
    if (token === "for" || token === "case" || token === "select") return undefined;
    return i;
  }
}

export function invocationOf(command: string): string | typeof NOTHING | typeof UNREADABLE {
  const tokens = tokensOf(command);
  const prefixNames: string[] = [];
  let i = 0;
  // The two skips INTERLEAVE. Running the assignment skip once and then the keyword skip once left
  // `while IFS= read -r changed_path` — the shipped tree's own line — with `IFS=` as its head, because
  // the assignment sits after the keyword and the assignment pass had already finished.
  for (;;) {
    const token = tokens[i] ?? "";
    if (i >= tokens.length) break;
    if (/^[A-Za-z_]\w*=/.test(token) || token.startsWith(">") || token.startsWith("<")) {
      // An assignment whose VALUE names a program is a way to run one: `GIT_EXTERNAL_DIFF=./ext-diff.sh
      // git diff --ext-diff HEAD` runs an arbitrary script, and skipping the prefix made it invisible.
      // A path or a script file is refused; `IFS=`, `NODE_ENV=production` and `declared=…` are not, which
      // is what keeps the shipped tree readable.
      if (/^[A-Za-z_]\w*=/.test(token)) prefixNames.push(token.slice(0, token.indexOf("=")));
      i += 1;
      continue;
    }
    // `for` and `case` introduce a word list rather than a command, so they terminate; `do` and `then`
    // resume, which is why the prefixes are skipped rather than stopped at.
    if (COMMAND_PREFIXES.has(token)) {
      i += 1;
      continue;
    }
    // `for` terminates: what follows its `in` is a word LIST, and its body arrives in a later segment as
    // `do …`. `case` and `select` do not — `case $x in *) npx tsup ;; esac` puts the arm in the SAME
    // segment, so answering `NOTHING` here discarded the command after the pattern. Skip past `in` and
    // keep reading; the arm is then handled as the prefix it is.
    if (token === "for") return NOTHING;
    if (token === "case" || token === "select") {
      const at = tokens.indexOf("in", i + 1);
      if (at === -1) return NOTHING;
      i = at + 1;
      continue;
    }
    break;
  }
  const head = tokens[i];
  if (head === undefined || TERMINATORS.has(head)) return NOTHING;
  // The prefix decides what the command that follows resolves to, so an unenumerated one is a command
  // this scanner cannot read rather than a prefix it may drop.
  if (prefixNames.some((name) => !ALLOWED_ENV_PREFIXES.has(name))) return UNREADABLE;
  // A function-definition HEADER is a prefix, not a command — the same reading `if` and a `case` arm get,
  // and the third punctuation mark this instrument has had to learn it for. `commandsOf` splits on `;`, so
  // `build_once() { pnpm build; }` arrives as one command whose head is `build_once()`; answering `NOTHING`
  // discarded the entire body, and `refusals()` returned `[]` for a line that builds.
  //
  // Round 12 measured it, and the shipped tree already contains the construct: `qfai-tests.yml` defines
  // `emit() { echo "$1"; }` on one line, which this scanner has been reporting as nothing all along. Only
  // the ONE-LINE form was blind — a definition whose `{` and body sit on separate lines was already read —
  // which is why every corpus of bare commands missed it.
  if (head.endsWith("()")) {
    const rest = tokens.slice(i + 1);
    return rest.length === 0 ? NOTHING : invocationOf(rest.join(" "));
  }
  // A `case` pattern ARM is a prefix, not a command: `commandsOf` splits on `;`, so `*.ts) npx tsup ;;`
  // arrives as one command whose head is the pattern. Reading the head and discarding the tail hid the
  // build after it — the keyword defect wearing a different punctuation mark. Strip the arm and read
  // what follows, which also keeps `*.md|*.txt|LICENSE|docs/*) echo docs` accepted, on `echo`.
  if (head.endsWith(")") && !head.startsWith("(")) {
    const rest = tokens.slice(i + 1);
    return rest.length === 0 ? NOTHING : invocationOf(rest.join(" "));
  }
  // `[` and `[[` are the test builtins, and `[` is itself a glob metacharacter — so the glob rule below
  // read the shipped tree's own `if [ -f package.json ]` as an executed path. They are programs, they
  // evaluate a condition, and they run nothing.
  if (head === "[" || head === "[[") return head;
  // A glob-bearing head that is NOT a case arm is a path being executed. `./ci/*/build.sh` and
  // `scripts/*/build.sh` are ordinary CI idiom and they run, so this is unreadable rather than nothing.
  if (/[*?[\]]/.test(head)) return UNREADABLE;
  if (head.includes("=")) return UNREADABLE;
  for (let j = i + 1; j < tokens.length; j += 1) {
    const token = tokens[j] ?? "";
    if (OPAQUE_AFTER.has(token)) return head;
    if (!token.startsWith("-")) return `${head} ${token}`;
  }
  return head;
}

/**
 * Variables a shipped command may set as a PREFIX of another command.
 *
 * The rule this replaces asked whether the VALUE looked like a script path — a denylist-shaped sniff
 * inside an allowlist-shaped instrument, and it fails open by construction: `PATH=bin:$PATH npx qfai`
 * has no slash and no extension, and it decides which `npx` runs. Which variable is set is a fixed,
 * ours-to-enumerate fact about the shipped tree; what its value can mean is not.
 *
 * A standalone assignment is untouched: it invokes nothing, and this rule only fires when a COMMAND
 * follows the prefix.
 */
export const ALLOWED_ENV_PREFIXES: ReadonlySet<string> = new Set(["IFS"]);

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
/** One resolved command: what it invokes, and the text it came from. */
interface Resolved {
  readonly invocation: string;
  readonly command: string;
}

/**
 * The walk, written ONCE.
 *
 * `invocationsOf` and `refusals` used to be this loop twice, diverging only in their last few lines — and
 * the copies had already drifted apart, because only one of them carried the substitution check. This
 * module's docstring argues that two copies of an allowlist is the same defect one size smaller; two
 * copies of the walk is that argument one size smaller again.
 */
function resolvedCommands(body: string): Resolved[] {
  const local = localFunctionsOf(body);
  const out: Resolved[] = [];
  for (const command of commandsOf(body)) {
    const invocation = invocationOf(command);
    if (invocation === NOTHING) continue;
    if (invocation === UNREADABLE) {
      // Reported as the command itself, so a refusal names what a reader has to look at.
      out.push({ invocation: `<unreadable> ${command.slice(0, 60)}`, command });
      continue;
    }
    if (local.has(invocation.split(" ")[0] ?? "")) continue;
    out.push({ invocation, command });
  }
  return out;
}

export function invocationsOf(body: string): string[] {
  return resolvedCommands(body).map((resolved) => resolved.invocation);
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
  // `[` evaluates a condition and runs nothing. It is here rather than among the keywords because it IS
  // a program, and the shipped tree writes `[ -f package.json ]`.
  //
  // `[[`, `test` and `false` were here too and the shipped tree invokes none of them. For an allowlist
  // over a fixed surface an unused entry is not harmless breadth — it is a slot a future edit can fill
  // without anyone reading it. The test below requires every member to be invoked by the shipped tree, so
  // re-adding one is a deliberate act with an assertion to change rather than a line to append.
  "[",
]);

/**
 * Allowed invocations for a program that could otherwise build: the program plus its first non-flag
 * argument.
 *
 * **A two-token PREFIX, not an exact match**, and the previous docstring said exact — so
 * `npm install left-pad` read as `npm install` and shipped. `TAKES_NO_PACKAGE` below closes the case
 * that prefix loses; it cannot be closed for every entry, because `npx qfai validate` and
 * `git diff --name-only origin/main...HEAD` legitimately carry further bare arguments, so the closure is
 * declared per entry rather than assumed.
 */
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
  // `git` was allowed by NAME, under a docstring claiming these programs' arguments cannot reach a
  // build. `git submodule foreach`, `git bisect run`, `git difftool --extcmd`,
  // `git filter-branch --tree-filter` and `git -c alias.X='!cmd' X` all take a shell command as their
  // argument, and `git -c alias.zz='!npx tsup' zz` is one line and a real build. It is exactly the
  // `npx qfai` / `npx tsup` case the split above exists for, so it takes the same treatment: the one
  // shipped use is `git diff --name-only origin/main...HEAD`.
  "git diff",
  // The detection job asks git two questions. Surfacing this one is what moving `git` off the by-name
  // list is FOR: each shipped use is now written down, and a sixth would fail this list rather than
  // arrive under a program name.
  "git rev-parse",
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
 * The `node -e` payloads a shipped lane may carry, as sha256 of their whitespace-collapsed text.
 *
 * Hashes rather than the text itself, because the two payloads are 514 and 909 characters of multi-line
 * JavaScript and a literal copy here would break on every reflow of the shipped file. A reflow IS a change
 * someone should read, so the hash failing is the intended behaviour and the fix is to re-measure and
 * re-record — not to loosen the comparison.
 *
 * `node` is on the allowed list because the shipped tree needs one `node -e`, and a payload is CODE: no
 * command scanner reads it, so `node -e "require('child_process').execSync('pnpm build')"` was accepted
 * and ran a build. The answer is not a denylist of suspicious substrings — that is the fail-open
 * direction this instrument was rebuilt to escape. It is to enumerate the payloads, which needs no corpus
 * and refuses every payload nobody wrote down, including the ones nobody has thought of.
 *
 * Both shipped workflows carry the same payload: the one that reads `packageManager` out of
 * `package.json`. A second one is a change someone should read.
 */
export const ALLOWED_NODE_PAYLOADS: ReadonlySet<string> = new Set([
  // `qfai-tests.yml#detection` — reads `scripts` out of `package.json`. 514 characters.
  "9b167ae1d3e96d47ef48d847b143b141803e9d33aaf0f81f50b2982e3849ff35",
  // `qfai-validate.yml#validate` — reads `packageManager` out of `package.json`. 909 characters.
  "df5c5a7b43cd48300a7baf113779007e08e814f69d01bfa726e476d9680406e1",
]);

/** The payload of a `node -e`, whitespace-collapsed, hashed. */
export function payloadDigest(payload: string): string {
  return createHash("sha256").update(payload.replace(/\s+/g, " ").trim()).digest("hex");
}

/**
 * The digest of every `run:` body the shipped tree contains, whitespace-collapsed.
 *
 * **This is the boundary, and it is a different KIND of claim from everything else in this file.** The
 * allowlist asks what a body invokes and answers with a parser; a twenty-agent sweep then ran fourteen
 * bodies past that parser and none of the fourteen was refuted. The reason it converges slowly is
 * structural rather than a matter of effort: enumerating bash grammar ends only at a complete bash
 * parser, and every gap on the way there fails open. Enumerating our own twelve bodies ends at twelve
 * and fails closed, because a body nobody reviewed has no digest here whatever it is written in.
 *
 * What it does NOT do: it says nothing about behaviour, so it cannot tell a maintainer why a body is
 * acceptable, and it is silenced by pasting the new digest. That is deliberate. Pasting one is a
 * visible act in review, and review is where the question "what does this body now run?" is worth
 * asking — `refusals()` is the instrument that answers it, and this is the gate that makes someone ask.
 */
export const ALLOWED_STEP_BODIES: ReadonlySet<string> = new Set([
  // qfai-tests.yml#detection [Select lanes from the name-only diff] — 40 lines
  "614f4ba84cbb09a3f6d476443f136abd66c614f43eb5b2c3cd4f4646cc0cc9f4",
  // qfai-tests.yml#detection [Probe layer-named test scripts] — 35 lines
  "ae6054a7fc9827bce7b8ad679a1bbfe740d90984c20d2283afde13dbcf0c3818",
  // qfai-tests.yml#unit [unit lane placeholder] — 1 line
  "09b8ac75ee3ef6fe71dbc5e38e2bebc7207b7d1a358bec40bc1229fd2dea8523",
  // qfai-tests.yml#component [component lane placeholder] — 1 line
  "c6497f24366cb07fac4e65f2fd95bb95926520a7894adb96c92643f719f5d9f9",
  // qfai-tests.yml#integration [integration lane placeholder] — 1 line
  "4defbb1b5a2ede5b36495e4747fc1220739ffd9a16957add74b1cdc887e786df",
  // qfai-tests.yml#api [api lane placeholder] — 1 line
  "3af03c5087ed07f3066fb114d17f61d850449cf9073dc78dc98617cf668944ea",
  // qfai-tests.yml#e2e [e2e lane placeholder] — 1 line
  "b2382d77e17d5940626aa1e9c306fb74570955930472497aa4a473aa57e3bc93",
  // qfai-tests.yml#verdict [Aggregate lane results (green on skip)] — 8 lines
  "a5b54a3a66f1681fb317f748e9dc6df9383ad74373bcfc555af309b4a407a3a5",
  // qfai-validate.yml#validate [Resolve the package manager (pnpm route fails closed)] — 52 lines
  "e83d6a946a1424b605cca461300914583cbf6f95b8fafa84dfc3cc3e677a602c",
  // qfai-validate.yml#validate [Resolve the Node version (adopter file wins, else fall open)] — 22 lines
  "020c2d24603e6bd5e0e467ff97558b311fcc17f330f6b9889f8a0761ab253bc9",
  // qfai-validate.yml#validate [Install dependencies (lockfile-aware)] — 22 lines
  "cc817c0973b9a7179506b21b6b366fe1b3d8be9e1e7422973691266c4a64abd8",
  // qfai-validate.yml#validate [qfai validate] — 1 line
  "cafa0558d597d81a2b477a24bf245ceb02e38e714767bde76bf0ff0918dd31d9",
]);

/** The `shell:` values a shipped step may declare. A `shell:` is a command template, so it is scanned. */
export const ALLOWED_SHELLS: ReadonlySet<string> = new Set(["bash"]);

/**
 * Invocations after which a further bare argument changes what the command DOES.
 *
 * A package manager's install with a bare argument names a package, and installing an arbitrary package
 * in a shipped lane is a different act from restoring a lockfile — it is also the shortest route to
 * running arbitrary code, via that package's install scripts. `corepack enable` is here for the same
 * reason: with an argument it enables a named package manager version.
 */
const TAKES_NO_PACKAGE: ReadonlySet<string> = new Set([
  "npm install",
  "npm ci",
  "pnpm install",
  "yarn install",
  "corepack enable",
]);

/**
 * The flags each allowed invocation may carry.
 *
 * `invocationOf` resolves a command to its program plus its first BARE argument, so every flag was
 * invisible — and for a general-purpose interpreter the flags are the program: `node --run=build`,
 * `node --import=./evil.mjs` and `node --test` all resolve to the allowed bare `node`. Flags are part
 * of the invocation, and the shipped set of them is ours to enumerate exactly as the invocations are.
 *
 * Programs on `HARMLESS_PROGRAMS` are deliberately absent: they are allowed by NAME, flags included,
 * because their arguments cannot reach a build.
 */
const ALLOWED_FLAGS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["corepack enable", new Set<string>()],
  ["npm ci", new Set<string>()],
  ["npm install", new Set(["--no-audit", "--no-fund"])],
  ["pnpm install", new Set(["--frozen-lockfile"])],
  ["yarn install", new Set(["--immutable", "--frozen-lockfile"])],
  ["yarn", new Set(["--version"])],
  ["npx qfai", new Set(["--profile", "--fail-on"])],
  ["node", new Set(["-e"])],
  ["git diff", new Set(["--name-only"])],
  ["git rev-parse", new Set(["--is-shallow-repository", "--verify", "--quiet"])],
]);

/**
 * The environment variables a shipped workflow, job or step may set.
 *
 * `env:` is an execution channel no scan in this file could see, because nothing it does appears in a
 * `run:` body: `NODE_OPTIONS=--require=./loader.cjs` makes every later `node` load that file,
 * `BASH_ENV` does the same for every non-interactive `bash`, and an `npm_config_*` rewrites what an
 * enumerated `npm ci` actually does. The refusal is by NAME because the name is the channel — it decides
 * which program reads the value — and enumerating names fails closed the way the invocation list does:
 * a variable nobody wrote down is refused whether or not anyone has worked out what it would do.
 */
export const ALLOWED_STEP_ENV: ReadonlySet<string> = new Set(["QFAI_BASE_REF", "QFAI_NEEDS_JSON"]);

/** Where a shipped command may write. A redirect creates a file, and a created file can be code. */
const ALLOWED_REDIRECT_TARGETS: ReadonlySet<string> = new Set(["$GITHUB_OUTPUT", "/dev/null"]);

/** The non-flag arguments a command carries after its program. */
function bareArgumentsOf(command: string): string[] {
  const tokens = tokensOf(command);
  // The SAME prefix walk `invocationOf` uses. Counting from index 1 assumed token 0 is the program, and
  // with an assignment prefix it is not — `NODE_ENV=production npm ci` yielded `["npm", "ci"]`, so
  // `TAKES_NO_PACKAGE` refused a line the shipped tree may legitimately contain. Two coordinate systems in
  // one small pair of functions, which is the defect the classifier's `namesACommand` had.
  const head = headIndexOf(tokens);
  if (head === undefined) return [];
  const out: string[] = [];
  // No break at an opaque flag. `OPAQUE_AFTER` stops `invocationOf` looking for a PROGRAM NAME past a
  // payload; counting a command's arguments is a different question, and stopping early made
  // `npm install -e foo left-pad` report zero bare arguments.
  for (let i = head + 1; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    if (!token.startsWith("-")) out.push(token);
  }
  return out;
}

/**
 * The invocations in this body that the allowlist refuses.
 *
 * One definition, used by the story's assertion and by the corpus that falsifies it. Round 10 found
 * three hardcoded file lists in a sibling guard maintained independently of each other; two copies of
 * an allowlist is the same defect one size smaller.
 */
export function refusals(body: string): string[] {
  const out: string[] = [];
  for (const { invocation, command } of resolvedCommands(body)) {
    if (invocation.startsWith("<unreadable>")) {
      out.push(invocation);
      continue;
    }
    const program = invocation.split(" ")[0] ?? "";
    // A removed substitution is part of the command, and nothing here runs it — so the command cannot be
    // resolved UNLESS its program is one whose arguments cannot reach a build. That is exactly what the
    // by-name list means, and the distinction matters: the shipped tree writes
    // `if [ "$(git rev-parse --is-shallow-repository)" = "true" ]`, where the substitution is an argument
    // to `[`, while `node $(echo build.mjs)` is a substitution deciding WHICH `node` invocation runs.
    if (command.includes(SUBSTITUTION) && !HARMLESS_PROGRAMS.has(program)) {
      out.push(
        `<unreadable substitution> ${command.replaceAll(SUBSTITUTION, "$(…)").slice(0, 60)}`,
      );
      continue;
    }
    if (!HARMLESS_PROGRAMS.has(program) && !ALLOWED_INVOCATIONS.has(invocation)) {
      out.push(invocation);
      continue;
    }
    const tokens = tokensOf(command);
    // A command's INPUT is part of what it runs. `node` reads a program from its stdin, so
    // `echo "<javascript>" | node`, `<payload node` and `<<<'<javascript>' node` all run code that no
    // argument carries. Only a program whose arguments cannot reach a build may be fed.
    if (tokens.some((token) => /^\d*<{1,3}/.test(token)) && !HARMLESS_PROGRAMS.has(program)) {
      out.push(`<reads stdin> ${invocation}`);
      continue;
    }
    // A write is an effect this scanner used to have no model of at all: `echo '{…}' > package.json`
    // is an allowed `echo`, and the file it creates is executed by the allowed install that follows.
    let wrote = false;
    for (let k = 0; k < tokens.length; k += 1) {
      const token = tokens[k] ?? "";
      if (!/^\d*>{1,2}&?$|^\d*>{1,2}&?[^>]/.test(token)) continue;
      const glued = token.replace(/^\d*>{1,2}&?/, "");
      const target = glued !== "" ? glued : (tokens[k + 1] ?? "");
      if (!ALLOWED_REDIRECT_TARGETS.has(target)) {
        out.push(`<writes> ${target} :: ${command.slice(0, 40)}`);
        wrote = true;
      }
    }
    if (wrote) continue;
    // Flags, for a program that could otherwise build.
    if (ALLOWED_INVOCATIONS.has(invocation)) {
      const allowed = ALLOWED_FLAGS.get(invocation) ?? new Set<string>();
      const start = headIndexOf(tokens) ?? 0;
      let unenumerated = false;
      for (let k = start + 1; k < tokens.length; k += 1) {
        const token = tokens[k] ?? "";
        if (!token.startsWith("-") || token === "-" || token === "--") continue;
        const name = token.split("=")[0] ?? token;
        if (!allowed.has(name)) {
          out.push(`${invocation} + unenumerated flag ${name}`);
          unenumerated = true;
        }
        if (OPAQUE_AFTER.has(token)) break;
      }
      if (unenumerated) continue;
    }
    // **`node` is allowed ONLY as an enumerated `-e` payload**, and the inversion is the point. A payload
    // is CODE: round 12 ran `node -e "require('child_process').execSync('pnpm build')"` straight through,
    // and enumerating the payloads refuses every one nobody wrote down — including the ones nobody has
    // thought of, which a denylist of suspicious substrings could not. `ALLOWED_FLAGS` then closed the
    // spellings that carry code by another name (`--eval=`, `-p`, `--import`, `--run`).
    //
    // But a `node` with NO flag carries code too: it reads its script from stdin, and the absence of an
    // argument is not the absence of a program. So the missing `-e` is itself the refusal, which puts
    // `node` where every other entry on the invocation list already is — allowed as an exact invocation
    // rather than by name — and stops the next unnamed flag from arriving through the same hole.
    if (program === "node") {
      const eval_at = tokens.indexOf("-e");
      if (eval_at === -1) {
        out.push("node without -e (it would read its program from stdin)");
        continue;
      }
      const payload = tokens.slice(eval_at + 1).join(" ");
      if (!ALLOWED_NODE_PAYLOADS.has(payloadDigest(payload))) {
        out.push(`node -e <payload ${payloadDigest(payload).slice(0, 12)}…>`);
        continue;
      }
    }
    // The two-token prefix's blind spot, closed where a third token changes the act.
    if (TAKES_NO_PACKAGE.has(invocation) && bareArgumentsOf(command).length > 1) {
      out.push(`${invocation} + ${bareArgumentsOf(command).slice(1).join(" ")}`);
    }
  }
  return out;
}
