import { spawn } from "node:child_process";
import { readFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { createInterface, type Interface } from "node:readline/promises";
import { Command } from "commander";

const PACKAGE_NAME = "@opennav-ai/opennav";
const PACKAGE_JSON_PATH = "packages/opennav/package.json";
const CHANGELOG_PATH = "packages/opennav/CHANGELOG.md";

type ReleaseMode = "dry-run" | "live";
type ReleaseChannel = "proper" | "beta" | "alpha" | "rc";
type ReleaseBump = "patch" | "minor" | "major" | "promote" | "continue";

interface ReleaseCommandOptions {
  readonly bump?: string | undefined;
  readonly channel?: string | undefined;
  readonly dryRun?: boolean | undefined;
  readonly live?: boolean | undefined;
  readonly skipPublishedCheck?: boolean | undefined;
}

interface ShellCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

interface PromptOption<TValue extends string> {
  readonly description?: string | undefined;
  readonly label: string;
  readonly value: TValue;
}

interface SemVerVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease:
    | {
        readonly identifier: string;
        readonly number: number;
      }
    | undefined;
}

interface ReleasePlan {
  readonly bump: ReleaseBump;
  readonly channel: ReleaseChannel;
  readonly githubPrerelease: boolean;
  readonly gitTagName: string;
  readonly localVersion: string;
  readonly npmDistTag: string;
  readonly publishedVersion: string | undefined;
  readonly targetVersion: string;
}

interface ReleasePlanInput {
  readonly bump: ReleaseBump;
  readonly channel: ReleaseChannel;
  readonly localVersion: string;
  readonly publishedVersion: string | undefined;
}

class ReleasePrompt {
  readonly #interface: Interface;

  public constructor() {
    this.#interface = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Asks a yes/no question with a default answer.
   *
   * @param question - User-facing question printed to the terminal.
   * @param defaultValue - Answer used when the user presses enter.
   * @returns The selected boolean answer.
   */
  public async confirm(
    question: string,
    defaultValue: boolean,
  ): Promise<boolean> {
    const suffix = defaultValue ? "Y/n" : "y/N";

    while (true) {
      const answer = (
        await this.#interface.question(`${question} (${suffix}) `)
      )
        .trim()
        .toLowerCase();

      if (answer === "") {
        return defaultValue;
      }

      if (answer === "y" || answer === "yes") {
        return true;
      }

      if (answer === "n" || answer === "no") {
        return false;
      }

      console.log("Please answer yes or no.");
    }
  }

  /**
   * Asks the user to choose one option from a numbered list.
   *
   * @param question - User-facing question printed before the options.
   * @param options - Selectable values shown to the user.
   * @param defaultValue - Value used when the user presses enter.
   * @returns The selected option value.
   */
  public async select<TValue extends string>(
    question: string,
    options: readonly PromptOption<TValue>[],
    defaultValue: TValue,
  ): Promise<TValue> {
    const defaultIndex = options.findIndex(
      (option: PromptOption<TValue>): boolean => option.value === defaultValue,
    );
    const defaultNumber = defaultIndex + 1;

    while (true) {
      console.log(question);

      for (const [index, option] of options.entries()) {
        const number = index + 1;
        const defaultMarker = option.value === defaultValue ? " (default)" : "";
        const description =
          option.description === undefined ? "" : ` - ${option.description}`;
        console.log(
          `  ${number}. ${option.label}${defaultMarker}${description}`,
        );
      }

      const answer = (
        await this.#interface.question(`Choose [${defaultNumber}]: `)
      )
        .trim()
        .toLowerCase();

      if (answer === "") {
        return defaultValue;
      }

      const selectedByNumber = Number(answer);

      if (
        Number.isInteger(selectedByNumber) &&
        selectedByNumber >= 1 &&
        selectedByNumber <= options.length
      ) {
        return options[selectedByNumber - 1].value;
      }

      const selectedByValue = options.find(
        (option: PromptOption<TValue>): boolean =>
          option.value === answer || option.label.toLowerCase() === answer,
      );

      if (selectedByValue !== undefined) {
        return selectedByValue.value;
      }

      console.log("Please choose one of the listed options.");
    }
  }

  /**
   * Closes the prompt input stream after the release flow completes.
   *
   * @returns Nothing.
   */
  public close(): void {
    this.#interface.close();
  }
}

class ShellCommandRunner {
  readonly #cwd: string;

