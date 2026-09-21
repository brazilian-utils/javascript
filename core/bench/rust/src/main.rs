//! Generated Rust core against the handwritten `brazilian_utils` crate, on the same inputs.
//!
//! `brazilian_utils::cpf::is_valid` and `cnpj::is_valid` reject anything that is not already
//! digits-only before doing any work, which is the same contract the generated core takes, so
//! every row here is the `normalized` variant -- the same shape the Python rows have, and unlike
//! Go, whose port normalizes internally and therefore needs a full-pipeline row as well.
//!
//! `cnpj::format_cnpj` is left out for the reason Python's is: it validates the checksum and
//! answers `None` for a bad one, while the generated `format_cnpj` never validates, so timing
//! them against each other would mostly measure a checksum the generated side does not compute.
//!
//! `formatCurrency` has no full-pipeline shape to compare at all: the generated core's contract
//! (core/docs/contracts.md) always takes an already-scaled `Decimal<2>` `i64`, never a raw `f64`
//! -- scaling is DX work, done once outside the core -- so this row is `normalized` for the same
//! reason isValidCpf/isValidCnpj are: pre-processed input on both sides.
//!
//! `getHolidays` and `isBusinessDay` are not covered here: `brazilian_utils::date_utils` exposes
//! only `is_holiday(NaiveDate, Option<&str>) -> Option<bool>`, a single-day boolean check, not a
//! function returning a year's list, and it has no weekend/business-day concept at all. No fair
//! counterpart, so both rows are left out; see `core/bench/README.md`.
//!
//! `generateCpf`/`generateCnpj` draw at random, so there is nothing to compare for equality; see
//! the README for the "does every value validate" rule used instead. `BenchCapabilities::next_u32`
//! below is a small SplitMix64, a fast, real (not fixture-scripted), non-cryptographic generator --
//! the same kind of generator `rand::thread_rng()` is, which `brazilian_utils::cpf::generate` and
//! `cnpj::generate` already use, so the RNG choice itself is not what any gap here would measure.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

/// The "real" (non-fixture) environment `coreout::generate_cpf`/`generate_cnpj` need. Only
/// `next_u32` is ever called by them; the other three methods are unreachable stubs, since the
/// `Capabilities` trait requires all four.
struct BenchCapabilities {
    state: AtomicU64,
}

impl BenchCapabilities {
    fn new() -> Self {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x9E3779B97F4A7C15);
        BenchCapabilities { state: AtomicU64::new(seed | 1) }
    }
}

impl coreout::support::Capabilities for BenchCapabilities {
    fn request(&self, _request: coreout::support::HttpRequest) -> Option<coreout::support::HttpResponse> {
        panic!("not used by generate_cpf/generate_cnpj")
    }
    fn now(&self) -> i64 {
        panic!("not used by generate_cpf/generate_cnpj")
    }
    fn sleep(&self, _millis: i64) {
        panic!("not used by generate_cpf/generate_cnpj")
    }
    fn next_u32(&self) -> i64 {
        // SplitMix64, run once per call.
        let mut z = self
            .state
            .fetch_add(0x9E3779B97F4A7C15, Ordering::Relaxed)
            .wrapping_add(0x9E3779B97F4A7C15);
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
        z ^= z >> 31;
        (z & 0xFFFF_FFFF) as i64
    }
}

const WARMUP: usize = 20_000;
const ITERATIONS: usize = 200_000;

/// Already digits-only: what both sides' validators are documented to take.
const CPFS: [&str; 5] = [
    "12345678909",
    "52998224725",
    "00000000000",
    "11111111111",
    "12345678900",
];

const CNPJS: [&str; 4] = [
    "12345678000195",
    "11222333000181",
    "00000000000000",
    "12345678000100",
];

/// Raw doubles, the shape `brazilian_utils::currency::format_currency`'s own callers use.
/// Includes a negative value on purpose -- see the README's "formatCurrency" honesty note.
const CURRENCY_VALUES: [f64; 6] = [0.0, 1234.56, -1234.56, 0.5, 999999.99, 10.0];

/// The scaled integer (`Decimal<2>`) the generated core's `format_currency` requires.
fn to_cents(value: f64) -> i64 {
    (value * 100.0).round() as i64
}

const GENERATE_SAMPLES: usize = 500;

struct Row {
    utility: &'static str,
    variant: &'static str,
    handwritten_ms: f64,
    generated_ms: f64,
}

struct Disagreement {
    utility: &'static str,
    variant: &'static str,
    input: String,
    handwritten: String,
    generated: String,
}

