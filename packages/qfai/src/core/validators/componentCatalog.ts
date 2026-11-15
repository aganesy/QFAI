/**
 * Warnings the committed component catalogue supports.
 *
 * A project that has not run `qfai catalog components` has no catalogue, and nothing here is
 * asked of it beyond the hand-written widget warning a declared registry already asks. Once the
 * file exists, a component with no recorded source, two components realising one pattern, a raw
 * element where a listed component replaces it, a catalogue that no longer matches the source and
 * a listed interactive widget with no `@a11y` are each a warning: they are worth a reviewer's
 * look, and none of them proves the screen wrong.
 *
 * A project counts as having a catalogue installed when `uiux.registries` declares a valid
 * entry or a listed component's `@source` is a catalogue item. There a hand-written dialog, menu
 * or tab list is a warning too, outside the files of the components procured from a catalogue.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import {
  COMPONENT_CATALOG_PATH,
  INTERACTIVE_WIDGET_PATTERNS,
  readCatalog,
  renderCatalog,
  sameCatalogText,
  scanComponents,
  widgetPatternKey,
  type CatalogComponent,
  type ComponentScan,
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
  const listed = catalog.state === "read" ? catalog.components : [];
  const installed =
    Object.keys(config.uiux?.registries ?? {}).length > 0 || listed.some(isProcured);
  if (catalog.state !== "read" && !installed) {
    return catalog.state === "invalid" ? [invalidCatalogFinding()] : [];
  }
  // Ceiling: the surface files are parsed here a second time beside the plain-text check in the
  // same run; sharing one parse per file between the two checks lifts it.
  const scan = await scanComponents(root, config, options);
  const widgets = installed ? widgetMarkupFindings(scan, listed) : [];
  if (catalog.state !== "read") {
    return [...(catalog.state === "invalid" ? [invalidCatalogFinding()] : []), ...widgets];
  }
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
    ...catalog.components.flatMap(widgetA11yFindings),
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
  return [...issues, ...widgets];
}

function invalidCatalogFinding(): Issue {
  return issue(
    "QFAI-COMP-004",
    "The component catalogue is not a `components:` list of entries with a `name` and a `file`.",
    "warning",
    CATALOG_FILE,
    RULE,
    undefined,
    "canonical",
    REGENERATE,
  );
}

/** Whether the entry's `@source` names a catalogue item rather than `authored`. */
function isProcured(component: CatalogComponent): boolean {
  const source = component.source?.trim().toLowerCase();
  return source !== undefined && source !== "" && source !== "authored";
}

/**
 * A hand-written dialog, menu or tab list in a surface file, outside the file of a component
 * procured from a catalogue. Not given when `typescript` cannot be loaded from the project root.
 */
function widgetMarkupFindings(scan: ComponentScan, listed: readonly CatalogComponent[]): Issue[] {
  if (!scan.readable) return [];
  const procuredFiles = new Set(listed.filter(isProcured).map((component) => component.file));
  return scan.widgetMarkup
    .filter((found) => !procuredFiles.has(found.file))
    .map((found) =>
      issue(
        "QFAI-COMP-005",
        `Hand-written ${found.markup.map(codeSpan).join(" and ")} in a project with a component catalogue installed.`,
        "warning",
        found.file,
        RULE,
        undefined,
        "canonical",
        "Take the widget from the catalogue or a headless library, as `.qfai/assistant/rule/ui-procurement.md` lists it. When it must be authored, record its WAI-ARIA pattern and keyboard behaviour in the component's `@a11y`, cover that behaviour with a test, and run `qfai catalog components`.",
        { loc: { line: found.line } },
      ),
    );
}

function codeSpan(text: string): string {
  return `\`${text}\``;
}

/** A listed interactive widget whose `@a11y` records nothing. */
function widgetA11yFindings(component: CatalogComponent): Issue[] {
  const pattern = component.pattern?.trim();
  if (!pattern || !INTERACTIVE_WIDGET_PATTERNS.has(widgetPatternKey(pattern))) return [];
  if (component.a11y?.trim()) return [];
  return [
    issue(
      "QFAI-COMP-006",
      `Component \`${component.name}\` realises the \`${pattern}\` widget pattern with no \`@a11y\`.`,
      "warning",
      component.file,
      RULE,
      undefined,
      "canonical",
      "In the component's doc comment, write `@a11y <WAI-ARIA pattern>; <keyboard behaviour>`, cover that behaviour with a test, and run `qfai catalog components`.",
    ),
  ];
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
