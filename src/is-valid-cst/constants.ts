/**
 * CST (Código de Situação Tributária) code tables per tax: the consolidated Anexo I of
 * Convênio SINIEF s/nº 1970 for ICMS (Tabela A given by Ajuste SINIEF 20/2012 and 15/2013,
 * Tabela B given by Ajuste SINIEF 39/23 and amended by Ajuste SINIEF 20/24), and Instrução
 * Normativa RFB nº 1.009/2010 (Tabelas I to III) for IPI, PIS and COFINS.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cvsn_70
 * Convênio SINIEF s/nº 1970, whose Anexo I carries the CST tables in force.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2023/ajuste-sinief-39-23
 * Ajuste SINIEF 39/23, which gave Tabela B its current wording with effect from 01.12.23.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2024/AJ020_24
 * Ajuste SINIEF 20/24, which revoked items 12, 13, 52, 72 and 74 of Tabela B with effect from
 * 09.07.24.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/1994/aj_003_94
 * Ajuste SINIEF 03/1994, which instituted the ICMS CST as the two digit code AB.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2000/AJ_006_00
 * Ajuste SINIEF 06/2000, the historical Tabela B superseded by Ajuste SINIEF 39/23.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2012/aj_020_12
 * Ajuste SINIEF 20/2012, which gives Tabela A (origem da mercadoria, 0 to 7).
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2013/aj_015_13
 * Ajuste SINIEF 15/2013, which added origem 8 to Tabela A.
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974
 * Instrução Normativa RFB nº 1.009/2010, Tabelas I to III (CST-IPI, CST-PIS and CST-COFINS).
 */
export const ICMS_CST_CODES = [
	"00",
	"02",
	"10",
	"15",
	"20",
	"30",
	"40",
	"41",
	"50",
	"51",
	"53",
	"60",
	"61",
	"70",
	"90",
] as const;

export const IPI_CST_CODES = [
	"00",
	"01",
	"02",
	"03",
	"04",
	"05",
	"49",
	"50",
	"51",
	"52",
	"53",
	"54",
	"55",
	"99",
] as const;

export const PIS_COFINS_CST_CODES = [
	"01",
	"02",
	"03",
	"04",
	"05",
	"06",
	"07",
	"08",
	"09",
	"49",
	"50",
	"51",
	"52",
	"53",
	"54",
	"55",
	"56",
	"60",
	"61",
	"62",
	"63",
	"64",
	"65",
	"66",
	"67",
	"70",
	"71",
	"72",
	"73",
	"74",
	"75",
	"98",
	"99",
] as const;

/**
 * Shape a CST code has to be written in: the 2 digits of the IPI, PIS and COFINS tables or
 * the 3 digits of the ICMS form (origin digit + Tabela B code), optionally split by a
 * single whitespace or mask character, the way documents print the origin apart ("0 10").
 */
export const CST_FORMAT_REGEX = /^\d[\s.\-/]?\d[\s.\-/]?\d?$/;
