import { isDeepStrictEqual } from "node:util";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parseDocument, parse as parseYaml } from "yaml";

import { extractH2Sections, parseHeadings } from "../../core/parse/markdown.js";
import { getInitAssetsDir } from "../../shared/assets.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

const POLICY_SOURCES = [
  ["01_Objective.md", "objective.md"],
  ["02_Initiative.md", "initiative.md"],
  ["05_Contracts.md", "contracts.md"],
  ["06_Glossary.md", "glossary.md"],
  ["07_Constraints.md", "constraint.md"],
] as const;

const ASSISTANT_DIRS = ["constitution", "catalog", "manifest", "process"] as const;
const CATALOG_FILES = ["product.md", "manifest.md", "tech.md", "structure.md"] as const;
const RETIRED = ".qfai/evidence/migration-spec-to-story/retired";
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
    case "contracts.md":
      return "Contracts";
    case "tech.md":
      return "Technology";
    case "structure.md":
      return "Structure";
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
  if (source.endsWith("/tech.md")) return contract("tech.md");
  if (source.endsWith("/structure.md")) return contract("structure.md");
  const policyName = path.posix.basename(source);
  const mapped = POLICY_SOURCES.find(([name]) => name === policyName)?.[1];
  if (!mapped) throw new Error(`No destination for ${source}`);
  return mapped === "contracts.md" ? contract(mapped) : policy(mapped);
}

async function uniqueRetired(root: string, base: string, reserved: Set<string>): Promise<string> {
  for (let suffix = 0; ; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    if (!reserved.has(candidate) && !(await exists(path.join(root, candidate)))) {
      reserved.add(candidate);
      return candidate;
    }
  }
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

async function planOverrides(root: string): Promise<MigrationOperation | null> {
  const routingPath = path.join(root, ".qfai/assistant/manifest/agent-routing.yml");
  const reviewPath = path.join(root, ".qfai/assistant/manifest/review-profiles.yml");
  const hasRouting = await exists(routingPath);
  const hasReview = await exists(reviewPath);
  if (!hasRouting && !hasReview) return null;
  const configPath = path.join(root, "qfai.config.yaml");
  const config = parseDocument(await readInput(configPath), { keepSourceTokens: true });
  if (config.errors.length > 0)
    throw new MigrationInputError(`Cannot parse ${configPath}: ${config.errors[0]?.message}`);
  let changed = false;
  if (hasRouting) {
    const project = asRecord(
      parseYamlInput(await readInput(routingPath), routingPath),
      routingPath,
    );
    const defaults = asRecord(
      parseYamlInput(await defaultsFile("agent-routing.yml"), "default agent-routing.yml"),
      "default agent-routing.yml",
    );
    if (!Array.isArray(project.routing) || !Array.isArray(defaults.routing))
      throw new MigrationInputError("Routing must be a list.");
    const defaultBySkill = new Map(
      defaults.routing.map((entry) => {
        const record = asRecord(entry, "default routing entry");
        if (typeof record.skill !== "string")
          throw new MigrationInputError("Default routing entry needs a skill.");
        return [record.skill, entry] as const;
      }),
    );
    const overrides = project.routing.filter((entry) => {
      const record = asRecord(entry, "project routing entry");
      if (typeof record.skill !== "string")
        throw new MigrationInputError("Project routing entry needs a skill.");
      return !isDeepStrictEqual(entry, defaultBySkill.get(record.skill));
    });
    if (overrides.length > 0) {
      config.set("routing", overrides);
      changed = true;
    }
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
  return changed ? { kind: "write", target: "qfai.config.yaml", content: String(config) } : null;
}

export const step03: MigrationStep = {
  number: 3,
  writeSet: ["qfai", "specs", "contracts", "config"],
  sections: ["For a person"],
  async plan(context) {
    const operations: MigrationOperation[] = [];
    const forAPerson: string[] = [];
    const reserved = new Set<string>();
    const documents = new Map<string, string>();
    const policies = relative(context.root, path.join(context.specsDir, "_policies"));
    const sources = POLICY_SOURCES.map(([name]) => `${policies}/${name}`);
    sources.push(...CATALOG_FILES.map((name) => `.qfai/assistant/catalog/${name}`));

    for (const source of sources) {
      const absolute = path.join(context.root, source);
      if (!(await exists(absolute))) continue;
      const content = await readInput(absolute);
      const { preamble, sections } = sectionParts(content);
      const fallback = route(source, "", context);
      if (!documents.has(fallback)) {
        documents.set(fallback, await readDestination(context, fallback));
      }
      if (preamble)
        documents.set(fallback, addDistinctParagraphs(documents.get(fallback) ?? "", preamble));
      for (const section of sections) {
        const target = route(source, section.heading, context);
        if (!documents.has(target)) {
          documents.set(target, await readDestination(context, target));
        }
        documents.set(
          target,
          appendSection(documents.get(target) ?? "", section.heading, section.body),
        );
      }
      const archive = await uniqueRetired(
        context.root,
        `${RETIRED}/${source.startsWith(".qfai/assistant/") ? source.slice(".qfai/".length) : `_policies/${path.posix.basename(source)}`}`,
        reserved,
      );
      operations.push({ kind: "move", source, target: archive });
    }

    const sliceSource = `${policies}/11_Slice-Policy.md`;
    if (await exists(path.join(context.root, sliceSource))) {
      await readInput(path.join(context.root, sliceSource));
      const archive = await uniqueRetired(
        context.root,
        `${RETIRED}/_policies/11_Slice-Policy.md`,
        reserved,
      );
      operations.push({ kind: "move", source: sliceSource, target: archive });
    }

    const override = await planOverrides(context.root);
    if (override) operations.push(override);

    for (const directory of ASSISTANT_DIRS) {
      const dir = `.qfai/assistant/${directory}`;
      const absolute = path.join(context.root, dir);
      if (!(await exists(absolute))) continue;
      for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const source = `${dir}/${entry.name}`;
        if (
          operations.some((operation) => operation.kind === "move" && operation.source === source)
        )
          continue;
        if (entry.isSymbolicLink())
          throw new MigrationInputError(`Migration input is a symbolic link: ${source}`);
        if (entry.name.endsWith(".local.md") && entry.isFile()) {
          const master = entry.name.replace(/\.local\.md$/, ".md");
          const target = `.qfai/assistant/rule/${entry.name}`;
          if (
            (await exists(path.join(context.root, `.qfai/assistant/rule/${master}`))) &&
            !(await exists(path.join(context.root, target)))
          ) {
            operations.push({ kind: "move", source, target });
            continue;
          }
          forAPerson.push(
            `${source}: no rule master or the overlay destination exists; review the archived overlay.`,
          );
        }
        const archive = await uniqueRetired(
          context.root,
          `${RETIRED}/assistant/${directory}/${entry.name}`,
          reserved,
        );
        operations.push({ kind: "move", source, target: archive });
      }
      operations.push({ kind: "remove-empty-directory", target: dir });
    }
    if (await exists(path.join(context.root, policies))) {
      const entries = await readdir(path.join(context.root, policies));
      const moved = new Set(
        operations.flatMap((operation) =>
          operation.kind === "move" && path.posix.dirname(operation.source) === policies
            ? [path.posix.basename(operation.source)]
            : [],
        ),
      );
      if (entries.every((entry) => moved.has(entry)))
        operations.push({ kind: "remove-empty-directory", target: policies });
    }
    for (const [target, content] of documents)
      operations.unshift({ kind: "write", target, content });
    return { operations, forAPerson };
  },
};
