export function readRequiredSection(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\b`, "i").test(line),
  );
  if (start < 0) {
    throw new Error(`Required section not found: ${heading}`);
  }
  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^#{1,6}\s+/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected.join("\n").trim();
}

export function readRequiredBulletCount(content: string, heading: string): number {
  const section = readRequiredSection(content, heading);
  const count = section.match(/^\s*[-*]\s+/gm)?.length ?? 0;
  if (count === 0) {
    throw new Error(`Required bullet list is empty: ${heading}`);
  }
  return count;
}

export function readRequiredAxisCount(content: string): number {
  const axes = content.match(/^###\s+Axis:\s+/gm)?.length ?? 0;
  if (axes > 0) {
    return axes;
  }
  throw new Error("Required structured axis count is missing.");
}

export function readRequiredFieldCount(content: string, fieldName: string): number {
  const fieldPattern = new RegExp(`^\\s*-\\s+${escapeRegExp(fieldName)}\\s*:`, "gim");
  const count = content.match(fieldPattern)?.length ?? 0;
  if (count === 0) {
    throw new Error(`Required structured field is missing: ${fieldName}`);
  }
  return count;
}

export function readRequiredAggregateScore(content: string): number {
  const match = /^\s*-\s+aggregate_score\s*:\s*(0(?:\.\d+)?|1(?:\.0+)?)\b/gim.exec(content);
  if (!match?.[1]) {
    throw new Error("Required aggregate score is missing.");
  }
  return Number(match[1]);
}

export function readRequiredScreenCount(content: string): number {
  const count = content.match(/^###\s+Screen:\s+/gm)?.length ?? 0;
  if (count === 0) {
    throw new Error("Required screen contracts are missing.");
  }
  return count;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
