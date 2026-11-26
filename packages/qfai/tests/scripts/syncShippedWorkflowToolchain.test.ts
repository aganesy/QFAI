import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { syncShippedWorkflowToolchain } from "../../../../scripts/sync-shipped-workflow-toolchain.mjs";
import { removeTempTree } from "../helpers/tempTree.js";

const workflows = fileURLToPath(
  new URL("../../assets/init/root/.github/workflows/", import.meta.url),
);
const validate = "qfai-validate.yml";
const tests = "qfai-tests.yml";
const docs = "qfai-docs.yml";

describe("shared setup in shipped workflows", () => {
  it("renders the shipped copies byte for byte", () => {
    expect(syncShippedWorkflowToolchain(workflows, true)).toEqual([]);
  });

  it("detects and regenerates a shared edit while keeping each lane's copy complete", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "qfai-shipped-toolchain-"));
    try {
      const source = await readFile(path.join(workflows, validate), "utf8");
      const originalTests = await readFile(path.join(workflows, tests), "utf8");
      const originalDocs = (await readFile(path.join(workflows, docs), "utf8")).replace(
        /\r?\n/g,
        "\r\n",
      );
      const oldComment = "# report a validate result it never computed.";
      const newComment = "# report a validate result without running.";
      const changedSource = source.replace(oldComment, newComment);
      expect(changedSource).not.toBe(source);
      await Promise.all([
        writeFile(path.join(directory, validate), changedSource, "utf8"),
        writeFile(path.join(directory, tests), originalTests, "utf8"),
        writeFile(path.join(directory, docs), originalDocs, "utf8"),
      ]);

      expect(syncShippedWorkflowToolchain(directory, true)).toEqual([tests, docs]);
      expect(await readFile(path.join(directory, tests), "utf8")).toBe(originalTests);
      expect(await readFile(path.join(directory, docs), "utf8")).toBe(originalDocs);

      expect(syncShippedWorkflowToolchain(directory)).toEqual([tests, docs]);
      expect(await readFile(path.join(directory, validate), "utf8")).toBe(changedSource);
      expect(await readFile(path.join(directory, tests), "utf8")).toBe(
        originalTests.replace(
          "# report a test result it never computed.",
          "# report a test result without running.",
        ),
      );
      expect(await readFile(path.join(directory, docs), "utf8")).toBe(
        originalDocs.replace(oldComment, newComment),
      );
      expect(syncShippedWorkflowToolchain(directory)).toEqual([]);
    } finally {
      await removeTempTree(directory);
    }
  });
});
