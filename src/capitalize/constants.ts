/**
 * Prepositions, articles and conjunctions that stay in lower case inside a proper name, the
 * default `lowerCaseWords` of `capitalize`. The Manual de Redação da Presidência da República
 * states the convention twice: a cargo is "redigido apenas com as iniciais maiúsculas. As
 * preposições que liguem as palavras do cargo devem ser grafadas em minúsculas" (item 5.1.8 b),
 * and a title is written "com inicial maiúscula em todas as palavras, exceto nas de ligação"
 * (item 10.2 a). The same convention is used by the IBGE for the names of municipalities
 * ("Mogi das Cruzes", "Santa Bárbara d'Oeste"). The elided `d` of "d'Oeste" is not a member of
 * this list: on its own it is a designator ("Rua D", "Quadra D"), so `capitalize` lower-cases it
 * structurally, only when an apostrophe and a word follow it. Applying it to personal and institutional names
 * ("Ministério da Justiça", "José da Silva") is this library's extension of that rule; the
 * Manual does not spell those two cases out.
 *
 * @see Official: https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf
 * Manual de Redação da Presidência da República, 3ª edição (Portaria nº 1.369, de 27/12/2018),
 * items 5.1.8 b) and 10.2 a). The landing page below only recounts the editions and links to
 * this PDF; the rule itself is in the PDF.
 * @see Official: https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica
 * The Presidência page that publishes it ("Acesse aqui a íntegra da última edição publicada").
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const PREPOSITIONS = [
	"a",
	"com",
	"da",
	"das",
	"de",
	"do",
	"dos",
	"del",
	"della",
	"den",
	"der",
	"di",
	"du",
	"e",
	"em",
	"na",
	"nas",
	"no",
	"nos",
	"o",
	"por",
	"sem",
	"van",
	"von",
];

/**
 * Company designations that are written in upper case in Brazilian names, and the only words a
 * designation of `TRAILING_DESIGNATIONS` is upper case before. "SA" without punctuation is
 * deliberately absent: it is indistinguishable from the surname "Sá" typed without its accent,
 * which would turn "Jose de Sa" into "Jose de SA".
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm
 * Lei nº 6.404/1976, art. 3º: the sociedade anônima is designated by "companhia" or "sociedade
 * anônima", "expressas por extenso ou abreviadamente", the abbreviations being CIA, S.A. and S/A.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
 * Código Civil, art. 1.158: the sociedade limitada carries the final word "limitada" "ou a sua
 * abreviatura" (LTDA); art. 991 defines the sociedade em conta de participação (SCP), enrolled in
 * the CNPJ under that abbreviation; art. 980-A, which created the EIRELI, was revoked by the Lei
 * nº 14.382/2022, so the abbreviation is kept only because registered names still carry it.
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm
 * Lei Complementar nº 123/2006, art. 72, revoked by the Lei Complementar nº 155/2016, added
 * "Microempresa ou Empresa de Pequeno Porte, ou suas respectivas abreviações, ME ou EPP" to the
 * name; art. 18-A defines the Microempreendedor Individual (MEI).
 * @see Official: https://www.gov.br/empresas-e-negocios/pt-br/drei/legislacao/instrucoes-normativas/arquivos-instrucoes-normativas-em-vigor/anexo-iv-limitada_link.pdf
 * IN DREI nº 81/2020, Anexo IV (Manual de Registro de Sociedade Limitada), the rules the Juntas
 * Comerciais follow for the nome empresarial and for the "conversão de sociedade simples ou
 * associação do cartório de registro de pessoas jurídicas para a Junta Comercial". The S/S
 * abbreviation itself is registry practice: no DREI norm spells it out, and it is kept in this
 * list only because registered names carry it.
 * @see Official: https://www.gov.br/empresas-e-negocios/pt-br/drei/legislacao/instrucoes-normativas
 * The DREI index of instruções normativas in force, where that Anexo is published.
 */
export const COMPANY_DESIGNATIONS = [
	"CIA",
	"EIRELI",
	"EPP",
	"LTDA",
	"ME",
	"MEI",
	"S.A.",
	"S.S.",
	"S/A",
	"S/S",
	"SCP",
];

