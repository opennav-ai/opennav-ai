/**
 * Function shape for one Astro integration hook handled by OpenNav.
 */
export type OpenNavAstroHook<Input> = (input: Input) => Promise<void> | void;
