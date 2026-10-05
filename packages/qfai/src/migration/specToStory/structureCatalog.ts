import type { PolicyDraft } from "./policyDocuments.js";
import { moveArchitectureSection } from "./techDocument.js";

/**
 * The story tree has no structure document. Step 3 routes each section of an
 * old `catalog/structure.md` to where its facts now live, and lists the rest
 * for a person.
 */
export type StructureRouting = {
  /** The Skeleton lines for `tech.md`, one per entrypoint with a known command. */
  skeletonLines: string[];
  /** The globs for `uiux.surfacePaths`; `undefined` when the file declares none. */
  surfacePaths: string[] | undefined;
  forAPerson: string[];
};

export type StructureSource = {
  source: string;
  preamble: string;
  sections: { heading: string; body: string }[];
  /** The entrypoint-to-command pairs the old `tech.md` Smoke or Skeleton lines give. */
  commands: ReadonlyMap<string, string>;
  /** The draft of `tech.md`, whose `## Architecture` table takes the layers. */
  tech: () => PolicyDraft;
  techTarget: string;
};

const ENTRYPOINT_SECTION = /^(?:key packages \/ entrypoints|entry points)$/i;
const ARCHITECTURE_SECTION = /^architecture(?: constraints)?$/i;
const UI_SECTION = /^ui surface paths\b/i;

/** The entrypoint-to-command pairs of `- Smoke:` and `- Skeleton:` lines. */
export function entrypointCommands(tech: string): Map<string, string> {
  const commands = new Map<string, string>();
  for (const match of tech.matchAll(/^\s*- (?:Smoke|Skeleton):\s*`([^`]+)`\s*->\s*`([^`]+)`/gm)) {
    const [, entry, command] = match;
    if (entry !== undefined && command !== undefined) commands.set(entry.trim(), command.trim());
  }
  return commands;
}

/** The top-level bullets of a section body, each with its continuation lines. */
function bullets(body: string): string[] {
  const items: string[] = [];
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    if (/^- /.test(line)) items.push(line.slice(2).trim());
    else if (line.trim() !== "" && items.length > 0)
      items[items.length - 1] = `${items.at(-1) ?? ""} ${line.trim()}`;
  }
  return items;
}

function routeEntrypoints(input: StructureSource, heading: string, body: string): StructureRouting {
  const routing: StructureRouting = { skeletonLines: [], surfacePaths: undefined, forAPerson: [] };
  for (const item of bullets(body)) {
    const left = /^[^:]*:\s*(.*?)\s*->/.exec(item)?.[1];
    const entry = left === undefined ? undefined : (/`([^`]+)`/.exec(left)?.[1] ?? left).trim();
    const command = entry === undefined ? undefined : input.commands.get(entry);
    if (entry !== undefined && command !== undefined) {
      routing.skeletonLines.push(`- Skeleton: \`${entry}\` -> \`${command}\``);
    } else {
      const what = entry === undefined ? `"${item}"` : `the entrypoint ${entry}`;
      routing.forAPerson.push(
        `${input.techTarget}: write a "- Skeleton: \`<entry>\` -> \`<command>\`" line for ${what} of "## ${heading}" in ${input.source}, or drop it`,
      );
    }
  }
  return routing;
}

/** The globs under `ui_paths:`; `none` declares an empty list, a `<...>` placeholder nothing. */
function surfacePathsOf(body: string): string[] | null | undefined {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => /^\s*ui_paths:\s*$/.test(line));
  if (start < 0) return null;
  const values = lines
    .slice(start + 1)
    .map((line) => /^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => value.replace(/^`([^`]*)`$/, "$1").trim());
  if (values.some((value) => value.toLowerCase() === "none")) return [];
  const globs = values.filter((value) => value.length > 0 && !/^<[^>]*>$/.test(value));
  return globs.length === 0 ? undefined : globs;
}

/** Where each section of an old `catalog/structure.md` goes. */
export function routeStructureCatalog(input: StructureSource): StructureRouting {
  const routing: StructureRouting = { skeletonLines: [], surfacePaths: undefined, forAPerson: [] };
  const person = (what: string): void => {
    routing.forAPerson.push(
      `${input.source}: ${what} has no place in the story tree; carry what it states by hand, or drop it`,
    );
  };
  if (input.preamble) person("the text before the first section");
  for (const { heading, body } of input.sections) {
    if (ENTRYPOINT_SECTION.test(heading)) {
      const entrypoints = routeEntrypoints(input, heading, body);
      routing.skeletonLines.push(...entrypoints.skeletonLines);
      routing.forAPerson.push(...entrypoints.forAPerson);
    } else if (ARCHITECTURE_SECTION.test(heading)) {
      routing.forAPerson.push(
        ...moveArchitectureSection(input.tech(), {
          source: input.source,
          heading,
          body,
        }),
      );
    } else if (UI_SECTION.test(heading)) {
      const paths = surfacePathsOf(body);
      if (paths === null)
        routing.forAPerson.push(
          `qfai.config.yaml: declare the paths "## ${heading}" of ${input.source} names as uiux.surfacePaths by hand`,
        );
      else routing.surfacePaths = paths;
    } else {
      person(`"## ${heading}"`);
    }
  }
  return routing;
}
