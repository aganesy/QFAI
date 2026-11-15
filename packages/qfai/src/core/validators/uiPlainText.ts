/**
 * Every plain text in UI source states why it is there.
 *
 * An agent adds explanatory copy because nothing stops it. This check makes it
 * defend each literal text at the place it writes it: a `qfai-text` comment
 * with `why` (why the text must exist) and `without` (what goes wrong when it
 * is gone), or the text fails the run. Text that names, labels or reports —
 * headings, labels, buttons, links, alerts — is exempt, and expressions are
 * data, not copy. So is a data value: a short text that is not a sentence, in a
 * table cell or a description value, or as a JSX string literal. One reason
 * before an element, or as its first child, covers every text inside it, so a
 * sentence a link splits needs one reason.
 *
 * It reads the current prototype pages and the files `uiux.surfacePaths`
 * selects. HTML, Vue and Svelte go through jsdom; JSX goes through the
 * `typescript` package the project itself installs, so qfai carries no parser
 * of its own for it.
 */

import { readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const RULE = "uiux.plainText";
const PROTOTYPE_DIR = path.join(".qfai", "prototype");
const SOURCE_EXTENSIONS = new Set([".html", ".tsx", ".jsx", ".vue", ".svelte"]);
const NON_SOURCE_NAME = /\.(test|spec|stories)\./;
const EXEMPT_ELEMENTS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "label",
  "button",
  "a",
  "legend",
  "th",
  "caption",
  "option",
  "summary",
  "title",
  "script",
  "style",
]);
const LINK_ALIASES = new Set(["routerlink", "nuxtlink"]);
/** The last word of a component name that marks it as a link or a button, whatever words precede it. */
const EXEMPT_LAST_WORDS = new Set(["link", "button"]);
const EXEMPT_ROLES = new Set(["alert", "status"]);
/** Elements whose content is a data value: a table cell and a description list's value. */
const DATA_CELL_ELEMENTS = new Set(["td", "dd"]);
/** The last word of a component name that marks it as a data cell, as in `TableCell`. */
const DATA_CELL_LAST_WORD = "cell";
/** The most code points a data value holds, inner whitespace collapsed. */
const DATA_VALUE_LENGTH = 20;
/**
 * A mark that ends a sentence: `.`, `!` or `?` at the end of the text or before whitespace, so
 * `1.5` and `ORD.42` are not sentences, or anywhere a CJK full stop (U+3002), a full-width
 * exclamation mark (U+FF01), question mark (U+FF1F) or full stop (U+FF0E), or a half-width
 * ideographic full stop (U+FF61).
 */
const SENTENCE_END = /[.!?](?:\s|$)|[\u3002\uFF01\uFF1F\uFF61\uFF0E]/u;
/** Elements a comment before or inside stands for the whole file; `qfai-text-file` does that. */
const FILE_LEVEL_ELEMENTS = new Set(["html", "body"]);
const REASON_MARK = "qfai-text:";
const EXCERPT_LENGTH = 40;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const REMEDIES =
  "If the user needs this text here (a result, a cost, a condition, a consequence, a destination, a recovery step, or an empty state's next step), keep it and write the reason before it: `<!-- qfai-text: why=<why it must exist>; without=<what goes wrong without it> -->`, or `{/* qfai-text: ... */}` in JSX. One reason before an element, or as its first child, covers every text inside it, such as a paragraph a link splits, a list or a table. Otherwise delete it, replace it with another component (an icon with an accessible name, a state, a badge), or move its job to an existing element (a label, a heading, the button wording). If none of these works without losing what the user needs, keep it and write its reason.";

export type UiPlainTextOptions = {
  /** Loads the project's `typescript`; the default resolves it from the project root. */
  loadTypescript?: (root: string) => unknown;
};

/** A `qfai-text` body and the comment it came from, which one finding names however many texts it covers. */
type Reason = { body: string; source: object };

/** One literal text and the comment that gives it its reason, if any. */
type Candidate = { line: number; text: string; reason: Reason | null };

/**
 * The subset of the TypeScript compiler API this check and the component catalogue call. The
 * optional fields are the node properties the catalogue reads; a node kind that has none leaves
 * them out.
 */
