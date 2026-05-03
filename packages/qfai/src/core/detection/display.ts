import type { DetectionFinding, DetectionLocation } from "./types.js";

/**
 * Heuristic regex patterns for JSX-only (display-only) component detection.
 * The detector is intentionally NOT AST-based; the design rationale for
 * choosing regex over AST is recorded in the development repository
 * spec for the React component-classification skill.
 */

const STATE_HOOK_RE = /\buseState\b/;
const EFFECT_HOOK_RE = /\buseEffect\b/;
const EVENT_HANDLER_RE = /\bon[A-Z]\w+\s*[=:]/;
const LOGIC_INDICATORS_RE = /\b(if|switch|for|while|try|await|\.map|\.filter|\.reduce)\b/;
const JSX_RETURN_RE = /return\s*\(/;
const JSX_TAG_RE = /<[A-Za-z][A-Za-z0-9.]*[\s/>]/;

export class DisplayDetector {
  detect(code: string): DetectionFinding[] {
    const findings: DetectionFinding[] = [];
    const components = this.extractComponents(code);

    for (const comp of components) {
      const body = comp.body;

      // Disqualify if there's logic, state, effects, or handlers
      if (
        STATE_HOOK_RE.test(body) ||
        EFFECT_HOOK_RE.test(body) ||
        EVENT_HANDLER_RE.test(body) ||
        LOGIC_INDICATORS_RE.test(body)
      ) {
        continue;
      }

      // Must contain JSX
      if (!(JSX_RETURN_RE.test(body) && JSX_TAG_RE.test(body))) {
        continue;
      }

      const location: DetectionLocation = {
        functionName: comp.name,
        pattern: "jsx-only-component",
      };

      findings.push({
        type: "display-only",
        confidence: 0.85,
        locations: [location],
        context: `Component '${comp.name}' contains only JSX rendering with no logic, state, or effects.`,
      });
    }

    return findings;
  }

  private extractComponents(code: string): Array<{ name: string; body: string }> {
    const results: Array<{ name: string; body: string }> = [];

    // Match: function Name(...) { ... }
    const funcRe = /\bfunction\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = funcRe.exec(code)) !== null) {
      const name = m[0] ? m[1] : undefined;
      if (!name) continue;
      const bodyStart = m.index + m[0].length;
      const body = this.extractBraceBlock(code, bodyStart);
      if (body !== null) {
        results.push({ name, body });
      }
    }

    // Match: const Name = (...) => { ... }
    const arrowRe = /\b(?:const|let)\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\{/g;
    while ((m = arrowRe.exec(code)) !== null) {
      const name = m[1];
      if (!name) continue;
      const bodyStart = m.index + m[0].length;
      const body = this.extractBraceBlock(code, bodyStart);
      if (body !== null) {
        results.push({ name, body });
      }
    }

    return results;
  }

  /** Extract content between balanced braces starting after the opening brace */
  private extractBraceBlock(code: string, start: number): string | null {
    let depth = 1;
    let i = start;
    while (i < code.length && depth > 0) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
      i++;
    }
    if (depth !== 0) return null;
    return code.slice(start, i - 1);
  }
}
