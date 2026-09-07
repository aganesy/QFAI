import { readFile } from "node:fs/promises";

import { parseStructuredContract } from "../contracts.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { issue } from "./utils.js";

/**
 * Cross-contract consistency checks.
 *
 * Per-file contract validation (`validateContracts`) never compares one contract with another, so
 * an API contract that mandates an outcome the paired DB contract cannot represent passes every
 * gate until an implementation test tries to satisfy both.
 *
 * This validator implements the mechanizable slice of that reconciliation: state/status domains.
 * It compares the enum domain an API contract declares for a state-like field against the domain
 * the DB contracts declare for the same field (`CHECK (... IN (...))`, `CREATE TYPE ... AS ENUM`,
 * or an inline column `ENUM(...)`), and reports API-mandated values with no representable DB
 * counterpart.
 *
 * It is deliberately conservative: a finding is only emitted when *both* sides declare a domain
 * for the same normalized field name. A field only one side knows about is not a contradiction.
 */
export async function validateContractConsistency(
  apiFiles: string[],
  dbFiles: string[],
): Promise<Issue[]> {
  if (apiFiles.length === 0 || dbFiles.length === 0) {
    return [];
  }

  const collected = await collectDbStateDomains(dbFiles);
  const issues: Issue[] = [];

  // `QFAI-CONTRACT-041` ships behind a promotion window (P7). The declaration
  // FORMAT is new, so the first authors to use it are answering another finding
  // voluntarily and will get the grammar wrong in the ways the message exists
  // to teach; failing their run on a line they added to engage with the tool is
  // the worst first experience of it. Resolved once here rather than per
  // finding: it is one fact about the running version, and reading it inside a
  // loop would say otherwise.
  const declarationSeverity = newRuleSeverity(
    await resolveToolVersion(),
    RULE_PROMOTIONS.derivedNotStoredDeclaration.promoteAt,
  );

  // Reported before anything else, and whether or not a domain was collected: a
  // declaration nobody could read is a defect in the declaration, and it is
  // exactly the state in which the author believes they have answered a finding
  // that is still standing.
  for (const { file, line } of collected.malformed) {
    issues.push(unreadableDerivedDeclaration(file, line, declarationSeverity));
  }

  if (collected.domains.size === 0) {
    return issues;
  }

  // Which declared values actually did work, gathered across every API contract
  // so the staleness verdict is taken once and not once per file.
  const honoured = new Set<string>();
  for (const file of apiFiles) {
    issues.push(...(await validateApiFileAgainstDb(file, collected, honoured)));
  }
  issues.push(...staleDerivedDeclarations(collected, honoured, declarationSeverity));
  return issues;
}

/** `<file>::<normalized field>::<value>`, the key a declaration is credited by. */
function derivedKey(declaration: DerivedDeclaration, value: string): string {
  return `${declaration.file}::${normalizeFieldName(declaration.fieldName)}::${value}`;
}

/** One contract's bound on a field name, kept separate from every other's. */
type DbFieldBinding = {
  /** The contract file that declares it. */
  file: string;
  /** Values THAT file can store for the field. */
  values: Set<string>;
  /**
   * Whether this file's bound is a Postgres ENUM rather than a check
   * constraint.
   *
   * The two forms the collector reads cannot be conflated. An ENUM — `CREATE
   * TYPE … AS ENUM`, or an inline `col ENUM(…)` — rejects an out-of-domain
   * value at insert time, so an API contract requiring one describes a pair no
   * implementation can satisfy. A `CHECK (col IN (…))` is a bound the DB
   * currently asserts: it can be dropped, replaced, or declared `NOT VALID`,
   * and the column itself still holds the value.
   *
   * Within one file the enum wins where the two forms provably bound the SAME
   * column: an ENUM column carrying a redundant CHECK is still an ENUM column,
   * and the strictest constraint is the one an implementation has to satisfy
   * (#1100). Where they may not — see {@link enumEvidence} — this is false and
   * the finding stays a warning.
   */
  enumBacked: boolean;
  /**
   * The file declared an ENUM for this name, whether or not that is decisive.
   *
   * `collectSqlDomainBounds` keys on the column NAME, not on the table, so a
   * contract declaring two tables that each have a `status` column — one ENUM,
   * one CHECK — collapses to one entry carrying both forms, indistinguishable
   * there from #1100's single column with a redundant CHECK. The tie is broken
   * by the one fact that separates them: a file declaring ONE table has only
   * one column of that name, so both forms are the same column; a file
   * declaring several may not, and the same rule as across contracts applies —
   * a CHECK among the candidates means the value can be stored, so
   * impossibility is not a claim this rule may make.
   *
   * That downgrade costs the one case it cannot tell apart: a genuinely
   * redundant CHECK in a multi-table contract reports `warning` instead of
   * `error`. Attributing a column to its table is what would recover it, and
   * that is a change to the SQL scan rather than to this decision.
   *
   * Kept separate from {@link enumBacked} so the message can still name the
   * contract the ENUM came from, which is what the reader needs in order to
   * settle the pairing.
   */
  enumEvidence: boolean;
};