export type TsNode = {
  kind: number;
  pos: number;
  parent?: TsNode;
  getStart(): number;
  getText(): string;
  getChildren(): TsNode[];
  name?: TsNode;
  type?: TsNode;
  types?: readonly TsNode[];
  typeName?: TsNode;
  tagName?: TsNode;
  initializer?: TsNode;
  modifiers?: readonly TsNode[];
  parameters?: readonly TsNode[];
  members?: readonly TsNode[];
  elements?: readonly TsNode[];
  typeArguments?: readonly TsNode[];
  arguments?: readonly TsNode[];
  dotDotDotToken?: TsNode;
  propertyName?: TsNode;
  declarationList?: { declarations: readonly TsNode[] };
  statements?: readonly TsNode[];
  expression?: TsNode;
  exportClause?: TsNode;
  moduleSpecifier?: TsNode;
  importClause?: TsNode;
  namedBindings?: TsNode;
  heritageClauses?: readonly TsNode[];
  attributes?: TsNode;
  properties?: readonly TsNode[];
};
export type TsApi = {
  createSourceFile(
    name: string,
    text: string,
    target: number,
    setParents: boolean,
    kind: number,
  ): TsNode & { getLineAndCharacterOfPosition(pos: number): { line: number } };
  SyntaxKind: Record<string, number>;
  ScriptTarget: { Latest: number };
  ScriptKind: { TSX: number; JSX: number };
};

export async function validateUiPlainText(
  root: string,
  config: QfaiConfig,
  options: UiPlainTextOptions = {},
): Promise<Issue[]> {
  const files = await selectFiles(root, config.uiux?.surfacePaths ?? []);
  const issues: Issue[] = [];
  const jsxFiles = files.filter((file) => [".tsx", ".jsx"].includes(path.extname(file)));
  const ts = jsxFiles.length > 0 ? loadTs(root, options.loadTypescript) : null;
  for (const file of files) {
    const extension = path.extname(file);
    const source = await readSafe(path.join(root, file));
    let candidates: Candidate[];
    if (extension === ".tsx" || extension === ".jsx") {
      if (!ts) continue;
      candidates = jsxCandidates(ts, source, file);
    } else {
      candidates = await markupCandidates(markupOf(source, extension));
    }
    // A valid file reason stands for every text the file gives no reason of its own. A prototype
    // page holds every screen, so one comment there would clear them all: it is not read.
    const recorded = isPrototypePage(file) ? null : fileReason(source);
    const defect = recorded ? reasonDefect(recorded.body) : null;
    if (recorded && defect !== null) {
      issues.push(
        issue(
          "QFAI-UITEXT-002",
          `The \`qfai-text-file\` reason ${defect}.`,
          "error",
          file,
          RULE,
          undefined,
          "canonical",
          "Write exactly `why=<why the file's texts must exist>; without=<what goes wrong without them>`, both non-empty and saying different things — or remove the comment and give each text its own reason.",
          { loc: { line: recorded.line } },
        ),
      );
    }
    const shared: Reason | null =
      recorded && defect === null ? { body: recorded.body, source: recorded } : null;
    // A malformed reason is reported once, at the first text it covers.
    const judged = new Set<object>();
    issues.push(
      ...candidates.flatMap((candidate) =>
        findingsFor(
          shared !== null && candidate.reason === null
            ? { ...candidate, reason: shared }
            : candidate,
          file,
          judged,
        ),
      ),
    );
  }
  if (jsxFiles.length > 0 && !ts) {
    issues.push(
      issue(
        "QFAI-UITEXT-003",
        `${jsxFiles.length} \`.tsx\`/\`.jsx\` file(s) were not checked for plain text: the \`typescript\` package cannot be loaded from the project root.`,
        "error",
        "qfai.config.yaml",
        RULE,
        undefined,
        "canonical",
        "Install `typescript` as a dev dependency of the project, or remove the JSX files from `uiux.surfacePaths`.",
      ),
    );
  }
  return issues;
}

