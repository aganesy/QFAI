import { readFile } from "node:fs/promises";
import _path from "node:path";

import { collectFiles } from "../fs.js";
import { resolvePath } from "../config.js";
import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { extractFencedCodeBlocks } from "./mermaidUtils.js";

// ── Regex patterns for Mermaid flowchart syntax ────────────────────────

/** Matches node definitions: `NodeId[text]`, `NodeId([text])`, `NodeId((text))`, `NodeId{text}`, bare `NodeId` */
const NODE_DEF_RE = /([A-Za-z_][\w-]*)\s*(?:\[.*?\]|\(.*?\)|\{.*?\})/g;

/** Matches edges: `A[text] -->|"label"| B[text]`, `A -->|label| B`, `A --> B` */
const EDGE_RE =
  /([A-Za-z_][\w-]*)(?:\s*(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\}))?(?:::\w+)?\s*(?:--+>|==+>|-.->|~~>)\s*(?:\|"?([^"|]*)"?\|)?\s*([A-Za-z_][\w-]*)(?:\s*(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\}))?(?:::\w+)?/g;

/** Matches subgraph declarations */
const SUBGRAPH_RE = /^\s*subgraph\s+([\w-]+)/gm;

/** Matches flowchart declaration line (including legacy `graph` syntax) */
const FLOWCHART_DECL_RE = /^\s*(?:flowchart|graph)\s+(TD|TB|BT|RL|LR)\s*$/m;

/** Matches only the modern `flowchart` keyword (not `graph`) */
const MODERN_FLOWCHART_RE = /^\s*flowchart\s+(TD|TB|BT|RL|LR)\s*$/m;

/** Matches terminal nodes: nodes whose display text contains "End", "終了", or "完了" */
const TERMINAL_TEXT_RE = /\b(?:end|terminal|finish|complete|done|終了|完了)\b/i;

/** Matches error nodes by prefix or :::error class */
const ERROR_NODE_CLASS_RE = /:::\s*error\b/;
const ERROR_PREFIX_RE = /^err-/;

// ── Types ──────────────────────────────────────────────────────────────

type FlowNode = {
  id: string;
  displayText: string;
  isTerminal: boolean;
  isError: boolean;
};

type FlowEdge = {
  from: string;
  to: string;
  label: string | null;
};

type ParsedFlowchart = {
  nodes: Map<string, FlowNode>;
  edges: FlowEdge[];
  subgraphs: string[];
  raw: string;
};

// ── Parsing helpers ────────────────────────────────────────────────────

function parseFlowchart(content: string): ParsedFlowchart {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const subgraphs: string[] = [];

  // Collect subgraphs
  for (const match of content.matchAll(SUBGRAPH_RE)) {
    if (match[1]) subgraphs.push(match[1]);
  }

  // Collect node definitions from lines
  const lines = content.split("\n");
  for (const line of lines) {
    // Skip comment lines, subgraph/end lines, and flowchart declaration
    const trimmed = line.trim();
    if (
      trimmed.startsWith("%%") ||
      trimmed.startsWith("subgraph") ||
      trimmed === "end" ||
      FLOWCHART_DECL_RE.test(trimmed)
    ) {
      continue;
    }

    // Collect nodes with display text
    for (const match of line.matchAll(NODE_DEF_RE)) {
      const id = match[1] ?? "";
      const fullMatch = match[0];
      const bracketContent =
        fullMatch.match(/\[([^\]]*)\]/)?.[1] ??
        fullMatch.match(/\(([^)]*)\)/)?.[1] ??
        fullMatch.match(/\{([^}]*)\}/)?.[1] ??
        id;
      const displayText = bracketContent.replace(/^["']|["']$/g, "");
      const isError = ERROR_PREFIX_RE.test(id) || ERROR_NODE_CLASS_RE.test(line);
      const isTerminal = TERMINAL_TEXT_RE.test(displayText);
      if (!nodes.has(id)) {
        nodes.set(id, { id, displayText, isTerminal, isError });
      }
    }
  }

  // Collect edges
  for (const match of content.matchAll(EDGE_RE)) {
    const from = match[1] ?? "";
    const label = match[2] !== undefined && match[2] !== "" ? match[2] : null;
    const to = match[3] ?? "";
    edges.push({ from, to, label });

    // Register nodes from edges that may lack definitions
    if (!nodes.has(from)) {
      nodes.set(from, {
        id: from,
        displayText: from,
        isTerminal: false,
        isError: ERROR_PREFIX_RE.test(from),
      });
    }
    if (!nodes.has(to)) {
      nodes.set(to, {
        id: to,
        displayText: to,
        isTerminal: false,
        isError: ERROR_PREFIX_RE.test(to),
      });
    }
  }

  return { nodes, edges, subgraphs, raw: content };
}

