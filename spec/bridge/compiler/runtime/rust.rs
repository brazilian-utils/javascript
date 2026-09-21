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

/// What a provider answered: the HTTP status, whether it counts as a success, and the body.
pub struct HttpResponse {
    pub status: i64,
    pub ok: bool,
    pub body: serde_json::Value,
}

/// The origin every request is sent to instead of its own, when one is set.
///
/// This is the conformance hook: the cross language replay points all seven targets at one
/// local server, the same way the JavaScript suite points fetch at a mock.
fn http_target(url: &str) -> String {
    let base = std::env::var("BRUTILS_BRIDGE_HTTP_ORIGIN").unwrap_or_default();

    if base.is_empty() {
        return url.to_string();
    }

    let without_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);

    format!("{}/{}", base, without_scheme)
}

/// Performs an HTTP GET, retrying a transient transport failure with a linear backoff.
pub fn http_get(url: &str, retries: i64, retry_delay_ms: i64) -> HttpResponse {
    let target = http_target(url);
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .http_status_as_error(false)
        .timeout_global(Some(std::time::Duration::from_secs(15)))
        .build()
        .into();
    let mut attempt: i64 = 0;

    loop {
        match agent.get(&target).call() {
            Ok(mut answer) => {
                let status = i64::from(answer.status().as_u16());
                let body = answer
                    .body_mut()
                    .read_to_string()
                    .ok()
                    .and_then(|text| serde_json::from_str(&text).ok())
                    .unwrap_or(serde_json::Value::Null);

                return HttpResponse {
                    status,
                    ok: (200..300).contains(&status),
                    body,
                };
            }
            Err(_) => {
                if attempt >= retries {
                    return HttpResponse {
                        status: 0,
                        ok: false,
                        body: serde_json::Value::Null,
                    };
                }

                std::thread::sleep(std::time::Duration::from_millis(
                    (retry_delay_ms * (attempt + 1)) as u64,
                ));
                attempt += 1;
            }
        }
    }
}

/// Whether a list holds a value.
pub fn list_has(items: &[&str], value: &str) -> bool {
    items.iter().any(|item| *item == value)
}

/// Reads one field of a JSON body, treating anything that is not an object as empty.
fn json_field<'a>(body: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
    body.as_object().and_then(|object| object.get(key))
}

/// Reads a string field of a JSON body, answering "" when it is missing or not a string.
pub fn json_string(body: &serde_json::Value, key: &str) -> String {
    match json_field(body, key).and_then(serde_json::Value::as_str) {
        Some(found) => found.to_string(),
        None => String::new(),
    }
}

/// Reads an integer field of a JSON body, answering -1 when it is missing or not a number.
pub fn json_int(body: &serde_json::Value, key: &str) -> i64 {
    match json_field(body, key).and_then(serde_json::Value::as_f64) {
        Some(found) => found as i64,
        None => -1,
    }
}

/// Whether a field of a JSON body is truthy, the way JavaScript reads truthiness.
pub fn json_truthy(body: &serde_json::Value, key: &str) -> bool {
    match json_field(body, key) {
        None | Some(serde_json::Value::Null) => false,
        Some(serde_json::Value::Bool(found)) => *found,
        Some(serde_json::Value::Number(found)) => found.as_f64().unwrap_or(0.0) != 0.0,
        Some(serde_json::Value::String(found)) => !found.is_empty(),
        Some(_) => true,
    }
}

/// Whether a field of a JSON body is exactly true.
pub fn json_is_true(body: &serde_json::Value, key: &str) -> bool {
    json_field(body, key) == Some(&serde_json::Value::Bool(true))
}

/// A failure raised by the generated code. Rust has no exception hierarchy, so the kinds the
/// source declared travel with the value.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error {
    pub kinds: Vec<&'static str>,
    pub message: String,
}

impl Error {
    /// Builds a failure of the given kinds.
    pub fn new(kinds: &[&'static str], message: &str) -> Self {
        Self {
            kinds: kinds.to_vec(),
            message: message.to_string(),
        }
    }

    /// The most specific kind of the failure.
    pub fn kind(&self) -> &str {
        self.kinds.first().copied().unwrap_or("")
    }

    /// Whether the failure is of a kind, its bases included.
    pub fn is_kind(&self, kind: &str) -> bool {
        self.kinds.iter().any(|candidate| *candidate == kind)
    }
}

impl std::fmt::Display for Error {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}", self.message)
    }
}

impl std::error::Error for Error {}

/// What one attempt of a race ended with.
pub struct Outcome<T> {
    pub ok: bool,
    pub value: Option<T>,
    pub kinds: Vec<&'static str>,
}

/// The running attempts of a race, and what each one ended with.
pub struct Attempts<T> {
    settled: std::sync::mpsc::Receiver<Outcome<T>>,
    total: usize,
    pub outcomes: Vec<Outcome<T>>,
}

/// Starts one attempt per item, all at once.
///
/// This is the only concurrency primitive of the portable subset. Rust has no runtime to await
/// on by default, so the work goes on threads and the caller simply waits.
pub fn start_all<T: Send + 'static>(
    run: fn(&str, &str) -> Result<T, Error>,
    items: &[String],
    argument: &str,
) -> Attempts<T> {
    let (sender, settled) = std::sync::mpsc::channel();

    for item in items {
        let sender = sender.clone();
        let item = item.clone();
        let argument = argument.to_string();

        std::thread::spawn(move || {
            let outcome = match run(&item, &argument) {
                Ok(value) => Outcome {
                    ok: true,
                    value: Some(value),
                    kinds: Vec::new(),
                },
                Err(error) => Outcome {
                    ok: false,
                    value: None,
                    kinds: error.kinds,
                },
            };

            let _ = sender.send(outcome);
        });
    }

    Attempts {
        settled,
        total: items.len(),
        outcomes: Vec::new(),
    }
}

/// The value of the first attempt that succeeds, or nothing once every attempt has failed.
pub fn first_success<T>(attempts: &mut Attempts<T>) -> Option<T> {
    while attempts.outcomes.len() < attempts.total {
        let Ok(mut outcome) = attempts.settled.recv() else {
            return None;
        };

        if outcome.ok {
            let value = outcome.value.take();

            attempts.outcomes.push(outcome);

            return value;
        }

        attempts.outcomes.push(outcome);
    }

    None
}

/// Whether any attempt failed with a given error kind.
pub fn any_failed_with<T>(attempts: &Attempts<T>, kind: &str) -> bool {
    attempts
        .outcomes
        .iter()
        .any(|outcome| !outcome.ok && outcome.kinds.iter().any(|candidate| *candidate == kind))
}
