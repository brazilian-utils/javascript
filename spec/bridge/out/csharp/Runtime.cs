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
        public static System.Collections.Generic.List<System.Collections.Generic.List<string>> DataAll(Dataset table)
        {
            return table.All;
        }

        /// <summary>The rows whose first column is the key given, empty when the key is unknown.</summary>
        public static System.Collections.Generic.List<System.Collections.Generic.List<string>> DataRows(
            Dataset table,
            string key)
        {
            return table.Rows(key);
        }
    }

    /// <summary>A dataset: the rows in the baked full order, and the rows of each key.</summary>
    public sealed class Dataset
    {
        private static readonly Rows Empty = new Rows();

        public Rows All { get; }

        private readonly System.Collections.Generic.Dictionary<string, Rows> byKey;

        public Dataset(string[][] rows, string[] keys, int[][] groups, int[] fullOrder)
        {
            var shared = new System.Collections.Generic.List<System.Collections.Generic.List<string>>(rows.Length);

            foreach (var row in rows)
            {
                shared.Add(new System.Collections.Generic.List<string>(row));
            }

            All = new Rows();

            foreach (var index in fullOrder)
            {
                All.Add(shared[index]);
            }

            byKey = new System.Collections.Generic.Dictionary<string, Rows>(keys.Length);

            for (var group = 0; group < keys.Length; group++)
            {
                var of = new Rows();

                foreach (var index in groups[group])
                {
                    of.Add(shared[index]);
                }

                byKey[keys[group]] = of;
            }
        }

        /// <summary>The rows of one key, empty when the key is unknown.</summary>
        public Rows Rows(string key)
        {
            return byKey.TryGetValue(key, out var found) ? found : Empty;
        }
    }

    /// <summary>A table of rows, which is what the generated code reads a dataset as.</summary>
    public sealed class Rows : System.Collections.Generic.List<System.Collections.Generic.List<string>>
    {
    }

    /// <summary>What a provider answered: the status, whether it is a success, and the body.</summary>
    public sealed class HttpResponse
    {
        public long Status { get; }
        public bool Ok { get; }
        public System.Text.Json.Nodes.JsonNode Body { get; }

        public HttpResponse(long status, bool ok, System.Text.Json.Nodes.JsonNode body)
        {
            Status = status;
            Ok = ok;
            Body = body;
        }
    }

    /// <summary>What one attempt of a race ended with.</summary>
    internal sealed class Outcome<T>
    {
        public bool Ok { get; init; }
        public T Value { get; init; }
        public System.Collections.Generic.List<string> Kinds { get; init; }
    }

    /// <summary>The running attempts of a race, and what each one ended with.</summary>
    public sealed class Attempts<T>
    {
        internal System.Collections.Generic.List<System.Threading.Tasks.Task<Outcome<T>>> Settled { get; } =
            new System.Collections.Generic.List<System.Threading.Tasks.Task<Outcome<T>>>();

        internal System.Collections.Generic.List<Outcome<T>> Outcomes { get; } =
            new System.Collections.Generic.List<Outcome<T>>();
    }

    /// <summary>The helpers the generated code needs for HTTP, JSON and racing.</summary>
    public static class Net
    {
        private static readonly System.Net.Http.HttpClient Client = new System.Net.Http.HttpClient
        {
            Timeout = System.TimeSpan.FromSeconds(15),
        };

        /// <summary>
        /// The origin every request is sent to instead of its own, when one is set. This is the
        /// conformance hook: the cross language replay points all seven targets at one local
        /// server, the same way the JavaScript suite points fetch at a mock.
        /// </summary>
        private static string Target(string url)
        {
            var origin = System.Environment.GetEnvironmentVariable("BRUTILS_BRIDGE_HTTP_ORIGIN");

            if (string.IsNullOrEmpty(origin))
            {
                return url;
            }

            return origin + "/" + System.Text.RegularExpressions.Regex.Replace(url, "^https?://", string.Empty);
        }

        /// <summary>Performs an HTTP GET, retrying a transient transport failure with a backoff.</summary>
        public static async System.Threading.Tasks.Task<HttpResponse> HttpGet(
            string url,
            long retries,
            long retryDelayMs)
        {
            var target = Target(url);

            for (long attempt = 0; ; attempt++)
            {
                try
                {
                    var answer = await Client.GetAsync(target).ConfigureAwait(false);
                    var status = (long)answer.StatusCode;
                    var text = await answer.Content.ReadAsStringAsync().ConfigureAwait(false);
                    System.Text.Json.Nodes.JsonNode body = null;

                    try
                    {
                        body = System.Text.Json.Nodes.JsonNode.Parse(text);
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        body = null;
                    }

                    return new HttpResponse(status, status >= 200 && status < 300, body);
                }
                catch (System.Exception)
                {
                    if (attempt >= retries)
                    {
                        return new HttpResponse(0, false, null);
                    }

                    await System.Threading.Tasks.Task.Delay((int)(retryDelayMs * (attempt + 1))).ConfigureAwait(false);
                }
            }
        }

        /// <summary>Whether a list holds a value.</summary>
        public static bool ListHas(System.Collections.Generic.List<string> items, string value)
        {
            return items.Contains(value);
        }

        /// <summary>Reads one field of a JSON body, treating anything that is not an object as empty.</summary>
        private static System.Text.Json.Nodes.JsonNode Field(System.Text.Json.Nodes.JsonNode body, string key)
        {
            if (body is not System.Text.Json.Nodes.JsonObject found)
            {
                return null;
            }

            return found.TryGetPropertyValue(key, out var value) ? value : null;
        }

        /// <summary>Reads a string field of a JSON body, answering "" when it is missing.</summary>
        public static string JsonString(System.Text.Json.Nodes.JsonNode body, string key)
        {
            var found = Field(body, key);

            if (found is System.Text.Json.Nodes.JsonValue value
                && value.TryGetValue<string>(out var text))
            {
                return text;
            }

            return string.Empty;
        }

        /// <summary>Reads an integer field of a JSON body, answering -1 when it is missing.</summary>
        public static long JsonInt(System.Text.Json.Nodes.JsonNode body, string key)
        {
            var found = Field(body, key);

            if (found is System.Text.Json.Nodes.JsonValue value && value.TryGetValue<double>(out var number))
            {
                return (long)number;
            }

            return -1;
        }

        /// <summary>Whether a field of a JSON body is truthy, the way JavaScript reads truthiness.</summary>
        public static bool JsonTruthy(System.Text.Json.Nodes.JsonNode body, string key)
        {
            var found = Field(body, key);

            if (found is null)
            {
                return false;
            }

            if (found is System.Text.Json.Nodes.JsonValue value)
            {
                if (value.TryGetValue<bool>(out var flag))
                {
                    return flag;
                }

                if (value.TryGetValue<double>(out var number))
                {
                    return number != 0;
                }

                if (value.TryGetValue<string>(out var text))
                {
                    return text.Length > 0;
                }
            }

            return true;
        }

        /// <summary>Whether a field of a JSON body is exactly true.</summary>
        public static bool JsonIsTrue(System.Text.Json.Nodes.JsonNode body, string key)
        {
            return Field(body, key) is System.Text.Json.Nodes.JsonValue value
                && value.TryGetValue<bool>(out var flag)
                && flag;
        }

        /// <summary>The error name and every name it inherits from.</summary>
        private static System.Collections.Generic.List<string> KindsOf(System.Exception error)
        {
            var kinds = new System.Collections.Generic.List<string>();

            for (var current = error.GetType(); current != null; current = current.BaseType)
            {
                kinds.Add(current.Name);
            }

            return kinds;
        }

        /// <summary>
        /// Starts one attempt per item, all at once. This is the only concurrency primitive of
        /// the portable subset.
        /// </summary>
        public static Attempts<T> StartAll<T>(
            System.Func<string, string, System.Threading.Tasks.Task<T>> run,
            System.Collections.Generic.List<string> items,
            string argument)
        {
            var attempts = new Attempts<T>();

            foreach (var item in items)
            {
                attempts.Settled.Add(Run(run, item, argument));
            }

            return attempts;
        }

        private static async System.Threading.Tasks.Task<Outcome<T>> Run<T>(
            System.Func<string, string, System.Threading.Tasks.Task<T>> run,
            string item,
            string argument)
        {
            try
            {
                return new Outcome<T>
                {
                    Ok = true,
                    Value = await run(item, argument).ConfigureAwait(false),
                    Kinds = new System.Collections.Generic.List<string>(),
                };
            }
            catch (System.Exception error)
            {
                return new Outcome<T> { Ok = false, Kinds = KindsOf(error) };
            }
        }

        /// <summary>The value of the first attempt that succeeds, or the default once all failed.</summary>
        public static async System.Threading.Tasks.Task<T> FirstSuccess<T>(Attempts<T> attempts)
        {
            var waiting = new System.Collections.Generic.List<System.Threading.Tasks.Task<Outcome<T>>>(attempts.Settled);

            while (waiting.Count > 0)
            {
                var settled = await System.Threading.Tasks.Task.WhenAny(waiting).ConfigureAwait(false);

                waiting.Remove(settled);

                var outcome = await settled.ConfigureAwait(false);

                attempts.Outcomes.Add(outcome);

                if (outcome.Ok)
                {
                    return outcome.Value;
                }
            }

            return default;
        }

        /// <summary>Whether any attempt failed with a given error kind.</summary>
        public static bool AnyFailedWith<T>(Attempts<T> attempts, string kind)
        {
            foreach (var outcome in attempts.Outcomes)
            {
                if (!outcome.Ok && outcome.Kinds.Contains(kind))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
