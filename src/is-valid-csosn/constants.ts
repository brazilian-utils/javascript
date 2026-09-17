/**
 * CSOSN (Código de Situação da Operação no Simples Nacional) codes, as the consolidated Anexo
 * III-A of Convênio SINIEF s/nº 1970 carries them (added by Ajuste SINIEF 39/23, effective
 * from 01.10.24). Ajuste SINIEF 03/2010 instituted the table and is kept as the historical
 * citation.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, whose Anexo III-A carries the CSOSN table in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2010/aj_003_10
 * Ajuste SINIEF 03/2010, which instituted the CSOSN table.
 */
export const CSOSN_CODES = [
	"101",
	"102",
	"103",
	"201",
	"202",
	"203",
	"300",
	"400",
	"500",
	"900",
] as const;

/**
 * Shape a CSOSN code has to be written in: the bare 3 digits. Unlike the ICMS CST, whose origin
 * digit is printed apart from the Tabela B pair, a CSOSN has no internal grouping anywhere it is
 * printed (the NF-e carries the origin in its own `orig` field), so no separator is accepted.
 */
export const CSOSN_FORMAT_REGEX = /^\d{3}$/;
