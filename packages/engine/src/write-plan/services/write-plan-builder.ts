import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { AccessGuidanceFile } from "../../access-guidance/types/access-guidance-file";
import type { AgentContentFile } from "../../agent-content/types/agent-content-file";
import type { AgentContentFileContent } from "../../agent-content/types/agent-content-file-content";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { ResourceLinkPageEdit } from "../../resource-links/types/resource-link-page-edit";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { WriteFileOperation } from "../types/write-file-operation";
import type { WriteHtmlPageEditOperation } from "../types/write-html-page-edit-operation";
import type { WriteOperation } from "../types/write-operation";
import type { WritePlanInput } from "../types/write-plan-input";
import type { WritePlanResult } from "../types/write-plan-result";

const OPENNAV_BLOCK_BEGIN_MARKER = "# Begin OpenNav AI";
const OPENNAV_BLOCK_END_MARKER = "# End OpenNav AI";

type WritePlanContributorKind =
  | "generated-file"
  | "page-edit"
  | "access-guidance-file";

interface PathStatFailure {
  readonly cause: unknown;
  readonly code: string | undefined;
}

interface PlannedAccessGuidanceFileTarget {
  readonly contributorKind: "access-guidance-file";
  readonly file: AccessGuidanceFile;
  readonly outputFilePath: EngineFilePath;
  readonly resolvedFilePath: string;
}

interface PlannedGeneratedFileTarget {
  readonly contributorKind: "generated-file";
  readonly file: AgentContentFile;
  readonly outputFilePath: EngineFilePath;
  readonly resolvedFilePath: string;
}

interface PlannedPageEditTarget {
  readonly contributorKind: "page-edit";
  readonly outputFilePath: EngineFilePath;
  readonly pageEdit: ResourceLinkPageEdit;
  readonly resolvedFilePath: string;
}

type PlannedWriteTarget =
  | PlannedAccessGuidanceFileTarget
  | PlannedGeneratedFileTarget
  | PlannedPageEditTarget;

type UnresolvedPlannedWriteTarget = PlannedWriteTarget extends infer Target
  ? Target extends PlannedWriteTarget
    ? Omit<Target, "resolvedFilePath">
    : never
  : never;

/**
 * Builds one dry-run write plan from all in-memory OpenNav output contributors.
 */
export class WritePlanBuilder {
  /**
   * Converts generated files, page edits, and access guidance into file operations.
   *
   * @param input - Static output folder plus all in-memory planned file changes.
   * @returns A dry-run write plan, or a typed OpenNav AI planning error.
   */
  public async build(
    input: WritePlanInput,
  ): Promise<Result<WritePlanResult, OpenNavError>> {
    const targetsResult = this.collectTargets(input);

    if (targetsResult.isErr()) {
      return err(targetsResult.error);
    }

    const operations: WriteOperation[] = [];

    for (const target of targetsResult.value) {
      const operationResult = await this.buildOperation(input, target);

      if (operationResult.isErr()) {
        return err(operationResult.error);
      }

      operations.push(operationResult.value);
    }

    return ok({
      plan: {
        operations,
      },
      warnings: [],
    });
  }

  private async buildOperation(
    input: WritePlanInput,
    target: PlannedWriteTarget,
  ): Promise<Result<WriteOperation, OpenNavError>> {
    if (target.contributorKind === "page-edit") {
      return await this.buildPageEditOperation(input, target);
    }

    return await this.buildFileOperation(input, target);
  }

  private async buildFileOperation(
    input: WritePlanInput,
    target: PlannedAccessGuidanceFileTarget | PlannedGeneratedFileTarget,
  ): Promise<Result<WriteFileOperation, OpenNavError>> {
    const operationKindResult = await this.determineFileOperationKind(
      input,
      target,
    );

    if (operationKindResult.isErr()) {
      return err(operationKindResult.error);
    }

    return ok({
      kind: operationKindResult.value,
      outputFilePath: target.outputFilePath,
      contentProvider:
        target.contributorKind === "generated-file"
          ? target.file
          : {
              getContent: async (): Promise<
                Result<AgentContentFileContent, OpenNavError>
              > =>
                ok({
                  content: target.file.content,
                  warnings: [],
                }),
            },
    });
  }

