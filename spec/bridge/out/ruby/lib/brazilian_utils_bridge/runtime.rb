# frozen_string_literal: true

require 'json'
require 'net/http'
require 'uri'

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

    # What a provider answered: the HTTP status, whether it counts as a success, and the body.
    HttpResponse = Struct.new(:status, :ok, :body)

    # The origin every request is sent to instead of its own, when one is set.
    #
    # This is the conformance hook: the cross language replay points all seven targets at one
    # local server, the same way the JavaScript suite points fetch at a mock.
    def self.http_target(url)
      base = ENV.fetch('BRUTILS_BRIDGE_HTTP_ORIGIN', '')

      return url if base.empty?

      "#{base}/#{url.sub(%r{\Ahttps?://}, '')}"
    end

    # Performs an HTTP GET, retrying a transient transport failure with a linear backoff.
    def self.http_get(url, retries, retry_delay_ms)
      target = URI.parse(http_target(url))
      attempt = 0

      loop do
        begin
          answer = Net::HTTP.get_response(target)
        rescue StandardError
          return HttpResponse.new(0, false, nil) if attempt >= retries

          sleep(retry_delay_ms * (attempt + 1) / 1000.0)
          attempt += 1
          next
        end

        status = answer.code.to_i
        body = begin
          JSON.parse(answer.body)
        rescue StandardError
          nil
        end

        return HttpResponse.new(status, status >= 200 && status < 300, body)
      end
    end

    # Whether the caller handed a number where a string or a number was declared.
    def self.is_number(value)
      value.is_a?(Numeric)
    end

    # Whether a value is a list.
    def self.is_list(value)
      value.is_a?(Array)
    end

    # Whether a list holds a value.
    def self.list_has(items, value)
      items.include?(value)
    end

    # Reads one field of a JSON body, treating anything that is not an object as empty.
    def self.json_field(body, key)
      return nil unless body.is_a?(Hash)

      body[key]
    end

    # Reads a string field of a JSON body, answering '' when it is missing or not a string.
    def self.json_string(body, key)
      found = json_field(body, key)

      found.is_a?(String) ? found : ''
    end

    # Reads an integer field of a JSON body, answering -1 when it is missing or not a number.
    def self.json_int(body, key)
      found = json_field(body, key)

      found.is_a?(Numeric) && !found.is_a?(TrueClass) ? found.to_i : -1
    end

    # Whether a field of a JSON body is truthy, the way JavaScript reads truthiness.
    def self.json_truthy(body, key)
      found = json_field(body, key)

      !(found.nil? || found == false || found == 0 || found == '')
    end

    # Whether a field of a JSON body is exactly true.
    def self.json_is_true(body, key)
      json_field(body, key) == true
    end

    # The running attempts of a race, and what each one ended with.
    class Attempts
      attr_reader :settled, :total
      attr_accessor :outcomes

      def initialize(total)
        @settled = Queue.new
        @total = total
        @outcomes = []
      end
    end

    # The error name and every name it inherits from, which is what a failure is matched on.
    def self.kinds_of(error)
      kinds = []
      current = error.class

      while current
        kinds.push(current.name.to_s.split('::').last)
        current = current.superclass
      end

      kinds
    end

    # Starts one attempt per item, all at once.
    #
    # This is the only concurrency primitive of the portable subset. Ruby has no promise to
    # colour a function with, so the work goes on threads and the caller simply waits.
    def self.start_all(run, items, argument)
      attempts = Attempts.new(items.length)

      items.each do |item|
        Thread.new do
          begin
            attempts.settled.push([true, run.call(item, argument), []])
          rescue StandardError => e
            attempts.settled.push([false, nil, kinds_of(e)])
          end
        end
      end

      attempts
    end

    # The value of the first attempt that succeeds, or nil once every attempt has failed.
    def self.first_success(attempts)
      while attempts.outcomes.length < attempts.total
        outcome = attempts.settled.pop
        attempts.outcomes.push(outcome)

        return outcome[1] if outcome[0]
      end

      nil
    end

    # Whether any attempt failed with a given error kind.
    def self.any_failed_with(attempts, kind)
      attempts.outcomes.any? { |ok, _value, kinds| !ok && kinds.include?(kind) }
    end
  end
end
