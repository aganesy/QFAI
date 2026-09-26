import { defaultConfig } from "../../src/core/config.js";

/** Exercises retained parsers against migration-era fixtures only. */
export const legacyLayoutConfig = {
  ...defaultConfig,
  paths: {
    ...defaultConfig.paths,
    specsDir: ".qfai/specs",
    contractsDir: ".qfai/contracts",
  },
};
