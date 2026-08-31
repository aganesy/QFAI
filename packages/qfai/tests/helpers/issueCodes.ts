import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * What the source tree says about one issue code, aggregated over every
 * emission site that raises it — `issue(...)` / `makeIssue(...)` calls and
 * object literals that build an `Issue` inline.
 */
export type IssueCodeUsage = {
  /** At least one emission site can raise the code at `error` severity. */
  errorCapable: boolean;
  /**
   * Every error-capable emission site passes its own `suggested_action`.
   * Aggregating with AND (not OR) is deliberate: one call site that carries a
   * remediation says nothing about the other call sites of the same code, and
   * those are exactly the paths that would print the generic `fix` line.
   */
  everyErrorSiteHasSuggestedAction: boolean;
};

/** One place in the source that constructs an `Issue` with a statically known code. */
type EmissionSite = {
  code: string;
  errorCapable: boolean;
  hasSuggestedAction: boolean;
};

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/** Skip a string / template literal starting at `start`; returns the index of its closing quote. */
function skipString(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i;
    }
    i++;
  }
  return source.length;
}

/** The members of a bracketed list plus the index of its closing bracket. */
type BalancedList = { members: string[]; end: number };

/**
 * Split the top-level members of the bracketed list whose opening bracket sits
 * at `open` — call arguments for `(`, object properties for `{`.
 * Returns `null` when the list is not balanced (a truncated or malformed file).
 */
function splitBalancedList(source: string, open: number): BalancedList | null {
  const members: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) return null;
      i = end + 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        members.push(source.slice(start, i).trim());
        return { members, end: i };
      }
      continue;
    }
    if (ch === "," && depth === 1) {
      members.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  return null;
}

/** Parse the members of an object literal / parameter list into name → value. */
function readProperties(members: readonly string[]): Map<string, string> {
  const properties = new Map<string, string>();
  for (const member of members) {
    const property = PROPERTY_RE.exec(member);
    if (!property) continue;
    properties.set(property[1], (property[2] ?? property[1]).trim());
  }
  return properties;
}

/**
 * Index of the `{` that opens the innermost object/block still open at `index`,
 * or `null` when `index` sits at the top level.
 */
function findEnclosingBrace(source: string, index: number): number | null {
  const open: number[] = [];
  for (let i = 0; i < index; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i);
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) return null;
      i = end + 1;
      continue;
    }
    if (ch === "{") {
      open.push(i);
    } else if (ch === "}") {
      open.pop();
    }
  }
  return open.length > 0 ? open[open.length - 1] : null;
}

const ISSUE_CALL_RE = /\b(issue|makeIssue)\(/g;
const OBJECT_CODE_RE =
  /(?:^|[\s{,(])code:\s*(?=("[A-Za-z][A-Za-z0-9_-]*"|[A-Za-z_$][A-Za-z0-9_$.]*))/g;
const PROPERTY_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::([\s\S]*))?$/;
const CODE_LITERAL_RE = /^"([A-Za-z][A-Za-z0-9_-]*)"$/;
const CODE_VALUE_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const CONST_STRING_RE =
  /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*"([^"\\\n]*)"(?:\s+as\s+const)?\s*;/g;
