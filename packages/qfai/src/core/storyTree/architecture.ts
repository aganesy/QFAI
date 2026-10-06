import { parseAllMarkdownTables } from "../specPackParsers.js";

/**
 * One row of the `## Architecture` table of `tech.md`: a layer, and the layers below it
 * that it may use.
 */
export type ArchitectureLayer = { name: string; dependsOn: string[] };

/** The layers a Depends on cell names, comma-separated, or none for `-`. */
export function dependsOnCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (trimmed === "-") return [];
  return trimmed
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/**
 * The layers from the uppermost to the lowermost, each above every layer it depends on,
 * and peers in the order given. A string says why no such order exists: a layer with two
 * rows, a dependency on a layer with no row, or layers that depend on each other.
 */
export function orderLayers(layers: readonly ArchitectureLayer[]): ArchitectureLayer[] | string {
  const names = new Set<string>();
  for (const layer of layers) {
    if (names.has(layer.name)) return `the layer ${layer.name} has more than one row`;
    names.add(layer.name);
  }
  for (const layer of layers) {
    const unknown = layer.dependsOn.find((name) => !names.has(name));
    if (unknown !== undefined) {
      return `the layer ${layer.name} depends on ${unknown}, which has no row`;
    }
  }
  const ordered: ArchitectureLayer[] = [];
  const rest = [...layers];
  while (rest.length > 0) {
    const index = rest.findIndex((layer) =>
      rest.every((other) => !other.dependsOn.includes(layer.name)),
    );
    const next = rest[index];
    if (next === undefined) {
      return `the layers ${rest.map(({ name }) => name).join(", ")} depend on each other`;
    }
    ordered.push(next);
    rest.splice(index, 1);
  }
  return ordered;
}

/** The fenced `flowchart TD` that draws the layers: a node for each, an edge per dependency. */
export function architectureDiagram(layers: readonly ArchitectureLayer[]): string {
  const ids = new Map(layers.map((layer, index) => [layer.name, `L${index + 1}`]));
  const id = (name: string): string => ids.get(name) ?? name;
  return [
    "```mermaid",
    "flowchart TD",
    ...layers.map((layer) => `  ${id(layer.name)}["${layer.name.replaceAll('"', "#quot;")}"]`),
    ...layers.flatMap((layer) =>
      layer.dependsOn.map((lower) => `  ${id(layer.name)} --> ${id(lower)}`),
    ),
    "```",
  ].join("\n");
}

const NODE = String.raw`([A-Za-z0-9_]+)(?:\["([^"]*)"\]|\[([^\]"]*)\])?`;
/** A node, or an edge between two nodes, each with or without its label. */
const STATEMENT = new RegExp(`^${NODE}(?:[ \\t]*-->[ \\t]*${NODE})?$`);

/** A fenced `mermaid` block, whose body is group 2. Global, so `matchAll` reads every block. */
export const MERMAID_FENCE =
  /^ {0,3}(`{3,}|~{3,})[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^ {0,3}\1[ \t]*$/gim;

type Diagram = { nodes: Set<string>; edges: Set<string>; problems: string[] };

/** A statement without the one `;` Mermaid accepts after it. */
const withoutSemicolon = (line: string): string => line.replace(/;$/, "").trimEnd();

const edgeKey = (upper: string, lower: string): string => `${upper} --> ${lower}`;

/**
 * The layers and dependencies a diagram draws, each node named by its label where it has
 * one and by its ID otherwise.
 */
function readDiagram(source: string): Diagram {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const problems: string[] = [];
  if (withoutSemicolon(lines[0] ?? "") !== "flowchart TD") {
    problems.push(
      lines[0] === undefined
        ? "the diagram is empty, so it does not open with flowchart TD"
        : `the diagram opens with "${lines[0]}", not flowchart TD`,
    );
  }
  const statements: string[][] = [];
  const labels = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const match = STATEMENT.exec(withoutSemicolon(line));
    if (match === null) {
      problems.push(`the diagram line "${line}" is neither a layer nor an edge`);
      continue;
    }
    const [, upper = "", quoted, plain, lower, lowerQuoted, lowerPlain] = match;
    const label = quoted ?? plain;
    if (label !== undefined) labels.set(upper, label.trim().replaceAll("#quot;", '"'));
    const lowerLabel = lowerQuoted ?? lowerPlain;
    if (lower !== undefined && lowerLabel !== undefined) {
      labels.set(lower, lowerLabel.trim().replaceAll("#quot;", '"'));
    }
    statements.push(lower === undefined ? [upper] : [upper, lower]);
  }
  const name = (id: string): string => labels.get(id) ?? id;
  const nodes = new Set(statements.flat().map(name));
  const edges = new Set(
    statements.flatMap(([upper, lower]) =>
      upper !== undefined && lower !== undefined ? [edgeKey(name(upper), name(lower))] : [],
    ),
  );
  return { nodes, edges, problems };
}

/** Where a Depends on name breaks the rule that a row depends only on rows below it. */
function orderProblems(layers: readonly ArchitectureLayer[]): string[] {
  const problems: string[] = [];
  const rowOf = new Map<string, number>();
  layers.forEach((layer, index) => {
    if (rowOf.has(layer.name)) problems.push(`the layer ${layer.name} has more than one row`);
    else rowOf.set(layer.name, index);
  });
  layers.forEach((layer, index) => {
    for (const lower of layer.dependsOn) {
      const row = rowOf.get(lower);
      if (row === undefined) {
        problems.push(`${layer.name} depends on ${lower}, which is not a layer of the table`);
      } else if (row <= index) {
        problems.push(`${layer.name} depends on ${lower}, which is not in a row below it`);
      }
    }
  });
  return problems;
}

/**
 * What is wrong with the body of an `## Architecture` section: a layer that depends on one
 * not below it, and every difference between the diagram and the table. A section with no
 * diagram or no table is the document schema's to report, and this reads nothing.
 */
export function architectureProblems(body: string): string[] {
  const fence = [...body.matchAll(MERMAID_FENCE)][0];
  if (fence === undefined) return [];
  const after = body.slice(fence.index + fence[0].length);
  const table = parseAllMarkdownTables(after)[0];
  const headers = table?.headers.map((header) => header.trim()) ?? [];
  const layerColumn = headers.indexOf("Layer");
  const dependsColumn = headers.indexOf("Depends on");
  if (table === undefined || layerColumn < 0 || dependsColumn < 0) return [];
  const layers = table.rows.map((row) => ({
    name: (row[layerColumn] ?? "").trim(),
    dependsOn: dependsOnCell(row[dependsColumn] ?? ""),
  }));
  const diagram = readDiagram(fence[2] ?? "");
  const problems = [...orderProblems(layers), ...diagram.problems];
  const names = new Set(layers.map(({ name }) => name));
  for (const name of names) {
    if (!diagram.nodes.has(name)) problems.push(`the diagram has no node for the layer ${name}`);
  }
  for (const node of diagram.nodes) {
    if (!names.has(node))
      problems.push(`the diagram draws ${node}, which is not a layer of the table`);
  }
  const pairs = new Set(
    layers.flatMap((layer) => layer.dependsOn.map((lower) => edgeKey(layer.name, lower))),
  );
  for (const pair of pairs) {
    if (!diagram.edges.has(pair)) problems.push(`the diagram has no edge ${pair}`);
  }
  for (const edge of diagram.edges) {
    if (!pairs.has(edge)) problems.push(`the diagram draws ${edge}, which no Depends on names`);
  }
  return problems;
}
