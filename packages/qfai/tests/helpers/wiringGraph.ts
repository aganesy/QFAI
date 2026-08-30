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
 * actually execute:
 *
 *   1. {@link stripCommentsAndLiterals} deletes comments, string literals,
 *      template literals and regex literals.
 *   2. {@link stripModuleBindingStatements} deletes `import` / `export … from`
 *      / `export { … };` statements, which publish a binding without running
 *      anything.
 *   3. {@link stripTypeDeclarations} deletes `type X = …;` and
 *      `interface X { … }`, which TypeScript erases entirely.
 *   4. {@link stripDeclarationHeaders} deletes `function name(` headers so a
 *      function's own definition never counts as a use of itself.
 *
 * On top of those, {@link buildWiringGraph} answers the question the guard
 * really asks: is the *caller* itself reachable? Concatenating every module the
 * entry file transitively imports is not enough, because `validators/index.ts`
 * is a barrel that re-exports every validator: a dead validator calling another
 * dead validator would make the second one look wired. The graph therefore
 * splits every module — the entry module included — into its function bodies
 * (parameter list included, since defaults run per call; a nested declaration
 * carved out as a symbol of its own, since a closure runs only when something
 * calls it) plus the module-level residue, and then:
 *
 *   - seeds reachability with every module's residue (top-level code does run
 *     on import) and with the entry module's *exported* functions, which are
 *     the pipeline's real public entry points;
 *   - admits any other function body only once already-reachable code names
 *     that function — calling it, naming it under an `import { x as y }` alias,
 *     or handing it to a dispatch table.
 *
 * Seeding the entry module's non-exported bodies too would defeat the guard it
 * is meant to be: deleting the `runPrototypingValidators(...)` call out of
 * `validateProject` would leave that orchestrator's body queued anyway, and
 * every validator it names would still read as wired. Nesting is the same
 * argument one level down — `validate.ts` declares `runProfileOwnValidators`
 * inside `runProfileValidators`, so leaving the inner body inside the outer
 * chunk would keep the whole `switch` reachable after its one call site is
 * deleted.
 *
 * A name is resolved to the module that owns it before its body is admitted:
 * an import binding is followed through re-export chains ({@link
 * collectModuleBindings}), and an unqualified name first resolves against the
 * *using* module's own declarations. Two modules that both declare `helper`
 * therefore stay apart, instead of a call to the reachable one dragging the
 * dead one's body in. Only when neither route resolves does the walk fall back
 * to admitting every module that declares that name — the "we cannot tell"
 * case, which covers a namespace-import property reference
 * (`validators.validateFoo`) and a helper called without an import edge.
 *
 * Known limitations, all of which err towards a *loud* verdict rather than a
 * silent one:
 *   - a call written inside a template literal (never how a validator is
 *     dispatched) is stripped with the literal and will not be seen;
 *   - a body assigned to something other than a `function` declaration or an
 *     arrow/function-expression `const` (an object-literal method, say) stays
 *     in the residue and is therefore treated as always reachable;
 *   - two functions declared with the same name in one module — a nested helper
 *     and its module-level namesake, say — share one entry, so admitting either
 *     admits both;
 *   - a name mentioned in a type *annotation* rather than a type declaration
 *     (`const slot: typeof validateFoo = …`) still reads as a use; type-only
 *     imports, `type`/`interface` declarations and property names do not.
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
 * Removes comments and regex literals, plus — unless `keepQuoted` — string and
 * template literals. Each removed run becomes a single space so token
 * boundaries survive.
 *
 * `keepQuoted` preserves `"…"` / `'…'` runs verbatim, which is what
 * {@link collectModuleBindings} needs: a module specifier *is* a string
 * literal. Template literals are dropped in both modes, so a multi-line code
 * sample written inside backticks cannot contribute a fake `import` line.
 */
