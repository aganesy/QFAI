import { readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import { escapeTableCell, splitMarkdownRow } from "../../core/specPackParsers.js";
import { readIdMap } from "./idMap.js";
import { parseLegacyRecords, retiredLegacyStatus, withoutLegacyRecords } from "./legacyRecords.js";
import { MigrationInputError, type MigrationOperation, type MigrationStep } from "./harness.js";
import { assertUnchangedPlacements, readMigrationPlan } from "./step04RenumberIds.js";
import {
  legacyPackFiles,
  readLegacyRows,
  readMigrationInput,
  repositoryRelative,
} from "./step05CasesToExamples.js";

type Rule = { id: string; statement: string; examples: string[] };
const RETIRED = ".qfai/evidence/migration-spec-to-story/retired";

function ruleIds(value: string): string[] {
  return [...new Set(value.match(/BR-\d{4}-\d{4}/g) ?? [])];
}

function ruleFromObject(value: unknown): Rule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.statement !== "string" ||
    !Array.isArray(record.examples) ||
    !record.examples.every((example) => typeof example === "string")
  )
    return null;
  return { id: record.id, statement: record.statement, examples: record.examples };
}

function pendingRules(
  current: ReadonlyMap<string, Rule | null>,
  rules: readonly Rule[],
  file: string,
): Rule[] {
  return rules.filter((rule) => {
    if (!current.has(rule.id)) return true;
    const existing = current.get(rule.id);
    if (
      !existing ||
      existing.statement !== rule.statement ||
      existing.examples.length !== rule.examples.length ||
      existing.examples.some((example, index) => example !== rule.examples[index])
    ) {
      throw new MigrationInputError(`Contract ${file} has conflicting rule ${rule.id}`);
    }
    return false;
  });
}

function rememberRule(current: Map<string, Rule | null>, id: string, rule: Rule | null): void {
  current.set(id, current.has(id) ? null : rule);
}

function structuredRules(values: readonly unknown[]): Map<string, Rule | null> {
  const current = new Map<string, Rule | null>();
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const id = (value as Record<string, unknown>).id;
    if (typeof id !== "string") continue;
    rememberRule(current, id, ruleFromObject(value));
  }
  return current;
}

function sqlRules(original: string): Map<string, Rule | null> {
  const current = new Map<string, Rule | null>();
  const headers = [...original.matchAll(/^-- Rule (BR-\d{4})(?::([^\r\n]*)|[ \t]*$)/gm)];
  for (const [index, header] of headers.entries()) {
    const id = header[1] ?? "";
    const block = original.slice(header.index, headers[index + 1]?.index).split(/\r?\n/);
    const examplesIndex = block.findIndex((line) => line.startsWith("-- Examples:"));
    const continuations = block
      .slice(1, examplesIndex)
      .map((line) => (line.startsWith("-- ") ? line.slice(3) : null));
    if (
      header[2] === undefined ||
      examplesIndex < 1 ||
      continuations.some((line) => line === null)
    ) {
      rememberRule(current, id, null);
      continue;
    }
    const statement = [header[2].replace(/^ /, ""), ...(continuations as string[])].join("\n");
    const examples = (block[examplesIndex] ?? "")
      .slice("-- Examples:".length)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    rememberRule(current, id, { id, statement, examples });
  }
  return current;
}

