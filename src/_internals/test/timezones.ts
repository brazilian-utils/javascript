type Environment = Record<string, string | undefined>;

type ProcessLike = {
	env?: Environment;
};

type Hook = (callback: () => void) => void;

type Describe = ((name: string, callback: () => void) => void) & {
	skip: (name: string, callback: () => void) => void;
};

type TimeZoneRuntime = {
	afterEach: Hook;
	beforeEach: Hook;
	describe: Describe;
};

/** Declares a suite whose every test runs with the process time zone pinned to a given zone. */
export type TimeZoneSuite = (timeZone: string, suite: () => void) => void;

const KIRITIMATI_OFFSET_IN_MINUTES = -840;

const getEnvironment = (): Environment | undefined => {
	const globalWithProcess = globalThis as typeof globalThis & { process?: ProcessLike };

	try {
		return globalWithProcess.process?.env;
	} catch {
		return undefined;
	}
};

const environment = getEnvironment();

/**
 * The zone to go back to, resolved before anything below changes `TZ`. Restoring means assigning
 * this name again, never `delete process.env.TZ`: Bun stops applying any later `TZ` once the
 * variable has been deleted once, which would silently run the rest of the suite in the wrong
 * zone.
 */
const ambientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const setTimeZone = (timeZone: string): void => {
	if (environment === undefined) return;

	environment["TZ"] = timeZone;
};

/**
 * Node, Bun and Deno all apply a new `process.env.TZ` to the `Date` objects built after it, which
 * is what lets a test pin a time zone. A browser has no such switch, so the two zones below both
 * report the ambient offset and the time zone suites are skipped there.
 */
const canSetTimeZone = (): boolean => {
	if (environment === undefined) return false;

	try {
		setTimeZone("UTC");

		const utcOffset = new Date(2024, 0, 1).getTimezoneOffset();

		setTimeZone("Pacific/Kiritimati");

		const kiritimatiOffset = new Date(2024, 0, 1).getTimezoneOffset();

		setTimeZone(ambientTimeZone);

		return utcOffset === 0 && kiritimatiOffset === KIRITIMATI_OFFSET_IN_MINUTES;
	} catch {
		return false;
	}
};

/**
 * Builds the `inTimeZone` helper `src/_internals/test/runtime` exports, around the `describe` and
 * the hooks of whichever runtime the tests run on. It takes them as an argument rather than
 * importing them so that the runtime module can export the helper without the two modules
 * importing each other.
 *
 * @param {TimeZoneRuntime} runtime - The `describe`, `beforeEach` and `afterEach` of the runtime in use.
 * @returns {TimeZoneSuite} A `describe` that pins the process time zone around every test inside it.
 */
export const createTimeZoneSuite = ({
	afterEach,
	beforeEach,
	describe,
}: TimeZoneRuntime): TimeZoneSuite => {
	const supported = canSetTimeZone();

	return (timeZone, suite) => {
		const describeTimeZone = supported ? describe : describe.skip;

		describeTimeZone(`in ${timeZone}`, () => {
			beforeEach(() => {
				setTimeZone(timeZone);
			});

			afterEach(() => {
				setTimeZone(ambientTimeZone);
			});

			suite();
		});
	};
};
