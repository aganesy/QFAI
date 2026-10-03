import { isDeepStrictEqual } from "node:util";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument, parse as parseYaml, type Document } from "yaml";

import { routingEntryName } from "../../core/config.js";
import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { readRoutingDefaultsFiles } from "../../core/routingDefaults.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import { OLD_CONTRACT_TOKEN, planContracts, type ContractPlan } from "./contractIds.js";
import { renderContractIndex } from "./contractIndex.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";
import { oldContractIds, readIdMap, type ContractMap } from "./idMap.js";
import {
  isPolicyDocument,
  movePolicySection,
  newPolicyDraft,
  renderPolicyDocument,
  renumberConstraints,
  type PolicyDraft,
} from "./policyDocuments.js";
import { readLegacyRows } from "./step05CasesToExamples.js";
import { addTechCommands, moveTechSection, renderTechDocument } from "./techDocument.js";
import { entrypointCommands, routeStructureCatalog } from "./structureCatalog.js";

const POLICY_SOURCES = [
  ["01_Objective.md", "objective.md"],
  ["02_Initiative.md", "initiative.md"],
  ["05_Contracts.md", "contracts.md"],
  ["06_Glossary.md", "glossary.md"],
  ["07_Constraints.md", "constraint.md"],
] as const;

const ASSISTANT_DIRS = ["constitution", "catalog", "manifest", "process"] as const;
const CATALOG_FILES = ["product.md", "manifest.md", "tech.md", "structure.md"] as const;
function relative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

