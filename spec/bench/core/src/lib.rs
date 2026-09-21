//! The shared core used by every non source level arm of the benchmark.
//!
//! It implements exactly one thing — `isValidCpf` under the `masked-strict` profile — with the
//! same steps the generated code uses, so the only difference between the arms is how the call
//! crosses the language boundary.
//!
//! Two entry points on purpose:
//!
//! * `cpf_is_valid` takes one string and answers one bool: the shape a binding generator
//!   produces from a spec, and the shape an application actually calls.
//! * `cpf_is_valid_batch` takes a packed buffer of N strings and fills N bytes: the shape you
//!   fall back to when the boundary turns out to cost more than the work itself.

#![no_std]

const fn is_ascii_digit(code: u32) -> bool {
    code >= 0x30 && code <= 0x39
}

/// The code points JavaScript's `trim()` strips and its `\s` matches.
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

/// Validates one CPF under the `masked-strict` profile.
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
                Some(char) if is_ascii_digit(char as u32) => {
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

// ---------------------------------------------------------------------------
// C ABI, used by the FFI arms and by the wasm arms alike.
// ---------------------------------------------------------------------------

/// Validates one CPF held at `ptr` for `len` bytes of UTF-8. Returns 1 or 0.
///
/// # Safety
///
/// `ptr` must point at `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn cpf_is_valid(ptr: *const u8, len: usize) -> i32 {
    let bytes = core::slice::from_raw_parts(ptr, len);

    match core::str::from_utf8(bytes) {
        Err(_) => 0,
        Ok(value) => i32::from(is_valid(value)),
    }
}

/// Validates `count` CPFs packed as [u32 length][bytes]... and writes one byte per verdict.
///
/// # Safety
///
/// `input` must hold the packed buffer and `output` at least `count` writable bytes.
#[no_mangle]
pub unsafe extern "C" fn cpf_is_valid_batch(
    input: *const u8,
    input_len: usize,
    output: *mut u8,
    count: usize,
) -> i32 {
    let buffer = core::slice::from_raw_parts(input, input_len);
    let results = core::slice::from_raw_parts_mut(output, count);
    let mut offset = 0;

    for slot in results.iter_mut() {
        if offset + 4 > buffer.len() {
            return -1;
        }

        let length = u32::from_le_bytes([
            buffer[offset],
            buffer[offset + 1],
            buffer[offset + 2],
            buffer[offset + 3],
        ]) as usize;

        offset += 4;

        if offset + length > buffer.len() {
            return -1;
        }

        *slot = match core::str::from_utf8(&buffer[offset..offset + length]) {
            Err(_) => 0,
            Ok(value) => u8::from(is_valid(value)),
        };

        offset += length;
    }

    0
}

// ---------------------------------------------------------------------------
// A bump arena, so a wasm host can hand strings in without a real allocator.
// ---------------------------------------------------------------------------

const ARENA_SIZE: usize = 1 << 21;
static mut ARENA: [u8; ARENA_SIZE] = [0; ARENA_SIZE];
static mut ARENA_USED: usize = 0;

/// Reserves `len` bytes of the arena and returns a pointer to them.
#[no_mangle]
pub extern "C" fn arena_alloc(len: usize) -> *mut u8 {
    unsafe {
        let base = core::ptr::addr_of_mut!(ARENA) as *mut u8;

        if ARENA_USED + len > ARENA_SIZE {
            ARENA_USED = 0;
        }

        let offset = ARENA_USED;

        ARENA_USED += len;

        base.add(offset)
    }
}

/// Empties the arena.
#[no_mangle]
pub extern "C" fn arena_reset() {
    unsafe {
        ARENA_USED = 0;
    }
}

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

#[cfg(not(target_arch = "wasm32"))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

/// A `no_std` cdylib still has this symbol referenced by the unwinder; `panic = "abort"` means
/// it is never called.
#[cfg(not(target_arch = "wasm32"))]
#[no_mangle]
pub extern "C" fn rust_eh_personality() {}
