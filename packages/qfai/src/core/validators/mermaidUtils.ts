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
    const language =
      languageToken.length > 0 ? languageToken.toLowerCase() : null;

    const fenceChar = fenceToken[0] ?? "";
    if (fenceChar.length === 0) {
      continue;
    }
    const closeFenceRe = new RegExp(
      `^\\s*${escapeRegExp(fenceChar)}{${fenceToken.length},}\\s*$`,
    );

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
