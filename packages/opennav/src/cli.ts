#!/usr/bin/env node
import type { OpenNavError } from "@opennav-ai/engine";
import type { Result } from "neverthrow";
import { runOpenNavCli } from "./cli-commander";

void runOpenNavCli(process.argv).then(
  (cliResult: Result<void, OpenNavError>): void => {
    if (cliResult.isErr()) {
      console.error(cliResult.error.message);
      process.exitCode = 1;
    }
  },
);
