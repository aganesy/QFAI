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
const setupStart = "      - name: Resolve the package manager (pnpm route fails closed)";
const installStep = "      - name: Install dependencies (lockfile-aware)";

describe("shared setup in shipped workflows", () => {
  it("renders the shipped copies byte for byte", () => {
    expect(syncShippedWorkflowToolchain(workflows, true)).toEqual([]);
  });

  it("detects and regenerates a shared edit while keeping each lane's copy complete", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "qfai-shipped-toolchain-"));
    try {
      const source = await readFile(path.join(workflows, validate), "utf8");
      const originalTests = await readFile(path.join(workflows, tests), "utf8");
      const docsSource = (await readFile(path.join(workflows, docs), "utf8")).replace(
        /\r?\n/g,
        "\r\n",
      );
      const docsOnlyStep = docsSource.indexOf(
        "      - name: Install the document-shape and diagram checkers",
      );
      expect(docsOnlyStep).toBeGreaterThan(0);
      const originalDocs =
        docsSource.slice(0, docsOnlyStep) +
        [
          "      # This comment belongs to the docs workflow.",
          "  later:",
          "    runs-on: ubuntu-latest",
          "    steps:",
          "      - name: Finish the docs workflow",
          '        run: echo "docs complete"',
          "",
        ].join("\r\n");
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

  it.each([
    {
      description: "a missing start marker",
      newline: "\n",
      change: (text: string) => text.replace(setupStart, "      - name: Unexpected start"),
      error: /missing toolchain start marker in qfai-docs\.yml.*Resolve the package manager/u,
    },
    {
      description: "a duplicate start marker",
      newline: "\n",
      change: (text: string) => text.replace(setupStart, [setupStart, setupStart].join("\n")),
      error: /duplicate toolchain start marker in qfai-docs\.yml.*Resolve the package manager/u,
    },
    {
      description: "an extra destination step",
      newline: "\n",
      change: (text: string) =>
        text.replace(
          installStep,
          ["      - name: Docs-only setup", "        run: echo docs-only", installStep].join("\n"),
        ),
      error:
        /interrupted toolchain sequence in qfai-docs\.yml.*Install dependencies.*Docs-only setup.*keep the six setup steps together and put lane-specific steps after them/u,
    },
    {
      description: "a truncated setup sequence",
      newline: "\n",
      change: (text: string) => text.split(installStep)[0] ?? text,
      error:
        /interrupted toolchain sequence in qfai-docs\.yml.*Install dependencies.*end of the file/u,
    },
    {
      description: "mixed line endings before a destination-only step",
      newline: "\r\n",
      change: (text: string) => {
        const step = "      - name: Install the document-shape and diagram checkers";
        return text.replace(`\r\n${step}`, `\n${step}`);
      },
      error: /mixed or unsupported line endings in qfai-docs\.yml/u,
    },
    {
      description: "a bare carriage return before a destination-only step",
      newline: "\n",
      change: (text: string) => {
        const step = "      - name: Install the document-shape and diagram checkers";
        return text.replace(`\n${step}`, `\r${step}`);
      },
      error: /mixed or unsupported line endings in qfai-docs\.yml/u,
    },
  ])("rejects $description before writing either workflow", async ({ newline, change, error }) => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "qfai-shipped-toolchain-"));
    try {
      const source = await readFile(path.join(workflows, validate), "utf8");
      const changedSource = source.replace("it never computed.", "without running.");
      expect(changedSource).not.toBe(source);
      const originalTests = await readFile(path.join(workflows, tests), "utf8");
      const originalDocs = (await readFile(path.join(workflows, docs), "utf8")).replace(
        /\r?\n/g,
        newline,
      );
      const changedDocs = change(originalDocs);
      expect(changedDocs).not.toBe(originalDocs);
      await Promise.all([
        writeFile(path.join(directory, validate), changedSource, "utf8"),
        writeFile(path.join(directory, tests), originalTests, "utf8"),
        writeFile(path.join(directory, docs), changedDocs, "utf8"),
      ]);

      expect(() => syncShippedWorkflowToolchain(directory)).toThrow(error);
      expect(await readFile(path.join(directory, tests), "utf8")).toBe(originalTests);
      expect(await readFile(path.join(directory, docs), "utf8")).toBe(changedDocs);
    } finally {
      await removeTempTree(directory);
    }
  });
});