function hasFlowchartDeclaration(content: string): boolean {
  return FLOWCHART_DECL_RE.test(content);
}

// ── Validation logic ───────────────────────────────────────────────────

function checkMermaidSyntax(content: string, file: string): Issue[] {
  const issues: Issue[] = [];

  // Check for legacy `graph` keyword instead of `flowchart`
  if (hasFlowchartDeclaration(content) && !MODERN_FLOWCHART_RE.test(content)) {
    issues.push(
      issue(
        "QFAI-NAV-001",
        `Mermaid block uses legacy "graph" keyword. Use "flowchart" instead.`,
        "error",
        file,
        "navigationFlow.mermaid.syntax",
      ),
    );
    return issues;
  }

  // Basic structural validation: must have flowchart declaration
  if (!hasFlowchartDeclaration(content)) {
    issues.push(
      issue(
        "QFAI-NAV-001",
        `Mermaid block does not contain a valid flowchart declaration.`,
        "error",
        file,
        "navigationFlow.mermaid.syntax",
      ),
    );
    return issues;
  }

  // Check for unclosed subgraphs
  const subgraphOpens = (content.match(/^\s*subgraph\b/gm) ?? []).length;
  const subgraphCloses = (content.match(/^\s*end\b/gm) ?? []).length;
  if (subgraphOpens !== subgraphCloses) {
    issues.push(
      issue(
        "QFAI-NAV-001",
        `Mermaid flowchart has mismatched subgraph/end blocks (${subgraphOpens} subgraph vs ${subgraphCloses} end).`,
        "error",
        file,
        "navigationFlow.mermaid.syntax",
      ),
    );
  }

  return issues;
}

function checkUnlabeledEdges(parsed: ParsedFlowchart, file: string): Issue[] {
  const issues: Issue[] = [];
  for (const edge of parsed.edges) {
    if (edge.label === null) {
      issues.push(
        issue(
          "QFAI-NAV-002",
          `Edge ${edge.from} → ${edge.to} has no label. All edges must be labeled.`,
          "warning",
          file,
          "navigationFlow.edge.label",
        ),
      );
    }
  }
  return issues;
}

function checkDeadEndNodes(parsed: ParsedFlowchart, file: string): Issue[] {
  const issues: Issue[] = [];
  const outgoingCount = new Map<string, number>();

  for (const [id] of parsed.nodes) {
    outgoingCount.set(id, 0);
  }
  for (const edge of parsed.edges) {
    outgoingCount.set(edge.from, (outgoingCount.get(edge.from) ?? 0) + 1);
  }

  for (const [id, count] of outgoingCount) {
    if (count === 0) {
      const node = parsed.nodes.get(id);
      if (node && !node.isTerminal) {
        issues.push(
          issue(
            "QFAI-NAV-003",
            `Node "${id}" has no outgoing edges and is not marked as terminal.`,
            "warning",
            file,
            "navigationFlow.node.deadEnd",
          ),
        );
      }
    }
  }
  return issues;
}

