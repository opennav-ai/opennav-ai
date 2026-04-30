import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { ResourceLink } from "../../resource-links/types/resource-link";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { WriteFileOperation } from "../../write-plan/types/write-file-operation";
import type { WriteHtmlPageEditOperation } from "../../write-plan/types/write-html-page-edit-operation";
import type { WriteOperation } from "../../write-plan/types/write-operation";
import type { DistWriteInput } from "../types/dist-write-input";
import type { DistWriteRecord } from "../types/dist-write-record";
import type { DistWriteResult } from "../types/dist-write-result";

interface DistWriteOperationResult {
  readonly record: DistWriteRecord;
  readonly warnings: readonly OpenNavError[];
}

interface PathOperationFailure {
  readonly cause: unknown;
  readonly code: string | undefined;
}

interface ResolvedOperationTarget {
  readonly outputFilePath: EngineFilePath;
  readonly resolvedFilePath: string;
}

interface SourceRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

interface HtmlAttribute {
  readonly name: string;
  readonly value: string;
}

/**
 * Applies an approved write plan to a built static output folder.
 */
export class DistFileWriter {
  /**
   * Writes every operation from an approved plan in order.
   *
   * @param input - Output directory and write plan already approved by `WritePlanBuilder`.
   * @returns Applied write records and warnings, or a typed write-time failure.
   */
  public async write(
    input: DistWriteInput,
  ): Promise<Result<DistWriteResult, OpenNavError>> {
    const records: DistWriteRecord[] = [];
    const warnings: OpenNavError[] = [];

    for (const operation of input.plan.operations) {
      const operationResult = await this.writeOperation(input, operation);

      if (operationResult.isErr()) {
        return err(operationResult.error);
      }

      records.push(operationResult.value.record);
      warnings.push(...operationResult.value.warnings);
    }

    return ok({
      records,
      warnings,
    });
  }

  private async writeOperation(
    input: DistWriteInput,
    operation: WriteOperation,
  ): Promise<Result<DistWriteOperationResult, OpenNavError>> {
    if (operation.kind === "edit-html-page") {
      return await this.writeHtmlPageEditOperation(input, operation);
    }

    return await this.writeFileOperation(input, operation);
  }

  private async writeFileOperation(
    input: DistWriteInput,
    operation: WriteFileOperation,
  ): Promise<Result<DistWriteOperationResult, OpenNavError>> {
    const targetResult = this.resolveOperationTarget(
      input,
      operation.outputFilePath,
    );

    if (targetResult.isErr()) {
      return err(targetResult.error);
    }

    if (operation.kind === "create-file") {
      return await this.createFile(input, operation, targetResult.value);
    }

    return await this.overwriteFile(input, operation, targetResult.value);
  }

  private async createFile(
    input: DistWriteInput,
    operation: WriteFileOperation,
    target: ResolvedOperationTarget,
  ): Promise<Result<DistWriteOperationResult, OpenNavError>> {
    const missingResult = await this.ensureCreateTargetIsMissing(input, target);

    if (missingResult.isErr()) {
      return err(missingResult.error);
    }

    const parentDirectoryResult = await this.ensureParentDirectoryExists(
      input,
      target,
    );

    if (parentDirectoryResult.isErr()) {
      return err(parentDirectoryResult.error);
    }

    const contentResult = await operation.contentProvider.getContent();

    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const writeResult = await ResultAsync.fromPromise(
      writeFile(target.resolvedFilePath, contentResult.value.content, {
        encoding: "utf8",
        flag: "wx",
      }),
      (cause: unknown): OpenNavError =>
        this.createCreateFileWriteError(input, target, cause),
    );

    if (writeResult.isErr()) {
      return err(writeResult.error);
    }

    return ok({
      record: {
        kind: "created-file",
        outputFilePath: operation.outputFilePath,
      },
      warnings: contentResult.value.warnings,
    });
  }

  private async overwriteFile(
    input: DistWriteInput,
    operation: WriteFileOperation,
    target: ResolvedOperationTarget,
  ): Promise<Result<DistWriteOperationResult, OpenNavError>> {
    const targetExistsResult = await this.ensureOverwriteTargetIsFile(
      input,
      target,
    );

    if (targetExistsResult.isErr()) {
      return err(targetExistsResult.error);
    }

    const contentResult = await operation.contentProvider.getContent();

    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    const replaceResult = await this.replaceExistingFileContent(
      input,
      target,
      contentResult.value.content,
    );

    if (replaceResult.isErr()) {
      return err(replaceResult.error);
    }

    return ok({
      record: {
        kind: "overwritten-file",
        outputFilePath: operation.outputFilePath,
      },
      warnings: contentResult.value.warnings,
    });
  }

