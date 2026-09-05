/**
 * One reduction of a TypeScript module to the text that can execute, shared by
 * every guard that needs one.
 *
 * ## Why it is shared rather than reimplemented
 *
 * Four guards each wrote their own, and all four were wrong in different ways.
 * The failure is structural rather than a missing case: **every delimiter such a
 * scan looks for can also appear inside the body of some other construct**, so a
 * scan that does not track construct X reads X's contents as its own syntax.
 * Each generation tracked one construct more than the last and was still wrong
 * about the next:
 *
 * - two `replace` passes: a line comment citing a glob carries a block-comment
 *   opener, and the block pass runs to the next real closer, taking the code
 *   between them with it;
 * - one scan tracking comments: a `//` inside a string still opens a comment;
 * - one scan tracking strings and templates: a regular expression whose body
 *   holds a BACKTICK still opens a phantom template literal.
 *
 * That last one was live. `core/specPackParsers.ts` matches CommonMark fences,
 * so its regex carries a run of backticks; the phantom template ran forty-six
 * lines into a JSDoc and swallowed that JSDoc's own opener, after which prose
 * read as executable code and real code read as string data.
 *
 * Measured before this module existed, against the parser:
 *
 * | guard                                    | defect                                                     |
 * | ---------------------------------------- | ---------------------------------------------------------- |
 * | `unit/validators-are-wired`              | 5 wrong (file, validator) verdicts, both directions        |
 * | `validators/ruleCodeUniqueness`          | comment prose leaked as code in 8 of 264 modules           |
 * | `helpers/prototypingGateSurface`         | the same 8                                                 |
 * | `core/prototyping/reviewerDispatch`      | 11,381 characters of NON-comment text deleted from its one |
 * |                                          | subject, losing 91 identifiers                             |
 *
 * The parser knows every construct, including the one a fifth hand-rolled
 * generation would have missed. It also draws a distinction none of the four
 * drew: a template's `${…}` substitution is executable code, so a call inside
 * one is a real call site while the literal text around it is not.
 *
 * ## What callers get
 *
 * Both functions preserve offsets and newlines for comments, so line-anchored
 * patterns downstream keep working. They differ only in literals, because the
 * two needs are genuinely different: a scan looking for call sites wants prose
 * in a literal gone, while a scan reading `import … from "…"` needs the
 * specifier text that would erase.
 */
import ts from "typescript";

/**
 * The reduction is asked for once per (module, name) pair — some sixty names
 * over some three hundred modules in one guard alone — so each parse is
 * memoised by source text. Two maps rather than a composite key: the two
 * reductions of one module are different strings and both get asked for.
 */
const LITERALS_BLANKED = new Map<string, string>();
const COMMENTS_ONLY = new Map<string, string>();

/** One span to blank, and what to leave behind. */
interface BlankSpan {
  start: number;
  end: number;
  /** `space` keeps offsets and newlines; `quotes` collapses to `""`. */
  fill: "space" | "quotes";
}

/**
 * Comments blanked to spaces; string and template literals kept **verbatim**.
 *
 * For a caller that reads text out of literals — a module-edge walk over
 * `import … from "./x.js"`, say. A phantom comment here drops real import edges
 * and shrinks the reachable set, which reads downstream as code nobody calls.
 */
export function withoutComments(source: string): string {
  return cached(COMMENTS_ONLY, source, false);
}

/**
 * Comments blanked to spaces; each string literal and each template
 * head/middle/tail replaced with `""`, **substitutions kept**.
 *
 * For a caller asking "is this name used in executable position", where prose
 * in a literal is not a call site — but `count=${validate(root)}` is one.
 */
export function withoutCommentsOrLiterals(source: string): string {
  return cached(LITERALS_BLANKED, source, true);
}

function cached(store: Map<string, string>, source: string, blankLiterals: boolean): string {
  const hit = store.get(source);
  if (hit !== undefined) return hit;
  const reduced = reduceSource(source, blankLiterals);
  store.set(source, reduced);
  return reduced;
}

/**
 * Comment spans. Comments are trivia, so they hang off tokens rather than
 * nodes; walking `getChildren` reaches punctuation too, which is where a
 * comment inside an otherwise empty block lives — and a comment this walk
 * misses is prose a caller would read as code.
 */
function collectCommentSpans(source: string, parsed: ts.SourceFile): BlankSpan[] {
  const spans: BlankSpan[] = [];
  const seen = new Set<number>();
  const visit = (node: ts.Node): void => {
    for (const ranges of [
      ts.getLeadingCommentRanges(source, node.pos),
      ts.getTrailingCommentRanges(source, node.pos),
    ]) {
      for (const range of ranges ?? []) {
        if (seen.has(range.pos)) continue;
        seen.add(range.pos);
        spans.push({ start: range.pos, end: range.end, fill: "space" });
      }
    }
    for (const child of node.getChildren(parsed)) visit(child);
  };
  visit(parsed);
  return spans;
}

/**
 * String and template literal spans — the literal PIECES only. A template's
 * `node.templateSpans[i].expression` is code and stays, which is the
 * distinction that makes a call inside a substitution a real call site.
 */
function collectLiteralSpans(parsed: ts.SourceFile): BlankSpan[] {
  const spans: BlankSpan[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      spans.push({ start: node.getStart(parsed), end: node.getEnd(), fill: "quotes" });
    } else if (ts.isTemplateExpression(node)) {
      spans.push({ start: node.head.getStart(parsed), end: node.head.getEnd(), fill: "quotes" });
      for (const templateSpan of node.templateSpans) {
        spans.push({
          start: templateSpan.literal.getStart(parsed),
          end: templateSpan.literal.getEnd(),
          fill: "quotes",
        });
      }
    }
    node.forEachChild(visit);
  };
  parsed.forEachChild(visit);
  return spans;
}

function reduceSource(source: string, blankLiterals: boolean): string {
  const parsed = ts.createSourceFile(
    "scan.ts",
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const spans = [
    ...collectCommentSpans(source, parsed),
    ...(blankLiterals ? collectLiteralSpans(parsed) : []),
  ].sort((a, b) => a.start - b.start);

  let out = "";
  let cursor = 0;
  for (const span of spans) {
    // A comment inside a substitution is already covered by the outer span it
    // sits in; taking the inner one again would double-blank and shift text.
    if (span.start < cursor) continue;
    out += source.slice(cursor, span.start);
    out +=
      span.fill === "quotes" ? '""' : source.slice(span.start, span.end).replace(/[^\n]/g, " ");
    cursor = span.end;
  }
  return out + source.slice(cursor);
}
