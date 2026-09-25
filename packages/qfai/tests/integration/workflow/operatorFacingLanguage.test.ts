// QFAI:AC-0001-0201-05
// QFAI:EX-0001-0201-17

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import {
  findJapaneseLines,
  listSourceFiles,
  relativeToPosix,
} from "../../helpers/japaneseMessageScan.js";
import { SRC_JAPANESE_ALLOWLIST } from "../../unit/cliMessageLanguage.allowlist.js";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

// The sources of the `workflow` command: its adapter and the core it runs.
async function workflowSources(): Promise<string[]> {
  return [
    path.join(SRC, "cli", "commands", "workflow.ts"),
    ...(await listSourceFiles(path.join(SRC, "core", "workflow"))),
  ];
}

it("Run the CLI message language check", async () => {
  const files = (await workflowSources()).map((file) => relativeToPosix(SRC, file));
  const japanese = await Promise.all(
    files.map(
      async (file) => findJapaneseLines(await readFile(path.join(SRC, file), "utf8")).length,
    ),
  );

  expect({
    japanese: japanese.reduce((sum, count) => sum + count, 0),
    allowlisted: files.filter((file) => file in SRC_JAPANESE_ALLOWLIST),
  }).toEqual({ japanese: 0, allowlisted: [] });
});
