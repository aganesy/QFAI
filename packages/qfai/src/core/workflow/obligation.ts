import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { loadConfig, resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { buildItemIdPattern } from "../specPackIds.js";
import { looksLikeTableRow, resolveTestCaseTables, splitMarkdownRow } from "../specPackParsers.js";
import {
  collectLedgerTables,
  isLedgerRow,
  resolveDeclaredTcId,
  splitTcRefs,
} from "../tddHelpers.js";

const CONTRACT_ID = /\bCON-(?:API|DB|UI)-\d+\b/g;
const REFERENCE_COLUMN = /-Refs?$/;
const FENCE = /^\s*(?:```|~~~)/;
const HEADING = /^(#{1,6})\s/;
// A line that opens an item's definition: an item ID after any markup, then a colon.
const DEFINITION = /^[\s#>*|-]*((?:US|AC|BR|EX|TC)-\d+(?:-\d+)?)\s*:/;

type Cells = Record<string, string>;

// The IDs the reference columns of one table row cite: item IDs and contract IDs.
function referencesOf(cells: Cells): string[] {
  const cited = Object.entries(cells)
    .filter(([header]) => REFERENCE_COLUMN.test(header))
    .map(([, cell]) => cell)
    .join(" ");
  return [...(cited.match(buildItemIdPattern()) ?? []), ...(cited.match(CONTRACT_ID) ?? [])];
}

function cellsOf(headers: readonly string[], row: readonly string[]): Cells {
  return Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? "").trim()]));
}

// Where the item defined on line `start` ends: a heading's section ends at the next heading of
// its level or above; any other definition at a blank line, a fence, or the next definition.
function definitionEnd(lines: readonly string[], start: number, fenced: boolean): number {
  const level = fenced ? undefined : HEADING.exec(lines[start] ?? "")?.[1]?.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const heading = HEADING.exec(line)?.[1]?.length;
    if (level !== undefined && heading !== undefined && heading <= level) return index;
    if (level === undefined && (!line.trim() || FENCE.test(line) || DEFINITION.test(line))) {
      return index;
    }
  }
  return lines.length;
}

// Every definition of one item in a document: its table row, its heading section, and each line
// that opens with the ID and a colon, with the lines that continue it.
export function itemTextOf(text: string, id: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const found: string[] = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    if (looksLikeTableRow(line)) {
      if (splitMarkdownRow(line)[0] === id) found.push(line);
      return;
    }
    if (DEFINITION.exec(line)?.[1] !== id) return;
    found.push(lines.slice(index, definitionEnd(lines, index, fenced)).join("\n"));
  });
  return found.join("\n");
}

// The item IDs a ledger row reaches through the test cases its `TC-Refs` names.
function testCaseReferences(testCases: string, tcRefs: readonly string[]): string[] {
  const rows = resolveTestCaseTables(testCases).flatMap((table) =>
    table.rows.map((row) => cellsOf(table.headers, row)),
  );
  const declared = new Set(rows.map((cells) => (cells["TC-ID"] ?? "").toUpperCase()));
  const wanted = new Set(tcRefs.map((ref) => resolveDeclaredTcId(ref, declared)));
  return rows
    .filter((cells) => wanted.has((cells["TC-ID"] ?? "").toUpperCase()))
    .flatMap(referencesOf);
}

interface SpecTexts {
  specId: string;
  items: string[];
  testCases: string;
  contracts: (id: string) => Promise<[string, string][]>;
}

// The contract files declaring each ID, with their text, read once per spec.
function contractReader(root: string) {
  let index: ReturnType<typeof buildContractIndex> | undefined;
  return async (id: string): Promise<[string, string][]> => {
    index ??= loadConfig(root).then(({ config }) => buildContractIndex(root, config));
    const files = [...((await index).idToFiles.get(id) ?? [])].sort();
    return Promise.all(
      files.map(async (file): Promise<[string, string]> => [
        path.relative(root, file).split(path.sep).join("/"),
        await readFile(file, "utf8"),
      ]),
    );
  };
}

// One row's fingerprint: its identity, `Layer`, `Boundary` and `TC-Refs`, and the text of every
// item and contract it cites directly or through its test cases. `Status`, `Evidence`, the
// selector and the files it names are left out.
async function rowFingerprint(texts: SpecTexts, cells: Cells): Promise<string> {
  const tcRefs = splitTcRefs(cells["TC-Refs"] ?? "").sort();
  const cited = [...referencesOf(cells), ...testCaseReferences(texts.testCases, tcRefs)];
  const ids = [...new Set(cited)].sort();
  const items = ids
    .filter((id) => !id.startsWith("CON-") && !id.startsWith("TC-"))
    .map((id) => [id, texts.items.map((text) => itemTextOf(text, id)).join("\n")]);
  const contracts = await Promise.all(
    ids.filter((id) => id.startsWith("CON-")).map(async (id) => [id, await texts.contracts(id)]),
  );
  const fingerprint = {
    specId: texts.specId,
    rowId: cells["TDD-ID"],
    layer: cells.Layer ?? "",
    boundary: cells.Boundary ?? "",
    tcRefs,
    items,
    contracts,
  };
  return hashAssistantAssetText(JSON.stringify(fingerprint));
}

async function specTextsOf(root: string, pack: string, specId: string): Promise<SpecTexts> {
  const itemFiles = await fg("0[2-5]_*.md", { cwd: pack, onlyFiles: true });
  const read = (file: string) => readFile(path.join(pack, file), "utf8").catch(() => "");
  const [items, testCases] = await Promise.all([
    Promise.all(itemFiles.sort().map(read)),
    fg("06_*.md", { cwd: pack, onlyFiles: true }).then((files) => read(files.sort()[0] ?? "")),
  ]);
  return { specId, items, testCases, contracts: contractReader(root) };
}

/**
 * The obligation fingerprint of every row of a spec's ledger, by row ID, or undefined when the
 * spec has no readable ledger.
 */
export async function obligationFingerprints(
  root: string,
  specId: string,
): Promise<Map<string, string> | undefined> {
  const { config } = await loadConfig(root);
  const pack = path.join(resolvePath(root, config, "specsDir"), specId);
  const ledger = await readFile(path.join(pack, "tdd", "test-list.md"), "utf8").catch(
    () => undefined,
  );
  if (ledger === undefined) return undefined;
  const texts = await specTextsOf(root, pack, specId);
  const rows = collectLedgerTables(ledger).flatMap((scan) =>
    scan.table.rows
      .filter((row) => isLedgerRow(scan, row))
      .map((row) => cellsOf(scan.headers, row)),
  );
  const digests = await Promise.all(
    rows.map(async (cells) => [cells["TDD-ID"] ?? "", await rowFingerprint(texts, cells)] as const),
  );
  return new Map(digests);
}
