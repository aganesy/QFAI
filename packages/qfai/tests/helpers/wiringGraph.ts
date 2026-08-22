/**
 * Text primitives and a coarse call graph for the "this validator is actually
 * invoked" meta-test.
 *
 * The wiring guard used to decide reachability with `String.includes` over raw
 * file text. Raw text makes three non-calls look like calls: a name mentioned
 * in a doc comment, a name inside a string literal, and a name that only ever
 * appears in an `export { name } from "..."` barrel line. All three kept the
 * guard green for validators that nothing calls — and one of them kept it green
 * for a function that no longer exists in `src/` at all.
 *
 * The primitives here reduce a TypeScript source file to the text that can
 * actually execute, then look for a call expression rather than a bare
 * identifier:
 *
 *   1. {@link stripCommentsAndLiterals} deletes comments, string literals,
 *      template literals and regex literals.
 *   2. {@link stripDeclarationHeaders} deletes `function name(` headers so a
 *      function's own definition never counts as a call to itself.
 *   3. {@link isInvoked} requires `name(` — which an `import`/`export`
 *      statement can never produce.
 *
 * On top of those, {@link buildWiringGraph} answers the question the guard
 * really asks: is the *caller* itself reachable? Concatenating every module the
 * entry file transitively imports is not enough, because `validators/index.ts`
 * is a barrel that re-exports every validator: a dead validator calling another
 * dead validator would make the second one look wired. The graph therefore
 * splits each module into its top-level function bodies plus the module-level
 * residue, seeds reachability with the entry module and every loaded module's
 * residue (top-level code does run on import), and admits a function body only
 * once already-reachable code uses that function — calling it, calling it under
 * an `import { x as y }` alias, or handing it to a dispatch table.
 *
 * Known limitations, all of which err towards a *loud* verdict rather than a
 * silent one:
 *   - a call written inside a template literal (never how a validator is
 *     dispatched) is stripped with the literal and will not be seen;
 *   - a body assigned to something other than a `function` declaration or an
 *     arrow/function-expression `const` (an object-literal method, say) stays
 *     in the residue and is therefore treated as always reachable.
 */

/**
 * Punctuation that, as the last significant character, means a following `/`
 * opens a regex literal rather than a division. Without this the scanner reads
 * a pattern such as `/["']/` as the start of a string and swallows the code
 * after it.
 */
const REGEX_OPENING_PUNCTUATION = new Set([
  "(",
  ",",
  "=",
  ":",
  "[",
  "!",
  "&",
  "|",
  "?",
  "{",
  "}",
  ";",
  "+",
  "-",
  "*",
  "%",
  "~",
  "^",
  "<",
  ">",
]);

/** Keywords after which a `/` also opens a regex literal (`return /x/` etc.). */
const REGEX_OPENING_KEYWORD_RE =
  /(?:^|[^\w$])(?:return|typeof|case|in|of|new|delete|void|do|else|yield|await|instanceof|throw)\s*$/;

/** Returns the index just past a `//` line comment starting at `start`. */
function skipLineComment(source: string, start: number): number {
  const end = source.indexOf("\n", start);
  return end === -1 ? source.length : end;
}

/** Returns the index just past a block comment starting at `start`. */
function skipBlockComment(source: string, start: number): number {
  const end = source.indexOf("*/", start + 2);
  return end === -1 ? source.length : end + 2;
}

/**
 * Returns the index just past the quoted run starting at `start`, honouring
 * backslash escapes. An unterminated literal consumes the rest of the file.
 */
function skipQuoted(source: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    i += 1;
  }
  return source.length;
}

/**
 * Returns the index just past a regex literal starting at `start`. `/` inside a
 * character class does not close the literal.
 */
function skipRegexLiteral(source: string, start: number): number {
  let i = start + 1;
  let inClass = false;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "\n") return i;
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) return i + 1;
    i += 1;
  }
  return source.length;
}