const CONST_OBJECT_RE = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\{/g;
const FUNCTION_DECL_RE = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
const ISSUE_RETURN_TYPE_RE = /^\s*:\s*Issue\s*\{/;
const RETURN_OBJECT_RE = /\breturn\s*\{/;
const PARAM_NAME_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)/;
const DECLARATION_PREFIX_RE = /\bfunction\s+$/;
const MEMBER_ACCESS_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)$/;
/** A function body opening after an optional return-type annotation. */
const BODY_START_RE = /^\s*(?::[^{;=]*)?\{/;
/** Helpers whose argument layout this module knows first-hand. */
const HARDCODED_HELPERS = new Set(["issue", "makeIssue"]);
const SEVERITY_ARG_INDEX = 2;
const SUGGESTED_ACTION_ARG_INDEX = 7;
const NON_ERROR_SEVERITY_RE = /^"(?:warning|info)"$/;

function isPresentValue(value: string): boolean {
  return value !== "" && value !== "undefined";
}

/**
 * File-local `const` bindings whose value is a plain string: `NAME` for
 * `const NAME = "CODE";`, and `NAME.key` for a `const NAME = { key: "CODE" }`
 * code table. Emitters routinely name their code once at module scope and pass
 * the binding to `issue(...)`, so a census that only reads string literals
 * misses them entirely.
 *
 * Resolution is deliberately confined to the file being scanned: a code
 * imported from another module would need real module resolution, and no
 * emission site in `src/` does that today.
 */
function readStringConstants(source: string): Map<string, string> {
  const constants = new Map<string, string>();
  for (const match of source.matchAll(CONST_STRING_RE)) {
    constants.set(match[1], match[2]);
  }
  for (const match of source.matchAll(CONST_OBJECT_RE)) {
    if (match.index === undefined) continue;
    const brace = match.index + match[0].length - 1;
    const table = splitBalancedList(source, brace);
    if (table === null) continue;
    for (const member of table.members) {
      const property = PROPERTY_RE.exec(member);
      if (!property || property[2] === undefined) continue;
      const literal = CODE_LITERAL_RE.exec(property[2].trim());
      if (literal) {
        constants.set(`${match[1]}.${property[1]}`, literal[1]);
      }
    }
  }
  return constants;
}

/**
 * The issue code a `code` argument / property denotes: the literal itself, or
 * the value of the file-local constant it names. `null` when the token is a
 * runtime expression (`error.code`, `group.code`) whose code is not decidable
 * from the source text.
 */
function resolveCodeToken(token: string, constants: Map<string, string>): string | null {
  const trimmed = token.trim();
  const literal = CODE_LITERAL_RE.exec(trimmed);
  if (literal) {
    return literal[1];
  }
  const resolved = constants.get(trimmed);
  return resolved !== undefined && CODE_VALUE_RE.test(resolved) ? resolved : null;
}

/**
 * Emission sites of the form `issue(CODE, ...)` / `makeIssue(CODE, ...)`, where
 * `CODE` is a string literal or a file-local constant holding one.
 */
function readCallSites(source: string, constants: Map<string, string>): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const match of source.matchAll(ISSUE_CALL_RE)) {
    const helper = match[1];
    if (match.index === undefined) continue;
    const openParen = match.index + match[0].length - 1;
    const args = splitBalancedList(source, openParen)?.members;
    const code = resolveCodeToken(args?.[0] ?? "", constants);
    // A helper declaration (`function issue(code: string, ...)`) and a call that
    // computes its code both land here with nothing to resolve; neither names a
    // code the census can account for.
    if (code === null) continue;
    // `makeIssue` has no severity parameter and always produces an error.
    const severity = helper === "makeIssue" ? '"error"' : (args?.[SEVERITY_ARG_INDEX] ?? "");
    const suggested = args?.[SUGGESTED_ACTION_ARG_INDEX] ?? "";
    sites.push({
      code,
      // A computed severity expression is treated as error-capable: the catalog
      // requirement should err towards demanding metadata, not towards skipping it.
      errorCapable: !NON_ERROR_SEVERITY_RE.test(severity),
      hasSuggestedAction: isPresentValue(suggested),
    });
  }
  return sites;
}

/**
 * Emission sites of the form `{ code: CODE, severity: ..., category: ..., ... }`.
 * An object literal counts as an `Issue` only when it names both `severity` and
 * `category` directly. Both are required by the type, and `category` is the
 * discriminating one: `severity` alone also matches diagnostic records that
 * `qfai validate` never returns — `decisionGuardrails.GuardrailIssue`, consumed
 * only by `guardrails check`, was pulling `QFAI-GR-*` into the census on that
 * looser test.
 */
function readObjectSites(source: string, constants: Map<string, string>): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const match of source.matchAll(OBJECT_CODE_RE)) {
    if (match.index === undefined) continue;
    const codeIndex = source.indexOf("code:", match.index);
    const brace = findEnclosingBrace(source, codeIndex);
    if (brace === null) continue;
    const object = splitBalancedList(source, brace);
    if (object === null) continue;

    const properties = readProperties(object.members);
    // The `code:` the regex found must be a direct property of the enclosing
    // object, not one nested a level deeper inside it.
    if (properties.get("code") !== match[1]) continue;
    const code = resolveCodeToken(match[1], constants);
    if (code === null) continue;
    const severity = properties.get("severity");
    if (severity === undefined || !properties.has("category")) continue;

    sites.push({
      code,
      errorCapable: !NON_ERROR_SEVERITY_RE.test(severity),
      hasSuggestedAction: isPresentValue(properties.get("suggested_action") ?? ""),
    });
  }
  return sites;
}

/**
 * Where one `Issue` field of a helper's result comes from: an argument the
 * caller fills in — either whole, or one `property` of an argument the caller
 * writes as a config object — or a token fixed by the helper body (a literal,
 * or an expression the census cannot evaluate; both read the same downstream).
 */
type ValueBinding =
  | { kind: "arg"; index: number; property?: string }
  | { kind: "token"; token: string };

/** How a file-local helper maps its parameters onto the `Issue` it produces. */
type IssueTemplate = {
  code: ValueBinding;
  severity: ValueBinding;
  suggestedAction: ValueBinding;
};

