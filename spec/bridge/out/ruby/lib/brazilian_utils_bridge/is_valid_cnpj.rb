# frozen_string_literal: true

# Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

require_relative 'runtime'

module BrazilianUtilsBridge
  # `isValidCnpj`, written once.
  module IsValidCnpj
    CLASS0 = [[0x30, 0x39], [0x41, 0x5a]].freeze
    CLASS1 = [[0x9, 0xd], [0x20, 0x20], [0x2d, 0x2f], [0xa0, 0xa0], [0x1680, 0x1680], [0x2000, 0x200a], [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x205f], [0x3000, 0x3000], [0xfeff, 0xfeff]].freeze
    CLASS2 = [[0x30, 0x39]].freeze
    CLASS3 = [[0x41, 0x5a]].freeze
    CLASS4 = [[0x30, 0x39], [0x41, 0x5a], [0x61, 0x7a]].freeze

    PATTERN_ALPHANUMERIC_FORMAT = [
      Runtime::PatternStep.new(CLASS0, 2, 2, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS0, 3, 3, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS0, 3, 3, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS0, 4, 4, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS2, 2, 2, false),
    ].freeze

    PATTERN_NUMERIC_FORMAT = [
      Runtime::PatternStep.new(CLASS2, 2, 2, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS2, 3, 3, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS2, 3, 3, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS2, 4, 4, false),
      Runtime::PatternStep.new(CLASS1, 0, -1, false),
      Runtime::PatternStep.new(CLASS2, 2, 2, false),
    ].freeze

    FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].freeze
    SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].freeze

    # Options of `isValidCnpj`.
    IsValidCnpjOptions = Struct.new(:version, keyword_init: true)

    # Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
    #
    # Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
    # usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
    def self.is_valid_cnpj(cnpj, options = nil)
      options_version = -1
      options_version = options.version unless options.nil? || options.version.nil?
      return false if !cnpj.is_a?(String)
      trimmed = Runtime.js_trim(cnpj)
      if (options_version == 2)
        cleaned = Runtime.keep_class(CLASS4, cnpj).upcase
        if Runtime.class_has(CLASS3, cleaned)
          if !Runtime.pattern_test(PATTERN_ALPHANUMERIC_FORMAT, trimmed.upcase)
            return false
          end
          return has_valid_checksum(cleaned)
        end
      end
      numeric = Runtime.keep_class(CLASS2, cnpj)
      if !Runtime.pattern_test(PATTERN_NUMERIC_FORMAT, trimmed)
        return false
      end
      if is_repeated(numeric)
        return false
      end
      return has_valid_checksum(numeric)
    end

    # Computes one CNPJ check digit from the base and its weight vector.
    def self.check_digit(base, weights)
      sum = 0
      (0...weights.length).each do |index|
        sum = (sum + ((Runtime.code_at(base, index) - 48) * weights[index]))
      end
      remainder = (sum % 11)
      if (remainder < 2)
        return 0
      end
      return (11 - remainder)
    end

    # Whether both check digits of a sanitized 14 character CNPJ match its base.
    def self.has_valid_checksum(cnpj)
      if ((Runtime.code_at(cnpj, 12) - 48) != check_digit(cnpj, FIRST_DIGIT_WEIGHTS))
        return false
      end
      return ((Runtime.code_at(cnpj, 13) - 48) == check_digit(cnpj, SECOND_DIGIT_WEIGHTS))
    end

    # Whether every character of the value is the same one.
    def self.is_repeated(value)
      if (value.length == 0)
        return false
      end
      (1...value.length).each do |index|
        if (Runtime.code_at(value, index) != Runtime.code_at(value, 0))
          return false
        end
      end
      return true
    end
  end
end
