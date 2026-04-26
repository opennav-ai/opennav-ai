/**
 * Describes a typed OpenNav AI failure without throwing for expected errors.
 */
export interface OpenNavError {
  readonly code: string;
  readonly message: string;
  readonly context: Readonly<Record<string, unknown>>;
}
