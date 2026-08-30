const CONTRACT_DECLARATION_RE =
  /^\s*(?:#|\/\/|--|\/\*+|\*+)?\s*QFAI-CONTRACT-ID:\s*(CON-(?:API|UI|DB)-\d+)\s*(?:\*\/)?\s*$/gm;
const CONTRACT_DECLARATION_LINE_RE =
  /^\s*(?:#|\/\/|--|\/\*+|\*+)?\s*QFAI-CONTRACT-ID:\s*(?:CON-(?:API|UI|DB)-\d+)\s*(?:\*\/)?\s*$/;

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
 * - `.sql`: a comment line `-- Depends on: CON-DB-0002, CON-DB-0003`
 * - `.yaml` / `.json`: `x-qfai-depends-on: [CON-API-0002]`, flow or block
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
 * marker optional, a line reading `Depends on: CON-API-0002` inside an OpenAPI
 * `description: |` block — the natural place to explain a **runtime** reference,
 * which this key must never list — counted as the file's apply-order
 * declaration: it suppressed `QFAI-CONTRACT-015` and fed its ids to the index
 * mirror. A YAML mapping key is top-level only when unindented, so an
 * `x-qfai-depends-on` nested under some path is likewise not this file's
 * declaration.
 */
const DEPENDS_ON_COMMENT_RE = /^[ \t]*(?:#|\/\/|--|\*)[ \t]*Depends on:[ \t]*(.+?)[ \t]*$/gim;
/**
 * A trailing `#` comment is part of the line, not part of the value.
 *
 * `x-qfai-depends-on: [CON-DB-0001] # DB を先に適用` is valid YAML and the
 * natural way to say *why* the order holds, but an end-of-line anchor stopped
 * matching it. The scalar fallback then read `[CON-DB-0001] # …` as a value that
 * is not one of the "none" spellings, so a conforming declaration produced
 * `QFAI-CONTRACT-015` and its correct index row `QFAI-CONTRACT-033`.
 */
const DEPENDS_ON_YAML_FLOW_RE = /^x-qfai-depends-on:[ \t]*\[([^\]]*)\][ \t]*(?:#[^\n]*)?$/im;
/**
 * The block form, where a `#` comment may follow the key and every item.
 *
 * `- CON-DB-0001 # schema first` is valid YAML and says the same thing the flow
 * form's trailing comment does, but the item pattern allowed only whitespace
 * after the value, so the sequence ended at the first commented item and every
 * later one was dropped — silently, and worst where it matters most: a
 * declaration listing several contracts is exactly the multi-file composition
 * this key exists to state. The truncated list then disagreed with the correct
 * index row, which earned `QFAI-CONTRACT-033`.
 *
 * Line breaks are `\r?\n` throughout. This is the one form spanning several
 * lines, so it was also the only one a CRLF file broke: the key's hard `\n` did
 * not match `\r\n`, and even past it every item ended at its own `\r`, so the
 * repetition stopped after the first. A contract saved on Windows therefore
 * declared its apply order to no effect — `QFAI-CONTRACT-015` on a file that
 * had declared, and `-033` against its correct index row. The sibling forms
 * anchor on `$`, which already matches before a `\r`.
 *
 * The ids are read from the item *values* (see {@link blockSequenceValues})
 * rather than from this capture, so a contract id mentioned inside a comment is
 * not silently taken for a dependency.
 */
const DEPENDS_ON_YAML_BLOCK_RE =
  /^x-qfai-depends-on:[ \t]*(?:#[^\r\n]*)?\r?\n((?:[ \t]*-[ \t]*\S+[ \t]*(?:#[^\r\n]*)?\r?\n?)+)/im;
/** One block-sequence item: `-`, its value, and whatever comment follows it. */
const BLOCK_SEQUENCE_ITEM_RE = /^[ \t]*-[ \t]*(\S+)/;
/** What separates one listed dependency from the next, in a comment or a flow sequence. */
const DECLARATION_SEPARATOR_RE = /[,\s]+/;
/** The explicit ways to write "nothing must be applied before this contract". */
const DEPENDS_ON_NONE_VALUE_RE = /^(?:[-–—]|\[[ \t]*\]|none)$/i;
/** Non-global on purpose: a `/g` regex carries `lastIndex` between `exec` calls. */
const DEPENDS_ON_YAML_SCALAR_RE = /^x-qfai-depends-on:[ \t]*(\S[^\n]*?)[ \t]*$/im;

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
/** The declaration key itself, for the JSON lane where regexes cannot reach. */
const DEPENDS_ON_KEY = "x-qfai-depends-on";

/**
 * The declaration as a JSON contract writes it.
 *
 * `.qfai/contracts/api/**` collects `.json` next to `.yaml`, but every regex
 * above matches an unquoted YAML key on a single line. A JSON contract spelling
 * `"x-qfai-depends-on": []` — or spreading the array over several lines — read
 * as "never stated", so `QFAI-CONTRACT-015` fired on a file that had declared
 * its apply order, and `QFAI-CONTRACT-014` / `-033` never saw the ids it listed.
 *
 * Declaration lines are stripped before parsing: `QFAI-CONTRACT-010` requires a
 * `QFAI-CONTRACT-ID` comment line and a comment is not valid JSON, so the raw
 * text of a conforming JSON contract never parses on its own — the same reason
 * `validateContractFile` strips before `parseStructuredContract`.
 *
 * Returns `undefined` when the text is not a JSON object or does not carry the
 * key, so a YAML contract keeps taking the regex lane untouched.
 */
function readJsonDependsOn(text: string): { value: unknown } | undefined {
  const entries =
    parseJsonObjectEntries(text) ?? parseJsonObjectEntries(stripContractDeclarationLines(text));
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

/**
 * The values a YAML block sequence lists, with each item's comment dropped.
 *
 * Scanning the matched block text for ids instead would read a comment as part
 * of the declaration: `- CON-DB-0001 # replaces CON-DB-0002` would list two
 * dependencies, one of which the author explicitly said is not one.
 */
function blockSequenceValues(blob: string): string[] {
  const values: string[] = [];
  for (const line of blob.split(/\r?\n/)) {
    const value = BLOCK_SEQUENCE_ITEM_RE.exec(line)?.[1];
    if (value) {
      values.push(value);
    }
  }
  return values;
}

/** A cell/element holding a contract id and nothing else. */
const CONTRACT_ID_EXACT_RE = /^CON-(?:API|UI|DB)-\d+$/i;

/**
 * The ids a listed declaration states, or `undefined` when an element of it is
 * not a contract id.
 *
 * **Every** element must be one. Harvesting only the recognisable ids and
 * discarding the rest let a half-written declaration read as a finished one:
 * `-- Depends on: CON-DB-0001, TBD` yielded `["CON-DB-0001"]`, so
 * `QFAI-CONTRACT-015` saw a declaration, `-014` found every id it was given to
 * resolve, and an index cell mirroring just the known half agreed with it under
 * `-033`. The undetermined element left no trace anywhere, which is the one
 * outcome these rules exist to prevent.
 *
 * Rejecting the whole list rather than the bad element is what makes the file
 * fall back to `QFAI-CONTRACT-015` ("states no apply order at all") — the
 * accurate finding, and the one the JSON lane already produced for `["TBD"]`.
 * This is the shared judgement behind all four lanes, so a `.sql` comment, a
 * YAML flow or block sequence and a JSON array cannot drift apart on what
 * counts as declared.
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
 * The ids a comment line or a YAML flow sequence states.
 *
 * Both write the list as text: `CON-DB-0002, CON-DB-0003` in a `-- Depends on:`
 * comment, the same between brackets in `x-qfai-depends-on: [...]`. An empty
 * value is the flow spelling of "none" and lists nothing; anything else is
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
 * The ids a JSON `x-qfai-depends-on` value declares, or `undefined` if it is not
 * a well-formed declaration.
 *
 * The value must be an **array**, and every element a bare contract id. Reading
 * ids out of a stringification of the whole value instead accepted anything that
 * merely *contained* one: `{"note": "CON-API-0002"}`, or a single unwrapped
 * `"CON-API-0002"`, yielded a dependency and returned early from
 * `hasDependencyDeclaration`, so a value that states no apply order passed
 * parsing, the `QFAI-CONTRACT-014` reference check and the `QFAI-CONTRACT-033`
 * index mirror as though it did. `["TBD"]` / `[null]` are rejected for the same
 * reason: they would suppress `QFAI-CONTRACT-015` while leaving nothing for
 * `QFAI-CONTRACT-014` to check.
 */
function jsonDependencyIds(value: unknown): string[] | undefined {
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
 * Whether a JSON `x-qfai-depends-on` value states an apply order.
 *
 * The empty array is the JSON spelling of "nothing must be applied first", and a
 * non-empty one states an order only when every element is a contract id — the
 * same shape `jsonDependencyIds` extracts from, so declaration and extraction
 * never disagree. A string counts only as one of the explicit "none" spellings.
 */
function statesJsonDependencies(value: unknown): boolean {
  if (Array.isArray(value)) {
    return jsonDependencyIds(value) !== undefined;
  }
  return typeof value === "string" && DEPENDS_ON_NONE_VALUE_RE.test(value.trim());
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
    const flow = DEPENDS_ON_YAML_FLOW_RE.exec(text);
    if (flow) add(textDependencyIds(flow[1] ?? ""));
    const block = DEPENDS_ON_YAML_BLOCK_RE.exec(text);
    if (block) add(dependencyIdsFromElements(blockSequenceValues(block[1] ?? "")));
    const json = readJsonDependsOn(text);
    if (json) add(jsonDependencyIds(json.value));
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
 * `CON-DB-0001, TBD` reads as silence here rather than as the finished
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
  const json = readJsonDependsOn(text);
  if (json) {
    return statesJsonDependencies(json.value);
  }
  // `[]` is the flow spelling of "none", with or without a trailing comment; the
  // scalar fallback below would read `[] # なし` as a value that is neither.
  const flow = DEPENDS_ON_YAML_FLOW_RE.exec(text);
  if (flow) {
    return (flow[1] ?? "").trim().length === 0;
  }
  const scalar = DEPENDS_ON_YAML_SCALAR_RE.exec(text);
  return scalar !== null && DEPENDS_ON_NONE_VALUE_RE.test((scalar[1] ?? "").trim());
}