  private async writeHtmlPageEditOperation(
    input: DistWriteInput,
    operation: WriteHtmlPageEditOperation,
  ): Promise<Result<DistWriteOperationResult, OpenNavError>> {
    const targetResult = this.resolveOperationTarget(
      input,
      operation.outputFilePath,
    );

    if (targetResult.isErr()) {
      return err(targetResult.error);
    }

    const contentResult = await this.readExistingHtmlPage(
      input,
      targetResult.value,
      operation,
    );

    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    if (
      !this.hasPlannedHeadInsertionPoint(
        contentResult.value,
        operation.headInsertionOffset,
      )
    ) {
      return err(
        this.createStaleHtmlPageEditError(input, targetResult.value, operation),
      );
    }

    const updatedContent = this.buildUpdatedHtmlPageContent(
      contentResult.value,
      operation,
    );

    const replaceResult = await this.replaceExistingFileContent(
      input,
      targetResult.value,
      updatedContent,
    );

    if (replaceResult.isErr()) {
      return err(replaceResult.error);
    }

    return ok({
      record: {
        kind: "edited-html-page",
        outputFilePath: operation.outputFilePath,
      },
      warnings: [],
    });
  }

  private buildUpdatedHtmlPageContent(
    content: string,
    operation: WriteHtmlPageEditOperation,
  ): string {
    const existingResourceLinkRanges = this.findExistingResourceLinkRanges(
      content,
      operation,
    );
    const contentWithoutExistingLinks = this.removeSourceRanges(
      content,
      existingResourceLinkRanges,
    );
    const contentAfterHead = contentWithoutExistingLinks.slice(
      operation.headInsertionOffset,
    );
    const normalizedContentAfterHead =
      existingResourceLinkRanges.length === 0
        ? contentAfterHead
        : contentAfterHead.replace(/^(?:[ \t]*\r?\n)+/u, "");
    const headLinkMarkup =
      existingResourceLinkRanges.length === 0
        ? operation.headLinkMarkup
        : `${operation.headLinkMarkup}\n`;

    return `${contentWithoutExistingLinks.slice(
      0,
      operation.headInsertionOffset,
    )}${headLinkMarkup}${normalizedContentAfterHead}`;
  }

  private async ensureCreateTargetIsMissing(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): Promise<Result<void, OpenNavError>> {
    const statResult = await this.statPath(target.resolvedFilePath);

    if (statResult.isOk()) {
      return err(this.createStaleCreateTargetError(input, target));
    }

    if (statResult.error.code === "ENOENT") {
      return ok(undefined);
    }

    if (statResult.error.code === "ENOTDIR") {
      return err(this.createParentPathKindConflictError(input, target));
    }

    return err(this.createPathStatError(input, target, statResult.error.cause));
  }

  private async ensureOverwriteTargetIsFile(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): Promise<Result<void, OpenNavError>> {
    const statResult = await this.statPath(target.resolvedFilePath);

    if (statResult.isErr()) {
      if (statResult.error.code === "ENOENT") {
        return err(this.createStaleOverwriteTargetError(input, target));
      }

      if (statResult.error.code === "ENOTDIR") {
        return err(this.createParentPathKindConflictError(input, target));
      }

      return err(
        this.createPathStatError(input, target, statResult.error.cause),
      );
    }

    if (!statResult.value.isFile()) {
      return err(this.createFilePathKindConflictError(input, target));
    }

    return ok(undefined);
  }

  private async ensureParentDirectoryExists(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): Promise<Result<void, OpenNavError>> {
    const directoryResult = await ResultAsync.fromPromise(
      mkdir(dirname(target.resolvedFilePath), { recursive: true }),
      (cause: unknown): OpenNavError => {
        const code = this.getNodeErrorCode(cause);

        if (code === "EEXIST" || code === "ENOTDIR") {
          return this.createParentPathKindConflictError(input, target);
        }

        return this.createDirectoryCreateError(input, target, cause);
      },
    );

    if (directoryResult.isErr()) {
      return err(directoryResult.error);
    }

    return ok(undefined);
  }

