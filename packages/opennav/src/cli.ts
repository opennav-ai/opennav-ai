#!/usr/bin/env node
import type { OpenNavError } from "@opennav-ai/engine";
import { err, type Result } from "neverthrow";

/**
 * Runs the OpenNav command-line entrypoint.
 *
 * @param args - Command-line arguments after the executable name.
 * @returns A typed result for command execution.
 */
export function OpenNavCli(
  args: readonly string[],
): Result<void, OpenNavError> {
  return err({
    code: "OPENNAV_CLI_NOT_IMPLEMENTED",
    message:
      "OpenNav CLI command behavior is stubbed until the static command is implemented.",
    context: {
      args,
    },
  });
}

const cliResult = OpenNavCli(process.argv.slice(2));

if (cliResult.isErr()) {
  console.error(cliResult.error.message);
  process.exitCode = 1;
}
