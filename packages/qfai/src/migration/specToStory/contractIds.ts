import path from "node:path";

import {
  declaredContractId,
  extractDeclaredContractIds,
  extractDeclaredDependencies,
} from "../../core/contractsDecl.js";
import { collectFilesByGlobs } from "../../core/fs.js";
import { parseHeadings } from "../../core/parse/markdown.js";
import { CONTRACT_KIND_BY_DIR, contractNumber } from "../../core/storyTree/ids.js";
import { MigrationInputError, type MigrationContext, type MigrationOperation } from "./harness.js";
import {
  CONTRACT_MAP_PATH,
  oldContractIds,
  readContractMap,
  serializeContractMap,
  type ContractEntry,
  type ContractMap,
} from "./idMap.js";
import { readMigrationInput, repositoryRelative } from "./step05CasesToExamples.js";

/** A contract as the new index lists it. `path` is relative to `paths.contractsDir`. */
export type IndexedContract = {
  id: string;
  path: string;
  title: string;
  dependsOn: string[];
  old?: string;
  oldPath?: string;
};

export type ContractPlan = {
  map: ContractMap;
  contracts: IndexedContract[];
  operations: MigrationOperation[];
  forAPerson: string[];
};

const KIND_DIRS = Object.keys(CONTRACT_KIND_BY_DIR);
const EXTENSIONS = /\.(?:md|ya?ml|json|sql)$/i;
/** The design files a 1.x release generated beside its contracts; none of them is a contract. */
const NOT_CONTRACTS = new Set([
  "design/DESIGN.md.lock.yaml",
  "design/design-system.yaml",
  "design/prototype-handoff.yaml",
]);
const OLD_CONTRACT_ID = /^CON-(?:API|DB|UI)-(\d+)$/;
export const OLD_CONTRACT_TOKEN = /\bCON-(?:API|DB|UI)-\d+\b/g;
const DECLARATION = /^(\s*(?:#|\/\/|--|\/\*+|\*+)?\s*QFAI-CONTRACT-ID:\s*)(\S+)(.*)$/;
const DEPENDS_COMMENT = /^[ \t]*(?:#|\/\/|--|\*)[ \t]*Depends on:/i;
const DEPENDS_KEY = /^\s*"?x-qfai-depends-on"?\s*:(.*)$/i;
const FILE_LIMIT = 200_000;

function kindOf(relative: string): string {
  const directory = relative.split("/")[0] ?? "";
  return Object.entries(CONTRACT_KIND_BY_DIR).find(([name]) => name === directory)?.[1] ?? "";
}

async function contractFiles(context: MigrationContext): Promise<string[]> {
  const selected = await collectFilesByGlobs(context.contractsDir, {
    globs: KIND_DIRS.map((directory) => `${directory}/**/*`),
    limit: FILE_LIMIT,
  });
  if (selected.truncated)
    throw new MigrationInputError(`Contract selection exceeds ${FILE_LIMIT} files`);
  return selected.files
    .map((file) => path.relative(context.contractsDir, file).split(path.sep).join("/"))
    .filter((relative) => EXTENSIONS.test(relative) && !NOT_CONTRACTS.has(relative))
    .sort();
}

/** `api/api-0001-orders.yaml` for API-0001 at `api/orders.yaml`. */
export function renamedContractPath(relative: string, id: string): string {
  const extension = path.posix.extname(relative);
  const base = path.posix
    .basename(relative, extension)
    .toLowerCase()
    .replace(/^(?:con-)?(?:cli|api|db|ui|design)-\d+(?:-|$)/, "");
  const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "contract";
  const name = `${id.toLowerCase()}-${slug}${extension.toLowerCase()}`;
  const directory = path.posix.dirname(relative);
  return directory === "." ? name : `${directory}/${name}`;
}

type Candidate = { relative: string; kind: string; old: string | null };

/**
 * Numbers every contract that declares no `<KIND>-NNNN` ID: in the kind order
 * cli, api, db, ui, design, then by the number of its old `CON-*` ID, then by
 * path. Numbers run on from the highest a contract already declares.
 */
async function assignContractIds(
  context: MigrationContext,
): Promise<{ map: ContractMap; forAPerson: string[] }> {
  const candidates: Candidate[] = [];
  const forAPerson: string[] = [];
  let highest = 0;
  for (const relative of await contractFiles(context)) {
    const text = (await readMigrationInput(path.join(context.contractsDir, relative))) ?? "";
    const current = declaredContractId(relative, text);
    if (current !== null) {
      highest = Math.max(highest, Number(contractNumber(current)));
      continue;
    }
    const declared = extractDeclaredContractIds(text);
    if (declared.length > 1) {
      forAPerson.push(
        `${contractRepoPath(context, relative)}: declares ${declared.join(", ")}; keep one declaration and run step 3 again`,
      );
      continue;
    }
    const old = declared[0] ?? "";
    candidates.push({
      relative,
      kind: kindOf(relative),
      old: OLD_CONTRACT_ID.test(old) ? old : null,
    });
  }
  const oldNumber = (candidate: Candidate) =>
    Number(OLD_CONTRACT_ID.exec(candidate.old ?? "")?.[1] ?? Number.POSITIVE_INFINITY);
  const kindOrder: string[] = Object.values(CONTRACT_KIND_BY_DIR);
  candidates.sort(
    (left, right) =>
      kindOrder.indexOf(left.kind) - kindOrder.indexOf(right.kind) ||
      oldNumber(left) - oldNumber(right) ||
      left.relative.localeCompare(right.relative),
  );
  const map: ContractMap = {};
  for (const [index, candidate] of candidates.entries()) {
    const id = `${candidate.kind}-${String(highest + index + 1).padStart(4, "0")}`;
    const entry: ContractEntry = { id, path: renamedContractPath(candidate.relative, id) };
    if (candidate.old) entry.old = candidate.old;
    map[candidate.relative] = entry;
  }
  return { map, forAPerson };
}

function contractRepoPath(context: MigrationContext, relative: string): string {
  return repositoryRelative(context.root, path.join(context.contractsDir, relative));
}

function replaceTokens(line: string, oldIds: Record<string, string>): string {
  return line.replace(OLD_CONTRACT_TOKEN, (token) => oldIds[token] ?? token);
}

function declarationLine(relative: string, id: string): string {
  const extension = path.posix.extname(relative).toLowerCase();
  if (extension === ".sql") return `-- QFAI-CONTRACT-ID: ${id}`;
  if (extension === ".json") return `// QFAI-CONTRACT-ID: ${id}`;
  return `# QFAI-CONTRACT-ID: ${id}`;
}

/**
 * The contract with its new ID declared, and the old IDs its dependency
 * declaration names replaced. Any other old ID is left for a person.
 */
function rewriteStructured(
  text: string,
  relative: string,
  id: string,
  oldIds: Record<string, string>,
): string {
  const lines = text.split("\n");
  if (!lines.some((line) => DECLARATION.test(line)))
    return rewriteStructured(`${declarationLine(relative, id)}\n${text}`, relative, id, oldIds);
  let list: "array" | "block" | null = null;
  const rewritten = lines.map((line) => {
    const declaration = DECLARATION.exec(line);
    if (declaration) return `${declaration[1] ?? ""}${id}${declaration[3] ?? ""}`;
    const key = DEPENDS_KEY.exec(line);
    if (key) {
      const value = (key[1] ?? "").replace(/#.*$/, "").trim();
      list = value === "" ? "block" : value.includes("[") && !value.includes("]") ? "array" : null;
      return replaceTokens(line, oldIds);
    }
    if (list === "array") {
      if (line.includes("]")) list = null;
      return replaceTokens(line, oldIds);
    }
    if (list === "block" && /^\s*-\s/.test(line)) return replaceTokens(line, oldIds);
    list = null;
    return DEPENDS_COMMENT.test(line) ? replaceTokens(line, oldIds) : line;
  });
  return rewritten.join("\n");
}

/** A Markdown contract declares its ID in its H1: `# API-0001: <title>`. */
function rewriteMarkdown(text: string, relative: string, id: string): string {
  const heading = parseHeadings(text).find((item) => item.level === 1);
  if (!heading) return `# ${id}: ${defaultTitle(relative)}\n\n${text}`;
  const old = heading.title.replace(/^(?:Contract|CON-(?:API|DB|UI)-\d+)\s*:\s*/i, "").trim();
  // A 1.x declaration written as a Markdown comment line reads as an H1, and names no title.
  const title = old === "" || old.startsWith("QFAI-CONTRACT-ID:") ? defaultTitle(relative) : old;
  const lines = text.split("\n");
  lines[heading.line - 1] = `# ${id}: ${title}`;
  return lines.join("\n");
}

export function defaultTitle(relative: string): string {
  return path.posix
    .basename(relative, path.posix.extname(relative))
    .replace(/^(?:cli|api|db|ui|design)-\d{4}-/i, "");
}

function rewriteContract(
  text: string,
  relative: string,
  id: string,
  oldIds: Record<string, string>,
): string {
  return relative.toLowerCase().endsWith(".md")
    ? rewriteMarkdown(text, relative, id)
    : rewriteStructured(text, relative, id, oldIds);
}

/** Every old `CON-*` ID still in a rewritten contract, one item per line. */
function leftoverIds(text: string, repoPath: string, oldIds: Record<string, string>): string[] {
  return text.split("\n").flatMap((line, index) =>
    [...new Set(line.match(OLD_CONTRACT_TOKEN) ?? [])].map((token) => {
      const next = oldIds[token];
      return next
        ? `${repoPath}:${index + 1}: ${token} is now ${next}; write ${next} here and wherever the project uses ${token}`
        : `${repoPath}:${index + 1}: ${token} is declared by no contract, so it has no new ID`;
    }),
  );
}

function contractTitle(text: string, relative: string): string {
  if (!relative.toLowerCase().endsWith(".md")) return "";
  const heading = parseHeadings(text).find((item) => item.level === 1);
  return heading?.title.replace(/^(?:CLI|API|DB|UI|DESIGN)-\d{4}:\s*/, "").trim() ?? "";
}

/**
 * Step 3's contract work: the contract map, read back when an earlier run wrote
 * it, and for each 1.x contract still at its old path the write of its renamed
 * copy and the removal of the old file.
 */
export async function planContracts(context: MigrationContext): Promise<ContractPlan> {
  const existing = await readContractMap(context.root);
  const assigned = existing === null ? await assignContractIds(context) : null;
  const map = existing ?? assigned?.map ?? {};
  const forAPerson = [...(assigned?.forAPerson ?? [])];
  const operations: MigrationOperation[] = [];
  if (existing === null && Object.keys(map).length > 0)
    operations.push({
      kind: "write",
      target: CONTRACT_MAP_PATH,
      content: serializeContractMap(map),
    });
  const oldIds = oldContractIds(map);
  const contracts: IndexedContract[] = [];
  const renamed = new Set(Object.values(map).map((entry) => entry.path));
  for (const [relative, entry] of Object.entries(map)) {
    assertRenameable(context, map, relative, entry);
    const oldText = await readMigrationInput(path.join(context.contractsDir, relative));
    const current = await readMigrationInput(path.join(context.contractsDir, entry.path));
    const text = oldText === null ? current : rewriteContract(oldText, relative, entry.id, oldIds);
    if (text === null) continue;
    if (oldText !== null)
      operations.push(...renameOperations(context, relative, entry, text, current));
    forAPerson.push(...leftoverIds(text, contractRepoPath(context, entry.path), oldIds));
    contracts.push(indexed(entry.path, entry.id, text, entry.old, relative));
  }
  for (const relative of await contractFiles(context)) {
    if (renamed.has(relative) || relative in map) continue;
    const text = (await readMigrationInput(path.join(context.contractsDir, relative))) ?? "";
    const id = declaredContractId(relative, text);
    if (id !== null) contracts.push(indexed(relative, id, text));
  }
  contracts.sort(
    (left, right) => Number(contractNumber(left.id)) - Number(contractNumber(right.id)),
  );
  return { map, contracts, operations, forAPerson };
}

function indexed(
  relative: string,
  id: string,
  text: string,
  old?: string,
  oldPath?: string,
): IndexedContract {
  const contract: IndexedContract = {
    id,
    path: relative,
    title: contractTitle(text, relative),
    dependsOn: extractDeclaredDependencies(text, relative),
  };
  if (old) contract.old = old;
  if (oldPath) contract.oldPath = oldPath;
  return contract;
}

function renameOperations(
  context: MigrationContext,
  relative: string,
  entry: ContractEntry,
  text: string,
  current: string | null,
): MigrationOperation[] {
  const target = contractRepoPath(context, entry.path);
  if (entry.path === relative) return [{ kind: "write", target, content: text }];
  if (current !== null && current !== text) {
    throw new MigrationInputError(
      `${target} already exists and differs from ${contractRepoPath(context, relative)} renamed; keep one and run step 3 again`,
    );
  }
  return [
    { kind: "write", target, content: text },
    {
      kind: "remove",
      target: contractRepoPath(context, relative),
      description: `renamed to ${target} as ${entry.id}`,
    },
  ];
}

/** A new name another contract still holds, or one differing only in case, cannot be written safely. */
function assertRenameable(
  context: MigrationContext,
  map: ContractMap,
  relative: string,
  entry: ContractEntry,
): void {
  if (entry.path === relative) return;
  const holder = Object.keys(map).find((other) => other !== relative && other === entry.path);
  if (holder !== undefined || entry.path.toLowerCase() === relative.toLowerCase()) {
    throw new MigrationInputError(
      `${contractRepoPath(context, relative)} would be renamed to ${contractRepoPath(context, entry.path)}, which ${holder === undefined ? "differs from it only in case" : "another contract holds"}; rename one of them and run step 3 again`,
    );
  }
}
