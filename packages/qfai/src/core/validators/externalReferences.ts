import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { resolveStoryTreeRoots } from "../storyTree/layout.js";
import type { Issue } from "../types.js";
import { exists, isInside, issue } from "./utils.js";

/** A repository path: at least one directory, and a last segment with an extension. */
const PATH_SHAPE = /^(?:\.{1,2}\/)*[\w@.-]+(?:\/[\w@.-]+)+$/;
const FILE_EXTENSION = /\.[A-Za-z0-9]{1,8}$/;
const CODE_SPAN = /`([^`\n]+)`/g;
const LINK_DESTINATION = /\]\(([^)\s]+)/g;

type Tree = "policy" | "business-flow" | "contract" | "decision and open-question";

type TreeCount = { lines: number; files: string[] };

function pathCandidates(line: string): string[] {
  const tokens = [...line.matchAll(CODE_SPAN), ...line.matchAll(LINK_DESTINATION)];
  return tokens
    .map((match) => (match[1] ?? "").replace(/#.*$/, "").replace(/:\d+(?:-\d+)?$/, ""))
    .filter((token) => PATH_SHAPE.test(token) && FILE_EXTENSION.test(token));
}

async function markdownFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(entry.parentPath, entry.name));
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

function treeOf(file: string, specsDir: string, contractsDir: string): Tree {
  if (isInside(contractsDir, file)) return "contract";
  const [top] = path.relative(specsDir, file).split(path.sep);
  if (top === "01_policy") return "policy";
  if (top === "02_business-flow") return "business-flow";
  return "decision and open-question";
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * A story-tree document that names a file by a repository path outside `.qfai`.
 * The path goes stale without a spec review when that file moves. A path counts as
 * inside `.qfai` when it starts with `.qfai/`, or names an existing file there
 * relative to the document, `paths.specsDir` or `paths.contractsDir`. Discussion
 * packs are reference material and are not read. One finding per tree carries the
 * counts, so an existing project can bring them down over time.
 */
export async function validateExternalReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const { specsDir, contractsDir } = resolveStoryTreeRoots(root, config);
  const qfaiDir = path.join(root, ".qfai");
  const files = [
    ...new Set([...(await markdownFiles(specsDir)), ...(await markdownFiles(contractsDir))]),
  ].sort();

  const insideQfai = async (token: string, documentDir: string): Promise<boolean> => {
    if (token.startsWith(".qfai/")) return true;
    for (const base of [documentDir, specsDir, contractsDir]) {
      const target = path.resolve(base, token);
      if (await exists(target)) return isInside(qfaiDir, target);
    }
    return /^\.{1,2}\//.test(token) && isInside(qfaiDir, path.resolve(documentDir, token));
  };

  const counts = new Map<Tree, TreeCount>();
  for (const file of files) {
    const documentDir = path.dirname(file);
    let outside = 0;
    for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
      for (const token of pathCandidates(line)) {
        if (await insideQfai(token, documentDir)) continue;
        outside += 1;
        break;
      }
    }
    if (outside === 0) continue;
    const tree = treeOf(file, specsDir, contractsDir);
    const count = counts.get(tree) ?? { lines: 0, files: [] };
    count.lines += outside;
    count.files.push(file);
    counts.set(tree, count);
  }

  return [...counts].map(([tree, { lines, files: named }]) =>
    issue(
      "QFAI-STORY-015",
      `The ${tree} tree has ${plural(lines, "line")} in ${plural(named.length, "file")} naming a path outside .qfai`,
      "warning",
      named[0],
      "storyTree.externalReference",
      undefined,
      "canonical",
      undefined,
      { relatedFiles: named.slice(1) },
    ),
  );
}
