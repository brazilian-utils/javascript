# frozen_string_literal: true

# Runs the published gem against the corpus on stdin, printing the results as JSON.
#
# Usage: ruby ruby-probe.rb <path to the brazilian-utils/ruby checkout>

require 'json'

root = ARGV[0]
require File.join(root, 'lib', 'brazilian-utils', 'cpf-utils')
require File.join(root, 'lib', 'brazilian-utils', 'pis-utils')

corpus = JSON.parse($stdin.read)

puts JSON.generate(
  'is-valid-cpf' => corpus.map { |value| BrazilianUtils::CPFUtils.valid?(value) },
  'is-valid-pis' => corpus.map { |value| BrazilianUtils::PISUtils.valid?(value) },
  'format-cpf' => corpus.map { |value| BrazilianUtils::CPFUtils.format_cpf(value) }
)
