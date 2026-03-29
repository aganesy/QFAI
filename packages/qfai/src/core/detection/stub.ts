import type { DetectionFinding, DetectionLocation } from "./types.js";

const THROW_NOT_IMPL_RE =
  /throw\s+(?:new\s+Error\s*\(\s*['"]not\s+implemented['"]\s*\)|['"]not\s+implemented['"])/i;

const TODO_FIXME_RE = /\/\/\s*(?:TODO|FIXME)/i;

export class StubDetector {
  detect(code: string): DetectionFinding[] {
    const findings: DetectionFinding[] = [];
    const stubLocations: DetectionLocation[] = [];
    const realLocations: string[] = [];

    const methods = this.extractMethods(code);

    for (const method of methods) {
      if (this.isStubMethod(method.body)) {
        stubLocations.push({
          functionName: method.name,
          pattern: this.classifyStubPattern(method.body),
        });
      } else {
        realLocations.push(method.name);
      }
    }

    if (stubLocations.length === 0) {
      return findings;
    }

    const totalMethods = stubLocations.length + realLocations.length;

    if (realLocations.length === 0) {
      findings.push({
        type: "stub-only",
        confidence: 0.95,
        locations: stubLocations,
        context: `All ${totalMethods} method(s) are stubs.`,
      });
    } else {
      findings.push({
        type: "partial-stub",
        confidence: 0.8,
        locations: stubLocations,
        context: `${stubLocations.length} of ${totalMethods} method(s) are stubs: ${stubLocations.map((l) => l.functionName).join(", ")}.`,
      });
    }

    return findings;
  }

  private extractMethods(code: string): Array<{ name: string; body: string }> {
    const results: Array<{ name: string; body: string }> = [];
    const keywords = new Set(["if", "for", "while", "switch", "catch", "class", "function"]);

    // Match method-like patterns: name(...) {
    const methodRe = /\b(\w+)\s*\([^)]*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = methodRe.exec(code)) !== null) {
      const name = m[1];
      if (!name || keywords.has(name)) continue;

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

  private isStubMethod(body: string): boolean {
    const trimmed = body.trim();
    if (trimmed === "") {
      return true;
    }
    if (THROW_NOT_IMPL_RE.test(trimmed)) {
      return true;
    }
    // TODO/FIXME with no meaningful code (only comments and whitespace remain)
    if (TODO_FIXME_RE.test(trimmed)) {
      const withoutComments = trimmed.replace(/\/\/[^\n]*/g, "").trim();
      if (withoutComments === "") {
        return true;
      }
    }
    return false;
  }

  private classifyStubPattern(body: string): string {
    const trimmed = body.trim();
    if (trimmed === "") {
      return "empty-body";
    }
    if (THROW_NOT_IMPL_RE.test(trimmed)) {
      return "throw-not-implemented";
    }
    if (TODO_FIXME_RE.test(trimmed)) {
      return "todo-empty-impl";
    }
    return "unknown-stub";
  }
}
