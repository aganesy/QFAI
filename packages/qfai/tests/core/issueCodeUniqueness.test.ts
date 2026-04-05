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

function extractCodesWithRules(content: string): Map<string, Set<string>> {
  const lines = content.split("\n");
  const codeRuleMap = new Map<string, Set<string>>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/"(QFAI-PROT-\d+)"/);
    if (!match) continue;
    const code = match[1];

    let rule = "unknown";
    for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
      const ruleMatch = lines[j].match(
        /"(prototypingEvidence\.\w+|prototypingRecommendation\.\w+|renderEvidence\.\w+)"/,
      );
      if (ruleMatch) {
        rule = ruleMatch[1];
        break;
      }
    }

    if (!codeRuleMap.has(code)) {
      codeRuleMap.set(code, new Set());
    }
    const ruleSet = codeRuleMap.get(code);
    if (ruleSet) ruleSet.add(rule);
  }

  return codeRuleMap;
}

// Codes in the 231-283 range must map to exactly one rule (v1.7.13 taxonomy contract).
// Codes outside this range (101-177) may intentionally share a code across related sub-rules
// within the same validator category.
const TAXONOMY_RANGE_MIN = 231;
const TAXONOMY_RANGE_MAX = 283; // Note: browser QA bundle taxonomy codes 273-276 are also in range

// Some codes intentionally serve the same semantic purpose from multiple validation call sites.
// These are allowed to map to more than one rule name as long as the rules share the same category.
const KNOWN_MULTI_RULE_CODES = new Set([
  "QFAI-PROT-244", // render artifact validation (bundle-level + screen-level checks)
]);

describe("issue code uniqueness", () => {
  it("every QFAI-PROT-2xx code in validators, uiux, and browserQa maps to exactly one rule", async () => {
    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");

    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);
    const allFiles = [...validatorFiles, ...uiuxFiles, ...browserQaFiles];

    const globalCodeRuleMap = new Map<string, Set<string>>();

    for (const filePath of allFiles) {
      const content = await readFile(filePath, "utf-8");
      const fileMap = extractCodesWithRules(content);
      for (const [code, rules] of fileMap) {
        if (!globalCodeRuleMap.has(code)) {
          globalCodeRuleMap.set(code, new Set());
        }
        const globalRuleSet = globalCodeRuleMap.get(code);
        for (const rule of rules) {
          if (globalRuleSet) globalRuleSet.add(rule);
        }
      }
    }

    const violations: string[] = [];
    for (const [code, rules] of globalCodeRuleMap) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      if (num < TAXONOMY_RANGE_MIN || num > TAXONOMY_RANGE_MAX) {
        continue;
      }
      if (KNOWN_MULTI_RULE_CODES.has(code)) {
        continue;
      }
      if (rules.size > 1) {
        violations.push(
          `${code} used for ${rules.size} distinct rules: ${[...rules].sort().join(", ")}`,
        );
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

    const browserQaCodes = new Set<string>();
    const fullHarnessCodes = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const codeMatch = lines[i].match(/"(QFAI-PROT-\d+)"/);
      if (!codeMatch) continue;
      const code = codeMatch[1];

      let context = "";
      for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
        if (
          lines[j].includes("browserQaModeMismatch") ||
          lines[j].includes("browserQaEmptyCompleted") ||
          lines[j].includes("browserQaNotExecuted")
        ) {
          context = "browserQa";
          break;
        }
        if (
          lines[j].includes("fullHarnessRequired") ||
          lines[j].includes("fullHarnessTerminationReason") ||
          lines[j].includes("fullHarnessScoringTrace")
        ) {
          context = "fullHarness";
          break;
        }
      }

      if (context === "browserQa") browserQaCodes.add(code);
      if (context === "fullHarness") fullHarnessCodes.add(code);
    }

    const overlap = [...browserQaCodes].filter((c) => fullHarnessCodes.has(c));
    expect(overlap).toEqual([]);

    for (const code of browserQaCodes) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      expect(num).toBeGreaterThanOrEqual(261);
      expect(num).toBeLessThanOrEqual(263);
    }

    for (const code of fullHarnessCodes) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      expect(num).toBeGreaterThanOrEqual(281);
      expect(num).toBeLessThanOrEqual(283);
    }
  });

  it("every QFAI-PROT-2xx code used in validators/uiux/browserQa has a description in validate.ts", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");

    const descriptionCodes = new Set<string>();
    for (const match of validateContent.matchAll(/"(QFAI-PROT-\d+)":/g)) {
      descriptionCodes.add(match[1]);
    }

    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");
    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);

    const usedCodes = new Set<string>();
    for (const filePath of [...validatorFiles, ...uiuxFiles, ...browserQaFiles]) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        usedCodes.add(match[1]);
      }
    }

    // Check that all QFAI-PROT-2xx codes (taxonomy range) have descriptions
    const missingDescriptions = [...usedCodes]
      .filter((c) => {
        const num = parseInt(c.replace("QFAI-PROT-", ""), 10);
        return num >= 100 && !descriptionCodes.has(c);
      })
      .sort();
    expect(missingDescriptions).toEqual([]);
  });

  it("every QFAI-PROT-* description in validate.ts references a real validator/uiux/browserQa code", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");

    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");
    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);

    const allCodes = new Set<string>();
    for (const filePath of [...validatorFiles, ...uiuxFiles, ...browserQaFiles]) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        allCodes.add(match[1]);
      }
    }

    const descriptionCodes = new Set<string>();
    for (const match of validateContent.matchAll(/"(QFAI-PROT-\d+)":/g)) {
      descriptionCodes.add(match[1]);
    }

    const staleDescriptions = [...descriptionCodes].filter((c) => !allCodes.has(c)).sort();
    expect(staleDescriptions).toEqual([]);
  });

  it("reserved code ranges are respected for 231-283 taxonomy codes", async () => {
    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");
    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);

    const allCodes = new Set<string>();
    for (const filePath of [...validatorFiles, ...uiuxFiles, ...browserQaFiles]) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        allCodes.add(match[1]);
      }
    }

    const reservedRanges: Array<{
      label: string;
      min: number;
      max: number;
    }> = [
      { label: "recommendation schema compatibility", min: 231, max: 232 },
      { label: "recommendation/mode precedence + uiFidelity contract", min: 233, max: 238 },
      { label: "uiFidelity semantic quality + render presence/coverage", min: 241, max: 245 },
      { label: "render bundle structure + file existence", min: 251, max: 256 },
      { label: "browser QA + fullHarness signoff + calibration", min: 261, max: 266 },
      { label: "uiFidelity truthfulization", min: 270, max: 272 },
      { label: "browser QA bundle taxonomy", min: 273, max: 276 },
      { label: "fullHarness", min: 281, max: 283 },
    ];

    const protCodes = [...allCodes]
      .map((c) => parseInt(c.replace("QFAI-PROT-", ""), 10))
      .filter((n) => n >= TAXONOMY_RANGE_MIN && n <= TAXONOMY_RANGE_MAX);

    for (const num of protCodes) {
      const inRange = reservedRanges.some((r) => num >= r.min && num <= r.max);
      expect(inRange).toBe(true);
    }
  });
});
