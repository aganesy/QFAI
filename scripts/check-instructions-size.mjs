/* global console */
/**
 * Limit the listed default instruction files and their AGENTS ancestor chains.
 *
 * This is a static source-byte budget. Host settings and instruction discovery
 * can change what is loaded; this check does not measure session context.
 *
 * | File                                       | Held to                                  |
 * | ------------------------------------------ | ---------------------------------------- |
 * | Entry files (listed below)                 | 200 lines; 100 is the target, not a gate  |
 * | Each listed AGENTS file and ancestor chain | 32768 raw UTF-8 bytes                    |
 * | `.github/instructions/*.instructions.md`   | 4000 characters each                     |
 *
 * A file above the ceiling is pinned at its length in
 * `scripts/entry-file-size-pins.json` and may not get longer. A file shorter
 * than its pin passes and prints the length to pin; a file that reaches the
 * ceiling has its pin removed.
 *
 * Paths are relative to the working directory. Only listed AGENTS files join
 * a chain; host-global files and discovery overrides are outside this check.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const INSTRUCTIONS_DIR = path.resolve(".github", "instructions");
const MAX_CHARS = 4000;

const CEILING_LINES = 200;
const TARGET_LINES = 100;
const CODEX_MAX_BYTES = 32768;

/** Entry files. A file that is absent is skipped. */
const ENTRY_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/copilot-instructions.md",
  "packages/qfai/assets/init/root/AGENTS.md",
  "packages/qfai/assets/init/root/CLAUDE.md",
];

const PINS_FILE = path.resolve("scripts", "entry-file-size-pins.json");

const lineCount = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/** The pins, and the reasons they cannot be used. */
function loadPins() {
  if (!existsSync(PINS_FILE)) return { pins: {}, problems: [] };
  let pins;
  try {
    pins = JSON.parse(readFileSync(PINS_FILE, "utf-8"));
  } catch (error) {
    return { pins: {}, problems: [`${PINS_FILE}: ${error.message}`] };
  }
  const problems = [];
  for (const [file, pin] of Object.entries(pins)) {
    if (!ENTRY_FILES.includes(file)) problems.push(`${file}: pinned but not an entry file`);
    if (!Number.isInteger(pin) || pin <= CEILING_LINES) {
      problems.push(
        `${file}: pin ${JSON.stringify(pin)} is not a line count above ${CEILING_LINES}`,
      );
    }
  }
  return { pins, problems };
}

function checkEntryFiles(pins) {
  const problems = [];
  const notes = [];
  const agents = [];

  for (const file of ENTRY_FILES) {
    const pin = pins[file];
    if (!existsSync(file)) {
      if (pin !== undefined) {
        problems.push(`${file}: pinned at ${pin} lines but the file is absent; remove its pin`);
      }
      continue;
    }
    const content = readFileSync(file);
    const lines = lineCount(content.toString("utf-8"));

    if (lines <= CEILING_LINES) {
      if (pin !== undefined) {
        problems.push(`${file}: ${lines} lines, within the ceiling; remove its pin of ${pin}`);
      } else if (lines > TARGET_LINES) {
        notes.push(`${file}: ${lines} lines, above the ${TARGET_LINES}-line target`);
      }
    } else if (pin === undefined) {
      problems.push(`${file}: ${lines} lines, over the ${CEILING_LINES}-line ceiling`);
    } else if (lines > pin) {
      problems.push(`${file}: ${lines} lines, over its pin of ${pin}`);
    } else if (lines < pin) {
      notes.push(`${file}: ${lines} lines, under its pin of ${pin}; lower the pin to ${lines}`);
    } else {
      notes.push(`${file}: ${lines} lines, held at its pin (ceiling ${CEILING_LINES})`);
    }

    if (path.basename(file) === "AGENTS.md") {
      agents.push({ file, directory: path.dirname(path.resolve(file)), bytes: content.length });
      if (content.length > CODEX_MAX_BYTES) {
        problems.push(`${file}: ${content.length} bytes, over the ${CODEX_MAX_BYTES}-byte limit`);
      }
    }
  }

  for (const target of agents) {
    const chain = agents.filter((entry) => {
      const relative = path.relative(entry.directory, target.directory);
      return (
        relative === "" ||
        (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
      );
    });
    if (chain.length < 2) continue;
    const total = chain.reduce((sum, entry) => sum + entry.bytes, 0);
    if (total > CODEX_MAX_BYTES) {
      const files = chain.map((entry) => `${entry.file} (${entry.bytes} bytes)`).join(" -> ");
      problems.push(
        `AGENTS chain for ${target.file}: ${files}; ${total} bytes total, over the ${CODEX_MAX_BYTES}-byte limit`,
      );
    }
  }
  return { problems, notes };
}

function checkInstructionsDir() {
  if (!existsSync(INSTRUCTIONS_DIR)) {
    return { problems: [], note: `Instructions directory not found (${INSTRUCTIONS_DIR}).` };
  }
  const files = readdirSync(INSTRUCTIONS_DIR).filter((f) => f.endsWith(".instructions.md"));
  const problems = [];
  for (const file of files) {
    const length = readFileSync(path.join(INSTRUCTIONS_DIR, file), "utf-8").length;
    if (length > MAX_CHARS) {
      problems.push(
        `${file}: ${length} chars (exceeds ${MAX_CHARS} char limit by ${length - MAX_CHARS})`,
      );
    }
  }
  return {
    problems,
    note: `All ${files.length} instructions file(s) are within the ${MAX_CHARS} char limit.`,
  };
}

const { pins, problems: pinProblems } = loadPins();
const entries = checkEntryFiles(pins);
const instructions = checkInstructionsDir();

for (const note of [...entries.notes, instructions.note]) console.log(note);

const problems = [...pinProblems, ...entries.problems, ...instructions.problems];
for (const problem of problems) console.error(problem);
process.exit(problems.length > 0 ? 1 : 0);
