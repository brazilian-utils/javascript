/* Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.
 *
 * The C surface of the shared core. A binding hands in pointers, lengths and integers; it owns
 * every buffer, and the core allocates nothing on its behalf.
 *
 * An option that was not given is passed as its "unset" sentinel: -1 for a number, 0 for a flag.
 * A function that answers text writes into `out` and returns the byte length; when the buffer
 * is too small nothing is written and the length needed is returned, so the caller can size it
 * and call again.
 */
#ifndef BRAZILIAN_UTILS_FORMAT_CNPJ_H
#define BRAZILIAN_UTILS_FORMAT_CNPJ_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value. */
intptr_t format_cnpj(const uint8_t * value_ptr, size_t value_len, int64_t options_version, int32_t options_obfuscate, int32_t options_pad, uint8_t *out, size_t out_len);

#ifdef __cplusplus
}
#endif

#endif
