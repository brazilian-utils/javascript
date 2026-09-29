import { type StateCode } from "./states";

/**
 * A Brazilian municipality, as published by the IBGE.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export type Municipality = {
	/** The 7-digit IBGE municipality code. */
	code: string;
	/** The municipality name. */
	name: string;
	/** The two-letter code of the state the municipality belongs to. */
	stateCode: StateCode;
};