/**
 * Every contract that declares a given field NAME, one entry each.
 *
 * Not merged into a single bound, because the pairing is by normalized field
 * name across all DB contracts while the severity and the domain are then
 * attributed to one specific API field. Flattening the two lost that
 * distinction: `sim_lines.status` is bounded by a `CHECK` in
 * `db-0003-sim-lines.sql`, and OR-ing `enumBacked` across the eight contracts
 * that happen to declare a column called `status` made it `error` on the
 * strength of `call_list_status` — an ENUM on a different table, which rejects
 * no insert into `sim_lines` at all. The message said so in as many words
 * (`insert 時に拒絶される物理制約`), of a field that does not have one (#1162).
 *
 * #1100's "enum wins" is unaffected: it is about ONE field bound by both
 * forms, which is a per-file question and is settled per file.
 */
type DbDomain = {
  bindings: DbFieldBinding[];
  /**
   * Every value any contributing contract can store — the representability
   * test, which is still the union.
   *
   * Held beside the bindings and grown with them rather than folded on demand.
   * `validateApiFileAgainstDb` runs once per API contract, so a union computed
   * at the point of use is rebuilt for every API file that names the field —
   * an allocation the split would otherwise have introduced. It is updated at
   * the one place a binding is added, so it cannot come to describe a set of
   * bindings that is no longer there.
   */
  values: Set<string>;
};

function domainFiles(domain: DbDomain): string[] {
  return domain.bindings.map((binding) => binding.file).sort((a, b) => a.localeCompare(b));
}

/**
 * The contracts that declared an ENUM for this name — evidence, not verdict.
 *
 * `enumEvidence` rather than `enumBacked`, so a contract whose ENUM was not
 * decisive is still named. That contract is exactly what the reader has to look
 * at to settle the pairing, and omitting it would leave the message saying the
 * candidates disagree without saying with whom.
 */