/** Decides whether a `/` at this point opens a regex literal. */
function opensRegexLiteral(emitted: string, lastSignificant: string): boolean {
  if (lastSignificant === "") return true;
  if (REGEX_OPENING_PUNCTUATION.has(lastSignificant)) return true;
  return REGEX_OPENING_KEYWORD_RE.test(emitted.slice(-16));
}

/**
 * Removes comments, string/template literals and regex literals from a
 * TypeScript source, replacing each removed run with a single space so token
 * boundaries survive.
 */
export function stripCommentsAndLiterals(source: string): string {
  let out = "";
  let lastSignificant = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (ch === "/" && next === "/") {
      i = skipLineComment(source, i);
    } else if (ch === "/" && next === "*") {
      i = skipBlockComment(source, i);
      out += " ";
    } else if (ch === '"' || ch === "'" || ch === "`") {
      i = skipQuoted(source, i, ch);
      out += " ";
    } else if (ch === "/" && opensRegexLiteral(out, lastSignificant)) {
      i = skipRegexLiteral(source, i);
      out += " ";
    } else {
      out += ch;
      if (!/\s/.test(ch)) lastSignificant = ch;
      i += 1;
    }
  }
  return out;
}

/**
 * Removes `function name(` headers so a definition is never mistaken for a call
 * to itself. The `(` is kept so the parameter list still reads as balanced.
 */
export function stripDeclarationHeaders(code: string): string {
  return code.replace(
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*\s*\(/g,
    "function (",
  );
}

/** Reduces a source file to the text a call expression can be searched in. */
export function toExecutableCode(source: string): string {
  return stripDeclarationHeaders(stripCommentsAndLiterals(source));
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `code` contains a call expression for `name`.
 *
 * `code` must already have gone through {@link toExecutableCode}. A member call
 * (`validators.validateFoo(...)`) counts; a bare identifier in an `import` /
 * `export` statement cannot, because those never place a `(` after the name.
 */
export function isInvoked(name: string, code: string): boolean {
  return new RegExp(String.raw`(?<![\w$])${escapeRegExp(name)}\s*\(`).test(code);
}

/**
 * `import` / `export ... from` statements, which name a binding without using
 * it. Literals are already stripped by the time this runs, so the specifier is
 * blank and no `;` can hide inside the clause.
 */
const MODULE_SPECIFIER_STATEMENT_RE = /\b(?:import|export)\b[^;]*?\bfrom\b[^;]*?;/g;

/**
 * Removes `import` / `export ... from` statements so a binding that is only
 * imported or re-exported never reads as a use of the function.
 */
export function stripModuleBindingStatements(code: string): string {
  return code.replace(MODULE_SPECIFIER_STATEMENT_RE, " ");
}

/** Matches `name` standing alone, not as part of a longer identifier. */
function identifierRe(name: string): RegExp {
  return new RegExp(String.raw`(?<![\w$.])${escapeRegExp(name)}(?![\w$])`);
}

/**
 * True when `name` is used as a value in `code` — either called outright or
 * handed to something else (`[validateFoo]`, `run(validateFoo)`), which is how
 * a validator registered in a table is dispatched.
 *
 * `code` must already have gone through {@link stripModuleBindingStatements},
 * otherwise the barrel line `export { validateFoo } from "./foo.js"` counts.
 */
export function isUsedAsValue(name: string, code: string): boolean {
  return identifierRe(name).test(code);
}

/** Collects `import { a as b }` bindings as `alias -> original`. */
export function collectImportAliases(code: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const clauseRe = /\bimport\s+(?:type\s+)?\{([^}]*)\}/g;
  let clause: RegExpExecArray | null;
  while ((clause = clauseRe.exec(code)) !== null) {
    for (const specifier of (clause[1] ?? "").split(",")) {
      const parts = specifier.trim().split(/\s+as\s+/);
      const original = parts[0]?.replace(/^type\s+/, "").trim();
      const alias = parts[1]?.trim();
      if (original !== undefined && original !== "" && alias !== undefined && alias !== "") {
        aliases.set(alias, original);
      }
    }
  }
  return aliases;
}

/** Index just past the bracket matching the one at `open`. */
function matchBracket(code: string, open: number): number {
  const openCh = code[open] ?? "";
  const closeCh = openCh === "(" ? ")" : openCh === "[" ? "]" : "}";
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === openCh) depth += 1;
    else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return code.length;
}

