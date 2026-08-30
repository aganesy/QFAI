/**
 * The gate surface of the prototyping profile: every rule code that can reach
 * the exploration post-filter, and at which severity.
 *
 * `relaxIssuesForMode` has exactly one production call site —
 * `runPrototypingValidators` in `core/validate.ts` — so "reaches the
 * post-filter" is decidable: it is the set of `Issue`s produced by functions
 * transitively referenced from that one function. This module derives that set
 * from the sources so the allowlists in `core/prototyping/mode.ts` can be
 * checked for COMPLETENESS instead of for plausibility.
 *
 * Why a call graph and not a directory glob: a validator whose file sits under
 * `validators/prototyping/` but which nothing invokes emits nothing at run
 * time, so listing its codes as "gates that stay hard" describes a gate that
 * does not exist. Conversely a validator outside that directory — the UI/UX
 * and discussion-pack families — does run in this profile, and its errors are
 * real gates. Reachability, not file location, is the property that matters.
 *
 * Blind spots are reported rather than dropped: a code argument that is not a
 * literal or a module-level `const` lands in `dynamicSites`, so the caller can
 * pin it and fail when a new one appears. That mirrors
 * `tests/validators/ruleCodeUniqueness.test.ts`, which pins the same three
 * sites for the same reason.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** tests/helpers/<this file> -> packages/qfai */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcRoot = path.join(packageRoot, "src");
const entryFile = path.join(srcRoot, "core", "validate.ts");

/** The one function whose result is handed to `relaxIssuesForMode`. */
const ENTRY_FUNCTION = "runPrototypingValidators";

/** Shape of a rule code, used to ignore non-code string literals. */
const RULE_CODE = /^[A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+$/;

const SEVERITIES: ReadonlySet<string> = new Set(["error", "warning", "info"]);

/** `const NAME = "CODE";` / `export const NAME: string = "CODE"` */
const CONST_DECL =
  /(?:^|\n)[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*(?::[^=\n]+)?=[ \t]*"([^"\n]+)"/g;

/** A named import/re-export binding: `{ a, b as c } from "./x.js"`. */
type Binding = { readonly spec: string; readonly name: string };

type FunctionDef = { readonly body: string; readonly params: readonly string[] };

type Module = {
  readonly source: string;
  readonly defs: Map<string, FunctionDef>;
  readonly imports: Map<string, Binding>;
  readonly reexports: Map<string, Binding>;
  readonly stars: string[];
  readonly consts: Map<string, string>;
};

/** A resolved function: the file that defines it and its name there. */
type Ref = { readonly file: string; readonly name: string };

/** rule code -> every severity it is emitted at across the reachable emitters. */
export type Emissions = ReadonlyMap<string, ReadonlySet<string>>;

export type GateSurface = {
  readonly emissions: Emissions;
  /** `<package-relative file>#<function>` for every reachable function. */
  readonly reached: ReadonlySet<string>;
  /** package-relative module -> `code expression -> call-site count`. */
  readonly dynamicSites: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** package-relative module with a dynamic site -> its rule-code literals. */
  readonly dynamicSiteCodes: ReadonlyMap<string, readonly string[]>;
};

/**
 * Blank out comments, preserving offsets and line structure, so a code merely
 * NAMED in prose is never counted as emitted. String and template literals are
 * tracked so a `//` inside a string is not mistaken for a comment.
 */
export function stripComments(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else {
      const consumed = copyStringLiteral(source, i, (text) => (out += text));
      i += consumed;
    }
  }
  return out;
}

/** Copy one char, or a whole string/template literal, to `sink`. */
function copyStringLiteral(source: string, start: number, sink: (text: string) => void): number {
  const quote = source[start] ?? "";
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    sink(quote);
    return 1;
  }
  let j = start + 1;
  while (j < source.length) {
    if (source[j] === "\\") {
      j += 2;
      continue;
    }
    if (source[j] === quote) {
      j += 1;
      break;
    }
    j += 1;
  }
  sink(source.slice(start, j));
  return j - start;
}

/** Index of the `}` closing the `{` at `open`. */
function matchBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      i += copyStringLiteral(source, i, () => {}) - 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

/**
 * Index of the `{` that opens a function body: the first brace at
 * paren/bracket depth 0 after the signature. Returns -1 for an overload
 * signature or an expression-bodied arrow, which carry no statements to scan.
 */
