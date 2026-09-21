# frozen_string_literal: true

# Ruby arms: handwritten source, generated source, the Rust core over wasm (the `wasmtime` gem,
# a native extension), and the same core over Fiddle.

require 'json'
require 'fiddle'
require 'fiddle/import'
require 'wasmtime'

BENCH = File.expand_path('..', __dir__)
CORPUS = JSON.parse(File.read(File.join(BENCH, 'corpus.json')))
REPS = Integer(ENV.fetch('BENCH_REPS', '7'))

$LOAD_PATH.unshift(File.join(BENCH, '.spec-masked-strict/generated/ruby'))
require 'brazilian-utils/cpf-utils'

# --- arm: handwritten, the way a contributor would write it ---------------------------------

SHAPE = /\A\d{3}[\s.\-\/]*\d{3}[\s.\-\/]*\d{3}[\s.\-\/]*\d{2}\z/.freeze
NON_DIGITS = /\D/.freeze

def check_digit(base)
  total = 0
  base.each_char.with_index { |digit, index| total += digit.to_i * (base.length + 1 - index) }
  digit = 11 - (total % 11)
  digit >= 10 ? 0 : digit
end

def handwritten_valid?(cpf)
  return false unless cpf.is_a?(String)
  return false unless SHAPE.match?(cpf.strip)

  digits = cpf.gsub(NON_DIGITS, '')
  return false if digits == digits[0] * 11

  digits[9].to_i == check_digit(digits[0...9]) && digits[10].to_i == check_digit(digits[0...10])
end


# --- arm: what the emitter COULD generate for Ruby -------------------------------------------
#
# Same spec, same semantics, but the charsets are rendered as an explicit regex character class
# instead of a per code point loop, so the work happens in Onigmo rather than in Ruby. The class
# is spelled out code point by code point: `\\s` is a different set, and `^`/`$` would be line
# anchors, so `\\A`/`\\z` are used.

WS_CODEPOINTS = [0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003,
                 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f,
                 0x205f, 0x3000, 0xfeff].freeze
WS_STRING = WS_CODEPOINTS.pack('U*')
SEP_CLASS = "[#{WS_CODEPOINTS.map { |code| format('\\u{%04x}', code) }.join}\\.\\-\\/]"
OPT_SHAPE = Regexp.new("\\A[0-9]{3}#{SEP_CLASS}*[0-9]{3}#{SEP_CLASS}*[0-9]{3}#{SEP_CLASS}*[0-9]{2}\\z")
OPT_NON_DIGITS = /[^0-9]/.freeze

