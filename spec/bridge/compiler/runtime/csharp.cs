// The portable runtime for the C# target.
//
// C# strings are UTF-16, the same as JavaScript's, so indexes and lengths already line up;
// what is here is the rest: the compiled classes and patterns, and the JavaScript specific
// trimming rules.

using System;
using System.Text;

namespace BrazilianUtils.Bridge
{
    /// <summary>One step of a compiled pattern: repeat a class between Min and Max times.</summary>
    public sealed class PatternStep
    {
        public int[][] CharClass { get; }
        public long Min { get; }
        public long Max { get; }
        public bool Capture { get; }

        public PatternStep(int[][] charClass, long min, long max, bool capture)
        {
            CharClass = charClass;
            Min = min;
            Max = max;
            Capture = capture;
        }
    }

    /// <summary>Helpers shared by the generated utilities.</summary>
    public static class Runtime
    {
        /// <summary>The code points JavaScript's trim() strips; Trim() is a different set.</summary>
        private static readonly int[][] JsWhitespace =
        {
            new[] { 0x09, 0x0d }, new[] { 0x20, 0x20 }, new[] { 0xa0, 0xa0 },
            new[] { 0x1680, 0x1680 }, new[] { 0x2000, 0x200a }, new[] { 0x2028, 0x2029 },
            new[] { 0x202f, 0x202f }, new[] { 0x205f, 0x205f }, new[] { 0x3000, 0x3000 },
            new[] { 0xfeff, 0xfeff }
        };

        /// <summary>Whether a code point belongs to a class.</summary>
        public static bool InClass(int[][] charClass, int code)
        {
            foreach (var span in charClass)
            {
                if (code >= span[0] && code <= span[1])
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>Reads one code unit, or -1 when the index is out of range.</summary>
        public static long CodeAt(string value, long index)
        {
            if (index < 0 || index >= value.Length)
            {
                return -1;
            }

            return value[(int)index];
        }

        /// <summary>Takes the code units between two indexes, clamping like JavaScript's slice.</summary>
        public static string Slice(string value, long from, long to)
        {
            var start = Math.Max(0, from);
            var end = Math.Min(value.Length, to);

            if (start >= end)
            {
                return string.Empty;
            }

            return value.Substring((int)start, (int)(end - start));
        }

        /// <summary>Whether any character of the value belongs to the class.</summary>
        public static bool ClassHas(int[][] charClass, string value)
        {
            foreach (var character in value)
            {
                if (InClass(charClass, character))
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>Keeps only the characters of the value that belong to the class.</summary>
        public static string KeepClass(int[][] charClass, string value)
        {
            var kept = new StringBuilder();

            foreach (var character in value)
            {
                if (InClass(charClass, character))
                {
                    kept.Append(character);
                }
            }

            return kept.ToString();
        }

        /// <summary>Runs a compiled pattern against the whole value, without backtracking.</summary>
        public static bool PatternTest(PatternStep[] steps, string value)
        {
            var index = 0;

            foreach (var step in steps)
            {
                long count = 0;

                while ((step.Max < 0 || count < step.Max)
                       && index < value.Length
                       && InClass(step.CharClass, value[index]))
                {
                    index++;
                    count++;
                }

                if (count < step.Min)
                {
                    return false;
                }
            }

            return index == value.Length;
        }

        /// <summary>Strips the code points JavaScript's trim() strips.</summary>
        public static string JsTrim(string value)
        {
            var start = 0;
            var end = value.Length;

            while (start < end && InClass(JsWhitespace, value[start]))
            {
                start++;
            }

            while (end > start && InClass(JsWhitespace, value[end - 1]))
            {
                end--;
            }

            return value.Substring(start, end - start);
        }

        /// <summary>Left pads the value with a filler up to a length.</summary>
        public static string PadStart(string value, long length, string filler)
        {
            var padded = new StringBuilder();

            while (padded.Length + value.Length < length)
            {
                padded.Append(filler);
            }

            return padded + value;
        }

        /// <summary>Repeats a value.</summary>
        public static string Repeat(string value, long times)
        {
            return times <= 0 ? string.Empty : string.Concat(Enumerable(value, times));
        }

        private static System.Collections.Generic.IEnumerable<string> Enumerable(string value, long times)
        {
            for (long index = 0; index < times; index++)
            {
                yield return value;
            }
        }

        /// <summary>Reads an optional flag the way JavaScript reads truthiness.</summary>
        public static bool IsTruthy(bool? value)
        {
            return value == true;
        }

        /// <summary>Every row of a dataset, in the baked full order.</summary>
        public static string[][] DataAll(Dataset table)
        {
            return table.All;
        }

        /// <summary>The rows whose first column is the key given, empty when the key is unknown.</summary>
        public static string[][] DataRows(Dataset table, string key)
        {
            return table.Rows(key);
        }
    }

    /// <summary>A dataset: the rows in the baked full order, and the rows of each key.</summary>
    public sealed class Dataset
    {
        private static readonly string[][] Empty = new string[0][];

        public string[][] All { get; }

        private readonly System.Collections.Generic.Dictionary<string, string[][]> byKey;

        public Dataset(string[][] rows, string[] keys, int[][] groups, int[] fullOrder)
        {
            All = new string[fullOrder.Length][];

            for (var index = 0; index < fullOrder.Length; index++)
            {
                All[index] = rows[fullOrder[index]];
            }

            byKey = new System.Collections.Generic.Dictionary<string, string[][]>(keys.Length);

            for (var group = 0; group < keys.Length; group++)
            {
                var of = new string[groups[group].Length][];

                for (var index = 0; index < groups[group].Length; index++)
                {
                    of[index] = rows[groups[group][index]];
                }

                byKey[keys[group]] = of;
            }
        }

        /// <summary>The rows of one key, empty when the key is unknown.</summary>
        public string[][] Rows(string key)
        {
            return byKey.TryGetValue(key, out var found) ? found : Empty;
        }
    }
}