  private async readExistingHtmlPage(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    operation: WriteHtmlPageEditOperation,
  ): Promise<Result<string, OpenNavError>> {
    const targetExistsResult = await this.ensureHtmlEditTargetIsFile(
      input,
      target,
      operation,
    );

    if (targetExistsResult.isErr()) {
      return err(targetExistsResult.error);
    }

    const contentResult = await ResultAsync.fromPromise(
      readFile(target.resolvedFilePath, "utf8"),
      (cause: unknown): OpenNavError =>
        this.createReadError(input, target, cause),
    );

    if (contentResult.isErr()) {
      return err(contentResult.error);
    }

    return ok(contentResult.value);
  }

  private async ensureHtmlEditTargetIsFile(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    operation: WriteHtmlPageEditOperation,
  ): Promise<Result<void, OpenNavError>> {
    const statResult = await this.statPath(target.resolvedFilePath);

    if (statResult.isErr()) {
      if (statResult.error.code === "ENOENT") {
        return err(this.createStaleHtmlPageEditError(input, target, operation));
      }

      if (statResult.error.code === "ENOTDIR") {
        return err(this.createParentPathKindConflictError(input, target));
      }

      return err(
        this.createPathStatError(input, target, statResult.error.cause),
      );
    }

    if (!statResult.value.isFile()) {
      return err(this.createFilePathKindConflictError(input, target));
    }

    return ok(undefined);
  }

  private async replaceExistingFileContent(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    content: string,
  ): Promise<Result<void, OpenNavError>> {
    const tempFilePath = this.createTempFilePath(target.resolvedFilePath);
    const tempWriteResult = await ResultAsync.fromPromise(
      writeFile(tempFilePath, content, { encoding: "utf8", flag: "wx" }),
      (cause: unknown): OpenNavError =>
        this.createWriteError(input, target, cause),
    );

    if (tempWriteResult.isErr()) {
      return err(tempWriteResult.error);
    }

    const targetStillFileResult = await this.ensureOverwriteTargetIsFile(
      input,
      target,
    );

    if (targetStillFileResult.isErr()) {
      await this.removeTempFile(tempFilePath);
      return err(targetStillFileResult.error);
    }

    const renameResult = await ResultAsync.fromPromise(
      rename(tempFilePath, target.resolvedFilePath),
      (cause: unknown): OpenNavError =>
        this.createWriteError(input, target, cause),
    );

    if (renameResult.isErr()) {
      await this.removeTempFile(tempFilePath);
      return err(renameResult.error);
    }

    return ok(undefined);
  }

  private async removeTempFile(tempFilePath: string): Promise<void> {
    await ResultAsync.fromPromise(
      rm(tempFilePath, { force: true }),
      (): undefined => undefined,
    );
  }

  private hasPlannedHeadInsertionPoint(
    content: string,
    headInsertionOffset: number,
  ): boolean {
    if (
      !Number.isInteger(headInsertionOffset) ||
      headInsertionOffset < 0 ||
      headInsertionOffset > content.length
    ) {
      return false;
    }

    return /<head\b[^>]*>$/i.test(content.slice(0, headInsertionOffset));
  }

  private findExistingResourceLinkRanges(
    content: string,
    operation: WriteHtmlPageEditOperation,
  ): readonly SourceRange[] {
    const document = parse(content, {
      sourceCodeLocationInfo: true,
    });
    const headElement = this.findFirstElement(
      document,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "head",
    );

    if (headElement === undefined) {
      return [];
    }

    const ranges: SourceRange[] = [];

    for (const linkElement of this.findElements(
      headElement,
      (element: DefaultTreeAdapterTypes.Element): boolean =>
        element.tagName === "link",
    )) {
      if (
        !this.shouldRemoveExistingResourceLink(linkElement, operation.links)
      ) {
        continue;
      }

      const location = linkElement.sourceCodeLocation;

      if (location === undefined || location === null) {
        continue;
      }

      if (location.startOffset < operation.headInsertionOffset) {
        continue;
      }

      ranges.push(
        this.expandRangeToWholeLine(content, {
          startOffset: location.startOffset,
          endOffset: location.endOffset,
        }),
      );
    }

    return this.mergeSourceRanges(ranges);
  }

