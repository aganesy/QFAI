/**
 * A structured contract whose top level is not a mapping.
 *
 * A YAML contract holding only its declaration line parses to `null`, and a
 * JSON or YAML body can hold `null`, a list or a scalar. The parse used to hand
 * that value on as if it were a mapping, so the first property read threw and
 * stopped the whole validation run instead of reporting the one contract.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { parseStructuredContract } from "../../src/core/contracts.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** A project whose API contract folder holds `files`, keyed by file name. */
async function projectWithApiContracts(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-root-"));
  roots.push(root);
  const apiDir = path.join(root, ".qfai", "spec", "03_contract", "api");
  await mkdir(apiDir, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    await writeFile(path.join(apiDir, name), text, "utf-8");
  }
  return root;
}

const ROOTS_THAT_ARE_NO_MAPPING: readonly { label: string; file: string; text: string }[] = [
  {
    label: "a YAML file with only its declaration line",
    file: "a.yaml",
    text: "# QFAI-CONTRACT-ID: API-0001\n",
  },
  { label: "a YAML null", file: "a.yaml", text: "# QFAI-CONTRACT-ID: API-0001\nnull\n" },
  { label: "a JSON null", file: "a.json", text: "// QFAI-CONTRACT-ID: API-0001\nnull\n" },
  {
    label: "a YAML list",
    file: "a.yaml",
    text: "# QFAI-CONTRACT-ID: API-0001\n- openapi: 3.0.0\n",
  },
  {
    label: "a JSON array",
    file: "a.json",
    text: '// QFAI-CONTRACT-ID: API-0001\n[{"openapi": "3.0.0"}]\n',
  },
  { label: "a YAML scalar", file: "a.yaml", text: "# QFAI-CONTRACT-ID: API-0001\nopenapi\n" },
  { label: "a JSON number", file: "a.json", text: "// QFAI-CONTRACT-ID: API-0001\n42\n" },
];

describe("a structured contract whose root is not a mapping", () => {
  it.each(ROOTS_THAT_ARE_NO_MAPPING)("refuses $label as a contract", ({ file, text }) => {
    const body = text.split("\n").slice(1).join("\n");
    expect(() => parseStructuredContract(file, body)).toThrow("not a mapping");
  });

  it.each(ROOTS_THAT_ARE_NO_MAPPING)(
    "reports $label and goes on to the next contract",
    async ({ file, text }) => {
      const root = await projectWithApiContracts({
        [file]: text,
        "b.yaml": "# QFAI-CONTRACT-ID: API-0002\ninfo:\n  title: no openapi key\n",
      });
      const issues = await validateContracts(root, defaultConfig);
      const parse = issues.filter((finding) => finding.code === "QFAI-CONTRACT-021");
      expect(parse).toHaveLength(1);
      expect(parse[0]?.file).toContain(file);
      expect(parse[0]?.message).toContain("not a mapping");
      // The second contract is still read: its missing `openapi` key is reported.
      const missing = issues.filter((finding) => finding.code === "QFAI-CONTRACT-020");
      expect(missing.map((finding) => path.basename(finding.file ?? ""))).toEqual(["b.yaml"]);
    },
  );

  it("still returns a contract whose root is a mapping", () => {
    expect(parseStructuredContract("a.json", '{"openapi": "3.0.0"}')).toEqual({
      openapi: "3.0.0",
    });
  });
});
