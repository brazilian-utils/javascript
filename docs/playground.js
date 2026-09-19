/*
 * The "try it" playground of the docs site (playground.md): runs any exported function of the
 * published package in the browser. Loaded by index.html only when a page has a #try-it
 * element. The library itself is imported from a CDN, the ESM build of the latest release, so the
 * playground needs no build step and always shows what `npm install` gives.
 *
 * Arguments are read with JSON.parse, never evaluated as code.
 */
(function () {
  'use strict';

  var PACKAGE = '@brazilian-utils/brazilian-utils';
  var CDNS = ['https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'];

  var TEXT = {
    en: {
      loading: 'Loading the latest release from the CDN...',
      failed: 'Could not load the package from the CDN. Check the connection and reload.',
      version: 'Running version',
      fn: 'Function',
      args: 'Arguments, as a JSON array',
      hint: 'One entry per argument. A Date is written as {"$date": "2026-01-01"}.',
      run: 'Run',
      code: 'Code',
      result: 'Result',
      invalidJson: 'The arguments are not a valid JSON array: ',
      notArray: 'The arguments must be a JSON array, e.g. ["123.456.789-09"].',
      threw: 'Threw: ',
    },
    'pt-br': {
      loading: 'Carregando a última versão publicada pelo CDN...',
      failed: 'Não foi possível carregar o pacote pelo CDN. Verifique a conexão e recarregue.',
      version: 'Rodando a versão',
      fn: 'Função',
      args: 'Argumentos, como um array JSON',
      hint: 'Uma entrada por argumento. Uma Date é escrita como {"$date": "2026-01-01"}.',
      run: 'Executar',
      code: 'Código',
      result: 'Resultado',
      invalidJson: 'Os argumentos não são um array JSON válido: ',
      notArray: 'Os argumentos precisam ser um array JSON, por exemplo ["123.456.789-09"].',
      threw: 'Lançou: ',
    },
  };

  // The arguments a function opens with; anything not listed starts from its family's default.
  var EXAMPLES = {
    isValidCpf: ['123.456.789-09'],
    formatCpf: ['12345678909'],
    parseCpf: ['123.456.789-09'],
    generateCpf: ['SP'],
    isValidCnpj: ['Q0.SLF.MBD/7VX4-39', { version: 2 }],
    formatCnpj: ['12345678000195'],
    parseCnpj: ['12.345.678/0001-95'],
    generateCnpj: [{ version: 2 }],
    isValidCep: ['01310-100'],
    formatCep: ['01310100'],
    getAddressInfoByCep: ['01310100'],
    isValidBoleto: ['00190000090114971860168524522114675860000102656'],
    getBoletoInfo: ['00190000090114971860168524522114675860000102656'],
    isValidPhone: ['(11) 98765-4321'],
    formatPhone: ['11987654321'],
    isValidPixKey: ['123.456.789-09'],
    getPixKeyInfo: ['+5511987654321'],
    formatCurrency: [1234.56],
    parseCurrency: ['R$ 1.234,56'],
    convertNumberToWords: [1234],
    convertCurrencyToWords: [1234.56],
    capitalize: ['JOSÉ DA SILVA LTDA'],
    removeAccents: ['São Paulo'],
    getHolidays: [2026],
    isHoliday: [{ date: { $date: '2026-09-07' } }],
    isBusinessDay: [{ $date: '2026-09-07' }],
    addBusinessDays: [{ $date: '2026-09-04' }, 3],
    getStates: [],
    getMunicipalities: ['AC'],
    getMunicipalityByCode: ['3550308'],
    getBankByCode: ['001'],
    getCfop: ['5.102'],
    getCnae: ['6201-5/01'],
    isValidIe: [{ value: '110042490114', stateCode: 'SP' }],
    isValidLicensePlate: ['ABC1D23'],
    isValidEmail: ['contato@exemplo.com.br'],
  };

  function defaultArgs(name) {
    if (Object.prototype.hasOwnProperty.call(EXAMPLES, name)) return EXAMPLES[name];
    if (/^(generate|get[A-Z].*s$)/.test(name)) return [];
    return [''];
  }

  function reviveDates(key, value) {
    return value && typeof value === 'object' && typeof value.$date === 'string' ? new Date(value.$date) : value;
  }

  function show(value) {
    if (value === undefined) return 'undefined';
    if (value instanceof Date) return 'Date ' + value.toISOString();
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  function element(tag, attributes, children) {
    var node = document.createElement(tag);
    Object.keys(attributes || {}).forEach(function (name) {
      node.setAttribute(name, attributes[name]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function load(index) {
    var base = CDNS[index];
    return fetch(base + PACKAGE + '/package.json')
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(function (manifest) {
        return import(base + PACKAGE + '@' + manifest.version + '/dist/brazilian-utils.js').then(function (library) {
          return { library: library, version: manifest.version };
        });
      })
      .catch(function (error) {
        if (index + 1 < CDNS.length) return load(index + 1);
        throw error;
      });
  }

  var loaded;

  window.BrazilianUtilsPlayground = function (root) {
    var text = location.pathname.indexOf('/pt-br') === 0 ? TEXT['pt-br'] : TEXT.en;
    root.textContent = text.loading;
    loaded = loaded || load(0);

    loaded.then(
      function (result) {
        var library = result.library;
        var names = Object.keys(library)
          .filter(function (name) {
            return typeof library[name] === 'function' && /^[a-z]/.test(name);
          })
          .sort();

        var select = element('select', { id: 'playground-fn' }, names.map(function (name) {
          return element('option', { value: name }, [name]);
        }));
        var args = element('textarea', { id: 'playground-args', rows: '4', spellcheck: 'false' });
        var run = element('button', { type: 'button' }, [text.run]);
        var code = element('code');
        var output = element('pre', { 'aria-live': 'polite' });

        function describe() {
          var inner = args.value.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
          code.textContent =
            "import { " + select.value + " } from '" + PACKAGE + "';\n\n" + select.value + '(' + inner + ');';
        }

        function execute() {
          var parsed;
          describe();
          try {
            parsed = JSON.parse(args.value || '[]', reviveDates);
          } catch (error) {
            output.textContent = text.invalidJson + error.message;
            return;
          }
          if (!Array.isArray(parsed)) {
            output.textContent = text.notArray;
            return;
          }
          Promise.resolve()
            .then(function () {
              return library[select.value].apply(undefined, parsed);
            })
            .then(
              function (value) {
                output.textContent = show(value);
              },
              function (error) {
                output.textContent = text.threw + (error && error.name ? error.name + ': ' + error.message : String(error));
              }
            );
        }

        function pick(name) {
          select.value = name;
          args.value = JSON.stringify(defaultArgs(name));
          execute();
        }

        select.addEventListener('change', function () {
          pick(select.value);
        });
        run.addEventListener('click', execute);
        args.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) execute();
        });

        root.textContent = '';
        root.appendChild(element('p', { class: 'playground-version' }, [text.version + ' ' + result.version]));
        root.appendChild(element('label', { for: 'playground-fn' }, [text.fn]));
        root.appendChild(select);
        root.appendChild(element('label', { for: 'playground-args' }, [text.args]));
        root.appendChild(args);
        root.appendChild(element('p', { class: 'playground-hint' }, [text.hint]));
        root.appendChild(run);
        root.appendChild(element('h4', {}, [text.code]));
        root.appendChild(element('pre', {}, [code]));
        root.appendChild(element('h4', {}, [text.result]));
        root.appendChild(output);

        var wanted = new URLSearchParams(location.search).get('fn');
        pick(names.indexOf(wanted) === -1 ? 'isValidCpf' : wanted);
      },
      function () {
        root.textContent = text.failed;
      }
    );
  };
})();
