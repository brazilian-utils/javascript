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

use std::time::Instant;

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
        |value| coreout::is_valid_cpf(value.to_owned()),
    );
    compare(
        &mut rows,
        &mut disagreements,
        "isValidCnpj",
        "normalized",
        &CNPJS,
        brazilian_utils::cnpj::is_valid,
        |value| coreout::is_valid_cnpj(value.to_owned(), "1".to_owned()),
    );

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

    println!(
        "BENCH_JSON {{\"language\":\"rust\",\"toolchain\":{{\"rustc\":{}}},\"rows\":[{}],\"disagreements\":[{}],\"skipped\":[{}]}}",
        quote(env!("BENCH_RUSTC_VERSION")),
        row_json.join(","),
        disagreement_json.join(","),
        [
            quote("formatCnpj: brazilian_utils::cnpj::format_cnpj validates the checksum and answers None for a bad one; the generated format_cnpj never validates. Different contracts, not a fair timing comparison."),
            quote("isValidCnpj is compared at version \"1\" (numeric) only: the handwritten crate has no alphanumeric CNPJ support."),
        ]
        .join(",")
    );
}
