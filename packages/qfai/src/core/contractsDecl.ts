import path from "node:path";

import { parse as parseYaml } from "yaml";

import { parseHeadings } from "./parse/markdown.js";
import { maskNonSpecRegions } from "./specPackParsers.js";
import { isContractId } from "./storyTree/ids.js";

const DECLARED_ID = String.raw`(?:CLI|API|DB|UI)-\d{4}`;
const CONTRACT_DECLARATION_RE = new RegExp(
  String.raw`^\s*(?:#|\/\/|--|\/\*+|\*+)?\s*QFAI-CONTRACT-ID:\s*(${DECLARED_ID})\s*(?:\*\/)?\s*$`,
  "gm",
);
const CONTRACT_DECLARATION_LINE_RE = new RegExp(
  String.raw`^\s*(?:#|\/\/|--|\/\*+|\*+)?\s*QFAI-CONTRACT-ID:\s*(?:${DECLARED_ID})\s*(?:\*\/)?\s*$`,
);
/** `# CLI-0001: <title>`, the H1 a Markdown contract declares its ID in. */
const MARKDOWN_CONTRACT_H1_RE = /^((?:CLI|API|DB|UI)-\d{4}):\s+\S/;

/**
 * The `<KIND>-NNNN` ID a contract file declares, or `null` when it declares
 * none: the first rendered H1 of a Markdown contract, and the one `QFAI-CONTRACT-ID`
 * line of any other file. Several such lines declare nothing.
 */
export function declaredContractId(file: string, text: string): string | null {
  if (file.toLowerCase().endsWith(".md")) {
    const heading = parseHeadings(maskNonSpecRegions(text)).find((item) => item.level === 1);
    return MARKDOWN_CONTRACT_H1_RE.exec(heading?.title ?? "")?.[1] ?? null;
  }
  const [id, ...others] = extractDeclaredContractIds(text);
  return id !== undefined && others.length === 0 && isContractId(id) ? id : null;
}

/** The IDs the `QFAI-CONTRACT-ID` lines of a contract declare. */
export function extractDeclaredContractIds(text: string): string[] {
  const ids: string[] = [];
  for (const match of text.matchAll(CONTRACT_DECLARATION_RE)) {
    const id = match[1];
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

export function stripContractDeclarationLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !CONTRACT_DECLARATION_LINE_RE.test(line))
    .join("\n");
}

/**
 * Apply-order dependencies a contract declares.
 *
 * `QFAI-CONTRACT-011` makes a second `QFAI-CONTRACT-ID` in one file a hard
 * `error`, so any schema larger than one table necessarily becomes N
 * cross-referencing files — and nothing let the author state the resulting
 * composition. Every consumer had to reconstruct the apply graph by reading the
 * DDL, and getting it wrong is silent: the wrong contract subset still applies
 * cleanly and the tests still pass, against a schema missing the tables under
 * test.
 *
 * Two forms, matching what each contract kind already uses for metadata:
 *
 * - `.sql`: a comment line `-- Depends on: DB-0002, DB-0003`
 * - `.yaml` / `.json`: `x-qfai-depends-on: [API-0002]`, flow or block
 *
 * This is **apply order**, not every reference. A body-resolved runtime
 * reference (a foreign key resolved after both objects exist, an API calling
 * another at request time) is not an apply-order dependency and must not be
 * listed — the apply graph is acyclic by construction, while the runtime graph
 * legitimately is not.
 */
/**
 * The comment marker is required, and the key must sit at column 0.
 *
 * Both anchors keep a *declaration* distinct from *prose about* one. With the
 * marker optional, a line reading `Depends on: API-0002` inside an OpenAPI
 * `description: |` block — the natural place to explain a **runtime** reference,
 * which this key must never list — counted as the file's apply-order
 * declaration: it suppressed `QFAI-CONTRACT-015` and fed its ids to the index
 * mirror. A YAML mapping key is top-level only when unindented, so an
 * `x-qfai-depends-on` nested under some path is likewise not this file's
 * declaration.
 */
