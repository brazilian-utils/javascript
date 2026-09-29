const POLYNOMIAL = 0x10_21;

const INITIAL_VALUE = 0xff_ff;

const MASK = 0xff_ff;

const HEX_LENGTH = 4;

const BYTE_VALUES = 256;

const ASCII_LIMIT = 0x80;

let table: Uint16Array | undefined;

const buildTable = (): Uint16Array => {
	const entries = new Uint16Array(BYTE_VALUES);

	// Stryker disable next-line EqualityOperator: the extra pass writes `entries[BYTE_VALUES]`, past the end of the typed array, and a write there is dropped.
	for (let byte = 0; byte < BYTE_VALUES; byte++) {
		let crc = byte << 8;

		for (let bit = 0; bit < 8; bit++) {
			crc = (crc & 0x80_00) === 0 ? (crc << 1) & MASK : ((crc << 1) ^ POLYNOMIAL) & MASK;
		}

		entries[byte] = crc;
	}

	return entries;
};

const update = (crc: number, byte: number, entries: Uint16Array): number =>
	((crc << 8) & MASK) ^ entries[(crc >> 8) ^ byte];

/**
 * Calculates the CRC-16/CCITT-FALSE checksum of a string and returns it as four uppercase
 * hexadecimal digits.
 *
 * The variant is the one required by the BR Code standard: polynomial `0x1021`, initial value
 * `0xFFFF`, no input or output reflection and no final xor. The bytes fed to the checksum are
 * the UTF-8 encoding of the string, which for an ASCII BR Code payload is the payload itself.
 *
 * @param {string} value - The string to checksum.
 * @returns {string} The checksum as four uppercase hexadecimal digits.
 *
 * @example
 * ```typescript
 * crc16Ccitt("123456789"); // "29B1"
 * crc16Ccitt(""); // "FFFF"
 * ```
 */
export const crc16Ccitt = (value: string): string => {
	table ??= buildTable();

	let crc = INITIAL_VALUE;
	// Stryker disable next-line BooleanLiteral: starting at `false` sends every value to the UTF-8 pass below, which gives the checksum the ASCII pass gives for a string of ASCII characters.
	let ascii = true;

	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);

		// Stryker disable next-line ConditionalExpression: leaving for the UTF-8 pass at the first character gives the checksum the ASCII pass gives for a string of ASCII characters.
		if (code >= ASCII_LIMIT) {
			ascii = false;
			break;
		}

		crc = update(crc, code, table);
	}

	// Stryker disable next-line ConditionalExpression: running the UTF-8 pass for an ASCII string restarts from the initial value and feeds the same bytes, so it gives the same checksum.
	if (!ascii) {
		crc = INITIAL_VALUE;

		for (const byte of new TextEncoder().encode(value)) {
			crc = update(crc, byte, table);
		}
	}

	return crc.toString(16).toUpperCase().padStart(HEX_LENGTH, "0");
};
