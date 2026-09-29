import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import {
	CHECK_DIGIT_LENGTH,
	CHECK_DIGIT_START_POSITION,
	COURT_POSITION,
	TRIBUNAL_LENGTH,
	TRIBUNAL_START_POSITION,
} from "../is-valid-processo-juridico/constants";
import { isValidProcessoJuridico } from "../is-valid-processo-juridico/is-valid-processo-juridico";
import { PROCESSO_JURIDICO_SEGMENTS } from "./constants";

/**
 * The segments of the Judiciary a processo number can belong to, one per órgão digit `J` (art.
 * 1º, § 4º of Resolução CNJ nº 65/2008): `"supreme-federal-court"` (`1`), `"national-council-of-justice"`
 * (`2`), `"superior-court-of-justice"` (`3`), `"federal"` (`4`, Justiça Federal), `"labor"` (`5`,
 * Justiça do Trabalho), `"electoral"` (`6`, Justiça Eleitoral), `"military"` (`7`, Justiça Militar
 * da União), `"state"` (`8`, Justiça dos Estados e do Distrito Federal e Territórios) and
 * `"state-military"` (`9`, Justiça Militar Estadual). Spelled out instead of derived from the
 * internal list because API Extractor cannot name that list in the public report; the type test
 * of `get-processo-juridico-info.test.ts` pins the two together.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 */
export type ProcessoJuridicoSegment =
	| "supreme-federal-court"
	| "national-council-of-justice"
	| "superior-court-of-justice"
	| "federal"
	| "labor"
	| "electoral"
	| "military"
	| "state"
	| "state-military";

/** The fields `getProcessoJuridicoInfo` reads out of a Número Único de Processo. */
export type ProcessoJuridicoInfo = {
	/** The 7 digit sequential number (`NNNNNNN`), zero padded, counted by the unit of origin per year. */
	sequentialNumber: string;
	/** The 2 check digits (`DD`, ISO 7064 MOD 97-10). */
	checkDigits: string;
	/** Four digit year the process was filed (`AAAA`). */
	year: number;
	/** The segment of the Judiciary (`J`), as an English name. */
	segment: ProcessoJuridicoSegment;
	/** Raw órgão code (`J`), `"1"` to `"9"`. */
	segmentCode: string;
	/** The 2 digit tribunal code (`TR`): `"00"` for a superior court, `"90"` for a council, the region or state otherwise. */
	tribunalCode: string;
	/** The 4 digit unit of origin (`OOOO`), whose codification each tribunal sets. */
	originUnit: string;
};

/**
 * Reads the fields of a Número Único de Processo (`NNNNNNN-DD.AAAA.J.TR.OOOO`) of Resolução CNJ
 * nº 65/2008: the sequential number, the check digits, the year of filing, the segment of the
 * Judiciary, the tribunal and the unit of origin.
 *
 * Accepts the same input forms as `isValidProcessoJuridico`, masked or not, and returns `null`
 * whenever it would return `false`, so the `J` and `TR` pair is always one the resolution
 * created.
 *
 * `segmentCode` is the órgão digit `J` and `segment` its name. `tribunalCode` is `TR` as written,
 * two digits: `"00"` for the processes of a superior court or of a segment's own court (the STF,
 * the CNJ, the STJ, the TST, the TSE and the STM, art. 1º, § 5º, I), `"90"` for those of the
 * Conselho da Justiça Federal and of the Conselho Superior da Justiça do Trabalho (§ 5º, II), and
 * the number of the Tribunal Regional, Circunscrição Judiciária Militar or Tribunal de Justiça
 * otherwise. What each number stands for depends on `segment`. The unidade de origem is not
 * checked: art. 1º, § 6º hands its codification to each tribunal.
 *
 * @param {string} value - The Número Único de Processo to be read.
 * @returns {ProcessoJuridicoInfo|null} The fields of the number, or `null` when it is not valid.
 *
 * @example
 * ```typescript
 * getProcessoJuridicoInfo("0002080-25.2012.5.15.0049");
 * // {
 * //   sequentialNumber: "0002080",
 * //   checkDigits: "25",
 * //   year: 2012,
 * //   segment: "labor",
 * //   segmentCode: "5",
 * //   tribunalCode: "15",
 * //   originUnit: "0049",
 * // }
 *
 * getProcessoJuridicoInfo("00020802520125150049"); // same result (no mask)
 * getProcessoJuridicoInfo("0000100-23.2008.8.28.0000"); // null (there is no 28th Tribunal de Justiça)
 * ```
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 * Resolução CNJ nº 65, de 16 de dezembro de 2008: the layout (art. 1º, § 1º), the órgão and
 * tribunal codes (art. 1º, § 4º and § 5º) and the unidade de origem (§ 6º).
 */
export const getProcessoJuridicoInfo = (value: string): ProcessoJuridicoInfo | null => {
	if (!isValidProcessoJuridico(value)) return null;

	const digits = value.replace(SEPARATORS_REGEX, "");
	const yearStart = CHECK_DIGIT_START_POSITION + CHECK_DIGIT_LENGTH;
	const originStart = TRIBUNAL_START_POSITION + TRIBUNAL_LENGTH;
	const segmentCode = digits.charAt(COURT_POSITION);
	const segments: readonly ProcessoJuridicoSegment[] = PROCESSO_JURIDICO_SEGMENTS;

	return {
		sequentialNumber: digits.slice(0, CHECK_DIGIT_START_POSITION),
		checkDigits: digits.slice(CHECK_DIGIT_START_POSITION, yearStart),
		year: Number(digits.slice(yearStart, COURT_POSITION)),
		segment: segments[Number(segmentCode) - 1],
		segmentCode,
		tribunalCode: digits.slice(TRIBUNAL_START_POSITION, originStart),
		originUnit: digits.slice(originStart),
	};
};