  private shouldRemoveExistingResourceLink(
    element: DefaultTreeAdapterTypes.Element,
    links: readonly ResourceLink[],
  ): boolean {
    return (
      this.isOpenNavManagedResourceLink(element) ||
      this.matchesPlannedResourceLink(element, links)
    );
  }

  private isOpenNavManagedResourceLink(
    element: DefaultTreeAdapterTypes.Element,
  ): boolean {
    return (
      this.getHtmlAttribute(element, "data-opennav") === "resource-link" ||
      this.getHtmlAttribute(element, "data-opennav-sha")?.startsWith(
        "sha256:",
      ) === true
    );
  }

  private matchesPlannedResourceLink(
    element: DefaultTreeAdapterTypes.Element,
    links: readonly ResourceLink[],
  ): boolean {
    const relation = this.getHtmlAttribute(element, "rel");
    const mediaType = this.getHtmlAttribute(element, "type");
    const href = this.getHtmlAttribute(element, "href");
    const title = this.getHtmlAttribute(element, "title");

    return links.some(
      (link: ResourceLink): boolean =>
        relation === link.relation &&
        mediaType === link.mediaType &&
        href === link.href &&
        title === link.title,
    );
  }

  private getHtmlAttribute(
    element: DefaultTreeAdapterTypes.Element,
    name: string,
  ): string | undefined {
    return element.attrs.find(
      (attribute: HtmlAttribute): boolean =>
        attribute.name.toLowerCase() === name,
    )?.value;
  }

  private findElements(
    node: DefaultTreeAdapterTypes.Node,
    predicate: (element: DefaultTreeAdapterTypes.Element) => boolean,
  ): readonly DefaultTreeAdapterTypes.Element[] {
    const elements: DefaultTreeAdapterTypes.Element[] = [];
    this.collectElements(node, predicate, elements);

    return elements;
  }

  private collectElements(
    node: DefaultTreeAdapterTypes.Node,
    predicate: (element: DefaultTreeAdapterTypes.Element) => boolean,
    elements: DefaultTreeAdapterTypes.Element[],
  ): void {
    if (this.isElement(node) && predicate(node)) {
      elements.push(node);
    }

    if (!this.isParentNode(node)) {
      return;
    }

    for (const childNode of node.childNodes) {
      this.collectElements(childNode, predicate, elements);
    }
  }

  private findFirstElement(
    node: DefaultTreeAdapterTypes.Node,
    predicate: (element: DefaultTreeAdapterTypes.Element) => boolean,
  ): DefaultTreeAdapterTypes.Element | undefined {
    if (this.isElement(node) && predicate(node)) {
      return node;
    }

    if (!this.isParentNode(node)) {
      return undefined;
    }

    for (const childNode of node.childNodes) {
      const foundElement = this.findFirstElement(childNode, predicate);

      if (foundElement !== undefined) {
        return foundElement;
      }
    }

    return undefined;
  }

