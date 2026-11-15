/**
 * Warnings the committed component catalogue supports.
 *
 * A project that has not run `qfai catalog components` has no catalogue, and nothing here is
 * asked of it. Once the file exists, a component with no recorded source, two components
 * realising one pattern, a raw element where a listed component replaces it, and a catalogue
 * that no longer matches the source are each a warning: they are worth a reviewer's look, and
 * none of them proves the screen wrong.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  COMPONENT_CATALOG_PATH,
  readCatalog,
  renderCatalog,
  sameCatalogText,
  scanComponents,
  type CatalogComponent,
} from "../uiux/componentCatalog.js";
import type { Issue } from "../types.js";
import type { UiPlainTextOptions } from "./uiPlainText.js";
import { issue } from "./utils.js";

const RULE = "uiux.componentCatalog";
const CATALOG_FILE = COMPONENT_CATALOG_PATH.split(path.sep).join("/");
const REGENERATE = "Run `qfai catalog components` and commit the file it writes.";

export async function validateComponentCatalog(
  root: string,
  config: QfaiConfig,
  options: UiPlainTextOptions = {},
): Promise<Issue[]> {
  const catalog = await readCatalog(root);
  if (catalog.state === "absent") return [];
  if (catalog.state === "invalid") {
    return [
      issue(
        "QFAI-COMP-004",
        "The component catalogue is not a `components:` list of entries with a `name` and a `file`.",
        "warning",
        CATALOG_FILE,
        RULE,
        undefined,
        "canonical",
        REGENERATE,
      ),
    ];
  }
  // Ceiling: the surface files are parsed here a second time beside the plain-text check in the
  // same run; sharing one parse per file between the two checks lifts it.
  const scan = await scanComponents(root, config, options);
  // A shared component is one another surface file imports by name. Ceiling: without the
  // project's `typescript` the source cannot be read, so only tagged entries are asked for a
  // source and the raw-element and freshness warnings are not given; the plain-text check in the
  // same profiles already reports the missing package. Installing `typescript` lifts it.
  const importers = new Map<string, Set<string>>();
  for (const imported of scan.readable ? scan.imports : []) {
    importers.set(imported.name, (importers.get(imported.name) ?? new Set()).add(imported.file));
  }
  const shared = (component: CatalogComponent): boolean =>
    [...(importers.get(component.name) ?? [])].some((file) => file !== component.file);
  const issues = [
    ...catalog.components
      .filter((component) => isTagged(component) || shared(component))
      .flatMap(sourceFindings),
    ...sharedPatternFindings(catalog.components),
  ];
  if (!scan.readable) return issues;
  const byPattern = componentsByPattern(catalog.components);
  for (const raw of scan.rawElements) {
    const realisers = byPattern.get(raw.element) ?? [];
    if (realisers.length === 0 || realisers.some((found) => found.file === raw.file)) continue;
    issues.push(
      issue(
        "QFAI-COMP-003",
        `A raw \`<${raw.element}>\` where the catalogue lists ${realisers.map(named).join(" and ")} for the \`${raw.element}\` pattern.`,
        "warning",
        raw.file,
        RULE,
        undefined,
        "canonical",
        `Use ${realisers.map((found) => `\`${found.name}\``).join(" or ")} instead of the raw element, or extend it when it lacks what this place needs.`,
        { loc: { line: raw.line } },
      ),
    );
  }
  if (!sameCatalogText(catalog.text, renderCatalog(scan.components))) {
    issues.push(
      issue(
        "QFAI-COMP-004",
        "The component catalogue is out of date with the components the surface files export.",
        "warning",
        CATALOG_FILE,
        RULE,
        undefined,
        "canonical",
        REGENERATE,
      ),
    );
  }
  return issues;
}

function named(component: CatalogComponent): string {
  return `\`${component.name}\` (${component.file})`;
}

/** Whether the doc comment gives the entry any catalogue tag. */
function isTagged(component: CatalogComponent): boolean {
  return (["source", "reason", "states", "pattern", "a11y"] as const).some(
    (tag) => component[tag] !== undefined,
  );
}

function sourceFindings(component: CatalogComponent): Issue[] {
  const authored = component.source?.trim().toLowerCase() === "authored";
  if (component.source !== undefined && !(authored && component.reason === undefined)) return [];
  const message =
    component.source === undefined
      ? `Component \`${component.name}\` records no \`@source\`.`
      : `Component \`${component.name}\` is \`authored\` with no \`@reason\`.`;
  return [
    issue(
      "QFAI-COMP-001",
      message,
      "warning",
      component.file,
      RULE,
      undefined,
      "canonical",
      "In the component's doc comment, write `@source <catalogue item>@<version>`, or `@source authored` with `@reason <why no catalogue item, native element or existing component serves>`, then run `qfai catalog components`.",
    ),
  ];
}

function sharedPatternFindings(components: readonly CatalogComponent[]): Issue[] {
  return [...componentsByPattern(components)]
    .filter(([, realisers]) => realisers.length > 1)
    .map(([pattern, realisers]) =>
      issue(
        "QFAI-COMP-002",
        `${realisers.map(named).join(", ")} all realise the \`${pattern}\` pattern.`,
        "warning",
        CATALOG_FILE,
        RULE,
        undefined,
        "canonical",
        "Keep one component for the pattern and use it in each place, or give the others the pattern they actually realise.",
      ),
    );
}

/** The components of each `@pattern`, compared without case or surrounding spaces. */
function componentsByPattern(
  components: readonly CatalogComponent[],
): Map<string, CatalogComponent[]> {
  const byPattern = new Map<string, CatalogComponent[]>();
  for (const component of components) {
    const pattern = component.pattern?.trim().toLowerCase();
    if (!pattern) continue;
    byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), component]);
  }
  return byPattern;
}
