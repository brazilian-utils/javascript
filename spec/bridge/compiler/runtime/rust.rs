//! The portable runtime for the Rust target.
//!
//! Strings are indexed by code point, not by byte, so the generated code means the same thing
//! it does in the other targets.

/// A set of code points, as sorted non overlapping ranges.
pub type CharClass = &'static [(u32, u32)];

/// Repeats a class between `min` and `max` times; `max` -1 means unbounded.
pub struct PatternStep {
    pub class: CharClass,
    pub min: i64,
    pub max: i64,
    pub capture: bool,
}

/// The code points JavaScript's `trim()` strips.
const JS_WHITESPACE: CharClass = &[
    (0x09, 0x0d),
    (0x20, 0x20),
    (0xa0, 0xa0),
    (0x1680, 0x1680),
    (0x2000, 0x200a),
    (0x2028, 0x2029),
    (0x202f, 0x202f),
    (0x205f, 0x205f),
    (0x3000, 0x3000),
    (0xfeff, 0xfeff),
];

/// Whether a code point belongs to a class.
pub fn in_class(class: CharClass, code: u32) -> bool {
    class.iter().any(|(from, to)| code >= *from && code <= *to)
}

/// Counts the code points of a value.
pub fn len(value: &str) -> i64 {
    value.chars().count() as i64
}

/// Reads one code point, or -1 when the index is out of range.
pub fn code_at(value: &str, index: i64) -> i64 {
    if index < 0 {
        return -1;
    }

    match value.chars().nth(index as usize) {
        None => -1,
        Some(char) => char as i64,
    }
}

/// Takes the code points between two indexes.
pub fn slice(value: &str, from: i64, to: i64) -> String {
    let chars: Vec<char> = value.chars().collect();
    let start = from.max(0) as usize;
    let end = (to.max(0) as usize).min(chars.len());

    if start >= end {
        return String::new();
    }

    chars[start..end].iter().collect()
}

/// Whether any character of the value belongs to the class.
pub fn class_has(class: CharClass, value: &str) -> bool {
    value.chars().any(|char| in_class(class, char as u32))
}

/// Keeps only the characters of the value that belong to the class.
pub fn keep_class(class: CharClass, value: &str) -> String {
    value.chars().filter(|char| in_class(class, *char as u32)).collect()
}

/// Runs a compiled pattern against the whole value, greedily and without backtracking.
pub fn pattern_test(steps: &[PatternStep], value: &str) -> bool {
    let chars: Vec<char> = value.chars().collect();
    let mut index = 0usize;

    for step in steps {
        let mut count = 0i64;

        while (step.max < 0 || count < step.max)
            && index < chars.len()
            && in_class(step.class, chars[index] as u32)
        {
            index += 1;
            count += 1;
        }

        if count < step.min {
            return false;
        }
    }

    index == chars.len()
}

/// Strips the code points JavaScript's `trim()` strips.
pub fn js_trim(value: &str) -> String {
    value
        .trim_matches(|char: char| in_class(JS_WHITESPACE, char as u32))
        .to_string()
}

/// Left pads the value with a filler up to a length, counted in code points.
pub fn pad_start(value: &str, length: i64, filler: &str) -> String {
    let missing = length - len(value);

    if missing <= 0 {
        return value.to_string();
    }

    format!("{}{}", filler.repeat(missing as usize), value)
}

/// Uppercases a value.
pub fn upper(value: &str) -> String {
    value.to_uppercase()
}

/// Repeats a value.
pub fn repeat(value: &str, times: i64) -> String {
    if times <= 0 {
        return String::new();
    }

    value.repeat(times as usize)
}

/// One row of a dataset: the cells, in column order.
pub type Row = &'static [&'static str];

/// A dataset: the rows in the baked full order, and the rows of each key.
pub struct Dataset {
    all: Vec<Row>,
    by_key: std::collections::HashMap<&'static str, Vec<Row>>,
}

impl Dataset {
    /// Materialises a dataset, resolving both orders once.
    pub fn new(
        rows: &'static [Row],
        groups: &'static [(&'static str, &'static [usize])],
        full_order: &'static [usize],
    ) -> Self {
        let mut by_key = std::collections::HashMap::with_capacity(groups.len());

        for (key, indexes) in groups {
            by_key.insert(*key, indexes.iter().map(|index| rows[*index]).collect());
        }

        Self {
            all: full_order.iter().map(|index| rows[*index]).collect(),
            by_key,
        }
    }
}

/// Every row of a dataset, in the baked full order.
pub fn data_all(table: &'static Dataset) -> Vec<Row> {
    table.all.clone()
}

/// The rows whose first column is the key given, empty when the key is unknown.
pub fn data_rows(table: &'static Dataset, key: &str) -> Vec<Row> {
    match table.by_key.get(key) {
        Some(rows) => rows.clone(),
        None => Vec::new(),
    }
}
