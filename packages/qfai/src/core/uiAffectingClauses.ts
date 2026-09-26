/**
 * The clauses of `qfai-implement/references/ui-affecting.md`, evaluated from
 * the repository.
 *
 * A completed row that records `Prototype parity: n/a (not UI-affecting)` owes
 * no product-surface review, so the answer is the cheapest one to give, and the
 * gate read only the answer. These are the parts of the definition a gate over
 * the checked-out tree can evaluate: clause 1 where `Owning module` is declared,
 * clause 2, and clause 3.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { collectFiles } from "./fs.js";

/** What `structure.md#ui-surface-paths-ssot` declares. */
export type DeclaredUiPaths =
  | { readonly kind: "globs"; readonly globs: readonly string[] }
  | { readonly kind: "none" }
  | { readonly kind: "undeclared" };

/** The row a clause is evaluated against, as the ledger declares it. */
export interface UiAffectingRow {
  /** The `Owning module` cell; `-` or empty when the ledger declares none. */
  readonly owningModule: string;
  readonly testFile: string;
  /** Every id in `TC-Refs`, `US-Refs` and `CON-API-Refs`. */
  readonly obligations: readonly string[];
}

/** Where a spec's obligations are declared. */
export interface ObligationSources {
  readonly testCases: string;
  readonly userStories: string;
}

/** The first clause that holds, and what made it hold. */
export interface HoldingClause {
  readonly clause: 1 | 2 | 3;
  readonly because: string;
}

/**
 * The declared UI paths, read once per root.
 *
 * Bullets still at the template's `<...>` placeholder declare nothing, and a
 * section with no other bullet leaves clauses 1 and 2 unevaluable rather than
 * answered.
 */
