/*
 * A Ruby C extension over the shared core.
 *
 * `RSTRING_PTR` and `RSTRING_LEN` read the string object's own buffer, so nothing is copied:
 * the call passes a pointer and a length straight through to the core. This is the boundary
 * a gem ships when it cares, as opposed to `fiddle` or the `ffi` gem, which are what a script
 * reaches for.
 */
#include <ruby.h>
#include <stddef.h>

extern int cpf_is_valid(const unsigned char *ptr, size_t len);
extern int cpf_is_valid_batch(const unsigned char *input, size_t input_len, unsigned char *output,
                              size_t count);

static VALUE cpf_native_is_valid(VALUE self, VALUE value) {
    (void)self;

    if (!RB_TYPE_P(value, T_STRING)) {
        return Qfalse;
    }

    return cpf_is_valid((const unsigned char *)RSTRING_PTR(value), (size_t)RSTRING_LEN(value))
               ? Qtrue
               : Qfalse;
}

static VALUE cpf_native_is_valid_batch(VALUE self, VALUE packed, VALUE count) {
    VALUE output = Qnil;
    long total = 0;

    (void)self;
    total = NUM2LONG(count);
    output = rb_str_new(NULL, total);

    cpf_is_valid_batch((const unsigned char *)RSTRING_PTR(packed), (size_t)RSTRING_LEN(packed),
                       (unsigned char *)RSTRING_PTR(output), (size_t)total);

    return output;
}

void Init_cpf_native(void) {
    VALUE module = rb_define_module("CpfNative");

    rb_define_module_function(module, "is_valid", cpf_native_is_valid, 1);
    rb_define_module_function(module, "is_valid_batch", cpf_native_is_valid_batch, 2);
}
