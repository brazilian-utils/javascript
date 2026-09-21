// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

namespace BrazilianUtils.Bridge
{


    /// <summary>Options of `isValidCnpj`.</summary>
    public sealed class IsValidCnpjOptions
    {
        /// <summary>Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`).</summary>
        public long? Version { get; set; }
    }

    /// <summary>`isValidCnpj`, written once.</summary>
    public static class IsValidCnpjUtility
    {
        private static readonly int[][] CLASS0 = { new[] { 0x30, 0x39 }, new[] { 0x41, 0x5a } };
        private static readonly int[][] CLASS1 = { new[] { 0x9, 0xd }, new[] { 0x20, 0x20 }, new[] { 0x2d, 0x2f }, new[] { 0xa0, 0xa0 }, new[] { 0x1680, 0x1680 }, new[] { 0x2000, 0x200a }, new[] { 0x2028, 0x2029 }, new[] { 0x202f, 0x202f }, new[] { 0x205f, 0x205f }, new[] { 0x3000, 0x3000 }, new[] { 0xfeff, 0xfeff } };
        private static readonly int[][] CLASS2 = { new[] { 0x30, 0x39 } };
        private static readonly int[][] CLASS3 = { new[] { 0x41, 0x5a } };
        private static readonly int[][] CLASS4 = { new[] { 0x30, 0x39 }, new[] { 0x41, 0x5a }, new[] { 0x61, 0x7a } };

        private static readonly PatternStep[] PATTERN_ALPHANUMERIC_FORMAT =
        {
            new PatternStep(CLASS0, 2, 2, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS0, 3, 3, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS0, 3, 3, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS0, 4, 4, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS2, 2, 2, false),
        };

        private static readonly PatternStep[] PATTERN_NUMERIC_FORMAT =
        {
            new PatternStep(CLASS2, 2, 2, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS2, 3, 3, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS2, 3, 3, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS2, 4, 4, false),
            new PatternStep(CLASS1, 0, -1, false),
            new PatternStep(CLASS2, 2, 2, false),
        };

        private static readonly long[] FIRST_DIGIT_WEIGHTS = new long[] { 5L, 4L, 3L, 2L, 9L, 8L, 7L, 6L, 5L, 4L, 3L, 2L };
        private static readonly long[] SECOND_DIGIT_WEIGHTS = new long[] { 6L, 5L, 4L, 3L, 2L, 9L, 8L, 7L, 6L, 5L, 4L, 3L, 2L };



        /// <summary>
        /// Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
        ///
        /// Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
        /// usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
        /// </summary>
        public static bool IsValidCnpj(string cnpj, IsValidCnpjOptions options = null)
        {
            long optionsVersion = -1L;
            if (options != null && options.Version != null)
            {
                optionsVersion = options.Version.Value;
            }
            if (cnpj == null)
            {
                return false;
            }
            string trimmed = Runtime.JsTrim(cnpj);
            if ((optionsVersion == 2L))
            {
                string cleaned = Runtime.KeepClass(CLASS4, cnpj).ToUpperInvariant();
                if (Runtime.ClassHas(CLASS3, cleaned))
                {
                    if (!Runtime.PatternTest(PATTERN_ALPHANUMERIC_FORMAT, trimmed.ToUpperInvariant()))
                    {
                        return false;
                    }
                    return HasValidChecksum(cleaned);
                }
            }
            string numeric = Runtime.KeepClass(CLASS2, cnpj);
            if (!Runtime.PatternTest(PATTERN_NUMERIC_FORMAT, trimmed))
            {
                return false;
            }
            if (IsRepeated(numeric))
            {
                return false;
            }
            return HasValidChecksum(numeric);
        }

        /// <summary>
        /// Computes one CNPJ check digit from the base and its weight vector.
        /// </summary>
        public static long CheckDigit(string @base, long[] weights)
        {
            long sum = 0L;
            for (long index = 0L; index < (long) weights.Length; index++)
            {
                sum = (sum + ((Runtime.CodeAt(@base, index) - 48L) * weights[(int) index]));
            }
            long remainder = (sum % 11L);
            if ((remainder < 2L))
            {
                return 0L;
            }
            return (11L - remainder);
        }

        /// <summary>
        /// Whether both check digits of a sanitized 14 character CNPJ match its base.
        /// </summary>
        public static bool HasValidChecksum(string cnpj)
        {
            if (((Runtime.CodeAt(cnpj, 12L) - 48L) != CheckDigit(cnpj, FIRST_DIGIT_WEIGHTS)))
            {
                return false;
            }
            return ((Runtime.CodeAt(cnpj, 13L) - 48L) == CheckDigit(cnpj, SECOND_DIGIT_WEIGHTS));
        }

        /// <summary>
        /// Whether every character of the value is the same one.
        /// </summary>
        public static bool IsRepeated(string @value)
        {
            if (((long) @value.Length == 0L))
            {
                return false;
            }
            for (long index = 1L; index < (long) @value.Length; index++)
            {
                if ((Runtime.CodeAt(@value, index) != Runtime.CodeAt(@value, 0L)))
                {
                    return false;
                }
            }
            return true;
        }
    }
}
