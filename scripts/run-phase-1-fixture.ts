import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import {
  Engine,
  type EngineExecuteInput,
  type EngineExecuteResult,
  type OpenNavError,
} from "../packages/engine/src/index.ts";

interface ManualFixtureRunSuccessReport {
  readonly ok: true;
  readonly outputDirectory: string;
  readonly result: EngineExecuteResult;
}

interface ManualFixtureRunFailureReport {
  readonly ok: false;
  readonly outputDirectory: string;
  readonly error: OpenNavError;
}

type ManualFixtureRunReport =
  | ManualFixtureRunFailureReport
  | ManualFixtureRunSuccessReport;

interface PhaseOneFixtureRunnerInput {
  readonly buildResultFilePath: string;
  readonly fixtureDistDirectory: string;
  readonly manualRunDirectory: string;
  readonly outputDirectory: string;
}

class PhaseOneFixtureRunner {
  readonly #buildResultFilePath: string;
  readonly #fixtureDistDirectory: string;
  readonly #manualRunDirectory: string;
  readonly #outputDirectory: string;

  public constructor(input: PhaseOneFixtureRunnerInput) {
    this.#buildResultFilePath = input.buildResultFilePath;
    this.#fixtureDistDirectory = input.fixtureDistDirectory;
    this.#manualRunDirectory = input.manualRunDirectory;
    this.#outputDirectory = input.outputDirectory;
  }

  /**
   * Copies the Phase 1 fixture to the manual run directory and writes OpenNav files into that copy.
   *
   * @returns The JSON report printed by the script and written to `build-result.json`.
   */
  public async run(): Promise<Result<ManualFixtureRunReport, OpenNavError>> {
    const prepareResult = await this.prepareManualRunDirectory();

    if (prepareResult.isErr()) {
      return err(prepareResult.error);
    }

    const engineResult = await Engine.execute(this.createEngineInput(), {
      dryRun: false,
    });
    const report: ManualFixtureRunReport = engineResult.isOk()
      ? {
          ok: true,
          outputDirectory: this.#outputDirectory,
          result: engineResult.value,
        }
      : {
          ok: false,
          outputDirectory: this.#outputDirectory,
          error: engineResult.error,
        };
    const writeReportResult = await this.writeReport(report);

    if (writeReportResult.isErr()) {
      return err(writeReportResult.error);
    }

    return ok(report);
  }

  private async prepareManualRunDirectory(): Promise<
    Result<void, OpenNavError>
  > {
    const cleanResult = await ResultAsync.fromPromise(
      rm(this.#manualRunDirectory, { force: true, recursive: true }),
      (cause: unknown): OpenNavError =>
        this.createFileSystemError({
          code: "MANUAL_FIXTURE_CLEAN_FAILED",
          message:
            "The manual fixture runner could not reset the output folder.",
          path: this.#manualRunDirectory,
          cause,
        }),
    );

    if (cleanResult.isErr()) {
      return err(cleanResult.error);
    }

    const createDirectoryResult = await ResultAsync.fromPromise(
      mkdir(this.#manualRunDirectory, { recursive: true }),
      (cause: unknown): OpenNavError =>
        this.createFileSystemError({
          code: "MANUAL_FIXTURE_DIRECTORY_CREATE_FAILED",
          message:
            "The manual fixture runner could not create the output folder.",
          path: this.#manualRunDirectory,
          cause,
        }),
    );

    if (createDirectoryResult.isErr()) {
      return err(createDirectoryResult.error);
    }

    const copyFixtureResult = await ResultAsync.fromPromise(
      cp(this.#fixtureDistDirectory, this.#outputDirectory, {
        recursive: true,
      }),
      (cause: unknown): OpenNavError =>
        this.createFileSystemError({
          code: "MANUAL_FIXTURE_COPY_FAILED",
          message:
            "The manual fixture runner could not copy the fixture dist folder.",
          path: this.#fixtureDistDirectory,
          cause,
        }),
    );

    if (copyFixtureResult.isErr()) {
      return err(copyFixtureResult.error);
    }

    return ok(undefined);
  }

  private createEngineInput(): EngineExecuteInput {
    return {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory: this.#outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };
  }

  private async writeReport(
    report: ManualFixtureRunReport,
  ): Promise<Result<void, OpenNavError>> {
    return await ResultAsync.fromPromise(
      writeFile(
        this.#buildResultFilePath,
        `${JSON.stringify(report, null, 2)}\n`,
        "utf8",
      ),
      (cause: unknown): OpenNavError =>
        this.createFileSystemError({
          code: "MANUAL_FIXTURE_RESULT_WRITE_FAILED",
          message:
            "The manual fixture runner could not write build-result.json.",
          path: this.#buildResultFilePath,
          cause,
        }),
    );
  }

  private createFileSystemError(input: {
    readonly cause: unknown;
    readonly code: string;
    readonly message: string;
    readonly path: string;
  }): OpenNavError {
    return {
      code: input.code,
      message: input.message,
      context: {
        path: input.path,
        cause: this.describeCause(input.cause),
      },
    };
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    return String(cause);
  }
}

const manualRunDirectory = fileURLToPath(
  new URL(
    "../packages/engine/.manual-runs/phase-1-small-site/",
    import.meta.url,
  ),
);
const outputDirectory = join(manualRunDirectory, "dist");
const runner = new PhaseOneFixtureRunner({
  buildResultFilePath: join(manualRunDirectory, "build-result.json"),
  fixtureDistDirectory: fileURLToPath(
    new URL(
      "../packages/engine/fixtures/phase-1-small-site/dist/",
      import.meta.url,
    ),
  ),
  manualRunDirectory,
  outputDirectory,
});
const runResult = await runner.run();
const report: ManualFixtureRunReport = runResult.isOk()
  ? runResult.value
  : {
      ok: false,
      outputDirectory,
      error: runResult.error,
    };

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (report.ok === false) {
  process.exitCode = 1;
}
