# frozen_string_literal: true

# The portable runtime for the Ruby target.
#
# Ruby indexes strings by character, which is what the generated code expects; everything else
# the code needs that is not plain syntax lives here.
module BrazilianUtilsBridge
  # Helpers shared by the generated utilities.
  module Runtime
    # The code points JavaScript's trim() strips. Ruby's String#strip is a different set.
    JS_WHITESPACE = [
      [0x09, 0x0d], [0x20, 0x20], [0xa0, 0xa0], [0x1680, 0x1680], [0x2000, 0x200a],
      [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x205f], [0x3000, 0x3000], [0xfeff, 0xfeff]
    ].freeze

    # One step of a compiled pattern: repeat a class between min and max times.
    PatternStep = Struct.new(:char_class, :min, :max, :capture)

    # Whether a code point belongs to a class.
    def self.in_class(char_class, code)
      char_class.each do |span|
        return true if code >= span[0] && code <= span[1]
      end

      false
    end

    # Reads one code point, or -1 when the index is out of range.
    def self.code_at(value, index)
      return -1 if index.negative? || index >= value.length

      value[index].ord
    end

    # Whether any character of the value belongs to the class.
    def self.class_has(char_class, value)
      value.each_char.any? { |char| in_class(char_class, char.ord) }
    end

    # Keeps only the characters of the value that belong to the class.
    def self.keep_class(char_class, value)
      value.each_char.select { |char| in_class(char_class, char.ord) }.join
    end

    # Runs a compiled pattern against the whole value, greedily and without backtracking.
    def self.pattern_test(steps, value)
      chars = value.chars
      index = 0

      steps.each do |step|
        count = 0

        while (step.max.negative? || count < step.max) && index < chars.length &&
              in_class(step.char_class, chars[index].ord)
          index += 1
          count += 1
        end

        return false if count < step.min
      end

      index == chars.length
    end

    # Strips the code points JavaScript's trim() strips.
    def self.js_trim(value)
      chars = value.chars
      start = 0
      last = chars.length

      start += 1 while start < last && in_class(JS_WHITESPACE, chars[start].ord)
      last -= 1 while last > start && in_class(JS_WHITESPACE, chars[last - 1].ord)

      chars[start...last].join
    end

    # Left pads the value with a filler up to a length.
    def self.pad_start(value, length, filler)
      value.rjust(length, filler)
    end

    # Reads a value as a string the way JavaScript's String(value) does.
    def self.as_string(value)
      return value if value.is_a?(String)
      return 'true' if value == true
      return 'false' if value == false
      return 'null' if value.nil?
      return value.to_s if value.is_a?(Integer)

      if value.is_a?(Float)
        return value.to_i.to_s if value == value.to_i

        return value.to_s
      end

      value.to_s
    end

    # Reads an optional flag the way JavaScript reads truthiness.
    def self.is_truthy(value)
      !value.nil? && value != false
    end

    # A dataset: the rows in the baked full order, and the rows of each key.
    class Dataset
      attr_reader :all, :by_key

      def initialize(rows, groups, full_order)
        @all = full_order.map { |index| rows[index] }
        @by_key = {}
        groups.each { |key, indexes| @by_key[key] = indexes.map { |index| rows[index] } }
        freeze
      end
    end

    # Materialises a dataset, resolving both orders once.
    def self.make_dataset(rows, groups, full_order)
      Dataset.new(rows, groups, full_order)
    end

    # Every row of a dataset, in the baked full order.
    def self.data_all(table)
      table.all
    end

    # The rows whose first column is the key given, empty when the key is unknown.
    def self.data_rows(table, key)
      table.by_key.fetch(key, [])
    end
  end
end