function isMissing(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

async function readInput(target: string): Promise<string> {
  try {
    const stats = await lstat(target);
    if (!stats.isFile()) throw new Error("expected a regular file");
    return new TextDecoder("utf-8", { fatal: true }).decode(await readFile(target));
  } catch (error) {
    throw new MigrationInputError(`Cannot read migration input ${target}: ${String(error)}`);
  }
}

function titleFor(target: string): string {
  switch (path.posix.basename(target)) {
    case "objective.md":
      return "Objective";
    case "initiative.md":
      return "Initiative";
    case "principle.md":
      return "Principles";
    case "glossary.md":
      return "Glossary";
    case "constraint.md":
      return "Constraints";
    default:
      throw new Error(`Unknown catalog destination: ${target}`);
  }
}

async function readDestination(context: MigrationContext, target: string): Promise<string> {
  const absolute = path.join(context.root, target);
  return (await exists(absolute)) ? readInput(absolute) : `# ${titleFor(target)}\n`;
}

function paragraphs(body: string): string[] {
  return body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function addDistinctParagraphs(existing: string, incoming: string): string {
  const seen = new Set(paragraphs(existing));
  const fresh = paragraphs(incoming).filter((paragraph) => {
    if (seen.has(paragraph)) return false;
    seen.add(paragraph);
    return true;
  });
  return fresh.length === 0 ? existing : `${existing.trimEnd()}\n\n${fresh.join("\n\n")}\n`;
}

function appendSection(existing: string, heading: string, body: string): string {
  const sections = extractH2Sections(existing);
  const known = new Set(paragraphs(existing));
  const freshBody = paragraphs(body)
    .filter((paragraph) => !known.has(paragraph))
    .join("\n\n");
  if (!sections.has(heading)) {
    return `${existing.trimEnd()}\n\n## ${heading}\n\n${freshBody}\n`;
  }
  const current = sections.get(heading);
  if (!current) return existing;
  const before = existing.split(/\r?\n/);
  const mergedBody = addDistinctParagraphs(current.body, freshBody);
  if (mergedBody.trim() === current.body.trim()) return existing;
  before.splice(
    current.startLine - 1,
    current.endLine - current.startLine + 1,
    mergedBody.trimEnd(),
  );
  return `${before.join("\n").trimEnd()}\n`;
}

function sectionParts(markdown: string): {
  preamble: string;
  sections: { heading: string; body: string }[];
} {
  const lines = markdown.split(/\r?\n/);
  const headings = parseHeadings(markdown).filter((item) => item.level === 2);
  const firstH1 = parseHeadings(markdown).find((item) => item.level === 1);
  const start = firstH1 ? firstH1.line : 0;
  const preamble = lines
    .slice(start, (headings[0]?.line ?? lines.length + 1) - 1)
    .join("\n")
    .trim();
  const sections = headings.map((item, index) => ({
    heading: item.title,
    body: lines.slice(item.line, (headings[index + 1]?.line ?? lines.length + 1) - 1).join("\n"),
  }));
  return { preamble, sections };
}

function route(source: string, heading: string, context: MigrationContext): string {
  const policy = (name: string) =>
    relative(context.root, path.join(context.specsDir, "01_policy", name));
  const contract = (name: string) => relative(context.root, path.join(context.contractsDir, name));
  if (source.endsWith("/product.md"))
    return policy(/^Milestones$/i.test(heading) ? "initiative.md" : "objective.md");
  if (source.endsWith("/manifest.md")) return policy("principle.md");
  if (source.endsWith("/tech.md"))
    return /^Constraints$/i.test(heading) ? policy("constraint.md") : contract("tech.md");
  const policyName = path.posix.basename(source);
  const mapped = POLICY_SOURCES.find(([name]) => name === policyName)?.[1];
  if (!mapped) throw new Error(`No destination for ${source}`);
  return mapped === "contracts.md" ? contract(mapped) : policy(mapped);
}

function parseYamlInput(content: string, file: string): unknown {
  try {
    return parseYaml(content);
  } catch (error) {
    throw new MigrationInputError(`Cannot parse migration input ${file}: ${String(error)}`);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new MigrationInputError(`${label} must be a mapping.`);
  }
  return value as Record<string, unknown>;
}

async function defaultsFile(name: string): Promise<string> {
  const absolute = path.resolve(getInitAssetsDir(), "..", "defaults", name);
  return readInput(absolute);
}

/** The package's routing defaults, every file's `routing:` list joined in reading order. */
async function defaultRoutingEntries(): Promise<unknown[]> {
  const entries: unknown[] = [];
  for (const file of await readRoutingDefaultsFiles()) {
    const routing: unknown = asRecord(parseYamlInput(file.text, file.rel), file.rel).routing;
    if (!Array.isArray(routing)) throw new MigrationInputError("Routing must be a list.");
    const list: unknown[] = routing;
    entries.push(...list);
  }
  return entries;
}

type PrimaryReplacement = { notes: string[]; forAPerson: string[] };

/**
 * The UI contracts a spec pack is tied to: the new IDs the `CON-UI-*` IDs in its
 * rules' `Contract-Refs` translate to.
 */
async function tiedUiContracts(
  context: MigrationContext,
  contractMap: ContractMap,
  specId: string,
): Promise<string[]> {
  const translated = oldContractIds(contractMap);
  const rows = (await readLegacyRows(context, "04_Business-Rules.md")).filter(
    (row) => row.specId === specId,
  );
  const tied = new Set<string>();
  for (const row of rows) {
    const refs = Object.entries(row.cells).find(([name]) => /^contract-refs$/i.test(name))?.[1];
    for (const token of refs?.match(OLD_CONTRACT_TOKEN) ?? []) {
      const id = translated[token];
      if (id?.startsWith("UI-")) tied.add(id);
    }
  }
  if (rows.length === 0) {
    // Step 7 deleted the pack's rules; the ID map records the contract each was placed in.
    const map = await readIdMap(context.root);
    for (const [oldId, contract] of Object.entries(map?.placements[specId] ?? {})) {
      if (!oldId.startsWith("BR-")) continue;
      const id = contractMap[contract]?.id ?? map?.contracts?.[contract]?.id;
      if (id?.startsWith("UI-")) tied.add(id);
    }
  }
  return [...tied].sort();
}

/**
 * Replaces `prototyping.primarySpecId` in the configuration by
 * `prototyping.primaryUiContract` where exactly one UI contract is tied to that
 * spec. Where the new key is already set, the old key is removed. In every
 * other case the key stays and a person decides.
 */
async function replacePrimarySpec(
  config: Document,
  context: MigrationContext,
  contractMap: ContractMap,
): Promise<PrimaryReplacement> {
  const key = ["prototyping", "primarySpecId"];
  const replacement: PrimaryReplacement = { notes: [], forAPerson: [] };
  if (!config.hasIn(key)) return replacement;
  const specId = String(config.getIn(key));
  const name = "qfai.config.yaml";
  if (config.hasIn(["prototyping", "primaryUiContract"])) {
    config.deleteIn(key);
    replacement.notes.push(
      `${name}: prototyping.primarySpecId removed; prototyping.primaryUiContract is already set`,
    );
    return replacement;
  }
  const tied = await tiedUiContracts(context, contractMap, specId);
  const [only] = tied;
  if (tied.length === 1 && only !== undefined) {
    config.deleteIn(key);
    config.setIn(["prototyping", "primaryUiContract"], only);
    replacement.notes.push(
      `${name}: prototyping.primarySpecId ${specId} replaced by prototyping.primaryUiContract ${only}`,
    );
    return replacement;
  }
  replacement.forAPerson.push(
    `${name}: prototyping.primarySpecId is ${specId}, ${
      tied.length === 0
        ? "which no UI contract is tied to"
        : `which ${tied.length} UI contracts are tied to (${tied.join(", ")})`
    }; set prototyping.primaryUiContract to the UI contract ID and remove prototyping.primarySpecId`,
  );
  return replacement;
}

/**
 * The entries of a project's routing manifest that differ from the installed
 * default of the same name. Each is kept as a configuration override and listed
 * for a person, because an entry copied from a 1.x manifest hides the roles the
 * 2.x skills declare.
 */
async function planRoutingOverrides(
  routing: unknown[],
): Promise<{ overrides: unknown[]; forAPerson: string[] }> {
  const defaultByName = new Map(
    (await defaultRoutingEntries()).map((entry) => {
      const name = routingEntryName(asRecord(entry, "default routing entry"));
      if (name === undefined)
        throw new MigrationInputError("Default routing entry needs a step or a skill.");
      return [name, entry] as const;
    }),
  );
  const overrides: unknown[] = [];
  const forAPerson: string[] = [];
  for (const entry of routing) {
    const name = routingEntryName(asRecord(entry, "project routing entry"));
    if (name === undefined)
      throw new MigrationInputError("Project routing entry needs a step or a skill.");
    if (isDeepStrictEqual(entry, defaultByName.get(name))) continue;
    overrides.push(entry);
    forAPerson.push(
      defaultByName.has(name)
        ? `qfai.config.yaml routing ${name}: an entry copied from a 1.x routing manifest hides the roles the 2.x skills declare; delete it from routing to use the installed one, or keep it to override.`
        : `qfai.config.yaml routing ${name}: an entry copied from a 1.x routing manifest hides the roles the 2.x skills declare; no installed entry has this name, so it is kept as written and deleting it removes the route.`,
    );
  }
  return { overrides, forAPerson };
}

async function planOverrides(
  context: MigrationContext,
  contractMap: ContractMap,
  surfacePaths: string[] | undefined,
): Promise<{ operation: MigrationOperation | null; forAPerson: string[] }> {
  const root = context.root;
  const routingPath = path.join(root, ".qfai/assistant/manifest/agent-routing.yml");
  const reviewPath = path.join(root, ".qfai/assistant/manifest/review-profiles.yml");
  const forAPerson: string[] = [];
  const hasRouting = await exists(routingPath);
  const hasReview = await exists(reviewPath);
  const configPath = path.join(root, "qfai.config.yaml");
  if (!hasRouting && !hasReview && surfacePaths === undefined && !(await exists(configPath)))
    return { operation: null, forAPerson: [] };
  const config = parseDocument(await readInput(configPath), { keepSourceTokens: true });
  if (config.errors.length > 0)
    throw new MigrationInputError(`Cannot parse ${configPath}: ${config.errors[0]?.message}`);
  // A 1.x configuration has no `uiux.surfacePaths`, so a value already there was set
  // by the project on purpose and is kept.
  const primary = await replacePrimarySpec(config, context, contractMap);
  let changed = primary.notes.length > 0;
  if (surfacePaths !== undefined && !config.hasIn(["uiux", "surfacePaths"])) changed = true;
  if (surfacePaths !== undefined && !config.hasIn(["uiux", "surfacePaths"]))
    config.setIn(["uiux", "surfacePaths"], surfacePaths);
  if (hasRouting) {
    const project = asRecord(
      parseYamlInput(await readInput(routingPath), routingPath),
      routingPath,
    );
    if (!Array.isArray(project.routing)) throw new MigrationInputError("Routing must be a list.");
    const planned = await planRoutingOverrides(project.routing);
    if (planned.overrides.length > 0) {
      config.set("routing", planned.overrides);
      changed = true;
    }
    forAPerson.push(...planned.forAPerson);
  }
  if (hasReview) {
    const project = asRecord(parseYamlInput(await readInput(reviewPath), reviewPath), reviewPath);
    const defaults = asRecord(
      parseYamlInput(await defaultsFile("review-profiles.yml"), "default review-profiles.yml"),
      "default review-profiles.yml",
    );
    const projectProfiles = asRecord(project.profiles, "project profiles");
    const defaultProfiles = asRecord(defaults.profiles, "default profiles");
    const overrides = Object.fromEntries(
      Object.entries(projectProfiles).filter(
        ([name, value]) => !isDeepStrictEqual(value, defaultProfiles[name]),
      ),
    );
    if (Object.keys(overrides).length > 0) {
      config.set("reviewProfiles", overrides);
      changed = true;
    }
  }
  return {
    operation: changed
      ? { kind: "write", target: "qfai.config.yaml", content: String(config), notes: primary.notes }
      : null,
    forAPerson: [...primary.forAPerson, ...forAPerson],
  };
}

/**
 * Overlays of one name under both `constitution/` and `catalog/` whose master is
 * under `rule/` and whose place beside it is free. Either could take that place,
 * so a person chooses before step 3 writes anything.
 */
async function contestedOverlays(root: string): Promise<string[]> {
  const names = async (directory: string): Promise<Set<string>> => {
    const absolute = path.join(root, ".qfai/assistant", directory);
    if (!(await exists(absolute))) return new Set();
    const entries = await readdir(absolute, { withFileTypes: true });
    return new Set(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".local.md"))
        .map((entry) => entry.name),
    );
  };
  const catalog = await names("catalog");
  const contested: string[] = [];
  for (const name of [...(await names("constitution"))].sort()) {
    if (!catalog.has(name)) continue;
    const rule = path.join(root, ".qfai/assistant/rule");
    if (!(await exists(path.join(rule, name.replace(/\.local\.md$/, ".md"))))) continue;
    if (await exists(path.join(rule, name))) continue;
    for (const directory of ["constitution", "catalog"]) {
      contested.push(
        `.qfai/assistant/${directory}/${name}: another overlay of this name would take .qfai/assistant/rule/${name}; keep one and run step 3 again.`,
      );
    }
  }
  return contested;
}

