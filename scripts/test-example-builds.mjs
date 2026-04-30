import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoDirectory = resolve(scriptDirectory, "..");

const child = spawn(
  process.execPath,
  ["--experimental-strip-types", "examples/tests/next-static-legacy.ts"],
  {
    cwd: repoDirectory,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