function scanAndStrip(source: string, keepQuoted: boolean): string {
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
    } else if (ch === '"' || ch === "'") {
      const end = skipQuoted(source, i, ch);
      out += keepQuoted ? source.slice(i, end) : " ";
      lastSignificant = ch;
      i = end;
    } else if (ch === "`") {
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
 * Removes comments, string/template literals and regex literals from a
 * TypeScript source, replacing each removed run with a single space so token
 * boundaries survive.
 */
export function stripCommentsAndLiterals(source: string): string {
  return scanAndStrip(source, false);
}

/**
 * Removes comments, template literals and regex literals, keeping quoted
 * strings so module specifiers survive.
 */
export function stripCommentsKeepingQuoted(source: string): string {
  return scanAndStrip(source, true);
}

/**
 * Removes `function name(` headers so a definition is never mistaken for a call
 * to itself. The `(` is kept so the parameter list still reads as balanced.
 */
export function stripDeclarationHeaders(code: string): string {
  return code.replace(
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*\s*(?:<[^<>()]*(?:<[^<>]*>[^<>()]*)*>)?\s*\(/g,
    "function (",
  );
}

/** Reduces a source file to the text a name can be looked for in. */
export function toExecutableCode(source: string): string {
  return stripDeclarationHeaders(
    stripTypeDeclarations(stripModuleBindingStatements(stripCommentsAndLiterals(source))),
  );
}

/**
 * `import` / `export ... from` statements, which name a binding without using
 * it. Literals are already stripped by the time this runs, so the specifier is
 * blank and no `;` can hide inside the clause.
 */
const MODULE_SPECIFIER_STATEMENT_RE = /\b(?:import|export)\b[^;]*?\bfrom\b[^;]*?;/g;

/**
 * `export { name };` — a local re-export, the `from`-less spelling of a barrel
 * line. It publishes a binding without executing anything.
 */
const LOCAL_REEXPORT_STATEMENT_RE = /\bexport\s*\{[^}]*\}\s*;/g;

/**
 * Removes `import` / `export ... from` / `export { ... };` statements, so a
 * binding that is only imported or re-exported never reads as a use of the
 * function it names.
 */
export function stripModuleBindingStatements(code: string): string {
  return code.replace(MODULE_SPECIFIER_STATEMENT_RE, " ").replace(LOCAL_REEXPORT_STATEMENT_RE, " ");
}

/**
 * The head of a `type X …` / `interface X …` declaration. The leading guard
 * keeps `obj.type`, `{ type: "x" }` and `const type = 1` out: a match needs
 * whitespace and a name after the keyword, and must not follow `.` or a word
 * character.
 */
const TYPE_DECLARATION_RE =
  /(?:^|[^\w$.])((?:export\s+)?(?:declare\s+)?(?:type|interface)\s+[A-Za-z_$][\w$]*)/g;

/** End of a `type X = …;` alias: the first `;` outside any bracket group. */
function endOfTypeAlias(code: string, from: number): number {
  let i = from;
  while (i < code.length) {
    const ch = code[i] ?? "";
    if (ch === "(" || ch === "[" || ch === "{") {
      i = matchBracket(code, i);
      continue;
    }
    if (ch === ";") return i + 1;
    i += 1;
  }
  return code.length;
}

/** End of an `interface X … { … }` declaration, or undefined if it has no body. */
function endOfInterface(code: string, from: number): number | undefined {
  for (let i = from; i < code.length; i += 1) {
    if (code[i] === "{") return matchBracket(code, i);
  }
  return undefined;
}

/**
 * Removes `type X = …;` and `interface X … { … }` declarations, which TypeScript
 * erases entirely.
 *
 * Without this a reachable module could vouch for a dead validator purely in the
 * type domain — `type Slot = typeof validateFoo;` names the validator without
 * ever running it. Property *keys* inside such a declaration are handled by
 * {@link identifiersIn} as well, but a member's type annotation
 * (`slot: typeof validateFoo`) is only reachable by dropping the declaration.
 */
export function stripTypeDeclarations(code: string): string {
  let out = "";
  let cursor = 0;
  TYPE_DECLARATION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TYPE_DECLARATION_RE.exec(code)) !== null) {
    const head = match[1] ?? "";
    const start = match.index + match[0].length - head.length;
    if (start < cursor) continue;
    const end = head.includes("interface")
      ? endOfInterface(code, start + head.length)
      : endOfTypeAlias(code, start + head.length);
    if (end === undefined) continue;
    out += `${code.slice(cursor, start)} `;
    cursor = end;
    TYPE_DECLARATION_RE.lastIndex = end;
  }
  return out + code.slice(cursor);
}

