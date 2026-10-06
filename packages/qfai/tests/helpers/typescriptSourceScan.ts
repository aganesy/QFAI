/** Lexical helpers for TypeScript sources: listing them and blanking their comments. */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

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

/** `file` relative to `from`, with POSIX separators on every platform. */
export function relativeToPosix(from: string, file: string): string {
  return path.relative(from, file).split(path.sep).join("/");
}