/** The current prototype pages and the declared surface files, repository-relative and posix. */
async function selectFiles(root: string, surfacePaths: readonly string[]): Promise<string[]> {
  const selected = new Set<string>();
  const prototypeRoot = path.join(root, PROTOTYPE_DIR);
  const entries = await readdir(prototypeRoot).catch((error: unknown): string[] => {
    if (isAbsent(error)) return [];
    throw error;
  });
  const iterations = entries
    .map((name) => /^iter-(\d+)$/.exec(name))
    .filter((match): match is RegExpExecArray => match !== null)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const dir of ["final", iterations[0]?.[0]]) {
    if (!dir) continue;
    const page = path.join(PROTOTYPE_DIR, dir, "index.html");
    if (await isFile(path.join(root, page))) selected.add(toPosix(page));
  }
  for (const file of await selectSurfaceFiles(root, surfacePaths)) selected.add(file);
  return [...selected].sort();
}

/**
 * The UI source files the `uiux.surfacePaths` globs select from the root, repository-relative,
 * posix and sorted: the `.html`, `.tsx`, `.jsx`, `.vue` and `.svelte` files outside
 * `node_modules` that are not test, spec or story files.
 */
export async function selectSurfaceFiles(
  root: string,
  surfacePaths: readonly string[],
): Promise<string[]> {
  if (surfacePaths.length === 0) return [];
  const matched = await fg([...surfacePaths], {
    cwd: root,
    onlyFiles: true,
    ignore: ["**/node_modules/**"],
  });
  const selected = new Set<string>();
  for (const file of matched) {
    if (!SOURCE_EXTENSIONS.has(path.extname(file))) continue;
    if (NON_SOURCE_NAME.test(path.basename(file))) continue;
    selected.add(toPosix(path.normalize(file)));
  }
  return [...selected].sort();
}

async function isFile(file: string): Promise<boolean> {
  return stat(file).then(
    (found) => found.isFile(),
    (error: unknown) => {
      if (isAbsent(error)) return false;
      throw error;
    },
  );
}

function isAbsent(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}

function toPosix(file: string): string {
  return file.split(path.sep).join("/");
}

/** The project's own `typescript` compiler API, or `null` when the root cannot load one. */
export function loadTs(root: string, load: UiPlainTextOptions["loadTypescript"]): TsApi | null {
  try {
    const loaded: unknown = load
      ? load(root)
      : createRequire(path.join(root, "package.json"))("typescript");
    return isTsApi(loaded) ? loaded : null;
  } catch {
    return null;
  }
}

/**
 * Whether a loaded module offers the compiler API this check calls. Checking
 * `createSourceFile` and `SyntaxKind` is enough: every release that has them
 * has the rest of the API named in `TsApi`.
 */
function isTsApi(value: unknown): value is TsApi {
  return (
    typeof value === "object" &&
    value !== null &&
    "createSourceFile" in value &&
    typeof value.createSourceFile === "function" &&
    "SyntaxKind" in value
  );
}

/**
 * The markup jsdom reads for a file, prepared so an HTML parser reads it as the
 * author wrote it. Everything blanked or renamed keeps its newlines, so lines
 * still match the source.
 *
 * - An `.html` file is read as it is. A `.vue` file is read in its top-level
 *   `<template>` block, found outside `<script>` and `<style>`; a `.svelte`
 *   file without its `<script>` and `<style>` blocks.
 * - Vue and Svelte get their `{ ... }` parts blanked, their self-closing tags
 *   closed and their component tags renamed, because an HTML parser reads
 *   `{a<b}` as a tag, `<Comp />` as an open element, and `<Link>` as the void
 *   `link` element that holds nothing.
 * - Every inner `<template>` is renamed, because a parser keeps its content
 *   out of the document tree.
 * - Markup with no document of its own starts inside `<body>`, so a comment
 *   before its first element stays that element's sibling.
 */
function markupOf(source: string, extension: string): string {
  let markup = source;
  if (extension !== ".html") {
    markup = markup.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, blank);
    if (extension === ".vue") {
      const open = /<template(\s[^>]*)?>/.exec(markup);
      const close = markup.lastIndexOf("</template>");
      if (!open || close < open.index) return "";
      const start = open.index + open[0].length;
      markup =
        blank(markup.slice(0, start)) + markup.slice(start, close) + blank(markup.slice(close));
    }
    markup = renameComponents(closeSelfClosing(blankBraces(markup)));
  }
  markup = markup.replace(/<(\/?)template\b/gi, "<$1qfai-template");
  return /<!doctype|<html\b|<body\b/i.test(markup) ? markup : `<body>${markup}`;
}

