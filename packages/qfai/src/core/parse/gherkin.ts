const FEATURE_RE = /^\s*Feature:\s+/;
const SCENARIO_RE = /^\s*Scenario:\s*(.+)\s*$/;
const TAG_LINE_RE = /^\s*@/;

export type ParsedScenarioFile = {
  file: string;
  featurePresent: boolean;
  scenarios: Array<{ name: string; line: number; tags: string[] }>;
};

function parseTags(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .filter((tag) => tag.startsWith("@"))
    .map((tag) => tag.replace(/^@/, ""));
}

export function parseGherkinFeature(
  text: string,
  file: string,
): ParsedScenarioFile {
  const lines = text.split(/\r?\n/);
  const scenarios: ParsedScenarioFile["scenarios"] = [];

  let featurePresent = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (FEATURE_RE.test(line)) {
      featurePresent = true;
    }

    const match = line.match(SCENARIO_RE);
    if (!match) continue;
    const scenarioName = match[1];
    if (!scenarioName) continue;

    const tags: string[] = [];
    for (let j = i - 1; j >= 0; j--) {
      const previous = lines[j] ?? "";
      if (previous.trim() === "") continue;
      if (!TAG_LINE_RE.test(previous)) break;
      tags.unshift(...parseTags(previous));
    }

    scenarios.push({ name: scenarioName, line: i + 1, tags });
  }

  return { file, featurePresent, scenarios };
}
