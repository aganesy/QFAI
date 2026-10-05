import { readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import { escapeTableCell, splitMarkdownRow } from "../../core/specPackParsers.js";
import { oldContractIds, readIdMap, type MigrationIdMap } from "./idMap.js";
import {
  parseLegacyRecords,
  retiredLegacyStatus,
  withoutLegacyRecords,
  type LegacyRecord,
} from "./legacyRecords.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";
import {
  assertUnchangedPlacements,
  goneAfterStep7,
  PACK_FILES,
  readMigrationPlan,
  readOldPack,
  type OldPack,
  type PlannedMark,
} from "./step04RenumberIds.js";
import {
  isDashReference,
  legacyPackFiles,
  readLegacyRows,
  readMigrationInput,
  repositoryRelative,
} from "./step05CasesToExamples.js";

type Rule = { id: string; statement: string; examples: string[] };

/** A statement on one line: each line break, with the indentation around it, is one space. */
function oneLine(value: string): string {
  return value.replace(/[^\S\r\n]*\r?\n\s*/g, " ").trim();
}

function ruleIds(value: string): string[] {
  return [...new Set(value.match(/BR-\d{4}-\d{4}/g) ?? [])];
}

/** A statement with each old ID it names replaced through the ID map. */
function rewriteStatement(
  statement: string,
  map: MigrationIdMap,
  contractIds: Readonly<Record<string, string>>,
): { text: string; unmapped: string[] } {
  const unmapped: string[] = [];
  const text = statement.replace(
    /\b(?:(?:US|AC|EX|BR|TC)-(\d{4})-\d{4}|CON-(?:API|DB|UI)-\d+)\b(?!-\d)/g,
    (token: string, pack: string | undefined) => {
      const next = pack === undefined ? contractIds[token] : map.ids[`spec-${pack}`]?.[token];
      if (next === undefined) unmapped.push(token);
      return next ?? token;
    },
  );
  return { text, unmapped: [...new Set(unmapped)] };
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
  const headers = [...original.matchAll(/^-- Rule (BR-\d{4}-\d{4})(?::([^\r\n]*)|[ \t]*$)/gm)];
  for (const [index, header] of headers.entries()) {
    const id = header[1] ?? "";
    const block = original.slice(header.index, headers[index + 1]?.index).split(/\r?\n/);
    const examplesIndex = block.findIndex((line) => line.startsWith("-- Examples:"));
    const continuations = block
      .slice(1, examplesIndex)
      .map((line) => (line.startsWith("-- ") ? line.slice(3) : null));
    const lines = continuations.filter((line): line is string => line !== null);
    if (header[2] === undefined || examplesIndex < 1 || lines.length !== continuations.length) {
      rememberRule(current, id, null);
      continue;
    }
    const statement = oneLine([header[2], ...lines].join("\n"));
    const examples = (block[examplesIndex] ?? "")
      .slice("-- Examples:".length)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    rememberRule(current, id, { id, statement, examples });
  }
  return current;
}

/**
 * An SQL rule an earlier step 7 wrote over several comment lines, for each of `ids`, written
 * as the one-line block `qfai validate` reads: `-- Rule` and, on the next line, `-- Examples:`.
 */
function repairMultiLineSqlRules(original: string, ids: ReadonlySet<string>): string {
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const headers = [...original.matchAll(/^-- Rule (BR-\d{4}-\d{4}):([^\r\n]*)/gm)];
  let repaired = original;
  for (const [index, header] of [...headers.entries()].reverse()) {
    const id = header[1] ?? "";
    if (!ids.has(id)) continue;
    const end = headers[index + 1]?.index ?? original.length;
    const block = original.slice(header.index, end).split(/\r?\n/);
    const examplesIndex = block.findIndex((line) => line.startsWith("-- Examples:"));
    const continuations = block.slice(1, examplesIndex);
    if (examplesIndex < 2 || !continuations.every((line) => line.startsWith("-- "))) continue;
    const statement = oneLine(
      [header[2] ?? "", ...continuations.map((line) => line.slice(3))].join("\n"),
    );
    const lines = [`-- Rule ${id}: ${statement}`, ...block.slice(examplesIndex)];
    repaired = `${repaired.slice(0, header.index)}${lines.join(newline)}${repaired.slice(
      header.index + original.slice(header.index, end).length,
    )}`;
  }
  return repaired;
}

function markdownRules(original: string): Map<string, Rule | null> {
  const current = new Map<string, Rule | null>();
  for (const line of original.split(/\r?\n/)) {
    if (!/^\|\s*BR-\d{4}-\d{4}\s*\|/.test(line)) continue;
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
    if (additional.length === 0) {
      // An earlier step 7 folded a long dependency list over several lines, which
      // `QFAI-CONTRACT-015` does not read: written again, it stays on one line.
      const folded = /^x-qfai-depends-on:\s*\[[^\]]*\n[^\]]*\]/m.test(original);
      const dependsOn = (parsed as Record<string, unknown>)["x-qfai-depends-on"];
      if (!folded || !Array.isArray(dependsOn)) return original;
      const flat = document.createNode(dependsOn);
      flat.flow = true;
      document.set("x-qfai-depends-on", flat);
      return document.toString({ lineWidth: 0 });
    }
    document.set("x-qfai-rules", [...current, ...additional]);
    return document.toString({ lineWidth: 0 });
  }
  if (extension === ".json") {
    // The contract declares its ID on a comment line above the JSON document.
    const [first = "", ...rest] = original.split("\n");
    const declaration = /QFAI-CONTRACT-ID:/.test(first) ? `${first}\n` : "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(declaration ? rest.join("\n") : original);
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
    return `${declaration}${JSON.stringify(object, null, 2)}\n`;
  }
  if (extension === ".sql") {
    const repaired = repairMultiLineSqlRules(original, new Set(rules.map((rule) => rule.id)));
    const additional = pendingRules(
      sqlRules(repaired),
      rules.map((rule) => ({ ...rule, statement: oneLine(rule.statement) })),
      file,
    );
    return additional.length === 0
      ? repaired
      : `${repaired.trimEnd()}\n\n${additional.map((rule) => `-- Rule ${rule.id}: ${rule.statement}\n-- Examples: ${rule.examples.join(", ")}`).join("\n\n")}\n`;
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
    const header = lines.findIndex((line) => /^## Business rules\s*$/.test(line));
    if (header < 0)
      return `${original.trimEnd()}\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n${rows.join("\n")}\n`;
    let table = header + 1;
    while (table < lines.length && !lines[table]?.startsWith("|")) table += 1;
    if (
      table === lines.length ||
      !/^\|\s*BR-ID\s*\|\s*Statement\s*\|\s*Examples\s*\|/.test(lines[table] ?? "")
    ) {
      throw new MigrationInputError(`Contract ${file} has an incompatible Business rules table`);
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

/**
 * Refuses `binds: none` on a rule that carries a retired status, and on one that binds a contract.
 * A `retire` mark is how a rule with a retired status is disposed of.
 */
function assertMarkable(source: string, record: LegacyRecord, mark: PlannedMark): void {
  if (mark.retire === null && retiredLegacyStatus(record.cells.Status ?? "")) {
    throw new MigrationInputError(`${source}: ${record.id} is retired and cannot be marked`);
  }
  if (mark.retire === null && !isDashReference(record.cells["Contract-Refs"] ?? "")) {
    throw new MigrationInputError(
      `${source}: ${record.id} binds none, but its Contract-Refs is not "-"`,
    );
  }
}

/** The report line for a rule the plan removes from its source without placing it in a contract. */
function markNote(oldId: string, mark: PlannedMark): string {
  return mark.retire === null
    ? `${oldId}: removed from its rule source; it binds no contract`
    : `${oldId}: removed from its rule source; retired: ${mark.retire}`;
}

type SourceFile = {
  sourcePath: string;
  current: string;
  rows: readonly LegacyRecord[];
  moved: ReadonlySet<string>;
  /** One line for each marked rule this run removes from the file. */
  notes: readonly string[];
};

/** What happens to a pack's rule file: the removal of the rules moved out of it, or of the file. */
function sourceFileChanges(file: SourceFile): MigrationOperation[] {
  const { sourcePath, current, rows, moved, notes } = file;
  if (rows.length === moved.size) {
    const description = rows.length === 0 ? "delete: it holds no rule" : "delete: every rule moved";
    return [
      { kind: "remove", target: sourcePath, description: [description, ...notes].join("; ") },
    ];
  }
  const remaining = moved.size === 0 ? current : withoutLegacyRecords(current, rows, moved);
  return current === remaining
    ? []
    : [{ kind: "write", target: sourcePath, content: remaining, notes }];
}

/** Whether every story, criterion, example and test case of a pack has a new ID. */
function packPlaced(pack: OldPack, map: MigrationIdMap): boolean {
  if (pack.retired) return true;
  const ids = map.ids[pack.id] ?? {};
  return [...pack.stories, ...pack.criteria, ...pack.examples, ...pack.cases].every(
    (item) => ids[item.id] !== undefined,
  );
}

export const step07: MigrationStep = {
  number: 7,
  writeSet: ["qfai", "specs", "contracts"],
  sections: ["For a person"],
  async plan(context) {
    const map = await readIdMap(context.root);
    if (!map) return { operations: [] };
    const sourceFiles = await legacyPackFiles(context, "04_Business-Rules.md");
    // With no spec pack left there is nothing to move, so no plan is read.
    if (sourceFiles.length === 0) return { operations: [] };
    const plan = await readMigrationPlan(context);
    if (!plan) throw new MigrationInputError("plan.yaml is missing before step 7");
    assertUnchangedPlacements(plan, map);
    const marks = new Map(plan.marks.map((mark) => [mark.id, mark]));
    // The plan names a contract by its path before step 3 renamed it.
    const placements = new Map(
      plan.rules.map((entry) => [
        entry.id,
        map.contracts?.[entry.contract]?.path ?? entry.contract,
      ]),
    );
    const contractIds = oldContractIds(map.contracts);
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
    const forAPerson: string[] = [];
    const groups = new Map<string, Rule[]>();
    const sourceChanges: MigrationOperation[] = [];
    const routedByPack = new Map<string, Set<string>>();
    const removedRuleFiles = new Set<string>();
    const seenRules = new Set<string>();
    for (const source of sourceFiles) {
      const current = await readMigrationInput(source);
      if (current === null) {
        removedRuleFiles.add(source);
        continue;
      }
      const specId = path.basename(path.dirname(source));
      const rows = parseLegacyRecords(current, "BR", source);
      for (const row of rows) seenRules.add(row.id);
      const moved = new Set<string>();
      const notes: string[] = [];
      for (const record of rows) {
        const oldId = record.id;
        const mark = marks.get(oldId);
        if (mark) {
          assertMarkable(repositoryRelative(context.root, source), record, mark);
          notes.push(markNote(oldId, mark));
          moved.add(oldId);
          continue;
        }
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
        const statement = rewriteStatement(record.cells.Rule ?? "", map, contractIds);
        for (const token of statement.unmapped)
          forAPerson.push(
            `${repositoryRelative(context.root, source)}: ${oldId}: its statement names ${token}, which has no new ID`,
          );
        if (/^cli\/.*\.md$/i.test(contract ?? ""))
          for (const token of ruleIds(statement.text))
            forAPerson.push(
              `${repositoryRelative(context.root, target)}: ${mapped}: its statement names ${token}; a statement in a CLI contract names no rule, so rewrite it by hand`,
            );
        const rule = { id: mapped ?? "", statement: statement.text, examples };
        groups.set(target, [...(groups.get(target) ?? []), rule]);
        moved.add(oldId);
        routedByPack.set(specId, (routedByPack.get(specId) ?? new Set()).add(contract ?? ""));
      }
      const sourcePath = repositoryRelative(context.root, source);
      const changes = sourceFileChanges({ sourcePath, current, rows, moved, notes });
      if (changes.some((change) => change.kind === "remove")) removedRuleFiles.add(source);
      sourceChanges.push(...changes);
    }
    const unmatched = plan.marks.find((mark) => !seenRules.has(mark.id));
    if (unmatched) throw goneAfterStep7(unmatched.id, "rule");
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
    // Step 4 reads the old flow while a pack it places from is left; a retired pack places none.
    let activePacksLeft = 0;
    for (const file of await legacyPackFiles(context, "01_Spec.md")) {
      const content = await readMigrationInput(file);
      if (content === null) continue;
      const specId = path.basename(path.dirname(file));
      const nfr = applicableNfr(content);
      if (nfr)
        forAPerson.push(
          `${repositoryRelative(context.root, file)}: Applicable NFR: ${nfr}; contracts: ${[...(routedByPack.get(specId) ?? [])].join(", ") || "none"}`,
        );
      const packDir = path.dirname(file);
      const rulesGone = removedRuleFiles.has(path.join(packDir, "04_Business-Rules.md"));
      const pack = await readOldPack(context, specId, true);
      if (!rulesGone || !packPlaced(pack, map)) {
        if (!pack.retired) activePacksLeft += 1;
        continue;
      }
      // Every part of the pack has a destination, so the pack goes whole. A file no
      // step reads keeps all of it, so the pack is never left half deleted.
      const others = (await listEntries(packDir)).filter(
        (entry) => !(PACK_FILES as readonly string[]).includes(entry),
      );
      if (others.length > 0) {
        forAPerson.push(
          `${repositoryRelative(context.root, packDir)}: every part of the pack is placed, but it also holds ${others.join(", ")}, which no step reads; move or delete that, then run step 7 again to delete the pack`,
        );
        if (!pack.retired) activePacksLeft += 1;
        continue;
      }
      for (const name of PACK_FILES.filter((name) => name !== "04_Business-Rules.md")) {
        operations.push({
          kind: "remove",
          target: repositoryRelative(context.root, path.join(packDir, name)),
          description: "delete: every part has moved",
        });
      }
      operations.push({
        kind: "remove-empty-directory",
        target: repositoryRelative(context.root, packDir),
      });
    }
    if (activePacksLeft === 0) operations.push(...(await policyRemainder(context)));
    return { operations, forAPerson };
  },
};

async function listEntries(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw new MigrationInputError(`Cannot list migration input ${dir}: ${String(error)}`);
  }
}

/**
 * The old business flow step 4 reads while a pack it places from is left, and
 * `_policies/` once nothing else is in it.
 */
async function policyRemainder(context: MigrationContext): Promise<MigrationOperation[]> {
  const policies = path.join(context.specsDir, "_policies");
  const entries = await listEntries(policies);
  if (!entries.includes("04_Business-Flow.md")) return [];
  const operations: MigrationOperation[] = [
    {
      kind: "remove",
      target: repositoryRelative(context.root, path.join(policies, "04_Business-Flow.md")),
      description: "delete: every flow has moved",
    },
  ];
  if (entries.length === 1) {
    operations.push({
      kind: "remove-empty-directory",
      target: repositoryRelative(context.root, policies),
    });
  }
  return operations;
}