/** The item for a destination step 3 leaves as it is because it exists and differs. */
function notWritten(target: string): string {
  return `${target}: the file already exists, so step 3 did not write it; carry what its sources state by hand`;
}

/**
 * Puts the new `contracts.md` among the documents step 3 writes, and returns what
 * a person carries by hand. An existing file that differs is left as it is and
 * added to `refused`.
 */
async function writeContractIndex(
  context: MigrationContext,
  old: { source: string; content: string; target: string },
  contracts: ContractPlan,
  documents: Map<string, string>,
  refused: Set<string>,
): Promise<string[]> {
  const index = renderContractIndex({
    source: old.content,
    sourcePath: old.source,
    target: old.target,
    contractsDir: relative(context.root, context.contractsDir),
    contracts: contracts.contracts,
    oldIds: oldContractIds(contracts.map),
  });
  const absolute = path.join(context.root, old.target);
  if (!(await exists(absolute))) documents.set(old.target, index.content);
  else if ((await readInput(absolute)) !== index.content) {
    refused.add(old.target);
    index.forAPerson.push(notWritten(old.target));
  }
  return index.forAPerson;
}

/** Routes an old `catalog/structure.md`, reading the entrypoint commands its `tech.md` gives. */
async function routeStructure(
  context: MigrationContext,
  parts: {
    source: string;
    preamble: string;
    sections: { heading: string; body: string }[];
  },
  draftFor: (target: string) => PolicyDraft,
): Promise<ReturnType<typeof routeStructureCatalog>> {
  const techSource = path.join(context.root, ".qfai/assistant/catalog/tech.md");
  const techTarget = relative(context.root, path.join(context.contractsDir, "tech.md"));
  return routeStructureCatalog({
    ...parts,
    commands: entrypointCommands((await exists(techSource)) ? await readInput(techSource) : ""),
    tech: () => draftFor(techTarget),
    techTarget,
  });
}

