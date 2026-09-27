import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";
import { documentSchemaIssues } from "../../src/core/validators/documentSchema.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const FLOW = ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md";

async function template(): Promise<string> {
  const text = await readFile(
    path.join(
      getInitAssetsDir(),
      ".qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/business-flow-NNNN/business-flow.md",
    ),
    "utf-8",
  );
  return text.replace(/\r\n/g, "\n");
}

/** A tree holding one business flow, with the default configured paths. */
async function treeWithFlow(body: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-docschema-"));
  roots.push(root);
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    "utf-8",
  );
  await mkdir(path.dirname(path.join(root, FLOW)), { recursive: true });
  await writeFile(path.join(root, FLOW), body, "utf-8");
  return root;
}

async function schemaFindings(
  root: string,
): Promise<{ code: string; file?: string; message: string }[]> {
  const result = await validateProject(root, undefined, { profile: "sdd" });
  return result.issues.filter((finding) => finding.code.startsWith("QFAI-DOCSCHEMA-"));
}

describe("qfai validate runs the document-schema check", () => {
  it("reports each schema violation as an error naming the document and line", async () => {
    // QFAI:AC-0001-0011-03
    // QFAI:EX-0001-0011-06
    const withoutFlow = (await template()).replace(/^## Flow\n[\s\S]*?(?=^## |(?![\s\S]))/m, "");
    const root = await treeWithFlow(withoutFlow);

    const findings = await schemaFindings(root);

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.code).toBe("QFAI-DOCSCHEMA-001");
      expect(finding.file).toBe(FLOW);
      expect(finding.message).toMatch(new RegExp(`^${FLOW.replace(/\./g, "\\.")}:\\d+:\\d+ \\[`));
    }
    expect(findings.map((finding) => finding.message).join("\n")).toContain("Flow");
  });

  it("reports nothing for a document that conforms", async () => {
    // QFAI:AC-0001-0011-03
    const root = await treeWithFlow(await template());

    expect(await schemaFindings(root)).toEqual([]);
  });

  it("refuses the opt-out marker rather than skipping the document", async () => {
    // QFAI:AC-0001-0011-03
    // QFAI:EX-0001-0011-08
    const root = await treeWithFlow(`<!-- mdschema:ignore -->\n\n${await template()}`);

    const findings = await schemaFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: "QFAI-DOCSCHEMA-001", file: FLOW });
    expect(findings[0]?.message).toContain("is not accepted");
  });

  it("reports a check that could not run as an error of its own", () => {
    // QFAI:EX-0001-0011-09
    const root = path.join(os.tmpdir(), "tree");
    const findings = documentSchemaIssues(
      { ok: false, reason: "no @jackchuka/mdschema installation was found" },
      root,
      path.join(root, ".qfai", "spec"),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        code: "QFAI-DOCSCHEMA-002",
        severity: "error",
        file: ".qfai/spec",
        message:
          "The document-schema check did not run: no @jackchuka/mdschema installation was found",
      }),
    ]);
    expect(documentSchemaIssues({ ok: true, violations: [{ file: 1 }] }, root, root)[0]?.code).toBe(
      "QFAI-DOCSCHEMA-002",
    );
  });
});
