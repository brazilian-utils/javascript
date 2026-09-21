//! A minimal JSON reader and writer for the differential driver's own protocol. This is driver
//! code, not project code: the driver has to speak JSON lines to the conformance harness, and
//! `std` has none, so this is the one piece of machinery it needs that `std` does not supply —
//! not a general-purpose JSON library, just enough to round-trip the protocol's own shapes
//! (numbers, strings, bools, null, arrays and objects of those).

#[derive(Clone, Debug, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Json>),
    Object(Vec<(String, Json)>),
}

impl Json {
    pub fn as_str(&self) -> &str {
        match self {
            Json::String(s) => s,
            _ => "",
        }
    }

    pub fn as_i64(&self) -> i64 {
        match self {
            Json::Number(n) => *n as i64,
            _ => 0,
        }
    }

    pub fn as_f64(&self) -> f64 {
        match self {
            Json::Number(n) => *n,
            _ => 0.0,
        }
    }

    pub fn as_bool(&self) -> bool {
        matches!(self, Json::Bool(true))
    }

    pub fn as_array(&self) -> &[Json] {
        match self {
            Json::Array(items) => items,
            _ => &[],
        }
    }

    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Object(fields) => fields
                .iter()
                .find(|(name, _)| name == key)
                .map(|(_, value)| value),
            _ => None,
        }
    }
}

pub fn parse(text: &str) -> Json {
    let chars: Vec<char> = text.chars().collect();
    let mut pos = 0usize;
    parse_value(&chars, &mut pos)
}

fn skip_space(chars: &[char], pos: &mut usize) {
    while *pos < chars.len() && chars[*pos].is_whitespace() {
        *pos += 1;
    }
}

fn parse_value(chars: &[char], pos: &mut usize) -> Json {
    skip_space(chars, pos);
    match chars.get(*pos) {
        Some('{') => parse_object(chars, pos),
        Some('[') => parse_array(chars, pos),
        Some('"') => Json::String(parse_string(chars, pos)),
        Some('t') => {
            *pos += 4;
            Json::Bool(true)
        }
        Some('f') => {
            *pos += 5;
            Json::Bool(false)
        }
        Some('n') => {
            *pos += 4;
            Json::Null
        }
        _ => parse_number(chars, pos),
    }
}

fn parse_object(chars: &[char], pos: &mut usize) -> Json {
    *pos += 1;
    let mut fields = Vec::new();
    skip_space(chars, pos);
    if chars.get(*pos) == Some(&'}') {
        *pos += 1;
        return Json::Object(fields);
    }
    loop {
        skip_space(chars, pos);
        let key = parse_string(chars, pos);
        skip_space(chars, pos);
        *pos += 1; // ':'
        let value = parse_value(chars, pos);
        fields.push((key, value));
        skip_space(chars, pos);
        match chars.get(*pos) {
            Some(',') => {
                *pos += 1;
            }
            _ => {
                *pos += 1; // '}'
                break;
            }
        }
    }
    Json::Object(fields)
}

fn parse_array(chars: &[char], pos: &mut usize) -> Json {
    *pos += 1;
    let mut items = Vec::new();
    skip_space(chars, pos);
    if chars.get(*pos) == Some(&']') {
        *pos += 1;
        return Json::Array(items);
    }
    loop {
        let value = parse_value(chars, pos);
        items.push(value);
        skip_space(chars, pos);
        match chars.get(*pos) {
            Some(',') => {
                *pos += 1;
            }
            _ => {
                *pos += 1; // ']'
                break;
            }
        }
    }
    Json::Array(items)
}

fn parse_string(chars: &[char], pos: &mut usize) -> String {
    *pos += 1; // opening quote
    let mut out = String::new();
    while let Some(&c) = chars.get(*pos) {
        *pos += 1;
        if c == '"' {
            break;
        }
        if c == '\\' {
            let escaped = chars.get(*pos).copied().unwrap_or('\\');
            *pos += 1;
            match escaped {
                'n' => out.push('\n'),
                'r' => out.push('\r'),
                't' => out.push('\t'),
                'u' => {
                    let hex: String = chars[*pos..*pos + 4].iter().collect();
                    *pos += 4;
                    if let Ok(code) = u32::from_str_radix(&hex, 16) {
                        if let Some(scalar) = char::from_u32(code) {
                            out.push(scalar);
                        }
                    }
                }
                other => out.push(other),
            }
        } else {
            out.push(c);
        }
    }
    out
}

fn parse_number(chars: &[char], pos: &mut usize) -> Json {
    let start = *pos;
    while chars.get(*pos).is_some_and(|c| {
        c.is_ascii_digit() || *c == '-' || *c == '+' || *c == '.' || *c == 'e' || *c == 'E'
    }) {
        *pos += 1;
    }
    let text: String = chars[start..*pos].iter().collect();
    Json::Number(text.parse::<f64>().unwrap_or(0.0))
}

pub fn write(value: &Json) -> String {
    match value {
        Json::Null => "null".to_string(),
        Json::Bool(b) => b.to_string(),
        Json::Number(n) => {
            if n.fract() == 0.0 && n.abs() < 1e15 {
                format!("{}", *n as i64)
            } else {
                format!("{}", n)
            }
        }
        Json::String(s) => write_string(s),
        Json::Array(items) => format!(
            "[{}]",
            items.iter().map(write).collect::<Vec<_>>().join(",")
        ),
        Json::Object(fields) => format!(
            "{{{}}}",
            fields
                .iter()
                .map(|(key, value)| format!("{}:{}", write_string(key), write(value)))
                .collect::<Vec<_>>()
                .join(",")
        ),
    }
}

fn write_string(value: &str) -> String {
    let mut out = String::from("\"");
    for c in value.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
