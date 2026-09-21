// C# arms: handwritten source against the shared core over P/Invoke.
//
// .NET has the cheapest boundary of the managed runtimes measured here. `[SuppressGCTransition]`
// tells the runtime the callee is short and never blocks, so the call skips the transition to
// preemptive GC mode and becomes little more than an indirect jump. The string still has to
// reach the core as UTF-8 bytes, which is a `stackalloc` and an encode — measured as part of
// the `ffi` arm, because a real binding pays it too.

using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

internal static class Program
{
    // The code points JavaScript's trim() strips. .NET's Trim() is a different set, and C#
    // expands a unicode escape before lexing, so the set is built from numbers, not escapes.
    private static readonly string Whitespace = new string(new[]
    {
        (char)0x09, (char)0x0a, (char)0x0b, (char)0x0c, (char)0x0d, (char)0x20, (char)0xa0,
        (char)0x1680, (char)0x2000, (char)0x2001, (char)0x2002, (char)0x2003, (char)0x2004,
        (char)0x2005, (char)0x2006, (char)0x2007, (char)0x2008, (char)0x2009, (char)0x200a,
        (char)0x2028, (char)0x2029, (char)0x202f, (char)0x205f, (char)0x3000, (char)0xfeff,
    });

    private static readonly Regex Shape = new Regex(
        "^[0-9]{3}[" + Whitespace + "./-]*[0-9]{3}[" + Whitespace + "./-]*[0-9]{3}["
            + Whitespace + "./-]*[0-9]{2}$",
        RegexOptions.Compiled);

    private static readonly Regex NonDigits = new Regex("[^0-9]", RegexOptions.Compiled);

    private static int CheckDigit(string basis)
    {
        var sum = 0;
        var weight = basis.Length + 1;

        for (var index = 0; index < basis.Length; index++)
        {
            sum += (basis[index] - '0') * weight;
            weight--;
        }

        var digit = 11 - (sum % 11);

        return digit >= 10 ? 0 : digit;
    }

    private static string TrimJs(string value)
    {
        var start = 0;
        var end = value.Length;

        while (start < end && Whitespace.IndexOf(value[start]) >= 0)
        {
            start++;
        }

        while (end > start && Whitespace.IndexOf(value[end - 1]) >= 0)
        {
            end--;
        }

        return value.Substring(start, end - start);
    }

    private static bool HandwrittenIsValid(string cpf)
    {
        if (cpf == null)
        {
            return false;
        }

        if (!Shape.IsMatch(TrimJs(cpf)))
        {
            return false;
        }

        var digits = NonDigits.Replace(cpf, string.Empty);
        var first = digits[0];
        var repeated = true;

        for (var index = 1; index < digits.Length; index++)
        {
            if (digits[index] != first)
            {
                repeated = false;

                break;
            }
        }

        if (repeated)
        {
            return false;
        }

        return digits[9] - '0' == CheckDigit(digits.Substring(0, 9))
            && digits[10] - '0' == CheckDigit(digits.Substring(0, 10));
    }

    // --- the shared core -------------------------------------------------------------------

    private const string Core = "brutils_bench_core";

    [DllImport(Core, EntryPoint = "cpf_is_valid")]
    [SuppressGCTransition]
    private static extern unsafe int CpfIsValidFast(byte* ptr, nuint len);

    [DllImport(Core, EntryPoint = "cpf_is_valid")]
    private static extern unsafe int CpfIsValidPlain(byte* ptr, nuint len);

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static unsafe bool FfiIsValid(string value)
    {
        Span<byte> buffer = stackalloc byte[128];
        var written = Encoding.UTF8.GetBytes(value.AsSpan(), buffer);

        fixed (byte* ptr = buffer)
        {
            return CpfIsValidFast(ptr, (nuint)written) == 1;
        }
    }

    private static int RunHandwritten(string[] corpus)
    {
        var valid = 0;

        foreach (var value in corpus)
        {
            if (HandwrittenIsValid(value))
            {
                valid++;
            }
        }

        return valid;
    }

    private static int RunFfi(string[] corpus)
    {
        var valid = 0;

        foreach (var value in corpus)
        {
            if (FfiIsValid(value))
            {
                valid++;
            }
        }

        return valid;
    }

    /// <summary>Just the boundary: the same bytes every time, no marshalling at all.</summary>
    private static unsafe int RunFfiCallOnly(string[] corpus)
    {
        Span<byte> buffer = stackalloc byte[16];
        var written = Encoding.UTF8.GetBytes("12345678909".AsSpan(), buffer);
        var valid = 0;

        fixed (byte* ptr = buffer)
        {
            for (var index = 0; index < corpus.Length; index++)
            {
                if (CpfIsValidFast(ptr, (nuint)written) == 1)
                {
                    valid++;
                }
            }
        }

        return valid;
    }

    /// <summary>The same boundary with the GC transition, to show what suppressing it is worth.</summary>
    private static unsafe int RunFfiPlainCallOnly(string[] corpus)
    {
        Span<byte> buffer = stackalloc byte[16];
        var written = Encoding.UTF8.GetBytes("12345678909".AsSpan(), buffer);
        var valid = 0;

        fixed (byte* ptr = buffer)
        {
            for (var index = 0; index < corpus.Length; index++)
            {
                if (CpfIsValidPlain(ptr, (nuint)written) == 1)
                {
                    valid++;
                }
            }
        }

        return valid;
    }

    private static void Measure(string arm, string[] corpus, Func<string[], int> run)
    {
        for (var warm = 0; warm < 50; warm++)
        {
            run(corpus);
        }

        var best = double.PositiveInfinity;
        var valid = 0;

        for (var rep = 0; rep < 15; rep++)
        {
            var started = Stopwatch.GetTimestamp();

            valid = run(corpus);

            var elapsed = (Stopwatch.GetTimestamp() - started) * (1e9 / Stopwatch.Frequency);
            var perOp = elapsed / corpus.Length;

            if (perOp < best)
            {
                best = perOp;
            }
        }

        Console.WriteLine(
            $"{{\"lang\":\"csharp\",\"arm\":\"{arm}\",\"nsPerOp\":{best.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)},\"valid\":{valid}}}");
    }

    public static int Main(string[] args)
    {
        NativeLibrary.SetDllImportResolver(
            typeof(Program).Assembly,
            (name, assembly, path) =>
                name == Core ? NativeLibrary.Load(args[1]) : IntPtr.Zero);

        var corpus = JsonSerializer.Deserialize<string[]>(File.ReadAllText(args[0]));

        Measure("handwritten", corpus, RunHandwritten);
        Measure("ffi", corpus, RunFfi);
        Measure("ffi-callonly", corpus, RunFfiCallOnly);
        Measure("ffi-plain-callonly", corpus, RunFfiPlainCallOnly);

        return 0;
    }
}
