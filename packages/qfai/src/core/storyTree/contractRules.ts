import path from "node:path";

import { parse as parseYaml } from "yaml";

import { extractH2Sections, parseHeadings } from "../parse/markdown.js";
import { maskNonSpecRegions, parseAllMarkdownTables } from "../specPackParsers.js";

export type ContractRule = {
  id: string;
  statement: string;
  examples: string[];
  file: string;
};

export type ContractRuleScan = { rules: ContractRule[]; errors: string[] };

const SQL_RULE = /^-- Rule (BR-[A-Za-z0-9_-]+):\s*(.*)$/;
const SQL_EXAMPLES = /^-- Examples:\s*(.*)$/;
const BUSINESS_RULES = "Business rules";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function splitRefs(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function parseContractRules(file: string, text: string): ContractRuleScan {
  const rules: ContractRule[] = [];
  const errors: string[] = [];
  const extension = path.extname(file).toLowerCase();

  if (extension === ".yaml" || extension === ".yml" || extension === ".json") {
    let parsed: unknown;
    try {
      parsed = parseYaml(text);
    } catch {
      return { rules, errors: [`Invalid structured contract: ${file}`] };
    }
    if (!isRecord(parsed)) return { rules, errors };
    if ("x-qfai-rules" in parsed && !Array.isArray(parsed["x-qfai-rules"])) {
      errors.push(`Invalid x-qfai-rules list in ${file}`);
    }
    for (const raw of Array.isArray(parsed["x-qfai-rules"]) ? parsed["x-qfai-rules"] : []) {
      if (!isRecord(raw)) {
        errors.push(`Invalid rule entry in ${file}`);
        continue;
      }
      rules.push({
        id: typeof raw.id === "string" ? raw.id : "",
        statement: typeof raw.statement === "string" ? raw.statement : "",
        examples: stringList(raw.examples),
        file,
      });
      if (
        typeof raw.id !== "string" ||
        typeof raw.statement !== "string" ||
        !Array.isArray(raw.examples) ||
        raw.examples.some((item) => typeof item !== "string")
      ) {
        errors.push(`Invalid rule fields in ${file}`);
      }
    }
  } else if (extension === ".sql") {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const rule = SQL_RULE.exec(line);
      if (rule) {
        const examples = SQL_EXAMPLES.exec(lines[index + 1] ?? "");
        rules.push({
          id: rule[1] ?? "",
          statement: rule[2] ?? "",
          examples: examples ? splitRefs(examples[1] ?? "") : [],
          file,
        });
        if (examples) index += 1;
      }
    }
  } else if (extension === ".md") {
    const rendered = maskNonSpecRegions(text);
    const sections = extractH2Sections(rendered);
    const businessRulesSections = parseHeadings(rendered).filter(
      (heading) => heading.level === 2 && heading.title === BUSINESS_RULES,
    ).length;
    if (businessRulesSections > 1) {
      errors.push(`More than one ## ${BUSINESS_RULES} section in ${file}`);
    }
    const body = sections.get(BUSINESS_RULES)?.body;
    if (body !== undefined) readMarkdownRules(file, body, rules, errors);
  }

  return { rules, errors };
}

/**
 * Reads the `## Business rules` table, whose columns are exactly BR-ID, Statement
 * and Examples. A table inside a code block or an HTML comment is not the rules
 * table, and the section holds exactly one.
 */
function readMarkdownRules(
  file: string,
  body: string,
  rules: ContractRule[],
  errors: string[],
): void {
  const tables = parseAllMarkdownTables(maskNonSpecRegions(body));
  const table = tables[0];
  if (!table) {
    errors.push(`Missing ${BUSINESS_RULES} table in ${file}`);
    return;
  }
  if (tables.length > 1) {
    errors.push(`More than one ${BUSINESS_RULES} table in ${file}`);
    return;
  }
  const [idColumn, statementColumn, examplesColumn] = ["BR-ID", "Statement", "Examples"].map(
    (name) => table.headers.indexOf(name),
  );
  if (
    table.headers.length !== 3 ||
    idColumn === undefined ||
    statementColumn === undefined ||
    examplesColumn === undefined ||
    idColumn < 0 ||
    statementColumn < 0 ||
    examplesColumn < 0
  ) {
    errors.push(`Invalid ${BUSINESS_RULES} columns in ${file}`);
    return;
  }
  for (const row of table.rows) {
    rules.push({
      id: row[idColumn] ?? "",
      statement: row[statementColumn] ?? "",
      examples: splitRefs(row[examplesColumn] ?? ""),
      file,
    });
  }
}
