const POLYNOMIAL = 0x1021;

const INITIAL_VALUE = 0xffff;

const MASK = 0xffff;

const HEX_LENGTH = 4;

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
	const bytes = new TextEncoder().encode(value);

	let crc = INITIAL_VALUE;

	for (let index = 0; index < bytes.length; index++) {
		crc ^= bytes[index] << 8;

		for (let bit = 0; bit < 8; bit++) {
			crc = (crc & 0x8000) === 0 ? (crc << 1) & MASK : ((crc << 1) ^ POLYNOMIAL) & MASK;
		}
	}

	return crc.toString(16).toUpperCase().padStart(HEX_LENGTH, "0");
};
