import { escapeRegExp } from "../regex.js";

export type FencedCodeBlock = {
  language: string | null;
  content: string;
  startLine: number;
};

const MERMAID_LINE_RE =
  /(^|\n)\s*(?:sequenceDiagram|flowchart|erDiagram|classDiagram|stateDiagram(?:-v2)?|journey|gantt|mindmap)\b/i;

export function extractFencedCodeBlocks(text: string): FencedCodeBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: FencedCodeBlock[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const startMatch = lines[i]?.match(/^\s*(`{3,}|~{3,})([^\r\n]*)$/);
    if (!startMatch?.[1]) {
      continue;
    }

    const fenceToken = startMatch[1];
    const info = (startMatch[2] ?? "").trim();
    const languageToken = info.split(/\s+/)[0] ?? "";
    const language = languageToken.length > 0 ? languageToken.toLowerCase() : null;

    const fenceChar = fenceToken[0] ?? "";
    if (fenceChar.length === 0) {
      continue;
    }
    const closeFenceRe = new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`);

    const blockLines: string[] = [];
    let cursor = i + 1;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (closeFenceRe.test(line)) {
        break;
      }
      blockLines.push(line);
    }

    blocks.push({
      language,
      content: blockLines.join("\n"),
      startLine: i + 1,
    });

    i = cursor;
  }

  return blocks;
}

export function containsMermaidSyntax(content: string): boolean {
  return MERMAID_LINE_RE.test(content);
}

/** The line that declares a Mermaid diagram, trimmed, and its line offset in the block. */
export type DiagramDeclaration = {
  line: string;
  lineOffset: number;
};

/**
 * The diagram's declaration: the first line that is neither blank, nor a `%%`
 * comment, nor inside a leading `---` front-matter block. A front-matter block
 * that never closes leaves no declaration. Line offsets count `\n` breaks after
 * `\r\n` is folded, as `extractFencedCodeBlocks` counts them.
 */
export function findDiagramDeclaration(content: string): DiagramDeclaration | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let frontMatter: "possible" | "open" | "done" = "possible";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (frontMatter === "open") {
      if (line === "---") frontMatter = "done";
      continue;
    }
    if (line === "" || line.startsWith("%%")) continue;
    if (line === "---" && frontMatter === "possible") {
      frontMatter = "open";
      continue;
    }
    return { line, lineOffset: index };
  }
  return null;
}
