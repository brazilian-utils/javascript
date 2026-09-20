//! Runs the published crate against the corpus on stdin, printing the results as JSON.
//!
//! Usage: linked against a built `brazilian_utils` rlib, corpus on stdin.

use std::io::Read;

fn escape(value: &str) -> String {
    let mut out = String::from("\"");

    for char in value.chars() {
        match char {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            char if (char as u32) < 0x20 || (char as u32) > 0x7e => {
                let code = char as u32;

                if code > 0xffff {
                    let offset = code - 0x10000;
                    out.push_str(&format!("\\u{:04x}", 0xd800 + (offset >> 10)));
                    out.push_str(&format!("\\u{:04x}", 0xdc00 + (offset & 0x3ff)));
                } else {
                    out.push_str(&format!("\\u{:04x}", code));
                }
            }
            char => out.push(char),
        }
    }

    out.push('"');
    out
}

/// A corpus entry is a JSON string literal; this reads them back without a JSON crate.
fn parse_corpus(raw: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut chars = raw.chars().peekable();

    while let Some(char) = chars.next() {
        if char != '"' {
            continue;
        }

        let mut value = String::new();

        loop {
            match chars.next() {
                None | Some('"') => break,
                Some('\\') => match chars.next() {
                    Some('u') => {
                        let hex: String = (0..4).filter_map(|_| chars.next()).collect();
                        let code = u32::from_str_radix(&hex, 16).unwrap_or(0xfffd);

                        if (0xd800..0xdc00).contains(&code) {
                            let mut low = String::new();
                            chars.next();
                            chars.next();
                            for _ in 0..4 {
                                low.push(chars.next().unwrap_or('0'));
                            }
                            let trailing = u32::from_str_radix(&low, 16).unwrap_or(0xfffd);
                            let combined = 0x10000 + ((code - 0xd800) << 10) + (trailing - 0xdc00);
                            value.push(char::from_u32(combined).unwrap_or('\u{fffd}'));
                        } else {
                            value.push(char::from_u32(code).unwrap_or('\u{fffd}'));
                        }
                    }
                    Some('n') => value.push('\n'),
                    Some('r') => value.push('\r'),
                    Some('t') => value.push('\t'),
                    Some(other) => value.push(other),
                    None => break,
                },
                Some(other) => value.push(other),
            }
        }

        values.push(value);
    }

    values
}

fn main() {
    let mut raw = String::new();
    std::io::stdin().read_to_string(&mut raw).expect("corpus");

    let corpus = parse_corpus(&raw);

    let valid_cpf: Vec<String> = corpus
        .iter()
        .map(|value| brazilian_utils::cpf::is_valid(value).to_string())
        .collect();
    let valid_pis: Vec<String> = corpus
        .iter()
        .map(|value| brazilian_utils::pis::is_valid(value).to_string())
        .collect();
    let formatted: Vec<String> = corpus
        .iter()
        .map(|value| match brazilian_utils::cpf::format_cpf(value) {
            None => "null".to_string(),
            Some(text) => escape(&text),
        })
        .collect();

    println!(
        "{{\"is-valid-cpf\":[{}],\"is-valid-pis\":[{}],\"format-cpf\":[{}]}}",
        valid_cpf.join(","),
        valid_pis.join(","),
        formatted.join(",")
    );
}
