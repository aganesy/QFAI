/* global console */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const INSTRUCTIONS_DIR = path.resolve(".github", "instructions");
const MAX_CHARS = 4000;

if (!existsSync(INSTRUCTIONS_DIR)) {
  console.log(`Instructions directory not found (${INSTRUCTIONS_DIR}). Skipping size check.`);
  process.exit(0);
}

const files = readdirSync(INSTRUCTIONS_DIR).filter((f) => f.endsWith(".instructions.md"));

const violations = [];

for (const file of files) {
  const filePath = path.join(INSTRUCTIONS_DIR, file);
  const content = readFileSync(filePath, "utf-8");
  if (content.length > MAX_CHARS) {
    violations.push({ file, length: content.length });
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(
      `${v.file}: ${v.length} chars (exceeds ${MAX_CHARS} char limit by ${v.length - MAX_CHARS})`,
    );
  }
  process.exit(1);
}

console.log(`All ${files.length} instructions file(s) are within the ${MAX_CHARS} char limit.`);
