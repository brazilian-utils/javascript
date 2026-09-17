/**
 * Brazilian non-geographic and service phone numbering.
 *
 * The Regulamento de Numeração dos Serviços de Telecomunicações (Resolução Anatel nº 749/2022,
 * which replaced the revoked Resolução nº 553/2010) defines two separate families, plus a third
 * one that is only a market convention:
 *
 * - **Código Não Geográfico (CNG)**, art. 18: a 10-digit code in the `300`, `303`, `500`, `800`
 *   or `900` series, dialed with the Prefixo Nacional `0` in front (art. 28), so 11 digits in
 *   total and never a DDD. `800` is toll-free for the caller, `300` and `303` split the cost
 *   (`303` marks subscribers that generate call bursts, such as telemarketing), `500` is for
 *   donation campaigns by non-profits and `900` for paid value-added services. The 10-digit
 *   `0800` + 6 form is extinct: Resolução nº 709/2019 art. 2º ordered every CNG migrated to the
 *   11-digit format. `900` is currently held in reserva técnica (Ato nº 12.712/2024, item 12.1),
 *   and `500` encodes the donation amount in its last two digits (item 10.6), a rule this
 *   library does not enforce, since it validates structure only.
 * - **Código de Acesso a Serviços de Utilidade Pública (SUP)**, art. 13-14: 3 digits, with the
 *   whole `1N₂N₁` range destined to SUP and every other 3-digit series held in reserva técnica.
 *   Individual codes are designated one by one by Anatel Ato, the consolidated table being the
 *   Anexo of Ato nº 43.151/2004, so the codes below are the ones Anatel has designated rather
 *   than the full `100`-`199` range. `112` and `911` are *not* among them: `911` is not even
 *   inside the `1N₂N₁` address space art. 13 destines to SUP, and neither code appears in the
 *   Anexo of Ato nº 43.151/2004 or in Ato nº 12.712/2024. Their routing on Brazilian handsets is
 *   a GSM convention of the handset, not an Anatel designation, so both are rejected here.
 * - **The abbreviated `300X`/`400X` numbers** (`3003-1234`, `4004-1234`) are *not* a regulatory
 *   category at all. They are ordinary 8-digit geographic STFC user numbers (art. 11 assigns
 *   `2`-`6` as the first digit of a fixed-line number) whose 4-digit prefix a carrier licenses
 *   in many DDDs at once and points at a single customer, marketed as "Número Único". Anatel
 *   withdrew the 4-digit special service codes instead of allocating them: Resolução nº 86/1998
 *   art. 43 I, in its last wording (Resolução nº 241, de 30 de novembro de 2000, which superseded
 *   the Resolução nº 229/2000 one), ordered the prestadoras de STFC to release "até 30 de julho de
 *   2001, os códigos de serviços especiais com 4 caracteres que estejam em uso", and Ato nº
 *   43.151/2004 art. 2º II repeated the order with a 180-day deadline. So the roots below are the
 *   conventional ones the market settled on, not an official allocation.
 *
 * Display formatting is convention too: no Anatel document specifies one. `0800 123 4567` (4-3-4)
 * is the grouping used on gov.br, and `4004-1234` the one carriers print.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * Resolução Anatel nº 749/2022, the Regulamento de Numeração in force.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151
 * Ato Anatel nº 43.151/2004, whose Anexo is the consolidated SUP designation table.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2140-ato-12712
 * Ato Anatel nº 12.712, de 04/09/2024, art. 1º: the Procedimento para a Atribuição e Designação
 * de Recursos de Numeração (Anexo I), in force since 03/12/2024, whose items 10.6 and 12.1 carry
 * the `500` donation-amount rule and the `900` reserva técnica.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/1998/336-resolucao-86
 * Resolução Anatel nº 86/1998 (revoked), art. 43 I: the release of the 4-character codes, in the
 * redação dada pela Resolução nº 241, de 30 de novembro de 2000, the last one the page carries.
 */

export const SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES = [
	"0300",
	"0303",
	"0500",
	"0800",
	"0900",
] as const;

export const SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH = 4;

export const SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH = 11;

export const SERVICE_PHONE_ABBREVIATED_ROOTS = ["300", "400"] as const;

export const SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH = 3;

export const SERVICE_PHONE_ABBREVIATED_LENGTH = 8;

export const SERVICE_PHONE_UTILITY_CODES = [
	"100",
	"102",
	"103",
	"104",
	"105",
	"106",
	"111",
	"115",
	"116",
	"117",
	"118",
	"121",
	"123",
	"125",
	"127",
	"128",
	"129",
	"130",
	"132",
	"133",
	"134",
	"135",
	"136",
	"138",
	"141",
	"142",
	"145",
	"146",
	"147",
	"148",
	"150",
	"151",
	"152",
	"153",
	"154",
	"155",
	"156",
	"157",
	"158",
	"159",
	"160",
	"161",
	"162",
	"163",
	"164",
	"165",
	"166",
	"167",
	"168",
	"174",
	"180",
	"181",
	"185",
	"188",
	"190",
	"191",
	"192",
	"193",
	"194",
	"195",
	"196",
	"197",
	"198",
	"199",
] as const;
