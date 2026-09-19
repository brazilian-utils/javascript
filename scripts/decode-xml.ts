const XML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
};

const MAXIMUM_CODE_POINT = 0x10_ff_ff;

/**
 * Decodes the five entities of XML and the numeric character references a writer other than
 * Excel emits, `&#10;` and `&#xE9;` alike. Anything else is left as it is. Shared by the xlsx
 * reader and the generators that read a listing page of a government portal.
 *
 * @param {string} text - The text as the XML carries it.
 * @returns {string} The decoded text.
 */
export const decodeXml = (text: string): string =>
	text.replaceAll(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, (entity) => {
		if (!entity.startsWith("&#")) return XML_ENTITIES[entity] ?? entity;

		const reference = entity.slice(2, -1);
		const code = reference.startsWith("x")
			? Number.parseInt(reference.slice(1), 16)
			: Number(reference);

		return code <= MAXIMUM_CODE_POINT ? String.fromCodePoint(code) : entity;
	});
