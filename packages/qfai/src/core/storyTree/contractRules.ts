import path from "node:path";

import { parse as parseYaml } from "yaml";

import { extractH2Sections } from "../parse/markdown.js";
import { parseAllMarkdownTables } from "../specPackParsers.js";

export type ContractRule = {
  id: string;
  statement: string;
  examples: string[];
  file: string;
};

export type ContractRuleScan = { rules: ContractRule[]; refs: string[]; errors: string[] };

const SQL_RULE = /^-- Rule (BR-[A-Za-z0-9_-]+):\s*(.*)$/;
const SQL_EXAMPLES = /^-- Examples:\s*(.*)$/;
const SQL_REFS = /^-- Rule refs:\s*(.*)$/;
const MARKDOWN_REFS = /^Rule refs:\s*(.*)$/m;

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
  const refs: string[] = [];
  const errors: string[] = [];
  const extension = path.extname(file).toLowerCase();

  if (extension === ".yaml" || extension === ".yml" || extension === ".json") {
    let parsed: unknown;
    try {
      parsed = parseYaml(text);
    } catch {
      return { rules, refs, errors: [`Invalid structured contract: ${file}`] };
    }
    if (!isRecord(parsed)) return { rules, refs, errors };
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
    if ("x-qfai-rule-refs" in parsed && !Array.isArray(parsed["x-qfai-rule-refs"])) {
      errors.push(`Invalid x-qfai-rule-refs list in ${file}`);
    }
    refs.push(...stringList(parsed["x-qfai-rule-refs"]));
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
      const ref = SQL_REFS.exec(line);
      if (ref) refs.push(...splitRefs(ref[1] ?? ""));
    }
  } else if (extension === ".md") {
    const section = extractH2Sections(text).get("Rules");
    if (section) {
      const table = parseAllMarkdownTables(section.body)[0];
      if (!table) errors.push(`Missing Rules table in ${file}`);
      if (table) {
        const columns = ["BR-ID", "Statement", "Examples"].map((name) =>
          table.headers.indexOf(name),
        );
        const [idColumn, statementColumn, examplesColumn] = columns;
        if (
          table.headers.length === columns.length &&
          idColumn !== undefined &&
          statementColumn !== undefined &&
          examplesColumn !== undefined &&
          columns.every((column) => column >= 0)
        ) {
          for (const row of table.rows) {
            rules.push({
              id: row[idColumn] ?? "",
              statement: row[statementColumn] ?? "",
              examples: splitRefs(row[examplesColumn] ?? ""),
              file,
            });
          }
        } else {
          errors.push(`Invalid Rules columns in ${file}`);
        }
      }
      const ref = MARKDOWN_REFS.exec(section.body);
      if (ref) refs.push(...splitRefs(ref[1] ?? ""));
    }
  }

  return { rules, refs: [...new Set(refs)].sort(), errors };
}
