import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateRootDir = path.join(templateRoot, "root");
const templateQfaiDir = path.join(templateRoot, ".qfai");

describe("assets guardrails", () => {
  it("checks relative path references in markdown", async () => {
    const markdownFiles = await fg(
      ["README.md", "docs/**/*.md", "packages/qfai/assets/init/**/*.md"],
      {
        cwd: repoRoot,
        absolute: true,
      },
    );

    const missing: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      const refs = extractPathReferences(content);
      for (const ref of refs) {
        if (shouldSkipReference(ref)) {
          continue;
        }
        const candidates = buildCandidates(filePath, ref);
        if (!candidates.some((candidate) => existsSync(candidate))) {
          missing.push(`${ref} (${path.relative(repoRoot, filePath)})`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps npm README onboarding consistent", async () => {
    const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const readme = await readFile(readmePath, "utf-8");
    const sanitized = stripUrls(readme);

    expect(readme).toContain("npx qfai doctor");
    expect(readme).toMatch(/npm (?:i|install) -D qfai/);
    expect(readme).toContain("pnpm add -D qfai");
    expect(readme).toContain(
      "`report.json` / `doctor.json` は内部表現で互換非保証",
    );
    expect(readme).toContain("外部連携は `report.md` など Markdown 出力を推奨");
    expect(sanitized).not.toContain("docs/schema");
    expect(sanitized).not.toContain("docs/examples");
  });

  it("keeps root README aligned with npm README", async () => {
    const rootReadmePath = path.join(repoRoot, "README.md");
    const npmReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const [rootReadme, npmReadme] = await Promise.all([
      readFile(rootReadmePath, "utf-8"),
      readFile(npmReadmePath, "utf-8"),
    ]);

    const normalizedRoot = normalizeReadme(stripUrls(rootReadme));
    const normalizedNpm = normalizeReadme(stripUrls(npmReadme));
    expect(normalizedRoot).toBe(normalizedNpm);
  });

  it("runs init -> validate -> report smoke", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runValidate({
        root,
        strict: false,
        failOn: "never",
        format: "text",
      });
      await runReport({ root, format: "md" });

      const validatePath = path.join(root, ".qfai", "out", "validate.json");
      const reportPath = path.join(root, ".qfai", "out", "report.md");
      await expect(readFile(validatePath, "utf-8")).resolves.toContain(
        '"toolVersion"',
      );
      await expect(readFile(reportPath, "utf-8")).resolves.toContain(
        "# QFAI Report",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps docs/examples outputs relative", async () => {
    const reportExample = await readFile(
      path.join(repoRoot, "docs", "examples", "report.md"),
      "utf-8",
    );
    expect(reportExample).toContain("- ルート: .");
    expect(reportExample).toContain("- 設定: qfai.config.yaml");

    const validateExamplePath = path.join(
      repoRoot,
      "docs",
      "examples",
      "validate.json",
    );
    const validateRaw = await readFile(validateExamplePath, "utf-8");
    const validate = JSON.parse(validateRaw) as {
      issues: Array<{ file?: string }>;
      traceability: { sc: { refs: Record<string, string[]> } };
    };

    const files = [
      ...validate.issues.map((issue) => issue.file).filter(Boolean),
      ...Object.values(validate.traceability.sc.refs).flat(),
    ];
    for (const file of files) {
      expect(path.isAbsolute(file)).toBe(false);
    }
  });
});

function extractPathReferences(content: string): Set<string> {
  const refs = new Set<string>();
  const sanitized = stripUrls(content);
  const pattern =
    /(?:^|[^A-Za-z0-9@])([./A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.(?:md|feature|yml|yaml|json|sql|ts|tsx|js|jsx))/g;
  for (const match of sanitized.matchAll(pattern)) {
    const ref = match[1];
    if (!ref) {
      continue;
    }
    refs.add(ref);
  }
  if (sanitized.includes("qfai.config.yaml")) {
    refs.add("qfai.config.yaml");
  }
  return refs;
}

function stripUrls(content: string): string {
  return content.replace(/https?:\/\/\S+/g, "");
}

function normalizeReadme(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function shouldSkipReference(ref: string): boolean {
  if (ref.startsWith("#") || ref.includes("://")) {
    return true;
  }
  if (ref.startsWith("/")) {
    return true;
  }
  if (ref.includes("*") || ref.includes("{") || ref.includes("}")) {
    return true;
  }
  if (ref.includes(".qfai/out/")) {
    return true;
  }
  if (!ref.includes("/") && !ref.includes("\\")) {
    if (
      ref === "report.json" ||
      ref === "report.md" ||
      ref === "validate.json"
    ) {
      return true;
    }
  }
  if (ref === ".github/copilot-instructions.md") {
    return true;
  }
  return false;
}

function buildCandidates(baseFile: string, ref: string): string[] {
  const baseDir = path.dirname(baseFile);
  if (path.isAbsolute(ref)) {
    return [ref];
  }
  return [
    path.resolve(baseDir, ref),
    path.resolve(repoRoot, ref),
    path.resolve(templateRoot, ref),
    path.resolve(templateRootDir, ref),
    path.resolve(templateQfaiDir, ref),
  ];
}