function enumFiles(domain: DbDomain): string[] {
  return domain.bindings
    .filter((binding) => binding.enumEvidence)
    .map((binding) => binding.file)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Whether EVERY contract that could be bounding this field is an ENUM.
 *
 * The claim `error` makes is that no implementation can satisfy both
 * contracts, and that only holds when the value is refused whichever of the
 * candidate bindings is the real one. A single `CHECK` among them means the
 * value can be stored somewhere the pairing considers a match, so the claim is
 * not available and the finding stays a `warning` — which is also what the
 * rule said before #1100 raised the genuinely impossible case.
 */
function isEnumOnly(domain: DbDomain): boolean {
  return domain.bindings.length > 0 && domain.bindings.every((binding) => binding.enumBacked);
}

/**
 * The allowed values, broken down per contract once there is more than one.
 *
 * A flat union reads as one domain and is not one. The reported list for
 * `SimLine.status` held `accepted`, `archived`, `sending`, `succeeded` … while
 * `sim_lines.status` accepts four values — so a value legal only in an
 * unrelated table counted as representable, and the reader had no way to see
 * that from the message (#1162). Narrowing the pairing itself needs a
 * table-to-schema binding this rule does not have; showing which contract
 * contributed what is what it can do, and is enough to act on.
 */
function describeDbDomain(domain: DbDomain): string {
  const sorted = [...domain.bindings].sort((a, b) => a.file.localeCompare(b.file));
  const first = sorted[0];
  if (sorted.length === 1 && first) {
    return `DB 側の許容値: ${Array.from(first.values).sort().join(", ")}`;
  }
  const perFile = sorted
    .map((binding) => `${binding.file}: ${Array.from(binding.values).sort().join(", ")}`)
    .join("; ");
  return `DB 側の許容値 (契約ごと): ${perFile}`;
}

/** Which form bounds the field, and — when the candidates disagree — whose. */
function describeDbConstraint(domain: DbDomain): string {
  if (isEnumOnly(domain)) {
    return "ENUM (insert 時に拒絶される物理制約)";
  }
  const fromEnum = enumFiles(domain);
  if (fromEnum.length === 0) {
    return "CHECK (現在の制約。drop / NOT VALID で外せる)";
  }
  return (
    `CHECK と ENUM の混在 — ENUM を宣言するのは ${fromEnum.join(", ")} です。` +
    "同名列の ENUM は他テーブルの列を束縛するだけで、この API フィールドの insert を拒絶するとは限りません"
  );
}

/**
 * What to do about it, which depends on WHERE the disagreement is.
 *
 * Three shapes, and the third is the one a single branch got wrong. When the
 * ENUM and the CHECK are in the same contract — two tables in one file, each
 * with a `status` column — every candidate is an ENUM contributor, so the
 * "contracts that bound it with a CHECK" list is EMPTY and the remedy read
 * `CHECK で束縛する契約 ()`. Empty brackets are not a shorter answer; they are a
 * reader looking for a file name that is not there. That case has its own
 * sentence, and it points at the table rather than at another contract, because
 * the contract is already settled and the column is not.
 */
function mixedRemedy(enumOnly: boolean, dbFiles: string[], fromEnum: string[]): string {
  if (enumOnly) {
    return (
      `DB 契約 (${dbFiles.join(", ")}) の ENUM が正です — ` +
      "insert 時に拒絶される物理制約なので、この組み合わせを満たす実装は存在しません。" +
      "ENUM に値を追加するか (マイグレーションを伴います)、API 側の terminal semantics を訂正してください。"
    );
  }
  if (fromEnum.length === 0) {
    return (
      `DB 契約 (${dbFiles.join(", ")}) の CHECK 制約との不一致です — ` +
      "制約側を広げる (drop / 再定義) と API 側を訂正するのどちらも取れます。" +
      "どちらを canonical とするかは、その entity を所有する spec の Contracts 表で判断してください。"
    );
  }
  const fromCheck = dbFiles.filter((name) => !fromEnum.includes(name));
  // An empty CHECK side does NOT mean one contract. Every candidate can
  // declare an ENUM while one of them is non-decisive because its own file
  // mixes the two forms across tables, and then `fromEnum` holds them all. The
  // count is what separates "the pairing is settled and the column is not"
  // from "neither is settled", and only the first may say "the same contract".
  if (fromCheck.length === 0 && dbFiles.length === 1) {
    return (
      `ENUM と CHECK が同じ契約 (${dbFiles.join(", ")}) の中に現れています — ` +
      "同名の列が複数のテーブルにある場合、その ENUM が束縛するのは API フィールドの列とは限りません。" +
      "対象のテーブルと列を 1 つに特定してから、ENUM 側なら値を追加、CHECK 側なら制約を広げるか API を訂正してください。"
    );
  }
  if (fromCheck.length === 0) {
    return (
      `候補の契約 (${dbFiles.join(", ")}) はいずれも ENUM を宣言していますが、` +
      "少なくとも 1 つは同じ契約の中で CHECK と混在しており、その ENUM が束縛するのは " +
      "API フィールドの列とは限りません。" +
      "まず、その entity を所有する spec の Contracts 表で対応する DB 契約を 1 つに絞り、" +
      "その上で対象のテーブルと列を特定してください。"
    );
  }
  return (
    `ENUM を宣言しているのは ${fromEnum.join(", ")} で、CHECK で束縛する契約 ` +
    `(${fromCheck.join(", ")}) も候補に含まれます — ` +
    "照合はフィールド名のみなので、この API フィールドを束縛する契約がその ENUM とは限りません。" +
    "まず、その entity を所有する spec の Contracts 表で、対応する DB 契約を 1 つに絞ってください。"
  );
}

/**
 * A line carrying the key that does not parse as a declaration.
 *
 * The severity comes from the promotion window, not from a literal: what this
 * adds today is the one thing the author cannot see otherwise — that the marker
 * they wrote was not read, so the finding they were answering is still standing
 * for the reason it always was — and the run still reports whatever
 * `QFAI-CONTRACT-040` was going to report either way.
 */
function unreadableDerivedDeclaration(
  file: string,
  line: string,
  // Named as the binding is, because the ledger guard follows the NAME: an
  // emission whose severity expression is not the one bound to this entry's pin
  // reads as a hard-coded severity, which is a window that never opens.
  declarationSeverity: "warning" | "error",
): Issue {
  return issue(
    "QFAI-CONTRACT-041",
    `\`Derived (not stored):\` 宣言が解析できません: ${line}`,
    declarationSeverity,
    file,
    "contracts.crossContract.derivedNotStored",
    [line],
    "canonical",
    "書式は `-- Derived (not stored): <列名> = <値>, <値> from <導出元>` です。" +
      "`from` 以降 (何から導出するか) は必須で、省略すると宣言として読まれません — " +
      "値だけ書けるようにすると、この marker は答えではなく黙らせる手段になります。" +
      "値の並びは 1 つでも空要素があれば宣言全体が無効になります (書きかけの宣言が" +
      "完成したものとして読まれないため)。",
  );
}

/**
 * A declaration that did no work, which is a claim nobody is checking.
 *
 * Two ways to get here, and the message says which. The value is not one the
 * API requires — so nothing was ever going to ask about it — or the DB domain
 * stores it after all, which contradicts the declaration outright. Both are
 * stale rather than harmless: the next reader takes the line as a statement
 * about the schema, and it is not one.
 */
function staleDerivedDeclarations(
  collected: DbStateDomains,
  honoured: Set<string>,
  declarationSeverity: "warning" | "error",
): Issue[] {
  const issues: Issue[] = [];
  for (const [normalized, declarations] of collected.derived.entries()) {
    const domain = collected.domains.get(normalized);
    for (const declaration of declarations) {
      const unused = [...declaration.values]
        .filter((value) => !honoured.has(derivedKey(declaration, value)))
        .sort((a, b) => a.localeCompare(b));
      if (unused.length === 0) {
        continue;
      }
      const stored = unused.filter((value) => domain?.values.has(value) === true);
      const unasked = unused.filter((value) => domain?.values.has(value) !== true);
      issues.push(
        issue(
          "QFAI-CONTRACT-041",
          `\`Derived (not stored): ${declaration.fieldName}\` が挙げる値が何も裏付けていません: ` +
            unused.join(", ") +
            (stored.length > 0 ? ` (DB 側が格納できる: ${stored.join(", ")})` : "") +
            (unasked.length > 0 ? ` (API 契約が要求していない: ${unasked.join(", ")})` : ""),
          declarationSeverity,
          declaration.file,
          "contracts.crossContract.derivedNotStored",
          [declaration.fieldName, ...unused],
          "canonical",
          (stored.length > 0
            ? "DB 側のドメインがその値を格納できるので、`格納しない` という宣言と矛盾しています — " +
              "宣言を削るか、格納しないのであれば DB 側のドメインからその値を外してください。"
            : "") +
            (unasked.length > 0
              ? "API 契約がその値を要求していないので、この宣言は何も免除していません — " +
                "API 側に値を足す予定なら宣言はそのままで構いませんが、そうでなければ削ってください。"
              : ""),
        ),
      );
    }
  }
  return issues;
}

async function validateApiFileAgainstDb(
  file: string,
  collected: DbStateDomains,
  honoured: Set<string>,
): Promise<Issue[]> {
  const dbDomains = collected.domains;
  let doc: Record<string, unknown>;
  try {
    const text = await readFile(file, "utf-8");
    doc = parseStructuredContract(file, stripContractDeclarationLines(text));
  } catch {
    // Parse failures are already reported as QFAI-CONTRACT-021 by validateContracts.
    return [];
  }

  const issues: Issue[] = [];
  for (const [normalized, api] of collectApiStateEnums(doc).entries()) {
    const db = dbDomains.get(normalized);
    if (!db) {
      continue;
    }
    const declarations = collected.derived.get(normalized) ?? [];
    // Subtracted, not exempted wholesale. A value nobody declared still fires,
    // or the marker would be a way to silence the rule rather than a way to
    // answer it — and the declaration is credited only for a value the DB
    // genuinely cannot store, so a declaration covering a stored value earns
    // nothing and is reported below.
    const unrepresentable = Array.from(api.values)
      .filter((value) => !db.values.has(value.toLowerCase()))
      .filter((value) => {
        const lower = value.toLowerCase();
        const covering = declarations.filter((entry) => entry.values.has(lower));
        for (const entry of covering) {
          honoured.add(derivedKey(entry, lower));
        }
        return covering.length === 0;
      })
      .sort((a, b) => a.localeCompare(b));
    if (unrepresentable.length === 0) {
      continue;
    }
    const dbFileList = domainFiles(db);
    const enumOnly = isEnumOnly(db);
    const enumContributors = enumFiles(db);
    // `error` only when EVERY candidate binding is an ENUM, because that is
    // when the two contracts cannot both be implemented whichever binding is
    // the real one: Postgres rejects the value at insert time. Every gate qfai
    // prescribes is `--fail-on error`, so at `warning` this never blocked
    // anything and sat in a bucket ~95 entries deep — the constraint violation
    // was found by Postgres rather than by the gate that exists to find it
    // (#1100).
    //
    // A `CHECK` constraint stays `warning`: it is a bound the DB currently
    // asserts rather than the shape of the column, and it can be dropped,
    // replaced or declared `NOT VALID`. Raising both would lose the distinction
    // between "impossible" and "currently disallowed".
    //
    // A MIX stays `warning` too, and this is the case #1162 reported: one
    // `CHECK` among the candidates means the value can be stored in a contract
    // the pairing considers a match, so "no implementation can satisfy this"
    // is not a claim this rule is entitled to make from a field name alone.
    const severity = enumOnly ? "error" : "warning";
    issues.push(
      issue(
        "QFAI-CONTRACT-040",
        `API 契約が要求する ${api.fieldName} の値が、同名フィールドを宣言する DB 契約で表現できません: ` +
          `${unrepresentable.join(", ")} (${describeDbDomain(db)}; ` +
          `DB 契約: ${dbFileList.join(", ")}; DB 側の制約: ${describeDbConstraint(db)})`,
        severity,
        file,
        "contracts.crossContract.stateDomain",
        [api.fieldName, ...unrepresentable],
        "canonical",
        mixedRemedy(enumOnly, dbFileList, enumContributors) +
          "照合は明示的なペア宣言でなく、正規化後のフィールド名が一致する DB 契約群のドメインに対して行われます。",
      ),
    );
  }
  return issues;
}

type ApiStateEnum = {
  fieldName: string;
  values: Set<string>;
};

/**
 * Walks a parsed OpenAPI document and collects `enum` domains declared for state-like fields.
 * Keyed by the normalized field name so `transactionState` and `transaction_state` reconcile.
 */
export function collectApiStateEnums(doc: unknown): Map<string, ApiStateEnum> {
  const found = new Map<string, ApiStateEnum>();
  walk(doc, null, found, new Map(), doc);
  return found;
}

/**
 * Recursion guard for {@link walk}: the property keys each node has already
 * been visited under.
 *
 * Keying on the node alone made a shared object a one-shot: a YAML anchor
 * (`state: &s {enum: [...]}` reused as `*s` for `status`) parses to ONE object
 * that both fields point at, so the second field was skipped entirely and its
 * domain never reached the reconciliation — `QFAI-CONTRACT-040` silently missed
 * the contradiction it exists to find. Keying on the (node, key) pair lets the
 * shared node contribute under every field name that reaches it while still
 * terminating on cycles, because a cycle necessarily revisits a pair.
 */
type WalkVisits = Map<object, Set<string>>;

function walk(
  node: unknown,
  key: string | null,
  out: Map<string, ApiStateEnum>,
  seen: WalkVisits,
  root: unknown,
): void {
  if (!node || typeof node !== "object") {
    return;
  }
  const visitKey = key ?? "";
  const visitedKeys = seen.get(node);
  if (visitedKeys) {
    if (visitedKeys.has(visitKey)) {
      return;
    }
    visitedKeys.add(visitKey);
  } else {
    seen.set(node, new Set([visitKey]));
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, key, out, seen, root);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (key && isStateLikeFieldName(key)) {
    const values = readFieldEnum(record, root);
    if (values.length > 0) {
      const normalized = normalizeFieldName(key);
      const existing = out.get(normalized);
      if (existing) {
        values.forEach((value) => existing.values.add(value));
      } else {
        out.set(normalized, { fieldName: key, values: new Set(values) });
      }
    }
  }

  for (const [childKey, childValue] of Object.entries(record)) {
    walk(childValue, childKey, out, seen, root);
  }
}

/**
 * Enum domain a state-like property declares, whether inline or behind a local `$ref`.
 *
 * `status: { $ref: "#/components/schemas/OrderStatus" }` is the idiomatic OpenAPI shape and the
 * referencing site carries no `enum` of its own. Without resolving the pointer the domain is only
 * ever collected under the component name (`orderstatus`), which never reconciles with a DB
 * contract that bounds the column `status` — the pairing this validator exists to check silently
 * degrades to a no-op. Resolve it so the values are keyed by the *referencing field* name.
 */
function readFieldEnum(record: Record<string, unknown>, root: unknown): string[] {
  const direct = readStringEnum(record.enum);
  if (direct.length > 0) {
    return direct;
  }
  return readEnumThroughRef(record.$ref, root, new Set());
}

/**
 * Follows a chain of local (`#/...`) `$ref` pointers until one resolves to a node carrying an
 * `enum`. Remote refs (`other.yaml#/...`, URLs) are out of scope: the validator only reads the
 * contract files handed to it, so it cannot honestly resolve a pointer into a document it has not
 * loaded. The visited set makes a self-referential ref cycle terminate instead of recursing.
 */
function readEnumThroughRef(ref: unknown, root: unknown, seen: Set<string>): string[] {
  if (typeof ref !== "string" || !ref.startsWith("#/") || seen.has(ref)) {
    return [];
  }
  seen.add(ref);
  const target = resolveLocalRef(root, ref);
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return [];
  }
  const record = target as Record<string, unknown>;
  const direct = readStringEnum(record.enum);
  if (direct.length > 0) {
    return direct;
  }
  return readEnumThroughRef(record.$ref, root, seen);
}