function bindValue(token: string | undefined, params: readonly string[]): ValueBinding {
  if (token === undefined || token === "") {
    return { kind: "token", token: "" };
  }
  const direct = params.indexOf(token);
  if (direct >= 0) {
    return { kind: "arg", index: direct };
  }
  const member = MEMBER_ACCESS_RE.exec(token);
  if (member) {
    const index = params.indexOf(member[1]);
    if (index >= 0) {
      return { kind: "arg", index, property: member[2] };
    }
  }
  return { kind: "token", token };
}

/** The value a call site's object-literal argument gives `property`. */
function readObjectArgument(argument: string, property: string): string {
  const trimmed = argument.trim();
  if (!trimmed.startsWith("{")) {
    return "";
  }
  const object = splitBalancedList(trimmed, 0);
  return object === null ? "" : (readProperties(object.members).get(property) ?? "");
}

function readBinding(binding: ValueBinding, args: readonly string[]): string {
  if (binding.kind === "token") {
    return binding.token;
  }
  const argument = args[binding.index] ?? "";
  return binding.property === undefined ? argument : readObjectArgument(argument, binding.property);
}

function addTemplates(
  into: Map<string, IssueTemplate[]>,
  name: string,
  templates: readonly IssueTemplate[],
): void {
  if (templates.length === 0) return;
  into.set(name, [...(into.get(name) ?? []), ...templates]);
}

/** Span of the body of the `function` declaration whose signature ends at `signatureEnd`. */
function readFunctionBody(
  source: string,
  signatureEnd: number,
): { open: number; end: number } | null {
  const header = BODY_START_RE.exec(source.slice(signatureEnd + 1));
  if (header === null) return null;
  const open = signatureEnd + header[0].length;
  const body = splitBalancedList(source, open);
  return body === null ? null : { open, end: body.end };
}

/**
 * File-local factories that wrap `Issue` construction — `skillIssue`,
 * `configIssue`, and friends. A validator that routes its findings through one
 * of these never writes `issue(...)` at the call site, so without this pass the
 * codes it raises are absent from the census entirely.
 *
 * A factory qualifies when it is declared `function NAME(...): Issue` and
 * returns an object literal naming `code` and `severity`. A factory that
 * delegates to `issue(...)` instead is picked up by `readIssueForwarders`.
 */
function readIssueFactories(source: string): Map<string, IssueTemplate[]> {
  const factories = new Map<string, IssueTemplate[]>();
  for (const match of source.matchAll(FUNCTION_DECL_RE)) {
    const name = match[1];
    if (match.index === undefined || HARDCODED_HELPERS.has(name)) continue;
    const openParen = match.index + match[0].length - 1;
    const signature = splitBalancedList(source, openParen);
    if (signature === null) continue;
    const returnType = ISSUE_RETURN_TYPE_RE.exec(source.slice(signature.end + 1));
    if (returnType === null) continue;

    const bodyOpen = signature.end + returnType[0].length;
    const body = splitBalancedList(source, bodyOpen);
    if (body === null) continue;
    const returned = RETURN_OBJECT_RE.exec(source.slice(bodyOpen, body.end));
    if (returned === null) continue;

    const objectOpen = bodyOpen + returned.index + returned[0].length - 1;
    const object = splitBalancedList(source, objectOpen);
    if (object === null) continue;
    const properties = readProperties(object.members);
    if (!properties.has("code") || !properties.has("severity")) continue;

    const params = signature.members.map((param) => PARAM_NAME_RE.exec(param)?.[1] ?? "");
    addTemplates(factories, name, [
      {
        code: bindValue(properties.get("code"), params),
        severity: bindValue(properties.get("severity"), params),
        suggestedAction: bindValue(properties.get("suggested_action"), params),
      },
    ]);
  }
  return factories;
}

/**
 * File-local helpers that call `issue(...)` with a code their own caller
 * supplies — `validateParentExists({ …, missingCode: "…", unknownCode: "…" })`
 * in `validators/orphanProhibition.ts` is the pattern. The code is a literal in
 * the source, just one frame up, so dropping the unresolvable argument at the
 * `issue(...)` call would hide a whole family of real codes behind a helper
 * that looks dynamic and is not.
 *
 * Only bindings that reach a parameter are registered — the argument itself, or
 * one property of an argument the caller writes as a config object. A helper
 * whose code comes from runtime data (`designAudit.findingToIssue` forwards
 * `finding.ruleId`) is registered too, but resolves to nothing at its call
 * sites, where the argument is a value rather than an object literal.
 */
