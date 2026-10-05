import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { ASSISTANT_DIR } from "../paths/assistantPaths.js";

/** The `qfai workflow` operations an earlier release had and this release does not. */
const RETIRED_WORKFLOW_OPERATIONS = [
  "start",
  "next",
  "accept",
  "decision",
  "status",
  "resume",
  "finish",
] as const;

const RETIRED_OPERATION_RE = new RegExp(
  `\\bqfai workflow (${RETIRED_WORKFLOW_OPERATIONS.join("|")})\\b`,
  "gu",
);

export type StaleAssistantCheck = {
  id: "assistant.staleFiles";
  severity: "warning";
  title: string;
  message: string;
  details: { files: string[]; operations: string[] };
};

/**
 * Assistant files that call a `qfai workflow` operation this CLI no longer has, so they were
 * written by an older release. Nothing is reported for files that call only operations the CLI
 * has, and a file or directory that cannot be read is passed over.
 *
 * SIMPLIFIED: recognises only the workflow operations an earlier release retired.
 * Lift when: another command an installed file calls is removed and the same mismatch recurs.
 */
export async function checkStaleAssistant(root: string): Promise<StaleAssistantCheck | undefined> {
  const assistantDir = path.resolve(root, ASSISTANT_DIR);
  const paths = await collectFiles(assistantDir, {
    extensions: [".md"],
    onUnreadableDirectory: () => undefined,
  });
  const files: string[] = [];
  const operations = new Set<string>();
  for (const file of paths.sort()) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    const found = [...text.matchAll(RETIRED_OPERATION_RE)].map((match) => match[1] ?? "");
    if (found.length === 0) continue;
    files.push(path.relative(root, file).split(path.sep).join("/"));
    for (const operation of found) operations.add(operation);
  }
  if (files.length === 0) return undefined;
  const called = [...operations].sort();
  return {
    id: "assistant.staleFiles",
    severity: "warning",
    title: "Assistant files older than this CLI",
    message:
      `${files.length} assistant file(s) call \`npx qfai workflow ${called.join("`, `npx qfai workflow ")}\`, ` +
      "which this CLI does not have, so an earlier release wrote them. " +
      "Run `npx qfai init --force` to replace them with the files this release ships. " +
      "It overwrites edits you made to them, so keep a copy first.",
    details: { files, operations: called },
  };
}
