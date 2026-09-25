/**
 * The shipped guidance tells a stage how to compute the digest of each file its result names, and
 * `accept` compares that digest with its own. A stage that follows the guidance has to produce the
 * digest `accept` computes, on a file with LF line endings and on one with CRLF line endings.
 *
 * The command is run as the guidance prints it, so a change to either side fails here.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const HEADING = "### The digest of a file a stage result names";

// The section's `node -e` payload, taken from the fenced command that ends in `<path>`.
async function digestPayload(tree: string): Promise<string> {
  const text = await readFile(path.join(repoRoot, tree, BASELINE), "utf-8");
  const start = text.indexOf(HEADING);
  expect(start, `${tree}: ${HEADING}`).toBeGreaterThanOrEqual(0);
  const next = text.indexOf("\n#", start + HEADING.length);
  const section = text.slice(start, next === -1 ? undefined : next);
  const command = /^node -e "([^"]+)" <path>$/m.exec(section);
  expect(command, `${tree}: the digest command`).not.toBeNull();
  return command?.[1] ?? "";
}

const BODY = ["first line", "second line", "third line", ""];

let dir = "";
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "qfai-stage-digest-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe.each(QFAI_TREES)("%s", (tree) => {
  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
  ])("gives the digest accept computes on a %s file", async (ending, eol) => {
    const payload = await digestPayload(tree);
    const text = BODY.join(eol);
    const file = path.join(dir, `${ending}.md`);
    await writeFile(file, text, "utf-8");

    const printed = execFileSync(process.execPath, ["-e", payload, file], {
      encoding: "utf-8",
    }).trim();

    expect(printed).toBe(hashAssistantAssetText(text));
  });
});

it("differs from a hash of the raw bytes on a CRLF file", () => {
  const text = BODY.join("\r\n");
  const raw = createHash("sha256").update(text, "utf8").digest("hex");
  expect(hashAssistantAssetText(text)).not.toBe(raw);
});
