import { type StateCode } from "../_internals/constants/states";

/** One range of CEPs assigned by the Correios to a state. */
type CepRange = {
	/** Two letter code of the state that owns the range. */
	readonly state: StateCode;
	/** First CEP of the range, as a number. */
	readonly start: number;
	/** Last CEP of the range, as a number. */
	readonly end: number;
};

/**
 * CEP ranges of each state ("Faixa de CEP" per UF), as answered by the Correios "Busca Faixa de
 * CEP" search when only the UF is given, in ascending order. Amazonas, Distrito Federal and Goiás
 * have two ranges each: Roraima sits inside the Amazonas block and the Goiás municipalities
 * around Brasília sit inside the Distrito Federal block. No state owns `00000-000` to
 * `00999-999` nor `78900-000` to `78999-999`.
 *
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 * @see Based on: https://gist.github.com/tamnil/792a6a66f6df9fc028041587cfca0c3d
 * Copy of the answers of the Correios search, the rows with an empty city are the state ranges.
 */
export const CEP_RANGES: readonly CepRange[] = [
	{ state: "SP", start: 1_000_000, end: 19_999_999 },
	{ state: "RJ", start: 20_000_000, end: 28_999_999 },
	{ state: "ES", start: 29_000_000, end: 29_999_999 },
	{ state: "MG", start: 30_000_000, end: 39_999_999 },
	{ state: "BA", start: 40_000_000, end: 48_999_999 },
	{ state: "SE", start: 49_000_000, end: 49_999_999 },
	{ state: "PE", start: 50_000_000, end: 56_999_999 },
	{ state: "AL", start: 57_000_000, end: 57_999_999 },
	{ state: "PB", start: 58_000_000, end: 58_999_999 },
	{ state: "RN", start: 59_000_000, end: 59_999_999 },
	{ state: "CE", start: 60_000_000, end: 63_999_999 },
	{ state: "PI", start: 64_000_000, end: 64_999_999 },
	{ state: "MA", start: 65_000_000, end: 65_999_999 },
	{ state: "PA", start: 66_000_000, end: 68_899_999 },
	{ state: "AP", start: 68_900_000, end: 68_999_999 },
	{ state: "AM", start: 69_000_000, end: 69_299_999 },
	{ state: "RR", start: 69_300_000, end: 69_399_999 },
	{ state: "AM", start: 69_400_000, end: 69_899_999 },
	{ state: "AC", start: 69_900_000, end: 69_999_999 },
	{ state: "DF", start: 70_000_000, end: 72_799_999 },
	{ state: "GO", start: 72_800_000, end: 72_999_999 },
	{ state: "DF", start: 73_000_000, end: 73_699_999 },
	{ state: "GO", start: 73_700_000, end: 76_799_999 },
	{ state: "RO", start: 76_800_000, end: 76_999_999 },
	{ state: "TO", start: 77_000_000, end: 77_999_999 },
	{ state: "MT", start: 78_000_000, end: 78_899_999 },
	{ state: "MS", start: 79_000_000, end: 79_999_999 },
	{ state: "PR", start: 80_000_000, end: 87_999_999 },
	{ state: "SC", start: 88_000_000, end: 89_999_999 },
	{ state: "RS", start: 90_000_000, end: 99_999_999 },
];
