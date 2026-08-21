import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { buildContractIndex } from "./contractIndex.js";
import { collectSpecEntries } from "./specLayout.js";
import { isSpecInScope, type SpecScope } from "./specScope.js";
import {
  parseAcceptanceCriteriaIds,
  parseExamplesFeature,
  parseFirstMarkdownTable,
  parseTestCaseIds,
} from "./specPackParsers.js";
import { parseSemicolonIdList } from "./specPackIds.js";

type LedgerRow = {
  objId: string;
  initId: string;
  capId: string;
  flowId: string;
  usId: string;
  acId: string;
  exIds: string[];
  tcIds: string[];
  conIds: string[];
};

type GraphNodeType = "OBJ" | "INIT" | "CAP" | "FLOW" | "US" | "AC" | "EX" | "TC" | "CON";

type TraceabilityGraph = {
  nodes: Array<{ id: string; type: GraphNodeType }>;
  edges: Array<{ from: string; to: string; relation: string }>;
};

const REQUIRED_LEDGER_COLUMNS = [
  "trace_id",
  "obj_id",
  "init_id",
  "cap_id",
  "flow_id",
  "us_id",
  "ac_id",
  "ex_ids",
  "tc_ids",
] as const;

/**
 * Writes `<outDir>/<spec>/coverage.md` and `<outDir>/<spec>/traceability-graph.json`
 * for every spec pack, or only for the packs in `scope`.
 *
 * The scope is what keeps parallel slice workers from corrupting each other:
 * an unscoped run rewrites every pack on disk, so a worker that owns spec-0003
 * overwrote spec-0004's coverage artifacts on its way past — even when the
 * rendered report itself was redirected with `--out`. An absent scope still
 * means "every spec", so the repo-wide `qfai report` is unchanged.
 */
export async function writeSpecPackReports(
  root: string,
  config: QfaiConfig,
  scope?: SpecScope,
): Promise<void> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const outRoot = resolvePath(root, config, "outDir");
  const allEntries = await collectSpecEntries(specsRoot);
  const entries = allEntries.filter((entry) => isSpecInScope(entry.specNumber, scope));
  const contractIndex = await buildContractIndex(root, config);

  for (const entry of entries) {
    const specName = path.basename(entry.dir);
    const outputDir = path.join(outRoot, specName);
    await mkdir(outputDir, { recursive: true });

    const [acText, tcText, exText, ledgerText] = await Promise.all([
      readSafe(entry.acceptanceCriteriaPath),
      readSafe(entry.testCasesPath),
      readSafe(entry.examplesPath),
      readSafe(entry.traceabilityLedgerPath),
    ]);

    const acIds = new Set(parseAcceptanceCriteriaIds(acText));
    const tcIds = new Set(parseTestCaseIds(tcText));
    const example = parseExamplesFeature(exText, entry.examplesPath);
    const exIds = new Set<string>();
    for (const scenario of example.scenarios) {
      for (const exId of scenario.exIds) {
        exIds.add(exId);
      }
    }

    const ledgerRows = parseLedgerRows(ledgerText);
    const coverage = buildCoverage({
      acIds,
      tcIds,
      exIds,
      ledgerRows,
      contractIds: contractIndex.ids,
    });
    const graph = buildTraceabilityGraph(ledgerRows);

    await writeFile(
      path.join(outputDir, "coverage.md"),
      `${formatCoverageMarkdown(specName, coverage)}\n`,
      "utf-8",
    );
    await writeFile(
      path.join(outputDir, "traceability-graph.json"),
      `${JSON.stringify(graph, null, 2)}\n`,
      "utf-8",
    );
  }
}

function buildCoverage(input: {
  acIds: Set<string>;
  tcIds: Set<string>;
  exIds: Set<string>;
  ledgerRows: LedgerRow[];
  contractIds: Set<string>;
}): {
  acTotal: number;
  acConnectedEx: number;
  acConnectedTc: number;
  acFullyCovered: number;
  tcTotal: number;
  tcInLedger: number;
  tcOrphan: number;
  conInLedger: number;
  conMissing: number;
} {
  const acToEx = new Map<string, Set<string>>();
  const acToTc = new Map<string, Set<string>>();
  const tcInLedger = new Set<string>();
  const conInLedger = new Set<string>();

  for (const row of input.ledgerRows) {
    const exSet = acToEx.get(row.acId) ?? new Set<string>();
    row.exIds.forEach((id) => exSet.add(id));
    acToEx.set(row.acId, exSet);

    const tcSet = acToTc.get(row.acId) ?? new Set<string>();
    row.tcIds.forEach((id) => tcSet.add(id));
    acToTc.set(row.acId, tcSet);

    row.tcIds.filter((id) => input.tcIds.has(id)).forEach((id) => tcInLedger.add(id));
    row.conIds.forEach((id) => conInLedger.add(id));
  }

  const acIds = Array.from(input.acIds);
  const acConnectedEx = acIds.filter((id) => (acToEx.get(id)?.size ?? 0) > 0);
  const acConnectedTc = acIds.filter((id) => (acToTc.get(id)?.size ?? 0) > 0);
  const acFullyCovered = acIds.filter(
    (id) => (acToEx.get(id)?.size ?? 0) > 0 && (acToTc.get(id)?.size ?? 0) > 0,
  );

  const conMissing = Array.from(conInLedger).filter((id) => !input.contractIds.has(id));

  return {
    acTotal: input.acIds.size,
    acConnectedEx: acConnectedEx.length,
    acConnectedTc: acConnectedTc.length,
    acFullyCovered: acFullyCovered.length,
    tcTotal: input.tcIds.size,
    tcInLedger: tcInLedger.size,
    tcOrphan: Math.max(input.tcIds.size - tcInLedger.size, 0),
    conInLedger: conInLedger.size,
    conMissing: conMissing.length,
  };
}

