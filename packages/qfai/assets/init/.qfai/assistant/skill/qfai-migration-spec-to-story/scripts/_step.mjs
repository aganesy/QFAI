import process from "node:process";

export async function runStepScript(step) {
  let packageModule;
  try {
    packageModule = await import("qfai");
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && error.message?.includes("'qfai'")) {
      process.stderr.write("Install qfai in this project with `npm install --save-dev qfai`.\n");
      process.exitCode = 2;
      return;
    }
    throw error;
  }

  process.exitCode = await packageModule.runMigrationStep(step, process.argv.slice(2));
}
