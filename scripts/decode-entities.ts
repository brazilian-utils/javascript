const HTML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&nbsp;": " ",
};

/**
 * Decodes the handful of HTML entities the CONFAZ pages use. Shared by the dataset generator
 * scripts that read a table out of the HTML of a convênio or an ajuste.
 *
 * @param {string} text - The text of an HTML fragment, tags already removed.
 * @returns {string} The text with its entities replaced by the characters they stand for.
 */
export const decodeEntities = (text: string): string =>
	text.replaceAll(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity);