function checkReachability(parsed: ParsedFlowchart, file: string): Issue[] {
  const issues: Issue[] = [];
  if (parsed.nodes.size === 0) return issues;

  // Find entry node: first node in the first edge, or first node defined
  const firstEdge = parsed.edges[0];
  const entryId = firstEdge?.from ?? parsed.nodes.keys().next().value;
  if (!entryId) return issues;

  // BFS from entry
  const visited = new Set<string>();
  const queue = [entryId];
  visited.add(entryId);

  while (queue.length > 0) {
    const current = queue.shift() ?? "";
    for (const edge of parsed.edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  for (const [id] of parsed.nodes) {
    if (!visited.has(id)) {
      issues.push(
        issue(
          "QFAI-NAV-004",
          `Node "${id}" is unreachable from entry point "${entryId}".`,
          "error",
          file,
          "navigationFlow.node.unreachable",
        ),
      );
    }
  }
  return issues;
}

function checkErrorRecovery(parsed: ParsedFlowchart, file: string): Issue[] {
  const issues: Issue[] = [];

  for (const [id, node] of parsed.nodes) {
    if (!node.isError) continue;

    const hasOutgoing = parsed.edges.some((e) => e.from === id);
    if (!hasOutgoing) {
      issues.push(
        issue(
          "QFAI-NAV-005",
          `Error node "${id}" has no outgoing edge to recover to normal flow.`,
          "error",
          file,
          "navigationFlow.errorNode.recovery",
        ),
      );
    }
  }
  return issues;
}

function checkViewportDiffs(content: string, parsed: ParsedFlowchart, file: string): Issue[] {
  const issues: Issue[] = [];

  // Check if there are viewport-related subgraphs
  const hasViewportSubgraph = parsed.subgraphs.some((s) =>
    /desktop|mobile|tablet|responsive/i.test(s),
  );

  // Check for viewport annotations in content
  const hasViewportAnnotation =
    /%%\s*(?:desktop|mobile|tablet|viewport|responsive)/i.test(content) ||
    /\bdesktop\b.*\bmobile\b/i.test(content) ||
    /\bmobile\b.*\bdesktop\b/i.test(content);

  // Check for explicit shared/common declaration
  const hasSharedDeclaration = /\b(?:shared|common)\b/i.test(content);

  if (!hasViewportSubgraph && !hasViewportAnnotation && !hasSharedDeclaration) {
    issues.push(
      issue(
        "QFAI-NAV-006",
        `Flowchart does not document viewport differences. Use subgraphs for desktop/mobile or annotate as "shared".`,
        "warning",
        file,
        "navigationFlow.viewport.diff",
      ),
    );
  }
  return issues;
}

function checkImplementationAlignment(
  specContent: string,
  parsed: ParsedFlowchart,
  file: string,
): Issue[] {
  const issues: Issue[] = [];

  // Look for ## Screen List section
  const screenListMatch = specContent.match(/## Screen List\s*\n((?:.*\n)*?)(?=## |$)/);
  if (!screenListMatch) {
    // No Screen List section — skip alignment check
    return issues;
  }

  const screenListBlock = screenListMatch[1] ?? "";
  const screenNames: string[] = [];
  for (const line of screenListBlock.split("\n")) {
    const match = line.match(/^\s*[-*]\s+(.+)/);
    if (match?.[1]) {
      screenNames.push(match[1].trim());
    }
  }

  if (screenNames.length === 0) return issues;

  // Get flow node display texts
  const flowNodeTexts = new Set<string>();
  for (const [, node] of parsed.nodes) {
    flowNodeTexts.add(node.displayText.toLowerCase());
  }

  // Check screens listed but not in flow
  for (const screen of screenNames) {
    const screenLower = screen.toLowerCase();
    const found = [...flowNodeTexts].some(
      (t) => t.includes(screenLower) || screenLower.includes(t),
    );
    if (!found) {
      issues.push(
        issue(
          "QFAI-NAV-007",
          `Screen "${screen}" in Screen List is not found in flowchart nodes.`,
          "warning",
          file,
          "navigationFlow.alignment.mismatch",
        ),
      );
    }
  }

  // Check flow nodes not in screen list (only non-terminal, non-error nodes)
  const screenNamesLower = screenNames.map((s) => s.toLowerCase());
  for (const [, node] of parsed.nodes) {
    if (node.isTerminal || node.isError) continue;
    const textLower = node.displayText.toLowerCase();
    const found = screenNamesLower.some((s) => s.includes(textLower) || textLower.includes(s));
    if (!found) {
      issues.push(
        issue(
          "QFAI-NAV-007",
          `Flowchart node "${node.displayText}" has no matching entry in Screen List.`,
          "warning",
          file,
          "navigationFlow.alignment.mismatch",
        ),
      );
    }
  }

  return issues;
}

// ── Main validator ─────────────────────────────────────────────────────

export async function validateNavigationFlow(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsDir = resolvePath(root, config, "specsDir");
  const allFiles = await collectFiles(specsDir, { extensions: [".md"] });

  // Filter to concrete spec directories.
  const specFiles = allFiles.filter((f) => /[\\/]spec-\d{4}[\\/]/.test(f));
  const issues: Issue[] = [];

  for (const file of specFiles) {
    const content = await readFile(file, "utf-8");
    const blocks = extractFencedCodeBlocks(content);
    const mermaidBlocks = blocks.filter((b) => b.language === "mermaid");
    const _flowchartBlocks = mermaidBlocks.filter((b) => hasFlowchartDeclaration(b.content));

    for (const block of mermaidBlocks) {
      if (!hasFlowchartDeclaration(block.content)) {
        // Not a flowchart block — skip non-flowchart mermaid
        continue;
      }

      // TDD-0001: Static Mermaid checks
      issues.push(...checkMermaidSyntax(block.content, file));

      const parsed = parseFlowchart(block.content);
      issues.push(...checkUnlabeledEdges(parsed, file));
      issues.push(...checkDeadEndNodes(parsed, file));

      // TDD-0002: Reachability + error recovery
      issues.push(...checkReachability(parsed, file));
      issues.push(...checkErrorRecovery(parsed, file));

      // TDD-0003: Viewport diff
      issues.push(...checkViewportDiffs(block.content, parsed, file));

      // TDD-0004: Implementation alignment
      issues.push(...checkImplementationAlignment(content, parsed, file));
    }
  }

  return issues;
}