  private isElement(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.Element {
    return "tagName" in node;
  }

  private isParentNode(
    node: DefaultTreeAdapterTypes.Node,
  ): node is DefaultTreeAdapterTypes.ParentNode {
    return "childNodes" in node;
  }

  private expandRangeToWholeLine(
    content: string,
    range: SourceRange,
  ): SourceRange {
    let startOffset = range.startOffset;
    let endOffset = range.endOffset;

    while (
      startOffset > 0 &&
      this.isHorizontalWhitespace(content[startOffset - 1])
    ) {
      startOffset -= 1;
    }

    while (
      endOffset < content.length &&
      this.isHorizontalWhitespace(content[endOffset])
    ) {
      endOffset += 1;
    }

    if (content.slice(endOffset, endOffset + 2) === "\r\n") {
      endOffset += 2;
    } else if (content[endOffset] === "\n") {
      endOffset += 1;
    }

    return {
      startOffset,
      endOffset,
    };
  }

  private isHorizontalWhitespace(character: string | undefined): boolean {
    return character === " " || character === "\t";
  }

  private mergeSourceRanges(
    ranges: readonly SourceRange[],
  ): readonly SourceRange[] {
    const sortedRanges = [...ranges].sort(
      (first: SourceRange, second: SourceRange): number =>
        first.startOffset - second.startOffset,
    );
    const mergedRanges: SourceRange[] = [];

    for (const range of sortedRanges) {
      const previousRange = mergedRanges.at(-1);

      if (
        previousRange !== undefined &&
        range.startOffset <= previousRange.endOffset
      ) {
        mergedRanges[mergedRanges.length - 1] = {
          startOffset: previousRange.startOffset,
          endOffset: Math.max(previousRange.endOffset, range.endOffset),
        };
        continue;
      }

      mergedRanges.push(range);
    }

    return mergedRanges;
  }

  private removeSourceRanges(
    content: string,
    ranges: readonly SourceRange[],
  ): string {
    let updatedContent = content;

    for (const range of [...ranges].sort(
      (first: SourceRange, second: SourceRange): number =>
        second.startOffset - first.startOffset,
    )) {
      updatedContent = `${updatedContent.slice(
        0,
        range.startOffset,
      )}${updatedContent.slice(range.endOffset)}`;
    }

    return updatedContent;
  }

  private resolveOperationTarget(
    input: DistWriteInput,
    outputFilePath: EngineFilePath,
  ): Result<ResolvedOperationTarget, OpenNavError> {
    const resolvedFilePath = resolve(input.outputDirectory, outputFilePath);

    if (
      !this.isInsideOutputDirectory(input.outputDirectory, resolvedFilePath)
    ) {
      return err(this.createOutsideOutputDirectoryError(input, outputFilePath));
    }

    return ok({
      outputFilePath,
      resolvedFilePath,
    });
  }

  private async statPath(
    resolvedFilePath: string,
  ): Promise<Result<Stats, PathOperationFailure>> {
    return await ResultAsync.fromPromise(
      lstat(resolvedFilePath),
      (cause: unknown): PathOperationFailure => ({
        cause,
        code: this.getNodeErrorCode(cause),
      }),
    );
  }

  private createTempFilePath(resolvedFilePath: string): string {
    return resolve(
      dirname(resolvedFilePath),
      `.opennav-${basename(resolvedFilePath)}-${randomUUID()}.tmp`,
    );
  }

  private createDirectoryCreateError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_DIRECTORY_CREATE_FAILED",
      message:
        "The writer could not create a parent directory for a planned file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createCreateFileWriteError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    cause: unknown,
  ): OpenNavError {
    const code = this.getNodeErrorCode(cause);

    if (code === "EEXIST") {
      return this.createStaleCreateTargetError(input, target);
    }

    if (code === "ENOTDIR") {
      return this.createParentPathKindConflictError(input, target);
    }

    return this.createWriteError(input, target, cause);
  }

  private createFilePathKindConflictError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_PATH_KIND_CONFLICT",
      message: "A planned output path is not writable as a file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
      },
    };
  }

  private createOutsideOutputDirectoryError(
    input: DistWriteInput,
    outputFilePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_OUTPUT_PATH_OUTSIDE_OUTPUT_DIRECTORY",
      message:
        "Dist writing can only apply operations inside the output directory.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath,
      },
    };
  }

  private createParentPathKindConflictError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_PATH_KIND_CONFLICT",
      message: "A parent path needed for a planned file is already a file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
      },
    };
  }

  private createPathStatError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_PATH_STAT_FAILED",
      message: "The writer could not inspect a planned output path.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createReadError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_FILE_READ_FAILED",
      message: "The writer could not read an existing output file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createStaleCreateTargetError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_STALE_CREATE_TARGET",
      message: "A create-file operation target already exists at write time.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
      },
    };
  }

  private createStaleHtmlPageEditError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    operation: WriteHtmlPageEditOperation,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_STALE_HTML_PAGE_EDIT",
      message:
        "A planned HTML page edit no longer matches the current file content.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
        headInsertionOffset: operation.headInsertionOffset,
      },
    };
  }

  private createStaleOverwriteTargetError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
  ): OpenNavError {
    return {
      code: "DIST_WRITE_STALE_OVERWRITE_TARGET",
      message: "An overwrite-file operation target is missing at write time.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
      },
    };
  }

  private createWriteError(
    input: DistWriteInput,
    target: ResolvedOperationTarget,
    cause: unknown,
  ): OpenNavError {
    const code = this.getNodeErrorCode(cause);

    if (code === "ENOTDIR") {
      return this.createParentPathKindConflictError(input, target);
    }

    return {
      code: "DIST_WRITE_FILE_WRITE_FAILED",
      message: "The writer could not write a planned output file.",
      context: {
        outputDirectory: input.outputDirectory,
        outputFilePath: target.outputFilePath,
        cause: this.describeCause(cause),
      },
    };
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
}
