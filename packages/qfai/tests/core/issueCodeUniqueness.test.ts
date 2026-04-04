import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("issue code uniqueness", () => {
  it("QFAI-PROT-261/262/263 are not reused across browser QA and fullHarness rules", async () => {
    const validatorPath = path.resolve(
      __dirname,
      "../../src/core/validators/prototypingEvidence.ts",
    );
    const content = await readFile(validatorPath, "utf-8");
    const lines = content.split("\n");

    const codeRuleMap = new Map<string, Set<string>>();

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/"(QFAI-PROT-26[0-9]|QFAI-PROT-28[0-9])"/);
      if (!match) continue;
      const code = match[1];

      let rule = "unknown";
      for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
        const ruleMatch = lines[j].match(/"(prototypingEvidence\.\w+)"/);
        if (ruleMatch) {
          rule = ruleMatch[1];
          break;
        }
      }

      if (!codeRuleMap.has(code)) {
        codeRuleMap.set(code, new Set());
      }
      codeRuleMap.get(code)!.add(rule);
    }

    const violations: string[] = [];
    for (const [code, rules] of codeRuleMap) {
      if (rules.size > 1) {
        violations.push(`${code} used for ${rules.size} distinct rules: ${[...rules].join(", ")}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("browser QA codes (261-263) and fullHarness codes (281-283) use separate code numbers", async () => {
    const validatorPath = path.resolve(
      __dirname,
      "../../src/core/validators/prototypingEvidence.ts",
    );
    const content = await readFile(validatorPath, "utf-8");
    const lines = content.split("\n");

    // Collect codes used in browser QA context (near browserQa rule names)
    const browserQaCodes = new Set<string>();
    const fullHarnessCodes = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const codeMatch = lines[i].match(/"(QFAI-PROT-\d+)"/);
      if (!codeMatch) continue;
      const code = codeMatch[1];

      // Look for nearby rule names to classify context
      let context = "";
      for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
        if (lines[j].includes("browserQaModeMismatch") ||
            lines[j].includes("browserQaEmptyCompleted") ||
            lines[j].includes("browserQaNotExecuted")) {
          context = "browserQa";
          break;
        }
        if (lines[j].includes("fullHarnessRequired") ||
            lines[j].includes("fullHarnessTerminationReason") ||
            lines[j].includes("fullHarnessScoringTrace")) {
          context = "fullHarness";
          break;
        }
      }

      if (context === "browserQa") browserQaCodes.add(code);
      if (context === "fullHarness") fullHarnessCodes.add(code);
    }

    // Verify no overlap
    const overlap = [...browserQaCodes].filter((c) => fullHarnessCodes.has(c));
    expect(overlap).toEqual([]);

    // Verify browser QA uses 261-263 range
    for (const code of browserQaCodes) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      expect(num).toBeGreaterThanOrEqual(261);
      expect(num).toBeLessThanOrEqual(263);
    }

    // Verify fullHarness uses 281-283 range
    for (const code of fullHarnessCodes) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      expect(num).toBeGreaterThanOrEqual(281);
      expect(num).toBeLessThanOrEqual(283);
    }
  });

  it("QFAI-PROT-* codes in validate.ts issueDescriptions reference real validator/evidence codes", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");

    // Collect codes from validators
    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const validatorFiles = await collectTsFiles(validatorDir);

    const allCodes = new Set<string>();
    for (const filePath of validatorFiles) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        allCodes.add(match[1]);
      }
    }

    // Also collect codes from uiux/ directory (renderEvidence uses QFAI-PROT-251/252/253)
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const uiuxFiles = await collectTsFiles(uiuxDir);
    for (const filePath of uiuxFiles) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        allCodes.add(match[1]);
      }
    }

    // Collect codes from validate.ts issueDescriptions
    const descriptionCodes = new Set<string>();
    for (const match of validateContent.matchAll(/"(QFAI-PROT-\d+)":/g)) {
      descriptionCodes.add(match[1]);
    }

    // Every code in validate.ts descriptions should be a real code
    const staleDescriptions = [...descriptionCodes].filter((c) => !allCodes.has(c));
    expect(staleDescriptions).toEqual([]);
  });
});
