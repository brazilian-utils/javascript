/** The CONCLA category (natureza jurídica group) a legal nature code belongs to. */
export type LegalNatureCategory = {
	/** The category code, the first digit shared by every legal nature code in the group. */
	code: "1" | "2" | "3" | "4" | "5";
	/** The official category title in Portuguese, per IBGE/CONCLA. */
	description: string;
};

/**
 * The five categories of the Tabela de Natureza Jurídica 2021 (IBGE/CONCLA), indexed by the
 * first digit of the four digit code: the table groups its codes under these headings, so
 * "2062" (Sociedade Empresária Limitada) belongs to "2" (Entidades Empresariais). The legacy
 * codes a past revision of the table retired, which `LEGAL_NATURE` keeps, follow the same rule.
 *
 * The CONCLA table page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser; the detailed structure PDF next to it is served
 * normally and prints the same five headings.
 *
 * @see Official: https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021
 * @see Official: https://concla.ibge.gov.br/images/concla/documentacao/CONCLA-TNJ2021-EstruturaDetalhada.pdf
 */
export const LEGAL_NATURE_CATEGORIES: Record<string, LegalNatureCategory> = {
	"1": { code: "1", description: "Administração Pública" },
	"2": { code: "2", description: "Entidades Empresariais" },
	"3": { code: "3", description: "Entidades sem Fins Lucrativos" },
	"4": { code: "4", description: "Pessoas Físicas" },
	"5": {
		code: "5",
		description: "Organizações Internacionais e Outras Instituições Extraterritoriais",
	},
};