function readIssueForwarders(
  source: string,
  constants: Map<string, string>,
): Map<string, IssueTemplate[]> {
  const forwarders = new Map<string, IssueTemplate[]>();
  for (const match of source.matchAll(FUNCTION_DECL_RE)) {
    const name = match[1];
    if (match.index === undefined || HARDCODED_HELPERS.has(name)) continue;
    const signature = splitBalancedList(source, match.index + match[0].length - 1);
    if (signature === null) continue;
    const body = readFunctionBody(source, signature.end);
    if (body === null) continue;

    const params = signature.members.map((param) => PARAM_NAME_RE.exec(param)?.[1] ?? "");
    const bodyText = source.slice(body.open, body.end + 1);
    addTemplates(forwarders, name, readForwardedTemplates(bodyText, constants, params));
  }
  return forwarders;
}

/** The `issue(...)` calls in `bodyText` whose code is bound to one of `params`. */
function readForwardedTemplates(
  bodyText: string,
  constants: Map<string, string>,
  params: readonly string[],
): IssueTemplate[] {
  const templates: IssueTemplate[] = [];
  for (const call of bodyText.matchAll(ISSUE_CALL_RE)) {
    if (call.index === undefined) continue;
    const args = splitBalancedList(bodyText, call.index + call[0].length - 1)?.members ?? [];
    // A code already readable at this call site is counted by `readCallSites`;
    // only a parameter-bound one needs the caller's argument to name it.
    if (resolveCodeToken(args[0] ?? "", constants) !== null) continue;
    const code = bindValue(args[0], params);
    if (code.kind !== "arg") continue;
    templates.push({
      code,
      severity:
        call[1] === "makeIssue"
          ? { kind: "token", token: '"error"' }
          : bindValue(args[SEVERITY_ARG_INDEX], params),
      suggestedAction: bindValue(args[SUGGESTED_ACTION_ARG_INDEX], params),
    });
  }
  return templates;
}

/** Emission sites that call one of the file's own `Issue` factories or forwarders. */
function readFactorySites(
  source: string,
  constants: Map<string, string>,
  factories: Map<string, IssueTemplate[]>,
): EmissionSite[] {
  const sites: EmissionSite[] = [];
  for (const [name, templates] of factories) {
    for (const match of source.matchAll(new RegExp(`\\b${name}\\(`, "g"))) {
      if (match.index === undefined) continue;
      // The declaration matches its own name; only calls are emission sites.
      if (DECLARATION_PREFIX_RE.test(source.slice(Math.max(0, match.index - 16), match.index))) {
        continue;
      }
      const openParen = match.index + match[0].length - 1;
      const args = splitBalancedList(source, openParen)?.members ?? [];
      for (const template of templates) {
        const code = resolveCodeToken(readBinding(template.code, args), constants);
        if (code === null) continue;
        sites.push({
          code,
          errorCapable: !NON_ERROR_SEVERITY_RE.test(readBinding(template.severity, args)),
          hasSuggestedAction: isPresentValue(readBinding(template.suggestedAction, args)),
        });
      }
    }
  }
  return sites;
}

function mergeTemplates(...maps: Map<string, IssueTemplate[]>[]): Map<string, IssueTemplate[]> {
  const merged = new Map<string, IssueTemplate[]>();
  for (const map of maps) {
    for (const [name, templates] of map) {
      addTemplates(merged, name, templates);
    }
  }
  return merged;
}

function foldSites(sites: Iterable<EmissionSite>, into: Map<string, IssueCodeUsage>): void {
  for (const site of sites) {
    const previous = into.get(site.code);
    into.set(site.code, {
      errorCapable: (previous?.errorCapable ?? false) || site.errorCapable,
      everyErrorSiteHasSuggestedAction:
        (previous?.everyErrorSiteHasSuggestedAction ?? true) &&
        (!site.errorCapable || site.hasSuggestedAction),
    });
  }
}

/**
 * Scan `srcDir` for statically decidable issue-code emissions: the first
 * argument of `issue`/`makeIssue`, the `code:` property of an inline `Issue`
 * object, or an argument a file-local helper forwards into one — the helper
 * either building the `Issue` itself or passing the caller's code straight on
 * to `issue(...)`. Every form reads the code as a string literal or as a
 * file-local constant that holds one; codes assembled at runtime are out of
 * scope.
 */
export async function collectIssueCodeUsage(srcDir: string): Promise<Map<string, IssueCodeUsage>> {
  const merged = new Map<string, IssueCodeUsage>();
  for (const filePath of await collectTsFiles(srcDir)) {
    const source = await readFile(filePath, "utf-8");
    const constants = readStringConstants(source);
    const helpers = mergeTemplates(
      readIssueFactories(source),
      readIssueForwarders(source, constants),
    );
    foldSites(readCallSites(source, constants), merged);
    foldSites(readObjectSites(source, constants), merged);
    foldSites(readFactorySites(source, constants, helpers), merged);
  }
  return merged;
}
