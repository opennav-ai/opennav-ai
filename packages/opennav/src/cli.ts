#!/usr/bin/env node
import type { Result } from "neverthrow";
import { runOpenNavCli } from "./cli-commander";
import type { OpenNavError } from "./types/open-nav-build";

void runOpenNavCli(process.argv).then(
  (cliResult: Result<void, OpenNavError>): void => {
    if (cliResult.isErr()) {
      console.error(cliResult.error.message);
      process.exitCode = 1;
    }
  },
);
