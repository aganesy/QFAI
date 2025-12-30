const FEATURE_RE = /^\s*Feature:\s+/;
const SCENARIO_RE = /^\s*Scenario(?: Outline)?:\s*(.+)\s*$/;
const TAG_LINE_RE = /^\s*@/;

export type ParsedScenarioFile = {
  file: string;
  featurePresent: boolean;
  scenarios: Array<{ name: string; line: number; tags: string[]; body: string }>;
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
  let featureTags: string[] = [];
  let pendingTags: string[] = [];
  let current: { name: string; line: number; tags: string[]; body: string } | null =
    null;

  const flush = () => {
    if (!current) return;
    scenarios.push({
      ...current,
      body: current.body.trim(),
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (TAG_LINE_RE.test(trimmed)) {
      pendingTags.push(...parseTags(trimmed));
      continue;
    }

    if (FEATURE_RE.test(trimmed)) {
      featurePresent = true;
      featureTags = [...pendingTags];
      pendingTags = [];
      continue;
    }

    const match = trimmed.match(SCENARIO_RE);
    if (match) {
      const scenarioName = match[1]?.trim();
      if (!scenarioName) {
        continue;
      }
      flush();
      current = {
        name: scenarioName,
        line: i + 1,
        tags: [...featureTags, ...pendingTags],
        body: "",
      };
      pendingTags = [];
      continue;
    }

    if (current) {
      current.body += `${line}\n`;
    }
  }

  flush();
  return { file, featurePresent, scenarios };
}
