/**
 * CST (Código de Situação Tributária) code tables per tax: Ajuste SINIEF 03/1994 with the
 * Tabela A of Ajuste SINIEF 20/2012 and 15/2013 and the Tabela B of Ajuste SINIEF 06/2000 for
 * ICMS, and Instrução Normativa RFB nº 1.009/2010 (Tabelas I to III) for IPI, PIS and COFINS.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/1994/aj_003_94 Ajuste
 * SINIEF 03/1994, which instituted the ICMS CST as the two digit code AB.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2000/aj_006_00 Ajuste
 * SINIEF 06/2000, which gives the current Tabela B (the tributação pelo ICMS digits).
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2012/aj_020_12 Ajuste
 * SINIEF 20/2012, which gives Tabela A (origem da mercadoria, 0 to 7).
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2013/aj_015_13 Ajuste
 * SINIEF 15/2013, which added origem 8 to Tabela A.
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15974
 * Instrução Normativa RFB nº 1.009/2010, Tabelas I to III (CST-IPI, CST-PIS and CST-COFINS).
 */
export const ICMS_CST_CODES = [
	"00",
	"10",
	"20",
	"30",
	"40",
	"41",
	"50",
	"51",
	"60",
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
