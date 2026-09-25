#!/usr/bin/env node
/* global process */
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const DEFAULT_INDEX = fileURLToPath(
  new URL("../../../.qfai/specs/_policies/05_Contracts.md", import.meta.url),
);
const EXPECTED_FILES = new Map([
  ["DCON-005", ".qfai/contracts/design/design-system.yaml"],
  ["DCON-008", ".qfai/contracts/design/prototype-handoff.yaml"],
  ["DCON-030", "DESIGN.md"],
  ["DCON-031", ".qfai/contracts/design/DESIGN.md.lock.yaml"],
  ["DCON-032", "(validator on `.qfai/contracts/design/design-system.yaml` ↔ DESIGN.md)"],
]);
const INACTIVE = /^\s*\(?\s*(?:REMOVED|DEPRECATED)\b/i;
const RULE = "R-DESIGN-INDEX";

// SIMPLIFIED: Short ID and File cells in this repository's index contain no escaped pipes.
// Lift when: either column starts allowing escaped pipes in its authored rows.
function cells(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function finding(line, message) {
  return { line, message };
}

function visibleLines(source) {
  const lines = [];
  let fence = null;
  let inComment = false;
  for (const raw of source.split(/\r?\n/)) {
    if (fence !== null) {
      const closing = /^ {0,3}(`+|~+)[ \t]*$/.exec(raw)?.[1];
      if (closing?.[0] === fence[0] && closing.length >= fence.length) fence = null;
      lines.push("");
      continue;
    }

    let visible = "";
    let offset = 0;
    while (offset < raw.length) {
      if (inComment) {
        const end = raw.indexOf("-->", offset);
        if (end < 0) break;
        inComment = false;
        offset = end + 3;
      } else {
        const start = raw.indexOf("<!--", offset);
        if (start < 0) {
          visible += raw.slice(offset);
          break;
        }
        visible += raw.slice(offset, start);
        inComment = true;
        offset = start + 4;
      }
    }
    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(visible)?.[1];
    if (opening) fence = opening;
    lines.push(opening ? "" : visible);
  }
  return lines;
}

function validate(source) {
  const lines = visibleLines(source);
  const findings = [];
  let inDesignSection = false;
  let tableCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      inDesignSection = heading[1] === "Design Contracts";
      continue;
    }
    if (!inDesignSection || !line.startsWith("|") || !/^\|[\s|:-]+\|$/.test(lines[i + 1] ?? "")) {
      continue;
    }

    tableCount++;
    if (tableCount > 1) {
      findings.push(finding(i + 1, "more than one Design Contracts table"));
      continue;
    }
    const headers = cells(line).map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const idColumn = headers.indexOf("shortid");
    const fileColumn = headers.indexOf("file");
    const purposeColumn = headers.indexOf("purpose");
    if (idColumn < 0 || fileColumn < 0 || purposeColumn < 0) {
      findings.push(finding(i + 1, "Short ID, File and Purpose columns are required"));
      continue;
    }

    const seen = new Set();
    for (let rowNumber = i + 2; rowNumber < lines.length; rowNumber++) {
      const row = lines[rowNumber] ?? "";
      if (!row.startsWith("|")) break;
      const values = cells(row);
      if (INACTIVE.test(values[purposeColumn] ?? "")) continue;
      const id = (values[idColumn] ?? "").replace(/[`*_]/g, "").toUpperCase();
      const fileCell = values[fileColumn] ?? "";
      const statedFile = /`([^`]+)`/.exec(fileCell)?.[1] ?? fileCell;
      const expectedFile = EXPECTED_FILES.get(id);
      const fileMatches =
        id === "DCON-032"
          ? fileCell.replace(/\s+/g, " ") === expectedFile
          : statedFile === expectedFile;
      if (seen.has(id)) findings.push(finding(rowNumber + 1, `duplicate active row: ${id}`));
      else if (expectedFile === undefined)
        findings.push(finding(rowNumber + 1, `unexpected active row: ${id || "(empty)"}`));
      else if (!fileMatches)
        findings.push(finding(rowNumber + 1, `File must name ${expectedFile}: ${id}`));
      seen.add(id);
    }
    for (const id of EXPECTED_FILES.keys()) {
      if (!seen.has(id)) findings.push(finding(i + 1, `missing active row: ${id}`));
    }
  }

  if (tableCount === 0) findings.push(finding(1, "Design Contracts table is missing"));
  return findings;
}

const indexPath = process.argv[2] ?? DEFAULT_INDEX;
if (process.argv.length > 3) {
  process.stderr.write(`::error::${RULE} expected at most one index path\n`);
  process.exitCode = 1;
} else {
  try {
    for (const item of validate(readFileSync(indexPath, "utf8"))) {
      process.stderr.write(
        `::error file=${indexPath},line=${item.line}::${RULE} ${item.message}\n`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `::error file=${indexPath}::${RULE} unable to read index: ${error.message}\n`,
    );
    process.exitCode = 1;
  }
}
