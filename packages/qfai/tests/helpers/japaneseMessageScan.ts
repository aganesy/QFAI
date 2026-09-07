/**
 * Lexical scan for Japanese text in TypeScript sources.
 *
 * Shared by the operator-facing message-language meta-test and by the
 * allowlist it checks against, so the two cannot drift: the allowlist is
 * written in exactly the keys `japaneseSignature` produces here.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

/** Hiragana, katakana, CJK ideographs, and CJK/fullwidth punctuation. */
const CJK_RE = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/;

/** One source line that still carries Japanese text outside of a comment. */
export interface JapaneseLine {
  /** 1-based line number in the original source. */
  readonly line: number;
  /** The line with comments blanked out, trimmed — what a report quotes. */
  readonly text: string;
}

/** Every non-declaration, non-test `.ts` file under `dir`, recursively. */
export async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const name of entries) {
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      out.push(...(await listSourceFiles(full)));
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Whitespace and comments — the tokens that cannot end an expression. */
function isTrivia(token: ts.SyntaxKind): boolean {
  return (
    token === ts.SyntaxKind.WhitespaceTrivia ||
    token === ts.SyntaxKind.NewLineTrivia ||
    token === ts.SyntaxKind.SingleLineCommentTrivia ||
    token === ts.SyntaxKind.MultiLineCommentTrivia ||
    token === ts.SyntaxKind.ShebangTrivia ||
    token === ts.SyntaxKind.ConflictMarkerTrivia
  );
}

/**
 * Whether a `/` following `previous` opens a regular expression.
 *
 * The listed tokens are the ones an expression can end on, and only there is
 * the slash division. Everything else — an operator, a keyword, `(`, `,`, the
 * start of the file — puts the scanner where only an operand may follow, and a
 * regular expression is an operand. `)` and `}` are read as expression ends,
 * which mis-reads the regular expression in `if (x) /re/.test(y)`; nothing in
 * `src/**` writes that, while `(a + b) / 2` is ordinary.
 */
function regexAllowedAfter(previous: ts.SyntaxKind | undefined): boolean {
  switch (previous) {
    case undefined:
      return true;
    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.PrivateIdentifier:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.TemplateTail:
    case ts.SyntaxKind.RegularExpressionLiteral:
    case ts.SyntaxKind.CloseParenToken:
    case ts.SyntaxKind.CloseBracketToken:
    case ts.SyntaxKind.CloseBraceToken:
    case ts.SyntaxKind.PlusPlusToken:
    case ts.SyntaxKind.MinusMinusToken:
    case ts.SyntaxKind.ThisKeyword:
    case ts.SyntaxKind.SuperKeyword:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return false;
    default:
      return true;
  }
}

/**
 * Blank out comments so only code — string literals included — is scanned.
 *
 * The TypeScript scanner does the lexing, so `info("prefix // text")` and
 * `info("/* text *\/")` keep their operator-facing text: a comment marker that
 * happens to sit inside a string literal is not a comment.
 *
 * The scanner alone is not enough for template literals: after the expression
 * of a `${...}` substitution it resumes in ordinary-expression mode, so the
 * remainder of `` `prefix ${value} // text` `` lexes as a line comment unless
 * the closing `}` is re-scanned as a template continuation. `templateBraces`
 * records the brace depth each unfinished template was opened at, so the `}`
 * that closes a substitution is told apart from one closing a block or object
 * literal inside it, and only the former is re-scanned.
 *
 * A `/` needs the same treatment for the opposite reason: the scanner returns
 * it as a plain slash and leaves the regex-or-division decision to the parser,
 * so `` /^ {0,3}(`{3,}|~{3,})$/ `` — a fence matcher, of which `src/**` holds
 * several — lexes its backtick as the start of a template literal and swallows
 * every comment up to the next backtick in the file. `regexAllowedAfter`
 * makes that decision from the previous token, which is the same rule a
 * JavaScript lexer uses: the slash is division only where an expression has
 * just ended.
 *
 * Replacing comments with spaces rather than deleting them keeps line numbers
 * intact, so a failure report points at the line the offending string is
 * really on.
 */
export function stripComments(source: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false);
  scanner.setText(source);
  const chars = source.split("");
  const templateBraces: number[] = [];
  let braceDepth = 0;
  let previous: ts.SyntaxKind | undefined;
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      (token === ts.SyntaxKind.SlashToken || token === ts.SyntaxKind.SlashEqualsToken) &&
      regexAllowedAfter(previous)
    ) {
      token = scanner.reScanSlashToken();
    }
    if (token === ts.SyntaxKind.TemplateHead) {
      templateBraces.push(braceDepth);
    } else if (token === ts.SyntaxKind.OpenBraceToken) {
      braceDepth += 1;
    } else if (token === ts.SyntaxKind.CloseBraceToken) {
      if (templateBraces[templateBraces.length - 1] === braceDepth) {
        token = scanner.reScanTemplateToken(/* isTaggedTemplate */ false);
        if (token === ts.SyntaxKind.TemplateTail) {
          templateBraces.pop();
        }
        continue;
      }
      braceDepth -= 1;
    } else if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      for (let index = scanner.getTokenStart(); index < scanner.getTokenEnd(); index += 1) {
        if (chars[index] !== "\n" && chars[index] !== "\r") {
          chars[index] = " ";
        }
      }
    }
    if (!isTrivia(token)) {
      previous = token;
    }
    token = scanner.scan();
  }
  return chars.join("");
}

