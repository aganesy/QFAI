/**
 * How many nodes and edges a Mermaid diagram draws, read from its source for
 * the diagram budget (QFAI-FLOW-006).
 *
 * This reads the source with a few regular expressions, not Mermaid's grammar:
 * the package does not depend on Mermaid. An unusual statement can be
 * miscounted, which is why the budget finding is a warning. A type that draws
 * no nodes and edges, such as a pie chart, returns null and is never over
 * budget.
 */

export type DiagramSize = { nodes: number; edges: number };

/** Statements that draw neither a node nor an edge. */
const FLOWCHART_SKIP_RE =
  /^(?:subgraph|end|classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/;
/** A link operator, with an optional `|label|` after it. */
const FLOW_LINK_RE = /\s*<?(?:-{2,}|={2,}|-\.+-|~{3,})[>ox]?(?:\s*\|[^|]*\|)?\s*/;
/**
 * The text-on-link forms `A -- text --> B`, `A--text-->B`, `A -. text .-> B`
 * and `A == text === B`, each rewritten to `A --> B`.
 */
const FLOW_LINK_TEXT_RE =
  /(?<![-=.<])(?:--|==|-\.)(?![-=>.])\s*[^-=>.|\s][^>|]*?\s*(?:-{2,}>|={2,}>|={3,}|\.-+>|-{3,}|\.-+)(?![-=>.])/g;
const NODE_ID_RE = /^[\w$][\w$.]*(?:-[\w$]+)*/;
const SEQUENCE_PARTICIPANT_RE = /^(?:create\s+)?(?:participant|actor)\s+(\S+)/;
const SEQUENCE_MESSAGE_RE =
  /^([^:\s][^:]*?)\s*(?:-{1,2}>>|-{1,2}>|-{1,2}x|-{1,2}\))\s*[+-]?\s*([^:]+?)\s*:/;
const STATE_TRANSITION_RE = /^(.+?)\s*-->\s*([^:]+?)\s*(?::.*)?$/;
const STATE_DECLARATION_RE = /^state\s+(?:"[^"]*"\s+as\s+)?([\w$.-]+)/;
const START_END = "[*]";
/** `A ||--o{ B : label`: a cardinality, an identifying or non-identifying line, a cardinality. */
const ER_RELATIONSHIP_RE = /^([\w$.-]+)\s*[|}o]{1,2}(?:--|\.\.)[|{o]{1,2}\s*([\w$.-]+)/;
const ER_ENTITY_RE = /^([\w$.-]+)\s*(?:\[[^\]]*\])?\s*\{/;
const CLASS_RELATION_RE =
  /^([\w$.]+)\s*(?:"[^"]*"\s*)?(?:<\|--|\*--|o--|<--|<\.\.|<\|\.\.|--\|>|--\*|--o|-->|\.\.\|>|\.\.>|--|\.\.)\s*(?:"[^"]*"\s*)?([\w$.]+)/;
const CLASS_DECLARATION_RE = /^class\s+([\w$.]+)/;

/** A quoted run, possibly unterminated, or any other character but `;`. */
const STATEMENT_RE = /(?:"[^"]*"?|[^;"])+/g;

/** The `;`-separated statements of a line; a `;` inside a quoted label separates nothing. */
function splitStatements(line: string): string[] {
  return line.match(STATEMENT_RE) ?? [];
}

/**
 * The diagram's lines, declaration first: without comments, blank lines and a
 * leading `---` front-matter block, and with the statements a one-line
 * `graph TD; A-->B` writes after its declaration on lines of their own.
 */
function statements(source: string): string[] {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("%%"));
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1);
    lines.splice(0, close < 0 ? lines.length : close + 1);
  }
  const [declaration = "", ...rest] = splitStatements(lines[0] ?? "");
  const after = rest.map((part) => part.trim()).filter((part) => part !== "");
  return [declaration.trim(), ...after, ...lines.slice(1)];
}

/** Removes quoted text and every bracketed shape, innermost first. */
function withoutShapes(line: string): string {
  let current = line.replace(/"[^"]*"/g, "").replace(/:::[\w-]+/g, "");
  for (;;) {
    const next = current.replace(/\[[^[\]()]*\]|\([^[\]()]*\)|\{[^{}]*\}/g, "");
    if (next === current) return current.replace(/>[^\]]*\]/g, "");
    current = next;
  }
}