fn measure(mut run: impl FnMut(usize)) -> f64 {
    for index in 0..WARMUP {
        run(index);
    }
    let started = Instant::now();
    for index in 0..ITERATIONS {
        run(index);
    }
    started.elapsed().as_secs_f64() * 1000.0
}

/// Times both sides of one comparison, but only after they agree on every input: a ratio between
/// two functions that answer differently is not a measurement of anything.
fn compare(
    rows: &mut Vec<Row>,
    disagreements: &mut Vec<Disagreement>,
    utility: &'static str,
    variant: &'static str,
    inputs: &[&str],
    handwritten: impl Fn(&str) -> bool,
    generated: impl Fn(&str) -> bool,
) {
    for input in inputs {
        let left = handwritten(input);
        let right = generated(input);
        if left != right {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: (*input).to_owned(),
                handwritten: left.to_string(),
                generated: right.to_string(),
            });
        }
    }

    println!("{utility} ({variant})");
    let handwritten_ms = measure(|index| {
        std::hint::black_box(handwritten(inputs[index % inputs.len()]));
    });
    println!("  handwritten                  {handwritten_ms:.1} ms");
    let generated_ms = measure(|index| {
        std::hint::black_box(generated(inputs[index % inputs.len()]));
    });
    println!("  generated                    {generated_ms:.1} ms");

    rows.push(Row { utility, variant, handwritten_ms, generated_ms });
}

/// Same as `compare`, but for `f64` inputs producing `String` outputs -- `formatCurrency`'s shape.
fn compare_currency(
    rows: &mut Vec<Row>,
    disagreements: &mut Vec<Disagreement>,
    utility: &'static str,
    variant: &'static str,
    inputs: &[f64],
    handwritten: impl Fn(f64) -> String,
    generated: impl Fn(f64) -> String,
) {
    for &input in inputs {
        let left = handwritten(input);
        let right = generated(input);
        if left != right {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: input.to_string(),
                handwritten: left.clone(),
                generated: right.clone(),
            });
        }
    }

    println!("{utility} ({variant})");
    let handwritten_ms = measure(|index| {
        std::hint::black_box(handwritten(inputs[index % inputs.len()]));
    });
    println!("  handwritten                  {handwritten_ms:.1} ms");
    let generated_ms = measure(|index| {
        std::hint::black_box(generated(inputs[index % inputs.len()]));
    });
    println!("  generated                    {generated_ms:.1} ms");

    rows.push(Row { utility, variant, handwritten_ms, generated_ms });
}

/// The README's generator agreement rule: `generateCpf`/`generateCnpj` draw at random, so there is
/// nothing to compare for equality. Instead, every value either side produces must validate under
/// BOTH validators -- its own port's and the generated core's -- before either side is timed.
fn check_generator_agreement(
    disagreements: &mut Vec<Disagreement>,
    utility: &'static str,
    variant: &'static str,
    handwritten_generate: impl Fn() -> String,
    handwritten_is_valid: impl Fn(&str) -> bool,
    generated_generate: impl Fn() -> String,
    generated_is_valid: impl Fn(&str) -> bool,
) {
    for _ in 0..GENERATE_SAMPLES {
        let from_handwritten = handwritten_generate();
        if !handwritten_is_valid(&from_handwritten) {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: from_handwritten.clone(),
                handwritten: "rejected by its own port's validator".to_owned(),
                generated: "n/a".to_owned(),
            });
        }
        if !generated_is_valid(&from_handwritten) {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: from_handwritten,
                handwritten: "valid (own validator)".to_owned(),
                generated: "rejected by the generated core's validator".to_owned(),
            });
        }

        let from_generated = generated_generate();
        if !generated_is_valid(&from_generated) {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: from_generated.clone(),
                handwritten: "n/a".to_owned(),
                generated: "rejected by the generated core's own validator".to_owned(),
            });
        }
        if !handwritten_is_valid(&from_generated) {
            disagreements.push(Disagreement {
                utility,
                variant,
                input: from_generated,
                handwritten: "rejected by its own port's validator".to_owned(),
                generated: "valid (own validator)".to_owned(),
            });
        }
    }
}

fn compare_generate(
    rows: &mut Vec<Row>,
    utility: &'static str,
    handwritten_generate: impl Fn() -> String,
    generated_generate: impl Fn() -> String,
) {
    let variant = "generate";
    println!("{utility} ({variant})");
    let handwritten_ms = measure(|_| {
        std::hint::black_box(handwritten_generate());
    });
    println!("  handwritten                  {handwritten_ms:.1} ms");
    let generated_ms = measure(|_| {
        std::hint::black_box(generated_generate());
    });
    println!("  generated                    {generated_ms:.1} ms");
    rows.push(Row { utility, variant, handwritten_ms, generated_ms });
}

