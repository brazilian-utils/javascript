/**
 * CST (Código de Situação Tributária) code tables per tax, per Ajuste SINIEF 07/2001 (Anexo,
 * Tabela B) for ICMS and IPI, and Instrução Normativa RFB n. 594/2005 (Tabelas 4.3.3 and 4.3.4)
 * for PIS and COFINS.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2001/aj007_01
 * @see Official: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15304
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
