import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

export type RuleEntry = {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "critical" | "major" | "minor";
  platform: string;
  auto_check?: boolean;
  validation_method?: string;
  detection_method?: string;
  fix_guidance?: string;
};

export type RuleSet = {
  bestPractices: RuleEntry[];
  antiPatterns: RuleEntry[];
};

export async function loadRuleSet(
  contractsDir: string,
  platform: string,
): Promise<RuleSet> {
  const designDir = path.join(contractsDir, "design");
  const bpPattern = path.posix.join(designDir.replace(/\\/g, "/"), "best-practices*.yaml");
  const apPattern = path.posix.join(designDir.replace(/\\/g, "/"), "anti-patterns*.yaml");

  const bpFiles = await fg(bpPattern, { absolute: true });
  const apFiles = await fg(apPattern, { absolute: true });

  const bestPractices: RuleEntry[] = [];
  const antiPatterns: RuleEntry[] = [];

  for (const file of bpFiles) {
    const entries = await loadRuleFile(file);
    bestPractices.push(...filterByPlatform(entries, platform));
  }

  for (const file of apFiles) {
    const entries = await loadRuleFile(file);
    antiPatterns.push(...filterByPlatform(entries, platform));
  }

  return { bestPractices, antiPatterns };
}

async function loadRuleFile(filePath: string): Promise<RuleEntry[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = parseYaml(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRuleEntry);
  } catch {
    return [];
  }
}

function filterByPlatform(entries: RuleEntry[], platform: string): RuleEntry[] {
  return entries.filter(
    (entry) => entry.platform === "common" || entry.platform === platform,
  );
}

function isRuleEntry(value: unknown): value is RuleEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.category === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    typeof obj.severity === "string" &&
    typeof obj.platform === "string"
  );
}