/**
 * Renames a capitalised, mixed-case or dotted tag to an unknown element whose
 * last `.`-separated segment is the component's own name, which `isExemptName`
 * reads. A parser lowers the case of the name, so each word boundary of a
 * segment that is not already an exempt name is kept as a `-`.
 */
function renameComponents(markup: string): string {
  return markup.replace(
    /<(\/?)([A-Z][\w-]*(?:\.[\w-]+)*|[a-z][\w-]*(?:\.[\w-]+)+|[a-z][a-z0-9]*[A-Z][\w-]*)(?=[\s/>])/g,
    (_whole, slash: string, name: string) =>
      `<${slash}c.${name
        .split(".")
        .map((segment) => (isExemptByName(segment) ? segment : hyphenateWords(segment)))
        .join(".")}`,
  );
}

function hyphenateWords(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2");
}

function blank(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

/** Blanks every balanced `{ ... }` no other pair holds; an unmatched `{` stays as text. */
function blankBraces(text: string): string {
  const chars = Array.from(text);
  const stack: number[] = [];
  const pairs: [number, number][] = [];
  chars.forEach((char, index) => {
    if (char === "{") stack.push(index);
    const start = char === "}" ? stack.pop() : undefined;
    if (start !== undefined) pairs.push([start, index]);
  });
  pairs.sort((a, b) => a[0] - b[0]);
  let reached = -1;
  for (const [start, end] of pairs) {
    if (start < reached) continue;
    for (let at = start; at <= end; at += 1) if (chars[at] !== "\n") chars[at] = " ";
    reached = end;
  }
  return chars.join("");
}

function closeSelfClosing(markup: string): string {
  return markup.replace(
    /<([A-Za-z][\w.:-]*)((?:\s[^<>]*?)?)\s*\/>/g,
    (whole, name: string, attributes: string) =>
      VOID_ELEMENTS.has(name.toLowerCase()) ? whole : `<${name}${attributes}></${name}>`,
  );
}

async function markupCandidates(markup: string): Promise<Candidate[]> {
  if (markup.trim() === "") return [];
  const { loadJsdom } = await import("../uiux/htmlMockDom.js");
  const { JSDOM } = await loadJsdom();
  const dom = new JSDOM(markup, { includeNodeLocations: true });
  const { document, Node } = dom.window;
  const candidates: Candidate[] = [];
  const walker = document.createTreeWalker(document, dom.window.NodeFilter.SHOW_TEXT);
  // The `qfai-text` comment found from `start` on, stepping past whitespace text only.
  const reasonFrom = (start: Node | null, step: (node: Node) => Node | null): Reason | null => {
    let current = start;
    while (
      current &&
      current.nodeType === Node.TEXT_NODE &&
      (current.textContent ?? "").trim() === ""
    ) {
      current = step(current);
    }
    if (!current || current.nodeType !== Node.COMMENT_NODE) return null;
    const body = reasonBody(current.textContent ?? "");
    return body === null ? null : { body, source: current };
  };
  const commentBefore = (node: Node): Reason | null =>
    reasonFrom(node.previousSibling, (current) => current.previousSibling);
  // A first-child comment that stands directly before an element is that element's reason, not
  // the container's; it covers the container only when text follows it.
  const firstChildReason = (element: Element): Reason | null => {
    const found = reasonFrom(element.firstChild, (child) => child.nextSibling);
    if (!found || !(found.source instanceof dom.window.Node)) return null;
    let next = found.source.nextSibling;
    while (next && next.nodeType === Node.TEXT_NODE && (next.textContent ?? "").trim() === "") {
      next = next.nextSibling;
    }
    return next?.nodeType === Node.ELEMENT_NODE ? null : found;
  };
  // The nearest enclosing element with a reason directly before it or as its first child, up to
  // `body`, whose first comment would stand for the whole file.
  const elementReason = (element: Element | null): Reason | null => {
    for (let current = element; current; current = current.parentElement) {
      if (FILE_LEVEL_ELEMENTS.has(current.localName)) return null;
      const found = commentBefore(current) ?? firstChildReason(current);
      if (found) return found;
    }
    return null;
  };
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const raw = node.textContent ?? "";
    if (raw.trim() === "") continue;
    if (insideExempt(node.parentElement)) continue;
    if (insideDataCell(node.parentElement) && isDataValue(raw)) continue;
    const location = dom.nodeLocation(node);
    const leading = raw.slice(0, raw.length - raw.trimStart().length);
    const line = (location?.startLine ?? 1) + (leading.match(/\n/g)?.length ?? 0);
    const reason = commentBefore(node) ?? elementReason(node.parentElement);
    candidates.push({ line, text: raw, reason });
  }
  dom.window.close();
  return candidates;
}

