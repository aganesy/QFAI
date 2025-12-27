import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const targets = [
  "README.md",
  "packages/qfai/README.md",
  "CHANGELOG.md",
  "RELEASE.md",
  "package.json",
  "packages/qfai/package.json",
];

const bidiRanges = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

const bidiSingles = new Set([0x200e, 0x200f, 0x061c]);
const bomCode = 0xfeff;

const hits = [];

function isBidiCode(code) {
  if (bidiSingles.has(code)) {
    return true;
  }
  return bidiRanges.some(([start, end]) => code >= start && code <= end);
}

function classifyCode(code) {
  if (code === bomCode) {
    return "bom";
  }
  if (isBidiCode(code)) {
    return "bidi";
  }
  return null;
}

for (const relative of targets) {
  const filePath = path.resolve(relative);
  if (!existsSync(filePath)) {
    continue;
  }
  const text = readFileSync(filePath, "utf-8");
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const kind = classifyCode(code);
    if (kind) {
      hits.push({
        file: relative,
        index: i,
        kind,
        code: `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
      });
    }
  }
}

if (hits.length > 0) {
  for (const hit of hits) {
    const label = hit.kind === "bom" ? "BOM" : "bidi/control";
    console.error(
      `${hit.file}: ${label} character ${hit.code} at index ${hit.index}`,
    );
  }
  process.exit(1);
}

console.log("No bidi/control/BOM characters found.");