const DEPENDS_ON_COMMENT_RE = /^[ \t]*(?:#|\/\/|--|\*)[ \t]*Depends on:[ \t]*(.+?)[ \t]*$/gim;
/** What separates one listed dependency from the next, in a comment or an index cell. */
const DECLARATION_SEPARATOR_RE = /[,\s]+/;
/** The explicit ways to write "nothing must be applied before this contract". */
const DEPENDS_ON_NONE_VALUE_RE = /^(?:[-–—]|\[[ \t]*\]|none)$/i;

/**
 * Which idiom a contract file is allowed to declare in.
 *
 * A `.sql` contract declares in a comment and a `.yaml` / `.json` one declares
 * with the key; accepting both in both directions is what let an OpenAPI body
 * line masquerade as a declaration. `any` is the answer when the caller has no
 * path to judge by, which keeps the parsers usable on a bare string.
 */
type DeclarationLane = "comment" | "structured" | "any";

function laneFor(file: string | undefined): DeclarationLane {
  if (file === undefined) {
    return "any";
  }
  const dot = file.lastIndexOf(".");
  const extension = dot < 0 ? "" : file.slice(dot).toLowerCase();
  if (extension === ".sql") {
    return "comment";
  }
  if (extension === ".yaml" || extension === ".yml" || extension === ".json") {
    return "structured";
  }
  return "any";
}
/** The top-level key a YAML or JSON contract declares its apply order with. */
const DEPENDS_ON_KEY = "x-qfai-depends-on";

/**
 * The top-level `x-qfai-depends-on` value of a YAML or JSON contract.
 *
 * The value is read by the parsers, not by patterns over its lines. Patterns
 * had to re-implement YAML and kept getting it wrong: a standalone comment line
 * ended a block sequence, so the items after it were silently dropped; quoted
 * ids were rejected; and `[DB-0001 DB-0002]`, which YAML reads as one string,
 * was accepted as two ids. Parsing also keeps a key nested under some path, or
 * written inside a block scalar, from counting as this file's declaration.
 *
 * Declaration lines are stripped before parsing: `QFAI-CONTRACT-010` requires a
 * `QFAI-CONTRACT-ID` comment line and a `//` comment is not valid JSON, so the
 * raw text of a conforming JSON contract never parses on its own — the same
 * reason `validateContractFile` strips before `parseStructuredContract`.
 *
 * Returns `undefined` when the text is not a mapping, does not parse, or does
 * not carry the key. A file that does not parse earns its own finding from the
 * contract validator, and states no apply order here.
 */
function readStructuredDependsOn(
  text: string,
  file: string | undefined,
): { value: unknown } | undefined {
  const stripped = stripContractDeclarationLines(text);
  // Parsed as `parseStructuredContract` parses it, so a `.json` file YAML would
  // forgive, such as one with a trailing comma, states nothing here either.
  const entries =
    file !== undefined && path.extname(file).toLowerCase() === ".json"
      ? parseJsonObjectEntries(stripped)
      : parseYamlObjectEntries(stripped);
  if (!entries) {
    return undefined;
  }
  for (const [key, value] of entries) {
    if (key.trim().toLowerCase() === DEPENDS_ON_KEY) {
      return { value };
    }
  }
  return undefined;
}

/** The document's own entries, or `undefined` when the text is not a JSON object. */
function parseJsonObjectEntries(text: string): [string, unknown][] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  return Object.entries(parsed);
}

/** The document's own entries, or `undefined` when the text is not a YAML mapping. */
function parseYamlObjectEntries(text: string): [string, unknown][] | undefined {
  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  return Object.entries(parsed);
}

/** A cell/element holding a contract id and nothing else. */
const CONTRACT_ID_EXACT_RE = new RegExp(`^(?:${DECLARED_ID})$`, "i");

/**
 * The ids a listed declaration states, or `undefined` when an element of it is
 * not a contract id.
 *
 * **Every** element must be one. Harvesting only the recognisable ids and
 * discarding the rest let a half-written declaration read as a finished one:
 * `-- Depends on: DB-0001, TBD` yielded `["DB-0001"]`, so
 * `QFAI-CONTRACT-015` saw a declaration, `-014` found every id it was given to
 * resolve, and an index cell mirroring just the known half agreed with it under
 * `-034`. The undetermined element left no trace anywhere, which is the one
 * outcome these rules exist to prevent.
 *
 * Rejecting the whole list rather than the bad element is what makes the file
 * fall back to `QFAI-CONTRACT-015` ("states no apply order at all") — the
 * accurate finding, and the one the JSON lane already produced for `["TBD"]`.
 * This is the shared judgement behind every lane, so a `.sql` comment and a
 * YAML or JSON sequence cannot drift apart on what counts as declared.
 */
function dependencyIdsFromElements(elements: string[]): string[] | undefined {
  const ids: string[] = [];
  for (const element of elements) {
    const value = element.trim();
    if (!CONTRACT_ID_EXACT_RE.test(value)) {
      return undefined;
    }
    ids.push(value.toUpperCase());
  }
  return ids;
}

/**
 * The ids a comment line or an index cell states.
 *
 * Both write the list as text: `DB-0002, DB-0003` in a `-- Depends on:`
 * comment or a Depends On cell. An empty value lists nothing; anything else is
 * split on commas and whitespace so that every token is judged on its own.
 */
