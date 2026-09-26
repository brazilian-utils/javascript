import { format } from "../_internals/format/format";
import { formatCnpj } from "../format-cnpj/format-cnpj";
import { formatCpf } from "../format-cpf/format-cpf";
import {
	INTERNATIONAL_PREFIX,
	OBFUSCATED_INTERNATIONAL_MOBILE_MASK,
} from "../format-phone/constants";
import { getPixKeyInfo } from "../get-pix-key-info/get-pix-key-info";
import { obfuscateEmail } from "../obfuscate-email/obfuscate-email";

/**
 * Hides most of a Pix key with `*`, for the places where a key is shown to someone who should
 * only recognize it (LGPD, art. 6º III, necessidade), such as a list of registered keys.
 *
 * The key is identified by `getPixKeyInfo`, under the rules documented there, and each kind is
 * hidden by the utility that already knows how:
 * - `cpf`: `formatCpf` with `obfuscate`, `"***.456.789-**"`, the form the Banco Central itself
 *   prints for a "CPF mascarado" in the Pix user experience manual;
 * - `cnpj`: `formatCnpj` with `obfuscate`, `"**.345.678/0001-**"`;
 * - `phone`: `formatPhone` with the `"international"` mask and `obfuscate`,
 *   `"+55 11 *****-**21"`;
 * - `email`: `obfuscateEmail` over the lowercased address, `"fu****@ex*********"`;
 * - `evp`: returned whole, lowercased. The DICT manual defines the random key as a sequence
 *   "que não possui qualquer significado, a não ser o de servir como uma chave Pix", so it
 *   carries no personal data to hide.
 *
 * The user experience manual forbids masking the key on the screen where a payer confirms the
 * recipient ("Não deverá haver qualquer mascaramento de chave Pix no retorno da consulta ao
 * DICT"), so this is not meant for that screen.
 *
 * @param {string} value - The Pix key to obfuscate.
 * @returns {string} The obfuscated key, or an empty string when the value is not a valid Pix key.
 *
 * @example
 * ```typescript
 * obfuscatePixKey("123.456.789-09"); // "***.456.789-**"
 * obfuscatePixKey("12345678000195"); // "**.345.678/0001-**"
 * obfuscatePixKey("(11) 98765-4321"); // "+55 11 *****-**21"
 * obfuscatePixKey("Fulano@Example.com"); // "fu****@ex*********"
 * obfuscatePixKey("71C7D9BE-4B85-4E43-9F1C-1F3B8B4E9A2D"); // "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d"
 * obfuscatePixKey("not a key"); // ""
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/IV_RequisitosMinimosparaExperienciadoUsuario.pdf
 * Requisitos Mínimos para a Experiência do Usuário: "CPF mascarado (ex: ***.777.888-**)" and the
 * rule against masking the key on the confirmation screen.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/X_ManualOperacionaldoDICT.pdf
 * Manual Operacional do DICT: the five kinds of key and the definition of the random key.
 */
export const obfuscatePixKey = (value: string): string => {
	const key = getPixKeyInfo(value);

	if (!key) return "";

	if (key.type === "cpf") return formatCpf(key.value, { obfuscate: true });

	if (key.type === "cnpj") return formatCnpj(key.value, { version: 2, obfuscate: true });

	if (key.type === "phone") {
		// A phone key is always `+55` and a valid 11 digit mobile number, so this is the output of
		// `formatPhone(key.value, { mask: "international", obfuscate: true })` without the mask
		// resolution, the landline pattern and the service number branch it never reaches.
		const national = key.value.slice(INTERNATIONAL_PREFIX.length);

		return `${INTERNATIONAL_PREFIX} ${format({ value: national, pattern: OBFUSCATED_INTERNATIONAL_MOBILE_MASK })}`;
	}

	return key.type === "email" ? obfuscateEmail(key.value) : key.value;
};