  private async buildPageEditOperation(
    input: WritePlanInput,
    target: PlannedPageEditTarget,
  ): Promise<Result<WriteHtmlPageEditOperation, OpenNavError>> {
    const targetExistsResult = await this.checkPageEditTarget(
      input,
      target.outputFilePath,
      target.resolvedFilePath,
    );

    if (targetExistsResult.isErr()) {
      return err(targetExistsResult.error);
    }

    return ok({
      kind: "edit-html-page",
      outputFilePath: target.outputFilePath,
      headInsertionOffset: target.pageEdit.headInsertionOffset,
      headLinkMarkup: target.pageEdit.headLinkMarkup,
      links: target.pageEdit.links,
    });
  }

  private async checkPageEditTarget(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
    resolvedFilePath: string,
  ): Promise<Result<void, OpenNavError>> {
    const statResult = await this.statPath(resolvedFilePath);

    if (statResult.isErr()) {
      if (statResult.error.code === "ENOENT") {
        return err(
          this.createPageEditTargetMissingError(input, outputFilePath),
        );
      }

      if (statResult.error.code === "ENOTDIR") {
        return err(
          this.createParentPathKindConflictError(input, outputFilePath),
        );
      }

      return err(
        this.createPathStatError(input, outputFilePath, statResult.error.cause),
      );
    }

    if (!statResult.value.isFile()) {
      return err(this.createFilePathKindConflictError(input, outputFilePath));
    }

    return ok(undefined);
  }

  private collectTargets(
    input: WritePlanInput,
  ): Result<readonly PlannedWriteTarget[], OpenNavError> {
    const targets: PlannedWriteTarget[] = [];
    const contributorsByResolvedPath = new Map<
      string,
      WritePlanContributorKind
    >();

    for (const file of input.generatedFiles) {
      const registerResult = this.registerTarget(
        input,
        contributorsByResolvedPath,
        targets,
        {
          contributorKind: "generated-file",
          file,
          outputFilePath: file.outputFilePath,
        },
      );

      if (registerResult.isErr()) {
        return err(registerResult.error);
      }
    }

    for (const pageEdit of input.pageEdits) {
      const registerResult = this.registerTarget(
        input,
        contributorsByResolvedPath,
        targets,
        {
          contributorKind: "page-edit",
          outputFilePath: pageEdit.sourceFilePath,
          pageEdit,
        },
      );

      if (registerResult.isErr()) {
        return err(registerResult.error);
      }
    }

    for (const file of input.accessGuidanceFiles) {
      const registerResult = this.registerTarget(
        input,
        contributorsByResolvedPath,
        targets,
        {
          contributorKind: "access-guidance-file",
          file,
          outputFilePath: file.outputFilePath,
        },
      );

      if (registerResult.isErr()) {
        return err(registerResult.error);
      }
    }

    return ok(targets);
  }