function textDependencyIds(value: string): string[] | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return dependencyIdsFromElements(trimmed.split(DECLARATION_SEPARATOR_RE));
}

/**
 * The ids a YAML or JSON `x-qfai-depends-on` value declares, or `undefined` if it is not
 * a well-formed declaration.
 *
 * The value must be an **array**, and every element a bare contract id. Reading
 * ids out of a stringification of the whole value instead accepted anything that
 * merely *contained* one: `{"note": "API-0002"}`, or a single unwrapped
 * `"API-0002"`, yielded a dependency and returned early from
 * `hasDependencyDeclaration`, so a value that states no apply order passed
 * parsing, the `QFAI-CONTRACT-014` reference check and the `QFAI-CONTRACT-034`
 * index mirror as though it did. `["TBD"]` / `[null]` are rejected for the same
 * reason: they would suppress `QFAI-CONTRACT-015` while leaving nothing for
 * `QFAI-CONTRACT-014` to check.
 */
function structuredDependencyIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const elements: string[] = [];
  for (const element of value) {
    if (typeof element !== "string") {
      return undefined;
    }
    elements.push(element);
  }
  return dependencyIdsFromElements(elements);
}

/**
 * Whether a YAML or JSON `x-qfai-depends-on` value states an apply order.
 *
 * The empty sequence is the structured spelling of "nothing must be applied first", and a
 * non-empty one states an order only when every element is a contract id — the
 * same shape `structuredDependencyIds` extracts from, so declaration and extraction
 * never disagree. A string counts only as one of the explicit "none" spellings.
 */
function statesStructuredDependencies(value: unknown): boolean {
  if (Array.isArray(value)) {
    return structuredDependencyIds(value) !== undefined;
  }
  return typeof value === "string" && DEPENDS_ON_NONE_VALUE_RE.test(value.trim());
}

/**
 * The ids a contract index Depends On cell states, sorted, or `undefined` when it
 * states none: an empty cell, or one holding anything but contract ids. The index
 * writes "nothing must be applied first" as `-` alone; the other spellings a
 * declaration accepts are not index values. The ids are judged as a declaration's.
 */
export function listedDependencyIds(value: string): string[] | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === "-") return [];
  const ids = textDependencyIds(trimmed);
  return ids && Array.from(new Set(ids)).sort();
}

export function extractDeclaredDependencies(text: string, file?: string): string[] {
  const lane = laneFor(file);
  const found = new Set<string>();
  const add = (ids: string[] | undefined): void => {
    for (const id of ids ?? []) {
      found.add(id);
    }
  };
  if (lane !== "structured") {
    for (const match of text.matchAll(DEPENDS_ON_COMMENT_RE)) {
      add(textDependencyIds(match[1] ?? ""));
    }
  }
  if (lane !== "comment") {
    const structured = readStructuredDependsOn(text, file);
    if (structured) add(structuredDependencyIds(structured.value));
  }
  return Array.from(found).sort();
}

/**
 * Whether the file states its apply order **at all**.
 *
 * `extractDeclaredDependencies` cannot answer this: it returns `[]` both for a
 * contract that declared `-` ("nothing must be applied first") and for one that
 * said nothing. Referential checks therefore never reach an undeclared
 * contract, so the single failure mode the rule exists to prevent — no
 * declaration anywhere, leaving the apply graph unstated — was the one case
 * that produced no finding.
 *
 * The key alone is not a declaration. A bare `-- Depends on:` or
 * `x-qfai-depends-on:` with no value states nothing, so accepting it would
 * suppress `QFAI-CONTRACT-015` for exactly the file the rule is about. Only a
 * value counts: contract ids, or one of the explicit "none" spellings (`-`,
 * `[]`, `none`).
 *
 * A **partly** stated order does not count either. The answer is derived from
 * {@link extractDeclaredDependencies}, which yields nothing unless every listed
 * element is a contract id (see {@link dependencyIdsFromElements}), so
 * `DB-0001, TBD` reads as silence here rather than as the finished
 * declaration its resolvable half made it look like.
 */
export function hasDependencyDeclaration(text: string, file?: string): boolean {
  const lane = laneFor(file);
  if (extractDeclaredDependencies(text, file).length > 0) {
    return true;
  }
  if (lane !== "structured") {
    for (const match of text.matchAll(DEPENDS_ON_COMMENT_RE)) {
      if (DEPENDS_ON_NONE_VALUE_RE.test((match[1] ?? "").trim())) {
        return true;
      }
    }
  }
  if (lane === "comment") {
    return false;
  }
  const structured = readStructuredDependsOn(text, file);
  return structured !== undefined && statesStructuredDependencies(structured.value);
}
