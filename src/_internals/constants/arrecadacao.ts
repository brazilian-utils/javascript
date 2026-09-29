/**
 * Layout of the "arrecadação" (convênio/tributos) bank slip.
 *
 * Barcode (44 positions, §04): 01 product ("8"), 02 segment, 03 value identifier
 * (6, 7, 8 or 9), 04 overall check digit (modulus 10 or 11 per position 03), 05-15 amount,
 * 16-19 issuing company, 20-44 free field. The linha digitável splits the barcode into
 * 4 blocks of 11 digits, each one followed by its own check digit (§03-E). There is no
 * segment 8 nor 0, and 9 is reserved for the banks themselves. Versão 08 adds the alphanumeric
 * CNPJ: positions 16-23 may carry a CNPJ only when it is numeric, and segment 6 gets no new
 * codes; the structure checked here is unchanged.
 *
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * FEBRABAN "Layout Padrão de Arrecadação/Recebimento com Utilização do Código de Barras",
 * Versão 08 (file of 11/05/2026), "Vigência: a partir de 01.06.2026".
 */

export const ARRECADACAO_PRODUCT = "8";

export const ARRECADACAO_BARCODE_LENGTH = 44;

export const ARRECADACAO_LINE_LENGTH = 48;

export const ARRECADACAO_BLOCK_LENGTH = 11;

export const ARRECADACAO_BLOCKS = 4;

export const ARRECADACAO_CHECK_DIGIT_POSITION = 3;

export const ARRECADACAO_VALUE_START = 4;

export const ARRECADACAO_VALUE_END = 15;

export const ARRECADACAO_SEGMENTS = ["1", "2", "3", "4", "5", "6", "7"] as const;
