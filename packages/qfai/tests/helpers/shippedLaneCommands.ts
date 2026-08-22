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
  // Where a here-document's data ends, once one has been opened on the current line. The skip has to
  // wait for the newline: everything between the delimiter and it is still command text.
  let heredocEnd: number | undefined;

  // The last CODE character before `at`, spaces and tabs skipped.
  //
  // **Three decisions in this walk were reading the raw text**, and `codeMask` — computed at the top of
  // this function, whose own comment says a second weaker parse of the same text was retired — knew
  // better than all three. An ESCAPED `>` decided them: `echo a\>|npx tsup` pipes a build into `npx
  // tsup` in bash, while the noclobber rule read the `\>` as an operator and joined the two commands
  // into one `echo`. Seven spellings ran a real build that way, confirmed by executing them.
  const lastCode = (at: number): string => {
    for (let j = at - 1; j >= 0; j -= 1) {
      if (!mask[j]) continue;
      if (/[ \t]/.test(body[j] ?? "")) continue;
      return body[j] ?? "";
    }
    return "";
  };

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
    // A here-document's BODY is data, not commands. `cat <<'EOF' … npx tsup … EOF` prints a script;
    // reading its lines as commands refused the script the lane was printing, which is a refusal
    // nobody can act on because there is nothing there to fix. The delimiter is consumed with the
    // operator so the `<<` still reaches `redirectionsOf` and the stdin rule still fires.
    //
    // **Only the DATA is skipped.** The first version of this jumped from the operator to the end of the
    // here-document, discarding the rest of the operator's own line with it — so `read x <<EOF && npx
    // tsup` executed the build and `read x <<EOF > evil.cjs` created the file, both reporting nothing.
    // `cat <<EOF >> "$GITHUB_OUTPUT"` is GitHub's documented multiline-output idiom, so a lane reaching
    // for it is ordinary rather than adversarial. The skip is deferred to the newline instead.
    // `body[i - 1] !== "<"` because this matched the SECOND `<` of a here-STRING: `done <<< "$changed"`
    // then read `$changed` as a here-document delimiter, and once a missing closer became a refusal
    // rather than a licence, the shipped tree refused its own line. A here-string is one operator.
    if (
      ch === "<" &&
      body[i + 1] === "<" &&
      body[i + 2] !== "<" &&
      body[i - 1] !== "<" &&
      quote === ""
    ) {
      let k = i + 2;
      if (body[k] === "-") k += 1;
      while (k < body.length && /[ \t]/.test(body[k] ?? "")) k += 1;
      let delimiter = "";
      let delimiterQuote = "";
      for (; k < body.length; k += 1) {
        const next = body[k] ?? "";
        if (delimiterQuote !== "") {
          if (next === delimiterQuote) delimiterQuote = "";
          else delimiter += next;
          continue;
        }
        if (next === '"' || next === "'") {
          delimiterQuote = next;
          continue;
        }
        // `<<\\EOF` is bash's THIRD spelling of a quoted delimiter, beside `<<'EOF'` and `<<""EOF""`,
        // and the delimiter it names is `EOF`. This walk kept the backslash, so the closer it built
        // never matched — and the rule below then treated the whole rest of the body as data.
        if (next === "\\") {
          delimiter += body[k + 1] ?? "";
          k += 1;
          continue;
        }
        if (/[\s;&|)]/.test(next)) break;
        delimiter += next;
      }
      if (delimiter !== "") {
        const lineEnd = body.indexOf("\n", k);
        if (lineEnd !== -1) {
          const rest = body.slice(lineEnd + 1);
          // Every regex metacharacter, escaped. The first version wrote this class as
          // `[.*+?^${}()|[\\]\\\\]`, where the `\\]` closes the class rather than escaping a bracket —
          // so it escaped nothing, and a delimiter carrying `+` or `$` made the closer never match and
          // swallowed the rest of the body. Round 16 measured it by extracting the class from this
          // file's own bytes, which is the only way to see it: reading the line looks right.
          const quoted = delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const closer = new RegExp(`^[ \\t]*${quoted}[ \\t]*$`, "m");
          const at = closer.exec(rest);
          // **A missing closer is a refusal, not a licence.** The first version answered one by
          // discarding everything after the operator as data — so any construct that stopped the
          // closer matching hid the whole rest of the body, which is fail-open in the one place this
          // file exists to be fail-closed. A delimiter the scanner cannot pair is a delimiter it
          // cannot read.
          if (at === null) out.push(`unterminated-here-document ${delimiter}`);
          current += body.slice(i, k);
          heredocEnd = lineEnd + (at === null ? rest.length : at.index + at[0].length);
          i = k - 1;
          continue;
        }
      }
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
    // ANSI-C quoting, which neither walk modelled. `$'a\\''` is the two characters `a'`: the escape is
    // processed INSIDE the quote, so the `'` after the backslash does not close it. Read as an
    // ordinary single quote the parity inverts and the separator after it is swallowed — round 17
    // ran a build past this twice that way.
    if (ch === "$" && body[i + 1] === "'") {
      current += ch + (body[i + 1] ?? "");
      let j = i + 2;
      for (; j < body.length; j += 1) {
        const next = body[j] ?? "";
        current += next;
        if (next === "\\") {
          current += body[j + 1] ?? "";
          j += 1;
          continue;
        }
        if (next === "'") break;
      }
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    // A comment starts only at the beginning of a WORD. bash runs `echo a#b && npx tsup`; the
    // previous version dropped the rest of the line at the `#` and the build ran unseen. It read the
    // RAW previous character until round 16, so an escaped space made `echo a\\ #b && npx tsup`
    // start a comment where bash starts none. **`lastCode` was the wrong instrument**: it skips
    // spaces, so an ordinary trailing comment stopped being one and `pnpm install --frozen-lockfile
    // # keep in sync` reported a program called `not use`. What the rule needs is the raw previous
    // character AND the mask's verdict on it: a separator that is code starts a comment, an escaped
    // space does not.
    if (ch === "#" && (i === 0 || (mask[i - 1] === true && /[\s;&|(]/.test(body[i - 1] ?? " ")))) {
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
    // `>|` is bash's noclobber override, one operator. Splitting it at the `|` left a fragment whose
    // whole content was `>`, which the write scan then reported as a write to the empty string.
    const clobber = ch === "|" && lastCode(i) === ">";
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
    // An `&` is a background operator — unless it belongs to a redirection. `>&2` duplicates a
    // descriptor and `&>file` redirects both streams, and splitting inside either left a fragment whose
    // entire content was a redirection with no command: `echo hi >&2` became `echo hi >` plus `2`, and
    // the write scan then reported a write to a file named `2` with an empty target. One character,
    // three meanings, and the shipped tree will reach for the second the first time a lane wants a
    // diagnostic off stdout.
    const redirectAmp =
      ch === "&" && ((body[i + 1] === ">" && mask[i + 1] === true) || /[<>]/.test(lastCode(i)));
    if (
      ch === ";" ||
      (ch === "|" && !clobber && !isAlternation()) ||
      (ch === "&" && !redirectAmp) ||
      ch === "\n"
    ) {
      const piped = ch === "|";
      flush();
      // The data of any here-document opened on this line is skipped HERE, after the line's own
      // commands have been read.
      if (ch === "\n" && heredocEnd !== undefined) {
        i = heredocEnd;
        heredocEnd = undefined;
      }
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
      // The newline that ENDS a comment is a command separator and stays code. Marking it with the
      // comment made the next line's `#` follow a non-code character, so a comment after a comment
      // stopped being one — five shipped bodies refused their own prose as commands. It also left
      // the alternation lookahead, which scans for a newline at a code position, unable to see one.
      if (ch === "\n") {
        inComment = false;
        continue;
      }
      mask[i] = false;
      continue;
    }
    // A SUBSTITUTION restarts the quote state, and this walk had no model of one. Round 17 measured the
    // consequence: `"$(echo ")")"` puts a `)` on a code position, the alternation lookahead reads it as a
    // case arm closing, and a real pipe stops splitting — so `echo a | npx tsup "$(echo ")")"` ran a
    // build with the scan clean, while the same line without the inner quote was correctly refused. One
    // `"` decided the verdict.
    //
    // `commandsOf` has always entered substitutions on their own terms; this is the same repair in the
    // other walk, and the disagreement between the two is what the finding was.
    if (quote !== "'" && ((ch === "$" && body[i + 1] === "(") || ch === "<" || ch === ">")) {
      const opensAt = ch === "$" ? i + 1 : i + 1;
      if (body[opensAt] === "(") {
        const close = matchingParen(body, opensAt);
        const inner = codeMask(body.slice(opensAt + 1, close));
        mask[i] = false;
        mask[opensAt] = false;
        for (let j = 0; j < inner.length; j += 1) mask[opensAt + 1 + j] = inner[j] ?? true;
        if (close < body.length) mask[close] = false;
        i = close;
        continue;
      }
    }
    if (ch === "`" && quote !== "'") {
      const close = body.indexOf("`", i + 1);
      const end = close === -1 ? body.length : close;
      const inner = codeMask(body.slice(i + 1, end));
      mask[i] = false;
      for (let j = 0; j < inner.length; j += 1) mask[i + 1 + j] = inner[j] ?? true;
      if (close !== -1) mask[close] = false;
      i = end;
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
    // ANSI-C quoting. `$'…'` processes backslash escapes inside, so `$'a\''` is the two characters `a'`
    // and the quote does NOT end at that `'`. Read as an ordinary single quote — where a backslash is
    // literal — the parity inverts and the rest of the line joins the string: round 17 ran
    // `echo $'a\'' | npx tsup` and `… && npx tsup` past both walks that way.
    if (ch === "$" && body[i + 1] === "'") {
      mask[i] = false;
      let j = i + 1;
      mask[j] = false;
      for (j += 1; j < body.length; j += 1) {
        mask[j] = false;
        if (body[j] === "\\") {
          if (j + 1 < body.length) mask[j + 1] = false;
          j += 1;
          continue;
        }
        if (body[j] === "'") break;
      }
      i = j;
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
/**
 * Where a command's program token is, after every prefix has been stepped over.
 *
 * **One walk, and the reason it is one is a measured escape.** This used to answer `undefined` for a
 * `case` head while `invocationOf` skipped past the `in` and read the arm — so
 * `case x in *) npm install ./evil --no-audit --no-fund ;; esac` had a PROGRAM by one function and no
 * ARGUMENTS by the other, and `TAKES_NO_PACKAGE` saw an install carrying nothing. The bare form of the
 * same line is refused. That is the two-coordinate-systems defect this file's own docstring claims to
 * have removed: it was removed at one call site and left at the other.
 */
function headIndexOf(tokens: readonly string[]): number | undefined {
  let i = 0;
  for (;;) {
    if (i >= tokens.length) return undefined;
    const token = tokens[i] ?? "";
    // Assignments only. A redirection is gone before this function is called, and reading token
    // shapes here is what made `2>&1 npm ci` resolve to a program called `2>&1`.
    if (/^[A-Za-z_]\w*=/.test(token)) {
      i += 1;
      continue;
    }
    if (COMMAND_PREFIXES.has(token)) {
      i += 1;
      continue;
    }
    // `for` and `select` introduce a word LIST and their bodies arrive in a later segment, so they
    // have no head here. `select` was grouped with `case` until round 15 measured it:
    // `select x in a b` refused a program called `a`, because only `case` puts a command after its
    // `in` in the same segment.
    if (token === "for" || token === "select") return undefined;
    if (token === "case") {
      const at = tokens.indexOf("in", i + 1);
      if (at === -1) return undefined;
      i = at + 1;
      continue;
    }
    // A `case` pattern ARM and a function-definition HEADER are prefixes too, and `invocationOf`
    // recurses past both. Stepping over them keeps the two answers on one set of coordinates.
    if (token.endsWith("()") || (token.endsWith(")") && !token.startsWith("("))) {
      i += 1;
      continue;
    }
    return i;
  }
}

export function invocationOf(command: string): string | typeof NOTHING | typeof UNREADABLE {
  const tokens = tokensOf(withoutRedirections(command));
  const prefixNames: string[] = [];
  let i = 0;
  // The two skips INTERLEAVE. Running the assignment skip once and then the keyword skip once left
  // `while IFS= read -r changed_path` — the shipped tree's own line — with `IFS=` as its head, because
  // the assignment sits after the keyword and the assignment pass had already finished.
  for (;;) {
    const token = tokens[i] ?? "";
    if (i >= tokens.length) break;
    if (/^[A-Za-z_]\w*=/.test(token)) {
      // An assignment whose VALUE names a program is a way to run one: `GIT_EXTERNAL_DIFF=./ext-diff.sh
      // git diff --ext-diff HEAD` runs an arbitrary script, and skipping the prefix made it invisible.
      // The prefix NAME must be enumerated: `ALLOWED_ENV_PREFIXES` holds `IFS` and nothing else, so
      // `NODE_ENV=production npm ci` and `declared=x npm ci` are both unreadable rather than
      // allowed. Two comments here said the opposite for three rounds — measured by round 15 —
      // and the shipped tree stays readable because its only prefixed command is `IFS= read`,
      // while its `declared=$( … )` assignment carries no command after it and invokes nothing.
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
    if (token === "for" || token === "select") return NOTHING;
    if (token === "case") {
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

/**
 * Each shipped action at the exact commit it is pinned to.
 *
 * `ALLOWED_ACTIONS` holds NAMES, and a separate assertion required every `uses:` to carry a 40-hex SHA
 * rather than a tag. Neither reads the SHA's value, so round 14 replaced one with forty zeros and the
 * whole suite stayed green — a pin whose value nothing checks is a shape, and the shape was never the
 * point. Bumping an action is now a two-line edit in two files, which is the visible-in-review property
 * `ALLOWED_STEP_BODIES` is built on.
 */
export const ALLOWED_ACTION_COMMITS: ReadonlyMap<string, string> = new Map([
  ["actions/checkout", "11d5960a326750d5838078e36cf38b85af677262"],
  ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
  ["pnpm/action-setup", "fc06bc1257f339d1d5d8b3a19a8cae5388b55320"],
]);

/**
 * Everything a shipped workflow and each of its jobs says, apart from the steps.
 *
 * **Four execution channels in four rounds were the same finding**: a key is on the allowed list, and
 * until something reads its VALUE, appearing is all that is checked. `defaults.run.working-directory`,
 * a second `setup-node`, `on:` with `permissions:`, and `needs:` with `QFAI_NEEDS_JSON` were found one
 * at a time, each by a reviewer, each after the previous one was closed by naming it.
 *
 * So this stops naming them. A workflow is pinned as everything it says except its jobs, and a job as
 * everything it says except its steps — which covers `if`, `outputs`, `concurrency`,
 * `timeout-minutes`, `runs-on`, `permissions`, `needs` and whatever GitHub adds, in one place. The
 * steps are excluded because they are pinned already, body by body and action by action.
 *
 * Stored as canonical JSON rather than as a digest, so a failure shows a reader what moved. An `if:`
 * flipped to `false` silently disables a lane, and a lane that never runs is a lane that never fails:
 * that is the shape of the next one of these, and it is closed here before it is planted.
 */
export const ALLOWED_WORKFLOW_SHAPE: ReadonlyMap<string, string> = new Map([
  [
    "qfai-tests.yml",
    '{"name":"qfai tests","on":{"push":{"branches":["main","master"]},"pull_request":null},"concurrency":{"group":"${{ github.workflow }}-${{ github.ref }}","cancel-in-progress":true}}',
  ],
  [
    "qfai-validate.yml",
    '{"name":"qfai validate","on":{"push":{"branches":["main","master"]},"pull_request":null},"concurrency":{"group":"${{ github.workflow }}-${{ github.ref }}","cancel-in-progress":true}}',
  ],
]);

export const ALLOWED_JOB_SHAPE: ReadonlyMap<string, string> = new Map([
  [
    "qfai-tests.yml#detection",
    '{"name":"change detection","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":5,"outputs":{"lanes":"${{ steps.diff.outputs.lanes }}","scripts":"${{ steps.scripts.outputs.scripts }}"}}',
  ],
  [
    "qfai-tests.yml#unit",
    '{"name":"unit tests","needs":"detection","if":"${{ contains(needs.detection.outputs.scripts, \'unit\') && contains(needs.detection.outputs.lanes, \'unit\') }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
  [
    "qfai-tests.yml#component",
    '{"name":"component tests","needs":"detection","if":"${{ contains(needs.detection.outputs.scripts, \'component\') && contains(needs.detection.outputs.lanes, \'component\') }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
  [
    "qfai-tests.yml#integration",
    '{"name":"integration tests","needs":"detection","if":"${{ contains(needs.detection.outputs.scripts, \'integration\') && contains(needs.detection.outputs.lanes, \'integration\') }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
  [
    "qfai-tests.yml#api",
    '{"name":"api tests","needs":"detection","if":"${{ contains(needs.detection.outputs.scripts, \'api\') && contains(needs.detection.outputs.lanes, \'api\') }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
  [
    "qfai-tests.yml#e2e",
    '{"name":"e2e tests","needs":"detection","if":"${{ contains(needs.detection.outputs.scripts, \'e2e\') && contains(needs.detection.outputs.lanes, \'e2e\') }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
  [
    "qfai-tests.yml#verdict",
    '{"name":"verdict","needs":["detection","unit","component","integration","api","e2e"],"if":"${{ always() }}","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{},"timeout-minutes":5}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"qfai validate (full profile, fail on error)","runs-on":"${{ vars.QFAI_CI_RUNNER || \'ubuntu-latest\' }}","permissions":{"contents":"read"},"timeout-minutes":10}',
  ],
]);

/**
 * Every shipped step, in the job it belongs to and the order the file runs them, with its `run:`
 * body reduced to a digest.
 *
 * The job shape above stops at `steps`, and a step has values of its own that nothing read: `if:`
 * skips the step when it is false, and `id:` is what a later `steps.<id>.outputs` reference resolves
 * through. A step that never runs is a step that never fails, one level below the lane.
 *
 * This replaces the separate body and action-step lists rather than sitting beside them: it contains
 * both — the digest, the location, the order, the action, its inputs — and two lists saying one thing
 * is the defect this file has found at four sizes. The named allowlists that remain (`ALLOWED_SHELLS`,
 * `ALLOWED_ACTION_INPUTS`, `ALLOWED_STEP_ENV`, the key sets) are a different claim and are kept: this
 * one says the document is not the reviewed one, and they say a KIND of thing is never allowed
 * anywhere — which is what `refusals()` and the key walk need, and what gives a reader a message
 * naming the rule rather than a diff of two JSON blobs.
 */
export const ALLOWED_STEP_SHAPE: ReadonlyArray<readonly [string, string]> = [
  [
    "qfai-tests.yml#detection",
    '{"name":"Checkout with full history via actions/checkout 4.4.0","uses":"actions/checkout@11d5960a326750d5838078e36cf38b85af677262","with":{"persist-credentials":false,"fetch-depth":0}}',
  ],
  [
    "qfai-tests.yml#detection",
    '{"name":"Select lanes from the name-only diff","id":"diff","env":{"QFAI_BASE_REF":"${{ github.event.pull_request.base.sha || github.event.before }}"},"shell":"bash","run":"<body 1c69b8c2bf4a16c4a82e8f737b0bfd6e6122a76cc96bc2426e8b6583a474e5a7>"}',
  ],
  [
    "qfai-tests.yml#detection",
    '{"name":"Probe layer-named test scripts","id":"scripts","shell":"bash","run":"<body 678c2db6a736f883ce9a17182e0e8d8d5a9de25dd9e16c56dfcf8e6e5062c79e>"}',
  ],
  [
    "qfai-tests.yml#unit",
    '{"name":"unit lane placeholder","run":"<body 09b8ac75ee3ef6fe71dbc5e38e2bebc7207b7d1a358bec40bc1229fd2dea8523>"}',
  ],
  [
    "qfai-tests.yml#component",
    '{"name":"component lane placeholder","run":"<body c6497f24366cb07fac4e65f2fd95bb95926520a7894adb96c92643f719f5d9f9>"}',
  ],
  [
    "qfai-tests.yml#integration",
    '{"name":"integration lane placeholder","run":"<body 4defbb1b5a2ede5b36495e4747fc1220739ffd9a16957add74b1cdc887e786df>"}',
  ],
  [
    "qfai-tests.yml#api",
    '{"name":"api lane placeholder","run":"<body 3af03c5087ed07f3066fb114d17f61d850449cf9073dc78dc98617cf668944ea>"}',
  ],
  [
    "qfai-tests.yml#e2e",
    '{"name":"e2e lane placeholder","run":"<body b2382d77e17d5940626aa1e9c306fb74570955930472497aa4a473aa57e3bc93>"}',
  ],
  [
    "qfai-tests.yml#verdict",
    '{"name":"Aggregate lane results (green on skip)","env":{"QFAI_NEEDS_JSON":"${{ toJSON(needs) }}"},"shell":"bash","run":"<body 8122e6678fcbb6ab8f6e4002e484b41249958de894690ded4cc8258f36692d20>"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Checkout via actions/checkout 4.4.0","uses":"actions/checkout@11d5960a326750d5838078e36cf38b85af677262","with":{"persist-credentials":false}}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Resolve the package manager (pnpm route fails closed)","id":"package-manager","shell":"bash","run":"<body 0978110b439e141fb9fcf5b90c35de8ebbcfdf50da6181c2f74c1435702f4bbf>"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Set up pnpm via pnpm/action-setup 4.4.0 (if project uses pnpm)","if":"${{ hashFiles(\'pnpm-lock.yaml\') != \'\' }}","uses":"pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Resolve the Node version (adopter file wins, else fall open)","id":"node-version","shell":"bash","run":"<body 49e44c24d0bd88a0bc5a9a720970ff59b5f775a14f36b53a0f45585714c67ece>"}',
  ],
  [
    "qfai-validate.yml#validate",
    "{\"name\":\"Set up Node via actions/setup-node 4.4.0\",\"uses\":\"actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020\",\"with\":{\"node-version\":\"${{ steps.node-version.outputs.version }}\",\"cache\":\"${{ hashFiles('pnpm-lock.yaml') != '' && 'pnpm' || (hashFiles('yarn.lock') != '' && 'yarn' || (hashFiles('package-lock.json') != '' && 'npm' || '')) }}\"}}",
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Install dependencies (lockfile-aware)","shell":"bash","run":"<body d7f6e8d3b5456c962a0062859324f37b2ffc1c3c2b136b180b3ed8b54bee3ea1>"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"qfai validate","run":"<body cafa0558d597d81a2b477a24bf245ceb02e38e714767bde76bf0ff0918dd31d9>"}',
  ],
];

/**
 * The keys a shipped workflow, job and step may carry.
 *
 * **Enumerated because the dangerous ones cannot be.** Four rounds closed four execution channels one
 * at a time — a job-level `uses:`, a step `shell:`, `defaults.run.shell`, an `env:` — and round 14
 * closed the fifth by planting `defaults.run.working-directory: ./ci-primer`, which runs a
 * digest-approved install inside a tree of the planter's choosing and executes that tree's lifecycle
 * scripts. It is the sibling key of the one the previous repair opened, and naming it would have left
 * `strategy`, `container`, `services`, `defaults.run.env` and whatever GitHub adds next.
 *
 * So the question is inverted here exactly as it is for programs and for bodies: these are the keys our
 * own surface uses, and anything else is refused for not being one of them. A key GitHub introduces
 * costs a spurious refusal in review rather than an open channel.
 */
export const ALLOWED_WORKFLOW_KEYS: ReadonlySet<string> = new Set([
  "concurrency",
  "jobs",
  "name",
  "on",
]);

export const ALLOWED_JOB_KEYS: ReadonlySet<string> = new Set([
  "if",
  "name",
  "needs",
  "outputs",
  "permissions",
  "runs-on",
  "steps",
  "timeout-minutes",
]);

export const ALLOWED_STEP_KEYS: ReadonlySet<string> = new Set([
  "env",
  "id",
  "if",
  "name",
  "run",
  "shell",
  "uses",
  "with",
]);
/**
 * The inputs each shipped action may be given, per ACTION.
 *
 * One flat set across all three until round 15, so each action accepted the other two's inputs — a
 * `node-version` on a checkout, a `fetch-depth` on `setup-node`. Neither does anything today, and that is
 * the argument for enumerating rather than for guessing which cross-product is harmless: the shipped set
 * is four entries across three actions and is ours to state exactly.
 */
export const ALLOWED_ACTION_INPUTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["actions/checkout", new Set(["fetch-depth", "persist-credentials"])],
  ["actions/setup-node", new Set(["cache", "node-version"])],
  ["pnpm/action-setup", new Set<string>()],
]);

/**
 * The `node -e` payloads a shipped lane may carry, as sha256 of their whitespace-collapsed text.
 *
 * Hashes rather than the text itself, because the two payloads are 630 and 1039 characters of multi-line
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
  // `qfai-tests.yml#detection` — reads `scripts` out of `package.json`. 630 characters.
  "7f72970abbe4e9a0fe876e3e0bd57468fc86bab5e3a3cd5076f09fb3653292cc",
  // `qfai-validate.yml#validate` — reads `packageManager` out of `package.json`. 1039 characters.
  "9cc40c1d1704f836361c2a47e780e0fa393307a55f01c129f2da50fc97f57230",
]);

/**
 * The payload of a `node -e`, hashed. **Nothing is normalized**, for the reason `bodyDigest` gives
 * three times over and one this payload adds: a `//` line comment is terminated by a NEWLINE, and
 * both enumerated payloads are full of them. Collapsing whitespace moves the statement after the last
 * comment line INSIDE the comment, and round 15 demonstrated it against a currently enumerated
 * payload whose digest did not move — so the scan cleared a payload nobody had reviewed.
 */
export function payloadDigest(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * The digest of a step BODY, normalized only where YAML itself is free to vary.
 *
 * Deliberately not `payloadDigest`. Collapsing every whitespace run to one space is right for a
 * `node -e` payload, which is a single argument — and wrong for a body, because it erases the
 * difference between a space and a NEWLINE. A newline inside `$( … )` is the difference between one
 * command and two: `$(git rev-parse --is-shallow-repository)` and `$(git` + `rev-parse
 * --is-shallow-repository)` collapse to the same string, and the shipped tree contains that exact
 * substitution. Two bodies that behave differently must not share a digest.
 *
 * **Nothing is normalized, and that is the third answer this function has given.** Each of the first
 * two erased a difference bash acts on, and each was found by someone attacking the gate rather than
 * reading it: collapsing whitespace merged one command with two inside `$( … )`; stripping trailing
 * whitespace merged a line continuation with its own end. Folding `\r\n` was kept through round 14
 * on the ground that it was unreachable — measured on BLOCK scalars, where the parser folds line
 * breaks itself. A quoted FLOW scalar delivers a live CR, a CR before the newline ends a continuation
 * the same way a space does, and round 15 produced the pair: one digest, and `refusals()` returning
 * `[]` for one body and refusing a bundler in the other.
 *
 * Three attempts to be helpful, three collisions. The bytes are the identity. A whitespace-only edit
 * to a shipped body now moves its digest, which costs a review rather than hiding a behaviour, and
 * block indentation still needs no handling because YAML removes it before this function sees it.
 */
export function bodyDigest(body: string): string {
  // **Nothing is normalized.** Three collisions were found in this gate, one per attempt to be
  // helpful, and each erased a difference that changes what bash does:
  //
  //   collapsing whitespace     a newline inside `$( … )` is one command or two
  //   stripping trailing space  a space after a continuation ends the continuation
  //   folding CRLF to LF        a CR before the newline ends it too
  //
  // The third was recorded as unreachable on a measurement of BLOCK scalars, where the parser folds
  // line breaks. A quoted FLOW scalar carries a live CR straight through, and round 15 demonstrated
  // the pair: one body refuses `npx tsup` and the other returns `[]`, on one digest. Measuring the
  // reachable case and concluding about all cases is the class this record catalogues.
  //
  // So the rule is now the one rule that has no counter-example: the bytes are the identity. What it
  // costs is that a whitespace-only edit to a shipped body moves its digest, which is a review
  // someone has to do rather than a behaviour that slips past one.
  return createHash("sha256").update(body).digest("hex");
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
export const ALLOWED_STEP_ENV: ReadonlyMap<string, string> = new Map([
  ["QFAI_BASE_REF", "${{ github.event.pull_request.base.sha || github.event.before }}"],
  ["QFAI_NEEDS_JSON", "${{ toJSON(needs) }}"],
]);

/** Where a shipped command may write. A redirect creates a file, and a created file can be code. */
const ALLOWED_REDIRECT_TARGETS: ReadonlySet<string> = new Set(["$GITHUB_OUTPUT", "/dev/null"]);

/** One redirection, with the span it occupies so a reader can remove exactly it. */
interface Redirection {
  readonly writes: boolean;
  readonly reads: boolean;
  readonly target: string;
  readonly source: string;
  readonly duplicates: boolean;
  readonly start: number;
  readonly end: number;
}

/**
 * Every redirection this command performs, found by CHARACTER rather than by token shape.
 *
 * The two scans this replaces each asked whether a TOKEN BEGAN with `>` or `<`, and a redirection
 * does not have to begin one. `echo '{…}'>package.json` writes the manifest a permitted install
 * then executes, `echo NODE_OPTIONS=--require=./evil.cjs>>$GITHUB_ENV` puts a loader into every later
 * `node`, and `printf x<payload` reads one — all three reported nothing. Removing a single space was
 * enough, which is the SIXTH time this file has been defeated by one command written two ways:
 * `--eval` and `--eval=`, `>file` and `> file`, `x >f` and `x>f`.
 *
 * So this stops reading token shapes. It walks the command with the same quote state `tokensOf`
 * uses, which is also what keeps a `>` inside a quoted string from being read as a redirection —
 * `tokensOf` strips quotes, so a token-based scan could not have told those apart even in principle.
 */
function redirectionsOf(command: string): Redirection[] {
  const found: Redirection[] = [];
  let quote = "";
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i] ?? "";
    if (ch === "\\" && quote !== "'") {
      i += 1;
      continue;
    }
    if (quote !== "") {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch !== ">" && ch !== "<") continue;
    // The operator starts at any file-descriptor digits before the arrow, so the whole of `2>&1` is
    // reported and `withoutRedirections` can remove exactly what this consumed. Reading the digits as
    // part of the following word is how `2>&1 npm ci` came to have a program called `2>&1`.
    let start = i;
    while (start > 0 && /[0-9]/.test(command[start - 1] ?? "")) start -= 1;
    if (start > 0 && command[start - 1] === "&") start -= 1;

    // Consume the operator: `>`, `>>`, `<`, `<<`, `<<<`, `<>`, `>|`, and the `&` of `>&` / `&>`.
    //
    // **The direction comes from the whole operator, not from its first character.** `<>` opens a
    // file for reading AND writing, and taking the direction from the `<` classified it as a read:
    // `printf '{…preinstall…}' 1<>package.json` followed by an enumerated install returned `[]`
    // and ran the hook, while its plain `>` twin was refused. One character of a two-character
    // operator decided a verdict, which is this file's recurring shape wearing new punctuation.
    //
    // `>|` is one operator too — bash's noclobber override — and splitting it at the `|` produced a
    // refusal naming the empty string plus a spurious second command.
    let j = i;
    let duplicates = false;
    let operator = "";
    while (j < command.length && /[<>&|]/.test(command[j] ?? "")) {
      const next = command[j] ?? "";
      if (next === "|" && !operator.includes(">")) break;
      operator += next;
      // An `&` AFTER the arrow duplicates a descriptor; an `&` before it is bash's `&>`, which is a
      // write to a file. The two are one character apart and do opposite things.
      if (next === "&") duplicates = true;
      j += 1;
    }
    const writes = operator.includes(">");
    const reads = operator.includes("<");
    while (j < command.length && /[ \t]/.test(command[j] ?? "")) j += 1;
    // Then the word it names, read with the same quote state so `> 'a b'` is one target.
    let target = "";
    let inner = "";
    for (; j < command.length; j += 1) {
      const next = command[j] ?? "";
      if (next === "\\" && inner !== "'") {
        target += command[j + 1] ?? "";
        j += 1;
        continue;
      }
      if (inner !== "") {
        if (next === inner) inner = "";
        else target += next;
        continue;
      }
      if (next === '"' || next === "'") {
        inner = next;
        continue;
      }
      if (/\s/.test(next) || next === ";") break;
      target += next;
    }
    // `${GITHUB_OUTPUT}` and `$GITHUB_OUTPUT` are one variable written two ways, and the allowlist held
    // only the second — so the braced spelling of the tree's own output file was refused. The
    // one-command-two-spellings invariant, this time in a target rather than an operator.
    const named = target.replace(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/, "$$$1");
    // `>&2` and `2>&1` duplicate a file descriptor. Nothing is created, nothing is read, and the
    // shipped tree will reach for one the first time a lane wants a diagnostic off stdout — so
    // reporting it as a write to a file named `2` spends the fail-closed budget on a refusal a
    // reader cannot act on. The budget is paid for by refusals someone reads.
    // A descriptor duplication is REPORTED with a flag rather than dropped. Dropping it left the text
    // in the command for `withoutRedirections` to miss, so `npm ci 2>&1` counted `2>&1` as a package
    // and refused itself: a suppression in one reader became a token in another.
    const duplicatesDescriptor = duplicates && /^[0-9]+-?$|^-$/.test(named);
    found.push({
      writes: writes && !duplicatesDescriptor,
      reads: reads && !duplicatesDescriptor,
      target: named,
      source: command.slice(start, j),
      duplicates: duplicatesDescriptor,
      start,
      end: j,
    });
    i = j - 1;
  }
  return found;
}

/**
 * The command with every redirection — operator and target — removed.
 *
 * A redirection is not a program and it is not an argument, and two token-shaped tests said
 * otherwise: `headIndexOf` skipped a token that STARTS with `<` or `>`, so `2>&1 npm ci` resolved to
 * a program called `2>&1`; and `bareArgumentsOf` kept any token not starting with `-`, so
 * `npm ci 2>&1` counted a redirection as a package and refused an install the shipped tree may
 * legitimately contain. Both now read a command this function has already cleaned, using the one
 * character walk that finds redirections — so nothing here can disagree with `redirectionsOf`
 * about what a redirection is, which is how the two token tests came to disagree with it.
 */
function withoutRedirections(command: string): string {
  // By OFFSET, right to left. `String.replace` takes the FIRST occurrence, which undid the
  // quote-aware scan that found the span: two identical redirections removed the same one twice,
  // and a `source` that also appears earlier as ordinary text removed the text instead. The scan
  // already knows where each one is, and using anything else here is a second answer to a question
  // it had already answered.
  let out = command;
  const spans = [...redirectionsOf(command)].sort((a, b) => b.start - a.start);
  for (const redirection of spans) {
    out = `${out.slice(0, redirection.start)} ${out.slice(redirection.end)}`;
  }
  return out;
}

/** The non-flag arguments a command carries after its program. */
function bareArgumentsOf(command: string): string[] {
  const tokens = tokensOf(withoutRedirections(command));
  // The SAME prefix walk `invocationOf` uses. Counting from index 1 assumed token 0 is the program, and
  // with an assignment prefix it is not — `IFS= read -r changed_path` yielded `["read", "-r"]`, so
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
  // **A write is scanned over EVERY command the splitter produces**, including the ones that resolve
  // to "invokes nothing". This ran over the RESOLVED commands until round 14, and `echo x&>evil.cjs`
  // splits into `echo x` and `>evil.cjs`: the second invokes nothing, so it was dropped and took its
  // write with it, while the neighbouring `echo x>evil.cjs` was caught. One command, two spellings,
  // one level up — the SPLIT disagreed with itself rather than the scan.
  //
  // Per command rather than over the raw body, because `commandsOf` is the only thing here that
  // enters a substitution on its own terms. A flat walk desynchronises on the shipped tree's own
  // `declared="$(node -e '…')"` and reads the `>` of a JavaScript arrow as a redirection.
  for (const command of commandsOf(body)) {
    for (const redirection of redirectionsOf(command)) {
      if (!redirection.writes) continue;
      if (!ALLOWED_REDIRECT_TARGETS.has(redirection.target)) {
        // A target of `` is a redirection with nothing after it, which bash rejects as a syntax
        // error. Reporting the empty string spends a refusal on something a reader cannot act on.
        const named = redirection.target === "" ? "(no target)" : redirection.target;
        out.push(`<writes> ${named} :: ${command.slice(0, 40)}`);
      }
    }
  }
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
    const redirections = redirectionsOf(command);
    // The redirections are removed before tokenizing, so a `node -e` payload cannot absorb a `>`
    // and a flag walk cannot read one as a flag. One function decides what a redirection is.
    const tokens = tokensOf(withoutRedirections(command));
    // A command's INPUT is part of what it runs. `node` reads a program from its stdin, so
    // `echo "<javascript>" | node`, `<payload node` and `<<<'<javascript>' node` all run code that no
    // argument carries. Only a program whose arguments cannot reach a build may be fed.
    if (redirections.some((redirection) => redirection.reads) && !HARMLESS_PROGRAMS.has(program)) {
      out.push(`<reads stdin> ${invocation}`);
      continue;
    }
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