def generated_opt_valid?(cpf)
  return false unless cpf.is_a?(String)
  return false unless OPT_SHAPE.match?(cpf.gsub(/\A[#{WS_STRING}]+|[#{WS_STRING}]+\z/, ''))

  digits = cpf.gsub(OPT_NON_DIGITS, '')
  return false if digits == digits[0] * 11

  digits[9].to_i == check_digit(digits[0...9]) && digits[10].to_i == check_digit(digits[0...10])
end


# --- arm: one anchored regex with capture groups ---------------------------------------------
#
# The trim, the shape check and the digit extraction collapse into a single match: the leading
# and trailing whitespace become `[WS]*`, and the four digit runs are captured instead of being
# filtered out of the string afterwards. No intermediate string is allocated.

WS_CLASS = "[#{WS_CODEPOINTS.map { |code| format('\\u{%04x}', code) }.join}]"
OPT2_SHAPE = Regexp.new(
  "\\A#{WS_CLASS}*([0-9]{3})#{SEP_CLASS}*([0-9]{3})#{SEP_CLASS}*([0-9]{3})#{SEP_CLASS}*([0-9]{2})#{WS_CLASS}*\\z"
)

def generated_opt2_valid?(cpf)
  return false unless cpf.is_a?(String)

  match = OPT2_SHAPE.match(cpf)
  return false if match.nil?

  digits = "#{match[1]}#{match[2]}#{match[3]}#{match[4]}"
  return false if digits == digits[0] * 11

  digits[9].to_i == check_digit(digits[0...9]) && digits[10].to_i == check_digit(digits[0...10])
end

# --- the shared Rust core over wasm ----------------------------------------------------------

engine = Wasmtime::Engine.new
mod = Wasmtime::Module.from_file(engine, File.join(BENCH, 'core/target/wasm32-unknown-unknown/release/brutils_bench_core.wasm'))
store = Wasmtime::Store.new(engine)
instance = Wasmtime::Instance.new(store, mod)
memory = instance.export('memory').to_memory
wasm_is_valid = instance.export('cpf_is_valid').to_func
wasm_is_valid_batch = instance.export('cpf_is_valid_batch').to_func
arena_alloc = instance.export('arena_alloc').to_func
instance.export('arena_reset').to_func.call

scratch = arena_alloc.call(64)
batch_input = arena_alloc.call(1 << 18)
batch_output = arena_alloc.call(CORPUS.length)

# --- the same core over Fiddle (plain C ABI) --------------------------------------------------

LIB = Fiddle.dlopen(File.join(BENCH, 'core/target/release/libbrutils_bench_core.so'))
FFI_IS_VALID = Fiddle::Function.new(LIB['cpf_is_valid'], [Fiddle::TYPE_VOIDP, Fiddle::TYPE_SIZE_T], Fiddle::TYPE_INT)
FFI_IS_VALID_BATCH = Fiddle::Function.new(
  LIB['cpf_is_valid_batch'],
  [Fiddle::TYPE_VOIDP, Fiddle::TYPE_SIZE_T, Fiddle::TYPE_VOIDP, Fiddle::TYPE_SIZE_T],
  Fiddle::TYPE_INT
)

def pack(inputs)
  packed = +''
  inputs.each do |value|
    bytes = value.dup.force_encoding(Encoding::BINARY)
    packed << [bytes.bytesize].pack('V') << bytes
  end
  packed
end

ARMS = {
  'handwritten' => ->(inputs) { inputs.count { |value| handwritten_valid?(value) } },
  'generated' => ->(inputs) { inputs.count { |value| BrazilianUtils::CPFUtils.valid?(value) } },
  'generated-opt' => ->(inputs) { inputs.count { |value| generated_opt_valid?(value) } },
  'generated-opt2' => ->(inputs) { inputs.count { |value| generated_opt2_valid?(value) } },
  'wasm' => lambda { |inputs|
    valid = 0
    inputs.each do |value|
      bytes = value.dup.force_encoding(Encoding::BINARY)
      memory.write(scratch, bytes)
      valid += 1 if wasm_is_valid.call(scratch, bytes.bytesize) == 1
    end
    valid
  },
  'wasm-batch' => lambda { |inputs|
    packed = pack(inputs)
    memory.write(batch_input, packed)
    wasm_is_valid_batch.call(batch_input, packed.bytesize, batch_output, inputs.length)
    memory.read(batch_output, inputs.length).bytes.count(1)
  },
  'ffi' => lambda { |inputs|
    valid = 0
    inputs.each do |value|
      bytes = value.dup.force_encoding(Encoding::BINARY)
      valid += 1 if FFI_IS_VALID.call(bytes, bytes.bytesize) == 1
    end
    valid
  },
  'ffi-batch' => lambda { |inputs|
    packed = pack(inputs)
    output = Fiddle::Pointer.malloc(inputs.length)
    FFI_IS_VALID_BATCH.call(packed, packed.bytesize, output, inputs.length)
    output.to_str(inputs.length).bytes.count(1)
  },
  'wasm-callonly' => lambda { |inputs|
    valid = 0
    inputs.each { valid += 1 if wasm_is_valid.call(scratch, 11) == 1 }
    valid
  },
  'ffi-callonly' => lambda { |inputs|
    payload = '12345678909'
    valid = 0
    inputs.each { valid += 1 if FFI_IS_VALID.call(payload, 11) == 1 }
    valid
  }
}.freeze

ARMS.each do |name, run|
  2.times { run.call(CORPUS) }

  best = Float::INFINITY
  valid = 0

  REPS.times do
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC, :nanosecond)
    valid = run.call(CORPUS)
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC, :nanosecond) - start
    best = [best, elapsed.to_f / CORPUS.length].min
  end

  puts JSON.generate('lang' => 'ruby', 'arm' => name, 'nsPerOp' => best.round(1), 'valid' => valid)
  $stdout.flush
end
