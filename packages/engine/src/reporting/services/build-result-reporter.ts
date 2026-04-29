import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { DistWriteRecord } from "../../dist-write/types/dist-write-record";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { WriteOperation } from "../../write-plan/types/write-operation";
import type { BuildReport } from "../types/build-report";
import type { BuildResultReportDryRunInput } from "../types/build-result-report-dry-run-input";
import type { BuildResultReportFailureInput } from "../types/build-result-report-failure-input";
import type { BuildResultReportWriteInput } from "../types/build-result-report-write-input";

/**
 * Converts internal write planning and write records into the public build result shape.
 */
export class BuildResultReporter {
  /**
   * Reports the files a dry run would create, modify, or skip.
   *
   * @param input - Dry-run write plan plus skipped paths and accumulated warnings.
   * @returns A machine-readable successful build report.
   */
  public reportDryRun(
    input: BuildResultReportDryRunInput,
  ): Result<BuildReport, OpenNavError> {
    return ok({
      createdFilePaths: this.collectDryRunCreatedFilePaths(
        input.writePlan.operations,
      ),
      modifiedFilePaths: this.collectDryRunModifiedFilePaths(
        input.writePlan.operations,
      ),
      skippedFilePaths: input.skippedFilePaths,
      warnings: input.warnings,
    });
  }

  /**
   * Reports the files a completed build created, modified, or skipped.
   *
   * @param input - Applied write records plus skipped paths and accumulated warnings.
   * @returns A machine-readable successful build report.
   */
  public reportWrite(
    input: BuildResultReportWriteInput,
  ): Result<BuildReport, OpenNavError> {
    return ok({
      createdFilePaths: this.collectWrittenCreatedFilePaths(input.records),
      modifiedFilePaths: this.collectWrittenModifiedFilePaths(input.records),
      skippedFilePaths: input.skippedFilePaths,
      warnings: input.warnings,
    });
  }

  /**
   * Preserves a typed fatal build failure outside the success payload.
   *
   * @param input - Fatal typed error from the phase that stopped execution.
   * @returns The same typed error as an `err(OpenNavError)` result.
   */
  public reportFailure(
    input: BuildResultReportFailureInput,
  ): Result<BuildReport, OpenNavError> {
    return err(input.error);
  }

  private collectDryRunCreatedFilePaths(
    operations: readonly WriteOperation[],
  ): readonly EngineFilePath[] {
    const createdFilePaths: EngineFilePath[] = [];

    for (const operation of operations) {
      if (operation.kind === "create-file") {
        createdFilePaths.push(operation.outputFilePath);
      }
    }

    return createdFilePaths;
  }

  private collectDryRunModifiedFilePaths(
    operations: readonly WriteOperation[],
  ): readonly EngineFilePath[] {
    const modifiedFilePaths: EngineFilePath[] = [];

    for (const operation of operations) {
      if (
        operation.kind === "overwrite-file" ||
        operation.kind === "edit-html-page"
      ) {
        modifiedFilePaths.push(operation.outputFilePath);
      }
    }

    return modifiedFilePaths;
  }

  private collectWrittenCreatedFilePaths(
    records: readonly DistWriteRecord[],
  ): readonly EngineFilePath[] {
    const createdFilePaths: EngineFilePath[] = [];

    for (const record of records) {
      if (record.kind === "created-file") {
        createdFilePaths.push(record.outputFilePath);
      }
    }

    return createdFilePaths;
  }

  private collectWrittenModifiedFilePaths(
    records: readonly DistWriteRecord[],
  ): readonly EngineFilePath[] {
    const modifiedFilePaths: EngineFilePath[] = [];

    for (const record of records) {
      if (
        record.kind === "overwritten-file" ||
        record.kind === "edited-html-page"
      ) {
        modifiedFilePaths.push(record.outputFilePath);
      }
    }

    return modifiedFilePaths;
  }
}
