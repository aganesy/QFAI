import { parseScenarioDocument } from "../scenarioModel.js";

export type ParsedScenarioFile = {
  file: string;
  featurePresent: boolean;
  scenarios: Array<{
    name: string;
    line: number;
    tags: string[];
    body: string;
  }>;
};

export function parseGherkinFeature(
  text: string,
  file: string,
): ParsedScenarioFile {
  const { document } = parseScenarioDocument(text, file);
  if (!document) {
    return { file, featurePresent: false, scenarios: [] };
  }

  const scenarios = document.scenarios.map((scenario) => ({
    name: scenario.name,
    line: scenario.line ?? 1,
    tags: scenario.tags,
    body: scenario.steps
      .map((step) => `${step.keyword}${step.text}`.trimEnd())
      .join("\n")
      .trim(),
  }));

  return {
    file,
    featurePresent: Boolean(document.featureName),
    scenarios,
  };
}
