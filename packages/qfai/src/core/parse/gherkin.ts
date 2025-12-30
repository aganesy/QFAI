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
    if (FEATURE_RE.test(lines[i])) {
      featurePresent = true;
    }

    const match = lines[i].match(SCENARIO_RE);
    if (!match) continue;

    const tags: string[] = [];
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].trim() === "") continue;
      if (!TAG_LINE_RE.test(lines[j])) break;
      tags.unshift(...parseTags(lines[j]));
    }

    scenarios.push({ name: match[1], line: i + 1, tags });
  }

  return { file, featurePresent, scenarios };
}