/** Resolves a JSON-pointer fragment (`#/components/schemas/OrderStatus`) against `root`. */
function resolveLocalRef(root: unknown, ref: string): unknown {
  let current: unknown = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    if (rawSegment.length === 0) {
      continue;
    }
    // RFC 6901 escaping: `~1` is `/`, `~0` is `~`. Order matters.
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    const record = current as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, segment)) {
      return undefined;
    }
    current = record[segment];
  }
  return current;
}

function readStringEnum(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/** `state`, `status`, `transaction_state`, `transactionStatus`, ... */
export function isStateLikeFieldName(name: string): boolean {
  return /(^|[^a-z])(state|status)$/i.test(name.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Drops case and separators so `transaction_state` === `transactionState`. */
export function normalizeFieldName(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

const CHECK_IN_PATTERN = /\bCHECK\s*\(\s*\(?\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+IN\s*\(([^)]*)\)/gi;
const CREATE_TYPE_ENUM_PATTERN =
  /\bCREATE\s+TYPE\s+(?:[A-Za-z_][A-Za-z0-9_]*\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+AS\s+ENUM\s*\(([^)]*)\)/gi;
const INLINE_ENUM_PATTERN = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+ENUM\s*\(([^)]*)\)/gim;

// Column declarations that USE a named enum type. `CREATE TYPE ... AS ENUM` binds values to the
// type name, not to any column, so the domain has to be carried across the usage edge before it
// can be reconciled with an API field name. Each pattern captures (column, type):
//   1. a column line inside a CREATE TABLE body — `status order_status NOT NULL`
//   2. `ALTER TABLE ... ADD COLUMN status order_status`
//   3. `ALTER TABLE ... ALTER COLUMN status [SET DATA] TYPE order_status`
// A schema qualifier (`public.order_status`) is consumed and ignored: types are matched by their
// bare name, which is how the declaration side records them too.
const NAMED_TYPE_USAGE_PATTERNS = [
  /(?:^|[(,])\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gim,
  /\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi,
  /\bALTER\s+(?:COLUMN\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:SET\s+DATA\s+)?TYPE\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi,
] as const;

const CREATE_TABLE_PATTERN =
  /\bCREATE\s+(?:(?:GLOBAL|LOCAL)\s+)?(?:(?:TEMPORARY|TEMP|UNLOGGED)\s+)?TABLE\b/gi;

/** How many tables a contract declares, over text with comments removed. */
function countCreateTables(rawText: string): number {
  return (stripSqlComments(rawText).match(CREATE_TABLE_PATTERN) ?? []).length;
}

/**
 * A `Derived (not stored)` declaration: values computed at read time.
 *
 * `QFAI-CONTRACT-040` asks that every state value an API contract mandates be
 * representable in the paired DB domain, and for a value that is never STORED
 * both of the remedies it offers are wrong. Widening the domain would make it
 * possible to store a value the DB contract says must not be stored — and a
 * value derived from the wall clock goes stale the moment the clock moves,
 * which is why it is not stored. Deleting it from the API would remove a value
 * the UI contract requires the screen to display. There was no way to say so,
 * so the finding had no valid remedy and stayed in the bucket forever (#1203).
 *
 * The declaration lives in the DB contract, not on the API property, because
 * storage is the DB contract's subject. An API contract asserting "this is not
 * stored" would let the side making the DEMAND silence the side that answers
 * it — and the projects that hit this already state the derivation in their DB
 * contract's prose, so this makes an existing claim machine-readable rather
 * than inventing a place for it.
 */
type DerivedDeclaration = {
  file: string;
  /** The column name as written, for the message. */
  fieldName: string;
  /** Values the contract says are computed rather than stored. */
  values: Set<string>;
  /** What they are computed FROM, as written. */
  inputs: string;
};

/**
 * `-- Derived (not stored): status = standby, powered_off from enabled, clock`
 *
 * Both anchors are the ones {@link DEPENDS_ON_COMMENT_RE}'s docblock argues
 * for, and for the same reason: the comment marker is required and the key
 * starts the line, so prose ABOUT a derivation — the natural thing to write in
 * a DDL comment above the column — is not itself a declaration.
 *
 * The `from` clause is required. Without it the marker would be a one-word
 * silencer for any value an author found inconvenient; naming the inputs is
 * what makes the claim reviewable, and it is the half a reader needs in order
 * to check that nothing in the list is a column the derivation would have to
 * store.
 */
const DERIVED_NOT_STORED_RE =
  /^[ \t]*(?:--|#|\/\/|\*)[ \t]*Derived \(not stored\):[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(.+?)[ \t]+from[ \t]+(.+?)[ \t]*$/gim;

/** The key with anything after it, for telling a typo from an absence. */
const DERIVED_KEY_RE = /^[ \t]*(?:--|#|\/\/|\*)[ \t]*Derived \(not stored\):[ \t]*(.*)$/gim;

/**
 * Every readable declaration in one contract, and every line that tried to be
 * one and failed.
 *
 * A malformed declaration is REPORTED rather than ignored. Ignoring it is the
 * silent-failure shape `dependencyIdsFromElements` was written to avoid: an
 * author writes the marker, mistypes the `from` clause, sees the finding they
 * were trying to answer still standing, and has nothing telling them the
 * declaration was never read.
 */
function collectDerivedDeclarations(
  file: string,
  text: string,
): { declared: DerivedDeclaration[]; malformed: string[] } {
  // The raw text, NOT comment-stripped: the declaration lives in a comment.
  const body = text;
  const declared: DerivedDeclaration[] = [];
  const readable = new Set<string>();
  for (const match of body.matchAll(DERIVED_NOT_STORED_RE)) {
    // Narrowed rather than asserted. Every group of `DERIVED_NOT_STORED_RE` is
    // required today, so a match always carries all three — but saying so with
    // an `as` would let a later edit making one optional pass with nothing to
    // notice it, and the repository's TypeScript rule is to narrow instead.
    const line = match[0];
    const fieldName = match[1];
    const valueList = match[2];
    const inputs = match[3];
    if (fieldName === undefined || valueList === undefined || inputs === undefined) {
      continue;
    }
    const elements = valueList.split(",");
    const values = elements.map((value) => value.trim().toLowerCase());
    // The whole list or none of it, as the apply-order lanes do: a trailing
    // comma or an empty element means the author was mid-edit, and harvesting
    // the readable half would let a half-written declaration silence a value.
    if (values.some((value) => value.length === 0) || inputs.trim() === "") {
      continue;
    }
    readable.add(line);
    declared.push({ file, fieldName, values: new Set(values), inputs: inputs.trim() });
  }
  const malformed: string[] = [];
  for (const match of body.matchAll(DERIVED_KEY_RE)) {
    const line = match[0];
    if (!readable.has(line)) {
      malformed.push(line.trim());
    }
  }
  return { declared, malformed };
}

type DbStateDomains = {
  domains: Map<string, DbDomain>;
  /** Readable declarations, keyed by normalized field name. */
  derived: Map<string, DerivedDeclaration[]>;
  /** Lines that carry the key but do not parse, per contract file. */
  malformed: { file: string; line: string }[];
};

async function collectDbStateDomains(dbFiles: string[]): Promise<DbStateDomains> {
  const domains = new Map<string, DbDomain>();
  const derived = new Map<string, DerivedDeclaration[]>();
  const malformed: { file: string; line: string }[] = [];
  for (const file of dbFiles) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    const declarations = collectDerivedDeclarations(file, text);
    for (const line of declarations.malformed) {
      malformed.push({ file, line });
    }
    for (const declaration of declarations.declared) {
      const key = normalizeFieldName(declaration.fieldName);
      const existing = derived.get(key);
      if (existing) {
        existing.push(declaration);
      } else {
        derived.set(key, [declaration]);
      }
    }
    // One table means one column of any given name, so a name carrying both
    // forms carries them on the SAME column and #1100's "enum wins" applies.
    // Counted over comment-stripped text, so a commented-out `CREATE TABLE`
    // cannot make a single-table contract look like several.
    const singleTable = countCreateTables(text) <= 1;
    for (const [name, bound] of collectSqlDomainBounds(text).entries()) {
      if (!isStateLikeFieldName(name)) {
        continue;
      }
      const normalized = normalizeFieldName(name);
      const binding: DbFieldBinding = {
        file,
        values: new Set(bound.values),
        // Decisive only when the two forms cannot be on different columns.
        enumBacked: bound.enumBacked && (!bound.checkBacked || singleTable),
        enumEvidence: bound.enumBacked,
      };
      const existing = domains.get(normalized);
      if (existing) {
        // Appended, not merged. Two contracts declaring one field NAME are two
        // candidate bindings, and which of them bounds a given API field is
        // not something a name match can tell — see {@link DbDomain}.
        const sameFile = existing.bindings.find((entry) => entry.file === file);
        if (sameFile) {
          binding.values.forEach((value) => sameFile.values.add(value));
          sameFile.enumBacked = sameFile.enumBacked || binding.enumBacked;
          sameFile.enumEvidence = sameFile.enumEvidence || binding.enumEvidence;
        } else {
          existing.bindings.push(binding);
        }
        // The union grows with the bindings, here and nowhere else.
        binding.values.forEach((value) => existing.values.add(value));
      } else {
        domains.set(normalized, { bindings: [binding], values: new Set(binding.values) });
      }
    }
  }
  return { domains, derived, malformed };
}

/**
 * Extracts `name -> allowed values` from the SQL forms a DB contract uses to bound a domain.
 * Values are lower-cased; comparison is case-insensitive on both sides.
 */
export function collectSqlEnumDomains(rawText: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [name, bound] of collectSqlDomainBounds(rawText).entries()) {
    out.set(name, bound.values);
  }
  return out;
}

/** A field's allowed values, and whether the bound is a Postgres ENUM. */
export type SqlDomainBound = {
  values: string[];
  /**
   * True for `CREATE TYPE … AS ENUM` and inline `col ENUM(…)`; false for
   * `CHECK (col IN (…))`.
   *
   * The distinction decides `QFAI-CONTRACT-040`'s severity: an ENUM rejects an
   * out-of-domain value at insert time, so an API contract requiring one
   * describes a pair no implementation can satisfy. A check constraint is a
   * bound the DB currently asserts and can be dropped, replaced or declared
   * `NOT VALID` (#1100).
   */
  enumBacked: boolean;
  /**
   * True when a `CHECK (col IN (…))` was also seen for this name in this file.
   *
   * Not exclusive with {@link enumBacked}, and recorded rather than folded
   * because the PAIR is what says whether the ENUM reading is decisive — this
   * map is keyed by column name, so two tables with a same-named column look
   * exactly like one column bound twice. See `DbFieldBinding.enumEvidence`.
   */
  checkBacked: boolean;
};

/**
 * As {@link collectSqlEnumDomains}, and it also says which SQL form bound each
 * field.
 *
 * Where both forms bound one field, `enumBacked` is true: the strictest
 * constraint is the one an implementation has to satisfy, so a column that is
 * an ENUM *and* carries a redundant `CHECK` is still impossible to violate.
 */
export function collectSqlDomainBounds(rawText: string): Map<string, SqlDomainBound> {
  const text = stripSqlComments(rawText);
  const domains = new Map<string, SqlDomainBound>();
  const patterns = [CHECK_IN_PATTERN, CREATE_TYPE_ENUM_PATTERN, INLINE_ENUM_PATTERN];
  const namedTypes = new Map<string, { name: string; literals: string[] }>();

  const add = (name: string, literals: string[], enumBacked: boolean): void => {
    const existing = domains.get(name);
    domains.set(
      name,
      existing
        ? {
            values: Array.from(new Set([...existing.values, ...literals])),
            enumBacked: existing.enumBacked || enumBacked,
            checkBacked: existing.checkBacked || !enumBacked,
          }
        : { values: literals, enumBacked, checkBacked: !enumBacked },
    );
  };

  for (const pattern of patterns) {
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = scoped.exec(text);
    while (match !== null) {
      const name = match[1];
      const literals = readSqlStringLiterals(match[2] ?? "");
      if (name && literals.length > 0) {
        // `CREATE TYPE` binds values to a TYPE, not to a field. Hold it aside until the column
        // usages are known so the type name is not published as if it were a column.
        if (pattern === CREATE_TYPE_ENUM_PATTERN) {
          const key = name.toLowerCase();
          const existing = namedTypes.get(key);
          namedTypes.set(key, {
            name,
            literals: existing
              ? Array.from(new Set([...existing.literals, ...literals]))
              : literals,
          });
        } else {
          // `INLINE_ENUM_PATTERN` is an ENUM column; `CHECK_IN_PATTERN` is not.
          add(name, literals, pattern === INLINE_ENUM_PATTERN);
        }
      }
      match = scoped.exec(text);
    }
  }

  // Carry each named enum type's domain onto the columns declared with it. Without this the
  // values stay keyed by the type name (`order_status`), so a column `status order_status` is
  // invisible to a reconciliation keyed on the API field name `status`.
  const resolved = resolveNamedTypeColumns(text, namedTypes);
  for (const [column, literals] of resolved.columns.entries()) {
    // A column declared with a named enum type IS an enum column.
    add(column, literals, true);
  }
  // Fall back to the type name only for types whose column usage is not visible here (declared in
  // one contract file, used in another). Publishing it alongside a resolved column would report
  // the same contradiction twice — once as `status`, once as `order_status`.
  for (const [key, entry] of namedTypes.entries()) {
    if (!resolved.usedTypes.has(key)) {
      add(entry.name, entry.literals, true);
    }
  }

  return domains;
}

/**
 * Maps `column -> values` for every column declared with one of `namedTypes`, and reports which
 * type keys were consumed so the caller can suppress the now-redundant type-name entry.
 *
 * The type-name filter is what keeps the column patterns safe: they are permissive enough to
 * match ordinary DDL noise, but a capture is only kept when its second token is a type this file
 * actually declared as an enum, which no keyword or built-in type will be.
 */
function resolveNamedTypeColumns(
  text: string,
  namedTypes: Map<string, { name: string; literals: string[] }>,
): { columns: Map<string, string[]>; usedTypes: Set<string> } {
  const columns = new Map<string, string[]>();
  const usedTypes = new Set<string>();
  if (namedTypes.size === 0) {
    return { columns, usedTypes };
  }
  for (const pattern of NAMED_TYPE_USAGE_PATTERNS) {
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = scoped.exec(text);
    while (match !== null) {
      const column = match[1];
      const typeKey = match[2]?.toLowerCase();
      const entry = typeKey ? namedTypes.get(typeKey) : undefined;
      if (column && typeKey && entry) {
        usedTypes.add(typeKey);
        const existing = columns.get(column);
        columns.set(
          column,
          existing ? Array.from(new Set([...existing, ...entry.literals])) : [...entry.literals],
        );
      }
      match = scoped.exec(text);
    }
  }
  return { columns, usedTypes };
}

function readSqlStringLiterals(list: string): string[] {
  const values: string[] = [];
  // `''` is SQL's escape for a literal quote, so a value may contain quote
  // pairs: `ENUM ('don''t', 'ok')` is two values, not four fragments. Matching
  // `'([^']*)'` split `don''t` into `don` + `t` and dropped the rest of the
  // list, which both invents values the contract never declared and loses ones
  // it did — false positives and false negatives from the same bug.
  for (const match of list.matchAll(/'((?:[^']|'')*)'/g)) {
    const value = match[1]?.replace(/''/g, "'");
    if (value && !values.includes(value.toLowerCase())) {
      values.push(value.toLowerCase());
    }
  }
  return values;
}

/**
 * Blank out SQL comments so a commented-out `CHECK (...)` or
 * `CREATE TYPE ... AS ENUM` cannot be read as a live domain.
 *
 * The DB contract template itself ships full-line `-- QFAI-CONTRACT-ID: ...`
 * headers, so scanning raw text means every contract carries comment content
 * into the domain extractor and `QFAI-CONTRACT-040` can fire on a domain
 * nobody declared.
 *
 * Comments are replaced with spaces rather than removed so byte offsets stay
 * aligned with the input — the caller runs several independent regex passes
 * over the same text and their captures must agree.
 *
 * A comment marker inside a string literal is not a comment (`'a--b'` is a
 * value), so the scan tracks quoting, including the `''` escape.
 */
export function stripSqlComments(text: string): string {
  const out = text.split("");
  let index = 0;
  let inString = false;
  while (index < text.length) {
    const ch = text[index];
    if (inString) {
      if (ch === "'") {
        // A doubled quote is an escaped quote, not the end of the literal.
        if (text[index + 1] === "'") {
          index += 2;
          continue;
        }
        inString = false;
      }
      index += 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      index += 1;
      continue;
    }
    if (ch === "-" && text[index + 1] === "-") {
      while (index < text.length && text[index] !== "\n") {
        out[index] = " ";
        index += 1;
      }
      continue;
    }
    if (ch === "/" && text[index + 1] === "*") {
      const end = text.indexOf("*/", index + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (let i = index; i < stop; i += 1) {
        if (out[i] !== "\n") {
          out[i] = " ";
        }
      }
      index = stop;
      continue;
    }
    index += 1;
  }
  return out.join("");
}
