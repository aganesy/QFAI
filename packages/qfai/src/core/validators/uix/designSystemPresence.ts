import { stat, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";

const REQUIRED_SECTIONS = ["Visual Theme", "Color Palette", "Do's and Don'ts"] as const;
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|placeholder|example|lorem|none)$/i;

function normalizeApostrophes(s: string): string {
  return s.replace(/[\u2019\u02BC]/g, "'");
}

function extractSectionBody(content: string, heading: string): string | null {
  const lines = content.split("\n");
  const target = `## ${normalizeApostrophes(heading).toLowerCase()}`;
  const start = lines.findIndex(
    (line) => normalizeApostrophes(line.trim()).toLowerCase() === target,
  );
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function isPlaceholderOnly(body: string): boolean {
  const tokens = body
    .split(/\s+/)
    .map((t) => t.replace(/^[-*#>`_]+|[-*#>`_]+$/g, "").trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  return tokens.every((t) => PLACEHOLDER_RE.test(t));
}

function ds01(): Issue {
  return {
    code: "UIX-VAL-DS01",
    severity: "error",
    category: "canonical",
    message: "UI-bearing pack is missing required file `uiux/12_design_system.md`.",
    file: "uiux/12_design_system.md",
    suggested_action:
      "Create uiux/12_design_system.md with Visual Theme, Color Palette, and Do's and Don'ts sections populated.",
  };
}

function ds02(section: string): Issue {
  return {
    code: "UIX-VAL-DS02",
    severity: "error",
    category: "canonical",
    message: `uiux/12_design_system.md required section '${section}' is missing or contains only placeholder content.`,
    file: "uiux/12_design_system.md",
    suggested_action: `Populate required section '${section}' with actual design system content.`,
  };
}

function readError(errnoCode: string): Issue {
  return {
    code: "UIX-VAL-DS-READ-ERROR",
    severity: "error",
    category: "canonical",
    message: `uiux/12_design_system.md could not be read (${errnoCode}).`,
    file: "uiux/12_design_system.md",
    suggested_action: "Ensure uiux/12_design_system.md is readable by the validator process.",
  };
}

export async function validateDesignSystemPresence(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];
  const filePath = path.join(root, "uiux", "12_design_system.md");

  try {
    await stat(filePath);
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") return [ds01()];
    return [readError(code ?? "READ-ERROR")];
  }

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as NodeJS.ErrnoException).code
        : undefined;
    return [readError(code ?? "READ-ERROR")];
  }

  const issues: Issue[] = [];
  for (const section of REQUIRED_SECTIONS) {
    const body = extractSectionBody(content, section);
    if (body === null || isPlaceholderOnly(body)) {
      issues.push(ds02(section));
    }
  }
  return issues;
}
