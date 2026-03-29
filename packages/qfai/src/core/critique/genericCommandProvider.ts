/**
 * Generic command provider — executes an external process and parses
 * the structured critique response from stdout (BR-0029-0003, BR-0029-0005).
 *
 * Arguments are sanitized to prevent command injection (NFR-0006, POL-001).
 */

import { execFile } from "node:child_process";
import type { CritiqueInput, CritiqueProvider, CritiqueResponse } from "./types.js";

export type GenericCommandProviderOptions = {
  name: string;
  command: string;
  args: string[];
  timeoutMs?: number;
};

// Only strip null bytes and control characters; execFile doesn't use shell
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

export class GenericCommandProvider implements CritiqueProvider {
  readonly name: string;
  private command: string;
  private argTemplates: string[];
  private timeoutMs: number;

  constructor(options: GenericCommandProviderOptions) {
    this.name = options.name;
    this.command = options.command;
    this.argTemplates = options.args;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  sanitizeArg(arg: string): string {
    return arg.replace(CONTROL_CHARS, "");
  }

  async request(input: CritiqueInput, signal?: AbortSignal): Promise<CritiqueResponse> {
    const args = this.argTemplates.map((template) =>
      template
        .replace("${output}", this.sanitizeArg(input.output))
        .replace("${context}", this.sanitizeArg(input.context))
        .replace("${iteration}", String(input.iteration)),
    );

    return new Promise<CritiqueResponse>((resolve, reject) => {
      const child = execFile(
        this.command,
        args,
        { timeout: this.timeoutMs, signal },
        (error, stdout) => {
          if (error) {
            const err = error instanceof Error ? error : new Error("Command execution failed");
            reject(err);
            return;
          }
          try {
            const parsed = JSON.parse(stdout) as CritiqueResponse;
            resolve(parsed);
          } catch {
            const truncated = stdout.length > 200 ? stdout.slice(0, 200) + "..." : stdout;
            reject(new Error(`Failed to parse critique response: ${truncated}`));
          }
        },
      );

      // Ensure child is killed on timeout
      child.on("error", (err) => reject(err instanceof Error ? err : new Error(String(err))));
    });
  }
}
