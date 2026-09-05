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
/**
 * The here-document opening at `at`, if one does, read once for every walk that needs it.
 *
 * `commandsOf` has read this since round 15 and `codeMask` never did, so the two disagreed about
 * whether a here-document's body is code — the differential test below found it on its first run,
 * which is the sixth "two walks, one question" finding on this file and the first one caught by a test
 * rather than by a reviewer. One reader, so there is nothing left to diverge.
 *
 * `quoted` decides what the DATA is: a quoted delimiter makes it literal, an unquoted one leaves it
 * subject to expansion, so a substitution inside it is a command that runs.
 */
interface HereDoc {
  readonly delimiter: string;
  readonly quoted: boolean;
  /** The index just past the delimiter word: the rest of the operator's line starts here. */
  readonly afterDelimiter: number;
  /** The data region, `[start, end)`, empty when the closer is missing. */
  readonly dataStart: number;
  readonly dataEnd: number;
  /** True when no closing delimiter line exists, which is a refusal rather than a licence. */
  readonly unterminated: boolean;
}

function hereDocAt(body: string, at: number, dataFrom?: number): HereDoc | undefined {
  // `body[at - 1] !== "<"` because this matched the SECOND `<` of a here-STRING: `done <<< "$changed"`
  // then read `$changed` as a delimiter, and once a missing closer became a refusal the shipped tree
  // refused its own line. A here-string is one operator.
  if (body[at] !== "<" || body[at + 1] !== "<" || body[at + 2] === "<" || body[at - 1] === "<") {
    return undefined;
  }
  let k = at + 2;
  if (body[k] === "-") k += 1;
  while (k < body.length && /[ \t]/.test(body[k] ?? "")) k += 1;
  let delimiter = "";
  let delimiterQuote = "";
  let quoted = false;
  for (; k < body.length; k += 1) {
    const next = body[k] ?? "";
    if (delimiterQuote !== "") {
      if (next === delimiterQuote) delimiterQuote = "";
      else delimiter += next;
      continue;
    }
    if (next === '"' || next === "'") {
      delimiterQuote = next;
      quoted = true;
      continue;
    }
    // `<<\EOF` is bash's THIRD spelling of a quoted delimiter, and the delimiter it names is `EOF`.
    if (next === "\\") {
      delimiter += body[k + 1] ?? "";
      quoted = true;
      k += 1;
      continue;
    }
    // `<`, `>` and `(` end the word too, or the scanner and bash name different delimiters:
    // `cat <<EOF>>"$GITHUB_OUTPUT"` read the delimiter as `EOF>>$GITHUB_OUTPUT`.
    if (/[\s;&|)<>(]/.test(next)) break;
    delimiter += next;
  }
  if (delimiter === "") return undefined;
  const lineEnd = body.indexOf("\n", k);
  if (lineEnd === -1) return undefined;
  // **Where this opener's DATA starts, which is not always the operator line's end.** `cat <<A <<B`
  // is two here-documents on one line: A's data begins after the line, and B's begins after A's
  // TERMINATOR. Computing both from `lineEnd + 1` gave them the same `dataStart` and overlapping
  // regions — so `codeMask`'s `pendingData.find` matched only the first, the second was never masked,
  // and the walk went through it as code. One `"` in B's data then disarmed the scan for the rest of
  // the body: round 19's blocker, re-entered through the bookkeeping added to close it. Round 20
  // executed it.
  //
  // `dataFrom` is the caller's running origin for the current line: the end of the previous opener's
  // data, or the line end for the first. The closer is searched from there too, or B would match a
  // line inside A.
  const dataStart = Math.max(dataFrom ?? lineEnd + 1, lineEnd + 1);
  const rest = body.slice(dataStart);
  // Every regex metacharacter escaped. Round 16 found this class written so that the escape for `]`
  // closed the class instead, by extracting it from this file's own bytes: reading the line looks right.
  const pattern = delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const closer = new RegExp(`^[ \\t]*${pattern}[ \\t]*$`, "m").exec(rest);
  return {
    delimiter,
    quoted,
    afterDelimiter: k,
    dataStart,
    dataEnd: closer === null ? body.length : dataStart + closer.index + closer[0].length,
    unterminated: closer === null,
  };
}