function buildTraceabilityGraph(ledgerRows: LedgerRow[]): TraceabilityGraph {
  const nodes = new Map<string, GraphNodeType>();
  const edgeKeys = new Set<string>();
  const edges: Array<{ from: string; to: string; relation: string }> = [];

  const addNode = (id: string, type: GraphNodeType): void => {
    if (!id) {
      return;
    }
    if (!nodes.has(id)) {
      nodes.set(id, type);
    }
  };

  const addEdge = (from: string, to: string, relation: string): void => {
    if (!from || !to) {
      return;
    }
    const key = `${from}|${to}|${relation}`;
    if (edgeKeys.has(key)) {
      return;
    }
    edgeKeys.add(key);
    edges.push({ from, to, relation });
  };

  for (const row of ledgerRows) {
    addNode(row.objId, "OBJ");
    addNode(row.initId, "INIT");
    addNode(row.capId, "CAP");
    addNode(row.flowId, "FLOW");
    addNode(row.usId, "US");
    addNode(row.acId, "AC");
    row.exIds.forEach((id) => addNode(id, "EX"));
    row.tcIds.forEach((id) => addNode(id, "TC"));
    row.conIds.forEach((id) => addNode(id, "CON"));

    addEdge(row.objId, row.initId, "OBJ_TO_INIT");
    addEdge(row.initId, row.capId, "INIT_TO_CAP");
    addEdge(row.capId, row.flowId, "CAP_TO_FLOW");
    addEdge(row.flowId, row.usId, "FLOW_TO_US");
    addEdge(row.usId, row.acId, "US_TO_AC");

    for (const exId of row.exIds) {
      addEdge(row.acId, exId, "AC_TO_EX");
      for (const conId of row.conIds) {
        addEdge(exId, conId, "EX_TO_CON");
      }
    }
    for (const tcId of row.tcIds) {
      addEdge(row.acId, tcId, "AC_TO_TC");
      for (const conId of row.conIds) {
        addEdge(tcId, conId, "TC_TO_CON");
      }
    }
  }

  return {
    nodes: Array.from(nodes.entries())
      .map(([id, type]) => ({ id, type }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => {
      const from = a.from.localeCompare(b.from);
      if (from !== 0) {
        return from;
      }
      const to = a.to.localeCompare(b.to);
      if (to !== 0) {
        return to;
      }
      return a.relation.localeCompare(b.relation);
    }),
  };
}

function parseLedgerRows(ledgerText: string): LedgerRow[] {
  const table = parseFirstMarkdownTable(ledgerText);
  if (!table) {
    return [];
  }

  const indexByColumn = new Map<string, number>();
  table.headers.forEach((column, index) => {
    indexByColumn.set(normalizeHeader(column), index);
  });
  const hasAllRequiredColumns = REQUIRED_LEDGER_COLUMNS.every((column) =>
    indexByColumn.has(column),
  );
  if (!hasAllRequiredColumns) {
    return [];
  }

  const rows: LedgerRow[] = [];
  for (const row of table.rows) {
    const parsed: LedgerRow = {
      objId: getCell(row, indexByColumn, "obj_id"),
      initId: getCell(row, indexByColumn, "init_id"),
      capId: getCell(row, indexByColumn, "cap_id"),
      flowId: getCell(row, indexByColumn, "flow_id"),
      usId: getCell(row, indexByColumn, "us_id"),
      acId: getCell(row, indexByColumn, "ac_id"),
      exIds: parseSemicolonIdList(getCell(row, indexByColumn, "ex_ids")),
      tcIds: parseSemicolonIdList(getCell(row, indexByColumn, "tc_ids")),
      conIds: parseSemicolonIdList(getCell(row, indexByColumn, "con_ids")),
    };
    rows.push(parsed);
  }

  return rows;
}

function formatCoverageMarkdown(
  specName: string,
  coverage: {
    acTotal: number;
    acConnectedEx: number;
    acConnectedTc: number;
    acFullyCovered: number;
    tcTotal: number;
    tcInLedger: number;
    tcOrphan: number;
    conInLedger: number;
    conMissing: number;
  },
): string {
  return [
    `# Coverage (${specName})`,
    "",
    "## AC coverage",
    "",
    `- total: ${coverage.acTotal}`,
    `- EX connected: ${coverage.acConnectedEx}`,
    `- TC connected: ${coverage.acConnectedTc}`,
    `- full covered (EX+TC): ${coverage.acFullyCovered}`,
    `- 100%: ${coverage.acTotal > 0 && coverage.acFullyCovered === coverage.acTotal ? "yes" : "no"}`,
    "",
    "## TC coverage",
    "",
    `- total: ${coverage.tcTotal}`,
    `- in ledger: ${coverage.tcInLedger}`,
    `- orphan: ${coverage.tcOrphan}`,
    "",
    "## CON coverage",
    "",
    `- in ledger: ${coverage.conInLedger}`,
    `- missing contracts: ${coverage.conMissing}`,
  ].join("\n");
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getCell(row: string[], indexByColumn: Map<string, number>, column: string): string {
  const index = indexByColumn.get(column);
  if (index === undefined) {
    return "";
  }
  return (row[index] ?? "").trim();
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