function markdownRules(original: string): Map<string, Rule | null> {
  const current = new Map<string, Rule | null>();
  for (const line of original.split(/\r?\n/)) {
    if (!/^\|\s*BR-\d{4}\s*\|/.test(line)) continue;
    const cells = splitMarkdownRow(line);
    const id = cells[0] ?? "";
    rememberRule(
      current,
      id,
      cells.length === 3
        ? {
            id,
            statement: cells[1] ?? "",
            examples: (cells[2] ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          }
        : null,
    );
  }
  return current;
}

function writeRuleBlock(original: string, file: string, rules: readonly Rule[]): string {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".yaml" || extension === ".yml") {
    const document = parseDocument(original);
    if (document.errors.length > 0)
      throw new MigrationInputError(
        `Cannot parse contract ${file}: ${document.errors[0]?.message}`,
      );
    const parsed: unknown = document.toJS();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new MigrationInputError(`Contract ${file} is not a YAML map`);
    }
    const raw: unknown = (parsed as Record<string, unknown>)["x-qfai-rules"];
    if (raw !== undefined && !Array.isArray(raw)) {
      throw new MigrationInputError(`Contract ${file} has invalid x-qfai-rules`);
    }
    const current: unknown[] = raw === undefined ? [] : (raw as unknown[]);
    const additional = pendingRules(structuredRules(current), rules, file);
    if (additional.length === 0) return original;
    document.set("x-qfai-rules", [...current, ...additional]);
    return String(document);
  }
  if (extension === ".json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(original);
    } catch (error) {
      throw new MigrationInputError(`Cannot parse contract ${file}: ${String(error)}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new MigrationInputError(`Contract ${file} is not a JSON object`);
    const object = parsed as Record<string, unknown>;
    const raw: unknown = object["x-qfai-rules"];
    if (raw !== undefined && !Array.isArray(raw))
      throw new MigrationInputError(`Contract ${file} has invalid x-qfai-rules`);
    const current: unknown[] = raw === undefined ? [] : (raw as unknown[]);
    const additional = pendingRules(structuredRules(current), rules, file);
    if (additional.length === 0) return original;
    object["x-qfai-rules"] = [...current, ...additional];
    return `${JSON.stringify(object, null, 2)}\n`;
  }
  if (extension === ".sql") {
    const additional = pendingRules(sqlRules(original), rules, file);
    return additional.length === 0
      ? original
      : `${original.trimEnd()}\n\n${additional.map((rule) => `-- Rule ${rule.id}: ${rule.statement.split(/\r?\n/).join("\n-- ")}\n-- Examples: ${rule.examples.join(", ")}`).join("\n\n")}\n`;
  }
  if (extension === ".md") {
    const additional = pendingRules(
      markdownRules(original),
      rules.map((rule) => ({
        ...rule,
        statement: rule.statement.replace(/\r\n|\r|\n/g, " "),
      })),
      file,
    );
    if (additional.length === 0) return original;
    const rows = additional.map(
      (rule) =>
        `| ${[rule.id, rule.statement, rule.examples.join(", ")].map(escapeTableCell).join(" | ")} |`,
    );
    const lines = original.split("\n");
    const header = lines.findIndex((line) => /^## Rules\s*$/.test(line));
    if (header < 0)
      return `${original.trimEnd()}\n\n## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n${rows.join("\n")}\n`;
    let table = header + 1;
    while (table < lines.length && !lines[table]?.startsWith("|")) table += 1;
    if (
      table === lines.length ||
      !/^\|\s*BR-ID\s*\|\s*Statement\s*\|\s*Examples\s*\|/.test(lines[table] ?? "")
    ) {
      throw new MigrationInputError(`Contract ${file} has an incompatible Rules table`);
    }
    let end = table + 2;
    while (lines[end]?.startsWith("|")) end += 1;
    lines.splice(end, 0, ...rows);
    return lines.join("\n");
  }
  throw new MigrationInputError(`Unsupported contract format: ${file}`);
}

function applicableNfr(markdown: string): string | null {
  const match = /^## Applicable NFR\b[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(markdown);
  return match?.[1]?.trim() || null;
}