export function commandsOf(body: string): string[] {
  const mask = codeMask(body);
  const out: string[] = [];
  let current = "";
  let quote = "";
  let inComment = false;
  // Where a here-document's data ends, once one has been opened on the current line. The skip has to
  // wait for the newline: everything between the delimiter and it is still command text.
  let heredocEnd: number | undefined;
  // The next here-document opened on THIS line takes its data from the end of the previous
  // one's, not from the line end. A property of one line, so it resets at every newline.
  let nextDataStart: number | undefined;

  // **`lastCode` lived here and is gone.** Round 16 added it because three decisions in this walk were
  // reading the raw text while `codeMask` — computed at the top of this function — knew better: an
  // escaped `>` made `echo a\>|npx tsup` read as one `echo` while bash piped a build.
  //
  // It answered "what is the LAST code character", and every decision that used it needed "what is the
  // PREVIOUS character, and is it code". The difference only shows when something masked sits between,
  // and round 18 found it: a quoted redirection target left the operator as the last code character and
  // disarmed the split, so `echo x > "$GITHUB_OUTPUT" | npx tsup` — the shipped tree's own idiom with a
  // pipe after it — ran a build with the scan clean, in eleven spellings.
  //
  // The three rules read `body[i - 1]` with `mask[i - 1]` now, which is what each of them meant. A
  // helper that is nearly the question is worse than no helper: it reads as though it were the question.

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
    // Only the DATA is skipped, and the skip is deferred to the newline: the first version jumped from
    // the operator to the end of the here-document and discarded the rest of the operator's own line
    // with it, so `read x <<EOF && npx tsup` executed and `read x <<EOF > evil.cjs` created the file.
    //
    // `hereDocAt` is shared with `codeMask`, which had no model of this at all until the differential
    // test found the two walks disagreeing about whether a here-document's body is code.
    // The running origin for THIS line: the previous opener's data end, so `cat <<A <<B` gives B a
    // region that starts after A's terminator instead of overlapping it.
    const here = quote === "" ? hereDocAt(body, i, nextDataStart) : undefined;
    if (here !== undefined) {
      // **A missing closer is a refusal, not a licence.** Answering one by discarding everything after
      // the operator as data means any construct that stops the closer matching hides the rest of the
      // body — fail-open in the one place this file exists to be fail-closed.
      if (here.unterminated) out.push(`unterminated-here-document ${here.delimiter}`);
      // An UNQUOTED delimiter leaves the data subject to expansion, so a substitution inside it is a
      // command that runs. The data is not read as commands — it is data — but every `$( … )` and
      // backtick in it is.
      if (!here.quoted) {
        const data = body.slice(here.dataStart, here.dataEnd);
        for (let d = 0; d < data.length; d += 1) {
          if (data[d] === "$" && data[d + 1] === "(") {
            const close = matchingParen(data, d + 1);
            out.push(...commandsOf(data.slice(d + 2, close)));
            d = close;
            continue;
          }
          if (data[d] === "`") {
            const close = data.indexOf("`", d + 1);
            out.push(...commandsOf(data.slice(d + 1, close === -1 ? data.length : close)));
            d = close === -1 ? data.length : close;
          }
        }
      }
      current += body.slice(i, here.afterDelimiter);
      heredocEnd = heredocEnd === undefined ? here.dataEnd : Math.max(heredocEnd, here.dataEnd);
      nextDataStart = here.dataEnd;
      i = here.afterDelimiter - 1;
      continue;
    }
    // A process substitution is a substitution only OUTSIDE quotes. Inside double quotes bash
    // performs none — `"<(cmd)"` is literal text — so `quote !== "'"` admitted a construct
    // bash never runs. `quote === ""` is the whole rule, in both walks.
    if ((ch === "<" || ch === ">") && body[i + 1] === "(" && quote === "") {
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
    // `>|` is ONE operator, so the `>` must be the character immediately before the `|`. `lastCode`
    // skips masked text, so a quoted redirection target left the operator as "the last code character"
    // and disarmed the split from a distance: `echo x > "$GITHUB_OUTPUT" | npx tsup` — the shipped
    // tree's own idiom with a pipe after it — ran a build with the scan clean, in eleven spellings,
    // while every unquoted control was refused. `lastCode` answers "what is the last code character",
    // and the question here is "what is the previous character, and is it code".
    const clobber = ch === "|" && body[i - 1] === ">" && mask[i - 1] === true;
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
    // Adjacent on both sides, for the reason `clobber` above gives: `&>` and `>&` are single operators,
    // and a `<` or `>` several masked characters back is a different redirection entirely.
    const redirectAmp =
      ch === "&" &&
      ((body[i + 1] === ">" && mask[i + 1] === true) ||
        (/[<>]/.test(body[i - 1] ?? "") && mask[i - 1] === true));
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
      if (ch === "\n") {
        if (heredocEnd !== undefined) {
          i = heredocEnd;
          heredocEnd = undefined;
        }
        nextDataStart = undefined;
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
/**
 * Which characters of a body are CODE, exported so a test can hold the mask and the verdict to each
 * other. Every escape found in rounds 15 to 18 was a build at a position this function calls code
 * that `refusals()` did not refuse, because some other walk disagreed with it about quotes.
 */
export function maskOf(body: string): boolean[] {
  return codeMask(body);
}

function codeMask(body: string): boolean[] {
  const mask = new Array<boolean>(body.length).fill(true);
  let quote = "";
  let inComment = false;
  // Here-document data regions opened on a line already walked. The walk JUMPS them rather than
  // walking them masked, because a quote inside data that is not code still drove the state machine.
  const pendingData: HereDoc[] = [];
  // Same running origin as `commandsOf`, for the same reason and reset in the same place: two
  // openers on one line take their data from different places, and computing both from the line
  // end gave them the same `dataStart`, so the `find` below matched only the first.
  let nextDataStart: number | undefined;
  for (let i = 0; i < body.length; i += 1) {
    const here = pendingData.find((region) => region.dataStart === i);
    if (here !== undefined) {
      for (let j = here.dataStart; j < here.dataEnd && j < body.length; j += 1) mask[j] = false;
      // An UNQUOTED delimiter leaves the data's substitutions live, and their contents ARE code —
      // one scan, the way `commandsOf` reads the same region, so `$(…)` and a backtick cannot both
      // claim the same bytes.
      if (!here.quoted) {
        const data = body.slice(here.dataStart, here.dataEnd);
        for (let d = 0; d < data.length; d += 1) {
          const opensAt =
            data[d] === "$" && data[d + 1] === "(" ? d + 2 : data[d] === "`" ? d + 1 : -1;
          if (opensAt === -1) continue;
          const closesAt =
            opensAt === d + 2
              ? matchingParen(data, d + 1)
              : (() => {
                  const found = data.indexOf("`", d + 1);
                  return found === -1 ? data.length : found;
                })();
          const inner = codeMask(data.slice(opensAt, closesAt));
          for (let j = 0; j < inner.length; j += 1) {
            mask[here.dataStart + opensAt + j] = inner[j] ?? true;
          }
          d = closesAt;
        }
      }
      i = Math.max(i, here.dataEnd - 1);
      continue;
    }
    const ch = body[i] ?? "";
    if (ch === "\n") nextDataStart = undefined;
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
    // A here-document's data is not code, and this walk had no model of one while `commandsOf` has had
    // since round 15. The differential test found them disagreeing on its first run.
    //
    // **Marking the data was not enough: the walk kept going THROUGH it**, so a quote character in the
    // data still drove the state machine. Round 19 executed the consequence — a lone `"` on a data line
    // masks every separator after the here-document, `isAlternation` then reaches a `)` and reads a real
    // pipe as a case arm, and `echo a | npx tsup ")"` collapses to one `echo`. `commandsOf` jumps past
    // the data and does not have the bug, so the two walks disagreed again INSIDE the reader they were
    // given to share. Sharing the reader was not sharing the reading.
    //
    // And `here.quoted` decides what the data IS, which only `commandsOf` was consuming: a quoted
    // delimiter makes the data literal, an unquoted one leaves its substitutions live. The mask says so
    // now, which is what makes the answer for an unquoted here-document a rule rather than a side effect
    // of the bug above.
    if (quote === "") {
      const here = hereDocAt(body, i, nextDataStart);
      if (here !== undefined) {
        for (let j = i; j < here.afterDelimiter; j += 1) mask[j] = false;
        pendingData.push(here);
        nextDataStart = here.dataEnd;
        i = here.afterDelimiter - 1;
        continue;
      }
    }
    // `$( … )` still expands inside double quotes; a process substitution does not. Splitting the
    // two conditions is what the previous single `quote !== "'"` collapsed.
    if (
      (quote !== "'" && ch === "$" && body[i + 1] === "(") ||
      (quote === "" && (ch === "<" || ch === ">"))
    ) {
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
    // The same guard `commandsOf`'s comment rule carries, and it was missing here — so the two walks
    // disagreed about where a comment starts, which is the disagreement round 17 repaired in one of
    // them. An escaped space is not a separator: `echo x <\ #y & npx tsup` started a comment here and
    // did not there, and the build after the `&` ran with the scan clean.
    if (ch === "#" && (i === 0 || (mask[i - 1] === true && /[\s;&|(]/.test(body[i - 1] ?? " ")))) {
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
    // **The third quote walk in this file, and the one the other two depend on.** It had no backslash
    // model while both of the others did, so `echo "$(echo \")" ; npx tsup` closed the substitution at
    // the escaped quote, and the separator and the build after it landed inside a word. Round 18 ran
    // twenty-four spellings of that through with the scan clean.
    //
    // A backslash escapes the next character outside single quotes, exactly as it does in `codeMask`
    // and `commandsOf`. Three walks is itself the finding; what keeps them honest until there is one is
    // that each has now been given the same three rules.
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
    // A `#` starting a WORD opens a comment, and bash ignores everything to the
    // newline — brackets included. Without this rule `$(echo x # )` closed the
    // substitution on the `)` inside the comment, and everything the real
    // substitution still held (`npx tsup` on the next line) was absorbed into the
    // enclosing word, where no rule reads it. Measured: `echo "$(echo x # )` /
    // `npx tsup` / `)"` runs the build under bash and left `refusals()` empty.
    //
    // "Starting a word" is what makes `curl host/x#frag` safe: a `#` glued to the
    // previous character is not a comment in bash either.
    if (ch === "#" && (i === open || /[\s(|&;]/.test(body[i - 1] ?? ""))) {
      const newline = body.indexOf("\n", i);
      if (newline < 0) return body.length;
      i = newline;
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

/** A function-definition header: the name, and whatever of the body shares its command. */
const FUNCTION_DEFINITION_RE = /^[ \t]*(\w+)[ \t]*\(\)[ \t]*\{?[ \t]*(.*)$/s;

/**
 * Functions a `run` body defines for itself, which are not programs.
 *
 * Read from the commands `commandsOf` classified as EXECUTABLE, never from the raw
 * body. Applied to the raw text the pattern also matched non-executing data, and a
 * name registered from there silences a real invocation of it: measured, the body
 * `read v <<'EOF'` / `npx() {` / `EOF` / `npx tsup` runs the build under bash while
 * the here-document's data line registered `npx` as local, so `invocationsOf`
 * returned `read v` alone and `refusals()` was empty. The same shape works from any
 * quoted string a shipped lane happens to print.
 */
export function localFunctionsOf(body: string): Set<string> {
  const names = new Set<string>();
  for (const command of commandsOf(body)) {
    const match = FUNCTION_DEFINITION_RE.exec(command);
    if (match?.[1] !== undefined) names.add(match[1]);
  }
  return names;
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
  for (const raw of commandsOf(body)) {
    // A single-line definition carries its BODY in the same command, so the header
    // is stripped and what follows is resolved on its own. Skipping the whole
    // command instead — which is what reading only the name did — hid the body:
    // `bundle() { node scripts/bundle.mjs; }` was classified by the local name
    // `bundle` and the `node` invocation inside it reached no rule at all.
    const definition = FUNCTION_DEFINITION_RE.exec(raw);
    const command =
      definition === null ? raw : (definition[2] ?? "").replace(/[ \t]*;?[ \t]*\}[ \t]*$/, "");
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
 * Commands allowed as an EXACT token sequence, flags and arguments included.
 *
 * The third and narrowest tier. `HARMLESS_PROGRAMS` allows a program by name whatever its
 * arguments; `ALLOWED_INVOCATIONS` allows a two-token prefix with an enumerated flag set. Neither
 * fits a command whose ARGUMENT is the whole point and must not generalise:
 *
 * - `command -v corepack` resolves a name and runs nothing, but `command <anything>` RUNS it, so
 *   the program cannot be allowed by name.
 * - `npm install --global corepack@0.35.0` carries a package name and a flag that `npm install`
 *   is deliberately denied — `TAKES_NO_PACKAGE` exists so `npm install left-pad` cannot ship.
 *   Widening either would admit every global install, which is the capability the rule refuses.
 *
 * Both are here because Node stopped bundling Corepack at 25 and the Node a shipped lane runs is
 * the ADOPTER's, from their own `.nvmrc` / `.node-version`. The yarn branch called `corepack
 * enable` unconditionally and stopped at `command not found` before installing anything — review
 * finding [22]. Adding one exact string per need is what makes that a change a reviewer reads,
 * which is this instrument's whole purpose; the test below requires every member to be invoked by
 * the shipped tree, so an entry cannot outlive its use.
 */
export const ALLOWED_EXACT_COMMANDS: ReadonlySet<string> = new Set([
  "command -v corepack",
  // Asked BEFORE `setup-node`, to decide whether the Yarn download cache can be claimed at all.
  // `cache: yarn` sends setup-node to exactly this query, and on a runner with neither Yarn nor
  // Corepack preinstalled it stopped the job before the install step could provision either —
  // the lane failing at the one point it is built to fail open. Skipping the cache costs a warm
  // cache and nothing else.
  //
  // The QUERY rather than `command -v yarn`: a stale shim, or a yarn that cannot resolve its own
  // cache, satisfies `command -v` and still fails here. Asking the real question is the whole
  // point of asking.
  "yarn cache",
  // The VERSION and the REGISTRY are both part of the exact string, and that is the enumeration
  // working as intended: review finding [55] pinned the version because an unpinned install
  // fetches whatever the registry calls latest at the moment the job runs, and review finding
  // [83] pinned the source because a version names WHAT to fetch and not WHERE from — `npm`
  // takes its registry from `NPM_CONFIG_REGISTRY` or a project `.npmrc`. Bumping either has to
  // be a change a reviewer reads here too.
  //
  // `--ignore-scripts` is in the string rather than in `ALLOWED_FLAGS` for the reason the whole
  // tier exists: `npm install` is denied a bare package argument, so widening its flag set would
  // admit every global install, which is the capability this refuses.
  "npm install --global --ignore-scripts --registry https://registry.npmjs.org/ corepack@0.35.0",
]);

/**
 * A command's tokens, redirections and leading prefixes removed, joined — the form
 * `ALLOWED_EXACT_COMMANDS` is keyed by.
 *
 * The prefixes go because `invocationOf` drops them too, and the two tiers must agree on where a
 * command starts: the shipped tree writes `if ! command -v corepack`, which reaches this scanner as
 * `! command -v corepack`, and keying on that would make the enumeration depend on the syntax that
 * happens to surround the call rather than on the call.
 */
function exactFormOf(command: string): string {
  const tokens = tokensOf(withoutRedirections(command));
  let start = 0;
  while (start < tokens.length && COMMAND_PREFIXES.has(tokens[start] ?? "")) start += 1;
  return tokens.slice(start).join(" ");
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
  // Asked BEFORE `setup-node`, to decide whether the Yarn download cache can be claimed at all.
  // `cache: yarn` sends setup-node to exactly this query, and on a runner carrying neither Yarn
  // nor Corepack it stopped the job there — before the install step could provision either, so
  // the lane failed at the one point it is built to fail open.
  //
  // The QUERY rather than `command -v yarn`: a stale shim, or a yarn that cannot resolve its own
  // cache, satisfies `command -v` and still fails here. Asking the real question is the point.
  "yarn cache",
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
  ["actions/checkout", "fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09"],
  ["actions/setup-node", "a0853c24544627f65ddf259abe73b1d18a591444"],
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
 * Each shipped workflow file, by the bytes of its content.
 *
 * **The three shape pins read a PARSED document, and a parse is not an identity.** Round 17 measured the
 * consequences: a non-mapping step is invisible at three `isRecord` sites, eight YAML spellings of an
 * empty value collapse onto the same `null`, and several number spellings collapse too — so two files
 * that differ can serialize identically, which is the one thing a boundary may not permit.
 *
 * The bytes are the identity, exactly as they are for a `run:` body — and **the bytes, not the decoded
 * text.** The first version hashed a UTF-8 string, so two files differing in one byte collided: `0xFE`
 * and `0xFF` are both the replacement character once decoded. It also folded CRLF, justified by a
 * `.gitattributes` that sets `eol=lf` — which is the line that makes the fold unreachable, so the
 * justification cited the case it excluded. Both are gone: nothing is normalized, because `eol=lf` makes
 * the bytes stable across checkouts and because every normalization tried in this file has turned out to
 * erase something.
 *
 * The shape pins are kept beside this one and are not redundant: this says the file is not the reviewed
 * one, and they say WHICH part moved. A reader needs the second, and a boundary needs the first.
 */
export const ALLOWED_WORKFLOW_FILES: ReadonlyMap<string, string> = new Map([
  ["qfai-tests.yml", "e3d534f0e816fdc42db85265b56e4a77343d3679bb8944d3b441bffe5c874345"],
  ["qfai-validate.yml", "8c552639887060e0413ab576991ab5022508662ef973d8a2c1f67ef87c652494"],
]);

/** The bytes of a shipped file. Nothing is normalized, and the parameter is a Buffer for that reason. */
export function fileDigest(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * The adopter-facing files `qfai init` writes, outside the eight agent-instruction trees.
 *
 * The shape pins cover `.github/workflows/**` and nothing else, and `qfai init` writes more than
 * workflows. Round 17's gate planted a `package.json` carrying a `preinstall` and an `.npmrc` into the
 * shipped root, ran init, and executed the very step body whose digest is pinned below: arbitrary code
 * ran with all seven projects and `ci:lint` green. A first variant was caught only by eslint's
 * `no-require-imports` — a rule about how the planted file was WRITTEN — and inlining the payload evaded
 * it, which is this record's recurring class working by accident and then not working.
 *
 * The EIGHT trees in `INIT_INSTRUCTION_TREES` are excluded by path: they are agent-instruction trees
 * that change whenever a skill does, and what matters about them is narrower than their contents, which
 * `INIT_MUST_NOT_SHIP` states. This paragraph named four of the eight for a round after the list grew —
 * two copies of one fact, and the one nobody was looking at was wrong.
 *
 * **The justification is false of one file in those trees**, and `ALLOWED_PROVENANCE_SHAPE` below
 * covers it for that reason: `.qfai/install-provenance.json` is not an agent instruction, does not
 * change when a skill does, and gates whether init DELETES an adopter's workflow.
 */
export const ALLOWED_INIT_PATHS: ReadonlySet<string> = new Set([
  ".github/copilot-instructions.md",
  ".github/workflows/qfai-tests.yml",
  ".github/workflows/qfai-validate.yml",
  ".gitignore",
  "DESIGN.md",
  "qfai.config.yaml",
]);

/**
 * And the CONTENT of the four that are not workflows.
 *
 * The path pin says which files arrive; it says nothing about what is in them, so an arbitrary line
 * planted in the shipped `DESIGN.md` was invisible — four of the six were pinned by name only, which
 * round 18's gate measured. The two workflows are byte-pinned by `ALLOWED_WORKFLOW_FILES`; these four are
 * byte-pinned here, and between them every adopter-facing file this tree writes is pinned by content.
 *
 * The `.gitignore` digest moved once, deliberately: the atomic `.qfai/state.json` write leaves a
 * staging directory behind when a run is killed mid-write, and `QFAI_STATE_SCRATCH_IGNORE`
 * (`src/core/gitignore.ts`) joined the managed block so that leftover is ignored rather than swept
 * into an adopter's `git add .`. The added line is the whole delta — `*.qfai-state.tmp`, one entry
 * after `.qfai/state.json` — and re-pinning it here is what makes that one line reviewed content
 * rather than drift.
 */
export const ALLOWED_INIT_CONTENT: ReadonlyMap<string, string> = new Map([
  [
    // Re-pinned when the version-discipline line stopped naming `packages/qfai/package.json#version`:
    // that path exists only inside this monorepo, so the rule it stated was unresolvable in the tree
    // it is written into. Reverting that one line reproduces the previous digest byte for byte, which
    // is what makes this a review of one line rather than a re-blessing of the whole file.
    ".github/copilot-instructions.md",
    "d412d4fff2b738430866397ab2abd6e5ec2a58beaf00833a951078c04ee346c5",
  ],
  // Re-derived for the MERGED managed block, which carries both sides' additions:
  // this branch's `*.qfai-state.tmp` and the two `.qfai/evidence/` negations
  // (`implement-*.md`, `atdd-*.md`) that arrived with it. Neither predecessor's
  // digest describes the block that now ships, so this is one pin rather than
  // two — the map is keyed by file name and cannot hold both.
  //
  // Derived by running `qfai init` into the E2E's temp root and reading what it
  // wrote, which is how both predecessors were derived. Not copied from a
  // failure message: the point of the pin is that somebody looked at the block.
  [".gitignore", "e56620ef701cc655a4a52e7ef437f2beee6b06a587f9b4011d6c591fc1cbdfac"],
  ["DESIGN.md", "f59eb3d151acfb95d09cd278ef719a2ca28b30134a53097b526464c45d1efaef"],
  // Re-derived for the MERGED file, which carries both sides' edits: the three
  // retired `validation.traceability` knobs are gone (`brMustHaveSc`,
  // `scNoTestSeverity`, `orphanContractsPolicy`) AND the `forbidTestTodoStubs`
  // comment no longer calls the opt-out's waiver a requirement. Neither
  // predecessor's digest describes what ships, and the map is keyed by file
  // name, so this is one pin rather than two.
  //
  // Derived by running `qfai init` into the E2E's temp root and reading what it
  // wrote, which is how both predecessors were derived — not copied from a
  // failure message.
  ["qfai.config.yaml", "6c9016bf3fdc6c4704219b9c57bceb0d37871277ca122b102daa8a72f152bc3a"],
]);

/**
 * The build token every decoration below carries, and the two corpora that say where bash runs it.
 *
 * **They live in the helper because two instruments read them.** `shippedLaneCommands.test.ts` uses
 * them for the differential — if the mask says a build is code, the scan must refuse it — and
 * `spec0017LayeredCiScaffoldE2E.test.ts` runs every one of them through real bash with a fake bundler
 * on `PATH`, which is the only oracle that has ever found a defect in this file. Round 19's gate
 * observed that this oracle "lives in reviewer scratch and is deleted at the end of each round"; it is
 * committed now, and a second copy of the corpora would have put the two instruments back on separate
 * evidence, which is the divergence this whole file is a record of.
 */
export const BUILD_DECORATION = "npx tsup";

// Decorations that put a build at a CODE position in bash, one per construct this file has been
// wrong about. Each `%s` is where the build goes.
export const LIVE_DECORATIONS: ReadonlyArray<string> = [
  "%s",
  "echo a && %s",
  "echo a ; %s",
  "echo a | %s",
  "echo a\n%s",
  'echo "quoted" && %s',
  "echo 'quoted' && %s",
  "echo a\\> | %s",
  "echo a\\>| %s",
  "echo $'a\\'' && %s",
  'echo "$(echo \\")" ; %s',
  "echo x <\\ #y & %s",
  'echo x > "$GITHUB_OUTPUT" | %s',
  "read v <<EOF\ndata\nEOF\n%s",
  "read v <<'EOF'\ndata\nEOF\n%s",
  "read v <<\\EOF\ndata\nEOF\n%s",
  "case $x in *) %s ;; esac",
  // Round 20, the twelfth spelling, executed. `cat <<A <<B` is TWO here-documents on one line:
  // A's data begins after the line and B's begins after A's TERMINATOR. Both were computed from
  // the line end, so they shared a `dataStart`, the mask's region lookup matched only the first,
  // and the walk went through B's data as code — one `"` in it disarmed the scan for the rest of
  // the body. Round 19's blocker, re-entered through the bookkeeping added to close it.
  'read v <<A <<B\nA\n"\nB\necho a | %s ")"',
  "read v <<A <<B\nA\nB\n%s",
  "read v <<A <<B\nA\n$(%s)\nB",
  "read v <<A <<B\n$(%s)\nA\nB",
  "if [ -f package.json ]; then %s; fi",
  // CALLED, not merely defined. Round 19 executed every row here and this one did not run:
  // bash defines a function body and does not enter it, so the row asserted an execution that
  // never happened. The construct it exists for — a build inside a function body — is intact.
  "build_once() { %s; }; build_once",
  "( %s )",
  "read v <<EOF\n$(%s)\nEOF",
  // Round 19. The delimiter scan breaks on `<`/`>`/`(`, and nothing asserted it: reverting that
  // one character class passed the whole file.
  "read v <<EOF>/dev/null\ndata\nEOF\n%s",
  // …and the eleventh spelling, found by executing with a fake bundler on PATH. `codeMask` marked
  // a here-document's data non-code and then kept WALKING it, so the `"` on the data line drove
  // the quote state for everything after: the separators vanished, the alternation lookahead
  // reached the `)`, and a real pipe read as a `case` arm. One character of DATA disarmed the
  // scan for the rest of the body.
  'read v <<E\n"\nE\necho a | %s ")"',
  'read v <<E\n"\nE\n%s',
  "read v <<EOF\n`%s`\nEOF",
];

// …and decorations that put it where bash never runs it. The mask must agree that they are not
// code, and — round 19 — the scan must not refuse them either. Fail-closed used to be allowed
// here as an unstated blanket, which left the OTHER walk unasserted at exactly these positions:
// reverting `commandsOf`'s half of the process-substitution fix passed the entire file. It is
// enumerated now, like everything else this file decides, and the list is empty.
export const INERT_DECORATIONS: ReadonlyArray<string> = [
  "echo '%s'",
  'echo "%s"',
  "# %s",
  "echo a # %s",
  "read v <<'EOF'\n%s\nEOF",
  // Round 19. A QUOTED delimiter makes its data literal, so a substitution inside it never runs.
  // Only `commandsOf` read `quoted`; `codeMask` did not, and called this data code.
  "read v <<'EOF'\n$(%s)\nEOF",
  // `<<\EOF` is bash's third spelling of a quoted delimiter. The subject said so and nothing
  // checked it: dropping `quoted = true` from the backslash branch passed the whole file.
  "read v <<\\EOF\n$(%s)\nEOF",
  // bash performs NO process substitution inside double quotes — `"<(cmd)"` is literal text.
  // Both walks guarded on `quote !== "'"`, which admitted it.
  'echo "<(%s)"',
  'echo ">(%s)"',
  // A QUOTED first delimiter makes its data literal even with a second opener on the line, so
  // the substitution never runs. The mask must say so, and the scan must not refuse it.
  "read v <<'A' <<B\n$(%s)\nA\nB",
  // Plain here-document DATA is text, not commands: bash passes it to `read` and runs nothing.
  "read v <<A <<B\n%s\nA\ndata\nB",
];

/**
 * Every file in the init SOURCE outside the mirrored `.qfai/` tree — the bytes `qfai init` copies
 * verbatim into an adopter.
 *
 * Round 19 pinned `root/` here after two payloads walked in through the OUTPUT pin's exclusion of the
 * eight instruction trees. Round 20 walked in through the same exclusion one directory over:
 * `assets/init/.github/instructions/**` is a THIRD source tree, it ships verbatim into the excluded
 * `.github/instructions/`, and no pin walked it. Two files. Enumerating them costs nothing and the
 * absence of the enumeration cost a round.
 *
 * **`.qfai/**` is deliberately not here, and that is a residual rather than a decision to be proud
 * of.** Its 169 entries are mirrored from this repository's own `.qfai/` by `pnpm sync:ssot`, they
 * belong to other specs, and they change on that schedule — a path pin over them would redden on
 * every skill edit, which is the "guard that reddens on the honest edit" hazard this record has been
 * tracking since round 10. What guards them is mirror parity plus the kind rule below. Round 20's
 * gate defeated that pair with a file carrying no shebang, no executable bit and no known name, run
 * with `sh <file>` — the execution path `initMustNotShip`'s own docstring names. Recorded as gap 11.
 */
export const ALLOWED_INIT_SOURCE_ASSETS: ReadonlySet<string> = new Set([
  "root/.github/workflows/qfai-tests.yml",
  "root/.github/workflows/qfai-validate.yml",
  "root/DESIGN.md",
  "root/qfai.config.yaml",
  ".github/instructions/code-review.instructions.md",
  ".github/instructions/principles.instructions.md",
]);

/** The one source tree the enumeration above excludes, named so the exclusion is checkable. */
export const INIT_SOURCE_MIRRORED_TREE = ".qfai/";

/**
 * The file extensions `qfai init` may ship, which is the fourth question about who runs a file.
 *
 * The other three ask what the bytes say (a shebang), what the filesystem says (an executable bit)
 * and what a tool would know the name for. Round 20's gate beat all three with a file carrying none
 * of them — `.qfai/assistant/bootstrap`, extensionless, mode 0644, shell text — run as `sh <file>`,
 * which is the execution path `initMustNotShip`'s own docstring names as consulting "no bit and no
 * offset". It reached an adopter with every pin green.
 *
 * The property that separates it from everything legitimately here is not its name and not its
 * content: **it is that the init source ships DATA, and data has a data extension.** All 185 entries
 * are `.md`, `.yml`, `.yaml`, `.json`, `.toml`, `.sql` or `.sample`, 159 of them markdown, and none
 * has ever been extensionless. So the rule is an enumeration of what may ship rather than a list of
 * what may not — the same inversion the rest of this file is built on, arrived at three rounds late
 * because the earlier attempts kept enumerating the dangerous side, which cannot be finished.
 *
 * A legitimate file with a new extension reddens and is a one-line review. That is the intended cost,
 * and `.toml` is the first entry to pay it: the `web-research` skill's MCP server templates moved into
 * the init payload so the paths its SKILL.md cites resolve in a consumer root, and a TOML config table
 * is read by an MCP host, not executed. Adding one here also means adding it to the leakage smoke
 * test's `TEXT_EXTENSIONS` — a shipped text format nothing scans is a distributed surface with no
 * internal-ID guard over it.
 */
export const ALLOWED_INIT_SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".md",
  ".yml",
  ".yaml",
  ".json",
  ".toml",
  ".sql",
  ".sample",
]);

/**
 * The one file inside an instruction tree that is pinned anyway, by SHAPE.
 *
 * The exclusion above justifies itself on the trees being agent instructions "that change whenever a
 * skill does, and what matters about them is narrower than their contents". `.qfai/install-provenance.json`
 * is none of that. Another session added it while round 19 was in flight, and it is the record `doctor`
 * reads to detect drift and `resolvePrunableRetiredWorkflows` reads to decide whether to **delete an
 * adopter's workflow file** — so its contents are exactly what matters about it, and a file that gates
 * a delete had no pin at all because of where it happens to sit.
 *
 * Its bytes cannot be pinned: it carries a timestamp, the installed version, and a digest per workflow.
 * So the pin is the shape — which keys may appear at each level, and what each value must look like. A
 * key nobody enumerated is a channel nobody reviewed, which is the same rule the workflow shape pins
 * make one directory over.
 */
export const ALLOWED_PROVENANCE_SHAPE: {
  readonly path: string;
  readonly topLevelKeys: ReadonlySet<string>;
  readonly entryKeys: ReadonlySet<string>;
  readonly entryValues: ReadonlyMap<string, RegExp>;
} = {
  path: ".qfai/install-provenance.json",
  topLevelKeys: new Set(["workflows"]),
  entryKeys: new Set(["sha256", "installedByVersion", "installedAt"]),
  entryValues: new Map([
    ["sha256", /^[0-9a-f]{64}$/],
    ["installedByVersion", /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/],
    ["installedAt", /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/],
  ]),
};

/** The eight trees excluded from the PATH pin, and excluded from nothing else — the kind rule reads them. */
export const INIT_INSTRUCTION_TREES: ReadonlyArray<string> = [
  ".qfai/",
  ".claude/",
  ".codex/",
  ".agents/",
  ".github/agents/",
  ".github/instructions/",
  ".github/prompts/",
  ".github/skills/",
];

/**
 * What `qfai init` may never write ANYWHERE in an adopter's tree, including the instruction trees.
 *
 * A kind rather than a list of paths, because the danger is not which file it is but who runs it: a
 * package manager reads a manifest and a shell reads a script, and neither asks where it came from.
 * `EXECUTED_ON_INSTALL` names the same class for a lane's redirect targets one level in, and this is the
 * same claim about the tree the lane runs in.
 *
 * **The first version called itself a kind rule and was an extension list**, which round 18's gate beat
 * by shipping `.agents/hooks/post-checkout` — a `#!/bin/sh` script with no extension at all, arriving
 * mode `0755` — into an adopter tree with the whole suite green. A name is not a kind. `initMustNotShip`
 * below asks the three questions that decide whether something runs: does it start with a shebang, is it
 * marked executable, is it a manifest or a script by name. The pattern is kept as the third of those.
 */
export const INIT_MUST_NOT_SHIP =
  /(?:^|\/)(?:package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|pnpm-workspace\.yaml|\.npmrc|\.yarnrc(?:\.yml)?|\.pnpmfile\.(?:c?js))$|\.(?:c?js|mjs|sh|bash|ps1|bat|cmd|py|rb|pl)$|(?:^|\/)(?:\.git\/)?hooks\//;

/**
 * The byte-order marks an editor may write in front of a file's first real byte, with the encoding
 * each one announces.
 *
 * Round 19 shipped `EF BB BF #!/bin/sh` into an adopter tree and ran it. The question that was meant
 * to stop it read `contents.subarray(0, 2)` as `latin1` and got `EF BB` — **the reader was two bytes
 * wide, at a fixed offset.** Adding a UTF-8 BOM to that comparison would have been the same mistake
 * one encoding later, so the marks are enumerated and the text is decoded before anything looks for
 * `#!` in it.
 */
const BYTE_ORDER_MARKS: ReadonlyArray<{
  readonly mark: Buffer;
  readonly encoding: BufferEncoding;
  readonly swap: boolean;
}> = [
  { mark: Buffer.from([0xef, 0xbb, 0xbf]), encoding: "utf8", swap: false },
  { mark: Buffer.from([0xff, 0xfe]), encoding: "utf16le", swap: false },
  { mark: Buffer.from([0xfe, 0xff]), encoding: "utf16le", swap: true },
];

/**
 * True when a shell would read this file as a script.
 *
 * Not "byte 0 is `#`": what made the round-19 payload run was `sh <file>`, which consults no bit and
 * no offset. The shebang is evidence of INTENT, so it is looked for where a human would see it — as
 * the first non-blank text, after any byte-order mark, in whatever encoding the mark announces.
 *
 * Bounded to the first kilobyte: a shebang is on line 1 or it is not a shebang, and the walk runs
 * over every file `qfai init` writes.
 */
function carriesShebang(contents: Buffer): boolean {
  const head = contents.subarray(0, 1024);
  for (const { mark, encoding, swap } of BYTE_ORDER_MARKS) {
    if (!head.subarray(0, mark.length).equals(mark)) continue;
    const rest = head.subarray(mark.length);
    // `swap16` needs an even length and mutates, so it gets its own copy; an odd tail is not
    // decodable UTF-16 and the untouched bytes answer the question just as well.
    let decoded: string;
    try {
      decoded = (swap ? Buffer.from(rest.subarray(0, rest.length & ~1)).swap16() : rest).toString(
        encoding,
      );
    } catch {
      decoded = rest.toString("latin1");
    }
    return decoded.trimStart().startsWith("#!");
  }
  return head.toString("latin1").trimStart().startsWith("#!");
}

/**
 * Why this file would run, or the empty string if nothing would run it.
 *
 * Three questions, because there are three answers to "who runs this": a kernel reads a shebang, a
 * filesystem carries an executable bit, and a tool reads a name it knows. The name was the only one the
 * first version asked, and a hook script has no extension.
 */
export function initMustNotShip(
  relativePath: string,
  contents: Buffer,
  mode: number,
): string | undefined {
  if (carriesShebang(contents)) return "carries a shebang";
  // The owner-execute bit. Git records only this one, so it is the only one an adopter can receive.
  //
  // **It cannot fire on Windows, and round 19 found that round 18's evidence that it fires was an
  // artifact of the instrument.** Node reports `0o666` for every file on this platform, so
  // `mode & 0o100` is always 0; the `-rwxr-xr-x` that was read as proof came from Git Bash's `ls`,
  // which infers the `x` column from the shebang. Measured both ways: a `chmod 644` file WITH a
  // shebang lists as `-rwxr-xr-x`, and a `chmod 755` file without one lists as `-rw-r--r--` — the
  // opposite of the bit in both cases. So the check was confirmed by an oracle that was reading
  // question 1's answer and reporting it as question 2's.
  //
  // The question stays, because CI runs `ubuntu-latest`, where git restores the mode and the bit is
  // real. What changed is the claim: on a developer's Windows machine this line is inert, and the
  // shebang question is the one carrying the load. Do not cite a local run as evidence it works.
  if ((mode & 0o100) !== 0) return "arrives executable";
  if (INIT_MUST_NOT_SHIP.test(relativePath)) return "is a manifest or a script by name";
  return undefined;
}

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
    '{"name":"Checkout with full history via actions/checkout 5.1.0","uses":"actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09","with":{"persist-credentials":false,"fetch-depth":0}}',
  ],
  [
    "qfai-tests.yml#detection",
    '{"name":"Select lanes from the name-only diff","id":"diff","env":{"QFAI_BASE_REF":"${{ github.event.pull_request.base.sha || github.event.before }}","QFAI_EVENT_NAME":"${{ github.event_name }}"},"shell":"bash","run":"<body 39e77d7e6e292dc3f06762cd48bedc62e22aa02d35f1504b1e56134023621401>"}',
  ],
  [
    "qfai-tests.yml#detection",
    '{"name":"Probe layer-named test scripts","id":"scripts","shell":"bash","run":"<body 678c2db6a736f883ce9a17182e0e8d8d5a9de25dd9e16c56dfcf8e6e5062c79e>"}',
  ],
  [
    "qfai-tests.yml#unit",
    '{"name":"unit lane placeholder","run":"<body 80ddf0eabd4949e55790dc261767cc41ce6a96f6dcd292977fbef1bb70af34f6>"}',
  ],
  [
    "qfai-tests.yml#component",
    '{"name":"component lane placeholder","run":"<body 8a14724fe711d2daed40f27f79952a694a954f3fccb67c4fe3cbd646c33edce5>"}',
  ],
  [
    "qfai-tests.yml#integration",
    '{"name":"integration lane placeholder","run":"<body f32bed20d2e09b1d95f9840c5ea03bf777cbafd21a14c8b09bfb875f46f1c292>"}',
  ],
  [
    "qfai-tests.yml#api",
    '{"name":"api lane placeholder","run":"<body 9f27850887734772352bf11156187445f61960ccab31678fc6d63d1ee807c21b>"}',
  ],
  [
    "qfai-tests.yml#e2e",
    '{"name":"e2e lane placeholder","run":"<body a9bf316460124eabe53fa90651283d3ec5a4766b167cbccd721a363a7aa55001>"}',
  ],
  [
    "qfai-tests.yml#verdict",
    '{"name":"Aggregate lane results (green on skip)","env":{"QFAI_NEEDS_JSON":"${{ toJSON(needs) }}"},"shell":"bash","run":"<body 7ee82953e37be82d81440045826adfa89282355c973d6e7dacf80bc0ed381fe8>"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Checkout via actions/checkout 5.1.0","uses":"actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09","with":{"persist-credentials":false}}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Resolve the package manager (pnpm route fails closed)","id":"package-manager","shell":"bash","run":"<body e51483d554b98c09c88700bd99f0cbc5e3b066681e23319421f9e73bb97520d6>"}',
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
    '{"name":"Choose a package-manager cache setup-node can actually resolve","id":"node-cache","shell":"bash","run":"<body 22b0f415d7f4c3ee86af159d570d3f5fecb8c998233daa240d33dfe9b15bed61>"}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Set up Node via actions/setup-node 5.0.0","uses":"actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444","with":{"node-version":"${{ steps.node-version.outputs.version }}","cache":"${{ steps.node-cache.outputs.cache }}"}}',
  ],
  [
    "qfai-validate.yml#validate",
    '{"name":"Install dependencies (lockfile-aware)","shell":"bash","run":"<body a01a22aea86949331e27fdf13eef7fcfddeada4edfeda0b10af48c1e674dfd02>"}',
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
 * A payload added to a shipped lane lands here as a diff, which is the whole point of the list.
 * The validate lane's third entry arrived exactly that way: asking the runner's `crypto.getHashes()`
 * whether a declared corepack integrity algorithm exists is a second `node -e` in that step, and
 * this list refused it until it was written down.
 */
export const ALLOWED_NODE_PAYLOADS: ReadonlySet<string> = new Set([
  // `qfai-tests.yml#detection` — reads `scripts` out of `package.json`. 630 characters.
  "7f72970abbe4e9a0fe876e3e0bd57468fc86bab5e3a3cd5076f09fb3653292cc",
  // `qfai-validate.yml#validate` — reads `packageManager` out of `package.json`. 1039 characters.
  "9cc40c1d1704f836361c2a47e780e0fa393307a55f01c129f2da50fc97f57230",
  // `qfai-validate.yml#validate` — asks `crypto.getHashes()` whether the integrity algorithm the
  // adopter declared is one this runner can hash with. Reads no file, writes nothing, and its whole
  // output is an exit code.
  "91abbc929ce0cf578b47794d59ca072e1841a848d9480d904d68ebf30dc5a384",
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
  // `--no-renames` joins `--name-only` because the shipped detection lane needs both: with rename
  // detection ON git reports only the DESTINATION of a move, so `src/x.ts` -> `docs/x.md` arrives as
  // one documentation path and the source half selects no lane. It is a reporting flag — it cannot
  // reach a build — and the own CI tree already carries it for the same reason.
  ["git diff", new Set(["--name-only", "--no-renames"])],
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
  // Which event started the run, so the detection body can take a two-dot diff on a push and a
  // three-dot one on a pull request — review finding [32]. Its value comes from `github.event_name`,
  // a closed set GitHub controls, and the body compares it to one literal. It reaches no program.
  ["QFAI_EVENT_NAME", "${{ github.event_name }}"],
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
    // The exact tier first: a command enumerated in full has already been read as a whole, so
    // the program, invocation, substitution and flag rules below have nothing left to decide.
    if (ALLOWED_EXACT_COMMANDS.has(exactFormOf(command))) continue;
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