/**
 * Characters that, before a `name:`, put the name in a *declaring* position —
 * an object-literal key, an interface or class property, a type member — rather
 * than a value position. A ternary's `cond ? validateFoo : noop` is preceded by
 * `?` and so still reads as a use.
 */
const PROPERTY_NAME_PREDECESSORS = new Set(["", "{", "}", ",", ";"]);

/** Index of the last non-whitespace character before `from`, or -1. */
function previousSignificant(code: string, from: number): number {
  let i = from;
  while (i >= 0 && /\s/.test(code[i] ?? "")) i -= 1;
  return i;
}

/**
 * True when the token spanning `[start, end)` names a property being declared
 * rather than a value being read: `{ validateFoo: noop }`, `validateFoo?: T`,
 * `class X { validateFoo: T }`. The `.`-qualified member of an expression
 * (`validators.validateFoo`) is not one of these — it is followed by `(`, `,`
 * or `]`, never by the `:` this looks for.
 */
function declaresProperty(code: string, start: number, end: number): boolean {
  let after = end;
  while (after < code.length && /\s/.test(code[after] ?? "")) after += 1;
  if (code[after] === "?") after = nextSignificant(code, after + 1);
  if (code[after] !== ":") return false;
  const before = previousSignificant(code, start - 1);
  return PROPERTY_NAME_PREDECESSORS.has(before < 0 ? "" : (code[before] ?? ""));
}

/**
 * Every identifier token in executable code that reads as a *value*.
 *
 * A member name counts (`registry.push(validators.validateFoo)` yields both
 * `validators` and `validateFoo`): a validator handed to a dispatch table
 * through a namespace import is wired, and treating the member name as a use
 * keeps the guard from failing CI over that legitimate shape.
 *
 * A property *declaration* does not. `const registry = { validateFoo: noop };`
 * defines a key that happens to spell a validator's name; counting it would let
 * any reachable module vouch for an unwired validator just by naming a schema
 * or registry key after it. Type-domain tokens are gone before this runs — see
 * {@link stripTypeDeclarations}.
 */
