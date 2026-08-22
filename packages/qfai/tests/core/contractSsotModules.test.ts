import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  extractSsotModuleEntries,
  validateContractSsotModules,
} from "../../src/core/validators/contractSsotModules.js";

// tests/core/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function seedContract(root: string, name: string, lines: string[]): Promise<string> {
  const dir = path.join(root, ".qfai", "contracts", "cli");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  await writeFile(file, `${lines.join("\n")}\n`, "utf-8");
  return file;
}

describe("extractSsotModuleEntries", () => {
  it("collects entries and skips continuation lines and non-path tokens", () => {
    const entries = extractSsotModuleEntries(
      [
        "# CLI Contract",
        "",
        "- SSOT modules:",
        "  - `packages/qfai/src/core/doctor.ts` (doctor probe orchestration;",
        "    single-file module — there is no `core/doctor/` directory)",
        "  - `packages/qfai/src/core/prototyping/iteration.ts` (cycle SSOT;",
        "    `MAX_ITERATIONS = 10`, `MAX_ITERATION_INDEX = 9`)",
        "  - `notAPath`",
        "",
        "## Public sub-commands",
        "",
        "- `packages/qfai/src/core/never-cited.ts`",
      ].join("\n"),
    );

    expect(entries).toEqual([
      { modulePath: "packages/qfai/src/core/doctor.ts", line: 4 },
      { modulePath: "packages/qfai/src/core/prototyping/iteration.ts", line: 6 },
    ]);
  });

  it("ignores a block that only appears inside a fenced code example", () => {
    const entries = extractSsotModuleEntries(
      [
        "# How to write a contract",
        "",
        "Open the contract with the routing block:",
        "",
        "```markdown",
        "- SSOT modules:",
        "  - `packages/qfai/src/core/example.ts` (the module that carries the truth)",
        "```",
        "",
        "- SSOT modules:",
        "  - `packages/qfai/src/core/real.ts`",
        "~~~md",
        "- SSOT modules:",
        "  - `packages/qfai/src/core/other-example.ts`",
        "~~~",
      ].join("\n"),
    );

    expect(entries).toEqual([{ modulePath: "packages/qfai/src/core/real.ts", line: 11 }]);
  });
});

describe("validateContractSsotModules", () => {
  it("reports an SSOT modules entry that does not resolve on disk", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-modules-"));
    try {
      await mkdir(path.join(root, "src", "core"), { recursive: true });
      await writeFile(path.join(root, "src", "core", "real.ts"), "export const a = 1;\n", "utf-8");
      await seedContract(root, "qfai-init.md", [
        "# CLI Contract: `qfai init`",
        "",
        "- SSOT modules:",
        "  - `src/core/real.ts`",
        "  - `src/core/worklog/parseEntry.ts` (work-log entry frontmatter parser)",
      ]);

      const issues = await validateContractSsotModules(root, defaultConfig);
      const dead = issues.filter((item) => item.code === "QFAI-CONTRACT-050");

      expect(dead).toHaveLength(1);
      expect(dead[0]?.severity).toBe("error");
      expect(dead[0]?.refs).toContain("src/core/worklog/parseEntry.ts");
      expect(dead[0]?.file).toBe(".qfai/contracts/cli/qfai-init.md");
      expect(dead[0]?.loc?.line).toBe(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("passes when every entry resolves, including directory entries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-modules-"));
    try {
      await mkdir(path.join(root, "src", "core"), { recursive: true });
      await writeFile(path.join(root, "src", "core", "real.ts"), "export const a = 1;\n", "utf-8");
      await seedContract(root, "qfai-validate.md", [
        "# CLI Contract: `qfai validate`",
        "",
        "- SSOT modules:",
        "  - `src/core/real.ts` (the one module)",
        "  - `src/core`",
      ]);

      const issues = await validateContractSsotModules(root, defaultConfig);

      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an entry that escapes the project root even when the target exists", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-outside-"));
    const root = path.join(parent, "project");
    try {
      await mkdir(root, { recursive: true });
      await writeFile(path.join(parent, "outside.ts"), "export const a = 1;\n", "utf-8");
      await seedContract(root, "qfai-validate.md", [
        "# CLI Contract: `qfai validate`",
        "",
        "- SSOT modules:",
        "  - `../outside.ts`",
      ]);

      const issues = await validateContractSsotModules(root, defaultConfig);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("QFAI-CONTRACT-050");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("プロジェクトルート外");
      expect(issues[0]?.refs).toContain("../outside.ts");
      expect(issues[0]?.loc?.line).toBe(4);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("ignores a fenced SSOT modules example inside a contract document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-modules-"));
    try {
      await seedContract(root, "README.md", [
        "# Contract authoring guide",
        "",
        "```markdown",
        "- SSOT modules:",
        "  - `src/core/imaginary.ts` (example only)",
        "```",
      ]);

      const issues = await validateContractSsotModules(root, defaultConfig);

      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("is silent on contracts that declare no SSOT modules block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ssot-modules-"));
    try {
      await seedContract(root, "qfai-doctor.md", [
        "# CLI Contract: `qfai doctor`",
        "",
        "- Owning spec: `spec-0001`",
        "",
        "See `packages/qfai/src/core/gone.ts` for details.",
      ]);

      const issues = await validateContractSsotModules(root, defaultConfig);

      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Dogfooding: this repository's own contracts must route to modules that
  // exist. Before the fix, `.qfai/contracts/cli/` cited four never-written
  // `core/worklog/*` / `core/assistantAssets.ts` paths across six entry lines.
  it("finds no dead SSOT modules entry in this repository's contracts", async () => {
    const issues = await validateContractSsotModules(repoRoot, defaultConfig);

    expect(issues.map((item) => `${item.file}: ${item.refs?.join(", ") ?? ""}`)).toEqual([]);
  });
});