function insideDataCell(element: Element | null): boolean {
  for (let current = element; current; current = current.parentElement) {
    if (isDataCellName(current.localName)) return true;
  }
  return false;
}

/**
 * Whether an element or component name is a data cell: its last `.`-separated segment is `td`
 * or `dd`, or that segment's last word, split as `isExemptName` splits it, is `cell`, as in
 * `TableCell`, `Table.Cell` or `data-cell`.
 */
function isDataCellName(name: string): boolean {
  const segment = name.split(".").pop() ?? "";
  if (DATA_CELL_ELEMENTS.has(segment.toLowerCase())) return true;
  return hyphenateWords(segment).split("-").pop()?.toLowerCase() === DATA_CELL_LAST_WORD;
}

/**
 * Whether a text is a data value rather than a sentence: at most `DATA_VALUE_LENGTH` code points
 * with inner whitespace collapsed, and no mark that ends a sentence.
 */
function isDataValue(text: string): boolean {
  const value = text.replace(/\s+/g, " ").trim();
  return Array.from(value).length <= DATA_VALUE_LENGTH && !SENTENCE_END.test(value);
}

function insideExempt(element: Element | null): boolean {
  for (let current = element; current; current = current.parentElement) {
    if (isExemptName(current.localName)) return true;
    const role = current.getAttribute("role")?.trim().toLowerCase();
    if (role && EXEMPT_ROLES.has(role)) return true;
  }
  return false;
}

/**
 * Whether an element or component name is exempt: its last `.`-separated
 * segment names an exempt element, or that segment's last word, split at a
 * case change or a `-`, is `link` or `button`, as in `ButtonLink`,
 * `RouterLink`, `router-link` or `SubmitButton`. An `.html` tag reaches here
 * in lower case with no word boundary but `-`, so `routerlink` and `nuxtlink`
 * are named as well.
 */
function isExemptName(name: string): boolean {
  const segment = name.split(".").pop() ?? "";
  if (isExemptByName(segment)) return true;
  const lastWord = hyphenateWords(segment).split("-").pop()?.toLowerCase() ?? "";
  return EXEMPT_LAST_WORDS.has(lastWord);
}

function isExemptByName(segment: string): boolean {
  const lower = segment.toLowerCase();
  return EXEMPT_ELEMENTS.has(lower) || LINK_ALIASES.has(lower);
}

function reasonBody(comment: string): string | null {
  const trimmed = comment.trim();
  return trimmed.startsWith(REASON_MARK) ? trimmed.slice(REASON_MARK.length) : null;
}