/** The document abbreviations that are written in upper case wherever they appear. */
const DOCUMENT_ABBREVIATIONS = ["CEP", "CNPJ", "CPF", "RG", "UF"];

/**
 * Roman numerals that appear inside Brazilian names and addresses ("João Paulo II", "Rua XV de
 * Novembro", "Avenida Papa João XXIII"). The single letter numerals (V, X, L, C, D, M) are left
 * out because a single letter is already written in upper case by the default rule, and VI is
 * left out because it collides with the pt-BR verb form "vi".
 */
const ROMAN_NUMERALS = [
	"II",
	"III",
	"IV",
	"VII",
	"VIII",
	"IX",
	"XI",
	"XII",
	"XIII",
	"XIV",
	"XV",
	"XVI",
	"XVII",
	"XVIII",
	"XIX",
	"XX",
	"XXI",
	"XXII",
	"XXIII",
];

/** Words that are written in upper case wherever they appear, the default `upperCaseWords`. */
export const UPPER_CASE_WORDS = [
	...COMPANY_DESIGNATIONS,
	...DOCUMENT_ABBREVIATIONS,
	...ROMAN_NUMERALS,
];

/**
 * Word boundaries: runs of whitespace, hyphen and slash (kept in place), the apostrophe of
 * `d'Oeste`, and the punctuation that may wrap or follow a word without a space, so `(empresa)`
 * and `bairro:centro` still capitalize the word after the mark.
 */
export const SEPARATOR_REGEX = /(\s+|[-/'’‘(){}[\]"“”:;,])/;

/** A single separator token that is kept where it is, as opposed to a whitespace run. */
export const PUNCTUATION_REGEX = /^[-/'’‘(){}[\]"“”:;,]$/;

export const WHITESPACE_REGEX = /^\s+$/;

/**
 * A token that carries a word: one that holds at least one character that is not a separator. The
 * empty token that `String.prototype.split` leaves between two separators does not, and neither
 * does a whitespace run or a single punctuation mark.
 */
export const WORD_REGEX = /[^\s/'’‘(){}[\]"“”:;,-]/;

/**
 * The separators that join two words into one name ("Rio-de-Janeiro", "Santa Bárbara d'Oeste",
 * "Porto Alegre/RS"), as opposed to the punctuation that closes a phrase (`,`, `;`, `:`, brackets
 * and quotes). A word of the lower case list is only written in lower case when another word
 * follows it across separators of this kind; before a closing mark, or at the end of the value, it
 * is a designator ("Rua D", "Quadra A, Lote B") and keeps its capital.
 */
export const JOINER_REGEX = /^(?:\s+|[-/'’‘])$/;

/** The apostrophe that elides the particle of `d'Oeste` and marks the English possessive of `Bob's`. */
export const APOSTROPHE_REGEX = /^['’‘]$/;

/** The elided particle of `Santa Bárbara d'Oeste`, lower case only when an apostrophe and a word follow it. */
export const ELIDED_PARTICLE = "d";

/**
 * The separators that attach an enclitic pronoun to its verb (`"diga-me"`, `"d'me"`): a word of
 * `TRAILING_DESIGNATIONS` written right after one of them is the pronoun, never the designation.
 */
export const ENCLISIS_REGEX = /^[-'’‘]$/;

/**
 * Designations that are only written in upper case in the designation position, that is, as the
 * last word of the name ("Fulano Comércio ME") or right before another company designation
 * ("Fulano ME EPP"), and never attached to the previous word by a hyphen or an apostrophe. `ME`
 * is also the pt-BR pronoun "me", so upper-casing it wherever it appears turned free text into
 * `"Diga-ME a Verdade"` and the municipality of Não-Me-Toque/RS into `"Não-ME-Toque"`; anywhere
 * else in the value it is written as an ordinary word.
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm
 * Lei Complementar nº 123/2006, art. 72 (revoked by the Lei Complementar nº 155/2016): the
 * abbreviation is added "ao final" of the firma or denominação, which is the position this list
 * keeps it in.
 */
export const TRAILING_DESIGNATIONS = ["ME"];