  public constructor(cwd: string) {
    this.#cwd = cwd;
  }

  /**
   * Runs a command and returns captured output.
   *
   * @param command - Executable to run.
   * @param args - Command arguments passed without shell interpolation.
   * @returns Exit code and captured stdout/stderr.
   */
  public async capture(
    command: string,
    args: readonly string[],
    timeoutMs: number | undefined = undefined,
  ): Promise<ShellCommandResult> {
    return await new Promise<ShellCommandResult>(
      (resolveResult: (result: ShellCommandResult) => void): void => {
        const child = spawn(command, [...args], {
          cwd: this.#cwd,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let completed = false;
        const timeout =
          timeoutMs === undefined
            ? undefined
            : setTimeout((): void => {
                if (completed) {
                  return;
                }

                completed = true;
                child.kill("SIGTERM");
                resolveResult({
                  exitCode: 1,
                  stdout,
                  stderr: `Command timed out after ${timeoutMs}ms.`,
                });
              }, timeoutMs);

        const clearCompletionTimeout = (): void => {
          if (timeout !== undefined) {
            clearTimeout(timeout);
          }
        };

        child.stdout.on("data", (chunk: Buffer): void => {
          stdout += chunk.toString("utf8");
        });

        child.stderr.on("data", (chunk: Buffer): void => {
          stderr += chunk.toString("utf8");
        });

        child.on("error", (error: Error): void => {
          if (completed) {
            return;
          }

          completed = true;
          clearCompletionTimeout();
          resolveResult({
            exitCode: 1,
            stdout,
            stderr: error.message,
          });
        });

        child.on("close", (code: number | null): void => {
          if (completed) {
            return;
          }

          completed = true;
          clearCompletionTimeout();
          resolveResult({
            exitCode: code ?? 1,
            stdout,
            stderr,
          });
        });
      },
    );
  }

  /**
   * Runs a command with inherited terminal output.
   *
   * @param command - Executable to run.
   * @param args - Command arguments passed without shell interpolation.
   * @returns Exit code and empty captured output.
   */
  public async run(
    command: string,
    args: readonly string[],
  ): Promise<ShellCommandResult> {
    return await new Promise<ShellCommandResult>(
      (resolveResult: (result: ShellCommandResult) => void): void => {
        const child = spawn(command, [...args], {
          cwd: this.#cwd,
          stdio: "inherit",
        });
        let completed = false;

        child.on("error", (error: Error): void => {
          if (completed) {
            return;
          }

          completed = true;
          resolveResult({
            exitCode: 1,
            stdout: "",
            stderr: error.message,
          });
        });

        child.on("close", (code: number | null): void => {
          if (completed) {
            return;
          }

          completed = true;
          resolveResult({
            exitCode: code ?? 1,
            stdout: "",
            stderr: "",
          });
        });
      },
    );
  }
}

class NpmPackageVersionReader {
  readonly #packageJsonPath: string;
  readonly #shell: ShellCommandRunner;

  public constructor(input: {
    readonly packageJsonPath: string;
    readonly shell: ShellCommandRunner;
  }) {
    this.#packageJsonPath = input.packageJsonPath;
    this.#shell = input.shell;
  }

  /**
   * Reads the current workspace package version from `packages/opennav/package.json`.
   *
   * @returns The local package version string.
   */
  public async readLocalVersion(): Promise<string> {
    const contents = await readFile(this.#packageJsonPath, "utf8");
    const parsed: unknown = JSON.parse(contents);

    if (!this.isRecord(parsed) || typeof parsed.version !== "string") {
      throw new Error(
        `Could not read a string version from ${this.#packageJsonPath}.`,
      );
    }

    return parsed.version;
  }

  /**
   * Reads the current published package version from npm.
   *
   * @returns The published version, or `undefined` when npm cannot return one.
   */
  public async readPublishedVersion(): Promise<string | undefined> {
    const result = await this.#shell.capture(
      "npm",
      ["view", PACKAGE_NAME, "version"],
      15_000,
    );

    if (result.exitCode !== 0) {
      console.log(
        ["Could not read the published npm version.", result.stderr.trim()]
          .filter((line: string): boolean => line.length > 0)
          .join("\n"),
      );
      return undefined;
    }

    const version = result.stdout.trim();

    return version.length === 0 ? undefined : version;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

class OpenNavVersionPlanner {
  /**
   * Builds the release plan from local package state and user choices.
   *
   * @param input - Local version, published version, release channel, and bump choice.
   * @returns Concrete target version, npm tag, git tag, and GitHub release mode.
   */
  public createPlan(input: ReleasePlanInput): ReleasePlan {
    const localVersion = this.parseVersion(input.localVersion);
    const targetVersion =
      input.channel === "proper"
        ? this.createProperVersion(localVersion, input.bump)
        : this.createPrereleaseVersion(localVersion, input.channel, input.bump);
    const npmDistTag = input.channel === "proper" ? "latest" : input.channel;

    return {
      bump: input.bump,
      channel: input.channel,
      githubPrerelease: input.channel !== "proper",
      gitTagName: `opennav-v${targetVersion}`,
      localVersion: input.localVersion,
      npmDistTag,
      publishedVersion: input.publishedVersion,
      targetVersion,
    };
  }

  /**
   * Checks whether the supplied version is a prerelease for a release channel.
   *
   * @param version - Version string read from package metadata.
   * @param channel - Prerelease channel to compare against.
   * @returns Whether the version has the same prerelease identifier.
   */
  public isPrereleaseForChannel(
    version: string,
    channel: ReleaseChannel,
  ): boolean {
    if (channel === "proper") {
      return false;
    }

    return this.parseVersion(version).prerelease?.identifier === channel;
  }

  /**
   * Checks whether the supplied version has any prerelease identifier.
   *
   * @param version - Version string read from package metadata.
   * @returns Whether the version contains a prerelease suffix.
   */
  public isPrerelease(version: string): boolean {
    return this.parseVersion(version).prerelease !== undefined;
  }

  private createProperVersion(
    version: SemVerVersion,
    bump: ReleaseBump,
  ): string {
    if (bump === "promote" && version.prerelease !== undefined) {
      return this.formatVersion({
        major: version.major,
        minor: version.minor,
        patch: version.patch,
        prerelease: undefined,
      });
    }

    return this.formatVersion(this.incrementVersion(version, bump));
  }

  private createPrereleaseVersion(
    version: SemVerVersion,
    channel: Exclude<ReleaseChannel, "proper">,
    bump: ReleaseBump,
  ): string {
    if (bump === "continue" && version.prerelease?.identifier === channel) {
      return this.formatVersion({
        major: version.major,
        minor: version.minor,
        patch: version.patch,
        prerelease: {
          identifier: channel,
          number: version.prerelease.number + 1,
        },
      });
    }

    const baseVersion = this.incrementVersion(version, bump);

    return this.formatVersion({
      major: baseVersion.major,
      minor: baseVersion.minor,
      patch: baseVersion.patch,
      prerelease: {
        identifier: channel,
        number: 0,
      },
    });
  }

  private incrementVersion(
    version: SemVerVersion,
    bump: ReleaseBump,
  ): SemVerVersion {
    if (bump === "major") {
      return {
        major: version.major + 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
      };
    }

    if (bump === "minor") {
      return {
        major: version.major,
        minor: version.minor + 1,
        patch: 0,
        prerelease: undefined,
      };
    }

    return {
      major: version.major,
      minor: version.minor,
      patch: version.patch + 1,
      prerelease: undefined,
    };
  }

  private parseVersion(version: string): SemVerVersion {
    const match = version.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)\.(\d+))?$/,
    );

    if (match === null) {
      throw new Error(`Version ${version} is not supported by this helper.`);
    }

    const [, major, minor, patch, identifier, prereleaseNumber] = match;

    return {
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
      prerelease:
        identifier === undefined || prereleaseNumber === undefined
          ? undefined
          : {
              identifier,
              number: Number(prereleaseNumber),
            },
    };
  }

  private formatVersion(version: SemVerVersion): string {
    const baseVersion = `${version.major}.${version.minor}.${version.patch}`;

    if (version.prerelease === undefined) {
      return baseVersion;
    }

    return `${baseVersion}-${version.prerelease.identifier}.${version.prerelease.number}`;
  }
}

class OpenNavReleaseCommand {
  readonly #cwd: string;
  readonly #prompt: ReleasePrompt;
  readonly #shell: ShellCommandRunner;
  readonly #versionPlanner: OpenNavVersionPlanner;
  readonly #versionReader: NpmPackageVersionReader;

