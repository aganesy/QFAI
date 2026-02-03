export type TraceabilityStatus = "implemented" | "planned";

export type TraceabilityMatrixStatusResult = {
  statusBySc: Map<string, TraceabilityStatus>;
  invalidStatusValues: string[];
  hasStatusColumn: boolean;
};

const SC_ID_RE = /SC-\d{4}-\d{4}/g;

export function parseTraceabilityMatrixStatus(
  matrixText: string,
): TraceabilityMatrixStatusResult {
  const lines = matrixText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const headerLine = lines[i];
    const separatorLine = lines[i + 1];
    if (!headerLine || !separatorLine) {
      continue;
    }
    if (!headerLine.includes("|") || !separatorLine.includes("|")) {
      continue;
    }
    if (!/^-|:\s*$/.test(separatorLine.replace(/\s*\|\s*/g, "-"))) {
      // rough check for separator row
    }

    const headers = splitTableRow(headerLine);
    if (headers.length === 0) {
      continue;
    }
    const scIndex = findHeaderIndex(headers, ["SC", "Scenario"]);
    const statusIndex = findHeaderIndex(headers, ["Status", "status"]);
    if (scIndex === -1) {
      continue;
    }

    const statusBySc = new Map<string, TraceabilityStatus>();
    const invalidStatusValues: string[] = [];
    const hasStatusColumn = statusIndex !== -1;

    for (let row = i + 2; row < lines.length; row += 1) {
      const line = lines[row];
      if (!line || !line.includes("|")) {
        break;
      }
      if (isSeparatorRow(line)) {
        continue;
      }
      const cells = splitTableRow(line);
      const scCell = cells[scIndex] ?? "";
      const scIds = extractScIds(scCell);
      if (scIds.length === 0) {
        continue;
      }

      const rawStatus = hasStatusColumn ? (cells[statusIndex] ?? "") : "";
      const normalizedStatus = normalizeStatus(rawStatus);

      if (rawStatus && !normalizedStatus) {
        invalidStatusValues.push(rawStatus);
        continue;
      }

      for (const scId of scIds) {
        const nextStatus = normalizedStatus ?? "implemented";
        const current = statusBySc.get(scId);
        if (current === "implemented") {
          continue;
        }
        if (nextStatus === "implemented") {
          statusBySc.set(scId, "implemented");
        } else if (!current) {
          statusBySc.set(scId, "planned");
        }
      }
    }

    return { statusBySc, invalidStatusValues, hasStatusColumn };
  }

  return { statusBySc: new Map(), invalidStatusValues: [], hasStatusColumn: false };
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function findHeaderIndex(headers: string[], targets: string[]): number {
  const normalized = headers.map((header) => header.toLowerCase());
  for (const target of targets) {
    const index = normalized.indexOf(target.toLowerCase());
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function extractScIds(text: string): string[] {
  const matches = text.match(SC_ID_RE);
  if (!matches) {
    return [];
  }
  return Array.from(new Set(matches));
}

function normalizeStatus(value: string): TraceabilityStatus | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "implemented") {
    return "implemented";
  }
  if (normalized === "planned") {
    return "planned";
  }
  return null;
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return false;
  }
  const content = trimmed.slice(1, -1).trim();
  return /^[\-\s:|]+$/.test(content);
}
