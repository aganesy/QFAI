import type * as Messages from "@cucumber/messages";

import { parseGherkin } from "./gherkin/parse.js";
import { extractIds } from "./ids.js";

const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const SC_TAG_RE = /^SC-\d{4}$/;
const BR_TAG_RE = /^BR-\d{4}$/;
const UI_TAG_RE = /^UI-\d{4}$/;
const API_TAG_RE = /^API-\d{4}$/;
const DATA_TAG_RE = /^DATA-\d{4}$/;

export type ScenarioKind = "Scenario" | "ScenarioOutline";

export type ScenarioNode = {
  name: string;
  kind: ScenarioKind;
  line?: number;
  tags: string[];
  steps: readonly Messages.Step[];
};

export type ScenarioDocument = {
  uri: string;
  featureName?: string;
  featureTags: string[];
  scenarios: ScenarioNode[];
};

export type ScenarioParseResult = {
  document: ScenarioDocument | null;
  errors: string[];
};

export type ScenarioAtom = {
  uri: string;
  featureName: string;
  scenarioName: string;
  kind: ScenarioKind;
  specId?: string;
  scId?: string;
  brIds: string[];
  contractIds: string[];
  line?: number;
};

export function parseScenarioDocument(
  text: string,
  uri: string,
): ScenarioParseResult {
  const { gherkinDocument, errors } = parseGherkin(text, uri);
  if (!gherkinDocument) {
    return { document: null, errors };
  }

  const feature = gherkinDocument.feature;
  if (!feature) {
    return {
      document: { uri, featureName: undefined, featureTags: [], scenarios: [] },
      errors,
    };
  }

  const featureTags = collectTagNames(feature.tags);
  const scenarios = collectScenarioNodes(feature, featureTags);
  return {
    document: {
      uri,
      featureName: feature.name,
      featureTags,
      scenarios,
    },
    errors,
  };
}

export function buildScenarioAtoms(document: ScenarioDocument): ScenarioAtom[] {
  return document.scenarios.map((scenario) => {
    const specIds = scenario.tags.filter((tag) => SPEC_TAG_RE.test(tag));
    const scIds = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
    const brIds = unique(
      scenario.tags.filter((tag) => BR_TAG_RE.test(tag)),
    );

    const contractIds = new Set<string>();
    scenario.tags.forEach((tag) => {
      if (UI_TAG_RE.test(tag) || API_TAG_RE.test(tag) || DATA_TAG_RE.test(tag)) {
        contractIds.add(tag);
      }
    });

    for (const step of scenario.steps) {
      for (const text of collectStepTexts(step)) {
        extractIds(text, "UI").forEach((id) => contractIds.add(id));
        extractIds(text, "API").forEach((id) => contractIds.add(id));
        extractIds(text, "DATA").forEach((id) => contractIds.add(id));
      }
    }

    return {
      uri: document.uri,
      featureName: document.featureName ?? "",
      scenarioName: scenario.name,
      kind: scenario.kind,
      specId: specIds.length === 1 ? specIds[0] : undefined,
      scId: scIds.length === 1 ? scIds[0] : undefined,
      brIds,
      contractIds: Array.from(contractIds).sort(),
      line: scenario.line,
    };
  });
}

function collectScenarioNodes(
  feature: Messages.Feature,
  featureTags: string[],
): ScenarioNode[] {
  const scenarios: ScenarioNode[] = [];

  for (const child of feature.children) {
    if (child.scenario) {
      scenarios.push(buildScenarioNode(child.scenario, featureTags, []));
    }
    if (child.rule) {
      const ruleTags = collectTagNames(child.rule.tags);
      for (const ruleChild of child.rule.children) {
        if (ruleChild.scenario) {
          scenarios.push(
            buildScenarioNode(ruleChild.scenario, featureTags, ruleTags),
          );
        }
      }
    }
  }

  return scenarios;
}

function buildScenarioNode(
  scenario: Messages.Scenario,
  featureTags: string[],
  ruleTags: string[],
): ScenarioNode {
  const tags = [
    ...featureTags,
    ...ruleTags,
    ...collectTagNames(scenario.tags),
  ];
  const kind: ScenarioKind =
    scenario.examples.length > 0 ? "ScenarioOutline" : "Scenario";
  return {
    name: scenario.name,
    kind,
    line: scenario.location?.line,
    tags,
    steps: scenario.steps,
  };
}

function collectTagNames(tags: readonly Messages.Tag[]): string[] {
  return tags.map((tag) => tag.name.replace(/^@/, ""));
}

function collectStepTexts(step: Messages.Step): string[] {
  const texts: string[] = [];
  if (step.text) {
    texts.push(step.text);
  }
  if (step.docString?.content) {
    texts.push(step.docString.content);
  }
  if (step.dataTable?.rows) {
    for (const row of step.dataTable.rows) {
      for (const cell of row.cells) {
        texts.push(cell.value);
      }
    }
  }
  return texts;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