  public constructor(cwd: string) {
    this.#cwd = cwd;
    this.#prompt = new ReleasePrompt();
    this.#shell = new ShellCommandRunner(cwd);
    this.#versionPlanner = new OpenNavVersionPlanner();
    this.#versionReader = new NpmPackageVersionReader({
      packageJsonPath: resolve(cwd, PACKAGE_JSON_PATH),
      shell: this.#shell,
    });
  }

  /**
   * Runs the guided OpenNav package release workflow.
   *
   * @param argv - Full process arguments supplied to the script.
   * @returns Nothing.
   */
  public async run(argv: readonly string[]): Promise<void> {
    const options = this.parseOptions(argv);

    try {
      const mode = await this.selectMode(options);
      const localVersion = await this.#versionReader.readLocalVersion();
      const publishedVersion =
        options.skipPublishedCheck === true
          ? undefined
          : await this.#versionReader.readPublishedVersion();

      this.printVersionSummary(localVersion, publishedVersion, mode);

      const channel =
        this.parseChannelOption(options.channel) ??
        (await this.selectChannel());
      const bump =
        this.parseBumpOption(options.bump) ??
        (await this.selectBump(localVersion, channel));
      this.validateBump(localVersion, channel, bump);
      const plan = this.#versionPlanner.createPlan({
        bump,
        channel,
        localVersion,
        publishedVersion,
      });