export async function readDeclaredUiPaths(
  root: string,
  contractsDir = ".qfai/spec/03_contract",
): Promise<DeclaredUiPaths> {
  let text: string;
  try {
    text = await readFile(path.resolve(root, contractsDir, "structure.md"), "utf-8");
  } catch {
    return { kind: "undeclared" };
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const heading = lines.findIndex((line) => /^##\s+UI surface paths\b/i.test(line));
  if (heading < 0) return { kind: "undeclared" };
  const end = lines.findIndex((line, index) => index > heading && /^##\s/.test(line));
  const section = lines.slice(heading + 1, end < 0 ? lines.length : end);
  const start = section.findIndex((line) => /^\s*ui_paths:\s*$/.test(line));
  if (start < 0) return { kind: "undeclared" };
  const bullets = section
    .slice(start + 1)
    .map((line) => /^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => value.replace(/^`([^`]*)`$/, "$1").trim());
  if (bullets.some((value) => value.toLowerCase() === "none")) return { kind: "none" };
  const globs = bullets.filter((value) => value.length > 0 && !/^<[^>]*>$/.test(value));
  return globs.length === 0 ? { kind: "undeclared" } : { kind: "globs", globs };
}

/**
 * Whether `candidate` matches `glob` under the rules `structure.md` fixes:
 * `**` is zero or more segments, `*` and `?` stay within one, a leading dot is
 * ordinary, matching is case-sensitive, and every other character is literal.
 */
export function uiPathGlobMatches(glob: string, candidate: string): boolean {
  const segments = glob.replace(/\\/g, "/").split("/");
  let source = "^";
  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    if (segment === "**") {
      if (!last) {
        source += "(?:[^/]+/)*";
      } else if (source.endsWith("/")) {
        source = `${source.slice(0, -1)}(?:/.*)?`;
      } else {
        source += ".*";
      }
      return;
    }
    for (const character of segment) {
      source +=
        character === "*"
          ? "[^/]*"
          : character === "?"
            ? "[^/]"
            : character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    if (!last) source += "/";
  });
  return new RegExp(`${source}$`).test(candidate.replace(/\\/g, "/"));
}

/** The ids a UI contract declares for screens, their tasks, elements and actions. */
function declaredUiIds(document: unknown): string[] {
  const ids: string[] = [];
  const idOf = (value: unknown): void => {
    if (isRecord(value) && typeof value.id === "string" && value.id.trim().length > 0) {
      ids.push(value.id.trim());
    }
  };
  if (!isRecord(document) || !Array.isArray(document.screens)) return ids;
  for (const screen of document.screens) {
    idOf(screen);
    if (!isRecord(screen)) continue;
    for (const key of ["primary_tasks", "elements", "actions"] as const) {
      const entries = screen[key];
      if (Array.isArray(entries)) entries.forEach(idOf);
    }
  }
  return ids;
}

interface UiContract {
  readonly file: string;
  readonly text: string;
  readonly ids: readonly string[];
}

/** Every `*.yaml` and `*.yml` under `<contractsDir>/ui/**`. */
async function readUiContracts(root: string, contractsDir: string): Promise<UiContract[]> {
  const dir = path.resolve(root, contractsDir, "ui");
  const files = await collectFiles(dir, { extensions: [".yaml", ".yml"] });
  const contracts: UiContract[] = [];
  for (const file of files.sort()) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    let ids: string[] = [];
    try {
      ids = declaredUiIds(parseYaml(text, { maxAliasCount: 0 }));
    } catch {
      // A contract that does not parse still carries its text for direction a;
      // its syntax is reported by the contract validators.
    }
    contracts.push({ file: toPosix(path.relative(root, file)), text, ids });
  }
  return contracts;
}

/** Every `*.yaml`, `*.yml` and `*.json` under `<contractsDir>/api/**` naming `id`. */
async function apiContractEntries(
  root: string,
  contractsDir: string,
  id: string,
): Promise<Array<{ file: string; text: string }>> {
  const dir = path.resolve(root, contractsDir, "api");
  const files = await collectFiles(dir, { extensions: [".yaml", ".yml", ".json"] });
  const entries: Array<{ file: string; text: string }> = [];
  for (const file of files.sort()) {
    try {
      const text = await readFile(file, "utf-8");
      if (standsAlone(text, id)) entries.push({ file: toPosix(path.relative(root, file)), text });
    } catch {
      continue;
    }
  }
  return entries;
}

/**
 * The lines of `document` that declare `id`: a table row whose first cell is
 * the id, and a section whose heading names it, down to the next heading at its
 * level or above.
 */
export function declaringEntry(document: string, id: string): string {
  const lines = document.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const firstCell = /^\s*\|\s*([^|]+?)\s*\|/.exec(line)?.[1];
    if (firstCell === id) {
      kept.push(line);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading === null || !standsAlone(heading[2] ?? "", id)) continue;
    const level = (heading[1] ?? "").length;
    kept.push(line);
    for (index += 1; index < lines.length; index += 1) {
      const next = /^(#{1,6})\s/.exec(lines[index] ?? "");
      if (next !== null && (next[1] ?? "").length <= level) {
        index -= 1;
        break;
      }
      kept.push(lines[index] ?? "");
    }
  }
  return kept.join("\n");
}

/**
 * Whether `id` occurs in `text` as itself: not inside a longer identifier, so
 * `home` does not occur in `homepage` and `TC-0001` does not occur in
 * `TC-00010`.
 */
export function standsAlone(text: string, id: string): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`).test(text);
}

/** Evaluates the clauses for the rows of one spec, reading each input once. */
export class UiAffectingClauses {
  private declared: Promise<DeclaredUiPaths> | null = null;
  private contracts: Promise<UiContract[]> | null = null;
  private readonly documents = new Map<string, Promise<string>>();

  constructor(
    private readonly root: string,
    private readonly contractsDir: string,
    private readonly sources: ObligationSources,
  ) {}

  /** The first clause that holds for `row`, or `null` when none the gate can read does. */
  async firstHolding(row: UiAffectingRow): Promise<HoldingClause | null> {
    const declared = await (this.declared ??= readDeclaredUiPaths(this.root, this.contractsDir));
    if (declared.kind === "globs") {
      const owning = row.owningModule.trim();
      if (owning.length > 0 && owning !== "-") {
        for (const candidate of await this.owningModuleCandidates(owning)) {
          const glob = declared.globs.find((entry) => uiPathGlobMatches(entry, candidate));
          if (glob !== undefined) {
            return { clause: 1, because: `Owning module ${owning} matches ${glob}` };
          }
        }
      }
      const testFile = row.testFile.trim();
      const glob = declared.globs.find((entry) => uiPathGlobMatches(entry, testFile));
      if (testFile.length > 0 && glob !== undefined) {
        return { clause: 2, because: `Test file ${testFile} matches ${glob}` };
      }
    }
    return this.linkedObligation(row.obligations);
  }

  /**
   * The two readings of an `Owning module` cell: verbatim, and with every `.`
   * a `/` when that names something in the tree.
   */
  private async owningModuleCandidates(cell: string): Promise<string[]> {
    const verbatim = cell.replace(/\\/g, "/");
    if (verbatim.includes("/") || !verbatim.includes(".")) return [verbatim];
    const dotted = verbatim.split(".").join("/");
    return (await namesSomethingInTree(this.root, dotted)) ? [verbatim, dotted] : [verbatim];
  }

  private async linkedObligation(obligations: readonly string[]): Promise<HoldingClause | null> {
    if (obligations.length === 0) return null;
    const contracts = await (this.contracts ??= readUiContracts(this.root, this.contractsDir));
    if (contracts.length === 0) return null;
    for (const id of obligations) {
      const naming = contracts.find((contract) => standsAlone(contract.text, id));
      if (naming !== undefined) {
        return { clause: 3, because: `${id} occurs in ${naming.file}` };
      }
      for (const source of await this.sourceEntries(id)) {
        for (const contract of contracts) {
          const uiId = contract.ids.find((candidate) => standsAlone(source.text, candidate));
          if (uiId !== undefined) {
            return {
              clause: 3,
              because: `${uiId} from ${contract.file} occurs in the entry for ${id} in ${source.file}`,
            };
          }
        }
      }
    }
    return null;
  }

  /** The entries that declare an obligation, by its kind. */
  private async sourceEntries(id: string): Promise<Array<{ file: string; text: string }>> {
    if (id.startsWith("CON-API-")) return apiContractEntries(this.root, this.contractsDir, id);
    const document = id.startsWith("TC-")
      ? this.sources.testCases
      : id.startsWith("US-")
        ? this.sources.userStories
        : null;
    if (document === null) return [];
    const text = await this.document(document);
    const entry = declaringEntry(text, id);
    return entry.length === 0
      ? []
      : [{ file: toPosix(path.relative(this.root, document)), text: entry }];
  }

  private document(file: string): Promise<string> {
    let cached = this.documents.get(file);
    if (cached === undefined) {
      cached = readFile(file, "utf-8").catch(() => "");
      this.documents.set(file, cached);
    }
    return cached;
  }
}

/**
 * Whether the tree has the path, or a path that begins with it followed by `/`
 * or `.`: a directory, the path itself, or that file with an extension.
 */
async function namesSomethingInTree(root: string, candidate: string): Promise<boolean> {
  const full = path.join(root, ...candidate.split("/"));
  try {
    await stat(full);
    return true;
  } catch {
    // Not the path itself; it may still name a file with an extension.
  }
  try {
    const base = path.basename(full);
    return (await readdir(path.dirname(full))).some((name) => name.startsWith(`${base}.`));
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
