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
const DEPENDS_ON_COMMENT_RE = /^\s*(?:#|\/\/|--|\*)?\s*Depends on:\s*(.+?)\s*$/gim;
const DEPENDS_ON_YAML_FLOW_RE = /^[ \t]*x-qfai-depends-on:[ \t]*\[([^\]]*)\][ \t]*$/im;
const DEPENDS_ON_YAML_BLOCK_RE =
  /^[ \t]*x-qfai-depends-on:[ \t]*\n((?:[ \t]*-[ \t]*\S+[ \t]*\n?)+)/im;
const CONTRACT_ID_TOKEN = /CON-(?:API|UI|DB)-\d+/gi;
/** The explicit ways to write "nothing must be applied before this contract". */
const DEPENDS_ON_NONE_VALUE_RE = /^(?:[-–—]|\[[ \t]*\]|none)$/i;
/** Non-global on purpose: a `/g` regex carries `lastIndex` between `exec` calls. */
const DEPENDS_ON_YAML_SCALAR_RE = /^[ \t]*x-qfai-depends-on:[ \t]*(\S[^\n]*?)[ \t]*$/im;

export function extractDeclaredDependencies(text: string): string[] {
  const found = new Set<string>();
  const push = (blob: string): void => {
    for (const match of blob.matchAll(CONTRACT_ID_TOKEN)) {
      found.add(match[0].toUpperCase());
    }
  };
  for (const match of text.matchAll(DEPENDS_ON_COMMENT_RE)) {
    push(match[1] ?? "");
  }
  const flow = DEPENDS_ON_YAML_FLOW_RE.exec(text);
  if (flow) push(flow[1] ?? "");
  const block = DEPENDS_ON_YAML_BLOCK_RE.exec(text);
  if (block) push(block[1] ?? "");
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
export function hasDependencyDeclaration(text: string): boolean {
  if (extractDeclaredDependencies(text).length > 0) {
    return true;
  }
  for (const match of text.matchAll(DEPENDS_ON_COMMENT_RE)) {
    if (DEPENDS_ON_NONE_VALUE_RE.test((match[1] ?? "").trim())) {
      return true;
    }
  }
  const scalar = DEPENDS_ON_YAML_SCALAR_RE.exec(text);
  return scalar !== null && DEPENDS_ON_NONE_VALUE_RE.test((scalar[1] ?? "").trim());
}