      this.printPlan(plan, mode);

      await this.runReleaseSteps(plan, mode);
    } finally {
      this.#prompt.close();
    }
  }

  private parseOptions(argv: readonly string[]): ReleaseCommandOptions {
    const program = new Command();

    program
      .name("release-opennav")
      .description("Guided release helper for @opennav-ai/opennav.")
      .option(
        "--channel <channel>",
        "Release channel: proper, beta, alpha, or rc.",
      )
      .option(
        "--bump <bump>",
        "Version bump: patch, minor, major, promote, or continue.",
      )
      .option("--dry-run", "Force the guided walkthrough to skip commands.")
      .option(
        "--live",
        "Allow confirmed release commands to run. Each mutating step still asks first.",
      )
      .option(
        "--skip-published-check",
        "Skip reading the currently published npm version.",
      );

    program.parse([...argv]);

    const options = program.opts<ReleaseCommandOptions>();

    if (options.dryRun === true && options.live === true) {
      throw new Error("Use either --dry-run or --live, not both.");
    }

    return options;
  }

  private parseChannelOption(
    channel: string | undefined,
  ): ReleaseChannel | undefined {
    if (channel === undefined) {
      return undefined;
    }

    if (
      channel === "proper" ||
      channel === "beta" ||
      channel === "alpha" ||
      channel === "rc"
    ) {
      return channel;
    }

    throw new Error(
      "Option --channel must be one of: proper, beta, alpha, rc.",
    );
  }

  private parseBumpOption(bump: string | undefined): ReleaseBump | undefined {
    if (bump === undefined) {
      return undefined;
    }

    if (
      bump === "patch" ||
      bump === "minor" ||
      bump === "major" ||
      bump === "promote" ||
      bump === "continue"
    ) {
      return bump;
    }

    throw new Error(
      "Option --bump must be one of: patch, minor, major, promote, continue.",
    );
  }

  private validateBump(
    localVersion: string,
    channel: ReleaseChannel,
    bump: ReleaseBump,
  ): void {
    if (
      bump === "promote" &&
      (channel !== "proper" || !this.#versionPlanner.isPrerelease(localVersion))
    ) {
      throw new Error(
        "The promote bump requires a proper release from a local prerelease version.",
      );
    }

    if (
      bump === "continue" &&
      !this.#versionPlanner.isPrereleaseForChannel(localVersion, channel)
    ) {
      throw new Error(
        "The continue bump requires a local prerelease version on the selected channel.",
      );
    }
  }

  private async selectMode(
    options: ReleaseCommandOptions,
  ): Promise<ReleaseMode> {
    if (options.live === true) {
      console.log("Live mode requested. Every release step still asks first.");
      return "live";
    }

    if (options.dryRun === true) {
      console.log(
        "Dry-run mode requested. Release commands will be printed only.",
      );
      return "dry-run";
    }

    const dryRun = await this.#prompt.confirm(
      "Run this release as a dry-run walkthrough?",
      true,
    );

    return dryRun ? "dry-run" : "live";
  }

  private async selectChannel(): Promise<ReleaseChannel> {
    return await this.#prompt.select<ReleaseChannel>(
      "Release type?",
      [
        {
          label: "proper release",
          value: "proper",
          description: "Publishes to npm with the latest tag.",
        },
        {
          label: "beta prerelease",
          value: "beta",
          description: "Publishes to npm with the beta tag.",
        },
        {
          label: "alpha prerelease",
          value: "alpha",
          description: "Publishes to npm with the alpha tag.",
        },
        {
          label: "release candidate",
          value: "rc",
          description: "Publishes to npm with the rc tag.",
        },
      ],
      "proper",
    );
  }

  private async selectBump(
    localVersion: string,
    channel: ReleaseChannel,
  ): Promise<ReleaseBump> {
    if (
      channel === "proper" &&
      this.#versionPlanner.isPrerelease(localVersion)
    ) {
      return await this.#prompt.select<ReleaseBump>(
        "Version bump?",
        [
          {
            label: "promote current prerelease",
            value: "promote",
            description:
              "Removes the prerelease suffix without changing the base version.",
          },
          {
            label: "patch",
            value: "patch",
            description: "Increments the patch version.",
          },
          {
            label: "minor",
            value: "minor",
            description: "Increments the minor version.",
          },
          {
            label: "major",
            value: "major",
            description: "Increments the major version.",
          },
        ],
        "promote",
      );
    }

    if (this.#versionPlanner.isPrereleaseForChannel(localVersion, channel)) {
      return await this.#prompt.select<ReleaseBump>(
        "Version bump?",
        [
          {
            label: "continue current prerelease",
            value: "continue",
            description: "Increments the prerelease number only.",
          },
          {
            label: "patch",
            value: "patch",
            description: "Starts a new patch prerelease.",
          },
          {
            label: "minor",
            value: "minor",
            description: "Starts a new minor prerelease.",
          },
          {
            label: "major",
            value: "major",
            description: "Starts a new major prerelease.",
          },
        ],
        "continue",
      );
    }

    return await this.#prompt.select<ReleaseBump>(
      "Version bump?",
      [
        {
          label: "patch",
          value: "patch",
          description: "Increments the patch version.",
        },
        {
          label: "minor",
          value: "minor",
          description: "Increments the minor version.",
        },
        {
          label: "major",
          value: "major",
          description: "Increments the major version.",
        },
      ],
      "patch",
    );
  }

  private async runReleaseSteps(
    plan: ReleasePlan,
    mode: ReleaseMode,
  ): Promise<void> {
    await this.maybeRunStep({
      args: [
        "version",
        plan.targetVersion,
        "--workspace",
        PACKAGE_NAME,
        "--no-git-tag-version",
      ],
      command: "npm",
      label: `Apply package version ${plan.targetVersion}?`,
      mode,
    });

    await this.maybeUpdateChangelog(plan, mode);

    await this.maybeRunStep({
      args: ["run", "publish:opennav:dry-run"],
      command: "npm",
      label: "Run package tests and npm pack dry-run?",
      mode,
    });

    await this.maybeRunStep({
      args: ["add", CHANGELOG_PATH, "package-lock.json", PACKAGE_JSON_PATH],
      command: "git",
      label: "Stage release version files and changelog?",
      mode,
    });

    await this.maybeRunStep({
      args: [
        "commit",
        "-m",
        `chore: release opennav ${plan.targetVersion}`,
        "-m",
        `- ${PACKAGE_NAME} is prepared for version ${plan.targetVersion}.`,
        "-m",
        `- npm installs use the ${plan.npmDistTag} dist tag for this release.`,
        "-m",
        "- Existing package checks still run before publishing.",
      ],
      command: "git",
      label: `Commit release ${plan.targetVersion}?`,
      mode,
    });

    await this.maybeRunStep({
      args: ["tag", plan.gitTagName],
      command: "git",
      label: `Create git tag ${plan.gitTagName}?`,
      mode,
    });

    await this.maybeRunStep({
      args: [
        "publish",
        "--workspace",
        PACKAGE_NAME,
        "--access",
        "public",
        "--tag",
        plan.npmDistTag,
      ],
      command: "npm",
      label: `Publish ${PACKAGE_NAME}@${plan.targetVersion} to npm with tag ${plan.npmDistTag}?`,
      mode,
    });

    await this.maybeRunStep({
      args: ["push"],
      command: "git",
      label: "Push the current branch?",
      mode,
    });

    await this.maybeRunStep({
      args: ["push", "origin", plan.gitTagName],
      command: "git",
      label: `Push git tag ${plan.gitTagName}?`,
      mode,
    });

    await this.maybeRunStep({
      args: this.createGitHubReleaseArgs(plan),
      command: "gh",
      label: `Create GitHub ${plan.githubPrerelease ? "prerelease" : "release"} ${plan.gitTagName}?`,
      mode,
    });

    console.log("Release helper finished.");
  }

  private async maybeUpdateChangelog(
    plan: ReleasePlan,
    mode: ReleaseMode,
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const label = `Update ${CHANGELOG_PATH} header from [Unreleased] to [${plan.targetVersion}] - ${today}?`;

    const shouldRun = await this.#prompt.confirm(label, false);

    if (!shouldRun) {
      console.log(`Skipped changelog update.`);
      return;
    }

    if (mode === "dry-run") {
      console.log(
        `Dry run: would replace "## [Unreleased]" with "## [${plan.targetVersion}] - ${today}" in ${CHANGELOG_PATH}.`,
      );
      return;
    }

    const changelogPath = resolve(this.#cwd, CHANGELOG_PATH);
    const contents = await readFile(changelogPath, "utf8");
    const updated = contents.replace(
      "## [Unreleased]",
      `## [${plan.targetVersion}] - ${today}`,
    );

    if (updated === contents) {
      console.log(
        `Could not find "## [Unreleased]" header in ${CHANGELOG_PATH}.`,
      );
      return;
    }

    await writeFile(changelogPath, updated, "utf8");
    console.log(
      `Updated ${CHANGELOG_PATH} header to [${plan.targetVersion}] - ${today}.`,
    );
  }

  private async maybeRunStep(input: {
    readonly args: readonly string[];
    readonly command: string;
    readonly label: string;
    readonly mode: ReleaseMode;
  }): Promise<void> {
    const shouldRun = await this.#prompt.confirm(input.label, false);
    const printableCommand = this.formatCommand(input.command, input.args);

    if (!shouldRun) {
      console.log(`Skipped: ${printableCommand}`);
      return;
    }

    if (input.mode === "dry-run") {
      console.log(`Dry run: ${printableCommand}`);
      return;
    }

    console.log(`Running: ${printableCommand}`);
    const result = await this.#shell.run(input.command, input.args);

    if (result.exitCode !== 0) {
      throw new Error(`Command failed: ${printableCommand}`);
    }
  }

  private createGitHubReleaseArgs(plan: ReleasePlan): readonly string[] {
    const args = [
      "release",
      "create",
      plan.gitTagName,
      "--title",
      `OpenNav ${plan.targetVersion}`,
      "--generate-notes",
    ];

    if (plan.githubPrerelease) {
      args.push("--prerelease");
    }

    return args;
  }

  private printVersionSummary(
    localVersion: string,
    publishedVersion: string | undefined,
    mode: ReleaseMode,
  ): void {
    console.log("");
    console.log("OpenNav package release");
    console.log(`Mode:      ${mode}`);
    console.log(`Local:     ${localVersion}`);
    console.log(`Published: ${publishedVersion ?? "unavailable"}`);
    console.log("");
  }

  private printPlan(plan: ReleasePlan, mode: ReleaseMode): void {
    console.log("");
    console.log("Planned release");
    console.log(`Mode:              ${mode}`);
    console.log(`Current local:     ${plan.localVersion}`);
    console.log(`Current published: ${plan.publishedVersion ?? "unavailable"}`);
    console.log(`Target version:    ${plan.targetVersion}`);
    console.log(`npm dist tag:      ${plan.npmDistTag}`);
    console.log(`Git tag:           ${plan.gitTagName}`);
    console.log(
      `GitHub release:    ${plan.githubPrerelease ? "prerelease" : "proper release"}`,
    );
    console.log("");
  }

  private formatCommand(command: string, args: readonly string[]): string {
    return [command, ...args.map((arg: string): string => this.quoteArg(arg))]
      .join(" ")
      .trim();
  }

  private quoteArg(arg: string): string {
    if (/^[A-Za-z0-9_./:@=-]+$/.test(arg)) {
      return arg;
    }

    return JSON.stringify(arg);
  }
}

void new OpenNavReleaseCommand(process.cwd())
  .run(process.argv)
  .catch((cause: unknown): void => {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(message);
    process.exitCode = 1;
  });