function countFlowchart(lines: string[]): DiagramSize {
  const nodes = new Set<string>();
  let edges = 0;
  for (const line of lines.slice(1)) {
    for (const statement of splitStatements(line)) {
      const text = withoutShapes(statement.trim()).replace(FLOW_LINK_TEXT_RE, " --> ");
      if (text === "" || FLOWCHART_SKIP_RE.test(text)) continue;
      const groups = text
        .split(FLOW_LINK_RE)
        .map((segment) =>
          segment
            .split("&")
            .map((part) => NODE_ID_RE.exec(part.trim())?.[0])
            .filter((id): id is string => id !== undefined),
        )
        .filter((group) => group.length > 0);
      for (const group of groups) for (const id of group) nodes.add(id);
      for (let index = 1; index < groups.length; index += 1) {
        edges += (groups[index - 1]?.length ?? 0) * (groups[index]?.length ?? 0);
      }
    }
  }
  return { nodes: nodes.size, edges };
}

function countSequence(lines: string[]): DiagramSize {
  const participants = new Set<string>();
  let edges = 0;
  for (const line of lines.slice(1)) {
    const declared = SEQUENCE_PARTICIPANT_RE.exec(line);
    if (declared?.[1] !== undefined) {
      participants.add(declared[1]);
      continue;
    }
    const message = SEQUENCE_MESSAGE_RE.exec(line);
    if (message?.[1] === undefined || message[2] === undefined) continue;
    participants.add(message[1].trim());
    participants.add(message[2].trim());
    edges += 1;
  }
  return { nodes: participants.size, edges };
}

function countState(lines: string[]): DiagramSize {
  const states = new Set<string>();
  let edges = 0;
  for (const line of lines.slice(1)) {
    const declared = STATE_DECLARATION_RE.exec(line);
    if (declared?.[1] !== undefined) {
      states.add(declared[1]);
      continue;
    }
    const transition = STATE_TRANSITION_RE.exec(line);
    if (transition?.[1] === undefined || transition[2] === undefined) continue;
    for (const state of [transition[1].trim(), transition[2].trim()]) {
      if (state !== START_END) states.add(state);
    }
    edges += 1;
  }
  return { nodes: states.size, edges };
}

function countEntityRelationship(lines: string[]): DiagramSize {
  const entities = new Set<string>();
  let edges = 0;
  for (const line of lines.slice(1)) {
    const relationship = ER_RELATIONSHIP_RE.exec(line);
    if (relationship?.[1] !== undefined && relationship[2] !== undefined) {
      entities.add(relationship[1]);
      entities.add(relationship[2]);
      edges += 1;
      continue;
    }
    const entity = ER_ENTITY_RE.exec(line)?.[1];
    if (entity !== undefined) entities.add(entity);
  }
  return { nodes: entities.size, edges };
}

function countClass(lines: string[]): DiagramSize {
  const classes = new Set<string>();
  let edges = 0;
  for (const line of lines.slice(1)) {
    const declared = CLASS_DECLARATION_RE.exec(line)?.[1];
    if (declared !== undefined) {
      classes.add(declared);
      continue;
    }
    const relation = CLASS_RELATION_RE.exec(line);
    if (relation?.[1] === undefined || relation[2] === undefined) continue;
    classes.add(relation[1]);
    classes.add(relation[2]);
    edges += 1;
  }
  return { nodes: classes.size, edges };
}

/** A mind map is a tree: each item but the root hangs from one parent. */
function countMindmap(lines: string[]): DiagramSize {
  const items = lines.slice(1).filter((line) => !line.startsWith("::"));
  return { nodes: items.length, edges: Math.max(items.length - 1, 0) };
}

/** The size of a diagram, or null for a type that draws no nodes and edges. */
export function diagramSize(source: string): DiagramSize | null {
  const lines = statements(source);
  const declaration = lines[0] ?? "";
  if (/^(?:flowchart|graph)\b/.test(declaration)) return countFlowchart(lines);
  if (/^sequenceDiagram\b/.test(declaration)) return countSequence(lines);
  if (/^stateDiagram(?:-v2)?\b/.test(declaration)) return countState(lines);
  if (/^erDiagram\b/.test(declaration)) return countEntityRelationship(lines);
  if (/^classDiagram(?:-v2)?\b/.test(declaration)) return countClass(lines);
  if (/^mindmap\b/.test(declaration)) return countMindmap(lines);
  return null;
}
