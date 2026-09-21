# frozen_string_literal: true

# Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

require_relative 'runtime'

module BrazilianUtilsBridge
  # `formatCnpj`, written once.
  module FormatCnpj
    CLASS0 = [[0x30, 0x39]].freeze
    CLASS1 = [[0x30, 0x39], [0x41, 0x5a], [0x61, 0x7a]].freeze

    PATTERN = "00.000.000/0000-00".freeze
    OBFUSCATED_PATTERN = "**.000.000/0000-**".freeze

    # Options of `formatCnpj`.
    FormatCnpjOptions = Struct.new(:pad, :version, :obfuscate, keyword_init: true)

    # Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
    def self.format_cnpj(value, options = nil)
      options_version = -1
      options_version = options.version unless options.nil? || options.version.nil?
      options_obfuscate = false
      options_obfuscate = options.obfuscate unless options.nil? || options.obfuscate.nil?
      options_pad = false
      options_pad = options.pad unless options.nil? || options.pad.nil?
      return "" if value.nil?
      text = Runtime.as_string(value)
      cleaned = Runtime.keep_class(CLASS0, text)
      if (options_version == 2)
        cleaned = Runtime.keep_class(CLASS1, text).upcase
      end
      pattern = PATTERN
      if Runtime.is_truthy(options_obfuscate)
        pattern = OBFUSCATED_PATTERN
      end
      return layout(cleaned, pattern, Runtime.is_truthy(options_pad))
    end

    # Lays a value over a pattern.
    def self.layout(value, pattern, pad)
      slots = 0
      (0...pattern.length).each do |index|
        if ((Runtime.code_at(pattern, index) == 48) || (Runtime.code_at(pattern, index) == 42))
          slots = (slots + 1)
        end
      end
      padded = value
      if pad
        padded = Runtime.pad_start(value, slots, "0")
      end
      formatted = ""
      cursor = 0
      (0...pattern.length).each do |index|
        slot = Runtime.code_at(pattern, index)
        if ((slot == 48) || (slot == 42))
          if (cursor >= padded.length)
            return formatted
          end
          if (slot == 42)
            formatted = (formatted + "*")
          else
            formatted = (formatted + padded[cursor...(cursor + 1)])
          end
          cursor = (cursor + 1)
        else
          if (cursor < padded.length)
            formatted = (formatted + pattern[index...(index + 1)])
          end
        end
      end
      return formatted
    end
  end
end
