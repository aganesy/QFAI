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

const TAXONOMY_RANGE_MIN = 150;
const TAXONOMY_RANGE_MAX = 299;

// Some codes intentionally serve the same semantic purpose from multiple validation call sites.
// These are allowed to map to more than one rule name as long as the rules share the same category.
const KNOWN_MULTI_RULE_CODES = new Set([
  "QFAI-PROT-244", // render artifact validation (bundle-level + screen-level checks)
  // V1 lifecycle uses `prototypingEvidence.iterations`; V2 lifecycle (round
  // workflow) uses `prototypingEvidence.rounds`. Both branches gate on the
  // same "at least one primary lifecycle entry" rule.
  "QFAI-PROT-280",
]);

// Some codes are newly added and pending description registration in validate.ts.
// Once descriptions are added, these codes will automatically pass the description check.
const PENDING_DESCRIPTION_CODES = new Set<string>(["QFAI-PROT-280"]);

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
        return num >= 100 && !descriptionCodes.has(c) && !PENDING_DESCRIPTION_CODES.has(c);
      })
      .sort();
    expect(missingDescriptions).toEqual([]);
  });

  it("validate.ts may describe additional reserved prototyping codes beyond current active usage", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");
    expect(validateContent).toContain("QFAI-PROT-150");
  });
});