export const step03: MigrationStep = {
  number: 3,
  writeSet: ["qfai", "specs", "contracts", "config", "migration-state"],
  sections: ["For a person"],
  async plan(context) {
    const contested = await contestedOverlays(context.root);
    if (contested.length > 0)
      return { operations: [], forAPerson: contested, forAPersonIdentifiers: [] };
    const operations: MigrationOperation[] = [];
    const contracts = await planContracts(context);
    const forAPerson: string[] = [...contracts.forAPerson];
    const identifiers: string[] = [];
    const documents = new Map<string, string>();
    // Each source and the destinations its content goes to. A source is deleted only
    // once every one of them is written; one that exists and differs keeps it.
    const routedTo = new Map<string, Set<string>>();
    const refused = new Set<string>();
    let surfacePaths: string[] | undefined;
    const policies = relative(context.root, path.join(context.specsDir, "_policies"));
    const sources = POLICY_SOURCES.map(([name]) => `${policies}/${name}`);
    sources.push(...CATALOG_FILES.map((name) => `.qfai/assistant/catalog/${name}`));

    const tech = relative(context.root, path.join(context.contractsDir, "tech.md"));
    const shaped = (target: string): boolean => target === tech || isPolicyDocument(target);
    const drafts = new Map<string, PolicyDraft>();
    const draftFor = (target: string): PolicyDraft => {
      const draft = drafts.get(target) ?? newPolicyDraft(target);
      drafts.set(target, draft);
      return draft;
    };
    for (const source of sources) {
      const absolute = path.join(context.root, source);
      if (!(await exists(absolute))) continue;
      const content = await readInput(absolute);
      const { preamble, sections } = sectionParts(content);
      const targets = new Set<string>();
      routedTo.set(source, targets);
      if (source.endsWith("/structure.md")) {
        const routed = await routeStructure(context, { source, preamble, sections }, draftFor);
        forAPerson.push(...routed.forAPerson);
        surfacePaths = routed.surfacePaths;
        if (routed.skeletonLines.length > 0) addTechCommands(draftFor(tech), routed.skeletonLines);
        if (drafts.has(tech)) targets.add(tech);
        continue;
      }
      const fallback = route(source, "", context);
      if (path.posix.basename(fallback) === "contracts.md") {
        forAPerson.push(
          ...(await writeContractIndex(
            context,
            { source, content, target: fallback },
            contracts,
            documents,
            refused,
          )),
        );
        targets.add(fallback);
        continue;
      }
      targets.add(fallback);
      if (shaped(fallback)) {
        draftFor(fallback);
        const h1 = parseHeadings(content).find((item) => item.level === 1);
        if (
          h1 &&
          content
            .split(/\r?\n/)
            .slice(0, h1.line - 1)
            .join("\n")
            .trim() !== ""
        )
          forAPerson.push(`${fallback}: rewrite the text before the title of ${source} by hand`);
        if (preamble)
          forAPerson.push(
            `${fallback}: rewrite the text before the first section of ${source} by hand`,
          );
      } else {
        if (!documents.has(fallback)) {
          documents.set(fallback, await readDestination(context, fallback));
        }
        if (preamble)
          documents.set(fallback, addDistinctParagraphs(documents.get(fallback) ?? "", preamble));
      }
      for (const section of sections) {
        const target = route(source, section.heading, context);
        targets.add(target);
        if (shaped(target)) {
          const move = target === tech ? moveTechSection : movePolicySection;
          forAPerson.push(...move(draftFor(target), { ...section, source }));
          continue;
        }
        if (!documents.has(target)) {
          documents.set(target, await readDestination(context, target));
        }
        documents.set(
          target,
          appendSection(documents.get(target) ?? "", section.heading, section.body),
        );
      }
    }
    for (const [target, draft] of drafts) {
      if (isPolicyDocument(target) && path.posix.basename(target) === "constraint.md")
        identifiers.push(...renumberConstraints(draft));
      const content =
        target === tech ? await renderTechDocument(draft) : await renderPolicyDocument(draft);
      const absolute = path.join(context.root, target);
      if (!(await exists(absolute))) documents.set(target, content);
      else if ((await readInput(absolute)) !== content) {
        refused.add(target);
        forAPerson.push(notWritten(target));
      }
    }
    const keptSources = new Set<string>();
    for (const [source, targets] of routedTo) {
      const blocked = [...targets].filter((target) => refused.has(target));
      if (blocked.length === 0) {
        operations.push({ kind: "remove", target: source, description: "delete" });
        continue;
      }
      keptSources.add(source);
      forAPerson.push(
        `${source}: kept, since ${blocked.join(" and ")} was not written; delete it once what it states is carried by hand`,
      );
    }

    const sliceSource = `${policies}/11_Slice-Policy.md`;
    if (await exists(path.join(context.root, sliceSource))) {
      await readInput(path.join(context.root, sliceSource));
      operations.push({ kind: "remove", target: sliceSource, description: "delete" });
    }

    const overrides = await planOverrides(context, contracts.map, surfacePaths);
    if (overrides.operation) operations.push(overrides.operation);
    forAPerson.push(...overrides.forAPerson);

    for (const directory of ASSISTANT_DIRS) {
      const dir = `.qfai/assistant/${directory}`;
      const absolute = path.join(context.root, dir);
      if (!(await exists(absolute))) continue;
      let kept = false;
      for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const source = `${dir}/${entry.name}`;
        if (
          operations.some((operation) => operation.kind === "remove" && operation.target === source)
        )
          continue;
        if (keptSources.has(source)) {
          kept = true;
          continue;
        }
        if (entry.isSymbolicLink())
          throw new MigrationInputError(`Migration input is a symbolic link: ${source}`);
        if (entry.name.endsWith(".local.md") && entry.isFile()) {
          const master = entry.name.replace(/\.local\.md$/, ".md");
          const target = `.qfai/assistant/rule/${entry.name}`;
          if (await exists(path.join(context.root, `.qfai/assistant/rule/${master}`))) {
            if (!(await exists(path.join(context.root, target)))) {
              operations.push({ kind: "move", source, target });
              continue;
            }
            forAPerson.push(
              `${source}: ${target} already exists, so the overlay stays here; merge it by hand.`,
            );
            kept = true;
            continue;
          }
          forAPerson.push(
            `${source}: no rule master ${master} exists, so the overlay is deleted; carry what it states by hand from git history.`,
          );
        }
        operations.push({ kind: "remove", target: source, description: "delete" });
      }
      if (!kept) operations.push({ kind: "remove-empty-directory", target: dir });
    }
    if (await exists(path.join(context.root, policies))) {
      const entries = await readdir(path.join(context.root, policies));
      const moved = new Set(
        operations.flatMap((operation) =>
          operation.kind === "remove" && path.posix.dirname(operation.target) === policies
            ? [path.posix.basename(operation.target)]
            : [],
        ),
      );
      if (entries.every((entry) => moved.has(entry)))
        operations.push({ kind: "remove-empty-directory", target: policies });
    }
    for (const [target, content] of documents)
      operations.unshift({ kind: "write", target, content });
    operations.unshift(...contracts.operations);
    return {
      operations,
      forAPerson: [...forAPerson, ...identifiers],
      forAPersonIdentifiers: identifiers,
    };
  },
};
