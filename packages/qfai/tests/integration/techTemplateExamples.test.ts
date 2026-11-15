import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateStoryPolicyPlaceholders } from "../../src/core/validators/assistantAssets.js";
import { validateDocumentSchema } from "../../src/core/validators/documentSchema.js";
import { validateTechArchitecture } from "../../src/core/validators/storyTreeStructure.js";

const TEMPLATE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md",
);

/** Each `<example: value>` and `<optional example: value>` of the template, replaced by its value. */
function copyExamples(template: string): string {
  return template.replace(/<(?:optional )?example: ([^<>\n]+)>/g, "$1");
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-tech-template-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeTech(content: string): Promise<string> {
  const contractsDir = path.join(root, ".qfai", "spec", "03_contract");
  await mkdir(contractsDir, { recursive: true });
  await writeFile(path.join(contractsDir, "tech.md"), content, "utf8");
  return contractsDir;
}

async function template(): Promise<string> {
  return (await readFile(TEMPLATE, "utf8")).replace(/\r\n/g, "\n");
}

describe("the tech.md template's examples", () => {
  // QFAI:AC-0001-0011-06
  // QFAI:EX-0001-0011-20
  it("give a tech.md that passes validation when each example is replaced by its value", async () => {
    const copied = copyExamples(await template());
    expect(copied).not.toContain("example:");
    const contractsDir = await writeTech(copied);
    const { config } = await loadConfig(root);

    expect(await validateDocumentSchema(root, config)).toEqual([]);
    expect(await validateStoryPolicyPlaceholders(root, config)).toEqual([]);
    expect(await validateTechArchitecture(contractsDir)).toEqual([]);
  });

  // QFAI:AC-0001-0052-02
  // QFAI:EX-0001-0052-12
  it("are reported as unfilled template values until each is replaced", async () => {
    const shipped = await template();
    await writeTech(shipped);
    const { config } = await loadConfig(root);

    const findings = await validateStoryPolicyPlaceholders(root, config);
    expect(findings.map((finding) => finding.code)).toEqual(["QFAI-ASSETS-003"]);
    expect(findings[0]?.refs).toEqual([
      "Stack",
      "Architecture",
      "Dependencies",
      "Standard commands (copy-paste)",
    ]);

    const oneLeft = copyExamples(shipped).replace(
      "- Build: `pnpm build`",
      "- Build: `<example: pnpm build>`",
    );
    await writeTech(oneLeft);
    const left = await validateStoryPolicyPlaceholders(root, config);
    expect(left[0]?.refs).toEqual(["Standard commands (copy-paste)"]);
  });

  // QFAI:EX-0001-0011-19
  it("are named by validation in place of the pattern when a required line is missing", async () => {
    await writeTech(
      copyExamples(await template()).replace("- Format: `pnpm prettier --check .`\n", ""),
    );
    const { config } = await loadConfig(root);

    const messages = (await validateDocumentSchema(root, config)).map((found) => found.message);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(
      "Section 'Standard commands (copy-paste)' lacks a line the schema requires, for example: - Format: `pnpm prettier --check .`",
    );
    expect(messages[0]).not.toContain("(?m)");
  });
});
