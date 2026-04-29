import type { EngineExecuteResult } from "../../types/engine-execute-result";

/**
 * Machine-readable build report produced by the internal result reporter.
 *
 * The shape intentionally matches `EngineExecuteResult` so `Engine.execute(...)`
 * can return it directly while CLI code remains free to format the same facts
 * into human-readable terminal output later.
 */
export type BuildReport = EngineExecuteResult;