  private createDuplicateOutputFilePathError(
    outputFilePath: EngineFilePath,
    firstContributor: WritePlanContributorKind,
    duplicateContributor: WritePlanContributorKind,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_DUPLICATE_OUTPUT_FILE_PATH",
      message:
        "Multiple write plan contributors target the same output file path.",
      context: {
        outputFilePath,
        firstContributor,
        duplicateContributor,
      },
    };
  }

  private createFilePathKindConflictError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_PATH_KIND_CONFLICT",
      message: "A planned file path is not a writable file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createOutsideOutputDirectoryError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_OUTPUT_PATH_OUTSIDE_OUTPUT_DIRECTORY",
      message:
        "Write planning can only target files inside the output directory.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createPageEditTargetMissingError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_PAGE_EDIT_TARGET_MISSING",
      message:
        "A planned HTML page edit target is missing from the output directory.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createParentPathKindConflictError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_PATH_KIND_CONFLICT",
      message: "A parent path needed for a planned file is already a file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createPathStatError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_PATH_STAT_FAILED",
      message: "The write planner could not inspect a planned output path.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createProtectedOutputFileError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_PROTECTED_OUTPUT_FILE",
      message:
        "The write planner will not overwrite a caller-owned output file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createReadError(
    input: WritePlanInput,
    outputFilePath: EngineFilePath,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "WRITE_PLAN_FILE_READ_FAILED",
      message: "The write planner could not read an existing output file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private async determineFileOperationKind(
    input: WritePlanInput,
    target: PlannedAccessGuidanceFileTarget | PlannedGeneratedFileTarget,
  ): Promise<Result<WriteFileOperation["kind"], OpenNavError>> {
    const statResult = await this.statPath(target.resolvedFilePath);

    if (statResult.isErr()) {
      if (statResult.error.code === "ENOENT") {
        return ok("create-file");
      }

      if (statResult.error.code === "ENOTDIR") {
        return err(
          this.createParentPathKindConflictError(input, target.outputFilePath),
        );
      }

      return err(
        this.createPathStatError(
          input,
          target.outputFilePath,
          statResult.error.cause,
        ),
      );
    }

    if (!statResult.value.isFile()) {
      return err(
        this.createFilePathKindConflictError(input, target.outputFilePath),
      );
    }

    const existingContentResult = await ResultAsync.fromPromise(
      readFile(target.resolvedFilePath, "utf8"),
      (cause: unknown): OpenNavError =>
        this.createReadError(input, target.outputFilePath, cause),
    );

    if (existingContentResult.isErr()) {
      return err(existingContentResult.error);
    }

    if (this.canOverwriteExistingFile(target, existingContentResult.value)) {
      return ok("overwrite-file");
    }

    return err(
      this.createProtectedOutputFileError(input, target.outputFilePath),
    );
  }

  private canOverwriteAccessGuidanceFile(
    existingContent: string,
    plannedContent: string,
  ): boolean {
    return (
      this.hasValidOpenNavManagedBlock(plannedContent) &&
      this.normalizeCallerOwnedContent(
        this.removeOpenNavManagedBlocks(existingContent),
      ) ===
        this.normalizeCallerOwnedContent(
          this.removeOpenNavManagedBlocks(plannedContent),
        )
    );
  }

  private canOverwriteExistingFile(
    target: PlannedAccessGuidanceFileTarget | PlannedGeneratedFileTarget,
    existingContent: string,
  ): boolean {
    if (target.contributorKind === "access-guidance-file") {
      return this.canOverwriteAccessGuidanceFile(
        existingContent,
        target.file.content,
      );
    }

    return this.isOpenNavManagedGeneratedFile(
      target.outputFilePath,
      existingContent,
    );
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    return String(cause);
  }

  private getNodeErrorCode(cause: unknown): string | undefined {
    if (typeof cause !== "object" || cause === null || !("code" in cause)) {
      return undefined;
    }

    const code = cause.code;

    if (typeof code !== "string") {
      return undefined;
    }

    return code;
  }

  private countMarker(content: string, marker: string): number {
    let count = 0;
    let offset = content.indexOf(marker);

    while (offset !== -1) {
      count += 1;
      offset = content.indexOf(marker, offset + marker.length);
    }

    return count;
  }

  private findLineEndOffset(content: string, markerEndOffset: number): number {
    const nextNewlineOffset = content.indexOf("\n", markerEndOffset);

    if (nextNewlineOffset === -1) {
      return content.length;
    }

    return nextNewlineOffset + 1;
  }

  private hasValidOpenNavManagedBlock(content: string): boolean {
    const beginMarkerCount = this.countMarker(
      content,
      OPENNAV_BLOCK_BEGIN_MARKER,
    );
    const endMarkerCount = this.countMarker(content, OPENNAV_BLOCK_END_MARKER);
    const beginOffset = content.indexOf(OPENNAV_BLOCK_BEGIN_MARKER);
    const endOffset = content.indexOf(OPENNAV_BLOCK_END_MARKER);

    return (
      beginMarkerCount === 1 &&
      endMarkerCount === 1 &&
      beginOffset !== -1 &&
      endOffset > beginOffset &&
      content
        .slice(beginOffset, endOffset)
        .includes('opennav compatible="true"')
    );
  }

  private isInsideOutputDirectory(
    outputDirectory: string,
    resolvedFilePath: string,
  ): boolean {
    const resolvedOutputDirectory = resolve(outputDirectory);
    const relativeFilePath = relative(
      resolvedOutputDirectory,
      resolvedFilePath,
    );

    return (
      relativeFilePath !== "" &&
      !relativeFilePath.startsWith("..") &&
      !isAbsolute(relativeFilePath)
    );
  }

  private isOpenNavManagedGeneratedFile(
    outputFilePath: EngineFilePath,
    content: string,
  ): boolean {
    if (
      outputFilePath === ".well-known/opennav.json" &&
      content.includes('"opennav": true') &&
      content.includes('"build_fingerprint"')
    ) {
      return true;
    }

    return (
      content.includes('opennav compatible="true"') &&
      content.includes('manifest="/.well-known/opennav.json"')
    );
  }

  private normalizeCallerOwnedContent(content: string): string {
    return content.trimEnd();
  }

  private registerTarget(
    input: WritePlanInput,
    contributorsByResolvedPath: Map<string, WritePlanContributorKind>,
    targets: PlannedWriteTarget[],
    target: UnresolvedPlannedWriteTarget,
  ): Result<void, OpenNavError> {
    const resolvedFilePath = this.resolveFilePath(
      input.outputDirectory,
      target.outputFilePath,
    );

    if (
      !this.isInsideOutputDirectory(input.outputDirectory, resolvedFilePath)
    ) {
      return err(
        this.createOutsideOutputDirectoryError(input, target.outputFilePath),
      );
    }

    const firstContributor = contributorsByResolvedPath.get(resolvedFilePath);

    if (firstContributor !== undefined) {
      return err(
        this.createDuplicateOutputFilePathError(
          target.outputFilePath,
          firstContributor,
          target.contributorKind,
        ),
      );
    }

    contributorsByResolvedPath.set(resolvedFilePath, target.contributorKind);
    targets.push(this.resolveTarget(target, resolvedFilePath));

    return ok(undefined);
  }

  private resolveTarget(
    target: UnresolvedPlannedWriteTarget,
    resolvedFilePath: string,
  ): PlannedWriteTarget {
    if (target.contributorKind === "generated-file") {
      return {
        contributorKind: target.contributorKind,
        file: target.file,
        outputFilePath: target.outputFilePath,
        resolvedFilePath,
      };
    }

    if (target.contributorKind === "access-guidance-file") {
      return {
        contributorKind: target.contributorKind,
        file: target.file,
        outputFilePath: target.outputFilePath,
        resolvedFilePath,
      };
    }

    return {
      contributorKind: target.contributorKind,
      outputFilePath: target.outputFilePath,
      pageEdit: target.pageEdit,
      resolvedFilePath,
    };
  }

  private resolveFilePath(
    outputDirectory: string,
    outputFilePath: EngineFilePath,
  ): string {
    if (isAbsolute(outputFilePath)) {
      return resolve(outputFilePath);
    }

    return resolve(outputDirectory, outputFilePath);
  }

  private removeOpenNavManagedBlocks(content: string): string {
    const beginOffset = content.indexOf(OPENNAV_BLOCK_BEGIN_MARKER);

    if (beginOffset === -1) {
      return content;
    }

    const endMarkerOffset = content.indexOf(
      OPENNAV_BLOCK_END_MARKER,
      beginOffset + OPENNAV_BLOCK_BEGIN_MARKER.length,
    );

    if (endMarkerOffset === -1) {
      return content;
    }

    const endOffset = this.findLineEndOffset(
      content,
      endMarkerOffset + OPENNAV_BLOCK_END_MARKER.length,
    );

    return this.removeOpenNavManagedBlocks(
      `${content.slice(0, beginOffset)}${content.slice(endOffset)}`,
    );
  }

  private async statPath(
    resolvedFilePath: string,
  ): Promise<Result<Awaited<ReturnType<typeof lstat>>, PathStatFailure>> {
    return await ResultAsync.fromPromise(
      lstat(resolvedFilePath),
      (cause: unknown): PathStatFailure => ({
        cause,
        code: this.getNodeErrorCode(cause),
      }),
    );
  }
}
