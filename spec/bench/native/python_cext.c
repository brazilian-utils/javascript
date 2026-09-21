/*
 * A CPython extension module over the shared core.
 *
 * This is the cheapest boundary CPython has: `PyUnicode_AsUTF8AndSize` hands back the string's
 * own UTF-8 buffer (cached on the object, and the object itself for an ASCII string), so the
 * call marshals nothing — it passes a pointer and a length straight through to the core.
 *
 * It is also hand-written glue, which is the point: the DX layer of each package is written by
 * hand anyway, so a binding written the way that ecosystem writes bindings is fair game.
 */
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stddef.h>

extern int cpf_is_valid(const unsigned char *ptr, size_t len);
extern int cpf_is_valid_batch(const unsigned char *input, size_t input_len, unsigned char *output,
                              size_t count);

static PyObject *cpf_native_is_valid(PyObject *self, PyObject *value) {
    Py_ssize_t length = 0;
    const char *utf8 = NULL;

    (void)self;

    if (!PyUnicode_Check(value)) {
        Py_RETURN_FALSE;
    }

    utf8 = PyUnicode_AsUTF8AndSize(value, &length);

    if (utf8 == NULL) {
        PyErr_Clear();
        Py_RETURN_FALSE;
    }

    if (cpf_is_valid((const unsigned char *)utf8, (size_t)length)) {
        Py_RETURN_TRUE;
    }

    Py_RETURN_FALSE;
}

static PyObject *cpf_native_is_valid_batch(PyObject *self, PyObject *packed) {
    Py_ssize_t count = 0;
    PyObject *output = NULL;

    (void)self;

    if (!PyTuple_Check(packed) || PyTuple_GET_SIZE(packed) != 2) {
        PyErr_SetString(PyExc_TypeError, "expected (bytes, count)");

        return NULL;
    }

    count = PyLong_AsSsize_t(PyTuple_GET_ITEM(packed, 1));
    output = PyBytes_FromStringAndSize(NULL, count);

    if (output == NULL) {
        return NULL;
    }

    cpf_is_valid_batch((const unsigned char *)PyBytes_AS_STRING(PyTuple_GET_ITEM(packed, 0)),
                       (size_t)PyBytes_GET_SIZE(PyTuple_GET_ITEM(packed, 0)),
                       (unsigned char *)PyBytes_AS_STRING(output), (size_t)count);

    return output;
}

static PyMethodDef CpfNativeMethods[] = {
    {"is_valid", cpf_native_is_valid, METH_O, "Validate one CPF."},
    {"is_valid_batch", cpf_native_is_valid_batch, METH_O, "Validate a packed batch of CPFs."},
    {NULL, NULL, 0, NULL},
};

static struct PyModuleDef cpf_native_module = {
    PyModuleDef_HEAD_INIT, "cpf_native", "The shared CPF core, as a CPython extension.", -1,
    CpfNativeMethods,
};

PyMODINIT_FUNC PyInit_cpf_native(void) { return PyModule_Create(&cpf_native_module); }
