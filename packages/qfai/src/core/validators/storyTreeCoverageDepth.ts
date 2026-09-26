import { spawnSync } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { FlowScope } from "../flowScope.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";
import { parseStoryTestAnnotations } from "../storyTree/ids.js";
import type { StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const EVIDENCE_DIR = ".qfai/evidence";
const COVERAGE_COLUMNS = [
  "Normal",
  "Error",
  "Boundary",
  "Special",
  "State transition",
  "Combinatorial",
] as const;
const MARKS = ["✅", "⚠", "❌"] as const;
const TOTALS_LINE = /✅\s*(\d+)\s*\/\s*⚠\uFE0F?\s*(\d+)\s*\/\s*❌\s*(\d+)/;

type Totals = Record<(typeof MARKS)[number], number>;

function totals(): Totals {
  return { "✅": 0, "⚠": 0, "❌": 0 };
}

function readOptional(file: string): Promise<string | null> {
  return readFile(file, "utf8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
}

function ignoredAndUntracked(root: string, paths: readonly string[]): ReadonlySet<string> {
  if (paths.length === 0) return new Set();
  // One invocation for all flows. Without --no-index, git excludes tracked files.
  const result = spawnSync("git", ["check-ignore", "-z", "--stdin"], {
    cwd: root,
    input: `${paths.join("\0")}\0`,
    encoding: "utf8",
  });
  return new Set(result.stdout.split("\0").filter(Boolean));
}

function matrixIssue(code: string, flowId: string, file: string, message: string): Issue {
  return issue(code, message, "error", file, "storyTree.coverageDepth", [flowId], "canonical");
}

function matrixRows(
  text: string,
  expectedIds: ReadonlySet<string>,
): { problems: string[]; totals: Totals } {
  const problems: string[] = [];
  const tables = parseAllMarkdownTables(text).filter((table) =>
    ["ID", "Layer", "Oracle and test"].every((header) => table.headers.includes(header)),
  );
  const coverage = totals();
  if (tables.length !== 1) {
    return {
      problems: ["exactly one ID/Layer/Oracle and test coverage table is required"],
      totals: coverage,
    };
  }
  const table = tables[0];
  if (!table) return { problems, totals: coverage };
  const missingColumns = COVERAGE_COLUMNS.filter((header) => !table.headers.includes(header));
  if (missingColumns.length > 0) {
    problems.push(`missing coverage columns: ${missingColumns.join(", ")}`);
  }
  const idIndex = table.headers.indexOf("ID");
  const layerIndex = table.headers.indexOf("Layer");
  const oracleIndex = table.headers.indexOf("Oracle and test");
  const noteIndex = table.headers.findIndex((header) =>
    /^(?:Coverage note|Reason|Rationale)$/i.test(header),
  );
  const ownerIndex = table.headers.findIndex((header) => /^Owner$/i.test(header));
  const seen = new Set<string>();
  for (const row of table.rows) {
    const id = row[idIndex]?.trim() ?? "";
    if (!expectedIds.has(id)) {
      problems.push(`unexpected coverage row ${id || "(empty)"}`);
      continue;
    }
    if (seen.has(id)) problems.push(`duplicate coverage row ${id}`);
    seen.add(id);
    const layer = row[layerIndex]?.trim() ?? "";
    const oracle = row[oracleIndex]?.trim() ?? "";
    if (!layer) problems.push(`${id} has no layer`);
    if (!oracle) problems.push(`${id} has no oracle or test selector`);
    if (id.startsWith("AC-") && !/integration|api/i.test(layer)) {
      problems.push(`${id} must name the Integration or API layer`);
    }
    if (id.startsWith("EX-") && /\be2e\b/i.test(layer)) {
      problems.push(`${id} cannot assign its test to the BF E2E layer`);
    }
    for (const header of COVERAGE_COLUMNS) {
      const index = table.headers.indexOf(header);
      if (index < 0) continue;
      const cell = row[index]?.trim() ?? "";
      const marks = MARKS.filter((mark) => cell.includes(mark));
      if (marks.length > 1) problems.push(`${id} ${header} has conflicting scores`);
      else if (marks.length === 1) {
        const mark = marks[0] ?? "✅";
        coverage[mark] += 1;
        if (mark !== "✅") {
          const cellReason = cell
            .replace("✅", "")
            .replace("⚠️", "")
            .replace("⚠", "")
            .replace("❌", "")
            .trim();
          const note = noteIndex >= 0 ? (row[noteIndex]?.trim() ?? "") : "";
          const oracleReason = /(?:reason|理由)\s*:\s*(\S+)/i.exec(oracle)?.[1] ?? "";
          if (!cellReason && !note && !oracleReason) {
            problems.push(`${id} ${header} ${mark} needs a reason for partial or missing coverage`);
          }
          if (mark === "❌") {
            const owner = ownerIndex >= 0 ? (row[ownerIndex]?.trim() ?? "") : "";
            if (!owner && !/\bowner\s*:/i.test(oracle)) {
              problems.push(`${id} ${header} ❌ needs an owner`);
            }
          }
        }
      } else if (!/^(?:n\/?a|—|-|not applicable)$/i.test(cell)) {
        problems.push(`${id} ${header} has no coverage score`);
      }
    }
  }
  for (const id of expectedIds) {
    if (!seen.has(id)) problems.push(`missing coverage row ${id}`);
  }
  return { problems, totals: coverage };
}

function evidenceProblems(text: string, matrixRel: string, expected: Totals): string[] {
  const problems: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (/^## Coverage Depth Matrix\s*$/.test(line)) {
      current = [];
      sections.push(current);
    } else if (/^#{1,6}\s/.test(line)) {
      current = null;
    } else {
      current?.push(line);
    }
  }
  if (sections.length !== 1) return ["ATDD evidence needs one Coverage Depth Matrix section"];
  const body = sections[0] ?? [];
  if (
    parseAllMarkdownTables(body.join("\n")).length > 0 ||
    body.some((line) => /^\s*\|/.test(line))
  ) {
    problems.push("ATDD evidence must link the matrix instead of inlining its table");
  }
  const destinations = body.flatMap((line) => [
    ...[...line.matchAll(/\]\(\s*<?([^)>\s]+)>?/g)].map((match) => match[1] ?? ""),
    ...[...line.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ""),
  ]);
  const referenced = destinations.some((candidate) => {
    const clean = candidate.replace(/\\/g, "/").replace(/[#?].*$/, "");
    const resolved = clean.startsWith(".qfai/")
      ? clean
      : path.posix.normalize(path.posix.join(EVIDENCE_DIR, clean));
    return resolved === matrixRel;
  });
  if (!referenced) problems.push(`ATDD evidence does not link ${matrixRel}`);
  const tally = body.map((line) => TOTALS_LINE.exec(line)).find((match) => match !== null);
  if (!tally) problems.push("ATDD evidence needs one ✅ N / ⚠️ N / ❌ N totals line");
  else {
    for (const [index, mark] of MARKS.entries()) {
      const value = Number(tally[index + 1]);
      if (value !== expected[mark]) {
        problems.push(
          `ATDD evidence ${mark} total ${value} disagrees with matrix ${expected[mark]}`,
        );
      }
    }
  }
  return problems;
}

function within(base: string, candidate: string): boolean {
  const relative = path.relative(base, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

async function hasExistingE2eLink(
  root: string,
  header: string,
  flowId: string,
  testsDir?: string,
): Promise<boolean> {
  const links = [...header.matchAll(/\]\(\s*<?([^)<>\s]+)>?/g)].map((match) => match[1] ?? "");
  const repoRoot = await realpath(root);
  let configuredE2e: string | null = null;
  if (testsDir) {
    try {
      configuredE2e = await realpath(path.join(testsDir, "e2e"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  for (const link of links) {
    const normalized = link.replace(/\\/g, "/").replace(/[#?].*$/, "");
    if (!/(?:^|\/)e2e\/[^/]+/i.test(normalized) || /^(?:[a-z]+:|\/)/i.test(normalized)) continue;
    const candidate = path.resolve(root, EVIDENCE_DIR, normalized);
    try {
      const resolved = await realpath(candidate);
      if (!within(repoRoot, resolved) && (!configuredE2e || !within(configuredE2e, resolved)))
        continue;
      if (!(await stat(resolved)).isFile()) continue;
      if (parseStoryTestAnnotations(await readFile(resolved, "utf8")).BF.includes(flowId))
        return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return false;
}

/** Enforces the per-flow matrix and ATDD handoff evidence in the story tree. */
export async function validateStoryTreeCoverageDepth(
  root: string,
  model: StoryTreeModel,
  flowScope?: FlowScope,
  testsDir?: string,
): Promise<Issue[]> {
  const findings: Issue[] = [];
  const selected = flowScope ? new Set(flowScope.flowIds) : null;
  const flows = model.flows.filter((flow) => !selected || selected.has(flow.id));
  const ignored = ignoredAndUntracked(
    root,
    flows.flatMap((flow) => [
      `${EVIDENCE_DIR}/coverage-depth-${flow.id}.md`,
      `${EVIDENCE_DIR}/atdd-${flow.id}.md`,
    ]),
  );
  for (const flow of flows) {
    const matrixRel = `${EVIDENCE_DIR}/coverage-depth-${flow.id}.md`;
    const evidenceRel = `${EVIDENCE_DIR}/atdd-${flow.id}.md`;
    const matrix = await readOptional(path.join(root, matrixRel));
    if (matrix === null) {
      findings.push(
        matrixIssue(
          "QFAI-ATDD-131",
          flow.id,
          matrixRel,
          `${flow.id}: Coverage Depth Matrix is missing at ${matrixRel}`,
        ),
      );
      continue;
    }
    if (ignored.has(matrixRel)) {
      findings.push(
        matrixIssue(
          "QFAI-ATDD-132",
          flow.id,
          matrixRel,
          `${flow.id}: Coverage Depth Matrix is ignored and untracked`,
        ),
      );
    }
    const stories = model.stories.filter((story) => story.flowId === flow.id);
    const storyIds = new Set(stories.map((story) => story.id));
    const expectedIds = new Set([
      ...storyIds,
      ...model.acceptanceCriteria.filter((ac) => storyIds.has(ac.storyId)).map((ac) => ac.id),
      ...model.examples.filter((ex) => storyIds.has(ex.storyId)).map((ex) => ex.id),
    ]);
    const { problems, totals: matrixTotals } = matrixRows(matrix, expectedIds);
    const header = matrix.split(/^\s*\|/m)[0] ?? "";
    if (
      !header.includes(flow.id) ||
      !/\bE2E\b/i.test(header) ||
      !(await hasExistingE2eLink(root, header, flow.id, testsDir))
    ) {
      problems.push(`${flow.id} header must name the BF and link its E2E obligation`);
    }
    const evidence = await readOptional(path.join(root, evidenceRel));
    if (evidence === null) problems.push(`ATDD evidence is missing at ${evidenceRel}`);
    else {
      if (ignored.has(evidenceRel)) {
        findings.push(
          matrixIssue(
            "QFAI-ATDD-132",
            flow.id,
            evidenceRel,
            `${flow.id}: ATDD evidence is ignored and untracked`,
          ),
        );
      }
      problems.push(...evidenceProblems(evidence, matrixRel, matrixTotals));
    }
    if (problems.length > 0) {
      findings.push(
        matrixIssue("QFAI-ATDD-133", flow.id, matrixRel, `${flow.id}: ${problems.join("; ")}`),
      );
    }
  }
  return findings;
}
