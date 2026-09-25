/**
 * The README checks of the release: the supported-host claim against the eval records, and the
 * operating model that puts the free-text entry first.
 */

/** The body of the `## <heading>` section, up to the next level-2 heading; `undefined` if absent. */
export function section(readme: string, heading: string): string | undefined {
  const lines = readme.split("\n");
  const start = lines.findIndex(
    (line) => line === `## ${heading}` || line.startsWith(`## ${heading} (`),
  );
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

const SUPPORTED_HOSTS = "### Supported hosts";

/**
 * The host IDs the README claims as supported: the backticked ID of each bullet under
 * `### Supported hosts` in `## Agent integrations`. `undefined` when there is no such subsection.
 */
export function claimedHosts(readme: string): string[] | undefined {
  const lines = (section(readme, "Agent integrations") ?? "").split("\n");
  const start = lines.indexOf(SUPPORTED_HOSTS);
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && line.startsWith("#"));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter((line) => line.startsWith("- "))
    .flatMap((line) => /`([a-z][a-z0-9-]*)`/.exec(line)?.[1] ?? []);
}

/** The hosts with a passing eval record for `version`: its release verdict is not blocked. */
export function recordedHosts(records: readonly unknown[], version: string): string[] {
  const passing = records.filter(
    (record) =>
      typeof record === "object" &&
      record !== null &&
      Reflect.get(record, "version") === version &&
      Reflect.get(Reflect.get(record, "verdict") ?? {}, "blocked") === false,
  );
  return [...new Set(passing.map((record) => String(Reflect.get(Object(record), "host"))))].sort();
}

/** Every way the READMEs' claim differs from the records; an empty list is an equal claim. */
export function claimProblems(
  readmes: Readonly<Record<string, string>>,
  records: readonly unknown[],
  version: string,
): string[] {
  const recorded = recordedHosts(records, version);
  return Object.entries(readmes).flatMap(([name, text]) => {
    const claimed = claimedHosts(text);
    if (claimed === undefined)
      return [`${name}: no ${SUPPORTED_HOSTS} under ## Agent integrations`];
    return [
      ...claimed
        .filter((host) => !recorded.includes(host))
        .map((host) => `${name}: \`${host}\` is claimed with no passing record for ${version}`),
      ...recorded
        .filter((host) => !claimed.includes(host))
        .map(
          (host) => `${name}: \`${host}\` has a passing record for ${version} and is not claimed`,
        ),
    ];
  });
}

const OPERATING_MODEL = "Operating model";

// The participant aliases a sequence diagram labels as the operator.
function operatorAliases(diagram: string): string[] {
  return [...diagram.matchAll(/^participant (\S+) as (?:Operator|User)\b/gm)].flatMap(
    (match) => match[1] ?? [],
  );
}

/**
 * Every step of the operating-model sequence diagram and of the minimal tutorial in which the
 * operator types a `/qfai-*` stage.
 */
export function typedStageSteps(readme: string): string[] {
  const model = section(readme, OPERATING_MODEL) ?? "";
  const diagrams = [...model.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((match) => match[1] ?? "");
  const fromDiagram = diagrams.flatMap((diagram) => {
    const aliases = operatorAliases(diagram);
    return diagram
      .split("\n")
      .filter(
        (line) => aliases.some((alias) => line.startsWith(`${alias}-`)) && line.includes("/qfai-"),
      );
  });
  const tutorial = (section(readme, "Minimal tutorial") ?? "")
    .split("\n")
    .filter((line) => /^(\d+\.|-) /.test(line) && line.includes("/qfai-"));
  return [...fromDiagram, ...tutorial];
}

// The phrase each region of the README introduces the free-text entry with.
export const FREE_TEXT_ENTRY = "in your own words";

/** The regions whose first mention of a `/qfai-*` stage comes before the free-text entry. */
export function stageFirstRegions(readme: string): string[] {
  const intro = readme.split("\n## ")[0] ?? "";
  const regions: Record<string, string> = {
    introduction: intro,
    [OPERATING_MODEL]: section(readme, OPERATING_MODEL) ?? "",
    "Quick start": section(readme, "Quick start") ?? "",
    "Minimal tutorial": section(readme, "Minimal tutorial") ?? "",
  };
  return Object.entries(regions)
    .filter(([, text]) => {
      const entry = text.indexOf(FREE_TEXT_ENTRY);
      const stage = text.search(/\/qfai-(?!run\b)/);
      return entry < 0 || (stage >= 0 && stage < entry);
    })
    .map(([name]) => name);
}
