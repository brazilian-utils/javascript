import { parseNfeKey } from "../parse-nfe-key/parse-nfe-key";

/**
 * Validates a DF-e (Documento Fiscal eletrônico) access key (chave de acesso).
 *
 * Covers every document whose access key is the same 44 digit string: NF-e (modelo 55), NFC-e
 * (65), CT-e (57), MDF-e (58), CT-e OS (67, the Conhecimento de Transporte Eletrônico para
 * Outros Serviços), GTV-e (64, the CT-e Guia de Transporte de Valores), BP-e (63), NF3e (66)
 * and NFCom (62). The CF-e-SAT (59) is out: its 44 position "chave de consulta" is composed
 * differently. The 44 digits may be split into the printed groups of 4 by whitespace, `.`, `-`
 * or `/`, a run of them between two groups included, the same mask rule `isValidCpf` and
 * `isValidCnpj` follow; a separator inside a group of 4, or any other character, is rejected
 * instead of being stripped. The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes found
 * in the `Id` attribute of the document's XML (e.g. `Id="NFe3517...`) are stripped before that
 * check, with any whitespace between the prefix and the first group.
 *
 * The key is `cUF(2) AAMM(4) CNPJ/CPF(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)`, with
 * NFCom and NF3e spending position 36 on `nSiteAutoriz` and leaving 7 digits for `cNF`.
 * `tpEmis` must be one of the codes the MOC of that model assigns, so the accepted set changes
 * with the model: 1 to 7 and 9 for NF-e and NFC-e, `{1, 3, 4, 5, 7, 8}` for the CT-e,
 * `{1, 5, 7, 8}` for the CT-e OS, `{1, 2, 7, 8}` for the GTV-e, `{1, 2, 3}` for the MDF-e and
 * `{1, 2}` for the BP-e, the NF3e and the NFCom. Code 8, the authorização pela SVC-SP, is
 * assigned by the CT-e MOC only, never by the NF-e one.
 * The check digit (`cDV`) is a modulus 11 over the first 43 digits, weights 2-9 cycling from
 * the right, where a remainder of 0 or 1 maps to check digit 0.
 *
 * For NF-e and NFC-e the numeric code is also checked against rule B03-10 of the NF-e MOC,
 * which forbids the twenty repeated and sequential `cNF` values it lists and a `cNF` equal to
 * the document number.
 *
 * @param {string} value - The access key value to be validated.
 * @returns {boolean} True if the access key is valid, false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2007/AJ_009_07
 * Ajuste SINIEF 09/07, cláusula primeira, caput: the CT-e, modelo 57.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2019/AJ036_19
 * Ajuste SINIEF 36/19, cláusula primeira: the CT-e OS, modelo 67.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/ajustes/2020/ajuste-sinief-03-20
 * Ajuste SINIEF 03/20, cláusula primeira: the GTV-e, modelo 64.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/CTE/Documentos
 * CT-e MOC 4.00, Anexo I ("MOC CTe 4.00 Anexo I - Leiaute e Regras de Validação"): the `tpEmis`
 * domains D19, D27 and D15. Published by the SVRS dfe-portal, like the BP-e, NF3e and NFCom
 * manuals below; the cte.fazenda.gov.br manual index answers "Sistema temporariamente
 * indisponível" permanently.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/BPE/Documentos
 * BP-e MOC 1.00b, Visão Geral and Anexo I: modelo 63.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/NF3e/Documentos
 * NF3e MOC 1.00a, Visão Geral and Anexo I: modelo 66 and `nSiteAutoriz`.
 * @see Official: https://dfe-portal.svrs.rs.gov.br/NFCOM/Documentos
 * NFCom MOC 1.00a, Visão Geral and Anexo I: modelo 62 and `nSiteAutoriz`.
 * @see Based on: https://github.com/nfephp-org/sped-common/blob/master/src/Keys.php
 * NFePHP `Keys::build`/`Keys::isValid` reference implementation.
 * @see Based on: https://github.com/vmarchesin/br-validate-dfe-access-key
 * Second reference implementation and source of additional test vectors.
 *
 * @example
 * ```typescript
 * isValidNfeKey("35170458716523000119550010000000121000123458"); // true (NF-e, SP)
 * isValidNfeKey("NFe35170458716523000119550010000000121000123458"); // true (XML Id prefix)
 * isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"); // true (masked)
 * isValidNfeKey("3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458"); // true (any of the mask characters)
 * isValidNfeKey("351 70458716523000119550010000000121000123458"); // false (a separator inside a group of 4)
 * isValidNfeKey("99170458716523000119550010000000121000123458"); // false (invalid cUF)
 * isValidNfeKey("35170458716523000119010010000000121000123450"); // false (invalid mod)
 * ```
 */
export const isValidNfeKey = (value: string): boolean => parseNfeKey(value) !== null;
