import { createHash } from "node:crypto";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import type { FlowScope } from "../flowScope.js";
import type { StoryTreeModel } from "../storyTree/tree.js";

type ReadText = (file: string) => Promise<string>;

// The row an example's table holds for it.
function exampleRow(text: string, id: string): string {
  return text.split(/\r?\n/).find((line) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(line)) ?? "";
}

// A criterion's own block: its heading and every line up to the next criterion or the fence.
function criterionBlock(text: string, id: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `# ${id}`);
  if (start < 0) return "";
  const end = lines.findIndex(
    (line, index) => index > start && (/^# AC-/.test(line.trim()) || line.startsWith("```")),
  );
  return lines.slice(start, end < 0 ? lines.length : end).join("\n");
}

// The digest of the obligation set: its IDs, and for each item the text that states it. A flow
// and a story are their own files; a criterion is its scenario block and an example its row; a
// rule citing one of the flow's examples is its ID, Statement and Examples. An edit elsewhere in
// a file that declares an item leaves the digest as it was.
export async function obligationDigest(
  model: StoryTreeModel,
  scope: FlowScope,
  ids: readonly string[],
  readText: ReadText,
): Promise<string> {
  const hash = createHash("sha256").update(JSON.stringify(ids));
  const add = (label: string, text: string) =>
    hash.update(`\0${label}\0${hashAssistantAssetText(text)}`);
  const fileOf = (id: string) => model.declarations.find((item) => item.id === id)?.file;
  for (const id of [...scope.flowIds, ...scope.storyIds]) {
    const file = fileOf(id);
    add(id, file ? await readText(file) : "");
  }
  for (const id of scope.acceptanceCriteriaIds) {
    const file = fileOf(id);
    add(id, file ? criterionBlock(await readText(file), id) : "");
  }
  for (const id of scope.exampleIds) {
    const file = fileOf(id);
    add(id, file ? exampleRow(await readText(file), id) : "");
  }
  const examples = new Set(scope.exampleIds);
  for (const rule of model.rules.filter((each) => each.examples.some((id) => examples.has(id)))) {
    add(rule.id, [rule.statement, ...rule.examples].join("\0"));
  }
  return hash.digest("hex");
}