/** Index of the next non-whitespace character at or after `from`. */
function nextSignificant(code: string, from: number): number {
  let i = from;
  while (i < code.length && /\s/.test(code[i] ?? "")) i += 1;
  return i;
}

/**
 * Finds the `{...}` block that follows a declaration header, skipping a return
 * type written as an object type literal (`function f(): { ok: boolean } {`).
 * Returns undefined for a bodyless declaration (an overload signature).
 */
function findBlockBody(code: string, from: number): { start: number; end: number } | undefined {
  let i = from;
  while (i < code.length) {
    const ch = code[i] ?? "";
    if (ch === ";") return undefined;
    if (ch === "{") {
      const end = matchBracket(code, i);
      const after = nextSignificant(code, end);
      if (code[after] === "{") {
        i = after;
        continue;
      }
      return { start: i, end };
    }
    i += 1;
  }
  return undefined;
}

/** `function name(` — the header of a top-level function declaration. */
const FUNCTION_DECLARATION_RE =
  /(?:\bexport\s+)?(?:\bdefault\s+)?(?:\basync\s+)?\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g;

/** `const name =` — a candidate arrow / function-expression binding. */
const VALUE_DECLARATION_RE =
  /(?:\bexport\s+)?\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=/g;

/** A named function body carved out of a module. */
export interface FunctionBody {
  name: string;
  /** The body text, declaration header excluded. */
  code: string;
}

/** A module split into bodies that run only when called, plus the rest. */
export interface ModuleSlices {
  /** Module-level code, which runs as soon as the module is imported. */
  residue: string;
  functions: FunctionBody[];
}

interface Candidate {
  name: string;
  index: number;
  headerEnd: number;
  kind: "function" | "value";
}

