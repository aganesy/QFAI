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
const DEPENDS_ON_YAML_FLOW_RE = /^x-qfai-depends-on:[ \t]*\[([^\]]*)\][ \t]*$/im;
const DEPENDS_ON_YAML_BLOCK_RE = /^x-qfai-depends-on:[ \t]*\n((?:[ \t]*-[ \t]*\S+[ \t]*\n?)+)/im;
const CONTRACT_ID_TOKEN = /CON-(?:API|UI|DB)-\d+/gi;
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
 * Whether a JSON `x-qfai-depends-on` value states an apply order.
 *
 * Only the **empty** array is a statement on its own — it is the JSON spelling
 * of "nothing must be applied first". A non-empty array states an apply order
 * only if `extractDeclaredDependencies` found contract ids in it, which the
 * caller has already asked; accepting any array would let `["TBD"]` or `[null]`
 * suppress `QFAI-CONTRACT-015` while `QFAI-CONTRACT-014` saw no id to check,
 * leaving the apply order undetermined and the file unreported. A string counts
 * only as one of the explicit "none" spellings.
 */
function statesJsonDependencies(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return typeof value === "string" && DEPENDS_ON_NONE_VALUE_RE.test(value.trim());
}

export function extractDeclaredDependencies(text: string, file?: string): string[] {
  const lane = laneFor(file);
  const found = new Set<string>();
  const push = (blob: string): void => {
    for (const match of blob.matchAll(CONTRACT_ID_TOKEN)) {
      found.add(match[0].toUpperCase());
    }
  };
  if (lane !== "structured") {
    for (const match of text.matchAll(DEPENDS_ON_COMMENT_RE)) {
      push(match[1] ?? "");
    }
  }
  if (lane !== "comment") {
    const flow = DEPENDS_ON_YAML_FLOW_RE.exec(text);
    if (flow) push(flow[1] ?? "");
    const block = DEPENDS_ON_YAML_BLOCK_RE.exec(text);
    if (block) push(block[1] ?? "");
    const json = readJsonDependsOn(text);
    if (json && json.value !== undefined) push(JSON.stringify(json.value));
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
  const scalar = DEPENDS_ON_YAML_SCALAR_RE.exec(text);
  return scalar !== null && DEPENDS_ON_NONE_VALUE_RE.test((scalar[1] ?? "").trim());
}
