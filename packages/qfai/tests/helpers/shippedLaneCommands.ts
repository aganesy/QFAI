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
    // A substitution is scanned on its own terms, inside or outside quotes. THREE spellings, because
    // the shell has three and the previous version entered one: `$( … )`, the backtick, and process
    // substitution `<( … )` / `>( … )`. Round 11 measured all three: `echo ` npx tsup `` and
    // `grep -q x <(npx tsup)` both ran a real build while `$(npx tsup)` was correctly refused, so two
    // spellings of one shell feature got opposite verdicts.
    if (ch === "$" && body[i + 1] === "(" && quote !== "'") {
      const close = matchingParen(body, i + 1);
      out.push(...commandsOf(body.slice(i + 2, close)));
      i = close;
      continue;
    }
    if ((ch === "<" || ch === ">") && body[i + 1] === "(" && quote !== "'") {
      const close = matchingParen(body, i + 1);
      out.push(...commandsOf(body.slice(i + 2, close)));
      i = close;
      continue;
    }
    if (ch === "`" && quote !== "'") {
      const close = body.indexOf("`", i + 1);
      const end = close === -1 ? body.length : close;
      out.push(...commandsOf(body.slice(i + 1, end)));
      i = end;
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
    // A comment starts only at the beginning of a WORD. bash runs `echo a#b && npx tsup`; the
    // previous version dropped the rest of the line at the `#` and the build ran unseen.
    if (ch === "#" && (i === 0 || /[\s;&|(]/.test(body[i - 1] ?? " "))) {
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
      for (let j = i + 1; j < body.length; j += 1) {
        const ahead = body[j] ?? "";
        if (ahead === ")") return true;
        if (ahead === ";" || ahead === "\n" || ahead === "(") return false;
      }
      return false;
    };
    if (ch === ";" || (ch === "|" && !isAlternation()) || ch === "&" || ch === "\n") {
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
export function invocationOf(command: string): string | typeof NOTHING | typeof UNREADABLE {
  const tokens = tokensOf(command);
  let i = 0;
  // The two skips INTERLEAVE. Running the assignment skip once and then the keyword skip once left
  // `while IFS= read -r changed_path` — the shipped tree's own line — with `IFS=` as its head, because
  // the assignment sits after the keyword and the assignment pass had already finished.
  for (;;) {
    const token = tokens[i] ?? "";
    if (i >= tokens.length) break;
    if (/^[A-Za-z_]\w*=/.test(token) || token.startsWith(">") || token.startsWith("<")) {
      i += 1;
      continue;
    }
    // `for` and `case` introduce a word list rather than a command, so they terminate; `do` and `then`
    // resume, which is why the prefixes are skipped rather than stopped at.
    if (COMMAND_PREFIXES.has(token)) {
      i += 1;
      continue;
    }
    if (token === "for" || token === "case" || token === "select") return NOTHING;
    break;
  }
  const head = tokens[i];
  if (head === undefined || TERMINATORS.has(head)) return NOTHING;
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
  if (/^[A-Za-z_]\w*=/.test(head) && tokens.length === i + 1) return NOTHING;
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
    if (invocation === NOTHING) continue;
    if (invocation === UNREADABLE) {
      // Reported as the command itself, so a refusal names what a reader has to look at.
      out.push(`<unreadable> ${command.slice(0, 60)}`);
      continue;
    }
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
  // `[`, `[[` and `test` evaluate a condition and run nothing. They are here rather than among the
  // keywords because they ARE programs, and the shipped tree uses `[ -f package.json ]`.
  "[",
  "[[",
  "test",
  "false",
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

/** The non-flag arguments a command carries after its program. */
function bareArgumentsOf(command: string): string[] {
  const tokens = tokensOf(command);
  const out: string[] = [];
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    if (OPAQUE_AFTER.has(token)) break;
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
  const local = localFunctionsOf(body);
  for (const command of commandsOf(body)) {
    const invocation = invocationOf(command);
    if (invocation === NOTHING) continue;
    if (invocation === UNREADABLE) {
      out.push(`<unreadable> ${command.slice(0, 60)}`);
      continue;
    }
    const program = invocation.split(" ")[0] ?? "";
    if (local.has(program)) continue;
    if (!HARMLESS_PROGRAMS.has(program) && !ALLOWED_INVOCATIONS.has(invocation)) {
      out.push(invocation);
      continue;
    }
    // A payload is CODE, and `node` is allowed only because the shipped tree needs one `node -e`. Round
    // 12 ran `node -e "require('child_process').execSync('pnpm build')"` straight through. Enumerating
    // the payloads refuses every one nobody wrote down, including the ones nobody has thought of, which
    // a denylist of suspicious substrings could not.
    const tokens = tokensOf(command);
    const eval_at = tokens.findIndex((token) => token === "-e" || token === "--eval");
    if (program === "node" && eval_at !== -1) {
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