function findBodyStart(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      i += copyStringLiteral(source, i, () => {}) - 1;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (ch === "{") {
      if (depth === 0) return i;
      depth += 1;
    } else if (ch === "}") depth -= 1;
    else if (ch === ";" && depth === 0) return -1;
  }
  return -1;
}

/**
 * Split the top-level, comma-separated arguments of the call whose `(` sits at
 * `open`. Quote/template/bracket aware, so a message containing `, "error",`
 * or a `${JSON.stringify(x)}` hole cannot be mistaken for an argument break.
 */
export function splitCallArgs(source: string, open: number): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      const consumed = copyStringLiteral(source, i, (text) => (current += text));
      i += consumed - 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      if (depth > 1) current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return args;
      }
      current += ch;
    } else if (ch === "," && depth === 1) {
      args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  return args;
}

/** Parameter names of the signature whose `(` sits at `open`. */
function parseParams(source: string, open: number): string[] {
  return splitCallArgs(source, open)
    .map((raw) => /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)/.exec(raw)?.[1] ?? "")
    .filter((name) => name.length > 0);
}

async function walkTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkTsFiles(full)));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) files.push(full);
  }
  return files;
}

/** `function NAME(` and `const NAME = (` / `= async (` / `= function`. */
const FUNCTION_DECL = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[(<]/g;
const CONST_FUNCTION =
  /(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*(?:async\s+)?(?:function\b\s*)?[(<]/g;

function parseFunctionDefs(source: string): Map<string, FunctionDef> {
  const defs = new Map<string, FunctionDef>();
  for (const pattern of [FUNCTION_DECL, CONST_FUNCTION]) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      const signatureEnd = match.index + match[0].length - 1;
      const parenOpen = source.lastIndexOf("(", signatureEnd);
      if (name === undefined || defs.has(name)) continue;
      const bodyStart = findBodyStart(source, signatureEnd);
      if (bodyStart < 0) continue;
      defs.set(name, {
        body: source.slice(bodyStart, matchBrace(source, bodyStart) + 1),
        params: parenOpen >= 0 ? parseParams(source, parenOpen) : [],
      });
    }
  }
  return defs;
}

/** Named bindings of one `import {…} from "…"` / `export {…} from "…"` clause. */
function parseBindings(clause: string, spec: string): Array<[string, Binding]> {
  const bindings: Array<[string, Binding]> = [];
  for (const part of clause.split(",")) {
    const token = part.trim();
    if (token.length === 0 || token.startsWith("type ")) continue;
    const aliased = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(token);
    if (aliased?.[1] !== undefined && aliased[2] !== undefined) {
      bindings.push([aliased[2], { spec, name: aliased[1] }]);
    } else if (/^[\w$]+$/.test(token)) {
      bindings.push([token, { spec, name: token }]);
    }
  }
  return bindings;
}

function parseModule(source: string): Module {
  const imports = new Map<string, Binding>();
  const reexports = new Map<string, Binding>();
  const stars: string[] = [];
  const consts = new Map<string, string>();

  for (const match of source.matchAll(/import\s+\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    if (match[1] === undefined || match[2] === undefined) continue;
    for (const [local, binding] of parseBindings(match[1], match[2])) imports.set(local, binding);
  }
  for (const match of source.matchAll(/export\s+\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    if (match[1] === undefined || match[2] === undefined) continue;
    for (const [local, binding] of parseBindings(match[1], match[2])) reexports.set(local, binding);
  }
  for (const match of source.matchAll(/export\s+\*\s+from\s*["']([^"']+)["']/g)) {
    if (match[1] !== undefined) stars.push(match[1]);
  }
  for (const match of source.matchAll(CONST_DECL)) {
    if (match[1] !== undefined && match[2] !== undefined) consts.set(match[1], match[2]);
  }

  return { source, defs: parseFunctionDefs(source), imports, reexports, stars, consts };
}

async function loadModules(): Promise<Map<string, Module>> {
  const modules = new Map<string, Module>();
  for (const file of await walkTsFiles(srcRoot)) {
    modules.set(file, parseModule(stripComments(await readFile(file, "utf-8"))));
  }
  return modules;
}

function resolveSpecifier(modules: Map<string, Module>, from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), spec.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    if (modules.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve an identifier used in `file` to the function that defines it,
 * following named imports and re-export barrels. A name that resolves to no
 * function definition (a type, a value, a built-in) yields null.
 */
function resolveRef(
  modules: Map<string, Module>,
  file: string,
  name: string,
  seen: Set<string> = new Set(),
): Ref | null {
  const key = `${file}#${name}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const module = modules.get(file);
  if (module === undefined) return null;

  const imported = module.imports.get(name);
  if (imported !== undefined) {
    const target = resolveSpecifier(modules, file, imported.spec);
    return target === null ? null : resolveRef(modules, target, imported.name, seen);
  }
  if (module.defs.has(name)) return { file, name };
  const reexported = module.reexports.get(name);
  if (reexported !== undefined) {
    const target = resolveSpecifier(modules, file, reexported.spec);
    return target === null ? null : resolveRef(modules, target, reexported.name, seen);
  }
  for (const spec of module.stars) {
    const target = resolveSpecifier(modules, file, spec);
    const found = target === null ? null : resolveRef(modules, target, name, seen);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Every function transitively referenced from the entry function.
 *
 * Any identifier is an edge, not only `name(` call syntax: the canonical UI/UX
 * aggregate collects its validators as bare references
 * (`const validators = [validateClassification, …]`) and dispatches them
 * through a local variable, so a call-syntax-only walk misses that whole
 * family.
 */
function buildReachable(modules: Map<string, Module>): Set<string> {
  const reached = new Set<string>([`${entryFile}#${ENTRY_FUNCTION}`]);
  const queue: Ref[] = [{ file: entryFile, name: ENTRY_FUNCTION }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    const def = modules.get(current.file)?.defs.get(current.name);
    if (def === undefined) continue;
    for (const match of def.body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      if (match[1] === undefined) continue;
      const ref = resolveRef(modules, current.file, match[1]);
      if (ref === null) continue;
      const key = `${ref.file}#${ref.name}`;
      if (reached.has(key)) continue;
      reached.add(key);
      queue.push(ref);
    }
  }
  return reached;
}

/** Argument positions of a function that builds an `Issue` from its params. */
type IssueFactory = { readonly codeIndex: number; readonly severityIndex: number };

/**
 * A function whose body binds an object literal's `code` and `severity` to its
 * own parameters is an `Issue` factory.
 *
 * One rule covers both emission styles in the tree: `validators/utils.ts`'s
 * shared `issue(code, message, severity, …)` helper, and the per-module
 * wrappers (`classificationIssue(code, message, severity, …)`) that build the
 * object directly. A scan that only knew `issue()` recorded nothing for the
 * canonical UI/UX validators, which use wrappers exclusively.
 */
function inferIssueFactory(def: FunctionDef | undefined): IssueFactory | null {
  if (def === undefined) return null;
  const codeName = /(?:^|[\s,{])code\s*(?::\s*([A-Za-z_$][\w$]*))?\s*[,}]/.exec(def.body);
  const severityName = /(?:^|[\s,{])severity\s*(?::\s*([A-Za-z_$][\w$]*))?\s*[,}]/.exec(def.body);
  if (codeName === null || severityName === null) return null;
  const codeIndex = def.params.indexOf(codeName[1] ?? "code");
  const severityIndex = def.params.indexOf(severityName[1] ?? "severity");
  if (codeIndex < 0 || severityIndex < 0) return null;
  return { codeIndex, severityIndex };
}

/** A string literal, or a module-level `const` alias for one. */
function resolveLiteral(expression: string | undefined, module: Module): string | undefined {
  const trimmed = (expression ?? "").trim();
  const quoted = /^(["'])([^"'\n]*)\1$/.exec(trimmed);
  return quoted?.[2] ?? module.consts.get(trimmed);
}

/** The object literal enclosing `index`, used to pair `code:` with `severity:`. */
function enclosingObject(body: string, index: number): string {
  let depth = 0;
  for (let i = index; i >= 0; i -= 1) {
    const ch = body[i] ?? "";
    if (ch === "}") depth += 1;
    else if (ch === "{") {
      if (depth === 0) return body.slice(i, matchBrace(body, i) + 1);
      depth -= 1;
    }
  }
  return "";
}

type Recorder = (code: string, severity: string) => void;

/** Emissions made by calling an inferred `Issue` factory. */
function scanFactoryCalls(
  modules: Map<string, Module>,
  ref: Ref,
  def: FunctionDef,
  record: Recorder,
  dynamic: Map<string, number>,
): void {
  const module = modules.get(ref.file);
  if (module === undefined) return;
  for (const call of def.body.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (call[1] === undefined) continue;
    const callee = resolveRef(modules, ref.file, call[1]);
    const factory = inferIssueFactory(
      callee === null ? undefined : modules.get(callee.file)?.defs.get(callee.name),
    );
    if (factory === null) continue;
    const args = splitCallArgs(def.body, call.index + call[0].length - 1);
    const code = resolveLiteral(args[factory.codeIndex], module);
    if (code === undefined) {
      const expression = (args[factory.codeIndex] ?? "").trim();
      dynamic.set(expression, (dynamic.get(expression) ?? 0) + 1);
      continue;
    }
    const severity = resolveLiteral(args[factory.severityIndex], module);
    if (RULE_CODE.test(code) && severity !== undefined && SEVERITIES.has(severity)) {
      record(code, severity);
    }
  }
}

/** Emissions written as an `Issue` object literal rather than a factory call. */
function scanObjectLiterals(def: FunctionDef, record: Recorder): void {
  for (const match of def.body.matchAll(/(?:^|[\s,{(])code:\s*"([^"\n]*)"/g)) {
    const code = match[1];
    if (code === undefined || !RULE_CODE.test(code)) continue;
    const severity = /severity:\s*"(error|warning|info)"/.exec(
      enclosingObject(def.body, match.index),
    );
    if (severity?.[1] !== undefined) record(code, severity[1]);
  }
}

/** Every rule-code literal in a module, for a dynamic site's reachable set. */
function harvestCodeLiterals(module: Module): string[] {
  const codes = new Set<string>();
  for (const match of module.source.matchAll(/"([^"\n]+)"/g)) {
    if (match[1] !== undefined && RULE_CODE.test(match[1])) codes.add(match[1]);
  }
  return [...codes].sort();
}

/**
 * The complete gate surface of the prototyping profile, derived from the
 * sources rather than declared.
 *
 * `core/prototyping/mode.ts` is deliberately absent from the graph — it is
 * reached only through a dynamic `import()`, which this walker does not
 * follow — so the constants under test cannot back their own entries.
 */
export async function collectPrototypingGateSurface(): Promise<GateSurface> {
  const modules = await loadModules();
  const reached = buildReachable(modules);

  const emissions = new Map<string, Set<string>>();
  const dynamicSites = new Map<string, ReadonlyMap<string, number>>();
  const dynamicSiteCodes = new Map<string, readonly string[]>();

  for (const key of reached) {
    const separator = key.lastIndexOf("#");
    const ref: Ref = { file: key.slice(0, separator), name: key.slice(separator + 1) };
    const def = modules.get(ref.file)?.defs.get(ref.name);
    const module = modules.get(ref.file);
    if (def === undefined || module === undefined) continue;

    const record: Recorder = (code, severity) => {
      const seen = emissions.get(code) ?? new Set<string>();
      seen.add(severity);
      emissions.set(code, seen);
    };
    const relative = path.relative(srcRoot, ref.file).replace(/\\/g, "/");
    const dynamic = new Map<string, number>(dynamicSites.get(relative) ?? []);

    scanFactoryCalls(modules, ref, def, record, dynamic);
    scanObjectLiterals(def, record);

    if (dynamic.size > 0) {
      dynamicSites.set(relative, dynamic);
      dynamicSiteCodes.set(relative, harvestCodeLiterals(module));
    }
  }

  return {
    emissions,
    reached: new Set([...reached].map((key) => path.relative(packageRoot, key))),
    dynamicSites,
    dynamicSiteCodes,
  };
}

/** Rule codes the reachable emitters produce at `error` severity, sorted. */
export function codesEmittedAtError(surface: GateSurface): string[] {
  return [...surface.emissions.entries()]
    .filter(([, severities]) => severities.has("error"))
    .map(([code]) => code)
    .sort();
}

/** Whether a named function is reachable from the post-filter's entry point. */
export function reachesFunction(surface: GateSurface, name: string): boolean {
  return [...surface.reached].some((key) => key.endsWith(`#${name}`));
}