export function identifiersIn(code: string): Set<string> {
  const out = new Set<string>();
  const re = /[A-Za-z_$][\w$]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    if (declaresProperty(code, match.index, re.lastIndex)) continue;
    out.add(match[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Module edges
// ---------------------------------------------------------------------------

/** One end of a module edge: which module, and which name inside it. */
export interface ModuleBinding {
  specifier: string;
  /** The name as the target module exports it; `*` / `default` for those forms. */
  imported: string;
}

/** The runtime module edges of one file. */
export interface ModuleBindings {
  /** Local binding name -> where it comes from, for value imports only. */
  imports: Map<string, ModuleBinding>;
  /** Re-exported name -> where it comes from (`export { a as b } from "x"`). */
  reexports: Map<string, ModuleBinding>;
  /** Specifiers of `export * from "x"`. */
  starReexports: string[];
  /**
   * Every specifier this module evaluates at runtime, in source order: value
   * imports, side-effect imports and re-export edges. `import type` /
   * `export type` are erased at compile time and are deliberately absent — a
   * type-only edge never causes the target module's top-level code to run.
   */
  runtimeSpecifiers: string[];
}

/**
 * An `import`/`export … from` statement at the start of a line.
 *
 * The clause may not contain `;()=:` or a quote, which keeps a non-statement
 * line that merely starts with `export` (`export interface X {` …) from
 * swallowing the next real `from` clause several lines down.
 */
const FROM_STATEMENT_RE =
  /^[ \t]*(import|export)[ \t\r\n]+([^;()=:"'`]*?)\bfrom[ \t]*(["'])([^"'\n]+)\3/gm;

/** `import "./side-effect.js";` — no clause, but the module still runs. */
const SIDE_EFFECT_IMPORT_RE = /^[ \t]*import[ \t]*(["'])([^"'\n]+)\1/gm;

/** One `{ a as b }` entry, minus the inline-`type` specifiers. */
function parseNamedSpecifiers(clause: string): Array<{ imported: string; local: string }> {
  const braces = /\{([^}]*)\}/.exec(clause);
  if (braces === null) return [];
  const out: Array<{ imported: string; local: string }> = [];
  for (const specifier of (braces[1] ?? "").split(",")) {
    const trimmed = specifier.trim();
    if (trimmed === "" || /^type\s/.test(trimmed)) continue;
    const parts = trimmed.split(/\s+as\s+/);
    const imported = parts[0]?.trim() ?? "";
    const local = (parts[1] ?? parts[0])?.trim() ?? "";
    if (imported !== "" && local !== "") out.push({ imported, local });
  }
  return out;
}

/** The `x` of `import x from "y"` / `import x, { … } from "y"`, if present. */
function parseDefaultBinding(clause: string): string | undefined {
  const match = /^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
  return match?.[1];
}

/**
 * True when a clause binds nothing at runtime, so the edge is erased from the
 * emitted JavaScript and never evaluates the target module.
 *
 * `import type { … }` / `export type { … }` are the explicit spelling; the
 * inline one — `import { type Foo } from "./dead.js"` — does not start with
 * `type`, so the clause has to be read specifier by specifier. Anything outside
 * the braces (a default or namespace binding) is a runtime binding and keeps the
 * edge, and an empty clause (`import {} from "x"`) still evaluates the module.
 */
function isTypeOnlyClause(clause: string): boolean {
  if (/^\s*type\b/.test(clause)) return true;
  const braces = /\{([^}]*)\}/.exec(clause);
  if (braces === null) return false;
  const outside = clause.slice(0, braces.index) + clause.slice(braces.index + braces[0].length);
  if (outside.replace(/[,\s]/g, "") !== "") return false;
  const specifiers = (braces[1] ?? "")
    .split(",")
    .map((specifier) => specifier.trim())
    .filter((specifier) => specifier !== "");
  return specifiers.length > 0 && specifiers.every((specifier) => /^type\s/.test(specifier));
}

/** The `ns` of `import * as ns from "y"`, if present. */
function parseNamespaceBinding(clause: string): string | undefined {
  const match = /^\s*\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause);
  return match?.[1];
}

function recordImportClause(bindings: ModuleBindings, clause: string, specifier: string): void {
  const namespace = parseNamespaceBinding(clause);
  if (namespace !== undefined) bindings.imports.set(namespace, { specifier, imported: "*" });
  const defaultBinding = parseDefaultBinding(clause);
  if (defaultBinding !== undefined) {
    bindings.imports.set(defaultBinding, { specifier, imported: "default" });
  }
  for (const { imported, local } of parseNamedSpecifiers(clause)) {
    bindings.imports.set(local, { specifier, imported });
  }
}

function recordExportClause(bindings: ModuleBindings, clause: string, specifier: string): void {
  if (/^\s*\*\s*$/.test(clause)) {
    bindings.starReexports.push(specifier);
    return;
  }
  for (const { imported, local } of parseNamedSpecifiers(clause)) {
    bindings.reexports.set(local, { specifier, imported });
  }
}

/**
 * Collects the module edges that actually exist at runtime.
 *
 * Comments, template literals and regex literals are stripped first, and every
 * statement must start its line, so a specifier mentioned in prose, in a code
 * sample or inside a quoted string cannot become an edge. A clause that binds
 * nothing at runtime is skipped entirely ({@link isTypeOnlyClause}) — both the
 * `import type { X } from "y"` spelling and the inline
 * `import { type X } from "y"` one. Such an edge is erased at compile time, so
 * it neither evaluates the target module's top-level code nor makes a later
 * mention of the binding evidence that a validator executes.
 */
export function collectModuleBindings(source: string): ModuleBindings {
  const code = stripCommentsKeepingQuoted(source);
  const bindings: ModuleBindings = {
    imports: new Map(),
    reexports: new Map(),
    starReexports: [],
    runtimeSpecifiers: [],
  };

  FROM_STATEMENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FROM_STATEMENT_RE.exec(code)) !== null) {
    const keyword = match[1] ?? "";
    const clause = match[2] ?? "";
    const specifier = match[4] ?? "";
    if (isTypeOnlyClause(clause) || specifier === "") continue;
    bindings.runtimeSpecifiers.push(specifier);
    if (keyword === "import") recordImportClause(bindings, clause, specifier);
    else recordExportClause(bindings, clause, specifier);
  }

  SIDE_EFFECT_IMPORT_RE.lastIndex = 0;
  while ((match = SIDE_EFFECT_IMPORT_RE.exec(code)) !== null) {
    const specifier = match[2];
    if (specifier !== undefined && specifier !== "") bindings.runtimeSpecifiers.push(specifier);
  }

  return bindings;
}