/** Every code line of `source` that carries Japanese text, in file order. */
export function findJapaneseLines(source: string): JapaneseLine[] {
  // Blanking comments can only remove Japanese, so a file without any at all
  // needs no lexing — which is most of `src/**`.
  if (!CJK_RE.test(source)) {
    return [];
  }
  return stripComments(source)
    .split(/\r?\n/)
    .flatMap((line, index) => (CJK_RE.test(line) ? [{ line: index + 1, text: line.trim() }] : []));
}

/** `file` relative to `from`, with POSIX separators on every platform. */
export function relativeToPosix(from: string, file: string): string {
  return path.relative(from, file).split(path.sep).join("/");
}

/** `path:line: text` — the form used in failure reports. */
export function formatJapaneseLine(relPath: string, found: JapaneseLine): string {
  return `${relPath}:${found.line}: ${found.text}`;
}

/** Tab and printable ASCII — every character that is not the Japanese text. */
const ASCII_RUN = /[\t -~]+/g;

/**
 * The Japanese content of a line, with the surrounding ASCII code blanked out.
 *
 * This is the key the allowlist is written in. Keying on the message text
 * rather than on the whole line — or on a line number — keeps a rename or a
 * re-indent next to a tolerated message from forcing an allowlist edit, while
 * any *new* Japanese text still produces a key that the list does not contain.
 *
 * The equivalence class is therefore "the same Japanese wording in the same
 * file": re-wording a tolerated message counts as a new message and has to be
 * listed — which the rule forbids — but swapping the interpolated key inside
 * one leaves the operator reading the same Japanese sentence, and passes.
 */
export function japaneseSignature(lineText: string): string {
  return lineText.replace(ASCII_RUN, " ").trim();
}

/** What a file's Japanese lines and its allowlist entries disagree about. */
export interface AllowlistDiff {
  /** Japanese lines the allowlist does not account for — rule violations. */
  readonly added: readonly string[];
  /** Allowlist entries with no line left to cover — migrated, so drop them. */
  readonly migrated: readonly string[];
}

/**
 * Match a file's Japanese lines against the messages it is allowed to keep.
 *
 * Entries are consumed one line each, so the allowlist is a multiset: a file
 * that legitimately repeats a message lists it once per occurrence, and an
 * extra copy of an already-tolerated message is reported like any other new
 * one. Because every line has to be covered by an entry of its own content, a
 * message that gets translated frees no room for a different Japanese message
 * — the freed entry turns up in `migrated` and has to be dropped, not reused.
 */
export function diffAgainstAllowlist(
  relPath: string,
  found: readonly JapaneseLine[],
  allowed: readonly string[],
): AllowlistDiff {
  const remaining = new Map<string, number>();
  for (const entry of allowed) {
    remaining.set(entry, (remaining.get(entry) ?? 0) + 1);
  }

  const added: string[] = [];
  for (const line of found) {
    const signature = japaneseSignature(line.text);
    const left = remaining.get(signature) ?? 0;
    if (left === 0) {
      added.push(formatJapaneseLine(relPath, line));
      continue;
    }
    remaining.set(signature, left - 1);
  }

  const migrated: string[] = [];
  for (const [entry, count] of remaining) {
    for (let index = 0; index < count; index += 1) {
      migrated.push(`${relPath}: ${entry}`);
    }
  }

  return { added, migrated };
}
