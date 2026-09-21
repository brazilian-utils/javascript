//! The same validator, exposed through UniFFI instead of a hand written C ABI.
//!
//! This exists to measure what an off the shelf binding generator costs per call, against the
//! hand rolled ctypes binding in the same host language.

uniffi::setup_scaffolding!();

/// Validates one CPF under the `masked-strict` profile.
#[uniffi::export]
pub fn cpf_is_valid(value: String) -> bool {
    brutils_bench_core_logic::is_valid(&value)
}

/// Validates a whole batch in one call.
#[uniffi::export]
pub fn cpf_is_valid_batch(values: Vec<String>) -> Vec<bool> {
    values
        .iter()
        .map(|value| brutils_bench_core_logic::is_valid(value))
        .collect()
}

/// The validator itself, copied from the benchmark core so this crate does not need `no_std`.
mod brutils_bench_core_logic {
    const fn is_js_whitespace(code: u32) -> bool {
        matches!(
            code,
            0x09 | 0x0a
                | 0x0b
                | 0x0c
                | 0x0d
                | 0x20
                | 0xa0
                | 0x1680
                | 0x2028
                | 0x2029
                | 0x202f
                | 0x205f
                | 0x3000
                | 0xfeff
        ) || (code >= 0x2000 && code <= 0x200a)
    }

    const fn is_mask_cpf(code: u32) -> bool {
        code == 0x2e || code == 0x2d || code == 0x2f || is_js_whitespace(code)
    }

    fn check_digit(base: &[u8]) -> u32 {
        let mut sum: u32 = 0;
        let mut weight = base.len() as u32 + 1;

        for byte in base {
            sum += u32::from(*byte - b'0') * weight;
            weight -= 1;
        }

        let digit = 11 - (sum % 11);

        if digit >= 10 {
            0
        } else {
            digit
        }
    }

    pub fn is_valid(value: &str) -> bool {
        let trimmed = value.trim_matches(|char: char| is_js_whitespace(char as u32));
        let mut digits = [0u8; 11];
        let mut count = 0;
        let groups = [3usize, 3, 3, 2];
        let mut iter = trimmed.chars().peekable();

        for (position, size) in groups.iter().enumerate() {
            if position > 0 {
                while let Some(char) = iter.peek() {
                    if is_mask_cpf(*char as u32) {
                        iter.next();
                    } else {
                        break;
                    }
                }
            }

            for _ in 0..*size {
                match iter.next() {
                    Some(char) if char.is_ascii_digit() => {
                        digits[count] = char as u8;
                        count += 1;
                    }
                    _ => return false,
                }
            }
        }

        if iter.next().is_some() {
            return false;
        }

        let first = digits[0];

        if digits.iter().all(|digit| *digit == first) {
            return false;
        }

        if u32::from(digits[9] - b'0') != check_digit(&digits[..9]) {
            return false;
        }

        u32::from(digits[10] - b'0') == check_digit(&digits[..10])
    }
}