// ---------------------------------------------------------------------------
// Function slicing
// ---------------------------------------------------------------------------

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
 * Characters that, immediately after a balanced `{…}`, prove that block was
 * part of the *return type* rather than the implementation body: a union or
 * intersection member (`{ ok } | null`), an array suffix (`{ ok }[]`), a still
 * closing generic argument list (`Promise<{ ok } | null>`, `Map<K, { v }>`), or
 * a second brace (`function f(): { ok } { … }`).
 *
 * Object return types spelled this way are ordinary in `src/` —
 * `mermaidEnforcement.ts` and `integrationSurface.ts` both use them — and
 * mistaking one for the body leaves the real body in the module residue, where
 * it is unconditionally reachable and can vouch for a validator nothing calls.
 */
const TYPE_CONTINUATION_AFTER_BLOCK = new Set(["{", "|", "&", "[", ">", ","]);

/**
 * Finds the `{...}` block that follows a declaration header, skipping the
 * parameter list (whose destructuring patterns are braces of their own) and any
 * object type literal that belongs to the return type, however much union,
 * intersection or generic syntax surrounds it. Returns undefined for a bodyless
 * declaration (an overload signature).
 */
function findBlockBody(code: string, from: number): { start: number; end: number } | undefined {
  let i = from;
  while (i < code.length) {
    const ch = code[i] ?? "";
    if (ch === ";") return undefined;
    if (ch === "(") {
      i = matchBracket(code, i);
      continue;
    }
    if (ch === "{") {
      const end = matchBracket(code, i);
      const after = nextSignificant(code, end);
      if (TYPE_CONTINUATION_AFTER_BLOCK.has(code[after] ?? "")) {
        i = after;
        continue;
      }
      return { start: i, end };
    }
    i += 1;
  }
  return undefined;
}

/**
 * `function name(` — the header of a top-level function declaration, with the
 * optional type-parameter list of a generic (`function name<T extends X>(`)
 * consumed so a generic helper's body is carved out like any other.
 */
