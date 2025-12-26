import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

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

const bidiSingles = new Set([0x200e, 0x200f, 0x061c, 0xfeff]);

const hits = [];

for (const relative of targets) {
  const filePath = path.resolve(relative);
  if (!existsSync(filePath)) {
    continue;
  }
  const text = readFileSync(filePath, "utf-8");
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (isBidiCode(code)) {
      hits.push({
        file: relative,
        index: i,
        code: `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
      });
    }
  }
}

if (hits.length > 0) {
  for (const hit of hits) {
    process.stderr.write(
      `${hit.file}: bidi/control character ${hit.code} at index ${hit.index}\n`,
    );
  }
  process.exit(1);
}

process.stdout.write("No bidi/control characters found.\n");

function isBidiCode(code) {
  if (bidiSingles.has(code)) {
    return true;
  }
  return bidiRanges.some(([start, end]) => code >= start && code <= end);
}