function jsxCandidates(ts: TsApi, source: string, file: string): Candidate[] {
  const kind = path.extname(file) === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const k = ts.SyntaxKind;
  const candidates: Candidate[] = [];
  const childrenOf = (node: TsNode): TsNode[] =>
    node
      .getChildren()
      .flatMap((child) => (child.kind === k.SyntaxList ? child.getChildren() : [child]));

  const isJsxElement = (node: TsNode | undefined): node is TsNode =>
    node !== undefined && (node.kind === k.JsxElement || node.kind === k.JsxFragment);
  const isBlankText = (node: TsNode): boolean =>
    node.kind === k.JsxText && node.getText().trim() === "";

  const tagName = (element: TsNode): string => {
    const opening = element.getChildren()[0];
    return opening ? (opening.getChildren()[1]?.getText() ?? "") : "";
  };
  // The value of the attribute named exactly `role`, given as a string or as a
  // string inside `{}`; any other value is no exempt role.
  const roleOf = (element: TsNode): string => {
    const attributes = element.getChildren()[0]?.getChildren()[2];
    for (const attribute of attributes ? childrenOf(attributes) : []) {
      if (attribute.kind !== k.JsxAttribute) continue;
      const [name, , value] = attribute.getChildren();
      if (name?.getText() !== "role" || !value) continue;
      const literal =
        value.kind === k.StringLiteral
          ? value
          : childrenOf(value).find((child) => child.kind === k.StringLiteral);
      return literal ? literal.getText().slice(1, -1).trim().toLowerCase() : "";
    }
    return "";
  };
  const exempt = (node: TsNode): boolean => {
    for (let current = node.parent; current; current = current.parent) {
      if (current.kind !== k.JsxElement) continue;
      if (isExemptName(tagName(current)) || EXEMPT_ROLES.has(roleOf(current))) return true;
    }
    return false;
  };
  const inDataCell = (node: TsNode): boolean => {
    for (let current = node.parent; current; current = current.parent) {
      if (current.kind === k.JsxElement && isDataCellName(tagName(current))) return true;
    }
    return false;
  };
  // The reason a `{/* qfai-text: ... */}` child holds.
  const commentChildReason = (node: TsNode | undefined): Reason | null => {
    if (!node || node.kind !== k.JsxExpression) return null;
    const body = node.getText().slice(1, -1).trim();
    if (!/^\/\*[\s\S]*\*\/$/.test(body)) return null;
    const reason = reasonBody(body.slice(2, -2));
    return reason === null ? null : { body: reason, source: node };
  };
  const siblingReason = (node: TsNode): Reason | null => {
    const parent = node.parent;
    if (!isJsxElement(parent)) return null;
    const siblings = childrenOf(parent);
    let index = siblings.indexOf(node) - 1;
    let previous = siblings[index];
    while (previous && isBlankText(previous)) {
      index -= 1;
      previous = siblings[index];
    }
    return commentChildReason(previous);
  };
  // The first child of an element or fragment, between its opening and closing tags. As in
  // markup, a comment that stands directly before an element is that element's reason only, so
  // it covers the container only when text follows it.
  const firstChildReason = (element: TsNode): Reason | null => {
    const children = childrenOf(element)
      .slice(1, -1)
      .filter((child) => !isBlankText(child));
    const nextKind = children[1]?.kind;
    const elementKinds = [k.JsxElement, k.JsxFragment, k.JsxSelfClosingElement];
    const isElement = nextKind !== undefined && elementKinds.includes(nextKind);
    return isElement ? null : commentChildReason(children[0]);
  };
  // A fragment no JSX encloses is a component's top level, as `body` is a page's: a comment before
  // it or first inside it would stand for the whole component.
  const isTopFragment = (node: TsNode): boolean => {
    if (node.kind !== k.JsxFragment) return false;
    for (let current = node.parent; current !== undefined; current = current.parent) {
      if (current.kind === k.JsxElement || current.kind === k.JsxFragment) return false;
    }
    return true;
  };
  // The trivia between the node's full start and its first token. The compiler's
  // comment-range helpers leave out a comment on the same line as the token
  // before it, as in `return (/* qfai-text: ... */ <p>`, so the trivia is read directly.
  const leadingReason = (node: TsNode): Reason | null => {
    const comment = /\/\*((?:(?!\*\/)[\s\S])*)\*\/\s*$/.exec(
      source.slice(node.pos, node.getStart()),
    );
    const reason = comment ? reasonBody(comment[1] ?? "") : null;
    return reason === null ? null : { body: reason, source: node };
  };
  // The text's own comment, else the nearest enclosing element or fragment with a reason before
  // it or as its first child.
  const reasonFor = (node: TsNode): Reason | null => {
    const own = siblingReason(node);
    if (own !== null) return own;
    for (let current = node.parent; current; current = current.parent) {
      if (!isJsxElement(current)) continue;
      if (isTopFragment(current)) return null;
      const found = siblingReason(current) ?? leadingReason(current) ?? firstChildReason(current);
      if (found) return found;
    }
    return null;
  };

  const visit = (node: TsNode): void => {
    let text: string | null = null;
    // A data value is exempt as a string literal child anywhere, and as a text in a data cell.
    let dataValue = false;
    // For a JSX text the compiler's start already skips leading whitespace.
    const start = node.getStart();
    if (node.kind === k.JsxText) {
      // An entity that only spaces, as `&nbsp;`, is whitespace, as an HTML parser reads it.
      text = node.getText().replace(/&(nbsp|#160|#xa0);/gi, " ");
      dataValue = isDataValue(text) && inDataCell(node);
    } else if (node.kind === k.JsxExpression && isJsxElement(node.parent)) {
      const inner = childrenOf(node).find(
        (child) => child.kind === k.StringLiteral || child.kind === k.NoSubstitutionTemplateLiteral,
      );
      const meaningful = childrenOf(node).filter(
        (child) => child.kind !== k.OpenBraceToken && child.kind !== k.CloseBraceToken,
      );
      if (inner && meaningful.length === 1) text = inner.getText().slice(1, -1);
      dataValue = text !== null && isDataValue(text);
    }
    if (text !== null && text.trim() !== "" && !dataValue && !exempt(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
      candidates.push({ line, text, reason: reasonFor(node) });
    }
    for (const child of node.getChildren()) visit(child);
  };
  visit(sourceFile);
  return candidates;
}

function findingsFor(candidate: Candidate, file: string, judged: Set<object>): Issue[] {
  // Code points, as the contract counts them.
  const excerpt = Array.from(candidate.text.replace(/\s+/g, " ").trim())
    .slice(0, EXCERPT_LENGTH)
    .join("");
  const loc = { loc: { line: candidate.line } };
  if (candidate.reason === null) {
    return [
      issue(
        "QFAI-UITEXT-001",
        `Plain text "${excerpt}" has no \`qfai-text\` reason.`,
        "error",
        file,
        RULE,
        undefined,
        "canonical",
        REMEDIES,
        loc,
      ),
    ];
  }
  const defect = reasonDefect(candidate.reason.body);
  if (defect === null || judged.has(candidate.reason.source)) return [];
  judged.add(candidate.reason.source);
  return [
    issue(
      "QFAI-UITEXT-002",
      `The \`qfai-text\` reason before "${excerpt}" ${defect}.`,
      "error",
      file,
      RULE,
      undefined,
      "canonical",
      "Write exactly `why=<why the text must exist>; without=<what goes wrong without it>`, both non-empty and saying different things — or delete the text.",
      loc,
    ),
  ];
}

/**
 * A `qfai-text-file` comment, which records one reason for every plain text in its file: an HTML
 * or block comment that opens with the mark. Ceiling: the source is read as text, so the same
 * characters inside a string literal count too; reading the parsers' comment nodes lifts it.
 */
const FILE_REASON = /(?:<!--|\/\*)\s*qfai-text-file:([\s\S]*?)(?:-->|\*\/)/;

/** Whether a repository-relative posix path is a page under `.qfai/prototype/`. */
function isPrototypePage(file: string): boolean {
  return file.startsWith(`${PROTOTYPE_DIR.split(path.sep).join("/")}/`);
}

/** The body of the file's first `qfai-text-file` comment and its opener's line, or `null`. */
function fileReason(source: string): { body: string; line: number } | null {
  const match = FILE_REASON.exec(source);
  if (!match) return null;
  return { body: (match[1] ?? "").trim(), line: source.slice(0, match.index).split("\n").length };
}

/** What a `qfai-text` body lacks, or `null` when it holds a valid reason. */
function reasonDefect(body: string): string | null {
  const values = new Map<string, string>();
  for (const part of body.split(";")) {
    if (part.trim() === "") continue;
    const at = part.indexOf("=");
    if (at < 0) return `has a part with no \`=\`: "${part.trim()}"`;
    const key = part.slice(0, at).trim();
    if (key !== "why" && key !== "without")
      return `carries the key \`${key}\`, which is not \`why\` or \`without\``;
    if (values.has(key)) return `repeats the key \`${key}\``;
    values.set(key, part.slice(at + 1).trim());
  }
  for (const key of ["why", "without"]) {
    const value = values.get(key);
    if (value === undefined) return `lacks \`${key}\``;
    if (value === "") return `leaves \`${key}\` empty`;
  }
  const normalise = (value: string | undefined): string =>
    (value ?? "").toLowerCase().replace(/\s+/g, " ");
  if (normalise(values.get("why")) === normalise(values.get("without"))) {
    return "gives `why` and `without` the same words";
  }
  return null;
}