function collectCandidates(code: string): Candidate[] {
  const out: Candidate[] = [];
  for (const [re, kind] of [
    [FUNCTION_DECLARATION_RE, "function"],
    [VALUE_DECLARATION_RE, "value"],
  ] as const) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(code)) !== null) {
      const name = match[1];
      if (name !== undefined) {
        out.push({ name, index: match.index, headerEnd: re.lastIndex, kind });
      }
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/**
 * Decides where a `const name = ...` body starts. Only an arrow function or a
 * function expression is carved out; an object literal is left in the residue,
 * because its methods are not gated on the binding being called.
 */
function findValueBody(
  code: string,
  headerEnd: number,
): { start: number; end: number } | undefined {
  let i = nextSignificant(code, headerEnd);
  if (/^async\b/.test(code.slice(i, i + 6))) i = nextSignificant(code, i + 5);
  if (/^function\b/.test(code.slice(i, i + 9))) return findBlockBody(code, i + 8);

  while (i < code.length) {
    const ch = code[i] ?? "";
    if (ch === "(" || ch === "[" || ch === "{") {
      // A parameter list, a generic-free type tuple or an object literal: skip
      // it whole so an `=>` nested inside a default value cannot be mistaken
      // for this binding's own arrow.
      i = matchBracket(code, i);
      continue;
    }
    if (ch === ";") return undefined;
    if (ch === "=" && code[i + 1] === ">") {
      const body = nextSignificant(code, i + 2);
      return code[body] === "{" ? { start: body, end: matchBracket(code, body) } : undefined;
    }
    i += 1;
  }
  return undefined;
}

/**
 * Splits executable code (already comment- and literal-free) into its top-level
 * function bodies and the module-level residue. Nested declarations stay inside
 * the enclosing body: a closure runs only when its parent does.
 */
export function sliceFunctions(code: string): ModuleSlices {
  const functions: FunctionBody[] = [];
  let residue = "";
  let cursor = 0;
  for (const candidate of collectCandidates(code)) {
    if (candidate.index < cursor) continue;
    const body =
      candidate.kind === "function"
        ? findBlockBody(code, candidate.headerEnd)
        : findValueBody(code, candidate.headerEnd);
    if (body === undefined) continue;
    functions.push({ name: candidate.name, code: code.slice(body.start, body.end) });
    // The header stays in the residue (a parameter default does run on every
    // call) but the declared name is blanked out: `const validateFoo = () =>`
    // is a definition, not a use of `validateFoo`.
    residue +=
      code.slice(cursor, candidate.index) +
      code.slice(candidate.index, body.start).replace(identifierRe(candidate.name), " ");
    cursor = body.end;
  }
  residue += code.slice(cursor);
  return { residue, functions };
}

/** A module handed to {@link buildWiringGraph}. */
export interface WiringModule {
  file: string;
  source: string;
}

/** Reachability answers for one entry point. */
export interface WiringGraph {
  /** True when `name` is used from code reachable from the entry module. */
  isCalled(name: string): boolean;
  /** Every function body proved reachable, joined — for diagnostics. */
  reachableCode: string;
}

function prepare(source: string): { slices: ModuleSlices; aliases: Map<string, string> } {
  const executable = stripCommentsAndLiterals(source);
  const aliases = collectImportAliases(executable);
  const withoutBindings = stripModuleBindingStatements(executable);
  const slices = sliceFunctions(withoutBindings);
  return {
    slices: {
      residue: stripDeclarationHeaders(slices.residue),
      functions: slices.functions.map((fn) => ({
        name: fn.name,
        code: stripDeclarationHeaders(fn.code),
      })),
    },
    aliases,
  };
}

/**
 * Builds the set of code reachable from `entry`.
 *
 * `entry` is the pipeline's entry module: all of it counts as reachable. Every
 * module in `imported` contributes its module-level residue immediately, but
 * each of its function bodies only once reachable code uses that function's
 * name — so a validator whose body is never called cannot lend reachability to
 * the validators it calls.
 */
export function buildWiringGraph(entry: WiringModule, imported: WiringModule[]): WiringGraph {
  const entryPrepared = prepare(entry.source);
  const reachable: string[] = [
    entryPrepared.slices.residue,
    ...entryPrepared.slices.functions.map((fn) => fn.code),
  ];
  const aliasesOf = new Map<string, Set<string>>();
  const register = (aliases: Map<string, string>): void => {
    for (const [alias, original] of aliases) {
      const known = aliasesOf.get(original) ?? new Set<string>();
      known.add(alias);
      aliasesOf.set(original, known);
    }
  };
  register(entryPrepared.aliases);

  const pending: FunctionBody[] = [];
  for (const module of imported) {
    const prepared = prepare(module.source);
    register(prepared.aliases);
    reachable.push(prepared.slices.residue);
    pending.push(...prepared.slices.functions);
  }

  const namesFor = (name: string): string[] => [name, ...(aliasesOf.get(name) ?? [])];
  /** A name counts as used when it is called, aliased-and-called, or passed on. */
  const usedIn = (name: string, code: string): boolean =>
    namesFor(name).some(
      (candidate) => isInvoked(candidate, code) || isUsedAsValue(candidate, code),
    );

  let changed = true;
  while (changed) {
    changed = false;
    const corpus = reachable.join("\n");
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const fn = pending[i];
      if (fn === undefined || !usedIn(fn.name, corpus)) continue;
      reachable.push(fn.code);
      pending.splice(i, 1);
      changed = true;
    }
  }

  const corpus = reachable.join("\n");
  return {
    reachableCode: corpus,
    isCalled: (name: string): boolean => usedIn(name, corpus),
  };
}