export const step07: MigrationStep = {
  number: 7,
  writeSet: ["qfai", "specs", "contracts"],
  sections: ["For a person"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const plan = await readMigrationPlan(context);
    if (!plan) throw new MigrationInputError("Migration plan is missing before step 7");
    assertUnchangedPlacements(plan, map);
    const placements = new Map(plan.rules.map((entry) => [entry.id, entry.contract]));
    const oldExamples = await readLegacyRows(context, "05_Examples.md");
    const citing = new Map<string, string[]>();
    for (const row of oldExamples) {
      const newExample = map.ids[row.specId]?.[row.cells["EX-ID"] ?? ""];
      if (!newExample) continue;
      for (const oldRule of ruleIds(row.cells["BR-Ref"] ?? "")) {
        const key = `${row.specId}:${oldRule}`;
        citing.set(key, [...new Set([...(citing.get(key) ?? []), newExample])]);
      }
    }
    const sourceFiles = await legacyPackFiles(context, "04_Business-Rules.md", false);
    const forAPerson: string[] = [];
    const groups = new Map<string, Rule[]>();
    const sourceChanges: MigrationOperation[] = [];
    const routedByPack = new Map<string, Set<string>>();
    for (const source of sourceFiles) {
      const original = await readMigrationInput(source);
      if (original === null) continue;
      const specId = path.basename(path.dirname(source));
      const rows = parseLegacyRecords(original, "BR", source);
      const moved = new Set<string>();
      for (const record of rows) {
        const oldId = record.id;
        const contract = placements.get(oldId);
        if (contract && retiredLegacyStatus(record.cells.Status ?? "")) {
          throw new MigrationInputError(
            `${repositoryRelative(context.root, source)}: ${oldId} is retired and cannot be placed`,
          );
        }
        const mapped = map.ids[specId]?.[oldId];
        const examples = citing.get(`${specId}:${oldId}`) ?? [];
        let reason: string | null = null;
        if (retiredLegacyStatus(record.cells.Status ?? ""))
          reason = `retired status ${record.cells.Status}; keep source for disposition`;
        else if (!contract) reason = "no contract placement in plan";
        else if (!mapped) reason = "no ID mapping";
        else if (examples.length === 0) reason = "no mapped example cites the rule";
        const target = contract ? path.join(context.contractsDir, contract) : "";
        if (!reason && (await readMigrationInput(target)) === null)
          reason = `contract ${contract} does not exist`;
        if (reason) {
          forAPerson.push(`${repositoryRelative(context.root, source)}: ${oldId}: ${reason}`);
          continue;
        }
        const rule = { id: mapped ?? "", statement: record.cells.Rule ?? "", examples };
        groups.set(target, [...(groups.get(target) ?? []), rule]);
        moved.add(oldId);
        routedByPack.set(specId, (routedByPack.get(specId) ?? new Set()).add(contract ?? ""));
      }
      if (moved.size > 0) {
        const retired = path.join(context.root, RETIRED, specId, "04_Business-Rules.md");
        const archiveMissing = (await readMigrationInput(retired)) === null;
        const remaining = withoutLegacyRecords(original, rows, moved);
        if (rows.length === moved.size) {
          sourceChanges.push(
            archiveMissing
              ? {
                  kind: "move",
                  source: repositoryRelative(context.root, source),
                  target: repositoryRelative(context.root, retired),
                }
              : {
                  kind: "remove",
                  target: repositoryRelative(context.root, source),
                  description: "archive complete; remove migrated rule source",
                },
          );
        } else {
          if (archiveMissing) {
            sourceChanges.push({
              kind: "write",
              target: repositoryRelative(context.root, retired),
              content: original,
            });
          }
          sourceChanges.push({
            kind: "write",
            target: repositoryRelative(context.root, source),
            content: remaining,
          });
        }
      } else {
        const retired = path.join(context.root, RETIRED, specId, "04_Business-Rules.md");
        const archived = await readMigrationInput(retired);
        if (rows.length === 0) {
          sourceChanges.push(
            archived === null
              ? {
                  kind: "move",
                  source: repositoryRelative(context.root, source),
                  target: repositoryRelative(context.root, retired),
                }
              : {
                  kind: "remove",
                  target: repositoryRelative(context.root, source),
                  description: "archive complete; remove empty rule source",
                },
          );
        } else if (archived === null) {
          sourceChanges.push({
            kind: "write",
            target: repositoryRelative(context.root, retired),
            content: original,
          });
        }
      }
    }
    const operations: MigrationOperation[] = [];
    for (const [target, rules] of groups) {
      const original = await readMigrationInput(target);
      if (original === null) continue;
      const content = writeRuleBlock(original, target, rules);
      if (content !== original)
        operations.push({
          kind: "write",
          target: repositoryRelative(context.root, target),
          content,
        });
    }
    operations.push(...sourceChanges);
    for (const file of await legacyPackFiles(context, "01_Spec.md", false)) {
      const content = await readMigrationInput(file);
      if (content === null) continue;
      const specId = path.basename(path.dirname(file));
      const nfr = applicableNfr(content);
      if (nfr)
        forAPerson.push(
          `${repositoryRelative(context.root, file)}: Applicable NFR: ${nfr}; contracts: ${[...(routedByPack.get(specId) ?? [])].join(", ") || "none"}`,
        );
      const retired = path.join(context.root, RETIRED, specId, "01_Spec.md");
      if ((await readMigrationInput(retired)) === null)
        operations.push({
          kind: "move",
          source: repositoryRelative(context.root, file),
          target: repositoryRelative(context.root, retired),
        });
    }
    const removedSources = new Set(
      operations.flatMap((operation) =>
        operation.kind === "move"
          ? [operation.source]
          : operation.kind === "remove"
            ? [operation.target]
            : [],
      ),
    );
    for (const file of await legacyPackFiles(context, "01_Spec.md", false)) {
      const packDir = path.dirname(file);
      let entries;
      try {
        entries = await readdir(packDir);
      } catch (error: unknown) {
        if (isEnoent(error)) continue;
        throw new MigrationInputError(`Cannot list migration input ${packDir}: ${String(error)}`);
      }
      if (
        entries.length > 0 &&
        entries.every((entry) =>
          removedSources.has(repositoryRelative(context.root, path.join(packDir, entry))),
        )
      ) {
        operations.push({
          kind: "remove-empty-directory",
          target: repositoryRelative(context.root, packDir),
        });
      }
    }
    return { operations, forAPerson };
  },
};
