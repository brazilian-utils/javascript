# frozen_string_literal: true

# The Ruby arm the first pass missed: the shared core as a C extension.
#
# `fiddle` and the `ffi` gem are what a script reaches for; a C extension is what a gem ships
# when it cares. Both are measured against the same corpus and the same core.

require 'json'
require 'benchmark'

BENCH = File.expand_path('..', __dir__)
CORPUS = JSON.parse(File.read(File.join(BENCH, 'corpus.json')))
REPS = Integer(ENV.fetch('BENCH_REPS', '7'))

$LOAD_PATH.unshift(File.join(BENCH, '.build/native/ruby'))
require 'cpf_native'

def run_cext(inputs)
  valid = 0
  inputs.each { |value| valid += 1 if CpfNative.is_valid(value) }
  valid
end

def run_cext_callonly(inputs)
  payload = '12345678909'
  valid = 0
  inputs.each { valid += 1 if CpfNative.is_valid(payload) }
  valid
end

def run_cext_batch(inputs)
  packed = +''
  inputs.each do |value|
    encoded = value.dup.force_encoding(Encoding::BINARY)
    packed << [encoded.bytesize].pack('V') << encoded
  end

  results = CpfNative.is_valid_batch(packed, inputs.length)
  results.bytes.count(1)
end

def measure(arm, &block)
  2.times { block.call(CORPUS) }

  best = Float::INFINITY
  valid = 0

  REPS.times do
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC, :nanosecond)
    valid = block.call(CORPUS)
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC, :nanosecond) - started
    best = [best, elapsed.to_f / CORPUS.length].min
  end

  { lang: 'ruby', arm: arm, nsPerOp: best.round(1), valid: valid }
end

[
  ['cext', method(:run_cext)],
  ['cext-callonly', method(:run_cext_callonly)],
  ['cext-batch', method(:run_cext_batch)]
].each do |arm, runner|
  puts JSON.generate(measure(arm) { |inputs| runner.call(inputs) })
  $stdout.flush
end