/// Minimal JSON writing, so the harness needs no dependency of its own beyond the two it compares.
fn quote(value: &str) -> String {
    let escaped: String = value
        .chars()
        .flat_map(|c| match c {
            '"' => vec!['\\', '"'],
            '\\' => vec!['\\', '\\'],
            other => vec![other],
        })
        .collect();
    format!("\"{escaped}\"")
}

fn main() {
    let mut rows = Vec::new();
    let mut disagreements = Vec::new();

    compare(
        &mut rows,
        &mut disagreements,
        "isValidCpf",
        "normalized",
        &CPFS,
        brazilian_utils::cpf::is_valid,
        |value| coreout::is_valid_cpf(value),
    );
    compare(
        &mut rows,
        &mut disagreements,
        "isValidCnpj",
        "normalized",
        &CNPJS,
        brazilian_utils::cnpj::is_valid,
        |value| coreout::is_valid_cnpj(value, "1"),
    );

    compare_currency(
        &mut rows,
        &mut disagreements,
        "formatCurrency",
        "normalized",
        &CURRENCY_VALUES,
        |value| brazilian_utils::currency::format_currency(value).unwrap(),
        |value| coreout::format_currency(to_cents(value), true),
    );

    let env = BenchCapabilities::new(); // built once, like a real caller would, then reused
    check_generator_agreement(
        &mut disagreements,
        "generateCpf",
        "generate",
        brazilian_utils::cpf::generate,
        brazilian_utils::cpf::is_valid,
        || coreout::generate_cpf(&env),
        |value| coreout::is_valid_cpf(value),
    );
    compare_generate(&mut rows, "generateCpf", brazilian_utils::cpf::generate, || {
        coreout::generate_cpf(&env)
    });

    // brazilian_utils::cnpj::generate(None) defaults to branch=1 (fixed), not a random branch like
    // the generated core -- irrelevant here, since only validity is being checked; see the README.
    check_generator_agreement(
        &mut disagreements,
        "generateCnpj",
        "generate",
        || brazilian_utils::cnpj::generate(None),
        brazilian_utils::cnpj::is_valid,
        || coreout::generate_cnpj(&env),
        |value| coreout::is_valid_cnpj(value, "1"),
    );
    compare_generate(&mut rows, "generateCnpj", || brazilian_utils::cnpj::generate(None), || {
        coreout::generate_cnpj(&env)
    });

    let row_json: Vec<String> = rows
        .iter()
        .map(|row| {
            format!(
                "{{\"utility\":{},\"variant\":{},\"handwrittenMs\":{:.4},\"generatedMs\":{:.4},\"iterations\":{}}}",
                quote(row.utility),
                quote(row.variant),
                row.handwritten_ms,
                row.generated_ms,
                ITERATIONS
            )
        })
        .collect();
    let disagreement_json: Vec<String> = disagreements
        .iter()
        .map(|item| {
            format!(
                "{{\"utility\":{},\"variant\":{},\"input\":{},\"handwritten\":{},\"generated\":{}}}",
                quote(item.utility),
                quote(item.variant),
                quote(&item.input),
                quote(&item.handwritten),
                quote(&item.generated)
            )
        })
        .collect();

    // (utility, reason) pairs, matching the {utility, reason} object shape every other language's
    // harness emits, so run.mjs's generic "Comparisons left out" printer renders these the same way.
    let skipped: [(&str, &str); 4] = [
        ("formatCnpj", "brazilian_utils::cnpj::format_cnpj validates the checksum and answers None for a bad one; the generated format_cnpj never validates. Different contracts, not a fair timing comparison."),
        ("isValidCnpj", "compared at version \"1\" (numeric) only: the handwritten crate has no alphanumeric CNPJ support."),
        ("getHolidays", "brazilian_utils::date_utils has no getHolidays, only is_holiday(NaiveDate, Option<&str>), a single-day boolean check, not a function returning a year's list. No comparable counterpart."),
        ("isBusinessDay", "brazilian_utils has no isBusinessDay or business-day/weekend concept at all -- only is_holiday, which does not consider weekends. No comparable counterpart."),
    ];
    let skipped_json: Vec<String> = skipped
        .iter()
        .map(|(utility, reason)| format!("{{\"utility\":{},\"reason\":{}}}", quote(utility), quote(reason)))
        .collect();

    println!(
        "BENCH_JSON {{\"language\":\"rust\",\"toolchain\":{{\"rustc\":{}}},\"rows\":[{}],\"disagreements\":[{}],\"skipped\":[{}]}}",
        quote(env!("BENCH_RUSTC_VERSION")),
        row_json.join(","),
        disagreement_json.join(","),
        skipped_json.join(",")
    );
}