const FUNCTION_DECLARATION_RE =
  /(?:\bexport\s+)?(?:\bdefault\s+)?(?:\basync\s+)?\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^<>()]*(?:<[^<>]*>[^<>()]*)*>)?\s*\(/g;

/** `const name =` — a candidate arrow / function-expression binding. */
const VALUE_DECLARATION_RE =
  /(?:\bexport\s+)?\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=/g;

/** A named function body carved out of a module. */
export interface FunctionBody {
  name: string;
  /** The body text, declaration header excluded. */
  code: string;
  /** True when the declaration carries `export` — a public entry point. */
  exported: boolean;
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
  exported: boolean;
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
        out.push({
          name,
          index: match.index,
          headerEnd: re.lastIndex,
          kind,
          exported: /^\s*export\b/.test(match[0]),
        });
      }
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/**
 * End of an expression-bodied arrow: the first `;` or `,` outside any bracket
 * group. Reaching the end of the file without one takes the rest of the module,
 * which errs towards reporting a wired validator as unwired rather than the
 * other way round.
 */
function findExpressionEnd(code: string, from: number): number {
  let i = from;
  while (i < code.length) {
    const ch = code[i] ?? "";
    if (ch === "(" || ch === "[" || ch === "{") {
      i = matchBracket(code, i);
      continue;
    }
    if (ch === ";" || ch === ",") return i;
    i += 1;
  }
  return code.length;
}

/**
 * Decides where a `const name = ...` body starts. Only an arrow function or a
 * function expression is carved out; an object literal is left in the residue,
 * because its methods are not gated on the binding being called.
 *
 * Both arrow spellings are carved out. An expression body
 * (`const unused = () => validateFoo(root);`) runs exactly when the binding is
 * called, so leaving it in the residue would make every validator such a
 * one-liner names look wired even when nothing calls the binding.
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
      return code[body] === "{"
        ? { start: body, end: matchBracket(code, body) }
        : { start: body, end: findExpressionEnd(code, body) };
    }
    i += 1;
  }
  return undefined;
}

/**
 * Blanks the name of a leading `function name(` so the recursive carve does not
 * mistake a `const x = function name(…) {…}` binding's own function expression
 * for a symbol nested inside it — which would leave the binding's slice empty
 * and gate its body on the inner name being used instead of on `x` being
 * called. The name is replaced by spaces so the chunk's length is unchanged.
 */
function anonymizeLeadingFunction(chunk: string): string {
  const match = /^(\s*(?:async\s+)?function\s*\*?\s*)([A-Za-z_$][\w$]*)/.exec(chunk);
  if (match === null) return chunk;
  const head = match[1] ?? "";
  const name = match[2] ?? "";
  return head + " ".repeat(name.length) + chunk.slice(head.length + name.length);
}

/**
 * Carves every function body out of `code`, appending each — and every function
 * nested inside it — to `out`, and returns the code left over.
 *
 * A nested declaration is a symbol of its own, not part of the enclosing body:
 * `validate.ts` declares `runProfileOwnValidators` inside `runProfileValidators`,
 * and reaching the outer function must not admit an inner body nothing invokes.
 * Otherwise deleting the inner call would leave every validator it names reading
 * as wired — exactly the disconnection this guard exists to catch.
 */
function carveFunctions(code: string, out: FunctionBody[]): string {
  let residue = "";
  let cursor = 0;
  for (const candidate of collectCandidates(code)) {
    if (candidate.index < cursor) continue;
    // For a declaration headerEnd sits just past the `(`, so step back onto it:
    // the parameter list is then skipped whole when the body block is located,
    // and a destructured parameter cannot be mistaken for that block.
    const chunkStart =
      candidate.kind === "function" ? candidate.headerEnd - 1 : candidate.headerEnd;
    const body =
      candidate.kind === "function"
        ? findBlockBody(code, chunkStart)
        : findValueBody(code, chunkStart);
    if (body === undefined) continue;
    const nested: FunctionBody[] = [];
    const own = carveFunctions(anonymizeLeadingFunction(code.slice(chunkStart, body.end)), nested);
    out.push({ name: candidate.name, code: own, exported: candidate.exported }, ...nested);
    residue += code.slice(cursor, candidate.index);
    cursor = body.end;
  }
  return residue + code.slice(cursor);
}

/**
 * Splits executable code (already comment- and literal-free) into named
 * function bodies — nested ones included, each as an independent symbol — and
 * the module-level residue.
 *
 * The parameter list travels with the body, not with the residue: a default
 * argument (`function unused(value = validateFoo()) {}`) is evaluated per call,
 * so it must not make `validateFoo` reachable while `unused` itself is dead.
 * The declared name is left out of both, so a definition is never a use of
 * itself.
 */
export function sliceFunctions(code: string): ModuleSlices {
  const functions: FunctionBody[] = [];
  const residue = carveFunctions(code, functions);
  return { residue, functions };
}

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

/** A module handed to {@link buildWiringGraph}. */
export interface WiringModule {
  file: string;
  source: string;
}

/** Reachability answers for one entry point. */
export interface WiringGraph {
  /** True when `name` is used from code reachable from the entry module. */
  isCalled(name: string): boolean;
  /** Every name used by reachable code — for diagnostics. */
  usedNames: ReadonlySet<string>;
}

interface PreparedModule {
  file: string;
  residue: string;
  /** Declared name -> its bodies (a name may be declared more than once). */
  bodies: Map<string, string[]>;
  exportedFunctions: string[];
  bindings: ModuleBindings;
}

/** Collapses `\` and `.`/`..` segments so two spellings of a path compare equal. */
function normalizeModulePath(file: string): string {
  const parts = file.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === ".." && out.length > 1) {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

function prepareModule(module: WiringModule): PreparedModule {
  const executable = stripCommentsAndLiterals(module.source);
  const slices = sliceFunctions(stripTypeDeclarations(stripModuleBindingStatements(executable)));
  const bodies = new Map<string, string[]>();
  const exportedFunctions: string[] = [];
  for (const fn of slices.functions) {
    const existing = bodies.get(fn.name) ?? [];
    existing.push(stripDeclarationHeaders(fn.code));
    bodies.set(fn.name, existing);
    if (fn.exported) exportedFunctions.push(fn.name);
  }
  return {
    file: normalizeModulePath(module.file),
    residue: stripDeclarationHeaders(slices.residue),
    bodies,
    exportedFunctions,
    bindings: collectModuleBindings(module.source),
  };
}

/**
 * Builds the set of names reachable from `entry`.
 *
 * `entry` contributes its module-level residue and its exported functions —
 * the pipeline's public entry points. Every module in `imported` contributes
 * its residue only (that code runs on import); every other function body, in
 * the entry module as much as in an imported one, joins the walk only once
 * reachable code names it. A validator whose body is never called therefore
 * cannot lend reachability to the validators it calls, and neither can an
 * orchestrator inside the entry module that nothing calls any more.
 *
 * The walk is a worklist over chunks rather than a rescan of a growing corpus:
 * each chunk is tokenised once, which keeps a whole `src/` graph linear.
 */
export function buildWiringGraph(entry: WiringModule, imported: WiringModule[]): WiringGraph {
  const prepared = [entry, ...imported].map((module) => prepareModule(module));
  const modules = new Map<string, PreparedModule>();
  const declaredIn = new Map<string, string[]>();
  for (const module of prepared) {
    modules.set(module.file, module);
    for (const name of module.bodies.keys()) {
      const files = declaredIn.get(name) ?? [];
      files.push(module.file);
      declaredIn.set(name, files);
    }
  }

  /** Resolves a relative specifier against the modules actually in the graph. */
  const resolveSpecifier = (fromFile: string, specifier: string): string | undefined => {
    if (!specifier.startsWith(".")) return undefined;
    const base = normalizeModulePath(
      `${fromFile.slice(0, fromFile.lastIndexOf("/"))}/${specifier}`,
    );
    for (const candidate of [
      base.replace(/\.js$/, ".ts"),
      base,
      `${base}.ts`,
      `${base}/index.ts`,
    ]) {
      if (modules.has(candidate)) return candidate;
    }
    return undefined;
  };

  const used = new Set<string>();
  const queue: Array<{ file: string; code: string }> = prepared.map((module) => ({
    file: module.file,
    code: module.residue,
  }));
  const visited = new Set<string>();
  const admitted = new Set<string>();

  const admit = (file: string, name: string): boolean => {
    const bodies = modules.get(file)?.bodies.get(name);
    if (bodies === undefined) return false;
    const key = `${file} ${name}`;
    if (admitted.has(key)) return true;
    admitted.add(key);
    for (const code of bodies) queue.push({ file, code });
    return true;
  };

  /** Admits every module that declares `name` — the "cannot resolve it" case. */
  const admitByName = (name: string): void => {
    for (const file of declaredIn.get(name) ?? []) admit(file, name);
  };

  const markUsed = (file: string, name: string): void => {
    const key = `${file} ${name}`;
    if (visited.has(key)) return;
    visited.add(key);
    used.add(name);

    const module = modules.get(file);
    const binding = module?.bindings.imports.get(name) ?? module?.bindings.reexports.get(name);
    if (binding !== undefined && binding.imported !== "*" && binding.imported !== "default") {
      // `import { validateFoo as runFoo }` — using the alias uses the real one,
      // through however many barrels the re-export chain runs.
      used.add(binding.imported);
      const target = resolveSpecifier(file, binding.specifier);
      if (target !== undefined) {
        markUsed(target, binding.imported);
        return;
      }
      admitByName(binding.imported);
      return;
    }

    if (module !== undefined && admit(file, name)) return;

    for (const specifier of module?.bindings.starReexports ?? []) {
      const target = resolveSpecifier(file, specifier);
      if (target !== undefined && modules.get(target)?.bodies.has(name) === true) {
        markUsed(target, name);
        return;
      }
    }

    admitByName(name);
  };

  const entryFile = normalizeModulePath(entry.file);
  for (const name of modules.get(entryFile)?.exportedFunctions ?? []) markUsed(entryFile, name);

  while (queue.length > 0) {
    const chunk = queue.pop();
    if (chunk === undefined) continue;
    for (const name of identifiersIn(chunk.code)) markUsed(chunk.file, name);
  }

  return {
    usedNames: used,
    isCalled: (name: string): boolean => used.has(name),
  };
}
