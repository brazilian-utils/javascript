// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

namespace BrazilianUtils.Bridge
{


    /// <summary>Options of `formatCnpj`.</summary>
    public sealed class FormatCnpjOptions
    {
        /// <summary>Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`).</summary>
        public bool? Pad { get; set; }

        /// <summary>Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`).</summary>
        public long? Version { get; set; }

        /// <summary>Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`).</summary>
        public bool? Obfuscate { get; set; }
    }

    /// <summary>`formatCnpj`, written once.</summary>
    public static class FormatCnpjUtility
    {
        private static readonly int[][] CLASS0 = { new[] { 0x30, 0x39 } };
        private static readonly int[][] CLASS1 = { new[] { 0x30, 0x39 }, new[] { 0x41, 0x5a }, new[] { 0x61, 0x7a } };



        private const string PATTERN = "00.000.000/0000-00";
        private const string OBFUSCATED_PATTERN = "**.000.000/0000-**";



        /// <summary>
        /// Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
        /// </summary>
        public static string FormatCnpj(string @value, FormatCnpjOptions options = null)
        {
            long optionsVersion = -1L;
            if (options != null && options.Version != null)
            {
                optionsVersion = options.Version.Value;
            }
            bool optionsObfuscate = false;
            if (options != null && options.Obfuscate != null)
            {
                optionsObfuscate = options.Obfuscate.Value;
            }
            bool optionsPad = false;
            if (options != null && options.Pad != null)
            {
                optionsPad = options.Pad.Value;
            }
            if (@value == null)
            {
                return "";
            }
            string text = @value;
            string cleaned = Runtime.KeepClass(CLASS0, text);
            if ((optionsVersion == 2L))
            {
                cleaned = Runtime.KeepClass(CLASS1, text).ToUpperInvariant();
            }
            string pattern = PATTERN;
            if (optionsObfuscate)
            {
                pattern = OBFUSCATED_PATTERN;
            }
            return Layout(cleaned, pattern, optionsPad);
        }

        /// <summary>
        /// Lays a value over a pattern.
        /// </summary>
        public static string Layout(string @value, string pattern, bool pad)
        {
            long slots = 0L;
            for (long index = 0L; index < (long) pattern.Length; index++)
            {
                if (((Runtime.CodeAt(pattern, index) == 48L) || (Runtime.CodeAt(pattern, index) == 42L)))
                {
                    slots = (slots + 1L);
                }
            }
            string padded = @value;
            if (pad)
            {
                padded = Runtime.PadStart(@value, slots, "0");
            }
            string formatted = "";
            long cursor = 0L;
            for (long index = 0L; index < (long) pattern.Length; index++)
            {
                long slot = Runtime.CodeAt(pattern, index);
                if (((slot == 48L) || (slot == 42L)))
                {
                    if ((cursor >= (long) padded.Length))
                    {
                        return formatted;
                    }
                    if ((slot == 42L))
                    {
                        formatted = (formatted + "*");
                    }
                    else
                    {
                        formatted = (formatted + Runtime.Slice(padded, cursor, (cursor + 1L)));
                    }
                    cursor = (cursor + 1L);
                }
                else
                {
                    if ((cursor < (long) padded.Length))
                    {
                        formatted = (formatted + Runtime.Slice(pattern, index, (index + 1L)));
                    }
                }
            }
            return formatted;
        }
    }
}
