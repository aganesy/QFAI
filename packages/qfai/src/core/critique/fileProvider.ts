/**
 * File provider — reads a predefined critique response from a JSON file
 * for offline/reproducible critique (BR-0029-0006).
 */

import { readFile } from "node:fs/promises";
import type { CritiqueInput, CritiqueProvider, CritiqueResponse } from "./types.js";

export type FileProviderOptions = {
  critiquePath: string;
};

export class FileProvider implements CritiqueProvider {
  readonly name = "file-provider";
  private critiquePath: string;

  constructor(options: FileProviderOptions) {
    this.critiquePath = options.critiquePath;
  }

  async request(_input: CritiqueInput, _signal?: AbortSignal): Promise<CritiqueResponse> {
    const content = await readFile(this.critiquePath, "utf-8");
    return JSON.parse(content) as CritiqueResponse;
  }
}
